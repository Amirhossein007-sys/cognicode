/* Adaptation of the supplied particles-bg appearance, without a CDN/runtime.
   Timestamp-based motion, bounded retina buffer, and reduced-motion support. */
'use strict';
window.Sonar = (() => {
  const host = document.getElementById('particles-js');
  const canvas = host?.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return { refresh() {}, setFocus() {} };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, particles = [], frame = 0, last = 0, time = 0;
  let suspended = false, light = false, pointer = null, focused = false;
  const randomParticle = (x = Math.random() * width, y = Math.random() * height) => ({
    x, y, vx: (Math.random() - .5) * 40, vy: (Math.random() - .5) * 40,
    radius: 1 + Math.random() * 2, phase: Math.random() * Math.PI * 2
  });
  function draw(delta = 0) {
    time += delta;
    ctx.clearRect(0, 0, width, height);
    const dot = light ? '2,119,189' : '0,245,255';
    const line = light ? '2,136,209' : '0,217,255';
    for (const p of particles) {
      p.x += p.vx * delta; p.y += p.vy * delta;
      if (p.x < 0 || p.x > width) { p.vx *= -1; p.x = Math.max(0, Math.min(width, p.x)); }
      if (p.y < 0 || p.y > height) { p.vy *= -1; p.y = Math.max(0, Math.min(height, p.y)); }
    }
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j], distance = Math.hypot(p.x - q.x, p.y - q.y);
        if (distance >= 160) continue;
        ctx.strokeStyle = `rgba(${line},${.4 * (1 - distance / 160)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
      if (pointer && !reduced.matches) {
        const distance = Math.hypot(p.x - pointer.x, p.y - pointer.y);
        if (distance < 220) {
          ctx.strokeStyle = `rgba(${line},${.8 * (1 - distance / 220)})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(${dot},${.5 + .2 * Math.sin(time + p.phase)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * (.8 + .2 * Math.sin(time * 2 + p.phase)), 0, Math.PI * 2); ctx.fill();
    }
  }
  function tick(now) {
    frame = 0;
    if (suspended || document.hidden || reduced.matches) return;
    draw(last ? Math.min((now - last) / 1000, .05) * (focused ? .25 : 1) : 0);
    last = now;
    frame = requestAnimationFrame(tick);
  }
  function playback() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (!suspended && !document.hidden) {
      draw();
      if (!reduced.matches) frame = requestAnimationFrame(tick);
    }
  }
  function refresh() {
    light = document.documentElement.dataset.theme === 'light';
    if (!document.hidden && !suspended) draw();
  }
  function resize() {
    width = host.clientWidth; height = host.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Match the reference density, with a fixed upper bound for mobile GPUs.
    particles = Array.from({ length: Math.min(140, Math.max(24, Math.round(width * height / 800000 * 140))) }, () => randomParticle());
    refresh();
  }
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', playback);
  window.addEventListener('pagehide', () => { suspended = true; playback(); });
  window.addEventListener('pageshow', () => { suspended = false; playback(); });
  reduced.addEventListener('change', playback);
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  // Listen passively: the decorative canvas never blocks editor gestures.
  document.addEventListener('pointermove', event => {
    pointer = event.pointerType === 'mouse' ? { x: event.clientX, y: event.clientY } : null;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; });
  document.addEventListener('pointerdown', event => {
    if (reduced.matches || event.target.closest('button,textarea,input,.sheet,.editor,.keys,.bottom')) return;
    particles.push(...Array.from({ length: 4 }, () => randomParticle(event.clientX, event.clientY)));
    if (particles.length > 140) particles.splice(0, particles.length - 140);
  }, { passive: true });
  resize(); playback();
  return { refresh, setFocus(value) { focused = !!value; pointer = null; } };
})();
