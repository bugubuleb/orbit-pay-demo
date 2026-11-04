const instances = new WeakMap();
let nextId = 0;
let openSelect = null;

const DETAILS = {
  USDC: { name: 'USD Coin', icon: 'dollar' },
  USDT: { name: 'Tether USD', icon: 'tether' },
  ETH: { name: 'Ether', icon: 'ethereum' },
  Ethereum: { name: 'Ethereum network', icon: 'ethereum' },
  Base: { name: 'Base network', icon: 'base' },
  Solana: { name: 'Solana network', icon: 'solana' },
  Polygon: { name: 'Polygon network', icon: 'polygon' },
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function vector(kind) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', kind === 'chevron' || kind === 'check' ? '0 0 16 16' : '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const paths = {
    chevron: 'M2 5h2v2h2v2h4V7h2V5h2v4h-2v2h-2v2H6v-2H4V9H2Z',
    check: 'M2 8h2v2h2v2h2v-2h2V8h2V6h2V4h-4v2H8v2H6V6H2Z',
    ethereum: 'm12 2 6 10-6 3-6-3Zm-6 12 6 3 6-3-6 8Z',
    base: 'M3 11a9 9 0 1 1 0 2h13v-2Z',
    solana: 'M6 5h15l-3 3H3Zm-3 6h15l3 3H6Zm3 6h15l-3 3H3Z',
    polygon: 'm8 4 5 3v5l-2 1V8L8 6 5 8v4l3 2 8-4 5 3v6l-5 3-5-3v-5l2-1v5l3 2 3-2v-4l-3-2-8 4-5-3V7Z',
    tether: 'M5 4h14v3h-5v3c4 .2 7 1 7 2s-3 1.8-7 2v7h-4v-7c-4-.2-7-1-7-2s3-1.8 7-2V7H5Zm5 7c-3 .2-5 .6-5 1s2 .8 5 1Zm4 0v2c3-.2 5-.6 5-1s-2-.8-5-1Z',
  };
  if (kind === 'dollar') {
    const circle = document.createElementNS(svg.namespaceURI, 'circle');
    circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '9');
    circle.setAttribute('fill', 'none'); circle.setAttribute('stroke', 'currentColor'); circle.setAttribute('stroke-width', '1.4');
    svg.append(circle);
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', 'M15.5 8.5c-1-2-6-2-6 1 0 3 6 1 6 4 0 3-5 3-7 1M12 5.5v13');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.5');
    svg.append(path);
  } else {
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', paths[kind] || paths.ethereum);
    path.setAttribute('fill', 'currentColor');
    svg.append(path);
  }
  return svg;
}

function glyph(value) {
  const details = DETAILS[value];
  const node = element('span', 'orbit-select-glyph');
  node.setAttribute('aria-hidden', 'true');
  if (details) node.append(vector(details.icon));
  else node.textContent = value.slice(0, 1);
  return node;
}

/** Enhance a single native select while preserving its value and form events. */
export function enhanceSelect(select, { kind = 'network' } = {}) {
  if (!select || select.tagName !== 'SELECT' || select.multiple) return null;
  if (instances.has(select)) return instances.get(select);
  kind = kind === 'asset' ? 'asset' : 'network';
  const id = `orbit-select-${++nextId}`;
  const original = { tabIndex: select.getAttribute('tabindex'), ariaHidden: select.getAttribute('aria-hidden') };
  const labels = Array.from(select.labels || []);
  const labelState = labels.map((label, index) => ({
    label, id: label.getAttribute('id'), for: label.getAttribute('for'), generatedId: `${id}-label-${index}`,
  }));
  const wrapper = element('span', `orbit-select orbit-select--${kind}`);
  const trigger = element('button', 'orbit-select-trigger');
  const valueNode = element('span', 'orbit-select-value');
  valueNode.id = `${id}-value`;
  trigger.type = 'button';
  trigger.id = `${id}-trigger`;
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', `${id}-listbox`);
  const chevron = element('span', 'orbit-select-chevron');
  chevron.append(vector('chevron'));
  trigger.append(valueNode, chevron);
  select.before(wrapper);
  wrapper.append(select, trigger);
  select.classList.add('orbit-select-native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');

  const popover = element('div', `orbit-select-popover orbit-select-popover--${kind}`);
  popover.hidden = true;
  const header = element('div', 'orbit-select-heading', kind === 'asset' ? 'CHOOSE YOUR ASSET' : 'CHOOSE YOUR NETWORK');
  header.setAttribute('aria-hidden', 'true');
  const listbox = element('div', 'orbit-select-listbox');
  listbox.id = `${id}-listbox`;
  listbox.setAttribute('role', 'listbox');
  listbox.tabIndex = -1;
  popover.append(header, listbox);
  document.body.append(popover);
  labelState.forEach(({ label, generatedId }) => {
    if (!label.id) label.id = generatedId;
    label.htmlFor = trigger.id;
  });
  const labelIds = labels.map(label => label.id).join(' ');
  if (labelIds) {
    trigger.setAttribute('aria-labelledby', `${labelIds} ${valueNode.id}`);
    listbox.setAttribute('aria-labelledby', labelIds);
  } else {
    const label = select.getAttribute('aria-label') || (kind === 'asset' ? 'Asset' : 'Network');
    trigger.setAttribute('aria-label', label);
    listbox.setAttribute('aria-label', label);
  }
  if (select.hasAttribute('aria-describedby')) trigger.setAttribute('aria-describedby', select.getAttribute('aria-describedby'));

  let rows = [];
  let activeIndex = -1;
  let isOpen = false;
  let destroyed = false;
  let typeahead = '';
  let typeaheadTimer;
  let repositionFrame;
  const cleanups = [];
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };
  const unavailable = () => select.matches(':disabled');
  const isEnabled = index => Boolean(rows[index] && !rows[index].disabled && !rows[index].hidden);
  const firstEnabled = () => rows.findIndex((_, index) => isEnabled(index));
  const lastEnabled = () => rows.findLastIndex((_, index) => isEnabled(index));

  function markActive(index, scroll = true) {
    activeIndex = isEnabled(index) ? index : firstEnabled();
    rows.forEach((row, rowIndex) => row.node.classList.toggle('orbit-select-option--active', rowIndex === activeIndex));
    if (activeIndex < 0) { listbox.removeAttribute('aria-activedescendant'); return; }
    const node = rows[activeIndex].node;
    listbox.setAttribute('aria-activedescendant', node.id);
    if (scroll && isOpen) {
      const top = node.offsetTop;
      if (top < listbox.scrollTop) listbox.scrollTop = top;
      else if (top + node.offsetHeight > listbox.scrollTop + listbox.clientHeight) listbox.scrollTop = top + node.offsetHeight - listbox.clientHeight;
    }
  }

  function position() {
    if (!isOpen) return;
    const rect = trigger.getBoundingClientRect();
    if (!trigger.isConnected || !trigger.getClientRects().length) { close(); return; }
    const viewport = window.visualViewport;
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    const viewportLeft = viewport?.offsetLeft || 0;
    const viewportTop = viewport?.offsetTop || 0;
    const margin = 12, gap = 8;
    if (rect.bottom < viewportTop || rect.top > viewportTop + height) { close(); return; }
    const popoverWidth = Math.min(rect.width, Math.max(0, width - margin * 2));
    popover.style.width = `${popoverWidth}px`;
    const left = Math.max(viewportLeft + margin, Math.min(rect.right - popoverWidth, viewportLeft + width - popoverWidth - margin));
    const below = Math.max(0, viewportTop + height - rect.bottom - gap - margin);
    const above = Math.max(0, rect.top - viewportTop - gap - margin);
    const desiredHeight = header.offsetHeight + listbox.scrollHeight + 10;
    const upwards = below < desiredHeight && above > below;
    const availableHeight = upwards ? above : below;
    popover.style.maxHeight = `${availableHeight}px`;
    listbox.style.maxHeight = `${Math.max(0, availableHeight - header.offsetHeight - 10)}px`;
    popover.style.left = `${left}px`;
    const actualHeight = Math.min(popover.offsetHeight, availableHeight);
    popover.style.top = `${upwards ? rect.top - gap - actualHeight : rect.bottom + gap}px`;
    popover.dataset.side = upwards ? 'top' : 'bottom';
  }

  function schedulePosition(event) {
    if (!isOpen || (event?.target instanceof Node && popover.contains(event.target))) return;
    cancelAnimationFrame(repositionFrame);
    repositionFrame = requestAnimationFrame(position);
  }

  function close(restoreFocus = false) {
    if (!isOpen) return;
    isOpen = false;
    popover.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    wrapper.classList.remove('orbit-select--open');
    clearTimeout(typeaheadTimer);
    typeahead = '';
    if (openSelect === api) openSelect = null;
    if (restoreFocus && !unavailable()) trigger.focus({ preventScroll: true });
  }

  function open(index = select.selectedIndex) {
    if (destroyed || unavailable()) return;
    if (openSelect && openSelect !== api) openSelect.close();
    sync();
    if (firstEnabled() < 0) return;
    isOpen = true;
    openSelect = api;
    popover.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    wrapper.classList.add('orbit-select--open');
    position();
    markActive(index);
    listbox.focus({ preventScroll: true });
  }

  function choose(index) {
    if (!isEnabled(index) || unavailable()) return;
    const changed = select.selectedIndex !== index;
    select.selectedIndex = index;
    sync();
    close(true);
    if (changed) {
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function sync() {
    if (destroyed) return;
    const oldActive = activeIndex;
    listbox.replaceChildren();
    rows = Array.from(select.options, (option, index) => {
      const title = option.label || option.text;
      const details = DETAILS[option.value] || DETAILS[title];
      const node = element('div', 'orbit-select-option');
      node.id = `${id}-option-${index}`;
      node.dataset.index = String(index);
      node.setAttribute('role', 'option');
      node.setAttribute('aria-selected', String(option.selected));
      node.hidden = option.selected;
      const disabled = option.disabled || (option.parentElement?.tagName === 'OPTGROUP' && option.parentElement.disabled);
      if (disabled) node.setAttribute('aria-disabled', 'true');
      const copy = element('span', 'orbit-select-option-copy');
      copy.append(element('span', 'orbit-select-option-title', title));
      if (details) copy.append(element('span', 'orbit-select-option-subtitle', details.name));
      const check = element('span', 'orbit-select-check');
      check.append(vector('check'));
      node.append(glyph(option.value), copy, check);
      listbox.append(node);
      return { node, disabled, hidden: option.selected };
    });
    const selected = select.options[select.selectedIndex];
    valueNode.replaceChildren();
    if (selected) valueNode.append(glyph(selected.value), element('span', 'orbit-select-value-text', selected.label || selected.text));
    else valueNode.append(element('span', 'orbit-select-value-text', 'Select'));
    trigger.disabled = unavailable();
    trigger.setAttribute('aria-disabled', String(trigger.disabled));
    if (select.hasAttribute('aria-invalid')) trigger.setAttribute('aria-invalid', select.getAttribute('aria-invalid'));
    else trigger.removeAttribute('aria-invalid');
    if (trigger.disabled) close();
    markActive(isOpen ? oldActive : select.selectedIndex, false);
    if (isOpen) position();
  }

  function move(direction) {
    for (let index = activeIndex + direction; index >= 0 && index < rows.length; index += direction) {
      if (isEnabled(index)) { markActive(index); return; }
    }
  }

  function search(character) {
    clearTimeout(typeaheadTimer);
    typeahead += character.toLocaleLowerCase();
    const query = Array.from(typeahead).every(letter => letter === typeahead[0]) ? typeahead[0] : typeahead;
    const start = query.length === 1 ? activeIndex + 1 : activeIndex;
    for (let offset = 0; offset < rows.length; offset++) {
      const index = (Math.max(0, start) + offset) % rows.length;
      if (isEnabled(index) && select.options[index].label.toLocaleLowerCase().startsWith(query)) { markActive(index); break; }
    }
    typeaheadTimer = setTimeout(() => { typeahead = ''; }, 700);
  }

  function exitWithTab(event) {
    // The portal sits at the end of body; continue from the trigger's form order.
    const candidates = Array.from(document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]'))
      .filter(node => node.tabIndex >= 0 && !node.matches(':disabled') && !node.closest('[inert], [hidden]') && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
    const next = candidates[candidates.indexOf(trigger) + (event.shiftKey ? -1 : 1)];
    close(true);
    if (next) { event.preventDefault(); next.focus(); }
  }

  listen(trigger, 'click', () => { if (isOpen) close(true); else open(); });
  listen(trigger, 'keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      open(event.key === 'ArrowUp' || event.key === 'End' ? lastEnabled() : firstEnabled());
    } else if (event.key.length === 1 && event.key !== ' ' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault(); open(); search(event.key);
    }
  });
  listen(listbox, 'keydown', event => {
    if (event.key === 'Tab') { exitWithTab(event); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)) event.preventDefault();
    if (event.key === 'ArrowDown') move(1);
    else if (event.key === 'ArrowUp') move(-1);
    else if (event.key === 'Home') markActive(firstEnabled());
    else if (event.key === 'End') markActive(lastEnabled());
    else if (event.key === 'Enter' || event.key === ' ') choose(activeIndex);
    else if (event.key === 'Escape') { event.stopPropagation(); close(true); }
    else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); search(event.key); }
  });
  listen(listbox, 'pointermove', event => {
    if (event.pointerType === 'touch') return;
    const row = event.target.closest('.orbit-select-option');
    if (row && isEnabled(Number(row.dataset.index))) markActive(Number(row.dataset.index), false);
  });
  listen(listbox, 'click', event => {
    const row = event.target.closest('.orbit-select-option');
    if (row) choose(Number(row.dataset.index));
  });
  listen(document, 'pointerdown', event => {
    if (isOpen && !wrapper.contains(event.target) && !popover.contains(event.target)) close();
  });
  listen(document, 'focusin', event => {
    if (isOpen && !wrapper.contains(event.target) && !popover.contains(event.target)) close();
  });
  listen(select, 'input', sync);
  listen(select, 'change', sync);
  listen(window, 'resize', schedulePosition);
  listen(window, 'scroll', schedulePosition, true);
  if (window.visualViewport) {
    listen(window.visualViewport, 'resize', schedulePosition);
    listen(window.visualViewport, 'scroll', schedulePosition);
  }
  if (select.form) listen(select.form, 'reset', () => queueMicrotask(sync));
  const observer = new MutationObserver(sync);
  observer.observe(select, { attributes: true, attributeFilter: ['disabled', 'selected', 'label', 'value', 'aria-invalid'], childList: true, characterData: true, subtree: true });
  const fieldset = select.closest('fieldset');
  if (fieldset) observer.observe(fieldset, { attributes: true, attributeFilter: ['disabled'] });

  const api = {
    sync,
    close,
    destroy() {
      close();
      destroyed = true;
      observer.disconnect();
      cleanups.forEach(cleanup => cleanup());
      clearTimeout(typeaheadTimer);
      cancelAnimationFrame(repositionFrame);
      wrapper.before(select);
      wrapper.remove();
      popover.remove();
      select.classList.remove('orbit-select-native');
      for (const [attribute, value] of [['tabindex', original.tabIndex], ['aria-hidden', original.ariaHidden]]) {
        if (value === null) select.removeAttribute(attribute); else select.setAttribute(attribute, value);
      }
      labelState.forEach(({ label, id: oldId, for: oldFor }) => {
        if (oldId === null) label.removeAttribute('id'); else label.id = oldId;
        if (oldFor === null) label.removeAttribute('for'); else label.setAttribute('for', oldFor);
      });
      instances.delete(select);
    },
  };
  instances.set(select, api);
  sync();
  return api;
}
