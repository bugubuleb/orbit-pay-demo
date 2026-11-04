/** A fixed hex-ring globe with one satellite pass on hover or CTA keyboard focus. */

let nextEmblemId = 0;
const controllers = new WeakMap();
const TAU = Math.PI * 2;
const HEX = '0123456789ABCDEF';
const round = value => Number(value.toFixed(3));

function ellipseLength(rx, ry) {
  const h = ((rx - ry) / (rx + ry)) ** 2;
  return Math.PI * (rx + ry) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)));
}

function ringRow(pathId, count, seed, length) {
  let state = seed;
  let previousOffset = 0;
  const glyphs = [];
  const offsets = [];
  const rotations = [];
  for (let index = 0; index < count; index++) {
    // Fixed seeds keep the irregularity quiet, repeatable, and independent of time.
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    glyphs.push(HEX[(state >>> 24) & 15]);
    const offset = (((state >>> 12) & 255) / 255 - 0.5) * 0.54;
    offsets.push(round(offset - previousOffset));
    rotations.push(round((((state >>> 4) & 255) / 255 - 0.5) * 12));
    previousOffset = offset;
  }
  return `<text font-size="4.4" font-weight="700" dominant-baseline="central"><textPath href="#${pathId}" startOffset="1.4" textLength="${round(length - 2.8)}" lengthAdjust="spacingAndGlyphs"><tspan dy="${offsets.join(' ')}" rotate="${rotations.join(' ')}">${glyphs.join('')}</tspan></textPath></text>`;
}

function project(x, y, z) {
  const tilt = 22 * Math.PI / 180;
  const turn = -12 * Math.PI / 180;
  const tiltedY = y * Math.cos(tilt) - z * Math.sin(tilt);
  return {
    x: 70 + 31 * (x * Math.cos(turn) - tiltedY * Math.sin(turn)),
    y: 70 + 31 * (x * Math.sin(turn) + tiltedY * Math.cos(turn)),
    z: y * Math.sin(tilt) + z * Math.cos(tilt),
  };
}

function visibleCurve(pointAt) {
  let path = '';
  let drawing = false;
  // Draw only the facing hemisphere; the clipping circle trims the edge cleanly.
  for (let step = 0; step <= 160; step++) {
    const point = pointAt(step / 160 * TAU);
    if (point.z < -0.012) {
      drawing = false;
      continue;
    }
    path += `${drawing ? 'L' : 'M'}${round(point.x)} ${round(point.y)}`;
    drawing = true;
  }
  return path;
}

function globeGrid() {
  const meridians = [];
  const latitudes = [];
  for (let index = 0; index < 6; index++) {
    const longitude = index * Math.PI / 6;
    meridians.push(visibleCurve(angle => project(
      Math.cos(angle) * Math.sin(longitude),
      -Math.sin(angle),
      Math.cos(angle) * Math.cos(longitude),
    )));
  }
  for (let degrees = -60; degrees <= 60; degrees += 20) {
    const latitude = degrees * Math.PI / 180;
    latitudes.push(visibleCurve(angle => project(
      Math.cos(latitude) * Math.sin(angle),
      -Math.sin(latitude),
      Math.cos(latitude) * Math.cos(angle),
    )));
  }
  return `<path d="${meridians.join('')}" stroke-width="1.05" opacity=".72"/><path d="${latitudes.join('')}" stroke-width=".95" opacity=".62"/>`;
}

export function initFinalEmblem(root) {
  if (!root) return null;
  const svg = root.tagName?.toLowerCase() === 'svg' ? root : root.querySelector?.('svg');
  if (!svg) return null;
  controllers.get(svg)?.destroy();

  const id = `orbit-closing-mark-${++nextEmblemId}`;
  const outer = `${id}-outer`;
  const inner = `${id}-inner`;
  const rows = ringRow(outer, 106, 12387, ellipseLength(63, 25.5))
    + ringRow(inner, 98, 43569, ellipseLength(59, 20.5));

  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('viewBox', '0 0 140 140');
  root.setAttribute('data-trail-obstacle', '');
  svg.innerHTML = `
    <defs>
      <path id="${outer}" d="M7 70a63 25.5 0 1 1 126 0a63 25.5 0 1 1-126 0"/>
      <path id="${inner}" d="M11 70a59 20.5 0 1 1 118 0a59 20.5 0 1 1-118 0"/>
      <clipPath id="${id}-globe"><circle cx="70" cy="70" r="30.6"/></clipPath>
      <clipPath id="${id}-front"><path d="M0 70h140v70H0Z"/></clipPath>
    </defs>
    <g fill="currentColor" font-family="ui-monospace, SFMono-Regular, Consolas, monospace" transform="rotate(-35 70 70)">
      ${rows}
    </g>
    <g transform="rotate(-35 70 70)">
      <g class="final-satellite-back" transform="translate(70 47)">
        <circle r="7" fill="currentColor"/>
        <circle r="2.5" fill="var(--lime, #bcff75)"/>
      </g>
    </g>
    <circle cx="70" cy="70" r="31" fill="var(--lime, #bcff75)" stroke="currentColor" stroke-width="2.3"/>
    <g fill="none" stroke="currentColor" stroke-linecap="round" clip-path="url(#${id}-globe)">
      ${globeGrid()}
    </g>
    <g transform="rotate(-35 70 70)" clip-path="url(#${id}-front)">

      <g fill="currentColor" font-family="ui-monospace, SFMono-Regular, Consolas, monospace">${rows}</g>
    </g>
    <g transform="rotate(-35 70 70)">
      <g class="final-satellite-front" transform="translate(70 47)" visibility="hidden">
        <circle r="7" fill="currentColor"/>
        <circle r="2.5" fill="var(--lime, #bcff75)"/>
      </g>
    </g>
  `;

  const doc = svg.ownerDocument;
  const win = doc.defaultView;
  const rear = svg.querySelector('.final-satellite-back');
  const front = svg.querySelector('.final-satellite-front');
  const cta = svg.closest('.final-section')?.querySelector('.button');
  const motion = win.matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 2200;
  let frame = 0;
  let started = null;
  let running = false;
  let destroyed = false;

  function position(progress) {
    // Use the middle of the two hex rows. The upper half is behind the opaque
    // globe; at rest the complete satellite fits behind its northern edge.
    const angle = -Math.PI / 2 + progress * TAU;
    const x = round(70 + Math.cos(angle) * 61);
    const y = round(70 + Math.sin(angle) * 23);
    const inFront = Math.sin(angle) >= 0;
    for (const satellite of [rear, front]) {
      satellite.setAttribute('transform', `translate(${x} ${y})`);
    }
    rear.setAttribute('visibility', inFront ? 'hidden' : 'visible');
    front.setAttribute('visibility', inFront ? 'visible' : 'hidden');
  }

  function stop() {
    win.cancelAnimationFrame(frame);
    frame = 0;
    started = null;
    running = false;
    position(0);
  }

  function tick(now) {
    if (destroyed || motion.matches || doc.hidden) { stop(); return; }
    if (started === null) started = now;
    const progress = Math.min((now - started) / duration, 1);
    position(progress);
    if (progress === 1) {
      frame = 0;
      started = null;
      running = false;
      return;
    }
    frame = win.requestAnimationFrame(tick);
  }

  function play() {
    if (destroyed || running || motion.matches || doc.hidden) return;
    running = true;
    started = null;
    frame = win.requestAnimationFrame(tick);
  }

  function onPointerEnter(event) { if (event.pointerType !== 'touch') play(); }
  function onFocus() { if (cta?.matches(':focus-visible')) play(); }
  function onMotionChange() { if (motion.matches) stop(); }
  function onVisibilityChange() { if (doc.hidden) stop(); }

  svg.addEventListener('pointerenter', onPointerEnter);
  cta?.addEventListener('focus', onFocus);
  motion.addEventListener('change', onMotionChange);
  doc.addEventListener('visibilitychange', onVisibilityChange);

  const controller = {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      svg.removeEventListener('pointerenter', onPointerEnter);
      cta?.removeEventListener('focus', onFocus);
      motion.removeEventListener('change', onMotionChange);
      doc.removeEventListener('visibilitychange', onVisibilityChange);
      if (controllers.get(svg) === controller) controllers.delete(svg);
    },
  };
  controllers.set(svg, controller);
  return controller;
}
