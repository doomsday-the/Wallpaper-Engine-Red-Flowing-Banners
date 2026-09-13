// ─── Default Settings ───
// Overridden at runtime by Wallpaper Engine's property system.

window.WallpaperSettings = {
    breathingEnabled:   true,
    breathingSpeed:     0.12,
    breathingAmplitude: 0.06,

    lightingEnabled:    true,
    lightingIntensity:  2.5,
    lightingSpeed:      0.12,

    deformationEnabled: true,
    deformationAmount:  0.025,

    parallaxEnabled:    true,
    parallaxAmount:     3.0,
    parallaxSmoothing:  0.05,

    // Internal mouse state
    mouseX: 0.5,  mouseY: 0.5,
    targetMouseX: 0.5,  targetMouseY: 0.5
};

// ─── Boot ───

document.addEventListener('DOMContentLoaded', () => {
    const renderer = new window.WallpaperRenderer();

    // Mouse tracking for parallax
    document.addEventListener('mousemove', (e) => {
        window.WallpaperSettings.targetMouseX = e.clientX / window.innerWidth;
        window.WallpaperSettings.targetMouseY = e.clientY / window.innerHeight;
    });

    // Wallpaper Engine property bridge
    window.wallpaperPropertyListener = {
        applyUserProperties(properties) {
            const s = window.WallpaperSettings;
            if (properties.breathingEnabled)  s.breathingEnabled  = properties.breathingEnabled.value;
            if (properties.breathingSpeed)    s.breathingSpeed    = properties.breathingSpeed.value;
            if (properties.lightingEnabled)   s.lightingEnabled   = properties.lightingEnabled.value;
            if (properties.lightingIntensity) s.lightingIntensity = properties.lightingIntensity.value;
            if (properties.deformationEnabled) s.deformationEnabled = properties.deformationEnabled.value;
            if (properties.parallaxEnabled)   s.parallaxEnabled   = properties.parallaxEnabled.value;
            if (properties.parallaxAmount)    s.parallaxAmount    = properties.parallaxAmount.value;
        }
    };
});
