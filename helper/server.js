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

app.get('/network/status', (req, res) => {
    exec('netsh wlan show interfaces', (err, stdout) => {
        if (err) return res.json({ connected: false });
        
        const match = stdout.match(/SSID\s*:\s*(.*)/);
        if (match && match[1]) {
            res.json({ connected: true, ssid: match[1].trim() });
        } else {
            res.json({ connected: false });
        }
    });
});

app.post('/network/university', (req, res) => {
    const config = getConfig();
    const ssid = config.network?.universitySSID || "VIT5G";
    exec(`netsh wlan connect name="${ssid}"`, (err, stdout) => {
        if (err) {
            return res.json({ success: false, message: 'Failed to connect' });
        }
        res.json({ success: true, message: `Connecting to ${ssid}...` });
    });
});

app.post('/network/hotspot', (req, res) => {
    const config = getConfig();
    const ssid = config.network?.hotspotSSID || "Arush's OnePlus 12R";
    exec(`netsh wlan connect name="${ssid}"`, (err, stdout) => {
        if (err) {
            return res.json({ success: false, message: 'Failed to connect' });
        }
        res.json({ success: true, message: `Connecting to ${ssid}...` });
    });
});

// ─── Cloudflare ───

app.get('/cloudflare/status', (req, res) => {
    const config = getConfig();
    const warpCli = config.cloudflare?.warpPath || 'warp-cli';
    exec(`"${warpCli}" status`, (err, stdout) => {
        if (err) return res.json({ running: false });
        const running = stdout.toLowerCase().includes('connected');
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

// ─── Apps ───

app.post('/app/:id', (req, res) => {
    const config = getConfig();
    const id = req.params.id;
    const exePath = config.apps?.[id];

    if (!exePath) return res.json({ success: false, message: 'App not configured' });

    exec(`start "" "${exePath}"`, (err) => {
        if (err) return res.json({ success: false, message: 'Failed to launch' });
        res.json({ success: true });
    });
});

// ─── Dev ───

app.post('/dev/:id', (req, res) => {
    const config = getConfig();
    const id = req.params.id;

    if (id === 'github') {
        const url = config.dev?.githubRepoUrl || "https://github.com/Arush?tab=repositories";
        exec(`start "" "${url}"`, (err) => res.json({ success: !err }));
        return;
    }

    const exePath = config.dev?.[id];
    if (!exePath) return res.json({ success: false, message: 'Dev tool not configured' });

    exec(`start "" "${exePath}"`, (err) => {
        res.json({ success: !err });
    });
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
