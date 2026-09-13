// UI Manager — builds all overlay elements programmatically

class CCUIManager {
    constructor() {
        this.uiLayer = document.getElementById('ui-layer');
        this.API_URL = 'http://127.0.0.1:3000';
        
        // Build layout
        this.buildCommandCenter();
        this.buildDesktopIcons();
        this.startClock();
        
        // Initial state
        this.updateNetworkState();
        this.updateCloudflareState();
        
        // Polling state
        setInterval(() => this.updateNetworkState(), 5000);
        setInterval(() => this.updateCloudflareState(), 5000);
    }

    buildCommandCenter() {
        this.cc = document.createElement('div');
        this.cc.id = 'command-center';
        this.uiLayer.appendChild(this.cc);

        // 1. Clock
        this.buildClock();

        // 2. Network
        this.buildSection('NETWORK', [
            { id: 'net-uni', text: 'UNIVERSITY', status: 'DISCONNECTED', action: () => this.triggerAPI('POST', '/network/university', 'net-uni') },
            { id: 'net-hot', text: 'HOTSPOT', status: 'DISCONNECTED', action: () => this.triggerAPI('POST', '/network/hotspot', 'net-hot') },
            { id: 'cf-btn', text: 'CLOUDFLARE', status: 'NOT RUNNING', wide: true, action: () => this.toggleCloudflare() }
        ]);

        // 3. Applications
        this.buildSection('APPLICATIONS', [
            { text: 'VALORANT', compact: true, action: () => this.triggerAPI('POST', '/app/valorant') },
            { text: 'CURSEFORGE', compact: true, action: () => this.triggerAPI('POST', '/app/curseforge') }
        ]);

        // 4. Development
        this.buildSection('DEVELOPMENT', [
            { text: 'ANTIGRAVITY', compact: true, action: () => this.triggerAPI('POST', '/app/antigravity') },
            { text: 'TERMINAL', compact: true, action: () => this.triggerAPI('POST', '/dev/terminal') },
            { text: 'GITHUB REPOS', compact: true, wide: true, action: () => this.triggerAPI('POST', '/dev/github') }
        ]);

        // 5. Files
        this.buildSection('FILES', [
            { text: 'DOWNLOADS', compact: true, action: () => this.triggerAPI('POST', '/files/downloads') },
            { text: 'DOCUMENTS', compact: true, action: () => this.triggerAPI('POST', '/files/documents') }
        ]);
    }

    buildDesktopIcons() {
        const container = document.createElement('div');
        container.id = 'desktop-icons';

        // This PC
        const thisPc = this.createDesktopIcon('THIS PC', 'assets/this_pc.svg', () => {
            fetch(`${this.API_URL}/desktop/thispc`, { method: 'POST' });
        });
        container.appendChild(thisPc);

        // Recycle Bin
        const recycleBin = this.createDesktopIcon('RECYCLE BIN', 'assets/recycle_bin.svg', () => {
            fetch(`${this.API_URL}/desktop/recyclebin`, { method: 'POST' });
        });

        // Event listeners for drag-and-drop removed for Rainmeter handoff
        container.appendChild(recycleBin);
        this.uiLayer.appendChild(container);
    }

    createDesktopIcon(label, iconSrc, onClick) {
        const div = document.createElement('div');
        div.className = 'desktop-icon';
        
        const img = document.createElement('img');
        img.src = iconSrc;
        
        const span = document.createElement('span');
        span.textContent = label;
        
        div.appendChild(img);
        div.appendChild(span);
        // div.onclick = onClick; // REMOVED for Rainmeter handoff
        
        return div;
    }

    buildClock() {
        const widget = document.createElement('div');
        widget.id = 'clock-widget';
        widget.style.position = 'relative';
        widget.style.bottom = 'auto';
        widget.style.right = 'auto';
        widget.style.opacity = '1';
        widget.style.animation = 'none';
        
        const time = document.createElement('div');
        time.id = 'clock-time';

        this.hoursEl = document.createElement('span');
        this.separatorEl = document.createElement('span');
        this.separatorEl.id = 'clock-separator';
        this.separatorEl.textContent = ':';
        this.minutesEl = document.createElement('span');

        time.appendChild(this.hoursEl);
        time.appendChild(this.separatorEl);
        time.appendChild(this.minutesEl);

        this.dateEl = document.createElement('div');
        this.dateEl.id = 'clock-date';

        widget.appendChild(time);
        widget.appendChild(this.dateEl);
        this.cc.appendChild(widget);
    }

    buildSection(title, buttons) {
        const section = document.createElement('div');
        section.className = 'cc-section';

        const label = document.createElement('div');
        label.className = 'cc-label';
        label.textContent = title;
        section.appendChild(label);

        const grid = document.createElement('div');
        grid.className = 'cc-grid';

        buttons.forEach(btnConfig => {
            const btn = document.createElement('button');
            btn.className = 'cc-btn' + (btnConfig.wide ? ' wide' : '') + (btnConfig.compact ? ' compact' : '');
            if (btnConfig.id) btn.id = btnConfig.id;
            
            if (btnConfig.status !== undefined) {
                const stat = document.createElement('span');
                stat.className = 'status-text';
                stat.textContent = btnConfig.status;
                btn.appendChild(stat);
            }

            const txt = document.createElement('span');
            txt.className = 'main-text';
            txt.textContent = btnConfig.text;
            btn.appendChild(txt);

            const dot = document.createElement('span');
            dot.className = 'status-dot';
            btn.appendChild(dot);

            // btn.onclick = () => btnConfig.action(); // REMOVED for Rainmeter handoff
            grid.appendChild(btn);
        });

        section.appendChild(grid);
        this.cc.appendChild(section);
    }

    startClock() {
        this.tickClock();
        setInterval(() => this.tickClock(), 1000);
    }

    tickClock() {
        const now = new Date();
        this.hoursEl.textContent = now.getHours().toString().padStart(2, '0');
        this.minutesEl.textContent = now.getMinutes().toString().padStart(2, '0');

        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        this.dateEl.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
    }

    // ─── API Interactions ───

    async triggerAPI(method, endpoint, btnId = null) {
        if (btnId) {
            this.setButtonState(btnId, 'CONNECTING...', false);
        }
        try {
            const res = await fetch(`${this.API_URL}${endpoint}`, { method });
            const data = await res.json();
            
            // Re-poll immediately to update real status
            setTimeout(() => {
                this.updateNetworkState();
                this.updateCloudflareState();
            }, 1000);
            
        } catch (e) {
            if (btnId) this.setButtonState(btnId, 'FAILED', false);
        }
    }

    async toggleCloudflare() {
        this.setButtonState('cf-btn', 'UPDATING...', false);
        try {
            const res = await fetch(`${this.API_URL}/cloudflare/status`);
            const data = await res.json();
            const endpoint = data.running ? '/cloudflare/stop' : '/cloudflare/start';
            await this.triggerAPI('POST', endpoint);
        } catch (e) {
            this.setButtonState('cf-btn', 'FAILED', false);
        }
    }

    async updateNetworkState() {
        try {
            const res = await fetch(`${this.API_URL}/network/status`);
            const data = await res.json();
            
            if (data.connected && data.ssid) {
                const isUni = data.ssid.toLowerCase().includes('vit');
                const isHot = data.ssid.toLowerCase().includes('arush');
                
                this.setButtonState('net-uni', isUni ? 'CONNECTED' : 'DISCONNECTED', isUni);
                this.setButtonState('net-hot', isHot ? 'CONNECTED' : 'DISCONNECTED', isHot);
            } else {
                this.setButtonState('net-uni', 'DISCONNECTED', false);
                this.setButtonState('net-hot', 'DISCONNECTED', false);
            }
        } catch (e) {
            // Helper not running
        }
    }

    async updateCloudflareState() {
        try {
            const res = await fetch(`${this.API_URL}/cloudflare/status`);
            const data = await res.json();
            this.setButtonState('cf-btn', data.running ? 'RUNNING' : 'NOT RUNNING', data.running);
        } catch (e) {
            // Helper not running
        }
    }

    setButtonState(id, statusText, isActive) {
        const btn = document.getElementById(id);
        if (!btn) return;
        
        if (isActive) btn.classList.add('active');
        else btn.classList.remove('active');
        
        const statEl = btn.querySelector('.status-text');
        if (statEl) statEl.textContent = statusText;
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    window.uiManager = new CCUIManager();
});
