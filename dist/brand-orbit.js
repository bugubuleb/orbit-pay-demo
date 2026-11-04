let instanceCount = 0;
const controllers = new WeakMap();

/** A fixed Saturn mark with one satellite pass for each hover or keyboard focus. */
export function initBrandOrbit(brand = document.querySelector('.header .brand')) {
  if (!brand) return null;
  controllers.get(brand)?.destroy();
  const original = brand.querySelector('.orbit-mark');
  if (!original) return null;

  const id = `brand-sphere-${++instanceCount}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'brand-orbit');
  svg.setAttribute('viewBox', '0 0 27 27');
  svg.setAttribute('width', '27');
  svg.setAttribute('height', '27');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.cssText = 'display:inline-block;flex:none;overflow:visible;margin-right:3px;color:var(--lime,#bcff75);pointer-events:none';
  svg.innerHTML = `<defs>
    <radialGradient id="${id}" cx=".3" cy=".22" r=".85">
      <stop stop-color="#263b1d"/><stop offset=".6" stop-color="#15200f"/><stop offset="1" stop-color="#0a1008"/>
    </radialGradient>
  </defs>
  <g transform="rotate(-35 13.5 13.5)">
    <path d="M-6.5 13.5a20 5 0 0 1 40 0" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".72"/>
    <circle class="brand-satellite-back" cx="13.5" cy="8.5" r="1.8" fill="currentColor" stroke="#0a1008" stroke-width=".65"/>
    <circle cx="13.5" cy="13.5" r="12.5" fill="url(#${id})" stroke="currentColor" stroke-width="2"/>
    <path d="M-6.5 13.5a20 5 0 0 0 40 0" fill="none" stroke="currentColor" stroke-width="1.4"/>
    <circle class="brand-satellite-front" cx="13.5" cy="8.5" r="1.8" fill="currentColor" stroke="#0a1008" stroke-width=".65" visibility="hidden"/>
  </g>`;
  original.replaceWith(svg);

  const rear = svg.querySelector('.brand-satellite-back');
  const front = svg.querySelector('.brand-satellite-front');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 2200;
  let frame = 0;
  let startTime = null;
  let running = false;
  let destroyed = false;

  function position(progress) {
    // Both visible halves use the exact ellipse drawn above. The upper half is
    // behind the opaque globe; the lower half is painted in front of it.
    const angle = -Math.PI / 2 + progress * Math.PI * 2;
    const x = (13.5 + Math.cos(angle) * 20).toFixed(3);
    const y = (13.5 + Math.sin(angle) * 5).toFixed(3);
    const inFront = Math.sin(angle) >= 0;
    for (const satellite of [rear, front]) {
      satellite.setAttribute('cx', x);
      satellite.setAttribute('cy', y);
    }
    rear.setAttribute('visibility', inFront ? 'hidden' : 'visible');
    front.setAttribute('visibility', inFront ? 'visible' : 'hidden');
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    startTime = null;
    running = false;
    position(0);
  }

  function tick(now) {
    if (destroyed || motion.matches || document.hidden) { stop(); return; }
    if (startTime === null) startTime = now;
    const progress = Math.min((now - startTime) / duration, 1);
    position(progress);
    if (progress === 1) {
      frame = 0;
      startTime = null;
      running = false;
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  function play() {
    if (destroyed || running || motion.matches || document.hidden) return;
    running = true;
    startTime = null;
    frame = requestAnimationFrame(tick);
  }

  function onPointerEnter(event) { if (event.pointerType !== 'touch') play(); }
  function onFocus() { if (brand.matches(':focus-visible')) play(); }
  function onMotionChange() { if (motion.matches) stop(); }
  function onVisibilityChange() { if (document.hidden) stop(); }

  brand.addEventListener('pointerenter', onPointerEnter);
  brand.addEventListener('focus', onFocus);
  motion.addEventListener('change', onMotionChange);
  document.addEventListener('visibilitychange', onVisibilityChange);

  const controller = {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      brand.removeEventListener('pointerenter', onPointerEnter);
      brand.removeEventListener('focus', onFocus);
      motion.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (svg.parentNode) svg.replaceWith(original);
      if (controllers.get(brand) === controller) controllers.delete(brand);
    },
  };
  controllers.set(brand, controller);
  return controller;
}
