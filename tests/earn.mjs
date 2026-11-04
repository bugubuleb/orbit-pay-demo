import assert from 'node:assert/strict';
import { calculateProjection, EARN_TERMS, ILLUSTRATIVE_APY } from '../dist/earn.js';

const annual = calculateProjection(10, 12);
assert.ok(Math.abs(annual.rewards - 0.68) < 1e-12, 'A 6.8% effective APY returns 0.68 ETH on 10 ETH after a year.');
assert.equal(annual.total, annual.principal + annual.rewards);
assert.equal(annual.series[0].rewards, 0, 'No rewards accrue before time passes.');
assert.equal(annual.series.at(-1).rewards, annual.rewards);

const firstHalf = calculateProjection(10, 6);
const secondHalf = calculateProjection(firstHalf.total, 6);
assert.ok(Math.abs(secondHalf.total - annual.total) < 1e-12, 'Reinvesting after six months is consistent with the effective annual yield.');
assert.ok(firstHalf.rewards < annual.rewards / 2, 'Fractional-year growth respects compounding.');

for (const amount of [0.01, 0.123456, 1, 10, 9999, 10000]) {
  let previous = 0;
  for (const months of EARN_TERMS) {
    const projection = calculateProjection(amount, months);
    assert.ok(!projection.error);
    assert.ok(projection.rewards > previous);
    assert.ok(projection.total > amount);
    assert.ok(projection.series.every((point, index, list) => Number.isFinite(point.rewards) && (!index || point.rewards >= list[index - 1].rewards)));
    assert.ok(Math.abs(projection.series.find(point => point.month === months).rewards - projection.rewards) < 1e-12);
    previous = projection.rewards;
  }
}

for (const amount of ['', ' ', null, undefined, true, false, [], {}, 'NaN', 'hello', NaN, Infinity, -Infinity, -1, 0, 0.009, 10000.01]) {
  assert.ok(calculateProjection(amount, 12).error, `Invalid amount ${String(amount)} must not generate a projection.`);
}
for (const months of [0, 1, 9, 24, '12', NaN, null]) assert.ok(calculateProjection(10, months).error);
for (const apy of [-0.01, 1.01, Infinity, NaN, '0.068']) assert.ok(calculateProjection(10, 12, apy).error);
assert.equal(calculateProjection(' 10 ', 12).total, annual.total);
assert.equal(calculateProjection(10, 12, 0).rewards, 0);
assert.equal(calculateProjection(10, 12, 1).total, 20);
assert.equal(ILLUSTRATIVE_APY, 0.068);
console.log('PASS earn: APY compounding, reinvestment consistency, bounded inputs and chart-series invariants.');
