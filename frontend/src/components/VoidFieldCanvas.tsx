"use client";
import React from 'react';

const RAW_HTML = `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Void Field</title>
    <style>
      /* Isolate and crop exactly to the WebGL canvas like NeuformIsolatedEffects does */
      html, body { width: 100% !important; height: 100% !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #030305 !important; }
      body { position: relative !important; display: flex !important; align-items: center !important; justify-content: center !important; }
      body > * { visibility: hidden !important; }
      #webgl-canvas { visibility: visible !important; position: fixed !important; inset: 0 !important; width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important; z-index: 0 !important; opacity: 1 !important; pointer-events: none !important; mix-blend-mode: normal !important; }
    </style>
</head>
<body>
    <canvas id="webgl-canvas"></canvas>

    <script>
        const canvas = document.getElementById('webgl-canvas');
        const gl = canvas.getContext('webgl', { alpha: true, antialias: false });

        if (gl) {
            const resize = () => {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                gl.viewport(0, 0, canvas.width, canvas.height);
            };
            window.addEventListener('resize', resize);
            resize();

            const vertexShaderSource = __BACKTICK__
                attribute vec2 position;
                void main() {
                    gl_Position = vec4(position, 0.0, 1.0);
                }
            __BACKTICK__;

            const fragmentShaderSource = __BACKTICK__
                precision highp float;
                uniform vec2 iResolution;
                uniform float iTime;
                uniform vec2 uMouse;

                vec2 barrel(vec2 uv, float amt) {
                    vec2 cc = uv - 0.5;
                    float r = dot(cc, cc);
                    return uv + cc * r * amt;
                }

                float rand(vec2 co) {
                    return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
                }

                void main() {
                    vec2 uv = gl_FragCoord.xy / iResolution.xy;
                    
                    // Parallax drift based on uMouse
                    vec2 mouseOffset = (uMouse - 0.5) * 0.05;
                    uv += mouseOffset;

                    // Barrel distortion curvature
                    uv = barrel(uv, 0.2);

                    // Clamp edges
                    if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        return;
                    }

                    // Dot matrix resolution
                    vec2 gridCount = vec2(100.0, 100.0 * (iResolution.y / iResolution.x));
                    vec2 gridUv = fract(uv * gridCount);
                    vec2 id = floor(uv * gridCount);

                    // Radial symmetry distance
                    vec2 cc = id / gridCount - 0.5;
                    float dist = length(cc);
                    
                    // Slow breathing pulse
                    float pulse = sin(iTime * 1.5 - dist * 10.0) * 0.5 + 0.5;

                    // Dot formulation
                    float dotSize = 0.35 * pulse;
                    float d = length(gridUv - 0.5);
                    float circle = smoothstep(dotSize, dotSize - 0.05, d);

                    // Digital scanlines
                    float scanline = sin(uv.y * 800.0) * 0.03;

                    // Randomized flicker
                    float flicker = rand(vec2(iTime, id.y)) > 0.98 ? 0.4 : 1.0;

                    // Base color compilation (Tinted Monotone Purple)
                    vec3 col = vec3(circle * pulse * flicker);
                    col -= scanline;
                    col *= vec3(0.7, 0.3, 1.0); // Purple tint
                    
                    // Vignette edge masking
                    col *= smoothstep(0.8, 0.2, dist);

                    gl_FragColor = vec4(col, 1.0);
                }
            __BACKTICK__;

            const compileShader = (type, source) => {
                const shader = gl.createShader(type);
                gl.shaderSource(shader, source);
                gl.compileShader(shader);
                return shader;
            };

            const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            gl.useProgram(program);

            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
                -1.0,  1.0,  1.0, -1.0,  1.0,  1.0
            ]), gl.STATIC_DRAW);

            const positionLocation = gl.getAttribLocation(program, "position");
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

            const iResLoc = gl.getUniformLocation(program, "iResolution");
            const iTimeLoc = gl.getUniformLocation(program, "iTime");
            const uMouseLoc = gl.getUniformLocation(program, "uMouse");

            // Interactive pointer drift tracking
            let mouseX = 0.5, mouseY = 0.5;
            document.addEventListener('mousemove', (e) => {
                mouseX = e.clientX / window.innerWidth;
                mouseY = 1.0 - (e.clientY / window.innerHeight);
            });

            const startTime = performance.now();
            const render = (time) => {
                const elapsedTime = (time - startTime) / 1000.0;
                
                gl.uniform2f(iResLoc, canvas.width, canvas.height);
                gl.uniform1f(iTimeLoc, elapsedTime);
                gl.uniform2f(uMouseLoc, mouseX, mouseY);

                gl.drawArrays(gl.TRIANGLES, 0, 6);
                requestAnimationFrame(render);
            };
            requestAnimationFrame(render);
        }
    </script>
</body>
</html>`.replace(/__BACKTICK__/g, '`');

export default function PredictiveArcCanvas({ hue = 0, saturation = 1, brightness = 1 }: any) {
    const filter = hue === 0 && saturation === 1 && brightness === 1
        ? undefined
        : `hue-rotate(${hue}deg) saturate(${saturation}) brightness(${brightness})`;

    return (
        <iframe
            title="Void Field shader background"
            srcDoc={RAW_HTML}
            sandbox="allow-scripts"
            loading="eager"
            style={{
                display: "block",
                width: "100%",
                height: "100%",
                border: 0,
                background: "#030305",
                filter,
            }}
        />
    );
}
