import { enhanceSelect } from './select.js';
import { initEcosystem } from './ecosystem.js';
import { initEarn } from './earn.js';
import { initCursorTrail } from './cursor-trail.js';
import { initNetworkTicker } from './networks.js';
import { initFinalEmblem } from './final-emblem.js';
import { initHoverEffects } from './hover-effects.js';
import { initPlanet } from './planet.js';
import { calculatePayment, RATES, reconcileNetworks } from './payment.js';

const $ = (s) => document.querySelector(s);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
try { initPlanet($('#orbit-planet')); $('.planet-stage').classList.add('ready'); } catch (error) { console.warn('Orbital visualization unavailable. Static scene retained.'); }

const menuButton = $('.menu-button');
menuButton.addEventListener('click', () => { const open = menuButton.getAttribute('aria-expanded') !== 'true'; menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); $('.header nav').classList.toggle('open', open); });
$('.header nav').addEventListener('click', (event) => { if (event.target.closest('a')) { menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation'); $('.header nav').classList.remove('open'); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation'); $('.header nav').classList.remove('open'); } });

if (!reducedMotion && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting) { entry.target.classList.remove('pending'); revealObserver.unobserve(entry.target); } }), {threshold:.08});
  document.querySelectorAll('.reveal').forEach(el => { el.classList.add('pending'); revealObserver.observe(el); });
}
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2800); }
async function copyText(text, message) { try { await navigator.clipboard.writeText(text); toast(message); return true; } catch { toast('Select the text and use your device’s Copy command.'); return false; } }

const form = $('#payment-form');
const fields = ['#amount','#asset','#from-network','#to-network'].map($);
const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
let currentPayment;
let routeState = { from: fields[2].value, to: fields[3].value };
let syncingRoute = false;
function syncRoute(changed) {
  if (syncingRoute) return;
  syncingRoute = true;
  const next = reconcileNetworks(routeState, {from: fields[2].value, to: fields[3].value}, changed);
  for (const [index, key] of [[2, 'from'], [3, 'to']]) {
    if (fields[index].value !== next[key]) {
      fields[index].value = next[key];
      fields[index].dispatchEvent(new Event('change', {bubbles:true}));
    }
  }
  routeState = next;
  syncingRoute = false;
}
function updatePayment() {
  const [amount,asset,from,to] = fields.map(f=>f.value);
  currentPayment = calculatePayment(amount,asset,from,to);
  $('#amount-usd').textContent = `≈ ${money((Number(amount)||0)*RATES[asset])} USD · demo rate`;
  $('#payment-error').textContent = currentPayment.error || '';
  $('#payment-fee').textContent = currentPayment.error ? '—' : `${currentPayment.fee.toFixed(currentPayment.precision)} ${asset}`;
  $('#payment-receives').textContent = currentPayment.error ? '—' : `${currentPayment.receives.toFixed(currentPayment.precision)} ${asset}`;
  document.querySelector('[data-route-from]').textContent = `${from} · wallet approval`;
  document.querySelector('[data-route-to]').textContent = `${to} · recipient`;
  return !currentPayment.error;
}
fields.forEach((field, index) => {
  const update = () => {
    if (index >= 2) syncRoute(index === 2 ? 'from' : 'to');
    updatePayment();
  };
  field.addEventListener('input', update);
  if (index >= 2) field.addEventListener('change', update);
});
updatePayment();
let sending = false;
const swapNetworks = $('#swap-networks');
swapNetworks.addEventListener('click', () => {
  if (sending) return;
  const from = fields[2], to = fields[3];
  [from.value, to.value] = [to.value, from.value];
  for (const field of [from, to]) {
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }
  $('#payment-status').textContent = `ROUTE: ${from.value.toUpperCase()} → ${to.value.toUpperCase()} · DEMO`;
});
form.addEventListener('submit',async event => {
  event.preventDefault(); if(sending) return;
  if(!updatePayment()) { $('#amount').focus(); return; }
  sending = true; swapNetworks.disabled = true;
  const payment = { ...currentPayment };
  const button=$('#send-payment'); button.disabled=true; fields.forEach(f=>f.disabled=true);
  const phases=['Finding your orbit…','Routing through the network…','Confirming arrival…'];
  try {
    for(const [index, phase] of phases.entries()) { $('.transfer-route').dataset.phase = String(index); button.textContent=phase; $('#payment-status').textContent=phase.toUpperCase(); $('.payment-terminal').classList.add('processing'); await new Promise(resolve=>setTimeout(resolve,reducedMotion?250:850)); }
    const receiptId = `ORB-DEMO-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
    const stamp = new Date().toISOString();
    const receiptText = `ORBIT PAY — DEMO RECEIPT\n${receiptId}\nTime: ${stamp}\nFrom: ${payment.from}\nTo: ${payment.to}\nSent: ${payment.amount} ${payment.asset}\nFee: ${payment.fee.toFixed(payment.precision)} ${payment.asset}\nReceived: ${payment.receives.toFixed(payment.precision)} ${payment.asset}\nSimulated payment. No real funds moved.`;
    const receipt=$('#receipt');
    receipt.innerHTML=`<div class="receipt-check">✓</div><span class="eyebrow lime">PAYMENT / CONFIRMED</span><h3>A perfect landing.</h3><p>Your demo payment has arrived at Orbit Studio.</p><dl><div><dt>You sent</dt><dd>${payment.amount} ${payment.asset}</dd></div><div><dt>Network fee</dt><dd>${payment.fee.toFixed(payment.precision)} ${payment.asset}</dd></div><div><dt>They received</dt><dd class="lime">${payment.receives.toFixed(payment.precision)} ${payment.asset}</dd></div><div><dt>Route</dt><dd>${payment.from} → ${payment.to}</dd></div></dl><div class="receipt-id">${receiptId}<br>${stamp}</div><div class="receipt-actions"><button class="button" id="another-payment">Send another <span>↗</span></button><button class="receipt-secondary" id="download-receipt">Save receipt ↓</button></div><small>DEMONSTRATION ONLY. NO BLOCKCHAIN TRANSACTION<br>WAS CREATED. NO REAL FUNDS WERE MOVED.</small>`;
    form.hidden=true;receipt.hidden=false;receipt.setAttribute('tabindex','-1');receipt.focus({preventScroll:true});
    $('#another-payment').addEventListener('click',()=>{receipt.hidden=true;form.hidden=false;$('#amount').focus({preventScroll:true});});
    $('#download-receipt').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([receiptText],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download=`${receiptId}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Demo receipt saved.');});
  } finally { $('.transfer-route').removeAttribute('data-phase'); sending=false;swapNetworks.disabled=false;button.disabled=false;fields.forEach(f=>f.disabled=false);button.innerHTML='Send demo payment <span>↗</span>';$('#payment-status').innerHTML='<span class="status-dot"></span> SANDBOX MODE · NO REAL FUNDS';$('.payment-terminal').classList.remove('processing');}
});

initEcosystem($('#ecosystem-root'));
initEarn($('#earn-root'));
initFinalEmblem($('.final-emblem'));
initHoverEffects();
initCursorTrail();
initNetworkTicker($('#networks'));
for(const id of ['asset','from-network','to-network']) enhanceSelect(document.getElementById(id),{kind:id==='asset'?'asset':'network'});

const codeSamples={typescript:`// A new orbit starts here.\nimport { Orbit } from '@orbit-pay/sdk';\n\nconst orbit = new Orbit({ mode: 'sandbox' });\n\nconst payment = await orbit.payments.create({\n  amount: 250,\n  asset: 'USDC',\n  network: 'base',\n  recipient: 'orbit-studio.demo'\n});`,curl:`# Illustrative endpoint — not a live API\ncurl https://api.orbit-pay.example/payments \\\n  -X POST \\\n  -H 'Content-Type: application/json' \\\n  -d '{\n    "mode": "sandbox",\n    "amount": 250,\n    "asset": "USDC",\n    "network": "base"\n  }'`};
codeSamples.webhook = `// A payment event delivered to your app.
{
  "type": "payment.confirmed",
  "mode": "sandbox",
  "data": {
    "amount": "250.00",
    "asset": "USDC",
    "network": "base",
    "status": "confirmed"
  }
}`;
let language='typescript';
function escapeHTML(text){return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function showCode(lang){language=lang;document.querySelectorAll('[data-example]').forEach(b=>{b.classList.toggle('active',b.dataset.example===lang);b.setAttribute('aria-pressed',String(b.dataset.example===lang));});document.querySelectorAll('[data-language]').forEach(tab=>{const selected=tab.dataset.language===lang;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});$('#code-panel').setAttribute('aria-labelledby',lang==='typescript'?'tab-ts':lang==='curl'?'tab-curl':'tab-webhook');$('#code-content').innerHTML=codeSamples[lang].split('\n').map(line=>line.trim().startsWith('//')||line.trim().startsWith('#')?`<span class="syntax-comment">${escapeHTML(line)}</span>`:escapeHTML(line).replace(/('[^']*'|&quot;[^&]*&quot;)/g,'<span class="syntax-string">$1</span>').replace(/\b(import|from|const|await|new)\b/g,'<span class="syntax-keyword">$1</span>')).join('\n');}
document.querySelectorAll('[data-language]').forEach(tab=>{tab.addEventListener('click',()=>showCode(tab.dataset.language));tab.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const langs=[...document.querySelectorAll('[data-language]')].map(item=>item.dataset.language);showCode(langs[(langs.indexOf(language)+(event.key==='ArrowRight'?1:2))%3]);$(`[data-language="${language}"]`).focus();}});});showCode('typescript');
document.querySelectorAll('[data-example]').forEach(button=>button.addEventListener('click',()=>{showCode(button.dataset.example);}));
let copyFeedbackTimer;
$('#copy-code').addEventListener('click',async()=>{if(await copyText(codeSamples[language],'Demo code copied.')){clearTimeout(copyFeedbackTimer);$('#copy-code .copy-label').textContent='Copied';copyFeedbackTimer=setTimeout(()=>$('#copy-code .copy-label').textContent='Copy',2000);}});

let arcadeLoaded=false;let arcadeController; 
async function loadArcade(){if(arcadeLoaded)return;arcadeLoaded=true;try{const {initArcade}=await import('./arcade.js');arcadeController=initArcade($('#arcade-root'));}catch(error){arcadeLoaded=false;$('#arcade-root').innerHTML='<div class="arcade-loading mono"><button id="retry-arcade" class="button">Reload arcade ↻</button></div>';$('#retry-arcade').addEventListener('click',loadArcade);}}
const arcadeDialog=$('#arcade-dialog');
$('#open-arcade').addEventListener('click',async()=>{arcadeDialog.showModal();await loadArcade();});
$('#close-arcade').addEventListener('click',()=>arcadeDialog.close());
arcadeDialog.addEventListener('close',()=>{arcadeController?.pause();$('#open-arcade').focus({preventScroll:true});});
arcadeDialog.addEventListener('click',event=>{if(event.target===arcadeDialog){const b=arcadeDialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)arcadeDialog.close();}});

function pixelArrows(root=document){
  [...(root.matches?.('a, button, span')?[root]:[]), ...root.querySelectorAll('a, button, span')].forEach(el=>{if(el.children.length===0&&el.textContent.trim()==='↗'&&!el.closest('.orbit-select')){el.innerHTML='<svg class="pixel-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 1h10v10h-3V6h-1v2H9v2H7v2H5v2H2v-3h2V9h2V7h2V5h2V4H5z"/></svg>';}});
}
pixelArrows();
new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&!node.matches('svg,path'))pixelArrows(node);}).observe(document.body,{childList:true,subtree:true});
