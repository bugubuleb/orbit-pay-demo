const ICONS = {
  wallet: '<path d="M20 9.5V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" fill="currentColor" fill-opacity=".07"/><path d="M20 9.5h-3a3 3 0 0 0 0 6h3v-6Z" fill="currentColor" fill-opacity=".18"/><path d="M7 8h6" opacity=".45"/><circle cx="17" cy="12.5" r=".7" fill="currentColor" stroke="none"/>',
  pay: '<path d="M4.5 7.5h15m-4-4 4 4-4 4M19.5 16.5h-15m4-4-4 4 4 4"/>',
  stake: '<path d="m12 2.75 6 9-6 3.5-6-3.5 6-9Z" fill="currentColor" fill-opacity=".08"/><path d="m12 2.75 6 9-6 3.5V2.75Z" fill="currentColor" fill-opacity=".3" stroke="none"/><path d="m6.4 16.5 5.6 4.75 5.6-4.75"/>',
};

const icon = (name, className = '') => `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const PRODUCTS = {
  wallet: {
    number: '01', name: 'Wallet', channel: 'HOLD', title: 'A home for every asset.',
    description: 'Your balances, beautifully in view. Keep your digital dollars and your next move together.',
    cta: 'Take the wallet for a spin', href: '#product',
    preview: `<div class="eco-card-heading"><span>YOUR PORTFOLIO</span><span class="eco-demo-label">DEMO</span></div>
      <div class="eco-balance"><span class="eco-value">$12,840<span>.00</span></span><span class="eco-balance-note">Total balance · USD</span></div>
      <div class="eco-asset-list">
        <div class="eco-asset"><span class="eco-coin eco-usdc" aria-hidden="true">$</span><span class="eco-asset-name"><b>USD Coin</b><small>6,800.00 USDC</small></span><span class="eco-asset-value">$6,800.00<small>Digital dollars</small></span></div>
        <div class="eco-asset"><span class="eco-coin eco-eth">${icon('stake')}</span><span class="eco-asset-name"><b>Ethereum</b><small>2.0480 ETH</small></span><span class="eco-asset-value">$5,120.00<small>Ethereum</small></span></div>
        <div class="eco-asset"><span class="eco-coin eco-sol" aria-hidden="true"><i></i><i></i><i></i></span><span class="eco-asset-name"><b>Solana</b><small>6.5714 SOL</small></span><span class="eco-asset-value">$920.00<small>Solana</small></span></div>
      </div><div class="eco-card-foot"><span class="eco-tiny-dot"></span> One view. All your possibilities.</div>`,
  },
  pay: {
    number: '02', name: 'Pay', channel: 'MOVE', title: 'A little closer. Instantly.',
    description: 'For a friend, a freelancer, or your next big thing. Move digital dollars across networks in a few taps.',
    cta: 'Try a demo payment', href: '#product',
    preview: `<div class="eco-card-heading"><span>PAYMENT RECEIPT</span><span class="eco-demo-label">DEMO</span></div>
      <div class="eco-payment-amount"><span class="eco-value">$250<span>.00</span></span><span class="eco-confirmed"><span aria-hidden="true">✓</span> Delivered</span></div>
      <div class="eco-recipient"><span class="eco-recipient-icon" aria-hidden="true">✳</span><span><small>Paid to</small><b>Orbit Studio</b></span><span class="eco-recipient-asset">USDC</span></div>
      <div class="eco-receipt-route"><span><i></i> Ethereum</span><span class="eco-route-arrow" aria-hidden="true">⟶</span><span><i></i> Base</span></div>
      <dl class="eco-receipt-lines"><div><dt>Network fee</dt><dd>0.45 USDC</dd></div><div><dt>Arrival time</dt><dd>~3 seconds</dd></div></dl>
      <div class="eco-card-foot"><span class="eco-tiny-dot"></span> A simulated transfer. No funds moved.</div>`,
  },
  stake: {
    number: '03', name: 'Stake', channel: 'GROW', title: 'Give your ETH a purpose.',
    description: 'Explore staking with a clear view of your position, rewards, and the way it all works.',
    cta: 'Explore the staking demo', href: '#earn',
    preview: prefix => `<div class="eco-card-heading"><span>ETHEREUM STAKING</span><span class="eco-demo-label">DEMO</span></div>
      <div class="eco-yield"><span class="eco-value"><span class="eco-yield-number" aria-hidden="true">6.8</span><span class="eco-yield-unit" aria-hidden="true">%</span><span class="eco-sr-only">6.8 percent</span></span><span class="eco-yield-label">Illustrative APY<br><small>Not a live rate</small></span></div>
      <div class="eco-stake-chart" role="img" aria-label="Illustrative staking reward curve at 6.8 percent APY; example only"><svg viewBox="0 0 350 66" preserveAspectRatio="none" aria-hidden="true"><defs><clipPath id="${prefix}-stake-reveal" clipPathUnits="userSpaceOnUse"><rect class="eco-stake-reveal-mask" x="-6" y="-6" width="362" height="78"/></clipPath></defs><path d="M0 50H350M0 24H350" fill="none" stroke="#23331e" stroke-dasharray="2 5"/><g class="eco-stake-chart-data"><path d="m0 58 28-4 22 2 27-12 25 4 30-10 23 2 30-10 29 3 28-15 27 4 29-12 25 4 27-11" fill="none" stroke="#bcff75" stroke-width="2"/><circle cx="350" cy="3" r="3" fill="#bcff75"/></g></svg><span>ILLUSTRATIVE REWARD CURVE</span></div>
      <dl class="eco-stake-lines"><div><dt>Your demo position</dt><dd>2.4000 <span>ETH</span></dd></div><div><dt>Demo annual rewards</dt><dd class="eco-lime">+0.1632 <span>ETH</span></dd></div></dl>
      <div class="eco-card-foot"><span class="eco-tiny-dot"></span> Example only. Actual rewards can vary.</div>`,
  },
};

// Twenty text runs paint the two halves of the ring; the glyphs themselves
// supply its texture without a solid band or thousands of individual nodes.
function hexadecimalRing(id) {
  const paths = [];
  const halves = { back: [], front: [] };
  for (const [halfIndex, half] of ['back', 'front'].entries()) {
    for (let row = 0; row < 10; row += 1) {
      const offset = (row - 4.5) * 1.42;
      const rx = 101 + offset;
      const ry = 35 + offset;
      const length = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry))) / 2;
      const pathId = `${id}-hex-${half}-${row}`;
      paths.push(`<path id="${pathId}" d="M${(345 - rx).toFixed(2)} 277a${rx.toFixed(2)} ${ry.toFixed(2)} 0 0 ${half === 'back' ? 1 : 0} ${(rx * 2).toFixed(2)} 0"/>`);
      let seed = 0x6a09e667 ^ (row * 0x45d9f3b) ^ (halfIndex * 0x27d4eb2d);
      let glyphs = '';
      for (let index = 0; index < Math.floor(length / 1.12); index += 1) {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        glyphs += '0123456789ABCDEF'[(seed >>> 16) & 15];
      }
      const opacity = (half === 'front' ? .68 : .4) + (row % 3) * .1;
      halves[half].push(`<text fill="${row % 3 === 1 ? '#ddffad' : '#bcff75'}" opacity="${opacity.toFixed(2)}" textLength="${(length - 1.1).toFixed(2)}" lengthAdjust="spacingAndGlyphs"><textPath href="#${pathId}" startOffset=".25%">${glyphs}</textPath></text>`);
    }
  }
  return {
    paths: paths.join(''),
    back: `<g class="eco-hex-ring eco-hex-ring-back" transform="rotate(34 345 277)">${halves.back.join('')}</g>`,
    front: `<g class="eco-hex-ring eco-hex-ring-front" transform="rotate(34 345 277)">${halves.front.join('')}</g>`,
  };
}

function continentDots() {
  // Three irregular silhouettes share a gently staggered dot grid. Keeping the
  // gaps between them makes the globe read as land masses rather than noise.
  const regions = [
    [[-43, -21], [-36, -33], [-22, -40], [-11, -34], [-15, -23], [-7, -18], [-12, -8], [-23, -5], [-28, 4], [-39, -4], [-44, -13]],
    [[-23, 8], [-13, 4], [-3, 10], [0, 19], [-7, 25], [-8, 36], [-15, 45], [-21, 35], [-19, 23], [-27, 17]],
    [[9, -30], [19, -37], [32, -31], [34, -22], [44, -17], [46, -7], [36, 0], [29, -4], [24, 4], [15, -1], [18, -11], [8, -17]],
  ];
  const contains = (x, y, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const tones = ['', '', ''];
  for (let row = 0; row < 30; row += 1) {
    for (let column = 0; column < 30; column += 1) {
      const x = -47 + column * 3.25 + (row % 2) * 1.625 + Math.sin(column * 7 + row * 3) * .35;
      const y = -44 + row * 3.1 + Math.cos(column * 3 - row * 5) * .3;
      if (!regions.some(region => contains(x, y, region))) continue;
      const radius = .69 + ((row * 7 + column * 3) % 5) * .075;
      const tone = (row + column * 2) % 3;
      tones[tone] += `M${(345 + x - radius).toFixed(2)} ${(277 + y).toFixed(2)}a${radius.toFixed(2)} ${radius.toFixed(2)} 0 1 0 ${(radius * 2).toFixed(2)} 0a${radius.toFixed(2)} ${radius.toFixed(2)} 0 1 0 ${(-radius * 2).toFixed(2)} 0`;
    }
  }
  return `<g class="eco-continents" fill="#c5ff79">${tones.map((path, index) => `<path d="${path}" opacity="${[.64, .8, .96][index]}"/>`).join('')}</g>`;
}

function instrument(id) {
  const ring = hexadecimalRing(id);
  const ticks = Array.from({ length: 72 }, (_, index) => {
    const angle = index * Math.PI / 36;
    const major = index % 6 === 0;
    const inner = major ? 207 : 211;
    return `<path d="M${(345 + Math.cos(angle) * inner).toFixed(2)} ${(277 + Math.sin(angle) * inner).toFixed(2)} ${ (345 + Math.cos(angle) * 215).toFixed(2)} ${(277 + Math.sin(angle) * 215).toFixed(2)}" opacity="${major ? '.75' : '.3'}"/>`;
  }).join('');
  return `<svg class="eco-instrument" viewBox="0 0 700 570" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="${id}-aura"><stop stop-color="#9cda6a" stop-opacity=".12"/><stop offset=".68" stop-color="#7faf53" stop-opacity=".025"/><stop offset="1" stop-color="#7faf53" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}-sphere" cx=".27" cy=".22" r=".9"><stop stop-color="#536c3e"/><stop offset=".28" stop-color="#304224"/><stop offset=".6" stop-color="#172110"/><stop offset="1" stop-color="#080c07"/></radialGradient>
      <radialGradient id="${id}-limb" cx=".3" cy=".25" r=".78"><stop offset=".55" stop-color="#0a1007" stop-opacity="0"/><stop offset="1" stop-color="#040703" stop-opacity=".8"/></radialGradient>
      <linearGradient id="${id}-orbit" x1="100" y1="100" x2="600" y2="460" gradientUnits="userSpaceOnUse"><stop stop-color="#badb96" stop-opacity=".5"/><stop offset=".4" stop-color="#91b46c" stop-opacity=".1"/><stop offset="1" stop-color="#a7d280" stop-opacity=".45"/></linearGradient>
      <pattern id="${id}-grid" width="42" height="42" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#b7db92" opacity=".13"/></pattern>
      <clipPath id="${id}-surface"><circle cx="345" cy="277" r="62.6"/></clipPath>
      ${ring.paths}
    </defs>
    <rect data-trail-background x="26" y="30" width="648" height="496" fill="url(#${id}-grid)"/>
    <ellipse data-trail-background cx="345" cy="277" rx="267" ry="240" fill="url(#${id}-aura)"/>
    <g stroke="#5c7547" stroke-width=".7">${ticks}</g>
    <g class="eco-orbital-tracks" stroke="url(#${id}-orbit)">
      <ellipse cx="345" cy="277" rx="270" ry="170" transform="rotate(23 345 277)" stroke-width="7" opacity=".06"/>
      <ellipse cx="345" cy="277" rx="270" ry="170" transform="rotate(23 345 277)"/>
    </g>
    <ellipse class="eco-orbit-tracer" cx="345" cy="277" rx="270" ry="170" transform="rotate(23 345 277)" pathLength="1000" stroke="#bcff75" stroke-width="2" stroke-linecap="round" stroke-dasharray="7 993" opacity=".65"/>
    <g class="eco-connectors" stroke="#bcff75" stroke-width="1.25" stroke-linecap="round">
      <path data-eco-route="wallet" d="M283 261C241 251 200 222 151 207"/>
      <path data-eco-route="pay" d="M408 270C477 270 545 251 602 232"/>
      <path data-eco-route="stake" d="M350 340C350 379 359 415 367 449"/>
    </g>
    <g class="eco-route-endpoints" fill="#bcff75"><circle cx="283" cy="261" r="2.5" data-eco-route="wallet"/><circle cx="408" cy="270" r="2.5" data-eco-route="pay"/><circle cx="350" cy="340" r="2.5" data-eco-route="stake"/></g>
    <g class="eco-sculpture" data-trail-obstacle>
      ${ring.back}
      <circle cx="345" cy="277" r="63" fill="url(#${id}-sphere)" stroke="#8ab164" stroke-opacity=".4" stroke-width=".8"/>
      <g clip-path="url(#${id}-surface)">
        <g transform="rotate(18 345 277)" stroke="#b6d693" stroke-linecap="round">
          <path d="M285 231c32 17 79 19 119 5M275 252c40 19 93 22 139 7M279 282c40 18 92 19 132 4M291 313c32 11 65 11 98 2" stroke-width="4" opacity=".055"/>
          <path d="M291 226c29 17 66 19 102 7M280 241c36 19 81 21 124 8M276 254c40 19 92 22 137 6M277 267c40 19 94 22 137 5M281 284c40 17 88 18 128 2M286 298c36 15 79 16 116 2M297 316c28 9 58 10 86 1" stroke-width=".65" opacity=".23"/>
          <path d="M281 260c13 4 17 9 29 9s17-4 28-1 15 8 29 8 29-3 43-8M288 291c16 7 22 3 33 7s20 9 32 7 29-1 46-7M296 239c12 6 18 3 28 7s19 5 27 4 24 5 41 0" stroke-width=".7" opacity=".17"/>
          <path d="M318 216c-27 34-30 81 7 121M354 212c29 29 35 80 12 126" stroke-width=".55" opacity=".11"/>
        </g>
        ${continentDots()}
        <circle cx="345" cy="277" r="63" fill="url(#${id}-limb)"/>
      </g>

      ${ring.front}
    </g>
    <g class="eco-svg-labels" fill="#6e825e" font-size="9" letter-spacing="1.6">
      <text x="38" y="71">ORBITAL SYSTEM / 003</text><text x="563" y="71">360° / OPEN</text>
      <text x="67" y="377" transform="rotate(-90 67 377)">YOUR FINANCIAL FIELD</text>
      <text x="345" y="383" text-anchor="middle" fill="#a1b58a" font-size="10" letter-spacing="3.3">O R B I T</text>
      <text x="345" y="400" text-anchor="middle" font-size="7.8" letter-spacing="1.3">PERSONAL FINANCE</text>
    </g>
  </svg>`;
}

let instanceCount = 0;

function initStakeEntrance(preview, prefix, motionPreference) {
  const rate = preview.querySelector('.eco-yield');
  const number = preview.querySelector('.eco-yield-number');
  const chart = preview.querySelector('.eco-stake-chart');
  const chartData = preview.querySelector('.eco-stake-chart-data');
  const revealMask = preview.querySelector('.eco-stake-reveal-mask');
  const frames = new Set();
  const entrances = new Map();
  let observer;
  let disposed = false;

  function settle() {
    observer?.disconnect();
    entrances.clear();
    frames.forEach(frame => cancelAnimationFrame(frame));
    frames.clear();
    number.textContent = '6.8';
    chartData.removeAttribute('clip-path');
  }

  function animate(duration, paint, complete = () => {}) {
    let start;
    function schedule() {
      const frame = requestAnimationFrame(time => {
        frames.delete(frame);
        if (disposed) return;
        if (motionPreference.matches) { settle(); return; }
        start ??= time;
        const progress = Math.min((time - start) / duration, 1);
        paint(1 - (1 - progress) ** 3);
        if (progress < 1) schedule();
        else complete();
      });
      frames.add(frame);
    }
    schedule();
  }

  // Only the hidden visual number changes. Its accessible final value and the
  // chart description stay fixed throughout this entrance.
  if (motionPreference.matches || !window.IntersectionObserver) return settle;
  number.textContent = '0.1';
  chartData.setAttribute('clip-path', `url(#${prefix}-stake-reveal)`);
  revealMask.setAttribute('width', '0');
  entrances.set(rate, () => animate(1250, progress => { number.textContent = (0.1 + 6.7 * progress).toFixed(1); }));
  entrances.set(chart, () => animate(1050, progress => { revealMask.setAttribute('width', String(362 * progress)); }, () => chartData.removeAttribute('clip-path')));
  observer = new window.IntersectionObserver(entries => {
    if (disposed) return;
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.intersectionRatio < .25) continue;
      const enter = entrances.get(entry.target);
      if (!enter) continue;
      entrances.delete(entry.target);
      observer.unobserve(entry.target);
      enter();
    }
  }, { threshold: .25 });
  entrances.forEach((_, target) => observer.observe(target));
  function onMotionChange() { if (motionPreference.matches) settle(); }
  motionPreference.addEventListener('change', onMotionChange);
  return () => {
    disposed = true;
    settle();
    motionPreference.removeEventListener('change', onMotionChange);
  };
}

/** Mount the self-contained Wallet / Pay / Stake orbital product explorer. */
export function initEcosystem(root) {
  if (!root) return null;
  root._orbitEcosystem?.destroy();
  const id = `eco-${++instanceCount}`;
  const keys = Object.keys(PRODUCTS);
  root.innerHTML = `<div class="eco-v2 is-paused" data-eco-selected="wallet">
    <div class="eco-map-column">
      <div class="eco-map-top"><span><i class="eco-tiny-dot"></i> ONE ACCOUNT. THREE POSSIBILITIES.</span><span class="eco-channel">01 / HOLD</span></div>
      <div class="eco-map" role="group" aria-label="Explore Wallet, Pay and Stake">
        ${instrument(id)}
        ${keys.map(key => `<button type="button" class="eco-node eco-node-${key}" data-eco-product="${key}" aria-pressed="${key === 'wallet'}" aria-controls="${id}-detail"><span class="eco-node-orb">${icon(key)}<span class="eco-node-satellite" aria-hidden="true"><span class="eco-node-point"></span></span></span><span class="eco-node-label">${PRODUCTS[key].name}<small>0${keys.indexOf(key) + 1} / ${PRODUCTS[key].channel}</small></span></button>`).join('')}
      </div>
      <div class="eco-map-bottom"><span>CHOOSE YOUR NEXT MOVE</span><span class="eco-map-progress"><i class="is-active"></i><i></i><i></i><span>01—03</span></span></div>
    </div>
    <div id="${id}-detail" class="eco-detail" role="region" aria-label="Wallet preview" aria-live="polite"></div>
  </div>`;
  const shell = root.querySelector('.eco-v2');
  const detail = root.querySelector('.eco-detail');
  const buttons = [...root.querySelectorAll('[data-eco-product]')];
  let selected;
  let visible = false;
  let disposeStakeEntrance = () => {};
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function selectProduct(key) {
    const product = PRODUCTS[key];
    if (!product || key === selected) return;
    disposeStakeEntrance();
    disposeStakeEntrance = () => {};
    selected = key;
    shell.dataset.ecoSelected = key;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ecoProduct === key)));
    root.querySelector('.eco-channel').textContent = `${product.number} / ${product.channel}`;
    root.querySelectorAll('.eco-map-progress > i').forEach((dot, index) => dot.classList.toggle('is-active', keys[index] === key));
    root.querySelector('.eco-map-progress > span').textContent = `${product.number}—03`;
    root.querySelectorAll('[data-eco-route]').forEach(path => path.classList.toggle('is-active', path.dataset.ecoRoute === key));
    detail.setAttribute('aria-label', `${product.name} preview`);
    const preview = typeof product.preview === 'function' ? product.preview(id) : product.preview;
    detail.innerHTML = `<div class="eco-detail-label"><span>ORBIT ${product.name.toUpperCase()}</span><span>${product.number} / 03</span></div><h3>${product.title}</h3><p class="eco-detail-description">${product.description}</p><div class="eco-preview eco-preview-${key}">${preview}</div><a class="eco-cta" href="${product.href}">${product.cta}<span aria-hidden="true">↗</span></a><span class="eco-disclosure">FICTIONAL PRODUCT · ILLUSTRATIVE DATA</span>`;
    if (key === 'stake') disposeStakeEntrance = initStakeEntrance(detail, id, reducedMotion);
  }

  function handleClick(event) {
    const button = event.target.closest('[data-eco-product]');
    if (button && root.contains(button)) selectProduct(button.dataset.ecoProduct);
  }

  function handleKeys(event) {
    const button = event.target.closest('[data-eco-product]');
    if (!button) return;
    const index = buttons.indexOf(button);
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + buttons.length - 1) % buttons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    buttons[next].focus({ preventScroll: true });
    selectProduct(buttons[next].dataset.ecoProduct);
  }

  function updateMotion() {
    shell.classList.toggle('is-paused', !visible || reducedMotion.matches || document.hidden);
    if (reducedMotion.matches || document.hidden) buttons.forEach(button => button.classList.remove('is-satellite-orbiting'));
  }

  function orbitSatellite(event) {
    if (reducedMotion.matches || document.hidden) return;
    if (event.type === 'focus' && !event.currentTarget.matches(':focus-visible')) return;
    event.currentTarget.classList.add('is-satellite-orbiting');
  }

  function finishSatelliteOrbit(event) {
    if (event.animationName !== 'eco-node-revolution') return;
    event.target.closest('[data-eco-product]')?.classList.remove('is-satellite-orbiting');
  }

  root.addEventListener('click', handleClick);
  root.addEventListener('keydown', handleKeys);
  root.addEventListener('animationend', finishSatelliteOrbit);
  buttons.forEach(button => {
    button.addEventListener('pointerenter', orbitSatellite);
    button.addEventListener('focus', orbitSatellite);
  });
  document.addEventListener('visibilitychange', updateMotion);
  reducedMotion.addEventListener('change', updateMotion);
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    updateMotion();
  }, { threshold: 0.05 }) : null;
  if (observer) observer.observe(root);
  else { visible = true; updateMotion(); }
  selectProduct('wallet');

  const controller = {
    selectProduct,
    destroy() {
      disposeStakeEntrance();
      observer?.disconnect();
      root.removeEventListener('click', handleClick);
      root.removeEventListener('keydown', handleKeys);
      root.removeEventListener('animationend', finishSatelliteOrbit);
      buttons.forEach(button => {
        button.removeEventListener('pointerenter', orbitSatellite);
        button.removeEventListener('focus', orbitSatellite);
        button.classList.remove('is-satellite-orbiting');
      });
      document.removeEventListener('visibilitychange', updateMotion);
      reducedMotion.removeEventListener('change', updateMotion);
      shell.classList.add('is-paused');
      if (root._orbitEcosystem === controller) delete root._orbitEcosystem;
    },
  };
  root._orbitEcosystem = controller;
  return controller;
}
