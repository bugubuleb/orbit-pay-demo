/** Small, finite responses. Leaving a control never cuts its motion mid-turn. */
export function initHoverEffects() {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Set();
  const running = new WeakSet();
  const listeners = [];

  function play(target, keyframes, duration) {
    if (!target || motion.matches || running.has(target) || !target.animate) return;
    running.add(target);
    const animation = target.animate(keyframes, { duration, easing: 'cubic-bezier(.22,.75,.2,1)', iterations: 1 });
    active.add(animation);
    const finish = () => { active.delete(animation); running.delete(target); };
    animation.addEventListener('finish', finish, { once: true });
    animation.addEventListener('cancel', finish, { once: true });
  }

  function bind(element, event, listener) {
    if (!element) return;
    element.addEventListener(event, listener);
    listeners.push(() => element.removeEventListener(event, listener));
  }
  function hover(element, action, focusElement = element) {
    bind(element, 'pointerenter', event => { if (event.pointerType !== 'touch') action(); });
    bind(focusElement, 'focus', () => { if (focusElement.matches(':focus-visible')) action(); });
  }

  const brand = document.querySelector('.header .brand');
  hover(brand, () => play(brand.querySelector('.orbit-mark'), [
    { transform: 'rotate(-35deg)' }, { transform: 'rotate(325deg)' }
  ], 1300));

  const plus = document.querySelector('.earn-method-mark');
  hover(plus, () => play(plus, [{ transform: 'rotate(-180deg)' }, { transform: 'rotate(0deg)' }], 750), document.querySelector('.earn-method summary'));

  const copy = document.querySelector('#copy-code');
  hover(copy, () => {
    play(copy.querySelector('.copy-back'), [
      { transform: 'translate(0, 0)' }, { transform: 'translate(-1.5px, -1.5px)', offset: .45 }, { transform: 'translate(0, 0)' }
    ], 650);
    play(copy.querySelector('.copy-front'), [
      { transform: 'translate(0, 0)' }, { transform: 'translate(1.5px, 1.5px)', offset: .45 }, { transform: 'translate(0, 0)' }
    ], 650);
  });

  function stop() { for (const animation of [...active]) animation.cancel(); }
  function onMotionChange() { if (motion.matches) stop(); }
  motion.addEventListener('change', onMotionChange);
  return { destroy() { stop(); listeners.forEach(remove => remove()); motion.removeEventListener('change', onMotionChange); } };
}
