// ORBIT ARCADE — self-contained games. The engines also run without a DOM.
const DIRECTIONS = Object.freeze({ up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] });

export class SnakeEngine {
  constructor({ cols = 30, rows = 18, random = Math.random } = {}) {
    this.cols = cols;
    this.rows = rows;
    this.random = random;
    this.reset();
  }
  reset() {
    const x = Math.floor(this.cols / 3), y = Math.floor(this.rows / 2);
    this.snake = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }];
    this.direction = 'right';
    this.pending = [];
    this.score = 0;
    this.status = 'ready';
    this.food = this.placeFood();
    return this;
  }
  get level() { return Math.floor(this.score / 50) + 1; }
  get interval() { return Math.max(65, 142 - (this.level - 1) * 10); }
  start() {
    if (this.status === 'over' || this.status === 'won') this.reset();
    this.status = 'playing';
  }
  turn(direction) {
    if (this.status !== 'playing' || !DIRECTIONS[direction] || this.pending.length >= 2) return false;
    const previous = DIRECTIONS[this.pending.at(-1) || this.direction];
    const next = DIRECTIONS[direction];
    if ((previous[0] === next[0] && previous[1] === next[1]) || (previous[0] === -next[0] && previous[1] === -next[1])) return false;
    this.pending.push(direction);
    return true;
  }
  placeFood() {
    const occupied = new Set(this.snake.map(({ x, y }) => y * this.cols + x));
    const free = [];
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      if (!occupied.has(y * this.cols + x)) free.push({ x, y });
    }
    return free.length ? free[Math.min(free.length - 1, Math.floor(this.random() * free.length))] : null;
  }
  tick() {
    if (this.status !== 'playing') return;
    this.direction = this.pending.shift() || this.direction;
    const [dx, dy] = DIRECTIONS[this.direction];
    const head = { x: this.snake[0].x + dx, y: this.snake[0].y + dy };
    const eating = this.food && head.x === this.food.x && head.y === this.food.y;
    const body = eating ? this.snake : this.snake.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= this.cols || head.y >= this.rows || body.some(p => p.x === head.x && p.y === head.y)) {
      this.status = 'over';
      return;
    }
    this.snake.unshift(head);
    if (eating) {
      this.score += 10;
      this.food = this.placeFood();
      if (!this.food) this.status = 'won';
    } else this.snake.pop();
  }
}

export const TETROMINOES = Object.freeze({
  I: { color: '#c1ff72', matrix: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  J: { color: '#55c997', matrix: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { color: '#e5d77e', matrix: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
  O: { color: '#d7f5b1', matrix: [[1, 1], [1, 1]] },
  S: { color: '#82e64b', matrix: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  T: { color: '#b69de7', matrix: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  Z: { color: '#7cb8b5', matrix: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] }
});

export class TetrisEngine {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.cols = 10;
    this.rows = 20;
    this.reset();
  }
  reset() {
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    this.bag = [];
    this.score = 0;
    this.lines = 0;
    this.status = 'ready';
    this.next = this.takeFromBag();
    this.spawn();
    return this;
  }
  get level() { return Math.floor(this.lines / 10) + 1; }
  get interval() { return Math.max(90, 720 * Math.pow(0.82, this.level - 1)); }
  takeFromBag() {
    if (!this.bag.length) {
      this.bag = Object.keys(TETROMINOES);
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.min(i, Math.floor(this.random() * (i + 1)));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop();
  }
  spawn() {
    const type = this.next;
    const matrix = TETROMINOES[type].matrix.map(row => [...row]);
    this.active = { type, matrix, x: Math.floor((this.cols - matrix.length) / 2), y: 0 };
    this.next = this.takeFromBag();
    if (this.collides(this.active.x, this.active.y, matrix)) this.status = 'over';
  }
  start() {
    if (this.status === 'over') this.reset();
    this.status = 'playing';
  }
  collides(x, y, matrix = this.active.matrix) {
    return matrix.some((row, dy) => row.some((cell, dx) => cell && (
      x + dx < 0 || x + dx >= this.cols || y + dy >= this.rows || (y + dy >= 0 && this.board[y + dy][x + dx])
    )));
  }
  move(dx) {
    if (this.status !== 'playing' || this.collides(this.active.x + dx, this.active.y)) return false;
    this.active.x += dx;
    return true;
  }
  rotate() {
    if (this.status !== 'playing') return false;
    const matrix = this.active.matrix[0].map((_, x) => this.active.matrix.map(row => row[x]).reverse());
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1], [0, -2]]) {
      if (!this.collides(this.active.x + dx, this.active.y + dy, matrix)) {
        Object.assign(this.active, { matrix, x: this.active.x + dx, y: this.active.y + dy });
        return true;
      }
    }
    return false;
  }
  tick(soft = false) {
    if (this.status !== 'playing') return false;
    if (this.collides(this.active.x, this.active.y + 1)) {
      this.lock();
      return false;
    }
    this.active.y++;
    if (soft) this.score++;
    return true;
  }
  ghostY() {
    let y = this.active.y;
    while (!this.collides(this.active.x, y + 1)) y++;
    return y;
  }
  hardDrop() {
    if (this.status !== 'playing') return;
    const y = this.ghostY();
    this.score += (y - this.active.y) * 2;
    this.active.y = y;
    this.lock();
  }
  lock() {
    let overflow = false;
    this.active.matrix.forEach((row, dy) => row.forEach((cell, dx) => {
      if (!cell) return;
      const y = this.active.y + dy;
      if (y < 0) overflow = true;
      else this.board[y][this.active.x + dx] = this.active.type;
    }));
    if (overflow) { this.status = 'over'; return; }
    const remaining = this.board.filter(row => row.some(cell => !cell));
    const cleared = this.rows - remaining.length;
    this.score += [0, 100, 300, 500, 800][cleared] * this.level;
    this.lines += cleared;
    this.board = [...Array.from({ length: cleared }, () => Array(this.cols).fill(null)), ...remaining];
    this.spawn();
  }
}

const WIDTH = 660, HEIGHT = 420;
const instances = new WeakMap();
let instanceCount = 0;
const COPY = {
  snake: { title: 'SNAKE', subtitle: 'Follow the signal.', intro: 'Collect energy. Grow your orbit. Keep moving.', controls: 'ARROWS / WASD · MOVE', detail: 'SPACE / P · PAUSE', metric: 'LEVEL' },
  tetris: { title: 'TETRIS', subtitle: 'Find your flow.', intro: 'Build clean lines. Clear the noise. Go again.', controls: '← → · MOVE  /  ↑ · ROTATE', detail: '↓ · SOFT DROP  /  SPACE · DROP  /  P · PAUSE', metric: 'LINES' }
};

export function initArcade(root) {
  if (!root) throw new Error('ORBIT ARCADE needs a root element.');
  if (instances.has(root)) return instances.get(root);
  root.classList.add('orbit-arcade');
  root.tabIndex = 0;
  root.setAttribute('aria-label', 'Orbit Arcade game controls');
  const instanceId = `orbit-arcade-${++instanceCount}`;
  root.innerHTML = `
    <div class="oa-topline"><span class="oa-kicker"><span class="oa-signal" aria-hidden="true"></span> ORBIT ARCADE</span><span class="oa-session">SYSTEM READY</span></div>
    <div class="oa-heading"><div class="oa-tabs" role="tablist" aria-label="Choose arcade game"><button id="${instanceId}-snake" type="button" role="tab" aria-controls="${instanceId}-panel" aria-selected="true" tabindex="0" data-game="snake"><span>01</span> SNAKE</button><button id="${instanceId}-tetris" type="button" role="tab" aria-controls="${instanceId}-panel" aria-selected="false" tabindex="-1" data-game="tetris"><span>02</span> TETRIS</button></div><span class="oa-free">NO GAS. JUST PLAY.</span></div>
    <div class="oa-panel" id="${instanceId}-panel" role="tabpanel" aria-labelledby="${instanceId}-snake">
    <div class="oa-dashboard"><p class="oa-subtitle">Follow the signal.</p><div class="oa-stats"><div><span>SCORE</span><strong data-stat="score">0000</strong></div><div><span>BEST</span><strong data-stat="best">0000</strong></div><div><span data-label="metric">LEVEL</span><strong data-stat="metric">01</strong></div></div></div>
    <div class="oa-stage"><canvas width="660" height="420" aria-label="Snake game board. Use arrow keys or WASD to move." role="img"></canvas><div class="oa-overlay"><span class="oa-overlay-tag">[ TAKE A LITTLE BREAK ]</span><h3>SNAKE</h3><p>Collect energy. Grow your orbit. Keep moving.</p><button class="oa-overlay-start" type="button">START GAME <span aria-hidden="true">↗</span></button><span class="oa-overlay-hint">YOUR HIGH SCORE STAYS WITH YOU</span></div><div class="oa-stage-corner" aria-hidden="true">ORBIT_OS / V.01</div></div>
    <div class="oa-gamebar"><div class="oa-actions"><button type="button" class="oa-primary" data-action="toggle"><span aria-hidden="true">▶</span> START</button><button type="button" class="oa-restart" data-action="restart" aria-label="Restart game">↻ <span>RESTART</span></button></div><div class="oa-touch" aria-label="Touch game controls"><button type="button" data-control="left" aria-label="Move left">←</button><button type="button" data-control="up" aria-label="Move up">↑</button><button type="button" data-control="down" aria-label="Move down">↓</button><button type="button" data-control="right" aria-label="Move right">→</button><button type="button" data-control="drop" aria-label="Hard drop" hidden>DROP ↓</button></div></div>
    <div class="oa-instructions"><span data-help="main">ARROWS / WASD · MOVE</span><span data-help="extra">SPACE / P · PAUSE</span></div>
    </div>
    <span class="oa-sr-only" role="status" aria-live="polite" aria-atomic="true"></span>`;
  const q = selector => root.querySelector(selector);
  const canvas = q('canvas'), context = canvas.getContext('2d');
  const engines = { snake: new SnakeEngine(), tetris: new TetrisEngine() };
  let game = 'snake', frameId = 0, lastTime = 0, elapsed = 0, destroyed = false;
  let renderedSignature = '', viewWidth = WIDTH, viewHeight = HEIGHT, narrowTetris = false;
  let holdTimeout = 0, holdInterval = 0, touchOrigin = null;
  let best = { snake: 0, tetris: 0 }, persisted = { snake: 0, tetris: 0 };
  try {
    for (const name of Object.keys(best)) {
      const value = Number(localStorage.getItem(`orbit.arcade.${name}.best`));
      best[name] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
      persisted[name] = best[name];
    }
  } catch { /* Private browsing may disable storage. Games still work. */ }
  const bestBeforeRun = { ...best };
  const engine = () => engines[game];
  const focus = () => root.focus({ preventScroll: true });
  const announce = text => { q('[role="status"]').textContent = text; };
  const format = value => String(value).padStart(4, '0');

  function saveBest() {
    if (best[game] <= persisted[game]) return;
    try { localStorage.setItem(`orbit.arcade.${game}.best`, String(best[game])); persisted[game] = best[game]; } catch { /* Optional persistence. */ }
  }
  function sync() {
    const current = engine(), copy = COPY[game], over = ['over', 'won'].includes(current.status);
    best[game] = Math.max(best[game], current.score);
    const signature = [game, current.status, current.score, best[game], current.level, current.lines].join('|');
    if (signature === renderedSignature) return;
    renderedSignature = signature;
    q('[data-stat="score"]').textContent = format(current.score);
    q('[data-stat="best"]').textContent = format(best[game]);
    q('[data-stat="metric"]').textContent = String(game === 'snake' ? current.level : current.lines).padStart(2, '0');
    q('[data-label="metric"]').textContent = copy.metric;
    q('.oa-session').textContent = current.status === 'playing' ? 'SESSION LIVE' : current.status === 'paused' ? 'ON STANDBY' : over ? 'SESSION COMPLETE' : 'SYSTEM READY';
    root.dataset.state = current.status;
    const toggle = q('[data-action="toggle"]');
    toggle.innerHTML = current.status === 'playing' ? '<span aria-hidden="true">Ⅱ</span> PAUSE' : current.status === 'paused' ? '<span aria-hidden="true">▶</span> RESUME' : '<span aria-hidden="true">▶</span> START';
    const overlay = q('.oa-overlay');
    overlay.hidden = current.status === 'playing';
    if (!overlay.hidden) {
      q('.oa-overlay-tag').textContent = over ? '[ EVERY RUN IS A NEW ORBIT ]' : current.status === 'paused' ? '[ HOLDING YOUR PLACE ]' : '[ TAKE A LITTLE BREAK ]';
      q('.oa-overlay h3').textContent = current.status === 'won' ? 'ALL CLEAR' : over ? 'GAME OVER' : current.status === 'paused' ? 'PAUSED' : copy.title;
      q('.oa-overlay p').textContent = over ? `Final score: ${format(current.score)}. Ready for another orbit?` : current.status === 'paused' ? 'Catch your breath. Your game will be right here.' : copy.intro;
      q('.oa-overlay-start').innerHTML = `${current.status === 'paused' ? 'RESUME GAME' : over ? 'PLAY AGAIN' : 'START GAME'} <span aria-hidden="true">↗</span>`;
      q('.oa-overlay-hint').textContent = over && current.score > bestBeforeRun[game] ? 'A NEW PERSONAL BEST. NICE WORK.' : 'YOUR HIGH SCORE STAYS WITH YOU';
      saveBest();
    }
  }
  function stopLoop() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    lastTime = 0;
    elapsed = 0;
  }
  function frame(time) {
    if (destroyed || engine().status !== 'playing') { frameId = 0; return; }
    if (lastTime) elapsed += Math.min(time - lastTime, 250);
    lastTime = time;
    const current = engine();
    let steps = 0;
    let advanced = false;
    while (elapsed >= current.interval && current.status === 'playing' && steps++ < 5) {
      elapsed -= current.interval;
      current.tick();
      advanced = true;
    }
    if (advanced) { sync(); render(); }
    if (current.status === 'playing') frameId = requestAnimationFrame(frame);
    else { frameId = 0; saveBest(); announce(`Game over. Score ${current.score}. Best ${best[game]}.`); }
  }
  function begin() {
    stopLoop();
    if (engine().status !== 'paused') bestBeforeRun[game] = best[game];
    engine().start();
    sync(); render(); focus();
    announce(`${COPY[game].title} started. ${game === 'snake' ? 'Arrow keys or W A S D to move. Space to pause.' : 'Arrow keys to move. Up to rotate. Space to drop. P to pause.'}`);
    frameId = requestAnimationFrame(frame);
  }
  function pause() {
    clearHold();
    if (engine().status !== 'playing') return;
    engine().status = 'paused';
    stopLoop(); sync(); render(); saveBest();
    announce('Game paused. Select Resume to continue.');
  }
  function toggle() { if (engine().status === 'playing') pause(); else begin(); }
  function restart() { saveBest(); engine().reset(); begin(); }
  function switchGame(name) {
    if (!engines[name] || name === game) return;
    pause(); saveBest(); game = name;
    root.querySelectorAll('[data-game]').forEach(tab => {
      const selected = tab.dataset.game === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    const copy = COPY[name];
    q('[role="tabpanel"]').setAttribute('aria-labelledby', `${instanceId}-${name}`);
    q('.oa-subtitle').textContent = copy.subtitle;
    q('[data-help="main"]').textContent = copy.controls;
    q('[data-help="extra"]').textContent = copy.detail;
    q('[data-control="drop"]').hidden = name !== 'tetris';
    q('[data-control="up"]').textContent = name === 'tetris' ? '↻' : '↑';
    q('[data-control="up"]').setAttribute('aria-label', name === 'tetris' ? 'Rotate clockwise' : 'Move up');
    q('[data-control="down"]').setAttribute('aria-label', name === 'tetris' ? 'Soft drop' : 'Move down');
    canvas.setAttribute('aria-label', name === 'snake' ? 'Snake game board. Use arrow keys or WASD to move.' : 'Tetris game board. Left and right move, up rotates, down soft drops, space hard drops.');
    fitCanvas(); sync(); render(); announce(`${copy.title} selected.`);
  }
  function act(direction) {
    const current = engine();
    if (current.status !== 'playing') return;
    if (game === 'snake') current.turn(direction);
    else if (direction === 'left') current.move(-1);
    else if (direction === 'right') current.move(1);
    else if (direction === 'up') current.rotate();
    else if (direction === 'down') current.tick(true);
    else if (direction === 'drop') current.hardDrop();
    sync(); render();
    if (current.status === 'over') { stopLoop(); announce(`Game over. Score ${current.score}.`); }
  }

  function block(x, y, size, color, ghost = false) {
    if (ghost) {
      context.strokeStyle = '#91bd675c';
      context.lineWidth = 1;
      context.strokeRect(x + 2.5, y + 2.5, size - 5, size - 5);
      return;
    }
    context.fillStyle = color;
    context.fillRect(x + 1, y + 1, size - 2, size - 2);
    context.fillStyle = '#ffffff24';
    context.fillRect(x + 3, y + 3, size - 6, 2);
    context.fillStyle = '#00000020';
    context.fillRect(x + 3, y + size - 4, size - 6, 2);
  }
  function drawGrid(x, y, cols, rows, cell) {
    context.fillStyle = '#0a120c'; context.fillRect(x, y, cols * cell, rows * cell);
    context.strokeStyle = '#bddba009'; context.lineWidth = 1;
    context.beginPath();
    for (let i = 0; i <= cols; i++) { context.moveTo(x + i * cell + .5, y); context.lineTo(x + i * cell + .5, y + rows * cell); }
    for (let i = 0; i <= rows; i++) { context.moveTo(x, y + i * cell + .5); context.lineTo(x + cols * cell, y + i * cell + .5); }
    context.stroke();
    context.strokeStyle = '#b9e49729'; context.strokeRect(x + .5, y + .5, cols * cell, rows * cell);
  }
  function render() {
    if (!context) return;
    context.clearRect(0, 0, viewWidth, viewHeight);
    context.fillStyle = '#080d09'; context.fillRect(0, 0, viewWidth, viewHeight);
    const current = engine();
    if (game === 'snake') {
      const x = 30, y = 30, cell = 20;
      drawGrid(x, y, current.cols, current.rows, cell);
      if (current.food) {
        const fx = x + current.food.x * cell + cell / 2, fy = y + current.food.y * cell + cell / 2;
        context.save(); context.translate(fx, fy); context.rotate(Math.PI / 4);
        context.shadowColor = '#c1ff72'; context.shadowBlur = 12;
        context.fillStyle = '#e3ffb4'; context.fillRect(-5, -5, 10, 10); context.restore();
      }
      current.snake.forEach((part, i) => {
        block(x + part.x * cell, y + part.y * cell, cell, i === 0 ? '#c1ff72' : `hsl(99 68% ${Math.max(32, 62 - i * 1.5)}%)`);
        if (i === 0) {
          const [dx, dy] = DIRECTIONS[current.direction];
          context.fillStyle = '#0a1708';
          const cx = x + part.x * cell + 9, cy = y + part.y * cell + 9;
          if (dx) { context.fillRect(cx + dx * 4, cy - 4, 2, 2); context.fillRect(cx + dx * 4, cy + 3, 2, 2); }
          else { context.fillRect(cx - 4, cy + dy * 4, 2, 2); context.fillRect(cx + 3, cy + dy * 4, 2, 2); }
        }
      });
    } else {
      const x = narrowTetris ? 20 : 230, y = narrowTetris ? 20 : 30, cell = narrowTetris ? 22 : 18;
      drawGrid(x, y, current.cols, current.rows, cell);
      current.board.forEach((row, rowIndex) => row.forEach((type, colIndex) => { if (type) block(x + colIndex * cell, y + rowIndex * cell, cell, TETROMINOES[type].color); }));
      const piece = current.active, ghost = current.ghostY();
      for (const [pieceY, isGhost] of [[ghost, true], [piece.y, false]]) {
        piece.matrix.forEach((row, dy) => row.forEach((occupied, dx) => {
          if (occupied && pieceY + dy >= 0) block(x + (piece.x + dx) * cell, y + (pieceY + dy) * cell, cell, TETROMINOES[piece.type].color, isGhost);
        }));
      }
      const sideX = narrowTetris ? 262 : 450;
      context.font = `${narrowTetris ? 9 : 11}px ui-monospace, monospace`; context.fillStyle = '#6b826d';
      context.fillText(narrowTetris ? 'NEXT' : 'NEXT IN ORBIT', sideX, 53);
      const next = TETROMINOES[current.next];
      const nextCell = narrowTetris ? 18 : 21;
      next.matrix.forEach((row, dy) => row.forEach((occupied, dx) => { if (occupied) block(sideX + dx * nextCell, 73 + dy * nextCell, nextCell, next.color); }));
      context.fillStyle = '#6b826d'; context.fillText('LEVEL', sideX, 184);
      context.font = '28px ui-monospace, monospace'; context.fillStyle = '#c1ff72'; context.fillText(String(current.level).padStart(2, '0'), sideX, 219);
      if (!narrowTetris) {
        context.font = '11px ui-monospace, monospace'; context.fillStyle = '#6b826d';
        context.fillText('STACK.', 50, 57); context.fillText('CLEAR.', 50, 77); context.fillText('REPEAT.', 50, 97);
        context.strokeStyle = '#244129'; context.beginPath(); context.moveTo(50, 120); context.lineTo(180, 120); context.stroke();
        context.fillStyle = '#47654c'; context.fillText('ONE MORE LINE_', 50, 145);
      }
    }
  }
  function fitCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    narrowTetris = game === 'tetris' && (canvas.clientWidth || root.clientWidth) < 500;
    viewWidth = narrowTetris ? 360 : WIDTH;
    viewHeight = narrowTetris ? 480 : HEIGHT;
    if (canvas.width === viewWidth * ratio && canvas.height === viewHeight * ratio) return;
    canvas.style.aspectRatio = `${viewWidth} / ${viewHeight}`;
    canvas.width = viewWidth * ratio; canvas.height = viewHeight * ratio;
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    render();
  }
  function clearHold() { clearTimeout(holdTimeout); clearInterval(holdInterval); holdTimeout = holdInterval = 0; }
  function onClick(event) {
    const tab = event.target.closest('[data-game]');
    if (tab) { switchGame(tab.dataset.game); return; }
    const control = event.target.closest('[data-control]');
    if (control && event.detail === 0) { act(control.dataset.control); return; }
    if (event.target.closest('[data-action="toggle"], .oa-overlay-start')) toggle();
    if (event.target.closest('[data-action="restart"]')) restart();
  }
  function onKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    const tab = event.target.closest('[role="tab"]');
    if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const name = event.key === 'Home' ? 'snake' : event.key === 'End' ? 'tetris' : game === 'snake' ? 'tetris' : 'snake';
      switchGame(name); q(`[data-game="${name}"]`).focus(); return;
    }
    if ((event.code === 'Space' || event.key === 'Enter') && event.target.closest('button')) return;
    const direction = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left', w: 'up', W: 'up', d: 'right', D: 'right', s: 'down', S: 'down', a: 'left', A: 'left' }[event.key];
    if (direction && engine().status === 'playing') { event.preventDefault(); act(direction); }
    else if (event.key.toLowerCase() === 'p' || event.code === 'Space') {
      event.preventDefault();
      if (event.repeat) return;
      if (event.code === 'Space' && game === 'tetris' && engine().status === 'playing') act('drop');
      else toggle();
    } else if (event.key === 'Escape' && engine().status === 'playing') { event.preventDefault(); pause(); }
  }
  function onPointerDown(event) {
    const control = event.target.closest('[data-control]');
    if (control) {
      event.preventDefault(); clearHold(); focus();
      const direction = control.dataset.control;
      act(direction);
      if (game === 'tetris' && ['left', 'right', 'down'].includes(direction)) {
        holdTimeout = window.setTimeout(() => { holdInterval = window.setInterval(() => act(direction), 85); }, 230);
      }
    } else if (event.target === canvas) {
      focus();
      if (event.pointerType !== 'mouse') touchOrigin = { x: event.clientX, y: event.clientY, id: event.pointerId };
    }
  }
  function onPointerMove(event) {
    if (!touchOrigin || event.pointerId !== touchOrigin.id || engine().status !== 'playing') return;
    const dx = event.clientX - touchOrigin.x, dy = event.clientY - touchOrigin.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    act(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
    touchOrigin = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }
  function onPointerUp() { clearHold(); touchOrigin = null; }
  function onVisibility() { if (document.hidden) pause(); }
  function onFocusOut(event) { if (!root.contains(event.relatedTarget)) pause(); }
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('focusout', onFocusOut);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('blur', pause);
  window.addEventListener('resize', fitCanvas);
  document.addEventListener('visibilitychange', onVisibility);
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => { if (!entries[0].isIntersecting) pause(); }, { threshold: 0 }) : null;
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(fitCanvas) : null;
  observer?.observe(root);
  resizeObserver?.observe(root);
  fitCanvas(); sync(); render();
  const controller = { pause, focus, destroy() {
    pause(); saveBest(); destroyed = true; stopLoop(); clearHold(); observer?.disconnect(); resizeObserver?.disconnect();
    root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKeyDown);
    root.removeEventListener('pointerdown', onPointerDown); root.removeEventListener('pointermove', onPointerMove); root.removeEventListener('focusout', onFocusOut);
    window.removeEventListener('pointerup', onPointerUp); window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('blur', pause); window.removeEventListener('resize', fitCanvas); document.removeEventListener('visibilitychange', onVisibility);
    root.innerHTML = ''; instances.delete(root);
  } };
  instances.set(root, controller);
  return controller;
}
