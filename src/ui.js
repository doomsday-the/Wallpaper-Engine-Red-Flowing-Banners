// UI Manager — builds all overlay elements programmatically

class UIManager {
    constructor() {
        this.uiLayer = document.getElementById('ui-layer');
        this.buildClock();
        this.startClock();
    }

    buildClock() {
        const widget = document.createElement('div');
        widget.id = 'clock-widget';

        // Time row
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

        // Date row
        this.dateEl = document.createElement('div');
        this.dateEl.id = 'clock-date';

        widget.appendChild(time);
        widget.appendChild(this.dateEl);
        this.uiLayer.appendChild(widget);
    }

    startClock() {
        this.tickClock();
        setInterval(() => this.tickClock(), 1000);
    }

    tickClock() {
        const now = new Date();
        this.hoursEl.textContent   = now.getHours().toString().padStart(2, '0');
        this.minutesEl.textContent = now.getMinutes().toString().padStart(2, '0');

        const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const months = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];

        this.dateEl.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    window.uiManager = new UIManager();
});
