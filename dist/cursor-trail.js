// A quiet hexadecimal trace in the negative space, never over the controls.
const BLOCKED = [
  'a', 'button', 'input', 'select', 'textarea', 'label', 'form', 'summary',
  'header', 'nav', 'dialog', 'article', 'pre', 'canvas', 'svg', 'img',
  'h1', 'h2', 'h3', 'h4', 'p', 'span', 'small', 'li', 'dt', 'dd',
  '[role="button"]', '[role="listbox"]', '[contenteditable]',
  '.hero-copy', '.planet-stage', '.network-strip', '.payment-copy',
  '.payment-terminal', '.eco-map', '.eco-detail', '.earn-copy',
  '.earn-calculator', '.code-terminal', '.dev-tags', '.final-lockup',
  '[data-no-trail]'
].join(',');

export function initCursorTrail() {
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'cursor-trail';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { destroy() {} };
  document.body.append(canvas);

  let particles = [];
  let previous = null;
  let frame = 0;
  let width = 0;
  let height = 0;
  let scale = 1;
  let lastEmission = 0;
  let lastPointerTime = 0;
  const glyphs = '0123456789abcdef';
  // Hero layers intentionally let pointer events through; hit-test their visible bounds too.
  const transparentBlocks = [...document.querySelectorAll('.hero-copy, .planet-stage')];
  const enabled = () => finePointer.matches && !reducedMotion.matches && !document.hidden;

  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = null;
    particles = [];
    ctx.clearRect(0, 0, width, height);
  }

  function resize() {
    clear();
    width = innerWidth;
    height = innerHeight;
    scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function draw(now) {
    frame = 0;
    ctx.clearRect(0, 0, width, height);
    particles = particles.filter(p => now - p.born < p.life);
    ctx.font = '9px "DM Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#bcff75';
    for (const p of particles) {
      const age = (now - p.born) / p.life;
      ctx.globalAlpha = .48 * Math.pow(1 - age, 1.35);
      ctx.fillText(p.glyph, p.x, p.y + age * 5);
    }
    ctx.globalAlpha = 1;
    if (particles.length) frame = requestAnimationFrame(draw);
  }

  function move(event) {
    if (!enabled() || event.pointerType !== 'mouse' || document.querySelector('dialog[open]') || event.target.closest?.(BLOCKED)) {
      previous = null;
      return;
    }
    const now = performance.now();
    const next = { x: event.clientX, y: event.clientY, time: now };
    const restarting = !previous || now - lastPointerTime > 160;
    lastPointerTime = now;
    if (restarting) { previous = next; return; }
    const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
    if (distance < 13 || now - lastEmission < 26) return;
    const touchesHero = transparentBlocks.some(element => {
      const rect = element.getBoundingClientRect();
      return next.x + 6 >= rect.left && next.x - 6 <= rect.right && next.y + 20 >= rect.top && next.y - 6 <= rect.bottom;
    });
    // Include the glyph's small downward drift, so traces stay out of nearby content.
    const touchesContent = [[0, 0], [-5, 3], [5, 3], [-5, 20], [5, 20]].some(([dx, dy]) => document.elementFromPoint(next.x + dx, next.y + dy)?.closest(BLOCKED));
    if (touchesHero || touchesContent) { previous = next; return; }
    // A single glyph per sample keeps quick movements sparse and avoids bridges over blocks.
    particles.push({ x: next.x, y: next.y + 9, born: now, life: 2300 + Math.random() * 400, glyph: glyphs[Math.floor(Math.random() * glyphs.length)] });
    if (particles.length > 80) particles.splice(0, particles.length - 80);
    lastEmission = now;
    previous = next;
    if (!frame) frame = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', clear, { passive: true });
  window.addEventListener('blur', clear);
  document.documentElement.addEventListener('pointerleave', clear);
  document.addEventListener('visibilitychange', clear);
  finePointer.addEventListener('change', clear);
  reducedMotion.addEventListener('change', clear);

  return { destroy() {
    clear();
    window.removeEventListener('pointermove', move);
    window.removeEventListener('resize', resize);
    window.removeEventListener('scroll', clear);
    window.removeEventListener('blur', clear);
    document.documentElement.removeEventListener('pointerleave', clear);
    document.removeEventListener('visibilitychange', clear);
    finePointer.removeEventListener('change', clear);
    reducedMotion.removeEventListener('change', clear);
    canvas.remove();
  } };
}
