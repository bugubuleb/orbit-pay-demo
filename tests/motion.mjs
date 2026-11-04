import assert from 'node:assert/strict';
import { initCursorTrail, trailOpacity } from '../dist/cursor-trail.js';
import { initPlanet, getPlanetTrailGeometry } from '../dist/planet.js';

// A deterministic clock verifies work scheduling and lifecycle contracts. Real
// paint, hover contours and responsive layout are checked in the browser.
let now = 0, serial = 0, reads = 0, glyphDraws = 0;
const frames = new Map(), mutations = [], created = [];
const events = () => ({
  listeners: new Map(),
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); },
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); },
  emit(name, data = {}) { for (const fn of [...(this.listeners.get(name) || [])]) fn({ type: name, ...data }); }
});
const fine = { ...events(), matches: true }, reduced = { ...events(), matches: false };
const rect = (x, y, w, h) => ({ left:x, top:y, right:x+w, bottom:y+h, width:w, height:h });
const node = () => ({ ...events(), isConnected:true, parentElement:null, closest:()=>null, matches:()=>false, setAttribute() {}, getAttribute:()=>null, remove() { this.isConnected=false; } });
const context = () => new Proxy({}, { get(target, key) {
  if (key in target) return target[key];
  if (key === 'getImageData') return () => { throw new Error('GPU pixel readback must not occur'); };
  if (key === 'drawImage') return image => { if (image?.width === 512 && image?.height === 64) glyphDraws++; };
  if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop() {} });
  if (key === 'measureText') return () => ({width:10,actualBoundingBoxLeft:0,actualBoundingBoxRight:10});
  return () => {};
} });
const obstacle = { ...node(), getClientRects() { reads++; return [rect(300,100,80,40)]; } };
const body = { ...node(), append() {} };
const doc = { ...events(), hidden:false, body, documentElement:node(),
  createElement(tag) { const n={ ...node(), width:0,height:0, getContext:()=>n.context, context:context() }; created.push(n); return n; },
  querySelector:()=>null,
  querySelectorAll(selector) { reads++; return selector.includes('header,footer,dialog') ? [obstacle] : []; },
  createTreeWalker:()=>({nextNode:()=>null})
};
Object.assign(globalThis, events(), {
  document:doc, window:globalThis, innerWidth:800, innerHeight:600, scrollX:0, scrollY:0, devicePixelRatio:2,
  matchMedia:query=>query.includes('pointer: fine') ? fine : reduced,
  requestAnimationFrame:fn=>{const id=++serial;frames.set(id,fn);return id;},
  cancelAnimationFrame:id=>frames.delete(id),
  getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),
  NodeFilter:{SHOW_TEXT:4,FILTER_ACCEPT:1,FILTER_REJECT:2},
  Path2D:class { moveTo() {} lineTo() {} },
  ResizeObserver:class { observe() {} disconnect() {} },
  IntersectionObserver:class { observe() {} disconnect() {} },
  MutationObserver:class { constructor(fn) {this.fn=fn;mutations.push(this);} observe() {} disconnect() {this.disconnected=true;} }
});
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
doc.defaultView=globalThis;
const step = time => {now=time;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));};
const pointer = (x,y=220,target=node()) => globalThis.emit('pointermove',{pointerType:'mouse',clientX:x,clientY:y,target});
function deposit() { pointer(100);now+=40;pointer(210);step(now+16); }

assert.ok(trailOpacity(2200) < trailOpacity(1500), 'older segments fade before newer ones');
assert.equal(trailOpacity(2300), 0);
assert.ok(trailOpacity(1900)>0, 'a later segment survives after an earlier segment expires');
let trail=initCursorTrail();
deposit();
assert.ok(glyphDraws>0,'moving in empty space draws glyphs');
globalThis.emit('blur');
assert.ok(frames.size>0, 'losing window focus must not erase the entire line');
const firstReads=reads;
for(let i=0;i<30;i++) step(now+16);
assert.equal(reads,firstReads,'stationary layout must not be scanned again on every fade frame');
scrollY=20;globalThis.emit('scroll');step(now+16);
assert.ok(reads>firstReads,'scroll invalidates obstacle positions');
const scrolledReads=reads;
mutations.at(-1).fn([{type:'childList',target:body}]);step(now+16);
assert.ok(reads>scrolledReads,'content changes rebuild the obstacle inventory');
step(now+3000);
assert.equal(frames.size,0,'trail stops requesting frames once the final glyph expires');
const drawsAtRest=glyphDraws;step(now+100);
assert.equal(glyphDraws,drawsAtRest,'a stationary pointer emits no more glyphs');
trail.destroy();
assert.equal(globalThis.listeners.get('pointermove').size,0,'destroy removes the pointer listener');
assert.equal(mutations.at(-1).disconnected,true);

// Allocating in a background tab must not permanently leave a zero-size canvas.
doc.hidden=true;trail=initCursorTrail();
const backgroundCanvas=created.findLast(n=>n.className==='cursor-trail');
assert.equal(backgroundCanvas.width,1600);
doc.hidden=false;doc.emit('visibilitychange');now+=300;deposit();
assert.ok(frames.size>0,'trail resumes after revealing a background tab');
fine.matches=false;fine.emit('change');
assert.equal(backgroundCanvas.width,0,'touch-only mode releases full-screen buffers');
assert.equal(frames.size,0);
fine.matches=true;fine.emit('change');now+=300;deposit();
assert.ok(frames.size>0,'mouse mode can be restored without a reload');
reduced.matches=true;reduced.emit('change');
assert.equal(backgroundCanvas.width,0);
assert.equal(frames.size,0,'reduced motion cancels trail work');
reduced.matches=false;reduced.emit('change');trail.destroy();

const canvas={...node(), ownerDocument:doc, getBoundingClientRect:()=>rect(0,0,800,600), getContext:()=>context()};
const destroyPlanet=initPlanet(canvas);step(now+17);
const geometry=getPlanetTrailGeometry(canvas);
assert.ok(geometry.radius>0 && geometry.paths.length===6 && geometry.satellites.length===3,'planet shares its painted vector contours');
doc.hidden=true;doc.emit('visibilitychange');
assert.equal(frames.size,0,'hidden tabs stop the planet loop');
doc.hidden=false;doc.emit('visibilitychange');step(now+17);
assert.ok(frames.size>0,'visible tabs resume the planet loop');
destroyPlanet();
assert.equal(getPlanetTrailGeometry(canvas),undefined,'destroy releases shared planet geometry');
assert.equal(frames.size,0);
console.log('PASS motion: cached masks, scroll/content invalidation, bounded lifetime, idle stop, hidden-tab resume, input preferences, vector planet masks and cleanup.');
