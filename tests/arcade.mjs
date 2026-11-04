import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../dist/arcade.js', import.meta.url), 'utf8');
const { SnakeEngine, TetrisEngine, TETROMINOES } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
let passed = 0;
function test(name, run) { run(); console.log(`PASS ${name}`); passed++; }
const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

test('Snake does not advance before start or while paused', () => {
  const game = new SnakeEngine(); const before = JSON.stringify(game.snake);
  game.tick(); assert.equal(JSON.stringify(game.snake), before);
  game.start(); game.status = 'paused'; game.tick(); assert.equal(JSON.stringify(game.snake), before);
});
test('Snake grows and places food outside occupied cells', () => {
  const game = new SnakeEngine({ random: seeded() }); game.start();
  game.food = { x: game.snake[0].x + 1, y: game.snake[0].y };
  game.tick(); assert.equal(game.score, 10); assert.equal(game.snake.length, 4);
  assert.ok(!game.snake.some(cell => cell.x === game.food.x && cell.y === game.food.y));
});
test('Snake rejects reversal but buffers two legal turns', () => {
  const game = new SnakeEngine(); game.start(); assert.equal(game.turn('left'), false);
  assert.equal(game.turn('up'), true); assert.equal(game.turn('left'), true); assert.equal(game.turn('down'), false);
  game.tick(); assert.equal(game.direction, 'up'); game.tick(); assert.equal(game.direction, 'left');
});
test('Snake permits entering a tail cell that vacates this turn', () => {
  const game = new SnakeEngine(); game.start();
  game.snake = [{x:2,y:2},{x:2,y:3},{x:1,y:3},{x:1,y:2}]; game.direction = 'left'; game.food = {x:9,y:9};
  game.tick(); assert.equal(game.status, 'playing'); assert.deepEqual(game.snake[0], {x:1,y:2});
});
test('Snake ends on wall and self collision', () => {
  const wall = new SnakeEngine(); wall.start(); wall.snake[0] = {x:29,y:5}; wall.tick(); assert.equal(wall.status, 'over');
  const self = new SnakeEngine(); self.start(); self.snake = [{x:3,y:3},{x:4,y:3},{x:4,y:4},{x:3,y:4}]; self.tick(); assert.equal(self.status, 'over');
});
test('Snake wins when the final free cell is eaten', () => {
  const game = new SnakeEngine({ cols:3, rows:2 }); game.start();
  game.snake = [{x:1,y:0},{x:0,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1}]; game.food={x:2,y:0}; game.tick();
  assert.equal(game.status, 'won'); assert.equal(game.food, null); assert.equal(game.snake.length, 6);
});
test('Tetris seven-bag contains every piece exactly once', () => {
  const game = new TetrisEngine({random:seeded()}); game.bag=[];
  for(let bag=0;bag<10;bag++) assert.deepEqual(Array.from({length:7},()=>game.takeFromBag()).sort(),Object.keys(TETROMINOES).sort());
});
test('Tetris movement respects both walls and pause', () => {
  const game = new TetrisEngine({random:seeded()}); game.start();
  for(let i=0;i<20;i++) game.move(-1); assert.equal(game.collides(game.active.x-1,game.active.y),true);
  for(let i=0;i<20;i++) game.move(1); assert.equal(game.collides(game.active.x+1,game.active.y),true);
  const before=JSON.stringify(game.active); game.status='paused'; game.move(-1); game.rotate(); game.tick(); game.hardDrop(); assert.equal(JSON.stringify(game.active),before);
});
test('Tetris rotations stay valid at edges and floor', () => {
  const game = new TetrisEngine({random:seeded()}); game.start();
  game.active={type:'I',matrix:[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],x:-2,y:10};
  assert.equal(game.rotate(),true); assert.equal(game.collides(game.active.x,game.active.y),false);
  game.active={type:'I',matrix:TETROMINOES.I.matrix.map(r=>[...r]),x:3,y:18};
  assert.equal(game.rotate(),true); assert.equal(game.collides(game.active.x,game.active.y),false);
});
test('Tetris hard drop locks a piece, awards distance and spawns next', () => {
  const game = new TetrisEngine({random:seeded()}); game.start(); const next=game.next;
  const expected=game.ghostY()-game.active.y; game.hardDrop();
  assert.equal(game.score,expected*2); assert.equal(game.board.flat().filter(Boolean).length,4); assert.equal(game.active.type,next);
});
test('Tetris clears a row and scores it', () => {
  const game = new TetrisEngine(); game.start();
  game.board[19]=Array(10).fill('J'); for(let x=3;x<7;x++) game.board[19][x]=null;
  game.active={type:'I',matrix:TETROMINOES.I.matrix.map(r=>[...r]),x:3,y:18}; game.hardDrop();
  assert.equal(game.lines,1); assert.equal(game.score,100); assert.equal(game.board.flat().filter(Boolean).length,0);
});
test('Tetris four-line clear advances level and accelerates', () => {
  const game = new TetrisEngine(); game.start(); game.lines=6; const oldInterval=game.interval;
  for(let y=16;y<20;y++){game.board[y]=Array(10).fill('J');game.board[y][5]=null;}
  game.active={type:'I',matrix:[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],x:3,y:16}; game.hardDrop();
  assert.equal(game.lines,10); assert.equal(game.level,2); assert.equal(game.score,800); assert.ok(game.interval<oldInterval);
});
test('Tetris ends when a new piece cannot spawn and restarts cleanly', () => {
  const game = new TetrisEngine(); game.start(); game.board[0]=Array(10).fill('J'); game.board[1]=Array(10).fill('J'); game.spawn();
  assert.equal(game.status,'over'); game.start(); assert.equal(game.status,'playing'); assert.equal(game.score,0); assert.ok(game.board.flat().every(c=>!c));
});
test('Deterministic Tetris simulation maintains a valid board', () => {
  const game = new TetrisEngine({random:seeded(24)}); game.start(); const random=seeded(99);
  for(let i=0;i<2000 && game.status==='playing';i++){
    const action=Math.floor(random()*5); if(action===0)game.move(-1);else if(action===1)game.move(1);else if(action===2)game.rotate();else if(action===3)game.tick();else game.hardDrop();
    assert.equal(game.board.length,20); assert.ok(game.board.every(row=>row.length===10));
    if(game.status==='playing')assert.equal(game.collides(game.active.x,game.active.y),false);
  }
});
console.log(`${passed} arcade engine tests passed.`);
