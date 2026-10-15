/* ══════════════════════════════════════════════════════════════
   GlassFold: Animated WebGL GradFlow Shader Engine
   For CogniCode Mobile (iOS WKWebView & Android WebView)
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  const container = document.getElementById('glass-fold-background');
  if (!container) return;

  const canvas = container.querySelector('canvas') || document.createElement('canvas');
  if (!canvas.parentElement) {
    canvas.className = 'gf-canvas';
    container.insertBefore(canvas, container.firstChild);
  }

  const VERTEX = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const FRAGMENT = `
    precision highp float;

    uniform float u_time;
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform vec3 u_color3;
    uniform float u_scale;
    uniform float u_noise;
    uniform vec2 u_resolution;
    varying vec2 vUv;

    float grain(vec2 st) {
      return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
    }

    vec2 centered(vec2 uv) {
      vec2 p = uv - 0.5;
      p.x *= u_resolution.x / max(u_resolution.y, 1.0);
      return p;
    }

    mat2 rot(float a) {
      float s = sin(a);
      float c = cos(a);
      return mat2(c, -s, s, c);
    }

    vec3 shade(vec2 uv, float time) {
      vec2 q = rot(0.6) * centered(uv) * 2.0 * u_scale;
      float t = time * 0.6;
      float pixel = 2.0 * u_scale / max(u_resolution.y, 1.0);

      vec3 color = mix(u_color2, u_color2 * 0.45, clamp(length(centered(uv)) * 1.3, 0.0, 1.0));

      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float bend = mod(fi, 2.0) * 2.0 - 1.0;

        float crease = (fi - 2.5) * 0.4
                     + 0.26 * sin(q.x * (1.05 + 0.12 * fi) + fi * 1.9 + t * (0.25 + 0.05 * fi))
                     + 0.1 * bend * q.x * q.x;
        float s = q.y - crease;
        float pane = smoothstep(-pixel, pixel, s);
        float back = max(s, 0.0);

        float body = exp(-back * 1.7);
        float fresnel = exp(-back * 8.0);
        float rim = exp(-back * 80.0);
        float inner = exp(-pow((back - 0.045) / 0.014, 2.0));
        float bloom = exp(-abs(s) * 20.0);

        vec3 tint = mix(u_color1, u_color3, clamp(fresnel * 0.6 + 0.08 + 0.14 * sin(fi * 2.1 + q.x * 0.8 + t * 0.2), 0.0, 1.0));
        vec3 light = tint * pane * (body * 0.42 + fresnel * 0.4)
                   + u_color3 * (pane * (rim * 0.6 + inner * 0.12) + bloom * 0.1);

        color += light * (1.0 - color);
      }

      return clamp(color, 0.0, 1.0);
    }

    void main() {
      vec3 color = shade(vUv, u_time);
      if (u_noise > 0.001) {
        float g = grain(vUv * 200.0 + u_time * 0.1);
        color *= 1.0 - u_noise * 0.4 + u_noise * g * 0.4;
      }
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function hexToVec3(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const n = parseInt(full, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  // Theme palettes:
  // Dark: Exact GradFlow colors from Image 1: #1E3CC8, #06081E, #96D7FF
  // Light: Soft crystal palette ensuring high contrast with dark text/editor
  const THEMES = {
    dark: {
      color1: '#1e3cc8',
      color2: '#06081e',
      color3: '#96d7ff',
      speed: 0.35,
      scale: 1.0,
      noise: 0.08,
    },
    light: {
      color1: '#3b82f6',
      color2: '#eef5fc',
      color3: '#ffffff',
      speed: 0.35,
      scale: 1.0,
      noise: 0.04,
    },
  };

  function getCurrentThemeConfig() {
    const isLight = document.documentElement.dataset.theme === 'light';
    return isLight ? THEMES.light : THEMES.dark;
  }

  let gl;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch (e) {
    gl = null;
  }

  if (!gl) {
    container.classList.add('gf-no-webgl');
    return;
  }

  const vShader = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fShader = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vShader || !fShader) {
    container.classList.add('gf-no-webgl');
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    container.classList.add('gf-no-webgl');
    return;
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const u = {
    time: gl.getUniformLocation(program, 'u_time'),
    color1: gl.getUniformLocation(program, 'u_color1'),
    color2: gl.getUniformLocation(program, 'u_color2'),
    color3: gl.getUniformLocation(program, 'u_color3'),
    scale: gl.getUniformLocation(program, 'u_scale'),
    noise: gl.getUniformLocation(program, 'u_noise'),
    resolution: gl.getUniformLocation(program, 'u_resolution'),
  };

  let config = getCurrentThemeConfig();

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  };

  let elapsed = 0;
  let last = null;
  let frame = null;
  let isRunning = false;
  let nativeActive = true;
  let energySaving = !!(window.__cogniEnergy && (window.__cogniEnergy.lowPower || window.__cogniEnergy.thermal >= 1));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function drawFrame(now) {
    if (last !== null) {
      elapsed += Math.min((now - last) / 1000, 0.1) * config.speed;
    }
    last = now;

    resize();
    gl.uniform1f(u.time, elapsed);
    gl.uniform3fv(u.color1, hexToVec3(config.color1));
    gl.uniform3fv(u.color2, hexToVec3(config.color2));
    gl.uniform3fv(u.color3, hexToVec3(config.color3));
    gl.uniform1f(u.scale, config.scale);
    gl.uniform1f(u.noise, config.noise);
    gl.uniform2f(u.resolution, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function loop(now) {
    if (!isRunning) return;
    drawFrame(now);
    if (!reducedMotion.matches && !energySaving) {
      frame = requestAnimationFrame(loop);
    }
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    last = null;
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    isRunning = false;
    if (frame) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  }

  function renderStill() {
    drawFrame(performance.now());
  }

  function evaluateState() {
    config = getCurrentThemeConfig();
    const shouldRun = nativeActive && !document.hidden && !reducedMotion.matches && !energySaving;
    if (shouldRun) {
      start();
    } else {
      stop();
      renderStill();
    }
  }

  // Lifecycle listeners
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else evaluateState();
  });
  window.addEventListener('pageshow', () => { nativeActive = true; evaluateState(); });
  window.addEventListener('pagehide', () => { nativeActive = false; stop(); });
  window.addEventListener('cognicode:native-active', (e) => {
    nativeActive = !!e.detail;
    evaluateState();
  });
  window.addEventListener('cognicode:energy-change', (e) => {
    const energy = e.detail || {};
    energySaving = !!(energy.lowPower || energy.thermal >= 1);
    evaluateState();
  });
  reducedMotion.addEventListener('change', evaluateState);

  // Theme observer
  const themeObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'data-theme') {
        config = getCurrentThemeConfig();
        renderStill();
      }
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const resizeObserver = new ResizeObserver(() => {
    renderStill();
  });
  resizeObserver.observe(canvas);

  // Initial draw and loop start
  resize();
  evaluateState();

  window.GlassFoldBg = {
    renderStill,
    setTheme(theme) {
      if (THEMES[theme]) {
        config = THEMES[theme];
        renderStill();
      }
    },
  };
})();
