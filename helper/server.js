const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const configPath = path.join(__dirname, '../config/config.json');

function getConfig() {
    try {
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Failed to read config', e);
        return {};
    }
}

// ─── Network ───

const PORTAL_URL = "http://phc.prontonetworks.com/cgi-bin/authlogin?URI=http://detectportal.brave-http-only.com/";

function getCurrentWlanStatus() {
    return new Promise((resolve) => {
        exec('netsh wlan show interfaces', (err, stdout) => {
            if (err) return resolve({ connected: false, ssid: null });
            
            const isConnected = /State\s*:\s*connected/i.test(stdout);
            const ssidMatch = stdout.match(/^\s*SSID\s*:\s*(.+)$/m);
            const ssid = isConnected && ssidMatch ? ssidMatch[1].trim() : null;
            resolve({ connected: isConnected && !!ssid, ssid });
        });
    });
}

function normalizeSSID(name) {
    return (name || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function checkActionRequired() {
    return new Promise((resolve) => {
        exec('powershell -NoProfile -Command "(Get-NetConnectionProfile -InterfaceAlias \'Wi-Fi\' -ErrorAction SilentlyContinue).IPv4Connectivity"', (err, stdout) => {
            const connectivity = (stdout || '').trim();
            if (connectivity && connectivity !== 'Internet') {
                return resolve(true);
            }
            exec('powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri \'http://www.msftconnecttest.com/connecttest.txt\' -TimeoutSec 3 -UseBasicParsing; if ($r.StatusCode -eq 200 -and $r.Content.Trim() -eq \'Microsoft Connect Test\') { exit 0 } else { exit 1 } } catch { exit 1 }"', (probeErr) => {
                resolve(!!probeErr);
            });
        });
    });
}

async function switchNetwork(targetProfile, isUniversity, res) {
    try {
        const { connected, ssid: currentSSID } = await getCurrentWlanStatus();
        const targetNorm = normalizeSSID(targetProfile);
        const currentNorm = normalizeSSID(currentSSID);

        const isTargetMatch = connected && currentNorm && (
            currentNorm === targetNorm ||
            (targetNorm.includes('mvit') && currentNorm.includes('mvit')) ||
            (targetNorm.includes('oneplus') && currentNorm.includes('oneplus'))
        );

        if (isTargetMatch) {
            if (isUniversity) {
                const actionRequired = await checkActionRequired();
                if (actionRequired) {
                    exec(`start "" "${PORTAL_URL}"`);
                    return res.json({
                        success: true,
                        alreadyConnected: true,
                        actionRequired: true,
                        message: 'Connected to M-VIT, login required. Opened browser.'
                    });
                }
            }
            return res.json({
                success: true,
                alreadyConnected: true,
                actionRequired: false,
                message: `Already connected to ${currentSSID}`
            });
        }

        if (connected) {
            await new Promise((resolve) => exec('netsh wlan disconnect', () => resolve()));
            await new Promise((resolve) => setTimeout(resolve, 600));
        }

        exec(`netsh wlan connect name="${targetProfile}"`, (err) => {
            if (err) {
                return res.json({ success: false, message: `Failed to connect to ${targetProfile}` });
            }

            if (isUniversity) {
                setTimeout(async () => {
                    const actionRequired = await checkActionRequired();
                    if (actionRequired) {
                        exec(`start "" "${PORTAL_URL}"`);
                    }
                }, 3000);
            }

            res.json({
                success: true,
                alreadyConnected: false,
                message: `Connecting to ${targetProfile}...`
            });
        });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
}

app.get('/network/status', async (req, res) => {
    const status = await getCurrentWlanStatus();
    res.json(status);
});

app.post('/network/university', (req, res) => {
    const config = getConfig();
    const ssid = config.network?.universitySSID || "M-VIT";
    switchNetwork(ssid, true, res);
});

app.post('/network/hotspot', (req, res) => {
    const config = getConfig();
    const ssid = config.network?.hotspotSSID || "Arush's OnePlus 12R";
    switchNetwork(ssid, false, res);
});

// ─── Cloudflare ───

app.get('/cloudflare/status', (req, res) => {
    const config = getConfig();
    const warpCli = config.cloudflare?.warpPath || 'warp-cli';
    exec(`"${warpCli}" status`, (err, stdout) => {
        if (err) return res.json({ running: false });
        const running = /Status update:\s*Connected\b/i.test(stdout);
        res.json({ running });
    });
});

app.post('/cloudflare/start', (req, res) => {
    const config = getConfig();
    const warpCli = config.cloudflare?.warpPath || 'warp-cli';
    exec(`"${warpCli}" connect`, (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

app.post('/cloudflare/stop', (req, res) => {
    const config = getConfig();
    const warpCli = config.cloudflare?.warpPath || 'warp-cli';
    exec(`"${warpCli}" disconnect`, (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

app.post('/cloudflare/toggle', (req, res) => {
    const config = getConfig();
    const warpCli = config.cloudflare?.warpPath || 'warp-cli';
    exec(`"${warpCli}" status`, (err, stdout) => {
        const isConnected = !err && /Status update:\s*Connected\b/i.test(stdout);
        const action = isConnected ? 'disconnect' : 'connect';
        exec(`"${warpCli}" ${action}`, (toggleErr) => {
            res.json({ success: !toggleErr, running: !isConnected });
        });
    });
});

function launchTarget(target, res) {
    if (!target) return res.json({ success: false, message: 'Not configured' });

    let cmd = '';
    if (target.includes('--') || target.startsWith('"')) {
        cmd = target; // E.g. Riot Client with arguments
    } else if (target.startsWith('http') || target === 'wt.exe') {
        cmd = `start "" "${target}"`; // URLs and shell tools
    } else {
        cmd = `explorer "${target}"`; // Standard EXEs and Folders
    }

    exec(cmd, (err) => {
        if (err) return res.json({ success: false, message: 'Failed to launch' });
        res.json({ success: true });
    });
}

// ─── Apps ───

app.post('/app/:id', (req, res) => {
    const config = getConfig();
    launchTarget(config.apps?.[req.params.id], res);
});

// ─── Dev ───

app.post('/dev/:id', (req, res) => {
    const config = getConfig();
    const id = req.params.id;

    if (id === 'github') {
        const url = config.dev?.githubRepoUrl || "https://github.com/Arush?tab=repositories";
        return launchTarget(url, res);
    }

    launchTarget(config.dev?.[id], res);
});

// ─── Files ───

app.post('/files/:id', (req, res) => {
    const id = req.params.id;
    let targetPath = '';

    if (id === 'downloads') {
        targetPath = path.join(os.homedir(), 'Downloads');
    } else if (id === 'documents') {
        targetPath = path.join(os.homedir(), 'Documents');
    }

    if (!targetPath) return res.json({ success: false });

    exec(`explorer "${targetPath}"`, (err) => {
        res.json({ success: !err });
    });
});

// ─── Desktop Links ───

app.post('/desktop/thispc', (req, res) => {
    exec(`explorer "::{20D04FE0-3AEA-1069-A2D8-08002B30309D}"`, (err) => {
        res.json({ success: !err });
    });
});

app.post('/desktop/recyclebin', (req, res) => {
    exec(`explorer "::{645FF040-5081-101B-9F08-00AA002F954E}"`, (err) => {
        res.json({ success: !err });
    });
});

app.post('/desktop/trash', (req, res) => {
    const files = req.body.files;
    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.json({ success: false });
    }

    // Use PowerShell to send files to the Recycle Bin
    const script = files.map(f => {
        const escaped = f.replace(/'/g, "''");
        return `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${escaped}', 'OnlyErrorDialogs', 'SendToRecycleBin')`;
    }).join('; ');

    exec(`powershell -NoProfile -Command "${script}"`, (err) => {
        res.json({ success: !err });
    });
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Command Center Helper running on http://127.0.0.1:${PORT}`);
});
