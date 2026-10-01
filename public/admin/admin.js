/* Nomad admin, shared by every store: overview per store, setup checklist, orders (retry supplier order, mark as handled). */
(function () {
  'use strict';
  var KEY = 'nomad-admin';
  var current = 'all';
  try {
    current = sessionStorage.getItem('nomad-admin-store') || 'all';
  } catch (e) {
    current = 'all';
  }
  var $ = function (id) {
    return document.getElementById(id);
  };
  var password = '';
  try {
    password = sessionStorage.getItem(KEY) || '';
  } catch (e) {
    password = '';
  }
  var euros = function (c) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((c || 0) / 100);
  };
  var el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  var STATUS = {
    paid: 'Payée',
    supplier_ordered: 'Chez le fournisseur',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    needs_attention: 'Action requise',
    cancelled: 'Annulée',
  };
  var last = null;

  function api(method, body) {
    return fetch('/api/admin', {
      method: method,
      headers: { authorization: 'Bearer ' + password, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      if (r.status === 401) throw new Error('auth');
      return r.json();
    });
  }

  function brandOf(d, id) {
    var s = d.stores.filter(function (x) {
      return x.id === id;
    })[0];
    return s ? s.brand : id;
  }

  function renderTabs(d) {
    var tabs = $('store-tabs');
    tabs.textContent = '';
    if (current !== 'all' && !d.stores.some(function (s) { return s.id === current; })) current = 'all';
    [{ id: 'all', brand: 'Toutes', stats: d.stats }].concat(d.stores).forEach(function (s) {
      var b = el('button', 'store-tab' + (s.id === current ? ' on' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(s.id === current));
      b.append(el('b', '', s.brand), el('span', 'muted small', s.stats.orders + ' cmd' + (s.stats.attention ? ' · ' + s.stats.attention + ' ⚠' : '')));
      b.addEventListener('click', function () {
        current = s.id;
        try {
          sessionStorage.setItem('nomad-admin-store', current);
        } catch (e) {
          /* session only */
        }
        render(last);
      });
      tabs.append(b);
    });
  }

  function render(d) {
    last = d;
    renderTabs(d);
    var sel = current === 'all' ? null : d.stores.filter(function (s) { return s.id === current; })[0];
    var st = sel ? sel.stats : d.stats;
    var kpis = $('kpis');
    kpis.textContent = '';
    [
      ['Chiffre d’affaires', euros(st.revenueCents)],
      ['Marge estimée', euros(st.estimatedMarginCents)],
      ['Commandes', String(st.orders)],
      ['Clients', String(st.customers)],
      ['Action requise', String(st.attention)],
    ].forEach(function (k, i) {
      var box = el('div', 'kpi' + (i === 4 && st.attention ? ' warn' : ''));
      box.append(el('span', 'muted small', k[0]), el('b', '', k[1]));
      kpis.append(box);
    });

    var setup = $('setup');
    setup.textContent = '';
    [
      [d.setup.stripe, 'Stripe : paiement + webhook (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)'],
      [d.setup.cj, 'CJdropshipping : clé API (CJ_API_KEY)'],
      [d.setup.cjAutoPay, 'Paiement fournisseur automatique (CJ_AUTO_PAY=true, solde CJ approvisionné)'],
      [d.setup.notifications, 'Notifications sur le téléphone (NTFY_TOPIC)'],
    ]
      .concat(
        d.stores.map(function (s) {
          return [s.mappedProducts === s.activeProducts, s.brand + ' : produits reliés à CJ ' + s.mappedProducts + ' / ' + s.activeProducts + ' · ' + s.url.replace('https://', '')];
        }),
      )
      .forEach(function (s) {
      var li = el('li', s[0] ? 'ok' : 'todo');
      li.append(el('span', '', s[0] ? '✓' : '○'), el('span', '', s[1]));
      setup.append(li);
    });

    var only = $('only-attention').checked;
    var rows = d.orders.filter(function (o) {
      return (!only || o.attention) && (current === 'all' || o.store === current);
    });
    var tbody = $('orders');
    tbody.textContent = '';
    $('empty').hidden = rows.length > 0;
    rows.forEach(function (o) {
      var tr = el('tr', o.attention ? 'attention' : '');
      var who = el('td');
      who.append(el('b', '', o.customer.name || '—'), el('br'), el('span', 'muted small', o.customer.email));
      who.append(el('br'), el('span', 'muted small', [o.shipping.city, o.shipping.country].filter(Boolean).join(', ')));
      var items = el(
        'td',
        '',
        o.items
          .map(function (i) {
            return i.qty + '× ' + i.name;
          })
          .join(', '),
      );
      var status = el('td');
      status.append(el('span', 'chip chip-' + o.status, STATUS[o.status] || o.status));
      if (o.attention) status.append(el('p', 'attn small', o.attention));
      var sup = el('td', 'small');
      sup.append(el('span', '', o.supplier.orderId ? 'CJ ' + o.supplier.orderId : '—'));
      if (o.supplier.status) sup.append(el('br'), el('span', 'muted', o.supplier.status));
      if (o.supplier.trackNumber) sup.append(el('br'), el('span', '', '📦 ' + o.supplier.trackNumber));
      var shop = el('td');
      shop.append(el('span', 'chip chip-store', brandOf(d, o.store)));
      var actions = el('td', 'actions');
      if (o.attention) {
        var retry = el('button', 'btn btn-dark btn-xs', 'Renvoyer au fournisseur');
        retry.type = 'button';
        retry.addEventListener('click', function () {
          act('retry', o.sessionId, retry);
        });
        var done = el('button', 'link', 'Traité à la main');
        done.type = 'button';
        done.addEventListener('click', function () {
          act('resolve', o.sessionId, done);
        });
        actions.append(retry, done);
      }
      tr.append(
        el('td', '', o.number),
        shop,
        el('td', 'small', new Date(o.createdAt).toLocaleString('fr-FR')),
        who,
        items,
        el('td', '', euros(o.totalCents)),
        status,
        sup,
        actions,
      );
      tbody.append(tr);
    });
  }

  function act(action, sessionId, btn) {
    btn.disabled = true;
    api('POST', { action: action, sessionId: sessionId })
      .then(load)
      .catch(function () {
        btn.disabled = false;
      });
  }

  function load() {
    return api('GET')
      .then(function (d) {
        $('login').hidden = true;
        $('app').hidden = false;
        $('logout').hidden = false;
        render(d);
      })
      .catch(function () {
        $('login').hidden = false;
        $('app').hidden = true;
        if (password) $('login-error').hidden = false;
      });
  }

  $('login').addEventListener('submit', function (e) {
    e.preventDefault();
    password = e.target.password.value;
    try {
      sessionStorage.setItem(KEY, password);
    } catch (err) {
      /* session only */
    }
    load();
  });
  $('logout').addEventListener('click', function () {
    try {
      sessionStorage.removeItem(KEY);
    } catch (err) {
      /* ignore */
    }
    location.reload();
  });
  $('only-attention').addEventListener('change', function () {
    if (last) render(last);
  });
  if (password) load();
  setInterval(function () {
    if (!$('app').hidden) load();
  }, 60000);
})();
