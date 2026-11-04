import assert from 'node:assert/strict';
import {calculatePayment} from '../dist/payment.js';
import {spherePoint,projectPoint} from '../dist/planet.js';
const first=calculatePayment(250,'USDC','Ethereum','Base');
assert.equal(first.fee,.5);assert.equal(first.receives,249.5);
for(const amount of ['',0,-1,'abc',Infinity,1000001,.001])assert.ok(calculatePayment(amount,'USDC','Base','Ethereum').error);
assert.ok(calculatePayment(.01,'USDC','Ethereum','Base').error);
for(const amount of ['0.105','250.005'])assert.ok(calculatePayment(amount,'USDC','Solana','Solana').error);
assert.ok(calculatePayment('0.1234567','ETH','Base','Solana').error);
for(const asset of ['USDC','USDT','ETH'])for(const amount of [.01,.1,1,99.99,250,1000000])for(const from of ['Ethereum','Base','Solana','Polygon'])for(const to of ['Ethereum','Base','Solana','Polygon']){
 const p=calculatePayment(amount,asset,from,to);
 if(!p.error){assert.ok(Math.abs(p.amount-p.fee-p.receives)<.000001);assert.ok(p.fee>0);}
}
assert.ok(calculatePayment(25,'BAD','Base','Ethereum').error);
for(let i=0;i<100;i++){const p=spherePoint(i/100*Math.PI-Math.PI/2,i);assert.ok(Math.abs(p.x*p.x+p.y*p.y+p.z*p.z-1)<1e-10);const q=projectPoint(p,100,200,200);assert.ok(Number.isFinite(q.x)&&q.scale>0);}
console.log('PASS payment validation, precision, 288 accounting scenarios and sphere projection.');
