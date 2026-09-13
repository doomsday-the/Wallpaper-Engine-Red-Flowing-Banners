window.Shaders = {
    vertex: `
        attribute vec4 aVertexPosition;
        attribute vec2 aTextureCoord;

        varying vec2 vTextureCoord;

        void main() {
            // Background is completely frozen, so we don't shift the vertex positions at all
            gl_Position = vec4(aVertexPosition.xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }
    `,

    fragment: `
        precision highp float;

        varying vec2 vTextureCoord;

        uniform sampler2D uSamplerBg;
        uniform sampler2D uSamplerFg;
        uniform float uTime;
        uniform vec2 uResolution;
        
        uniform vec2 uUVScale;
        uniform vec2 uUVOffset;

        uniform float uBreathingEnabled;
        uniform float uBreathingSpeed;
        uniform float uBreathingAmplitude;
        
        uniform float uLightingEnabled;
        uniform float uLightingIntensity;
        uniform float uLightingSpeed;
        
        uniform float uDeformationEnabled;
        uniform float uDeformationAmount;

        uniform float uParallaxEnabled;
        uniform float uParallaxAmount;
        uniform vec2 uMouseParallax;

        void main() {
            vec2 finalUV = (vTextureCoord - 0.5) * uUVScale + 0.5 + uUVOffset;
            
            // 1. Draw perfectly static background (stars are frozen)
            vec4 bgColor = texture2D(uSamplerBg, finalUV);

            // 2. Foreground Animations
            vec2 noiseUV = finalUV * 2.0;
            float time = uTime * 0.0075; 
            
            vec2 disp;
            disp.x = sin(noiseUV.y * 3.1 + time) * cos(noiseUV.x * 2.2 - time);
            disp.y = cos(noiseUV.x * 2.7 - time) * sin(noiseUV.y * 3.5 + time);
            
            vec2 displacedUV = finalUV;
            
            // Apply Mouse Parallax ONLY to the foreground
            if (uParallaxEnabled > 0.5) {
                // UVs are 0 to 1, so we divide by resolution to map pixel shifts to UV space
                // Parallax amounts in settings are arbitrary, so we multiply by a reasonable scale
                vec2 shift = (uMouseParallax * uParallaxAmount * 3.0) / uResolution;
                displacedUV += shift;
            }
            
            if (uDeformationEnabled > 0.5) {
                displacedUV += disp * uDeformationAmount;
            }

            if (uBreathingEnabled > 0.5) {
                vec2 dir = finalUV - 0.5;
                float dist = length(dir);
                float breath = sin(uTime * uBreathingSpeed) * uBreathingAmplitude;
                
                vec2 irregularDir = dir + (disp * 0.5);
                displacedUV += irregularDir * breath * (1.0 - dist);
            }

            // 3. Sample the displaced foreground layer
            vec4 fgColor = texture2D(uSamplerFg, displacedUV);
            float fgLum = dot(fgColor.rgb, vec3(0.299, 0.587, 0.114));

            // 4. Lighting Highlights for Foreground
            if (uLightingEnabled > 0.5 && fgColor.a > 0.1) {
                float lightSpeed = uTime * uLightingSpeed;
                
                float wave = sin(displacedUV.x * 4.0 + displacedUV.y * 2.0 + lightSpeed);
                float wave2 = cos(displacedUV.x * -2.0 + displacedUV.y * 5.0 - lightSpeed * 0.8);
                
                float combinedLight = (wave + wave2) * 0.5;
                combinedLight = combinedLight * 0.5 + 0.5;
                
                float lightMask = smoothstep(0.05, 0.5, fgLum) * (1.0 - smoothstep(0.8, 1.0, fgLum));
                
                vec3 highlightColor = vec3(1.0, 0.8, 0.85); 
                float highlightStrength = combinedLight * lightMask * uLightingIntensity * 0.2;
                
                fgColor.rgb += highlightColor * highlightStrength;
            }

            // 5. Composite Foreground over completely frozen Background
            vec3 finalRGB = mix(bgColor.rgb, fgColor.rgb, fgColor.a);
            gl_FragColor = vec4(finalRGB, 1.0);
        }
    `
};
