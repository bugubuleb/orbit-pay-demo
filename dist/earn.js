export const ILLUSTRATIVE_APY = 0.068;
export const EARN_TERMS = Object.freeze([3, 6, 12]);

/** Effective annual yield, compounded over a fraction of a year. No market data. */
export function calculateProjection(amount, months, apy = ILLUSTRATIVE_APY) {
  if ((typeof amount !== 'string' && typeof amount !== 'number') || String(amount).trim() === '') {
    return { error: 'Enter an amount from 0.01 to 10,000 ETH.' };
  }
  const principal = Number(amount);
  if (!Number.isFinite(principal) || principal < 0.01 || principal > 10000) {
    return { error: 'Enter an amount from 0.01 to 10,000 ETH.' };
  }
  if (!EARN_TERMS.includes(months)) return { error: 'Choose a 3, 6 or 12 month horizon.' };
  if (!Number.isFinite(apy) || apy < 0 || apy > 1) return { error: 'The illustrative annual yield is unavailable.' };
  const rewardsAt = month => principal * Math.expm1(Math.log1p(apy) * month / 12);
  const rewards = rewardsAt(months);
  return {
    principal, months, apy, rewards, total: principal + rewards,
    series: Array.from({ length: 49 }, (_, index) => ({ month: index / 4, rewards: rewardsAt(index / 4) })),
  };
}

const formatEth = value => new Intl.NumberFormat('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(value);
const formatTick = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: value < 0.01 ? 4 : value < 1 ? 3 : 2 }).format(value);
let instanceCount = 0;

function initEarnEntrances(root, prefix) {
  const rate = root.querySelector('.earn-rate-value');
  const number = root.querySelector('.earn-rate-number');
  const chart = root.querySelector('.earn-chart');
  const chartData = root.querySelector('.earn-chart-data');
  const revealMask = root.querySelector('.earn-chart-reveal-mask');
  const method = root.querySelector('.earn-method summary');
  const methodMark = root.querySelector('.earn-method-mark');
  const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const frames = new Set();
  let observer;

  function settle() {
    observer?.disconnect();
    frames.forEach(frame => cancelAnimationFrame(frame));
    frames.clear();
    number.textContent = '6.8';
    chartData.removeAttribute('clip-path');
    methodMark.classList.remove('earn-method-arriving');
  }

  function animate(duration, paint, complete = () => {}) {
    let start;
    function schedule() {
      const frame = requestAnimationFrame(time => {
        frames.delete(frame);
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

  // Keep the final figures available to assistive technology throughout the entrance.
  // Without observation or with reduced motion, the default render is already complete.
  if (motionPreference?.matches || !window.IntersectionObserver) return settle;
  number.textContent = '0.1';
  chartData.setAttribute('clip-path', `url(#${prefix}-reveal)`);
  revealMask.setAttribute('width', '0');
  const entrances = new Map([
    [rate, () => animate(1250, progress => { number.textContent = (0.1 + 6.7 * progress).toFixed(1); })],
    [chart, () => animate(1050, progress => { revealMask.setAttribute('width', String(524 * progress)); }, () => chartData.removeAttribute('clip-path'))],
    [method, () => methodMark.classList.add('earn-method-arriving')],
  ]);
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.25) continue;
      const enter = entrances.get(entry.target);
      if (!enter) continue;
      entrances.delete(entry.target);
      observer.unobserve(entry.target);
      enter();
    }
  }, { threshold: 0.25 });
  entrances.forEach((_, target) => observer.observe(target));
  function onMotionPreferenceChange(event) {
    if (event.matches) {
      entrances.clear();
      settle();
    }
  }
  motionPreference?.addEventListener?.('change', onMotionPreferenceChange);
  return () => {
    entrances.clear();
    settle();
    motionPreference?.removeEventListener?.('change', onMotionPreferenceChange);
  };
}

export function initEarn(root) {
  if (!root) return;
  if (root.earnController) return root.earnController;
  const prefix = `earn-${++instanceCount}`;
  root.innerHTML = `
    <div class="earn-layout">
      <div class="earn-copy">
        <h2 class="earn-heading">Put your ETH<br><em>to work.</em></h2>
        <p class="earn-intro">See how a staking position could grow. Adjust your amount and time horizon to explore an illustrative projection.</p>
        <div class="earn-rate">
          <div class="earn-rate-symbol" aria-hidden="true"><svg viewBox="0 0 38 58"><path d="M19 2 2 29l17 10 17-10L19 2Z"/><path d="m2 34 17 22 17-22-17 10L2 34Z"/><path d="M19 2v37M2 29l17-8 17 8M19 44v12"/></svg></div>
          <div><span class="earn-label">Illustrative APY</span><div class="earn-rate-value"><span class="earn-rate-number" aria-hidden="true">6.8</span><span class="earn-rate-percent" aria-hidden="true">%</span><span class="earn-sr-only">6.8 percent</span></div></div>
          <span class="earn-rate-aside">A little time.<br>A wider horizon.</span>
        </div>
        <p class="earn-risk" id="${prefix}-risk">Demo projection. Variable rewards; principal is at risk. Not a guaranteed return.</p>
        <details class="earn-method"><summary>How the projection works <span class="earn-method-mark" aria-hidden="true"><span class="earn-method-glyph">+</span></span></summary><p>Amount × (1.068<sup>months ÷ 12</sup> − 1). Assumes a constant effective annual yield and reinvested rewards. Fees, taxes, price changes and withdrawal limits are not modeled.</p></details>
      </div>
      <div class="earn-calculator">
        <form class="earn-form" novalidate aria-label="Staking projection" aria-describedby="${prefix}-risk">
          <div class="earn-calculator-title"><span>YOUR POSSIBLE NEXT MOVE</span><span class="earn-demo-tag">DEMO</span></div>
          <label class="earn-label" for="${prefix}-amount">ETH amount</label>
          <div class="earn-amount-row"><input class="earn-amount-input" id="${prefix}-amount" name="amount" type="number" inputmode="decimal" min="0.01" max="10000" step="any" value="10" required aria-describedby="${prefix}-amount-hint ${prefix}-error"><span class="earn-asset"><span aria-hidden="true">◇</span> ETH</span></div>
          <div class="earn-input-meta"><span id="${prefix}-amount-hint">0.01 – 10,000 ETH</span><span>Hypothetical amount</span></div>
          <p class="earn-error" id="${prefix}-error" aria-live="polite"></p>
          <fieldset class="earn-term"><legend>Time horizon</legend><div class="earn-term-options">${EARN_TERMS.map(months => `<label class="earn-term-option"><input type="radio" name="${prefix}-term" value="${months}"${months === 12 ? ' checked' : ''}><span>${months} months</span></label>`).join('')}</div></fieldset>
          <div class="earn-result-heading"><span class="earn-label">Projected rewards</span><span class="earn-horizon">After 12 months</span></div>
          <div class="earn-rewards"><span class="earn-reward-value">+0.6800</span><span class="earn-reward-unit">ETH</span></div>
          <div class="earn-chart" role="img" aria-label="Illustrative staking rewards over 12 months">
            <div class="earn-chart-y" aria-hidden="true"><span data-y="top">0.8</span><span data-y="mid">0.4</span><span>0</span></div>
            <div class="earn-chart-plot"><svg viewBox="0 0 500 180" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${prefix}-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".17"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></linearGradient><clipPath id="${prefix}-reveal" clipPathUnits="userSpaceOnUse"><rect class="earn-chart-reveal-mask" x="-12" y="-12" width="524" height="204"/></clipPath></defs><path class="earn-grid" d="M0 12H500M0 90H500M0 168H500M125 12V168M250 12V168M375 12V168M499 12V168"/><g class="earn-chart-data"><path class="earn-chart-future"/><path class="earn-chart-area" fill="url(#${prefix}-gradient)"/><path class="earn-chart-line"/><path class="earn-chart-guide"/><ellipse class="earn-chart-endpoint" rx="4" ry="4"/><ellipse class="earn-chart-halo" rx="9" ry="9"/></g></svg><div class="earn-chart-x" aria-hidden="true"><span>Today</span><span>6 months</span><span>12 months</span></div></div>
          </div>
          <dl class="earn-ledger"><div><dt>Starting amount</dt><dd class="earn-principal">10.0000 ETH</dd></div><div><dt>Projected total</dt><dd class="earn-total">10.6800 ETH</dd></div></dl>
          <button class="earn-submit" type="submit"><span>Preview staking</span><span aria-hidden="true">↗</span></button>
          <p class="earn-local-note">A local demo. No wallet or real funds.</p>
          <span class="earn-sr-only earn-live" aria-live="polite" aria-atomic="true"></span>
        </form>
        <div class="earn-confirmation" hidden tabindex="-1" aria-labelledby="${prefix}-confirmation-title">
          <span class="earn-confirmation-kicker">LOCAL SIMULATION / READY</span><div class="earn-confirmation-mark" aria-hidden="true">✓</div>
          <h3 id="${prefix}-confirmation-title">Your demo<br><em>position.</em></h3>
          <p class="earn-confirmation-intro">A glimpse of the possibilities.</p>
          <dl class="earn-confirmation-ledger"><div><dt>Hypothetical stake</dt><dd class="earn-preview-principal"></dd></div><div><dt>Time horizon</dt><dd class="earn-preview-term"></dd></div><div><dt>Illustrative APY</dt><dd>6.8%</dd></div><div><dt>Projected rewards</dt><dd class="earn-preview-rewards"></dd></div><div><dt>Projected total</dt><dd class="earn-preview-total"></dd></div></dl>
          <p class="earn-confirmation-note">This position exists only on this page. No wallet was connected and no funds were moved.</p>
          <p class="earn-risk">Demo projection. Variable rewards; principal is at risk. Not a guaranteed return.</p>
          <button class="earn-submit earn-adjust" type="button"><span>Adjust projection</span><span aria-hidden="true">↗</span></button><button class="earn-reset" type="button">Reset demo <span aria-hidden="true">↺</span></button>
        </div>
      </div>
    </div>`;

  const $ = selector => root.querySelector(selector);
  const form = $('.earn-form');
  const amountInput = $('.earn-amount-input');
  const termInputs = [...root.querySelectorAll('.earn-term-option input')];
  const submit = $('.earn-submit');
  const confirmation = $('.earn-confirmation');
  let current;
  let pending = false;
  let confirmationTimer;

  function renderChart(projection) {
    const chart = $('.earn-chart');
    chart.classList.toggle('earn-chart-invalid', !projection);
    if (!projection) { chart.setAttribute('aria-label', 'Enter a valid amount to view a projection.'); return; }
    const yearlyReward = projection.series.at(-1).rewards;
    const magnitude = 10 ** Math.floor(Math.log10(Math.max(yearlyReward, 0.001)));
    const ceiling = Math.max(0.001, Math.ceil(yearlyReward / magnitude / 2) * magnitude * 2);
    const point = item => ({ x: item.month / 12 * 498 + 1, y: 168 - item.rewards / ceiling * 156 });
    const path = series => series.map((item, i) => { const p = point(item); return `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`; }).join(' ');
    const active = projection.series.filter(item => item.month <= projection.months);
    const activePath = path(active);
    const end = point(active.at(-1));
    $('.earn-chart-future').setAttribute('d', path(projection.series.filter(item => item.month >= projection.months)));
    $('.earn-chart-line').setAttribute('d', activePath);
    $('.earn-chart-area').setAttribute('d', `${activePath} L${end.x} 168 L1 168 Z`);
    $('.earn-chart-guide').setAttribute('d', `M${end.x} ${end.y}V168`);
    for (const selector of ['.earn-chart-endpoint', '.earn-chart-halo']) {
      $(selector).setAttribute('cx', end.x); $(selector).setAttribute('cy', end.y);
    }
    $('[data-y="top"]').textContent = formatTick(ceiling);
    $('[data-y="mid"]').textContent = formatTick(ceiling / 2);
    chart.setAttribute('aria-label', `Illustrative rewards in ETH: ${formatEth(projection.rewards)} after ${projection.months} months from ${formatEth(projection.principal)} ETH. Dashed continuation shows the same hypothetical rate through month 12.`);
  }

  function update() {
    const months = Number(termInputs.find(input => input.checked).value);
    current = calculateProjection(amountInput.value, months);
    const valid = !current.error;
    amountInput.setAttribute('aria-invalid', String(!valid));
    $('.earn-error').textContent = current.error || '';
    $('.earn-reward-value').textContent = valid ? `+${formatEth(current.rewards)}` : '—';
    $('.earn-horizon').textContent = `After ${months} months`;
    $('.earn-principal').textContent = valid ? `${formatEth(current.principal)} ETH` : '—';
    $('.earn-total').textContent = valid ? `${formatEth(current.total)} ETH` : '—';
    $('.earn-live').textContent = valid ? `Projected rewards: ${formatEth(current.rewards)} ETH. Projected total: ${formatEth(current.total)} ETH after ${months} months.` : '';
    submit.disabled = !valid || pending;
    renderChart(valid ? current : null);
    return valid;
  }

  function reset(defaults = false) {
    clearTimeout(confirmationTimer);
    pending = false;
    if (defaults) {
      amountInput.value = '10';
      termInputs.forEach(input => { input.checked = input.value === '12'; });
    }
    confirmation.hidden = true;
    form.hidden = false;
    form.removeAttribute('aria-busy');
    amountInput.disabled = false;
    termInputs.forEach(input => { input.disabled = false; });
    submit.firstElementChild.textContent = 'Preview staking';
    update();
    amountInput.focus({ preventScroll: true });
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (pending || !update()) return;
    pending = true;
    const position = { ...current };
    submit.disabled = true;
    amountInput.disabled = true;
    termInputs.forEach(input => { input.disabled = true; });
    form.setAttribute('aria-busy', 'true');
    submit.firstElementChild.textContent = 'Building your preview…';
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    confirmationTimer = setTimeout(() => {
      $('.earn-preview-principal').textContent = `${formatEth(position.principal)} ETH`;
      $('.earn-preview-term').textContent = `${position.months} months`;
      $('.earn-preview-rewards').textContent = `+${formatEth(position.rewards)} ETH`;
      $('.earn-preview-total').textContent = `${formatEth(position.total)} ETH`;
      form.hidden = true;
      form.removeAttribute('aria-busy');
      confirmation.hidden = false;
      confirmation.focus({ preventScroll: true });
      pending = false;
    }, reducedMotion ? 0 : 450);
  });
  amountInput.addEventListener('input', update);
  termInputs.forEach(input => input.addEventListener('change', update));
  $('.earn-adjust').addEventListener('click', () => reset());
  $('.earn-reset').addEventListener('click', () => reset(true));
  update();
  const destroyEntrances = initEarnEntrances(root, prefix);
  root.earnController = { reset, destroy() { clearTimeout(confirmationTimer); destroyEntrances(); root.innerHTML = ''; delete root.earnController; } };
  return root.earnController;
}
