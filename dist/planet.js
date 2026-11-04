/** A quiet, living numerical planet. No dependencies or remote assets. */

const TAU = Math.PI * 2;
// Shared vector geometry lets the cursor protect the artwork without reading
// pixels back from the GPU. The object stays local to this canvas instance.
const trailGeometry = new WeakMap();
export const getPlanetTrailGeometry = canvas => trailGeometry.get(canvas);
const CAMERA = 5.2;
const GLYPHS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '·'];
const clamp = (n, low, high) => Math.min(high, Math.max(low, n));

function random(seed) {
  let n = seed | 0;
  return () => {
    n = (n + 0x6d2b79f5) | 0;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Unit-sphere coordinate, with north at the top of the canvas. */
export function spherePoint(latitude, longitude) {
  const c = Math.cos(latitude);
  return { x: c * Math.cos(longitude), y: Math.sin(latitude), z: c * Math.sin(longitude) };
}

/** Camera projection kept separate so it can be reused or checked in isolation. */
export function projectPoint(point, radius, centerX, centerY) {
  const perspective = CAMERA / (CAMERA - point.z);
  return { x: centerX + point.x * radius * perspective, y: centerY + point.y * radius * perspective, scale: perspective };
}

function rotation(yAngle, xAngle, zAngle) {
  const cy = Math.cos(yAngle), sy = Math.sin(yAngle);
  const cx = Math.cos(xAngle), sx = Math.sin(xAngle);
  const cz = Math.cos(zAngle), sz = Math.sin(zAngle);
  const xx = cy * cz - sy * sx * sz, xy = -cx * sz, xz = sy * cz + cy * sx * sz;
  const yx = cy * sz + sy * sx * cz, yy = cx * cz, yz = sy * sz - cy * sx * cz;
  const zx = -sy * cx, zy = sx, zz = cy * cx;
  return point => ({
    x: point.x * xx + point.y * xy + point.z * xz,
    y: point.x * yx + point.y * yy + point.z * yz,
    z: point.x * zx + point.y * zy + point.z * zz,
  });
}

function createSurface() {
  const rng = random(124821);
  const points = [];
  const rows = 51;
  for (let row = 0; row < rows; row++) {
    const latitude = -Math.PI / 2 + ((row + 0.5) / rows) * Math.PI;
    const count = Math.max(5, Math.round(158 * Math.cos(latitude)));
    for (let column = 0; column < count; column++) {
      const longitude = ((column + (row % 2) * 0.5) / count) * TAU;
      points.push({
        ...spherePoint(latitude, longitude),
        glyph: Math.floor(rng() * (rng() > 0.94 ? 12 : 10)),
        luminance: 0.56 + rng() * 0.44,
        pulse: rng() * TAU,
      });
    }
  }
  return points;
}

function createGlyphAtlas(document) {
  const cell = 40;
  const atlas = document.createElement('canvas');
  atlas.width = GLYPHS.length * cell;
  atlas.height = cell;
  const context = atlas.getContext('2d');
  context.font = '500 26px "SFMono-Regular", Consolas, "Liberation Mono", monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#cdff7a';
  GLYPHS.forEach((glyph, index) => context.fillText(glyph, index * cell + cell / 2, cell / 2 + 1));
  return { canvas: atlas, cell };
}

/**
 * Fit to the canvas CSS box; return a function which removes every listener.
 * Motion follows the page scroll and pointer, and rests when the canvas is hidden.
 */
export function initPlanet(canvas) {
  if (!canvas || typeof canvas.getContext !== 'function') return () => {};
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};

  const doc = canvas.ownerDocument;
  const win = doc.defaultView || window;
  const motionPreference = win.matchMedia('(prefers-reduced-motion: reduce)');
  const surface = createSurface();
  const atlas = createGlyphAtlas(doc);
  const rng = random(7894);
  const dust = Array.from({ length: 58 }, () => ({
    x: rng(), y: rng(), size: 0.45 + rng() * 0.8,
    alpha: 0.08 + rng() * 0.22, phase: rng() * TAU,
  }));
  const orbits = [
    { radius: 1.30, x: 1.14, y: 0.07, z: -0.32, alpha: 0.48, speed: 0.085, phase: 0.82, size: 3.0 },
    { radius: 1.44, x: 0.93, y: 0.18, z: 0.74, alpha: 0.19, speed: -0.055, phase: 3.46, size: 2.0 },
    { radius: 1.18, x: 1.26, y: -0.16, z: -1.02, alpha: 0.16, speed: 0.045, phase: 5.01, size: 1.65 },
  ];

  let width = 0, height = 0, radius = 0, centerX = 0, centerY = 0;
  let bounds = canvas.getBoundingClientRect();
  let dpr = 1, frame = 0, previousTime = 0, elapsed = 0;
  let visible = true, disposed = false, reducedMotion = motionPreference.matches;
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
  let progress = 0, targetProgress = 0;
  let lastPaint = 0;
  const exclusion = { x: 0, y: 0, radius: 0, width: 0, height: 0, paths: [], satellites: [] };
  trailGeometry.set(canvas, exclusion);

  function requestFrame() {
    if (!frame && !disposed && visible && !doc.hidden) frame = win.requestAnimationFrame(tick);
  }

  function readScroll() {
    targetProgress = clamp(win.scrollY / Math.max(600, win.innerHeight * 1.15), 0, 2);
    if (visible) bounds = canvas.getBoundingClientRect();
    if (reducedMotion) progress = targetProgress;
    requestFrame();
  }

  function resize() {
    bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    if (!width || !height) return;
    dpr = Math.min(win.devicePixelRatio || 1, width < 600 ? 1.5 : 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    radius = Math.min(width * 0.367, height * 0.389);
    centerX = width * 0.505;
    centerY = height * 0.496;
    requestFrame();
  }

  function pointerMove(event) {
    if (!visible || reducedMotion || event.pointerType === 'touch') return;
    targetX = clamp((event.clientX - bounds.left - width / 2) / Math.max(1, width / 2), -1, 1);
    targetY = clamp((event.clientY - bounds.top - height / 2) / Math.max(1, height / 2), -1, 1);
    requestFrame();
  }

  function pointerLeave() { targetX = 0; targetY = 0; requestFrame(); }

  function visibilityChange() {
    previousTime = 0;
    if (doc.hidden) {
      win.cancelAnimationFrame(frame);
      frame = 0;
    } else requestFrame();
  }

  function motionChange(event) {
    reducedMotion = event.matches;
    pointerX = pointerY = targetX = targetY = 0;
    progress = targetProgress;
    previousTime = 0;
    requestFrame();
  }

  function project(point) { return projectPoint(point, radius, centerX, centerY); }

  function orbitPoint(orbit, angle) {
    return orbit.transform({ x: Math.cos(angle) * orbit.radius, y: Math.sin(angle) * orbit.radius, z: 0 });
  }

  function drawOrbits(front) {
    for (const orbit of orbits) {
      const path = new Path2D();
      let previous = null;
      let connected = false;
      for (let step = 0; step <= 240; step++) {
        const point = orbitPoint(orbit, step / 240 * TAU);
        if (front && previous && (previous.z >= 0) !== (point.z >= 0)) {
          const t = previous.z / (previous.z - point.z);
          const crossing = project({x: previous.x + (point.x - previous.x) * t, y: previous.y + (point.y - previous.y) * t, z: 0});
          if (connected) path.lineTo(crossing.x, crossing.y);
          else path.moveTo(crossing.x, crossing.y);
          connected = point.z >= 0;
        }
        if (!front || point.z >= 0) {
          const projected = project(point);
          if (connected) path.lineTo(projected.x, projected.y);
          else path.moveTo(projected.x, projected.y);
          connected = true;
        }
        previous = point;
      }
      ctx.strokeStyle = `rgba(198,255,112,${orbit.alpha * (front ? 1 : 0.47)})`;
      ctx.lineWidth = front ? 0.8 : 0.65;
      ctx.stroke(path);
      exclusion.paths.push(path);

      const angle = orbit.phase + elapsed * orbit.speed + progress * 0.65;
      const satellite = orbitPoint(orbit, angle);
      if ((satellite.z >= 0) !== front) continue;
      const p = project(satellite);
      const size = orbit.size * Math.max(0.7, radius / 290) * p.scale;
      exclusion.satellites.push({ x: p.x, y: p.y, radius: size + 6 });
      if (front) {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 5.2);
        glow.addColorStop(0, 'rgba(199,255,117,0.25)');
        glow.addColorStop(1, 'rgba(199,255,117,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(p.x, p.y, size * 5.2, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = front ? 'rgba(211,255,155,0.65)' : 'rgba(174,223,105,0.20)';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.arc(p.x, p.y, size + 3.6, 0, TAU); ctx.stroke();
      ctx.fillStyle = front ? '#ddffa4' : '#6f8b43';
      ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, TAU); ctx.fill();
    }
  }

  function drawLatitude(latitude, transform, alpha) {
    ctx.beginPath();
    let connected = false;
    for (let step = 0; step <= 160; step++) {
      const p = transform(spherePoint(latitude, (step / 160) * TAU));
      if (p.z < 1 / CAMERA) { connected = false; continue; }
      const screen = project(p);
      if (connected) ctx.lineTo(screen.x, screen.y);
      else ctx.moveTo(screen.x, screen.y);
      connected = true;
    }
    ctx.strokeStyle = `rgba(183,229,111,${alpha})`;
    ctx.lineWidth = 0.55;
    ctx.stroke();
  }

  function paint() {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    const silhouette = radius * CAMERA / Math.sqrt(CAMERA * CAMERA - 1);
    Object.assign(exclusion, { x: centerX, y: centerY, radius: silhouette, width, height });
    exclusion.paths = [];
    exclusion.satellites = [];
    for (const orbit of orbits) {
      orbit.transform = rotation(
        orbit.y + pointerX * 0.035,
        orbit.x + pointerY * 0.045 + progress * 0.06,
        orbit.z + progress * 0.075,
      );
    }

    // Very restrained atmosphere leaves the numerical surface in focus.
    const atmosphere = ctx.createRadialGradient(centerX, centerY, radius * 0.72, centerX, centerY, radius * 1.34);
    atmosphere.addColorStop(0, 'rgba(145,205,66,0)');
    atmosphere.addColorStop(0.48, 'rgba(145,205,66,0.045)');
    atmosphere.addColorStop(0.69, 'rgba(145,205,66,0.022)');
    atmosphere.addColorStop(1, 'rgba(145,205,66,0)');
    ctx.fillStyle = atmosphere;
    ctx.fillRect(0, 0, width, height);

    for (const particle of dust) {
      const x = particle.x * width;
      const y = particle.y * height;
      const distance = Math.hypot(x - centerX, y - centerY);
      if (distance < silhouette * 1.04) continue;
      const flicker = reducedMotion ? 1 : 0.8 + Math.sin(elapsed * 0.35 + particle.phase) * 0.2;
      ctx.fillStyle = `rgba(183,211,142,${particle.alpha * flicker})`;
      ctx.fillRect(x, y, particle.size, particle.size);
    }

    drawOrbits(false);

    // An opaque surface correctly eclipses the back halves of the orbital paths.
    const shade = ctx.createRadialGradient(centerX - radius * 0.35, centerY - radius * 0.45, radius * 0.1, centerX + radius * 0.1, centerY + radius * 0.16, silhouette * 1.12);
    shade.addColorStop(0, '#10170b');
    shade.addColorStop(0.48, '#0b1008');
    shade.addColorStop(1, '#050805');
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.arc(centerX, centerY, silhouette, 0, TAU); ctx.fill();

    const spin = -0.42 + elapsed * 0.035 + progress * 0.63 + pointerX * 0.105;
    const tiltX = -0.13 + pointerY * 0.065 + progress * 0.075;
    const tiltZ = -0.24 + pointerX * 0.025;
    const transform = rotation(spin, tiltX, tiltZ);
    for (let line = -5; line <= 5; line++) {
      drawLatitude(line * 0.235, transform, line === 0 ? 0.12 : 0.055);
    }

    const baseSize = clamp(radius * 0.045, 8.7, 17.3);
    for (const point of surface) {
      const rotated = transform(point);
      if (rotated.z <= 1 / CAMERA + 0.003) continue;
      const p = project(rotated);
      const edge = clamp((rotated.z - 1 / CAMERA) / 0.35, 0, 1);
      const light = clamp(0.68 - rotated.x * 0.25 - rotated.y * 0.21 + rotated.z * 0.24, 0.24, 1);
      const breathing = reducedMotion ? 1 : 0.94 + Math.sin(elapsed * 0.33 + point.pulse) * 0.06;
      ctx.globalAlpha = (0.14 + edge * 0.78) * light * point.luminance * breathing;
      const size = baseSize * p.scale * (0.87 + edge * 0.13);
      ctx.drawImage(atlas.canvas, point.glyph * atlas.cell, 0, atlas.cell, atlas.cell, p.x - size / 2, p.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;

    // Fine illuminated limb, with no heavy border or soft-focus bloom.
    const rim = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
    rim.addColorStop(0, 'rgba(199,255,118,0.22)');
    rim.addColorStop(0.45, 'rgba(199,255,118,0.075)');
    rim.addColorStop(1, 'rgba(199,255,118,0.015)');
    ctx.strokeStyle = rim;
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.arc(centerX, centerY, silhouette, 0, TAU); ctx.stroke();
    drawOrbits(true);
  }

  function tick(time) {
    frame = 0;
    if (disposed || !visible || doc.hidden) { previousTime = 0; return; }
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 1 / 60;
    previousTime = time;
    if (!reducedMotion) elapsed += delta;
    const ease = reducedMotion ? 1 : 1 - Math.exp(-delta * 5.3);
    pointerX += (targetX - pointerX) * ease;
    pointerY += (targetY - pointerY) * ease;
    progress += (targetProgress - progress) * ease;
    // Smaller screens save battery while keeping the same density and composition.
    const interval = width < 600 ? 1000 / 30 : 1000 / 60;
    if (reducedMotion || time - lastPaint >= interval - 1) {
      paint();
      lastPaint = time;
    }
    if (!reducedMotion) requestFrame();
  }

  const resizeObserver = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(resize) : null;
  const intersectionObserver = typeof win.IntersectionObserver === 'function' ? new win.IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    previousTime = 0;
    if (visible) { bounds = canvas.getBoundingClientRect(); requestFrame(); }
    else { win.cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: '100px' }) : null;

  resizeObserver?.observe(canvas);
  intersectionObserver?.observe(canvas);
  win.addEventListener('resize', resize, { passive: true });
  win.addEventListener('scroll', readScroll, { passive: true });
  win.addEventListener('pointermove', pointerMove, { passive: true });
  win.addEventListener('blur', pointerLeave);
  doc.documentElement.addEventListener('pointerleave', pointerLeave);
  doc.addEventListener('visibilitychange', visibilityChange);
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', motionChange);
  else motionPreference.addListener(motionChange);

  resize();
  readScroll();

  return function destroyPlanet() {
    if (disposed) return;
    disposed = true;
    win.cancelAnimationFrame(frame);
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    win.removeEventListener('resize', resize);
    win.removeEventListener('scroll', readScroll);
    win.removeEventListener('pointermove', pointerMove);
    win.removeEventListener('blur', pointerLeave);
    doc.documentElement.removeEventListener('pointerleave', pointerLeave);
    doc.removeEventListener('visibilitychange', visibilityChange);
    if (motionPreference.removeEventListener) motionPreference.removeEventListener('change', motionChange);
    else motionPreference.removeListener(motionChange);
    trailGeometry.delete(canvas);
    ctx.clearRect(0, 0, width, height);
  };
}
