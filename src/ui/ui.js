// UI Logic for Clock and Date

class UIManager {
    constructor() {
        this.timeDisplay = document.getElementById('time-display');
        this.dateDisplay = document.getElementById('date-display');
        
        // Start the clock
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    updateClock() {
        if (!this.timeDisplay || !this.dateDisplay) return;

        const now = new Date();
        
        // Format time (HH:MM)
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        this.timeDisplay.textContent = `${hours}:${minutes}`;

        // Format date (DAY, MON DD)
        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        
        const dayName = days[now.getDay()];
        const monthName = months[now.getMonth()];
        const date = now.getDate();
        
        this.dateDisplay.textContent = `${dayName}, ${monthName} ${date}`;
    }
}

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.uiManager = new UIManager();
    console.log("UI Manager Initialized.");
});
