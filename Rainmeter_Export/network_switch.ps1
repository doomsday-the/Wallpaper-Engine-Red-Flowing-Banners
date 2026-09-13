param (
    [string]$Target = "university"
)

$portalUrl = "http://phc.prontonetworks.com/cgi-bin/authlogin?URI=http://detectportal.brave-http-only.com/"

function Get-WlanInfo {
    $wlanLines = netsh wlan show interfaces
    $connected = $false
    $ssid = ""

    foreach ($line in $wlanLines) {
        if ($line -match '^\s*State\s*:\s*connected\s*$') {
            $connected = $true
        }
        if ($line -match '^\s*SSID\s*:\s*(.+)$') {
            $ssid = $matches[1].Trim()
        }
    }
    return @{
        Connected = $connected
        SSID      = $ssid
    }
}

function Normalize-SSID ($name) {
    if (-not $name) { return "" }
    return ($name -replace '[^a-zA-Z0-9]', '').ToLower()
}

function Test-ActionRequired {
    # 1. Check Windows NetConnectionProfile
    $profile = Get-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -ErrorAction SilentlyContinue
    if ($profile -and $profile.IPv4Connectivity -ne 'Internet') {
        return $true
    }
    # 2. Probe connectivity
    try {
        $req = Invoke-WebRequest -Uri "http://www.msftconnecttest.com/connecttest.txt" -TimeoutSec 3 -UseBasicParsing
        if ($req.StatusCode -ne 200 -or $req.Content.Trim() -ne "Microsoft Connect Test") {
            return $true
        }
        return $false
    } catch {
        return $true
    }
}

function Handle-CaptivePortal {
    if (Test-ActionRequired) {
        Write-Host "Action required for M-VIT. Opening captive portal..."
        Start-Process $portalUrl
    } else {
        Write-Host "M-VIT is connected with internet access. No action needed."
    }
}

$info = Get-WlanInfo
$currentNorm = Normalize-SSID $info.SSID

if ($Target -eq "university") {
    $uniProfile = "M-VIT"
    $uniNorm = Normalize-SSID $uniProfile

    $isUni = $info.Connected -and ($currentNorm -eq $uniNorm -or $currentNorm -like "*mvit*" -or $currentNorm -like "*vit*")

    if ($isUni) {
        # Already connected to M-VIT: check if login action is required
        Handle-CaptivePortal
        exit 0
    }

    # Otherwise disconnect from current network and connect to M-VIT
    Write-Host "Connecting to $uniProfile..."
    if ($info.Connected) {
        netsh wlan disconnect
        Start-Sleep -Milliseconds 600
    }
    netsh wlan connect name="$uniProfile"

    # Wait for connection and IP assignment, then check captive portal
    for ($i = 0; $i -lt 5; $i++) {
        Start-Sleep -Seconds 1
        $currentInfo = Get-WlanInfo
        if ($currentInfo.Connected) { break }
    }
    Start-Sleep -Milliseconds 1500

    Handle-CaptivePortal

} elseif ($Target -eq "hotspot") {
    $hotProfile = "Arush's OnePlus 12R"
    $hotNorm = Normalize-SSID $hotProfile

    $isHot = $info.Connected -and ($currentNorm -eq $hotNorm -or $currentNorm -like "*oneplus*")

    if ($isHot) {
        Write-Host "Already connected to $hotProfile. Doing nothing."
        exit 0
    }

    Write-Host "Connecting to $hotProfile..."
    if ($info.Connected) {
        netsh wlan disconnect
        Start-Sleep -Milliseconds 600
    }
    netsh wlan connect name="$hotProfile"

} elseif ($Target -eq "cloudflare") {
    $warpDir = "C:\Program Files\Cloudflare\Cloudflare WARP"
    $warpCli = Join-Path $warpDir "warp-cli.exe"
    $warpGui = Join-Path $warpDir "Cloudflare WARP.exe"

    if (-not (Test-Path $warpCli)) {
        $warpCli = "warp-cli.exe"
    }

    # 1. Ensure Cloudflare One service is running
    $svc = Get-Service CloudflareWARP -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -ne "Running") {
        Start-Service CloudflareWARP -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 1000
    }

    # 2. Check current connection status
    $statusOutput = & $warpCli status 2>&1 | Out-String
    $isConnected = $statusOutput -match 'Status update:\s*Connected\b'

    if ($isConnected) {
        Write-Host "Cloudflare One is Connected. Turning OFF (Disconnecting)..."
        & $warpCli disconnect
    } else {
        # Ensure the client app is running; if not, launch it
        $guiProc = Get-Process "Cloudflare WARP" -ErrorAction SilentlyContinue
        if (-not $guiProc -and (Test-Path $warpGui)) {
            Write-Host "Cloudflare One client is not running. Launching app..."
            Start-Process $warpGui
            Start-Sleep -Milliseconds 1500
        }

        Write-Host "Cloudflare One is Disconnected. Turning ON (Connecting)..."
        & $warpCli connect
    }
}
