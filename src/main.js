// Main Entry Point

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Renderer
    const renderer = new window.WallpaperRenderer();
    console.log("Wallpaper Renderer Initialized.");

    // Track mouse movement for parallax
    document.addEventListener('mousemove', (e) => {
        // Normalize mouse coordinates to 0.0 -> 1.0
        window.WallpaperSettings.targetMouseX = e.clientX / window.innerWidth;
        window.WallpaperSettings.targetMouseY = e.clientY / window.innerHeight;
    });

    // Wallpaper Engine Property Listener
    window.wallpaperPropertyListener = {
        applyUserProperties: function(properties) {
            const s = window.WallpaperSettings;

            if (properties.breathingEnabled) {
                s.breathingEnabled = properties.breathingEnabled.value;
            }
            if (properties.breathingSpeed) {
                s.breathingSpeed = properties.breathingSpeed.value;
            }
            
            if (properties.lightingEnabled) {
                s.lightingEnabled = properties.lightingEnabled.value;
            }
            if (properties.lightingIntensity) {
                s.lightingIntensity = properties.lightingIntensity.value;
            }

            if (properties.deformationEnabled) {
                s.deformationEnabled = properties.deformationEnabled.value;
            }

            if (properties.parallaxEnabled) {
                s.parallaxEnabled = properties.parallaxEnabled.value;
            }
            if (properties.parallaxAmount) {
                s.parallaxAmount = properties.parallaxAmount.value;
            }
        }
    };
});
