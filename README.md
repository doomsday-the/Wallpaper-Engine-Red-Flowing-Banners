# Wallpaper Engine Command Center 🔴

A custom, highly-functional Wallpaper Engine environment featuring a sleek, flowing 3D animated background that doubles as a system command center.

## Features

- **Ambient Aesthetics:** A beautiful, responsive, and hardware-accelerated 3D ribbon animation (WebGL/Three.js) that runs smoothly in Wallpaper Engine.
- **Sleek Command Center:** A fully transparent, right-aligned HUD that perfectly matches the wallpaper's aesthetic without relying on clunky borders or solid backgrounds.
- **Node.js Helper Service:** A secure localhost API (`helper/server.js`) that allows Wallpaper Engine to interact with the underlying Windows OS.
- **Application Launcher:** Quickly launch your favorite games and development tools (Valorant, CurseForge, Antigravity IDE, Terminal) straight from your desktop.
- **Network Controls:** Seamlessly switch between University Wi-Fi and Personal Hotspot, and toggle Cloudflare WARP with visual status indicators.
- **Interactive Desktop Icons:** Beautiful minimalist wireframe icons for "This PC" and "Recycle Bin" in the top-left corner.
- **Drag-and-Drop Trashing:** Simply drag files from your desktop onto the wireframe Recycle Bin icon to safely send them to the Windows Trash via PowerShell integration.

## Project Structure

```
├── assets/          # Textures and wireframe desktop icons (This PC, Recycle Bin)
├── config/          # Centralized configuration (config.json) for your local app paths
├── helper/          # Node.js Express server to handle OS-level commands securely
└── src/             # Wallpaper Engine frontend (HTML/CSS/JS)
```

## Setup & Installation

To get the full functionality out of the Command Center, you need to run the local helper server alongside Wallpaper Engine.

1. **Load into Wallpaper Engine:**
   - Point Wallpaper Engine to the `src/index.html` file.

2. **Configure your paths:**
   - Open `config/config.json`.
   - Update the executable paths to match where apps (like Valorant, CurseForge, Antigravity) are installed on your machine.

3. **Start the Helper Service:**
   - Open a terminal in the `helper/` directory.
   - Run `npm install` to grab the dependencies.
   - Run `npm start` (or use a background process manager like PM2) to keep the API running on `localhost:3000`.

## Architecture & Security

Wallpaper Engine runs in a restricted Chromium instance and cannot directly execute arbitrary Windows shell commands. To bridge this gap safely, the frontend makes standard `fetch()` calls to a lightweight local Node.js Express server (`helper/server.js`), which validates and executes specific pre-configured commands (like opening applications or routing files to the Recycle Bin).

## Version History

- **v1.1**: Sleek UI overhaul (transparent flush-right links), and interactive drag-and-drop desktop icons.
- **v1.0**: Core command center functionality, helper server, and application launching.
