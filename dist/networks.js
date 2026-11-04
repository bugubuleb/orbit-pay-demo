const tickers = new WeakMap();

/** A single readable network list with decorative copies for a continuous loop. */
export function initNetworkTicker(root) {
  if (!root) return;
  if (tickers.has(root)) return tickers.get(root);
  const networks = [...root.children].filter(node => node.classList.contains('network-name'));
  if (!networks.length) return;

  const originalChildren = [...root.childNodes];
  const originalRoles = networks.map(node => node.getAttribute('role'));
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const viewport = document.createElement('div');
  viewport.className = 'network-ticker-viewport';
  const track = document.createElement('div');
  track.className = 'network-ticker-track';
  const sequence = document.createElement('div');
  sequence.className = 'network-ticker-sequence';
  sequence.setAttribute('role', 'list');
  networks.forEach(network => {
    network.setAttribute('role', 'listitem');
    sequence.append(network);
  });
  track.append(sequence);
  viewport.append(track);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'network-ticker-toggle';
  toggle.innerHTML = '<svg class="network-pause-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10M11 3v10"/></svg><svg class="network-play-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 8 5-8 5Z"/></svg>';
  const disclosure = root.querySelector('.network-demo');
  root.insertBefore(viewport, disclosure);
  root.append(toggle);
  root.classList.add('network-ticker');

  let userPaused = false;
  let hovered = false;
  let focused = false;
  let visible = !('IntersectionObserver' in window);
  let disposed = false;
  let measureFrame = 0;
  let resizeObserver;
  let intersectionObserver;

  function syncPlayback() {
    const reduced = motionPreference.matches;
    root.dataset.networkMotion = reduced ? 'reduced' : 'animate';
    root.dataset.networkPaused = String(reduced || userPaused || hovered || focused || !visible || document.hidden);
    toggle.dataset.paused = String(userPaused);
    const label = userPaused ? 'Resume network animation' : 'Pause network animation';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    toggle.hidden = reduced;
  }

  function measure() {
    measureFrame = 0;
    if (disposed) return;
    if (motionPreference.matches) {
      [...track.children].slice(1).forEach(copy => copy.remove());
      root.dataset.networkReady = 'false';
      return;
    }
    const distance = sequence.getBoundingClientRect().width;
    const visibleWidth = viewport.getBoundingClientRect().width;
    if (!distance || !visibleWidth) {
      root.dataset.networkReady = 'false';
      return;
    }

    // One full sequence moves per loop. Extra copies cover the viewport at every
    // point, even when the available width is wider than the original sequence.
    const copiesNeeded = Math.max(1, Math.ceil(visibleWidth / distance));
    while (track.children.length - 1 < copiesNeeded) {
      const copy = sequence.cloneNode(true);
      copy.classList.add('network-ticker-copy');
      copy.setAttribute('aria-hidden', 'true');
      copy.setAttribute('inert', '');
      copy.removeAttribute('role');
      copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      track.append(copy);
    }
    while (track.children.length - 1 > copiesNeeded) track.lastElementChild.remove();
    track.style.setProperty('--network-loop-distance', `${distance}px`);
    root.dataset.networkReady = 'true';
  }

  function scheduleMeasure() {
    if (!disposed && !measureFrame) measureFrame = requestAnimationFrame(measure);
  }
  function onMotionChange() {
    syncPlayback();
    scheduleMeasure();
  }
  function onToggle() {
    userPaused = !userPaused;
    syncPlayback();
  }
  function onPointerEnter(event) {
    if (event.pointerType === 'touch') return;
    hovered = true;
    syncPlayback();
  }
  function onPointerLeave() {
    hovered = false;
    syncPlayback();
  }
  function onFocusIn() {
    focused = true;
    syncPlayback();
  }
  function onFocusOut(event) {
    focused = root.contains(event.relatedTarget);
    syncPlayback();
  }

  toggle.addEventListener('click', onToggle);
  root.addEventListener('pointerenter', onPointerEnter);
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  document.addEventListener('visibilitychange', syncPlayback);
  motionPreference.addEventListener('change', onMotionChange);
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(viewport);
    resizeObserver.observe(sequence);
  } else {
    window.addEventListener('resize', scheduleMeasure);
  }
  if ('IntersectionObserver' in window) {
    intersectionObserver = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      syncPlayback();
    });
    intersectionObserver.observe(root);
  }
  document.fonts?.ready.then(scheduleMeasure);
  syncPlayback();
  scheduleMeasure();

  const controller = {
    pause() { userPaused = true; syncPlayback(); },
    resume() { userPaused = false; syncPlayback(); },
    destroy() {
      disposed = true;
      cancelAnimationFrame(measureFrame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      document.removeEventListener('visibilitychange', syncPlayback);
      motionPreference.removeEventListener('change', onMotionChange);
      toggle.removeEventListener('click', onToggle);
      root.removeEventListener('pointerenter', onPointerEnter);
      root.removeEventListener('pointerleave', onPointerLeave);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      networks.forEach((network, index) => {
        if (originalRoles[index] === null) network.removeAttribute('role');
        else network.setAttribute('role', originalRoles[index]);
      });
      root.replaceChildren(...originalChildren);
      root.classList.remove('network-ticker');
      delete root.dataset.networkMotion;
      delete root.dataset.networkPaused;
      delete root.dataset.networkReady;
      tickers.delete(root);
    },
  };
  tickers.set(root, controller);
  return controller;
}
