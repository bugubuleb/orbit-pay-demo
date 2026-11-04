// Scattered hexadecimal ink, deposited on the page and faded in place.
const CONTROLS = 'a,button,input,select,textarea,summary,[role="button"],[role="listbox"],[role="slider"],[contenteditable]:not([contenteditable="false"])';
const PANELS = '.payment-terminal,.eco-preview,.product-preview,.code-terminal,.business-card';
const FOREGROUND = `header,footer,dialog,${CONTROLS},.earn-term-option,.earn-confirmation-mark,img,video,iframe,[data-trail-obstacle],[data-no-trail],.planet-tag,.orbit-mark,.status-dot,.terminal-top i,.route-line,.mini-flow>i,.eco-asset-icon,.earn-rate-symbol`;
const SOLID = `${FOREGROUND},${PANELS}`;
const IGNORE_TEXT = `${FOREGROUND},script,style,template,svg,canvas,.sr-only`;
const BURST_TARGETS = '.eco-cta,.earn-submit,#send-payment,.hero-actions .button';
const SVG_PAINT = 'svg path,svg circle,svg ellipse,svg rect,svg line,svg polyline,svg polygon,svg text,svg image,svg use';
const GLYPHS = '0123456789abcdef';
const LIFE = 2650;
const CLEARANCE = 18;
const GRID = 96;
const nextSpacing = () => 2.2 + Math.random() * 2.8;
const LIMIT = 600;
const BURST_RESERVE = 64;
const TAU = Math.PI * 2;

export function initCursorTrail() {
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'cursor-trail';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  const mask = document.createElement('canvas');
  const ink = mask.getContext('2d');
  const burstLayer = document.createElement('canvas');
  const burstInk = burstLayer.getContext('2d');
  // The planet is a transparent, locally rendered canvas, not a rectangular image.
  const planetMask = document.createElement('canvas');
  const planetInk = planetMask.getContext('2d', { willReadFrequently: true });
  if (!ctx || !ink || !planetInk || !burstInk) return { destroy() {} };
  document.body.append(canvas);

  let particles = [], previous = null, untilNext = nextSpacing();
  let normalCount = 0, burstCount = 0;
  let widthFrom = 5 + Math.random() * 13, widthTo = 5 + Math.random() * 13;
  let widthProgress = 0, widthSpan = 50 + Math.random() * 50;
  let frame = 0, width = 0, height = 0, scale = 1;
  let dirty = true, destroyed = false, hoveredCTA = null;
  let words = [], solids = [], shapes = [], canvases = [], finalSections = [], instruments = [];
  let protectedOvals = [];
  let visibleCache = new Map();
  let clearanceGrid = new Map(), clearanceCheck = 0;
  const paths = new WeakMap();
  const enabled = () => finePointer.matches && !reducedMotion.matches && !document.hidden;

  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = null;
    untilNext = nextSpacing();
    particles = [];
    normalCount = burstCount = 0;
    hoveredCTA = null;
    ctx.clearRect(0, 0, width, height);
  }

  function resize() {
    clear();
    width = innerWidth;
    height = innerHeight;
    scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    burstLayer.width = canvas.width;
    burstLayer.height = canvas.height;
    burstInk.setTransform(scale, 0, 0, scale, 0, 0);
    mask.width = Math.ceil(width);
    mask.height = Math.ceil(height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    dirty = true;
  }

  function visible(element) {
    if (!element?.isConnected) return false;
    if (visibleCache.has(element)) return visibleCache.get(element);
    const style = getComputedStyle(element);
    const result = style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse' && Number(style.opacity) > .001 && (!element.parentElement || visible(element.parentElement));
    visibleCache.set(element, result);
    return result;
  }

  function onScreen(rect, pad = 5) {
    return rect.width > 0 && rect.height > 0 && rect.right > -pad && rect.bottom > -pad && rect.left < width + pad && rect.top < height + pad;
  }

  function rebuild() {
    dirty = false;
    words = [];
    solids = [...document.querySelectorAll(SOLID)].filter(element => !element.parentElement?.closest(FOREGROUND));
    shapes = [...document.querySelectorAll(SVG_PAINT)].filter(element => !element.closest('defs,clipPath,mask,pattern,[data-trail-background]') && !element.closest(FOREGROUND));
    canvases = [...document.querySelectorAll('canvas')].filter(element => element !== canvas && !element.closest(FOREGROUND));
    finalSections = [...document.querySelectorAll('.final-section')];
    instruments = [...document.querySelectorAll('.eco-instrument')];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return /\S/.test(node.data) && !node.parentElement?.closest(IGNORE_TEXT) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      const ranges = [];
      // Word ranges preserve the real line wrapping and leave margins, line gaps,
      // whitespace and the unused part of unpanelled headings/forms available.
      for (const match of node.data.matchAll(/\S+/gu)) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        ranges.push({ range, text: match[0], font: '', left: 0, right: 0 });
      }
      words.push({ element: node.parentElement, ranges });
    }
  }

  function addClearance(left, top, right, bottom) {
    const rect = { left, top, right, bottom, checked: 0 };
    // A compact screen grid keeps proximity work local even on text-heavy pages.
    const x1 = Math.floor(Math.max(-GRID, left) / GRID);
    const x2 = Math.floor(Math.min(width + GRID, right) / GRID);
    const y1 = Math.floor(Math.max(-GRID, top) / GRID);
    const y2 = Math.floor(Math.min(height + GRID, bottom) / GRID);
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
      const key = `${x},${y}`;
      if (!clearanceGrid.has(key)) clearanceGrid.set(key, []);
      clearanceGrid.get(key).push(rect);
    }
  }

  function rectangle(rect, padding = 2) {
    if (!onScreen(rect, padding + CLEARANCE)) return;
    ink.fillRect(rect.left - padding, rect.top - padding, rect.width + padding * 2, rect.height + padding * 2);
    addClearance(rect.left - padding, rect.top - padding, rect.right + padding, rect.bottom + padding);
  }

  function proximity(x, y, size) {
    // Fade the WHOLE glyph before its ink reaches an edge, rather than cutting
    // it into a half-character at a button, word or panel boundary.
    const radius = size * .75;
    let ovalFade = 1;
    for (const oval of protectedOvals) {
      const dx = x - oval.x, dy = y - oval.y;
      const u = dx * oval.cos + dy * oval.sin;
      const v = -dx * oval.sin + dy * oval.cos;
      const q = Math.hypot(u / oval.rx, v / oval.ry);
      if (q <= 1) return 0;
      const gradient = Math.hypot(u / (oval.rx * oval.rx), v / (oval.ry * oval.ry)) / q;
      const distance = (q - 1) / gradient;
      const fade = Math.min(1, Math.max(0, (distance - radius) / 28));
      ovalFade = Math.min(ovalFade, fade * fade * (3 - 2 * fade));
    }
    const reach = radius + CLEARANCE;
    const check = ++clearanceCheck;
    let nearest = reach;
    for (let row = Math.floor((y - reach) / GRID); row <= Math.floor((y + reach) / GRID); row++) {
      for (let column = Math.floor((x - reach) / GRID); column <= Math.floor((x + reach) / GRID); column++) {
        for (const rect of clearanceGrid.get(`${column},${row}`) || []) {
          if (rect.checked === check) continue;
          rect.checked = check;
          const dx = Math.max(rect.left - x, 0, x - rect.right);
          const dy = Math.max(rect.top - y, 0, y - rect.bottom);
          nearest = Math.min(nearest, Math.hypot(dx, dy));
          if (nearest <= radius) return 0;
        }
      }
    }
    const fade = Math.min(1, Math.max(0, (nearest - radius) / CLEARANCE));
    return fade * fade * (3 - 2 * fade) * ovalFade;
  }

  function shapePath(element) {
    const tag = element.localName;
    const signature = ['d', 'points', 'x', 'y', 'width', 'height', 'rx', 'ry', 'r', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2'].map(name => element.getAttribute(name) || '').join('|');
    const cached = paths.get(element);
    if (cached?.signature === signature) return cached.path;
    const n = name => Number(element.getAttribute(name)) || 0;
    let path = new Path2D();
    if (tag === 'path') path = new Path2D(element.getAttribute('d') || '');
    else if (tag === 'circle') path.arc(n('cx'), n('cy'), Math.max(0, n('r')), 0, TAU);
    else if (tag === 'ellipse') path.ellipse(n('cx'), n('cy'), Math.max(0, n('rx')), Math.max(0, n('ry')), 0, 0, TAU);
    else if (tag === 'rect') {
      const radius = Math.min(n('rx') || n('ry'), n('width') / 2, n('height') / 2);
      if (radius && path.roundRect) path.roundRect(n('x'), n('y'), n('width'), n('height'), radius);
      else path.rect(n('x'), n('y'), n('width'), n('height'));
    } else if (tag === 'line') { path.moveTo(n('x1'), n('y1')); path.lineTo(n('x2'), n('y2')); }
    else {
      const points = (element.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
      for (let index = 0; index + 1 < points.length; index += 2) {
        if (index) path.lineTo(points[index], points[index + 1]);
        else path.moveTo(points[index], points[index + 1]);
      }
      if (tag === 'polygon') path.closePath();
    }
    paths.set(element, { signature, path });
    return path;
  }

  function paintSVG(element) {
    if (!visible(element)) return;
    const rect = element.getBoundingClientRect();
    // A horizontal/vertical SVG line may have a zero-height/width bounds box.
    if (rect.right < -5 || rect.bottom < -5 || rect.left > width + 5 || rect.top > height + 5) return;
    if (['text', 'image', 'use'].includes(element.localName)) { rectangle(rect); return; }
    const matrix = element.getScreenCTM();
    if (!matrix) return;
    const style = getComputedStyle(element);
    const path = shapePath(element);
    const unit = Math.max(.001, Math.min(Math.hypot(matrix.a, matrix.b), Math.hypot(matrix.c, matrix.d)));
    ink.save();
    ink.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
    const filled = style.fill !== 'none' && style.fill !== 'transparent' && Number(style.fillOpacity) > .001;
    if (filled) {
      ink.fill(path, style.fillRule === 'evenodd' ? 'evenodd' : 'nonzero');
      ink.lineWidth = 3 / unit;
      ink.stroke(path);
    }
    if (style.stroke !== 'none' && style.stroke !== 'transparent' && Number(style.strokeOpacity) > .001) {
      let strokeWidth = parseFloat(style.strokeWidth) || 1;
      if (style.vectorEffect === 'non-scaling-stroke') strokeWidth /= unit;
      ink.lineWidth = strokeWidth + 3 / unit;
      ink.lineCap = style.strokeLinecap;
      ink.lineJoin = style.strokeLinejoin;
      // Respect sparse tracers instead of excluding their entire ellipse.
      if (style.strokeDasharray !== 'none') {
        const normalized = element.pathLength?.baseVal?.value;
        const factor = normalized && element.getTotalLength ? element.getTotalLength() / normalized : 1;
        const dash = style.strokeDasharray.split(/[\s,]+/).map(value => parseFloat(value) * factor).filter(Number.isFinite);
        if (dash.length) ink.setLineDash(dash);
        ink.lineDashOffset = (parseFloat(style.strokeDashoffset) || 0) * factor;
      }
      ink.stroke(path);
    }
    ink.restore();
  }

  function paintPlanet(element, rect) {
    // Half-resolution alpha is enough for these tiny glyphs and avoids reading a
    // full retina canvas every frame. A 2px fringe protects antialiased edges.
    const pw = Math.max(1, Math.ceil(rect.width / 2));
    const ph = Math.max(1, Math.ceil(rect.height / 2));
    if (planetMask.width !== pw || planetMask.height !== ph) {
      planetMask.width = pw;
      planetMask.height = ph;
    }
    try {
      planetInk.clearRect(0, 0, pw, ph);
      planetInk.drawImage(element, 0, 0, pw, ph);
      const pixels = planetInk.getImageData(0, 0, pw, ph);
      for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = pixels.data[i] > 12 ? 255 : 0;
      planetInk.putImageData(pixels, 0, 0);
      ink.drawImage(planetMask, rect.left, rect.top, rect.width, rect.height);
      for (const [x, y] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) ink.drawImage(planetMask, rect.left + x, rect.top + y, rect.width, rect.height);
    } catch {
      // A future cross-origin canvas must still protect the planet silhouette.
      const radius = Math.min(rect.width * .367, rect.height * .389) * 1.025 + 4;
      ink.beginPath();
      ink.arc(rect.left + rect.width * .505, rect.top + rect.height * .496, radius, 0, TAU);
      ink.fill();
    }
  }

  function panelHidden(element, ignoredPanel) {
    const panel = element.closest(PANELS);
    return panel && panel !== ignoredPanel;
  }

  function paintMask(ignoredPanel = null) {
    if (dirty) rebuild();
    visibleCache = new Map();
    clearanceGrid = new Map();
    protectedOvals = [];
    ink.setTransform(1, 0, 0, 1, 0, 0);
    ink.clearRect(0, 0, width, height);
    ink.fillStyle = ink.strokeStyle = '#000';
    for (const element of solids) {
      if (element === ignoredPanel || (panelHidden(element, ignoredPanel) && !element.matches(PANELS))) continue;
      if (visible(element)) for (const rect of element.getClientRects()) rectangle(rect, 3);
    }
    for (const entry of words) {
      if (panelHidden(entry.element, ignoredPanel) || !visible(entry.element) || !onScreen(entry.element.getBoundingClientRect(), 20)) continue;
      const style = getComputedStyle(entry.element);
      const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      for (const word of entry.ranges) {
        // Range boxes measure advances. Account separately for italic ink that
        // extends beyond those advances, especially the large serif headings.
        if (word.font !== font) {
          ctx.font = font;
          ctx.textAlign = 'left';
          const metrics = ctx.measureText(word.text);
          word.left = Math.max(0, metrics.actualBoundingBoxLeft || 0);
          word.right = Math.max(0, (metrics.actualBoundingBoxRight || metrics.width) - metrics.width);
          word.font = font;
        }
        for (const rect of word.range.getClientRects()) {
          if (!onScreen(rect, CLEARANCE)) continue;
          ink.fillRect(rect.left - word.left - 1.5, rect.top - 1.5, rect.width + word.left + word.right + 3, rect.height + 3);
          addClearance(rect.left - word.left - 1.5, rect.top - 1.5, rect.right + word.right + 1.5, rect.bottom + 1.5);
        }
      }
    }
    for (const element of shapes) if (!panelHidden(element, ignoredPanel)) paintSVG(element);
    for (const element of canvases) {
      if (panelHidden(element, ignoredPanel)) continue;
      const rect = element.getBoundingClientRect();
      if (!visible(element) || !onScreen(rect)) continue;
      if (element.id === 'orbit-planet') paintPlanet(element, rect);
      else rectangle(rect);
    }
    // Protect the orbital composition with an oval, leaving the map's blank
    // rectangular corners open. Geometry follows the SVG's responsive matrix.
    for (const instrument of instruments) {
      if (!visible(instrument) || !onScreen(instrument.getBoundingClientRect())) continue;
      const matrix = instrument.getScreenCTM();
      if (!matrix) continue;
      const angle = Math.atan2(matrix.b, matrix.a);
      const oval = {
        x: matrix.a * 350 + matrix.c * 300 + matrix.e,
        y: matrix.b * 350 + matrix.d * 300 + matrix.f,
        rx: 310 * Math.hypot(matrix.a, matrix.b),
        ry: 235 * Math.hypot(matrix.c, matrix.d),
        cos: Math.cos(angle), sin: Math.sin(angle)
      };
      if (!oval.rx || !oval.ry) continue;
      protectedOvals.push(oval);
      ink.beginPath();
      ink.ellipse(oval.x, oval.y, oval.rx, oval.ry, angle, 0, TAU);
      ink.fill();
    }
    // A failed/uninitialized hero uses a small CSS sphere, not its stage bounds.
    const fallback = document.querySelector('.planet-stage:not(.ready) .planet-fallback');
    if (fallback && visible(fallback)) {
      const rect = fallback.getBoundingClientRect();
      ink.beginPath();
      ink.ellipse(rect.left + rect.width / 2, rect.top + rect.height / 2, rect.width / 2 + 2, rect.height / 2 + 2, 0, 0, TAU);
      ink.fill();
    }
  }

  function drawParticles(list, target, now, lightRects) {
    target.textAlign = 'center';
    target.textBaseline = 'middle';
    const pageX = scrollX, pageY = scrollY;
    for (const p of list) {
      const age = Math.max(0, (now - p.born) / p.life);
      // Only deliberate CTA bursts move. Ordinary ink keeps its original page
      // coordinate, angle and size throughout its individual 2650ms lifetime.
      const travel = p.burst ? 1 - Math.pow(1 - age, 3) : 0;
      const x = p.x - pageX + (p.burst ? p.vx * travel : 0);
      const y = p.y - pageY + (p.burst ? p.vy * travel : 0);
      if (x < -20 || x > width + 20 || y < -20 || y > height + 20) continue;
      const clearance = proximity(x, y, p.size);
      if (!clearance) continue;
      target.globalAlpha = p.alpha * Math.pow(1 - age, p.burst ? 1.7 : 1.35) * clearance;
      target.fillStyle = lightRects.some(rect => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) ? '#102008' : '#bcff75';
      target.font = `${p.size}px "DM Mono", monospace`;
      target.save();
      target.translate(x, y);
      target.rotate(p.rotation);
      target.fillText(p.glyph, 0, 0);
      target.restore();
    }
    target.globalAlpha = 1;
    target.globalCompositeOperation = 'destination-out';
    target.filter = 'blur(7px)';
    target.drawImage(mask, 0, 0, width, height);
    target.filter = 'none';
    target.drawImage(mask, 0, 0, width, height);
    target.globalCompositeOperation = 'source-over';
  }

  function draw(now) {
    frame = 0;
    ctx.clearRect(0, 0, width, height);
    if (!enabled() || document.querySelector('dialog[open]')) { clear(); return; }
    particles = particles.filter(p => now - p.born < p.life);
    normalCount = particles.reduce((count, p) => count + !p.burst, 0);
    burstCount = particles.length - normalCount;
    if (!particles.length) return;
    paintMask();
    const lightRects = finalSections.filter(visible).map(element => element.getBoundingClientRect());
    drawParticles(particles.filter(p => !p.panel), ctx, now, lightRects);
    // Payment bursts may enter ONLY their own panel's background. Draw that
    // group separately, retaining every word, control and artwork inside it,
    // and retaining all other panels. Normal trail never receives this waiver.
    const panels = new Set(particles.filter(p => p.panel?.isConnected).map(p => p.panel));
    for (const panel of panels) {
      if (!visible(panel)) continue;
      paintMask(panel);
      burstInk.clearRect(0, 0, width, height);
      drawParticles(particles.filter(p => p.panel === panel), burstInk, now, lightRects);
      ctx.drawImage(burstLayer, 0, 0, width, height);
    }
    frame = requestAnimationFrame(draw);
  }

  function add(particle) {
    // Capacity limits new admissions, never an existing glyph's lifetime.
    // Reserved burst slots keep a CTA response available during a dense sweep.
    if (particle.burst ? burstCount >= BURST_RESERVE : normalCount >= LIMIT - BURST_RESERVE) return;
    particles.push({
      glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      size: 6.5 + Math.floor(Math.random() * 6) * .5,
      rotation: (Math.random() - .5) * .48,
      ...particle
    });
    if (particle.burst) burstCount++;
    else normalCount++;
  }

  function advanceWidth(distance) {
    widthProgress += distance;
    while (widthProgress >= widthSpan) {
      widthProgress -= widthSpan;
      widthFrom = widthTo;
      const candidate = 5 + Math.random() * 13;
      widthTo = Math.abs(candidate - widthFrom) >= 4 ? candidate : (widthFrom < 11.5 ? 14 + Math.random() * 4 : 5 + Math.random() * 4);
      widthSpan = 50 + Math.random() * 50;
    }
    const fraction = widthProgress / widthSpan;
    const eased = fraction * fraction * (3 - 2 * fraction);
    return widthFrom + (widthTo - widthFrom) * eased;
  }

  function start() {
    if (!frame && particles.length) frame = requestAnimationFrame(draw);
  }

  function move(event) {
    if (!enabled() || event.pointerType !== 'mouse' || document.querySelector('dialog[open]') || event.target.closest?.(`header,footer,${CONTROLS},${PANELS},.earn-term-option`)) {
      previous = null;
      untilNext = nextSpacing();
      return;
    }
    const now = performance.now();
    const next = { x: event.clientX, y: event.clientY, time: now };
    if (!previous || now - previous.time > 180) { previous = next; untilNext = nextSpacing(); return; }
    const dx = next.x - previous.x, dy = next.y - previous.y;
    const distance = Math.hypot(dx, dy);
    if (!distance) return;
    let at = Math.max(untilNext, distance - 320);
    let advanced = 0;
    while (at <= distance) {
      const fraction = at / distance;
      const angle = Math.random() * TAU;
      const envelope = advanceWidth(at - advanced);
      advanced = at;
      const spread = Math.sqrt(Math.random()) * envelope;
      add({
        x: previous.x + dx * fraction + Math.cos(angle) * spread + scrollX,
        y: previous.y + dy * fraction + Math.sin(angle) * spread + 5 + scrollY,
        // Interpolate a separate deposition time through each mouse sample.
        // A shared lifetime makes the oldest deposits finish fading first.
        born: previous.time + (now - previous.time) * fraction,
        life: LIFE,
        alpha: .3 + Math.random() * .29
      });
      at += nextSpacing();
    }
    advanceWidth(distance - advanced);
    untilNext = at - distance;
    previous = next;
    start();
  }

  function resetPointer() {
    previous = null;
    untilNext = nextSpacing();
    hoveredCTA = null;
    // Stop emitting without clearing or restarting the age of deposited ink.
  }

  function pointerOver(event) {
    const link = event.target.closest?.(BURST_TARGETS);
    if (!link || link.disabled || link.getAttribute('aria-disabled') === 'true' || link === hoveredCTA || link.contains(event.relatedTarget) || !enabled() || event.pointerType !== 'mouse' || document.querySelector('dialog[open]')) return;
    hoveredCTA = link;
    const rect = link.getBoundingClientRect();
    const now = performance.now();
    const panel = link.id === 'send-payment' ? link.closest(PANELS) : null;
    // A single compact burst begins OUTSIDE the control. Normals always point
    // away from the perimeter; the same foreground mask protects nearby copy.
    for (let index = 0; index < 16; index++) {
      const horizontal = index < 12;
      const side = index % 2 ? 1 : -1;
      const position = horizontal ? .08 + Math.random() * .84 : .18 + Math.random() * .64;
      const normalX = horizontal ? 0 : side;
      const normalY = horizontal ? side : 0;
      const tangent = (Math.random() - .5) * 16;
      const travel = 15 + Math.random() * 25;
      add({
        x: (horizontal ? rect.left + rect.width * position : (side < 0 ? rect.left - 15 : rect.right + 15)) + scrollX,
        y: (horizontal ? (side < 0 ? rect.top - 15 : rect.bottom + 15) : rect.top + rect.height * position) + scrollY,
        vx: normalX * travel + (horizontal ? tangent : 0),
        vy: normalY * travel + (horizontal ? 0 : tangent),
        born: now, life: 720 + Math.random() * 300, alpha: .7, burst: true, panel
      });
    }
    start();
  }

  function pointerOut(event) {
    if (hoveredCTA && !hoveredCTA.contains(event.relatedTarget)) hoveredCTA = null;
  }

  const observer = new MutationObserver(records => {
    // Reuse text Ranges through animation-only SVG attribute updates; structure,
    // text, classes and visibility changes rebuild the small semantic inventory.
    if (records.some(record => record.type !== 'attributes' || !['d', 'transform', 'stroke-dashoffset', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height'].includes(record.attributeName))) dirty = true;
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
  resize();
  window.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerover', pointerOver, { passive: true });
  document.addEventListener('pointerout', pointerOut, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', resetPointer, { passive: true, capture: true });
  window.addEventListener('blur', clear);
  document.documentElement.addEventListener('pointerleave', resetPointer);
  document.addEventListener('visibilitychange', clear);
  finePointer.addEventListener('change', clear);
  reducedMotion.addEventListener('change', clear);
  const fontsReady = () => { if (!destroyed) dirty = true; };
  document.fonts?.ready.then(fontsReady);
  document.fonts?.addEventListener('loadingdone', fontsReady);

  return { destroy() {
    destroyed = true;
    clear();
    observer.disconnect();
    window.removeEventListener('pointermove', move);
    document.removeEventListener('pointerover', pointerOver);
    document.removeEventListener('pointerout', pointerOut);
    window.removeEventListener('resize', resize);
    window.removeEventListener('scroll', resetPointer, true);
    window.removeEventListener('blur', clear);
    document.documentElement.removeEventListener('pointerleave', resetPointer);
    document.removeEventListener('visibilitychange', clear);
    finePointer.removeEventListener('change', clear);
    reducedMotion.removeEventListener('change', clear);
    document.fonts?.removeEventListener('loadingdone', fontsReady);
    canvas.remove();
  } };
}
