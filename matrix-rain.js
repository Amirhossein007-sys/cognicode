/* MatrixRain canvas renderer, adapted from the supplied React component.
   Shared by WKWebView and Android WebView; no framework or network dependency. */
'use strict';
window.MatrixRain = (() => {
  const root = document.getElementById('matrix-background');
  const canvas = root?.querySelector('canvas');
  const context = canvas?.getContext('2d', { alpha: false });
  if (!context) return { refresh() {}, setFocus() {} };
  const glyphs = Array.from('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン');
  const android = !!(window.AndroidBridge || /android/i.test(navigator.userAgent));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fontSize = 24, columnWidth = fontSize / .9, trail = .9;
  let width = 0, height = 0, ratio = 0, columns = [], frame = 0, last = 0, accumulator = 0, elapsed = 0;
  let background, color, highlight, active = true, focused = false, typing = false, typingTimer;
  let pointer = { active: false, x: 0, y: 0 };
  function randomFrom(seed) { const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return value - Math.floor(value); }
  function createColumn(index) {
    const seed = index * 47.17 + 11.3;
    return { head: 1.5 - randomFrom(seed + 2.4) * 10.5, seed, velocity: 9 + randomFrom(seed + 5.7) * 11 };
  }
  function characterAt(seed) { return glyphs[Math.floor(randomFrom(seed) * glyphs.length)] || '0'; }
  function configureText() {
    context.font = `500 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    context.textAlign = 'center'; context.textBaseline = 'middle';
  }
  function clear() {
    context.globalAlpha = 1; context.shadowBlur = 0; context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }
  function drawStatic() {
    clear(); configureText();
    columns.forEach((column, index) => {
      const x = index * columnWidth + columnWidth * .5;
      const length = 10 + Math.floor(randomFrom(column.seed + 8) * 16);
      for (let offset = 0; offset < length; offset++) {
        const row = Math.floor(column.head) - offset, y = row * fontSize;
        if (y < -fontSize || y > height + fontSize) continue;
        const progress = offset / Math.max(length - 1, 1);
        context.globalAlpha = Math.pow(1 - progress, 2.2);
        context.fillStyle = offset === 0 ? highlight : color;
        context.fillText(characterAt(column.seed + row * 2.73), x, y);
      }
    });
    context.globalAlpha = 1;
  }
  function drawRainTick(delta) {
    const rows = Math.ceil(height / fontSize), radius = Math.max(84, fontSize * 7.5);
    context.globalAlpha = (1 - trail) * .5; context.fillStyle = background;
    context.fillRect(0, 0, width, height); configureText();
    columns.forEach((column, index) => {
      column.head += column.velocity * (focused ? .35 : 1) * delta;
      if (column.head > rows + 4) {
        const reset = createColumn(index + Math.floor(elapsed * .01));
        column.head = -4 - randomFrom(reset.seed + 9) * rows * .5;
        column.seed = reset.seed; column.velocity = reset.velocity;
      }
      const x = index * columnWidth + columnWidth * .5, y = Math.floor(column.head) * fontSize;
      if (y < -fontSize || y > height + fontSize) return;
      const dx = x - pointer.x, dy = y - pointer.y;
      const distance = pointer.active ? Math.hypot(dx, dy) : 0;
      const influence = pointer.active ? Math.max(0, 1 - distance / radius) : 0;
      const displacement = distance > 0 ? dx / distance * influence * 7 : 0;
      const glyph = characterAt(column.seed + Math.floor(column.head) * 2.73 + elapsed * .0041);
      context.globalAlpha = .82 + influence * .18; context.fillStyle = color;
      context.shadowColor = color; context.shadowBlur = android ? 0 : 2;
      context.fillText(glyph, x + displacement, y);
      context.globalAlpha = .62 + influence * .38; context.fillStyle = highlight;
      context.shadowBlur = 0; context.fillText(glyph, x + displacement, y);
    });
    context.globalAlpha = 1; context.shadowBlur = 0;
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; last = 0; accumulator = 0; }
  function tick(now) {
    frame = 0;
    if (!active || document.hidden || motion.matches || typing) return;
    const delta = last ? Math.min((now - last) / 1000, .1) : 0;
    last = now; elapsed += delta * 1000; accumulator += delta;
    // Original MatrixRain cadence: 20 canvas paints/sec, also on 120Hz phones.
    if (accumulator >= .05 - .001) { drawRainTick(accumulator); accumulator = 0; }
    frame = requestAnimationFrame(tick);
  }
  function start() {
    if (frame || !active || document.hidden || motion.matches || typing) return;
    last = 0; accumulator = 0; frame = requestAnimationFrame(tick);
  }
  function refresh() {
    const css = getComputedStyle(root);
    background = css.getPropertyValue('--matrix-background').trim();
    color = css.getPropertyValue('--matrix-color').trim();
    highlight = css.getPropertyValue('--matrix-highlight').trim();
    drawStatic();
  }
  function resize() {
    const nextWidth = root.clientWidth, nextHeight = root.clientHeight;
    const nextRatio = Math.min(devicePixelRatio || 1, android ? 1 : 1.5);
    if (width === nextWidth && height === nextHeight && ratio === nextRatio) return;
    width = Math.max(1, nextWidth); height = Math.max(1, nextHeight); ratio = nextRatio;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    columns = Array.from({ length: Math.min(64, Math.ceil(width / columnWidth) + 1) }, (_, index) => {
      const column = createColumn(index);
      // Prime a representative frame so even the fast Android launch shows rain.
      column.head = (height / fontSize) * (.15 + randomFrom(column.seed + 3) * .85);
      return column;
    });
    refresh();
  }
  function playback() { stop(); if (active && !document.hidden) { if (motion.matches) drawStatic(); else start(); } }
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', playback);
  window.addEventListener('pagehide', () => { active = false; clearTimeout(typingTimer); typing = false; stop(); });
  window.addEventListener('pageshow', () => { active = true; playback(); });
  window.addEventListener('cognicode:native-active', event => { active = !!event.detail; playback(); });
  motion.addEventListener('change', playback);
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (android) document.addEventListener('input', event => {
    if (event.target.id !== 'code') return;
    typing = true; stop(); clearTimeout(typingTimer);
    typingTimer = setTimeout(() => { typing = false; start(); }, 220);
  }, { passive: true });
  document.addEventListener('pointermove', event => {
    pointer.active = !android && event.pointerType === 'mouse' && !event.target.closest('textarea,input,button,.sheet');
    if (pointer.active) { pointer.x = event.clientX; pointer.y = event.clientY; }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });
  resize(); start();
  return { refresh, setFocus(value) { focused = !!value; pointer.active = false; } };
})();
