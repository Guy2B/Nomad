// Algebra Operating Cockpit (client). Reads /api/admin/* with the admin token kept in sessionStorage only.
// Every value is escaped before it reaches the DOM. A missing figure is shown as "—" with its reason, never guessed.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtEur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const fmtNum = new Intl.NumberFormat('de-DE');
const eur = (n) => (n == null ? '<span class="na">—</span>' : esc(fmtEur.format(n)));
const num = (n) => (n == null ? '<span class="na">—</span>' : esc(fmtNum.format(n)));
const pct = (n) => (n == null ? '<span class="na">—</span>' : `${esc(fmtNum.format(n))} %`);
const date = (iso) => (iso ? esc(new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })) : '<span class="na">—</span>');
const dateTime = (iso) => (iso ? esc(new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })) : '<span class="na">—</span>');
const est = (flag) => (flag ? '<span class="est" title="Uses the documented cost model (docs/ECONOMICS.md) or reference prices until real costs are recorded">estimate</span>' : '');
const na = (reason) => `<span class="na" title="${esc(reason)}">Not available</span>`;
const STATUS_CLASS = { needs_attention: 'err', fulfillment_failed: 'err', payment_failed: 'err', refunded: 'warn', cancelled: 'warn', expired: '', pending_payment: '', paid: 'ok', submitted: 'ok', in_production: 'ok', shipped: 'ok', delivered: 'ok' };
const st = (s) => `<span class="st ${STATUS_CLASS[s] ?? ''}">${esc(String(s).replace(/_/g, ' '))}</span>`;
const TITLES = { dashboard: 'Dashboard', orders: 'Orders', alerts: 'Alerts', fulfillment: 'Fulfillment', finance: 'Finance', products: 'Products', 'graphic-series': 'Graphic Series', inventory: 'Inventory', customers: 'Customers', circle: 'A Circle', analytics: 'Analytics', settings: 'Settings' };

let token = null;
try { token = sessionStorage.getItem('alg_admin'); } catch { /* private mode */ }

async function api(path) {
  const r = await fetch(`/api/admin/${path}`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (r.status === 403) { signOut(); throw new Error('forbidden'); }
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
async function apiPost(path, data) {
  const r = await fetch(`/api/admin/${path}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

function signOut() {
  token = null;
  try { sessionStorage.removeItem('alg_admin'); } catch { /* ignore */ }
  $('#app').hidden = true;
  $('#login').hidden = false;
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  token = $('#token').value.trim();
  $('#login-err').hidden = true;
  try {
    await api('settings');
    try { sessionStorage.setItem('alg_admin', token); } catch { /* ignore */ }
    $('#token').value = '';
    start();
  } catch {
    $('#login-err').hidden = false;
    $('#app').hidden = true;
    $('#login').hidden = false;
  }
});
$('#logout').addEventListener('click', signOut);
$('#menu').addEventListener('click', () => {
  const open = $('#side').classList.toggle('open');
  $('#menu').setAttribute('aria-expanded', String(open));
});

// ---------------------------------------------------------------- period
const rangeQuery = () => {
  const r = $('#range').value;
  if (r === 'custom') return `range=custom&from=${encodeURIComponent($('#from').value)}&to=${encodeURIComponent($('#to').value)}`;
  return `range=${r}`;
};
$('#range').addEventListener('change', () => { $('#custom').hidden = $('#range').value !== 'custom'; if ($('#range').value !== 'custom') render(); });
$('#from').addEventListener('change', render);
$('#to').addEventListener('change', render);
$('#refresh').addEventListener('click', render);

// ---------------------------------------------------------------- views
const kpi = (label, value, { cls = '', href, title } = {}) => `<div class="kpi ${cls}${href ? ' is-link' : ''}"${href ? ` data-href="${esc(href)}"` : ''}${title ? ` title="${esc(title)}"` : ''}><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
const delta = (cur, prev) => {
  if (cur == null || prev == null || prev === 0) return '';
  const d = Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10;
  return `<span class="delta">${d > 0 ? '+' : ''}${esc(fmtNum.format(d))} % vs prev.</span>`;
};
const alertList = (alerts) =>
  alerts.length
    ? `<ul class="alerts">${alerts.map((a) => `<li class="${esc(a.level)}"><span class="dot" aria-hidden="true"></span><div><b>${esc(a.title)}</b>${a.ref ? ` · <a href="#/orders/${esc(a.ref)}">${esc(a.ref)}</a>` : ''}<p>${esc(a.action)}</p></div></li>`).join('')}</ul>`
    : '<p class="empty">Nothing needs attention.</p>';

function chart(series) {
  const pts = series.points;
  if (!pts.length) return '<p class="empty">No data in this period.</p>';
  const W = 760, H = 220, P = 28;
  const maxR = Math.max(1, ...pts.map((p) => p.revenue));
  const maxO = Math.max(1, ...pts.map((p) => p.orders));
  const bw = (W - P * 2) / pts.length;
  const x = (i) => P + i * bw + bw / 2;
  const yR = (v) => H - P - (v / maxR) * (H - P * 2);
  const yO = (v) => H - P - (v / maxO) * (H - P * 2);
  const bars = pts.map((p, i) => `<rect x="${(x(i) - bw * 0.32).toFixed(1)}" y="${yO(p.orders).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${(H - P - yO(p.orders)).toFixed(1)}" fill="#e7e1d6"><title>${esc(p.date)}: ${p.orders} orders</title></rect>`).join('');
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yR(p.revenue).toFixed(1)}`).join(' ');
  const dots = pts.map((p, i) => (p.revenue ? `<circle cx="${x(i).toFixed(1)}" cy="${yR(p.revenue).toFixed(1)}" r="2.5" fill="#0e1220"><title>${esc(p.date)}: ${esc(fmtEur.format(p.revenue))}</title></circle>` : '')).join('');
  const ticks = [0, Math.floor(pts.length / 2), pts.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => `<text x="${x(i).toFixed(1)}" y="${H - 8}" font-size="10" text-anchor="middle" fill="#6b6e78">${esc(pts[i].date)}</text>`).join('');
  return `<div class="legend"><span><i></i>Revenue (max ${esc(fmtEur.format(maxR))})</span><span><i class="bar"></i>Orders (max ${maxO})</span></div>
<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Revenue and orders"><line x1="${P}" x2="${W - P}" y1="${H - P}" y2="${H - P}" stroke="#ddd6c9"/>${bars}<path d="${line}" fill="none" stroke="#0e1220" stroke-width="1.5"/>${dots}${ticks}</svg>`;
}

const views = {
  async dashboard() {
    const d = await api(`overview?${rangeQuery()}`);
    const b = d.business;
    const o = d.operations;
    const c = d.business.cash;
    const ci = d.circle;
    return `
<section class="panel hero">
  <div class="hero__main">
    <div><p class="hero__label">Net contribution ${est(b.estimate)}</p><p class="hero__value">${b.contribution == null ? '—' : esc(fmtEur.format(b.contribution))}</p></div>
    <p class="hero__sub">${b.contribution == null && b.missingCosts ? `${b.missingCosts} order(s) without a known supplier cost. ` : ''}Margin ${b.marginPct == null ? '—' : esc(fmtNum.format(b.marginPct)) + ' %'} of net revenue${delta(b.contribution, d.previous.contribution)}</p>
  </div>
  <dl class="hero__grid">
    <div><dt>Revenue</dt><dd>${eur(b.revenue)}</dd></div>
    <div><dt>Net revenue</dt><dd>${eur(b.netRevenue)}</dd></div>
    <div><dt>Orders</dt><dd>${num(b.orders)}</dd></div>
    <div><dt>Average order</dt><dd>${eur(b.aov)}</dd></div>
    <div><dt>Gross margin</dt><dd>${eur(b.grossMargin)}</dd></div>
    <div><dt>Refunds</dt><dd>${eur(b.refunds)}</dd></div>
    <div><dt>Checkout → purchase</dt><dd>${pct(b.checkoutConversion)}</dd></div>
    <div><dt>Conversion (sessions)</dt><dd title="${esc(b.conversionReason)}">${b.conversion == null ? '<span class="na">—</span>' : esc(fmtNum.format(b.conversion)) + ' %'}</dd></div>
  </dl>
</section>

<section class="sec"><h2>Operations</h2>
<dl class="kpis">
  ${kpi('Paid, waiting for production', num(o.pending), { cls: o.pending ? 'is-warn' : '', href: '#/orders?filter=paid' })}
  ${kpi('In production', num(o.production), { href: '#/orders?filter=production' })}
  ${kpi('Shipped', num(o.shipped), { href: '#/orders?filter=shipped' })}
  ${kpi('Requires intervention', num(o.attention), { cls: o.attention ? 'is-err' : '', href: '#/orders?filter=attention' })}
  ${kpi('Fulfillment failures', num(o.fulfillmentFailures), { cls: o.fulfillmentFailures ? 'is-err' : '' })}
  ${kpi('Products unavailable', num(o.productsUnavailable), { href: '#/products', title: 'Products not purchasable (draft or waiting for supplier approval)' })}
  ${kpi('Missing tracking', num(o.missingTracking), { cls: o.missingTracking ? 'is-warn' : '' })}
  ${kpi('API / webhook errors', num(o.apiErrors), { cls: o.apiErrors ? 'is-err' : '' })}
</dl></section>

<div class="cols2">
  <section class="sec"><h2>Revenue &amp; orders <span>${esc(d.series.step === 'month' ? 'by month' : 'by day')}</span></h2><div class="panel chart">${chart(d.series)}</div></section>
  <section class="sec"><h2>Alerts <a href="#/alerts">All</a></h2><div class="panel">${alertList(d.alerts)}${d.notes ? `<p class="empty"><a href="#/alerts">${d.notes} preparation note(s)</a> before going live.</p>` : ''}</div></section>
</div>

<section class="sec"><h2>Cash ${est(b.estimate)}</h2>
<dl class="kpis">
  ${kpi('Gross sales', eur(c.gross))}
  ${kpi('VAT', eur(c.vat), { title: d.mode.vat === 'kleinunternehmer' ? 'Kleinunternehmer § 19 UStG: no VAT charged' : 'Regular VAT' })}
  ${kpi('Payment fees', eur(c.paymentFees))}
  ${kpi('Supplier costs', eur(c.productionCosts))}
  ${kpi('Shipping costs', eur(c.shippingCosts))}
  ${kpi('Refunds', eur(c.refunds))}
  ${kpi('Contribution', eur(c.contribution))}
</dl></section>

<section class="sec"><h2>A Circle <a href="#/circle">Members</a></h2>
<dl class="kpis">
  ${kpi('Members', num(ci.members))}
  ${kpi('New members', num(ci.newMembers))}
  ${kpi('Member revenue', eur(ci.memberRevenue))}
  ${kpi('Member repeat rate', pct(ci.repeatRate))}
  ${kpi('Member average order', eur(ci.memberAov))}
</dl></section>`;
  },

  async orders(params) {
    const filter = params.get('filter') || 'all';
    const d = await api(`orders?filter=${encodeURIComponent(filter)}`);
    const F = ['all', 'new', 'paid', 'production', 'shipped', 'delivered', 'returned', 'refunded', 'attention'];
    const label = { all: 'All', new: 'New', paid: 'Paid', production: 'Production', shipped: 'Shipped', delivered: 'Delivered', returned: 'Returned', refunded: 'Refunded', attention: 'Attention required' };
    return `
<div class="toolbar"><div class="filters" role="group" aria-label="Filter">${F.map((f) => `<button type="button" data-filter="${f}" aria-pressed="${f === filter}">${label[f]}</button>`).join('')}</div><span class="muted">${num(d.count)} orders</span></div>
${filter === 'returned' ? '<p class="note">Returns are not recorded separately yet. Refunds are under “Refunded”.</p>' : ''}
<div class="tablewrap"><table>
<thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Country</th><th>Products</th><th class="n">Total</th><th class="n">Margin</th><th>Payment</th><th>Fulfillment</th><th>Tracking</th><th>Provider</th><th>Risk</th></tr></thead>
<tbody>${d.orders.length ? d.orders.map((o) => `<tr class="is-click" data-order="${esc(o.number)}">
<td><b>${esc(o.number)}</b></td><td>${date(o.date)}</td><td>${esc(o.customer || '')}<br><span class="muted">${esc(o.email || '')}</span></td><td>${esc(o.country)}</td>
<td>${o.products.map(esc).join('<br>')}</td><td class="n">${eur(o.total)}</td><td class="n">${eur(o.contribution)}${est(o.estimate && o.contribution != null)}</td>
<td>${st(o.payment)}</td><td>${st(o.status)}</td><td>${o.tracking ? esc(`${o.tracking.carrier || ''} ${o.tracking.number}`) : '<span class="na">—</span>'}</td>
<td>${esc(o.provider.status || '')}<br><span class="muted">${esc(o.provider.orderId || '')}</span></td><td>${o.risk ? `<span class="st ${o.risk === 'error' ? 'err' : 'warn'}" title="${esc(o.error || '')}">${o.risk}</span>` : ''}</td></tr>`).join('') : '<tr><td colspan="12" class="empty">No orders.</td></tr>'}</tbody></table></div>`;
  },

  async order(params, number) {
    const o = await api(`orders/${encodeURIComponent(number)}`);
    const e = o.economics;
    const row = (k, v) => `<dt>${esc(k)}</dt><dd class="num">${v}</dd>`;
    return `
<p><a href="#/orders">← Orders</a></p>
<section class="sec"><h2>${esc(o.number)} · ${st(o.status)}</h2>
<dl class="facts">
  <dt>Date</dt><dd>${dateTime(o.date)}</dd>
  <dt>Customer</dt><dd>${esc(o.customer || '')} · ${esc(o.email || '')}</dd>
  <dt>Country</dt><dd>${esc(o.country)}</dd>
  <dt>Items</dt><dd>${o.items.map((i) => `${esc(i.qty)}× ${esc(i.sku)} · ${eur(i.price)}`).join('<br>')}</dd>
  <dt>Provider</dt><dd>${esc(o.provider.name || '')} ${esc(o.provider.orderId || '')} ${esc(o.provider.status || '')}</dd>
  <dt>Tracking</dt><dd>${o.tracking ? `${esc(o.tracking.carrier || '')} ${esc(o.tracking.number)}` : '—'}</dd>
  ${o.error ? `<dt>Last error</dt><dd>${esc(o.error)}</dd>` : ''}
</dl></section>
<section class="sec"><h2>Economics ${est(e.estimate)}</h2>
<dl class="facts">
  ${row('Sales (incl. shipping)', eur(e.gross))}${row('Discounts', eur(e.discounts))}${row('VAT', eur(e.vat))}${row('Net sales', eur(e.netSales))}
  ${row('Refunds', eur(e.refunds))}${row('Product + decoration', eur(e.product))}${row('Neck label', eur(e.label))}${row('Gross margin', eur(e.grossMargin))}
  ${row('Shipping paid by Algebra', eur(e.shippingCost))}${row('Packaging', eur(e.packaging))}${row('Payment fee', eur(e.paymentFee))}
  ${row('Contribution margin', `<b>${eur(e.contribution)}</b>`)}${row('Margin', pct(e.marginPct))}
  <dt>Cost sources</dt><dd>${esc(Object.entries(e.sources).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—')}</dd>
</dl></section>
<section class="sec"><h2>Record real costs</h2>
<form class="form-row" id="costs" data-id="${esc(o.id)}">
  <label>Production cost € <input type="number" step="0.01" min="0" name="productionCost"></label>
  <label>Shipping cost € <input type="number" step="0.01" min="0" name="shippingCost"></label>
  <label>Payment fee € <input type="number" step="0.01" min="0" name="paymentFee"></label>
  <label>Source <select name="source"><option value="provider_invoice">Provider invoice</option><option value="stripe_balance">Stripe balance</option><option value="manual">Manual</option></select></label>
  <button class="ghost" type="submit">Save</button>
</form></section>
<section class="sec"><h2>Events</h2><div class="tablewrap"><table><thead><tr><th>Time</th><th>Event</th><th>Data</th></tr></thead><tbody>
${o.events.map((ev) => `<tr><td>${dateTime(ev.created_at)}</td><td>${esc(ev.type)}</td><td class="muted">${esc(ev.data || '')}</td></tr>`).join('')}</tbody></table></div></section>`;
  },

  async alerts() {
    const d = await api('alerts');
    return `<div class="panel">${alertList(d.alerts)}</div>`;
  },

  async fulfillment() {
    const s = await api('fulfillment/status');
    return `
<dl class="kpis">
  ${kpi('Provider', esc(s.provider))}
  ${kpi('Mode', esc(s.mode), { cls: s.mode === 'production' ? '' : 'is-warn' })}
  ${kpi('API', s.apiConfigured ? 'configured' : 'not configured', { cls: s.apiConfigured ? '' : 'is-warn' })}
  ${kpi('Webhook', s.webhookConfigured ? 'configured' : 'not configured', { cls: s.webhookConfigured ? '' : 'is-warn' })}
  ${kpi('Last webhook', dateTime(s.lastWebhook))}
  ${kpi('Last sync', dateTime(s.lastSync))}
  ${kpi('Order success rate', pct(s.successRate))}
  ${kpi('Avg. production time', s.avgProductionDays == null ? '<span class="na">—</span>' : `${esc(fmtNum.format(s.avgProductionDays))} d`)}
  ${kpi('Delayed orders', num(s.delayed), { cls: s.delayed ? 'is-warn' : '' })}
  ${kpi('Rejected orders', num(s.rejected), { cls: s.rejected ? 'is-err' : '' })}
  ${kpi('SKU / stock errors', num(s.skuErrors), { cls: s.skuErrors ? 'is-err' : '' })}
  ${kpi('Confirmed variants', `${num(s.variants.confirmed)} / ${num(s.variants.purchasable)}`)}
</dl>
<p class="note">The provider stays in sandbox until it is officially activated; the fallback provider stays disabled. Production can only be switched on the Worker configuration, never from this cockpit.</p>
<section class="sec"><h2>Production mapping · ${esc(s.provider)}</h2><div class="tablewrap"><table><thead><tr><th>Algebra product</th><th>Reference</th><th>Method</th><th>Status</th><th class="n">Variants confirmed</th><th>Note</th></tr></thead><tbody>
${s.mapping.map((p) => `<tr><td>${esc(p.product)}</td><td>${esc(p.reference || '')}</td><td>${esc(p.method)}</td><td>${st(p.status)}</td><td class="n">${p.confirmed} / ${p.total}</td><td class="muted">${esc(p.note || '')}</td></tr>`).join('')}
</tbody></table></div></section>`;
  },

  async finance(params) {
    const by = params.get('by') || 'month';
    const d = await api(`finance?by=${by}`);
    const B = ['month', 'week', 'product', 'country', 'collection'];
    const t = d.totals;
    return `
<dl class="kpis">
  ${kpi('Gross sales', eur(t.gross))}${kpi('Discounts', eur(t.discounts))}${kpi('Net sales', eur(t.netSales))}${kpi('VAT', eur(t.vat))}
  ${kpi('Payment fees', eur(t.paymentFees))}${kpi('Supplier costs', eur(t.productionCosts))}${kpi('Shipping', eur(t.shippingCosts))}${kpi('Refunds', eur(t.refunds))}
  ${kpi('Contribution margin', `${eur(t.contribution)}${est(d.estimate)}`)}
</dl>
<div class="toolbar"><div class="filters" role="group" aria-label="Group by">${B.map((b) => `<button type="button" data-by="${b}" aria-pressed="${b === by}">${b[0].toUpperCase() + b.slice(1)}</button>`).join('')}</div><span class="muted">All time · ${esc(d.model.vatMode)}</span></div>
<div class="tablewrap"><table><thead><tr><th>${esc(by)}</th><th class="n">Gross sales</th><th class="n">Discounts</th><th class="n">Net sales</th><th class="n">VAT</th><th class="n">Payment fees</th><th class="n">Supplier costs</th><th class="n">Shipping</th><th class="n">Refunds</th><th class="n">Contribution</th><th class="n">Margin</th></tr></thead><tbody>
${d.rows.length ? d.rows.map((r) => `<tr><td>${esc(r.key)}</td><td class="n">${eur(r.grossSales)}</td><td class="n">${eur(r.discounts)}</td><td class="n">${eur(r.netSales)}</td><td class="n">${eur(r.vat)}</td><td class="n">${eur(r.paymentFees)}</td><td class="n">${eur(r.productionCosts)}</td><td class="n">${eur(r.shipping)}</td><td class="n">${eur(r.refunds)}</td><td class="n"><b>${eur(r.contribution)}</b>${est(r.estimate)}</td><td class="n">${pct(r.marginPct)}</td></tr>`).join('') : '<tr><td colspan="11" class="empty">No sales yet.</td></tr>'}
</tbody></table></div>
<p class="note">Method: sales − discounts − VAT = net sales; − refunds − product and decoration − neck label = gross margin; − shipping paid by Algebra − packaging − payment fees = contribution margin. Real costs recorded on an order replace the model. Payment fee model ${esc(fmtNum.format(d.model.paymentPct * 100))} % + ${esc(fmtEur.format(d.model.paymentFixed))}; under § 19 UStG supplier costs count gross.</p>`;
  },

  async products() {
    const d = await api('products');
    return `<div class="tablewrap"><table><thead><tr><th>Algebra ID</th><th>Name</th><th>Category</th><th>Status</th><th class="n">Price</th><th class="n">Cost</th><th class="n">Unit margin</th><th class="n">Units sold</th><th class="n">Revenue</th><th class="n">Returns</th><th>Conversion</th><th>Colours</th><th>Sizes</th><th>Supplier</th><th>Print-master</th><th class="n">Confirmed</th></tr></thead><tbody>
${d.products.map((p) => `<tr><td>${esc(p.id)}</td><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${st(p.status.toLowerCase())}</td><td class="n">${eur(p.price)}</td>
<td class="n">${eur(p.cost)}${est(p.costEstimate)}</td><td class="n">${eur(p.unitContribution)} <span class="muted">${p.unitMarginPct == null ? '' : esc(fmtNum.format(p.unitMarginPct)) + ' %'}</span></td>
<td class="n">${num(p.units)}</td><td class="n">${eur(p.revenue)}</td><td class="n">${pct(p.returnRate)}</td><td><a href="#/analytics">Analytics</a></td>
<td>${p.colors.map(esc).join(', ')}</td><td>${p.sizes.map(esc).join(' ')}</td><td>${st(p.supplier.status)}<br><span class="muted">${esc(p.supplier.product || '')} · ${esc(p.supplier.method)}</span></td>
<td>${p.printMaster == null ? '' : p.printMaster ? st('confirmed') : '<span class="st warn">missing</span>'}</td><td class="n">${p.production.confirmed} / ${p.production.purchasable}</td></tr>`).join('')}
</tbody></table></div><p class="note">Unit margin: one piece delivered in Germany, shipping and packaging excluded, cost model of docs/ECONOMICS.md. No variant that is not “confirmed” can go to real production.</p>`;
  },

  async 'graphic-series'() {
    const d = await api('graphic-series');
    return `<p class="note">design-source ≠ print-master ≠ product-mockup. Only a print-master is ever sent to production.</p>
<div class="tablewrap"><table><thead><tr><th>Design</th><th>Field</th><th>Status</th><th>Design-source</th><th>Print-master</th><th>Product-mockup</th><th>Products</th><th>Print area</th><th>Method</th><th>Approval</th><th class="n">Units</th><th class="n">Revenue</th><th class="n">Unit margin</th><th class="n">Returns</th></tr></thead><tbody>
${d.designs.map((g) => `<tr><td><b>${esc(g.name)}</b></td><td>${esc(g.field || '')}</td><td>${st(g.status.toLowerCase())}</td><td class="muted">${esc(g.designSource || '—')}</td><td>${g.printMaster ? st('confirmed') : '<span class="st warn">missing</span>'}</td><td class="muted">${esc(g.productMockup || '—')}</td><td>${g.products.map(esc).join('<br>')}</td><td class="muted">${esc(g.printArea)}</td><td>${esc(g.method)}</td><td>${st(g.approval)}</td><td class="n">${num(g.units)}</td><td class="n">${eur(g.revenue)}</td><td class="n">${eur(g.unitContribution)}</td><td class="n">${pct(g.returnRate)}</td></tr>`).join('')}
</tbody></table></div>`;
  },

  async inventory() {
    const d = await api('inventory');
    return `<p class="note">${esc(d.note)}</p><div class="tablewrap"><table><thead><tr><th>Product</th><th>Colour</th><th>Sizes</th><th>Sellable</th><th>Supplier availability</th><th>Status</th><th>Last sync</th><th>Warning</th></tr></thead><tbody>
${d.rows.map((r) => `<tr><td>${esc(r.product)}</td><td>${esc(r.color)}</td><td>${r.sizes.map(esc).join(' ')}</td><td>${r.purchasable ? 'yes' : 'no'}</td><td>${na('Waiting for provider')}</td><td>${st(r.status)}</td><td>${date(r.lastSync)}</td><td class="muted">${esc(r.warning || '')}</td></tr>`).join('')}
</tbody></table></div>`;
  },

  async customers(params) {
    const q = params.get('q') || '';
    const d = await api(`customers?q=${encodeURIComponent(q)}`);
    return `<div class="toolbar"><form id="cust-q"><label class="sr" for="cq">Search</label><input id="cq" type="search" name="q" value="${esc(q)}" placeholder="E-mail or name"></form><span class="muted">${num(d.count)} customers</span></div>
<div class="tablewrap"><table><thead><tr><th>Customer</th><th>Country</th><th class="n">Orders</th><th class="n">Lifetime value</th><th class="n">Average order</th><th>Last purchase</th><th class="n">Refunds</th><th>A Circle</th><th>Communication</th><th>Segments</th></tr></thead><tbody>
${d.customers.length ? d.customers.map((c) => `<tr><td>${c.name ? `${esc(c.name)}<br>` : ''}<span class="muted">${esc(c.email)}</span></td><td>${esc(c.country || '')}</td><td class="n">${num(c.orders)}</td><td class="n">${eur(c.ltv)}</td><td class="n">${eur(c.aov)}</td><td>${date(c.lastOrder)}</td><td class="n">${num(c.refunds)}</td>
<td>${c.circle ? `${st(c.circle.status === 'active' ? 'member' : c.circle.status)}<br><span class="muted">${date(c.circle.joinedAt)}</span>` : ''}</td><td class="muted">${[c.circle?.status === 'active' ? 'A Circle' : '', c.newsletter === 'confirmed' ? 'newsletter' : ''].filter(Boolean).join(', ') || 'none'}</td><td class="muted">${c.segments.map(esc).join(', ')}</td></tr>`).join('') : '<tr><td colspan="10" class="empty">No customers yet.</td></tr>'}
</tbody></table></div>`;
  },

  async circle() {
    const d = await api(`circle?${rangeQuery()}`);
    const s = d.summary;
    const cmp = s.compare;
    const crow = (k, f) => `<tr><td>${esc(k)}</td><td class="n">${f(cmp.members)}</td><td class="n">${f(cmp.nonMembers)}</td></tr>`;
    return `
<dl class="kpis">
  ${kpi('Members', num(s.members))}${kpi('New members', num(s.newMembers))}${kpi('Pending confirmation', num(s.pending))}${kpi('Left', num(s.left))}
  ${kpi('Member revenue', eur(s.memberRevenue))}${kpi('Member average order', eur(s.memberAov))}${kpi('Member repeat rate', pct(s.repeatRate))}${kpi('Early access performance', na(d.earlyAccessReason))}
</dl>
<div class="cols2">
<section class="sec"><h2>Members vs non-members</h2><div class="tablewrap"><table><thead><tr><th></th><th class="n">Members</th><th class="n">Non-members</th></tr></thead><tbody>
${crow('Customers', (g) => num(g.customers))}${crow('Orders', (g) => num(g.orders))}${crow('Average order', (g) => eur(g.aov))}${crow('Repeat purchase', (g) => pct(g.repeatRate))}${crow('Lifetime value', (g) => eur(g.ltv))}${crow('Refund rate', (g) => pct(g.refundRate))}${crow('Contribution', (g) => eur(g.contribution))}
</tbody></table></div></section>
<section class="sec"><h2>Segments</h2><dl class="facts">${['new_member', 'active_member', 'repeat_customer', 'high_ltv', 'inactive_member', 'private_candidate'].map((k) => `<dt>${esc(k)}</dt><dd class="num">${num(d.segments[k] || 0)}</dd>`).join('')}</dl>
<p class="note">Circle · ${num(s.tiers.circle)} &nbsp; Private · ${num(s.tiers.circle_private)} (prepared, not public)</p></section>
</div>
<section class="sec"><h2>Members</h2><div class="tablewrap"><table><thead><tr><th>Member</th><th>Status</th><th>Joined</th><th>Lang</th><th>Source</th><th class="n">Orders</th><th class="n">LTV</th><th>Last order</th><th>Preferences</th><th>Consent</th><th>Segments</th></tr></thead><tbody>
${d.members.length ? d.members.map((m) => `<tr><td>${m.firstName ? `${esc(m.firstName)}<br>` : ''}<span class="muted">${esc(m.email)}</span></td><td>${st(m.status)}</td><td>${date(m.joinedAt)}</td><td>${esc(m.lang)}</td><td>${esc(m.source || '')}</td><td class="n">${num(m.orders)}</td><td class="n">${eur(m.ltv)}</td><td>${date(m.lastOrder)}</td><td class="muted">${esc(Object.entries(m.prefs || {}).filter(([, v]) => v).map(([k]) => k).join(', '))}</td><td class="muted">${esc(m.consentVersion)}</td><td class="muted">${m.segments.map(esc).join(', ')}</td></tr>`).join('') : '<tr><td colspan="11" class="empty">No members yet.</td></tr>'}
</tbody></table></div></section>
<section class="sec"><h2>Consent log</h2><div class="tablewrap"><table><thead><tr><th>Time</th><th>E-mail</th><th>Action</th></tr></thead><tbody>
${d.consentLog.length ? d.consentLog.map((l) => `<tr><td>${dateTime(l.created_at)}</td><td>${esc(l.email)}</td><td>${esc(l.action)}</td></tr>`).join('') : '<tr><td colspan="3" class="empty">Empty.</td></tr>'}
</tbody></table></div></section>`;
  },

  async analytics() {
    const d = await api(`analytics?${rangeQuery()}`);
    const seg = (rows, label, limit = 15) => `<div class="tablewrap"><table><thead><tr><th>${esc(label)}</th><th class="n">Sessions</th><th class="n">Pages / session</th><th class="n">Carts</th><th class="n">Checkouts</th><th class="n">Purchases</th><th class="n">Revenue</th><th class="n">Conversion</th></tr></thead><tbody>${rows.length ? rows.slice(0, limit).map((r) => `<tr><td>${esc(r.key)}</td><td class="n">${num(r.sessions)}</td><td class="n">${num(r.pagesPerSession)}</td><td class="n">${num(r.carts)}</td><td class="n">${num(r.checkouts)}</td><td class="n">${num(r.purchases)}</td><td class="n">${eur(r.revenue)}</td><td class="n">${pct(r.conversion)}</td></tr>`).join('') : '<tr><td colspan="8" class="empty">No data yet.</td></tr>'}</tbody></table></div>`;
    const bars = (rows, labelOf, max = Math.max(1, ...rows.map((r) => r.sessions))) => `<div class="bars">${rows.map((r) => `<div class="bar" title="${esc(labelOf(r))}: ${r.sessions}"><span class="bar__fill" data-h="${Math.round((r.sessions / max) * 100)}"></span><small>${esc(labelOf(r))}</small></div>`).join('')}</div>`;
    const funnel = d.funnel.map((s) => `<div class="fn"><span class="fn__label">${esc(s.step)}</span><span class="fn__track"><span class="fn__bar" data-w="${s.ofSessions ?? 0}"></span></span><span class="fn__n num">${num(s.n)}</span><span class="fn__p num">${s.ofPrevious == null ? '' : `${esc(fmtNum.format(s.ofPrevious))} %`}</span></div>`).join('');
    const trend = { step: 'day', points: d.trend.map((t) => ({ date: t.date, revenue: t.revenue, orders: t.orders })) };
    const html = `<p class="note">${esc(d.note)} Purchases and revenue come from the orders; ${d.attributed.orders} of ${d.attributed.of} paid order(s) could be linked to a consented session.</p>
<section class="sec"><h2>What the data says</h2><div class="panel"><ul class="alerts">${d.insights.map((t) => `<li class="info"><span class="dot" aria-hidden="true"></span><div>${esc(t)}</div></li>`).join('')}</ul></div></section>
<dl class="kpis">
  ${kpi('Sessions', `${num(d.sessions)}${delta(d.sessions, d.previous.sessions)}`)}${kpi('Visitors', num(d.visitors))}${kpi('New / returning', `${num(d.newSessions)} / ${num(d.returningSessions)}`)}${kpi('Page views', num(d.pageViews))}
  ${kpi('Pages per session', num(d.pagesPerSession))}${kpi('One-page sessions', pct(d.bounceRate))}${kpi('Avg. time per page', d.avgSecondsPerPage == null ? '<span class="na">—</span>' : `${num(d.avgSecondsPerPage)} s`)}${kpi('Avg. scroll depth', pct(d.avgScroll))}
  ${kpi('Purchases', num(d.purchases))}${kpi('Revenue', eur(d.revenue))}${kpi('Conversion', pct(d.conversion))}${kpi('Repeat purchase rate', pct(d.repeatPurchaseRate))}
  ${kpi('Carts without checkout', `${num(d.abandonment.cartsWithoutCheckout)} <span class="delta">${d.abandonment.cartAbandonRate == null ? '' : esc(fmtNum.format(d.abandonment.cartAbandonRate)) + ' %'}</span>`)}${kpi('Unpaid checkouts', `${num(d.abandonment.unpaidCheckouts)} <span class="delta">${eur(d.abandonment.unpaidValue)}</span>`)}${kpi('A Circle / newsletter sign-ups', `${num(d.signups.circle)} / ${num(d.signups.newsletter)}`)}${kpi('Size guide opened', num(d.sizeGuideOpens))}
</dl>
<div class="cols2">
  <section class="sec"><h2>Funnel</h2><div class="panel funnel">${funnel}<p class="note">Bar: share of all sessions. Right: share of the previous step.</p></div></section>
  <section class="sec"><h2>Revenue &amp; orders per day</h2><div class="panel chart">${chart(trend)}</div></section>
</div>
<section class="sec"><h2>Channels</h2>${seg(d.byMedium, 'Channel')}</section>
<div class="cols2"><section class="sec"><h2>Sources</h2>${seg(d.bySource, 'Source')}</section><section class="sec"><h2>Campaigns (utm)</h2>${seg(d.byCampaign, 'Campaign')}</section></div>
<section class="sec"><h2>Landing pages</h2>${seg(d.byLanding, 'Landing page')}</section>
<section class="sec"><h2>Pages</h2><div class="tablewrap"><table><thead><tr><th>Page</th><th class="n">Views</th><th class="n">Landings</th><th class="n">Avg. time</th><th class="n">Avg. scroll</th></tr></thead><tbody>${d.pages.length ? d.pages.map((p) => `<tr><td>${esc(p.path)}</td><td class="n">${num(p.views)}</td><td class="n">${num(p.landings)}</td><td class="n">${p.avgSeconds == null ? '<span class="na">—</span>' : `${num(p.avgSeconds)} s`}</td><td class="n">${pct(p.avgScroll)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">No data yet.</td></tr>'}</tbody></table></div></section>
<section class="sec"><h2>Products</h2><div class="tablewrap"><table><thead><tr><th>Product</th><th class="n">Views</th><th class="n">Viewers</th><th class="n">Add to cart</th><th class="n">Add rate</th><th class="n">Units sold</th><th class="n">Revenue</th><th class="n">Conversion</th><th>Colours chosen</th><th>Sizes chosen</th></tr></thead><tbody>${d.products.length ? d.products.map((p) => `<tr><td>${esc(p.name)}<br><span class="muted">${esc(p.id)}</span></td><td class="n">${num(p.views)}</td><td class="n">${num(p.sessions)}</td><td class="n">${num(p.addToCart)}</td><td class="n">${pct(p.addRate)}</td><td class="n">${num(p.units)}</td><td class="n">${eur(p.revenue)}</td><td class="n">${pct(p.conversion)}</td><td>${p.colors.map(esc).join('<br>')}</td><td>${p.sizes.map(esc).join('<br>')}</td></tr>`).join('') : '<tr><td colspan="10" class="empty">No product view in this period.</td></tr>'}</tbody></table></div></section>
<div class="cols2"><section class="sec"><h2>Devices</h2>${seg(d.byDevice, 'Device')}</section><section class="sec"><h2>Screen width</h2>${seg(d.byScreen, 'Screen (s < 600 · m < 1024 · l < 1440 · xl)')}</section></div>
<div class="cols2"><section class="sec"><h2>Countries</h2>${seg(d.byCountry, 'Country')}</section><section class="sec"><h2>Languages</h2>${seg(d.byLanguage, 'Language')}</section></div>
<section class="sec"><h2>New vs returning visitors</h2>${seg(d.byVisitorType, 'Visitor')}</section>
<div class="cols2"><section class="sec"><h2>Hour of day (Berlin)</h2><div class="panel">${bars(d.hours, (r) => String(r.hour).padStart(2, '0'))}</div></section><section class="sec"><h2>Weekday</h2><div class="panel">${bars(d.weekdays, (r) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][r.day])}</div></section></div>
<div class="cols2">
<section class="sec"><h2>Shop searches</h2><div class="tablewrap"><table><thead><tr><th>Term</th><th class="n">Searches</th><th class="n">No result</th></tr></thead><tbody>${d.searches.length ? d.searches.map((t) => `<tr><td>${esc(t.term)}</td><td class="n">${num(t.count)}</td><td class="n">${num(t.zero)}</td></tr>`).join('') : '<tr><td colspan="3" class="empty">No search yet.</td></tr>'}</tbody></table></div></section>
<section class="sec"><h2>Missing pages (404)</h2><div class="tablewrap"><table><thead><tr><th>Address</th><th class="n">Visits</th></tr></thead><tbody>${d.notFound.length ? d.notFound.map((x) => `<tr><td>${esc(x.path)}</td><td class="n">${num(x.n)}</td></tr>`).join('') : '<tr><td colspan="2" class="empty">None.</td></tr>'}</tbody></table></div></section>
</div>`;
    queueMicrotask(sizeBars);
    return html;
  },

  async settings() {
    const s = await api('settings');
    return `<dl class="facts">
<dt>Site</dt><dd>${esc(s.site.mode)} · ${esc(s.site.origin || '')}</dd>
<dt>Stripe</dt><dd>${esc(s.stripe)} · webhook ${s.stripeWebhook ? 'configured' : 'missing'}</dd>
<dt>E-mail</dt><dd>${esc(s.mail)}</dd>
<dt>Fulfillment</dt><dd>${esc(s.fulfillment.provider)} · ${esc(s.fulfillment.mode)}</dd>
<dt>VAT</dt><dd>${esc(s.vat.mode)}${s.vat.oss ? ' · OSS' : ''}</dd>
<dt>Cost model</dt><dd>payment ${esc(fmtNum.format(s.costModel.paymentPct * 100))} % + ${esc(fmtEur.format(s.costModel.paymentFixed))} · neck label ${esc(fmtEur.format(s.costModel.neckLabelNet))} net · supplier VAT ${esc(fmtNum.format(s.costModel.vat * 100))} %</dd>
<dt>A Circle thresholds</dt><dd>high LTV ${esc(fmtEur.format(s.circle.highLtv))} · private candidate from ${esc(s.circle.privateOrders)} orders (internal only)</dd>
</dl><p class="note">Read only. Configuration lives on the Worker (wrangler.toml and secrets) so nothing here can switch production on by accident.</p>`;
  },
};

// bar sizes are set through the CSSOM (allowed by the CSP), never with inline style attributes
function sizeBars() {
  $$('.bar__fill[data-h]').forEach((el) => { el.style.height = `${Math.max(2, Number(el.dataset.h))}%`; });
  $$('.fn__bar[data-w]').forEach((el) => { el.style.width = `${Math.max(0.5, Number(el.dataset.w))}%`; });
}

// ---------------------------------------------------------------- router
async function render() {
  const [pathPart, query = ''] = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('?');
  const params = new URLSearchParams(query);
  const [view, arg] = pathPart.split('/');
  const name = view === 'orders' && arg ? 'order' : views[view] ? view : 'dashboard';
  $('#view-title').textContent = name === 'order' ? 'Order' : TITLES[name];
  $$('.side__nav a').forEach((a) => (a.dataset.view === (name === 'order' ? 'orders' : name) ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  $('#range-tools').hidden = !['dashboard', 'circle', 'analytics'].includes(name);
  $('#side').classList.remove('open');
  const el = $('#view');
  el.innerHTML = '<p class="empty">Loading…</p>';
  try {
    el.innerHTML = await views[name](params, arg && decodeURIComponent(arg));
    sizeBars();
  } catch (e) {
    if (e.message !== 'forbidden') el.innerHTML = `<p class="empty">Could not load (${esc(e.message)}).</p>`;
  }
}

$('#view').addEventListener('click', (e) => {
  const t = e.target.closest('[data-filter],[data-by],[data-order],[data-href]');
  if (!t) return;
  if (t.dataset.filter) location.hash = `#/orders?filter=${t.dataset.filter}`;
  else if (t.dataset.by) location.hash = `#/finance?by=${t.dataset.by}`;
  else if (t.dataset.order && !e.target.closest('a')) location.hash = `#/orders/${t.dataset.order}`;
  else if (t.dataset.href) location.hash = t.dataset.href;
});
$('#view').addEventListener('submit', async (e) => {
  if (e.target.id === 'cust-q') {
    e.preventDefault();
    location.hash = `#/customers?q=${encodeURIComponent(new FormData(e.target).get('q'))}`;
  }
  if (e.target.id === 'costs') {
    e.preventDefault();
    try {
      await apiPost(`orders/${encodeURIComponent(e.target.dataset.id)}/costs`, Object.fromEntries(new FormData(e.target)));
      render();
    } catch (err) {
      alertBox(`Not saved (${err.message}).`);
    }
  }
});
function alertBox(msg) {
  const p = document.createElement('p');
  p.className = 'note';
  p.setAttribute('role', 'alert');
  p.textContent = msg;
  $('#view').prepend(p);
}
window.addEventListener('hashchange', render);

async function start() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  try {
    const s = await api('settings');
    $('#mode-pill').textContent = `${s.site.mode} · ${s.fulfillment.mode}`;
    const a = await api('alerts');
    const n = a.alerts.filter((x) => x.level === 'error').length;
    $('#alert-count').hidden = !n;
    $('#alert-count').textContent = String(n);
  } catch { /* handled by api() */ }
  render();
}

if (token) start();
else $('#login').hidden = false;
