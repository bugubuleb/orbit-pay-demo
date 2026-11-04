// Hexadecimal ink in the page's negative space. Layout boxes are not obstacles.
const CONTROLS = 'a,button,input,select,textarea,summary,[role="button"],[role="listbox"],[role="slider"],[contenteditable]:not([contenteditable="false"])';
const SOLID = `header,footer,dialog,${CONTROLS},img,video,iframe,[data-trail-obstacle],[data-no-trail],.planet-tag,.orbit-mark,.status-dot,.terminal-top i,.route-line,.mini-flow>i,.eco-asset-icon,.earn-rate-symbol`;
const IGNORE_TEXT = `${SOLID},script,style,template,svg,canvas,.sr-only`;
const SVG_PAINT = 'svg path,svg circle,svg ellipse,svg rect,svg line,svg polyline,svg polygon,svg text,svg image,svg use';
const GLYPHS = '0123456789abcdef';
const SPACING = 5.2;
const LIMIT = 280;
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
  // The planet is a transparent, locally rendered canvas, not a rectangular image.
  const planetMask = document.createElement('canvas');
  const planetInk = planetMask.getContext('2d', { willReadFrequently: true });
  if (!ctx || !ink || !planetInk) return { destroy() {} };
  document.body.append(canvas);

  let particles = [], previous = null, carry = 0, sequence = 0;
  let frame = 0, width = 0, height = 0, scale = 1;
  let dirty = true, destroyed = false, hoveredCTA = null;
  let words = [], solids = [], shapes = [], canvases = [], finalSections = [];
  let visibleCache = new Map();
  const paths = new WeakMap();
  const enabled = () => finePointer.matches && !reducedMotion.matches && !document.hidden;

  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = null;
    carry = 0;
    particles = [];
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
    solids = [...document.querySelectorAll(SOLID)].filter(element => !element.parentElement?.closest(SOLID));
    shapes = [...document.querySelectorAll(SVG_PAINT)].filter(element => !element.closest('defs,clipPath,mask,pattern,[data-trail-background]') && !element.closest(SOLID));
    canvases = [...document.querySelectorAll('canvas')].filter(element => element !== canvas && !element.closest(SOLID));
    finalSections = [...document.querySelectorAll('.final-section')];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return /\S/.test(node.data) && !node.parentElement?.closest(IGNORE_TEXT) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      const ranges = [];
      // Word ranges preserve the real line wrapping and leave margins, line gaps,
      // whitespace and the unused part of a heading/form/card available.
      for (const match of node.data.matchAll(/\S+/gu)) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        ranges.push({ range, text: match[0], font: '', left: 0, right: 0 });
      }
      words.push({ element: node.parentElement, ranges });
    }
  }

  function rectangle(rect, padding = 2) {
    if (onScreen(rect, padding)) ink.fillRect(rect.left - padding, rect.top - padding, rect.width + padding * 2, rect.height + padding * 2);
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

  function paintMask() {
    if (dirty) rebuild();
    visibleCache = new Map();
    ink.setTransform(1, 0, 0, 1, 0, 0);
    ink.clearRect(0, 0, width, height);
    ink.fillStyle = ink.strokeStyle = '#000';
    for (const element of solids) {
      if (visible(element)) for (const rect of element.getClientRects()) rectangle(rect, 3);
    }
    for (const entry of words) {
      if (!visible(entry.element) || !onScreen(entry.element.getBoundingClientRect(), 20)) continue;
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
          if (onScreen(rect)) ink.fillRect(rect.left - word.left - 1.5, rect.top - 1.5, rect.width + word.left + word.right + 3, rect.height + 3);
        }
      }
    }
    for (const element of shapes) paintSVG(element);
    for (const element of canvases) {
      const rect = element.getBoundingClientRect();
      if (!visible(element) || !onScreen(rect)) continue;
      if (element.id === 'orbit-planet') paintPlanet(element, rect);
      else rectangle(rect);
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

  function draw(now) {
    frame = 0;
    ctx.clearRect(0, 0, width, height);
    if (!enabled() || document.querySelector('dialog[open]')) { clear(); return; }
    particles = particles.filter(p => now - p.born < p.life);
    if (!particles.length) return;
    paintMask();
    const lightRects = finalSections.filter(visible).map(element => element.getBoundingClientRect());
    ctx.font = '8px "DM Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of particles) {
      const age = (now - p.born) / p.life;
      const distance = p.burst ? (1 - Math.pow(1 - age, 3)) : age;
      const x = p.x + p.vx * distance;
      const y = p.y + p.vy * distance;
      ctx.globalAlpha = p.alpha * Math.pow(1 - age, p.burst ? 1.7 : 1.35);
      ctx.fillStyle = lightRects.some(rect => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) ? '#102008' : '#bcff75';
      ctx.fillText(p.glyph, x, y);
    }
    ctx.globalAlpha = 1;
    // Applied on every painted frame, including after DOM changes or movement:
    // old particles cannot drift across newly rendered text, controls or artwork.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(mask, 0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    frame = requestAnimationFrame(draw);
  }

  function add(particle) {
    particles.push({ glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)], ...particle });
    if (particles.length > LIMIT) particles.splice(0, particles.length - LIMIT);
  }

  function start() {
    if (!frame && particles.length) frame = requestAnimationFrame(draw);
  }

  function move(event) {
    if (!enabled() || event.pointerType !== 'mouse' || document.querySelector('dialog[open]') || event.target.closest?.(`header,footer,${CONTROLS}`)) {
      previous = null;
      carry = 0;
      return;
    }
    const now = performance.now();
    const next = { x: event.clientX, y: event.clientY, time: now };
    if (!previous || now - previous.time > 180) { previous = next; carry = 0; return; }
    const dx = next.x - previous.x, dy = next.y - previous.y;
    const distance = Math.hypot(dx, dy);
    if (!distance) return;
    const nx = -dy / distance, ny = dx / distance;
    const first = Math.max(SPACING - carry, distance - SPACING * 70);
    for (let at = first; at <= distance; at += SPACING) {
      const x = previous.x + dx * at / distance;
      const y = previous.y + dy * at / distance + 7;
      add({ x: x + nx * 3.4, y: y + ny * 3.4, vx: nx * 1.5, vy: 3 + ny * 1.5, born: now, life: 2200 + Math.random() * 600, alpha: .5 });
      if (++sequence % 2 === 0) add({ x: x - nx * 3.4, y: y - ny * 3.4, vx: -nx * 2, vy: 3 - ny * 2, born: now, life: 2200 + Math.random() * 600, alpha: .32 });
    }
    carry = (carry + distance) % SPACING;
    previous = next;
    start();
  }

  function pointerOver(event) {
    const link = event.target.closest?.('.eco-cta');
    if (!link || link === hoveredCTA || link.contains(event.relatedTarget) || !enabled() || event.pointerType !== 'mouse' || document.querySelector('dialog[open]')) return;
    hoveredCTA = link;
    const rect = link.getBoundingClientRect();
    const now = performance.now();
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
        x: horizontal ? rect.left + rect.width * position : (side < 0 ? rect.left - 9 : rect.right + 9),
        y: horizontal ? (side < 0 ? rect.top - 10 : rect.bottom + 10) : rect.top + rect.height * position,
        vx: normalX * travel + (horizontal ? tangent : 0),
        vy: normalY * travel + (horizontal ? 0 : tangent),
        born: now, life: 720 + Math.random() * 300, alpha: .7, burst: true
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
  window.addEventListener('scroll', clear, { passive: true, capture: true });
  window.addEventListener('blur', clear);
  document.documentElement.addEventListener('pointerleave', clear);
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
    window.removeEventListener('scroll', clear, true);
    window.removeEventListener('blur', clear);
    document.documentElement.removeEventListener('pointerleave', clear);
    document.removeEventListener('visibilitychange', clear);
    finePointer.removeEventListener('change', clear);
    reducedMotion.removeEventListener('change', clear);
    document.fonts?.removeEventListener('loadingdone', fontsReady);
    canvas.remove();
  } };
}
