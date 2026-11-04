/** The closing mark: a static, two-line hexadecimal orbit and an engraved globe. */

let nextEmblemId = 0;
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
  if (!root) return;
  const svg = root.tagName?.toLowerCase() === 'svg' ? root : root.querySelector?.('svg');
  if (!svg) return;

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
    <circle cx="70" cy="70" r="31" fill="var(--lime, #bcff75)" stroke="currentColor" stroke-width="2.3"/>
    <g fill="none" stroke="currentColor" stroke-linecap="round" clip-path="url(#${id}-globe)">
      ${globeGrid()}
    </g>
    <g transform="rotate(-35 70 70)" clip-path="url(#${id}-front)">
      <ellipse cx="70" cy="70" rx="61" ry="23" fill="none" stroke="var(--lime, #bcff75)" stroke-width="10"/>
      <g fill="currentColor" font-family="ui-monospace, SFMono-Regular, Consolas, monospace">${rows}</g>
    </g>
    <circle cx="117" cy="32" r="7" fill="currentColor"/>
    <circle cx="117" cy="32" r="2.5" fill="var(--lime, #bcff75)"/>
  `;
}
