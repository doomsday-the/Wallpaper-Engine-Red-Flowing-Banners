class WallpaperRenderer {
    constructor() {
        this.ctx = new window.GLContext('glcanvas');
        if (!this.ctx.gl) return;

        this.gl = this.ctx.gl;
        
        // Enable Alpha Blending
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        this.program = this.ctx.createProgram(window.Shaders.vertex, window.Shaders.fragment);
        this.gl.useProgram(this.program);

        // Setup geometry (fullscreen quad)
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        const positions = [
            -1.0,  1.0,
             1.0,  1.0,
            -1.0, -1.0,
             1.0, -1.0,
        ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        const texCoords = [
            0.0,  0.0,
            1.0,  0.0,
            0.0,  1.0,
            1.0,  1.0,
        ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.STATIC_DRAW);

        this.setupLocations();

        // Load images
        this.imgWidth = 1920;
        this.imgHeight = 1080;
        
        this.bgLoaded = false;
        this.fgLoaded = false;
        
        const cb = '?v=' + Date.now();
        this.textureBg = this.ctx.createTexture('assets/bg_layer.png' + cb, (w, h) => {
            this.imgWidth = w;
            this.imgHeight = h;
            this.bgLoaded = true;
            this.calculateAspect();
        });
        
        this.textureFg = this.ctx.createTexture('assets/fg_layer.png' + cb, (w, h) => {
            this.fgLoaded = true;
        });

        this.startTime = Date.now();
        this.smoothedMouseX = 0;
        this.smoothedMouseY = 0;
        this.uvScale = [1.0, 1.0];

        this.resize();
        window.addEventListener('resize', () => {
            this.resize();
            this.calculateAspect();
        });

        this.render = this.render.bind(this);
        requestAnimationFrame(this.render);
    }

    setupLocations() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.vertexPositionLoc = this.gl.getAttribLocation(this.program, 'aVertexPosition');
        this.gl.vertexAttribPointer(this.vertexPositionLoc, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.vertexPositionLoc);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.textureCoordLoc = this.gl.getAttribLocation(this.program, 'aTextureCoord');
        this.gl.vertexAttribPointer(this.textureCoordLoc, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.textureCoordLoc);

        // Uniforms
        this.uResolution = this.gl.getUniformLocation(this.program, 'uResolution');
        this.uTime = this.gl.getUniformLocation(this.program, 'uTime');
        this.uSamplerBg = this.gl.getUniformLocation(this.program, 'uSamplerBg');
        this.uSamplerFg = this.gl.getUniformLocation(this.program, 'uSamplerFg');
        this.uUVScale = this.gl.getUniformLocation(this.program, 'uUVScale');
        this.uUVOffset = this.gl.getUniformLocation(this.program, 'uUVOffset');

        // Settings uniforms
        this.uBreathingEnabled = this.gl.getUniformLocation(this.program, 'uBreathingEnabled');
        this.uBreathingSpeed = this.gl.getUniformLocation(this.program, 'uBreathingSpeed');
        this.uBreathingAmplitude = this.gl.getUniformLocation(this.program, 'uBreathingAmplitude');
        
        this.uParallaxEnabled = this.gl.getUniformLocation(this.program, 'uParallaxEnabled');
        this.uParallaxAmount = this.gl.getUniformLocation(this.program, 'uParallaxAmount');
        this.uMouseParallax = this.gl.getUniformLocation(this.program, 'uMouseParallax');
        
        this.uLightingEnabled = this.gl.getUniformLocation(this.program, 'uLightingEnabled');
        this.uLightingIntensity = this.gl.getUniformLocation(this.program, 'uLightingIntensity');
        this.uLightingSpeed = this.gl.getUniformLocation(this.program, 'uLightingSpeed');
        
        this.uDeformationEnabled = this.gl.getUniformLocation(this.program, 'uDeformationEnabled');
        this.uDeformationAmount = this.gl.getUniformLocation(this.program, 'uDeformationAmount');
    }

    resize() {
        this.canvasWidth = window.innerWidth;
        this.canvasHeight = window.innerHeight;
        this.ctx.canvas.width = this.canvasWidth;
        this.ctx.canvas.height = this.canvasHeight;
        this.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
    }
    
    calculateAspect() {
        if (!this.bgLoaded) return;
        const canvasAspect = this.canvasWidth / this.canvasHeight;
        const imgAspect = this.imgWidth / this.imgHeight;
        
        let scaleX = 1.0;
        let scaleY = 1.0;
        
        if (canvasAspect > imgAspect) {
            scaleY = imgAspect / canvasAspect;
        } else {
            scaleX = canvasAspect / imgAspect;
        }
        
        // Slight zoom to hide edges during parallax
        this.uvScale = [scaleX * 0.95, scaleY * 0.95];
    }

    updateMouseParallax() {
        const s = window.WallpaperSettings;
        this.smoothedMouseX += (s.targetMouseX - this.smoothedMouseX) * s.parallaxSmoothing;
        this.smoothedMouseY += (s.targetMouseY - this.smoothedMouseY) * s.parallaxSmoothing;
        
        s.mouseX = this.smoothedMouseX;
        s.mouseY = this.smoothedMouseY;
    }

    render() {
        if (!this.bgLoaded || !this.fgLoaded) {
            requestAnimationFrame(this.render);
            return;
        }

        const time = (Date.now() - this.startTime) / 1000.0;
        this.updateMouseParallax();

        const s = window.WallpaperSettings;
        const gl = this.gl;

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform2f(this.uResolution, this.canvasWidth, this.canvasHeight);
        gl.uniform1f(this.uTime, time);
        
        gl.uniform2f(this.uUVScale, this.uvScale[0], this.uvScale[1]);
        gl.uniform2f(this.uUVOffset, 0.0, 0.0);

        // Settings uniforms
        gl.uniform1f(this.uBreathingEnabled, s.breathingEnabled ? 1.0 : 0.0);
        gl.uniform1f(this.uBreathingSpeed, s.breathingSpeed);
        gl.uniform1f(this.uBreathingAmplitude, s.breathingAmplitude);
        
        gl.uniform1f(this.uParallaxEnabled, s.parallaxEnabled ? 1.0 : 0.0);
        gl.uniform1f(this.uParallaxAmount, s.parallaxAmount);
        
        const px = -(s.mouseX - 0.5) * 2.0;
        const py = -(s.mouseY - 0.5) * 2.0;
        gl.uniform2f(this.uMouseParallax, px, py);

        gl.uniform1f(this.uLightingEnabled, s.lightingEnabled ? 1.0 : 0.0);
        gl.uniform1f(this.uLightingIntensity, s.lightingIntensity);
        gl.uniform1f(this.uLightingSpeed, s.lightingSpeed);

        gl.uniform1f(this.uDeformationEnabled, s.deformationEnabled ? 1.0 : 0.0);
        gl.uniform1f(this.uDeformationAmount, s.deformationAmount);

        // Bind Background Texture to unit 0
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textureBg);
        gl.uniform1i(this.uSamplerBg, 0);

        // Bind Foreground Texture to unit 1
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textureFg);
        gl.uniform1i(this.uSamplerFg, 1);

        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        requestAnimationFrame(this.render);
    }
}

window.WallpaperRenderer = WallpaperRenderer;
