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

    renderCatalog(d);
    renderFunnel(d);
    renderReviews(d);
    renderCrm(d);

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

  function renderCrm(d) {
    var by = {};
    d.orders
      .filter(function (o) {
        return o.customer && o.customer.email && (current === 'all' || o.store === current);
      })
      .forEach(function (o) {
        var k = o.customer.email.toLowerCase();
        var c = (by[k] = by[k] || { name: '', email: k, phone: '', city: '', stores: {}, orders: 0, total: 0, last: '' });
        c.name = c.name || o.customer.name || '';
        c.phone = c.phone || o.customer.phone || '';
        c.city = [o.shipping.city, o.shipping.country].filter(Boolean).join(', ') || c.city;
        c.stores[brandOf(d, o.store)] = true;
        c.orders += 1;
        c.total += o.totalCents || 0;
        if (o.createdAt > c.last) c.last = o.createdAt;
      });
    var list = Object.keys(by)
      .map(function (k) { return by[k]; })
      .sort(function (a, b) { return b.last.localeCompare(a.last); });
    $('crm-count').textContent = list.length + ' client' + (list.length > 1 ? 's' : '') + (list.length ? ' · clients récurrents : ' + list.filter(function (c) { return c.orders > 1; }).length : '');
    var tbody = $('crm');
    tbody.textContent = '';
    if (!list.length) {
      var tr0 = el('tr');
      var td0 = el('td', 'muted small', 'Aucun client pour l’instant — ils apparaîtront ici à la première commande.');
      td0.colSpan = 6;
      tr0.append(td0);
      tbody.append(tr0);
      return;
    }
    list.forEach(function (c) {
      var tr = el('tr');
      var who = el('td');
      var mail = el('a', '', c.email);
      mail.href = 'mailto:' + c.email;
      who.append(el('b', '', c.name || '—'), el('br'), mail);
      if (c.phone) who.append(el('br'), el('span', 'muted small', c.phone));
      tr.append(who, el('td', 'small', Object.keys(c.stores).join(', ')), el('td', 'small', c.city), el('td', '', String(c.orders)), el('td', '', euros(c.total)), el('td', 'small', new Date(c.last).toLocaleDateString('fr-FR')));
      tbody.append(tr);
    });
  }

  function renderReviews(d) {
    var box = $('reviews');
    box.textContent = '';
    var list = (d.pendingReviews || []).filter(function (r) {
      return current === 'all' || r.store === current;
    });
    if (!list.length) {
      box.append(el('p', 'muted small', 'Aucun avis en attente.'));
      return;
    }
    list.forEach(function (r) {
      var card = el('div', 'review-mod');
      var head = el('p');
      head.append(el('b', '', '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) + ' '), el('span', '', brandOf(d, r.store) + ' · ' + r.product + ' · ' + r.name + ' · ' + r.order));
      card.append(head);
      if (r.title) card.append(el('p', '', r.title));
      card.append(el('p', 'muted', r.text));
      var ok = el('button', 'btn btn-dark btn-xs', 'Publier');
      ok.type = 'button';
      var no = el('button', 'link', 'Refuser');
      no.type = 'button';
      ok.addEventListener('click', function () {
        moderate('approveReview', r.id, ok);
      });
      no.addEventListener('click', function () {
        moderate('rejectReview', r.id, no);
      });
      var row = el('div', 'actions');
      row.append(ok, no);
      card.append(row);
      box.append(card);
    });
  }

  function moderate(action, id, btn) {
    btn.disabled = true;
    api('POST', { action: action, reviewId: id })
      .then(load)
      .catch(function () {
        btn.disabled = false;
      });
  }

  function renderFunnel(d) {
    var list = d.stores.filter(function (s) {
      return current === 'all' || s.id === current;
    });
    var sum = { view: 0, product: 0, add: 0, checkout: 0, orders: 0, products: {} };
    var names = {};
    list.forEach(function (s) {
      var f = s.funnel || {};
      ['view', 'product', 'add', 'checkout', 'orders'].forEach(function (k) {
        sum[k] += f[k] || 0;
      });
      (s.catalog || []).forEach(function (p) {
        names[p.id] = (current === 'all' ? s.brand + ' · ' : '') + p.name;
      });
      Object.keys(f.products || {}).forEach(function (id) {
        var a = (sum.products[id] = sum.products[id] || { product: 0, add: 0, sold: 0 });
        a.product += f.products[id].product;
        a.add += f.products[id].add;
        a.sold += f.products[id].sold;
      });
    });
    var pct = function (a, b) {
      return b ? Math.round((a / b) * 1000) / 10 + ' %' : '—';
    };
    var steps = [
      ['Pages vues', sum.view, null],
      ['Fiches produit', sum.product, pct(sum.product, sum.view)],
      ['Ajouts au panier', sum.add, pct(sum.add, sum.product)],
      ['Passages au paiement', sum.checkout, pct(sum.checkout, sum.add)],
      ['Commandes', sum.orders, pct(sum.orders, sum.checkout)],
    ];
    var max = Math.max(1, sum.view);
    var box = $('funnel');
    box.textContent = '';
    steps.forEach(function (s) {
      var row = el('div', 'funnel-row');
      var bar = el('div', 'funnel-bar');
      bar.style.width = Math.max(2, (s[1] / max) * 100) + '%';
      row.append(el('span', 'funnel-label', s[0]), bar, el('b', '', String(s[1])), el('span', 'muted small', s[2] ? '↳ ' + s[2] : ''));
      box.append(row);
    });
    box.append(el('p', 'muted small', 'Conversion globale (commandes / pages vues) : ' + pct(sum.orders, sum.view)));
    var tbody = $('funnel-products');
    tbody.textContent = '';
    Object.keys(sum.products)
      .sort(function (a, b) {
        return sum.products[b].product - sum.products[a].product;
      })
      .slice(0, 20)
      .forEach(function (id) {
        var p = sum.products[id];
        var tr = el('tr');
        tr.append(el('td', '', names[id] || id), el('td', '', String(p.product)), el('td', '', String(p.add)), el('td', '', pct(p.add, p.product)), el('td', '', String(p.sold)));
        tbody.append(tr);
      });
  }

  function renderCatalog(d) {
    var tbody = $('catalog');
    tbody.textContent = '';
    d.stores
      .filter(function (s) {
        return current === 'all' || s.id === current;
      })
      .forEach(function (s) {
        (s.catalog || []).forEach(function (p) {
          p.parts.forEach(function (c, i) {
            var tr = el('tr', p.active ? '' : 'muted');
            var src = c.sourcing || {};
            var first = i === 0;
            var ref = el('td', 'small');
            var a = el('a', '', c.sku || '—');
            a.href = c.url;
            a.target = '_blank';
            a.rel = 'noopener';
            ref.append(el('span', '', p.parts.length > 1 ? c.qty + '× ' : ''), a);
            if (!c.vid) ref.append(el('br'), el('span', 'attn small', 'variante (vid) à confirmer'));
            tr.append(
              el('td', '', first ? s.brand : ''),
              el('td', '', first ? p.name + (p.active ? '' : ' (inactif)') : ''),
              el('td', '', first ? euros(p.priceCents) : ''),
              el('td', '', first ? euros(p.priceCents - p.costCents) : ''),
              ref,
              el('td', 'small', src.listedByStores != null ? String(src.listedByStores) : '—'),
              el('td', 'small', src.supplierRating ? src.supplierRating + '/5' + (src.cjReviews ? ' · ' + src.cjReviews + ' avis' : '') : '—'),
              el('td', 'small', src.amazonDe || '—'),
            );
            tbody.append(tr);
          });
        });
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
