export const RATES = { USDC: 1, USDT: 1, ETH: 2500 };
export const NETWORK_FEES = { Ethereum: 0.2, Base: 0.05, Solana: 0.01, Polygon: 0.03 };
export function calculatePayment(rawAmount, asset, from, to) {
  const amount = Number(rawAmount);
  if (!String(rawAmount).trim() || !Number.isFinite(amount) || amount <= 0 || amount > 1000000) return { error: 'Enter an amount between 0.01 and 1,000,000.' };
  if (!Object.hasOwn(RATES, asset) || !Object.hasOwn(NETWORK_FEES, from) || !Object.hasOwn(NETWORK_FEES, to)) return { error: 'Choose a supported demo asset and network.' };
  if (amount < 0.01) return { error: 'The minimum demo payment is 0.01.' };
  const precision = asset === 'ETH' ? 6 : 2;
  const scale = 10 ** precision;
  if (Math.abs(amount * scale - Math.round(amount * scale)) > 0.00001) return { error: `Use up to ${precision} decimal places for ${asset}.` };
  const fee = Number((amount * 0.001 + (NETWORK_FEES[from] + (from === to ? 0 : NETWORK_FEES[to])) / RATES[asset]).toFixed(precision));
  const receives = Number((amount - fee).toFixed(precision));
  if (receives <= 0) return { error: 'This amount is too small to cover the network fee.' };
  return { amount, asset, from, to, fee, receives, precision, usd: amount * RATES[asset] };
}

/** Keep a cross-network route distinct when one endpoint replaces the other. */
export function reconcileNetworks(previous, next, changed) {
  if (next.from !== next.to) return next;
  return changed === 'from' ? { from: next.from, to: previous.from } : { from: previous.to, to: next.to };
}
