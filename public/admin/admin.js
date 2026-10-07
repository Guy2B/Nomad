/* ALGBr admin: one dashboard for GO, SPACE, EASE, GLOW, KIN and OFF. — to-do inbox, orders with details and
   actions, customers, reviews, catalogue, CJ stock & delivery audit, opportunity radar, setup. Hash routing. */
(function () {
  'use strict';
  var KEY = 'nomad-admin';
  var VIEWS = ['overview', 'orders', 'customers', 'reviews', 'catalog', 'supply', 'radar', 'settings'];
  var store = function (k, v) {
    try {
      if (v === undefined) return sessionStorage.getItem(k);
      sessionStorage.setItem(k, v);
    } catch (e) {
      return null;
    }
    return null;
  };
  var $ = function (id) {
    return document.getElementById(id);
  };
  var el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  };
  var euros = function (c) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((c || 0) / 100);
  };
  var date = function (s, withTime) {
    if (!s) return '—';
    var d = new Date(s);
    return withTime ? d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('fr-FR');
  };
  var ago = function (s) {
    var m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
    if (m < 1) return 'à l’instant';
    if (m < 60) return 'il y a ' + m + ' min';
    var h = Math.round(m / 60);
    if (h < 48) return 'il y a ' + h + ' h';
    return 'il y a ' + Math.round(h / 24) + ' j';
  };

  var STATUS = { paid: 'Payée', supplier_ordered: 'Chez le fournisseur', shipped: 'Expédiée', delivered: 'Livrée', needs_attention: 'À traiter', cancelled: 'Annulée' };
  var DECISION = { SCALE_CANDIDATE: 'À scaler', TEST: 'À tester', VALIDATE_PRICE: 'Valider le prix', SOURCE_NOW: 'Sourcer', WATCH: 'Surveiller', LOW_PRIORITY: 'Faible priorité', REJECT: 'Rejeté' };
  var VERDICT = { DE: 'Stock Allemagne', EU: 'Stock UE', CN: 'Chine seulement' };

  var password = store(KEY) || '';
  var current = store('nomad-admin-store') || 'all';
  var orderFilter = 'all';
  var data = null;
  var radar = null;
  var loadedAt = null;

  // ---------- API ----------
  function api(method, body) {
    return fetch('/api/admin', {
      method: method,
      headers: { authorization: 'Bearer ' + password, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      if (r.status === 401) throw new Error('auth');
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.error || 'error');
        return d;
      });
    });
  }

  function load() {
    $('refresh').disabled = true;
    return api('GET')
      .then(function (d) {
        data = d;
        loadedAt = new Date();
        $('login').hidden = true;
        $('app').hidden = false;
        render();
        if (!radar) loadRadar();
      })
      .catch(function (e) {
        if (e.message === 'auth') {
          $('login').hidden = false;
          $('app').hidden = true;
          if (password) $('login-error').hidden = false;
        } else toast('Chargement impossible : ' + e.message);
      })
      .then(function () {
        $('refresh').disabled = false;
      });
  }

  function loadRadar() {
    fetch('/api/radar', { headers: { authorization: 'Bearer ' + password } })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        radar = d;
        renderRadar();
        renderTodo();
      })
      .catch(function () {
        /* optional */
      });
  }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () {
      t.hidden = true;
    }, 2600);
  }

  // ---------- Helpers on data ----------
  function brands() {
    var list = data.stores.map(function (s) {
      return { id: s.id, brand: s.brand, url: s.url };
    });
    list.push({ id: 'off', brand: 'OFF.', url: 'https://off.algbr.eu' });
    return list;
  }
  function brandOf(id) {
    var b = brands().filter(function (x) {
      return x.id === id;
    })[0];
    return b ? b.brand : id;
  }
  var inScope = function (storeId) {
    return current === 'all' || storeId === current;
  };
  function scopedOrders() {
    return data.orders.filter(function (o) {
      return inScope(o.store);
    });
  }
  function statsOf(orders) {
    var paid = orders.filter(function (o) {
      return o.items && o.items.length;
    });
    var revenue = paid.reduce(function (a, o) {
      return a + (o.totalCents || 0);
    }, 0);
    return {
      orders: paid.length,
      revenueCents: revenue,
      customers: new Set(
        paid.map(function (o) {
          return (o.customer.email || '').toLowerCase();
        }),
      ).size,
      attention: orders.filter(function (o) {
        return o.attention;
      }).length,
      avgCents: paid.length ? Math.round(revenue / paid.length) : 0,
    };
  }
  function scopedStats() {
    var s = statsOf(scopedOrders());
    var src = current === 'all' ? data.stats : current === 'off' ? null : (data.stores.filter(function (x) { return x.id === current; })[0] || {}).stats;
    s.marginCents = src ? src.estimatedMarginCents : null;
    return s;
  }
  function funnelSum() {
    var sum = { view: 0, product: 0, add: 0, checkout: 0, orders: 0, products: {} };
    var names = {};
    data.stores
      .filter(function (s) {
        return inScope(s.id);
      })
      .forEach(function (s) {
        var f = s.funnel || {};
        ['view', 'product', 'add', 'checkout', 'orders'].forEach(function (k) {
          sum[k] += f[k] || 0;
        });
        (s.catalog || []).forEach(function (p) {
          names[p.id] = (current === 'all' ? s.brand + ' · ' : '') + p.name;
        });
        Object.keys(f.products || {}).forEach(function (id) {
          var a = (sum.products[id] = sum.products[id] || { product: 0, add: 0, sold: 0 });
          a.product += f.products[id].product || 0;
          a.add += f.products[id].add || 0;
          a.sold += f.products[id].sold || 0;
        });
      });
    sum.names = names;
    return sum;
  }
  var pct = function (a, b) {
    return b ? (Math.round((a / b) * 1000) / 10).toLocaleString('fr-FR') + ' %' : '—';
  };
  function setupItems() {
    var s = data.setup;
    var items = [
      [s.stripe, 'Paiement Stripe', 'STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET. En mode test tant que la clé commence par sk_test.'],
      [s.cj, 'Clé API CJdropshipping', 'CJ_API_KEY : envoi automatique des commandes au fournisseur.'],
      [s.cjAutoPay, 'Paiement automatique des commandes CJ', 'CJ_AUTO_PAY=true, avec un solde CJ approvisionné. Facultatif.'],
      [s.notifications, 'Notifications sur le téléphone', 'NTFY_TOPIC : une alerte à chaque commande ou problème. Facultatif.'],
      [radar && radar.scores && radar.scores.length, 'Radar d’opportunités', 'Tâche Windows « ALGBr Radar » (scan quotidien) + RADAR_KEY.'],
    ];
    data.stores.forEach(function (st) {
      items.push([st.mappedProducts === st.activeProducts, st.brand + ' : produits reliés à CJ', st.mappedProducts + ' / ' + st.activeProducts + ' · ' + st.url.replace('https://', '')]);
    });
    return items;
  }

  // ---------- Routing ----------
  function view() {
    var v = (location.hash || '#overview').slice(1).split('?')[0];
    return VIEWS.indexOf(v) >= 0 ? v : 'overview';
  }
  function show() {
    var v = view();
    document.querySelectorAll('.view').forEach(function (s) {
      s.hidden = s.dataset.view !== v;
    });
    document.querySelectorAll('#nav a').forEach(function (a) {
      a.classList.toggle('on', a.dataset.view === v);
      if (a.dataset.view === v) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    var q = (location.hash.split('?')[1] || '').match(/f=(\w+)/);
    if (v === 'orders' && q) {
      orderFilter = q[1];
      renderOrders();
    }
    window.scrollTo(0, 0);
  }

  // ---------- Render ----------
  function render() {
    if (!data) return;
    renderBrands();
    renderBadges();
    renderTodo();
    renderKpis();
    renderFunnel();
    renderRecent();
    renderOrders();
    renderCrm();
    renderReviews();
    renderCatalog();
    renderAudit();
    renderRadar();
    renderSetup();
    $('updated').textContent = 'Mis à jour ' + loadedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function renderBrands() {
    var box = $('brands');
    box.textContent = '';
    if (
      current !== 'all' &&
      !brands().some(function (b) {
        return b.id === current;
      })
    )
      current = 'all';
    [{ id: 'all', brand: 'Toutes' }].concat(brands()).forEach(function (b) {
      var orders = data.orders.filter(function (o) {
        return b.id === 'all' || o.store === b.id;
      });
      var attention = orders.filter(function (o) {
        return o.attention;
      }).length;
      var btn = el('button', b.id === current ? 'on' : '');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(b.id === current));
      btn.append(el('span', '', b.brand));
      if (orders.length) btn.append(el('small', '', String(orders.length)));
      if (attention) btn.append(el('i', 'dot'));
      btn.addEventListener('click', function () {
        current = b.id;
        store('nomad-admin-store', current);
        render();
      });
      box.append(btn);
    });
    var links = $('store-links');
    links.textContent = '';
    brands().forEach(function (b) {
      var a = el('a', '', b.brand);
      a.href = b.url;
      a.target = '_blank';
      a.rel = 'noopener';
      links.append(a);
    });
  }

  function renderBadges() {
    var att = scopedOrders().filter(function (o) {
      return o.attention;
    }).length;
    var rev = (data.pendingReviews || []).filter(function (r) {
      return inScope(r.store);
    }).length;
    var missing = setupItems().filter(function (i, n) {
      return !i[0] && n < 2;
    }).length;
    [['badge-orders', att], ['badge-reviews', rev], ['badge-settings', missing]].forEach(function (x) {
      $(x[0]).hidden = !x[1];
      $(x[0]).textContent = String(x[1]);
    });
  }

  function renderTodo() {
    if (!data) return;
    var box = $('todo');
    box.textContent = '';
    var items = [];
    var att = scopedOrders().filter(function (o) {
      return o.attention;
    });
    if (att.length) items.push(['warn', att.length, att.length > 1 ? 'commandes à traiter' : 'commande à traiter', '#orders?f=attention']);
    var rev = (data.pendingReviews || []).filter(function (r) {
      return inScope(r.store);
    }).length;
    if (rev) items.push(['warn', rev, rev > 1 ? 'avis à modérer' : 'avis à modérer', '#reviews']);
    var miss = setupItems().filter(function (i, n) {
      return !i[0] && n < 2;
    }).length;
    if (miss) items.push(['bad', miss, 'réglage' + (miss > 1 ? 's' : '') + ' essentiel' + (miss > 1 ? 's' : '') + ' manquant' + (miss > 1 ? 's' : ''), '#settings']);
    if (radar && radar.scores && radar.scores.length) {
      var hot = radar.scores.filter(function (s) {
        return /TEST|SCALE|SOURCE/.test(s.decision);
      }).length;
      items.push([hot ? 'ok' : '', hot || '—', hot ? 'pistes du radar à tester' : 'radar : scan ' + ago(radar.generatedAt), '#radar']);
    }
    if (!items.length) items.push(['ok', '✓', 'Rien à traiter. Tout roule.', '#orders']);
    items.forEach(function (i) {
      var a = el('a', i[0]);
      a.href = i[3];
      a.append(el('b', '', String(i[1])), el('span', '', i[2]));
      box.append(a);
    });
    var st = scopedStats();
    $('overview-sub').textContent = (current === 'all' ? 'Toutes les boutiques' : brandOf(current)) + ' · ' + st.orders + ' commande' + (st.orders > 1 ? 's' : '') + ' au total';
  }

  function renderKpis() {
    var st = scopedStats();
    var f = funnelSum();
    var box = $('kpis');
    box.textContent = '';
    [
      ['Chiffre d’affaires', euros(st.revenueCents)],
      ['Marge estimée', st.marginCents === null ? '—' : euros(st.marginCents)],
      ['Commandes', String(st.orders)],
      ['Panier moyen', st.orders ? euros(st.avgCents) : '—'],
      ['Clients', String(st.customers)],
      ['Conversion 30 j', pct(f.orders, f.view)],
    ].forEach(function (k) {
      var d = el('div', 'kpi');
      d.append(el('span', '', k[0]), el('b', '', k[1]));
      box.append(d);
    });
  }

  function renderFunnel() {
    var f = funnelSum();
    var box = $('funnel');
    box.textContent = '';
    if (current === 'off') {
      box.append(el('p', 'muted', 'OFF. ne compte pas les visites (pas de mesure sur ce site).'));
    } else {
      var steps = [
        ['Pages vues', f.view, null],
        ['Fiches produit', f.product, pct(f.product, f.view)],
        ['Ajouts au panier', f.add, pct(f.add, f.product)],
        ['Paiement ouvert', f.checkout, pct(f.checkout, f.add)],
        ['Commandes', f.orders, pct(f.orders, f.checkout)],
      ];
      var max = Math.max(1, f.view);
      steps.forEach(function (s) {
        var row = el('div', 'f-row');
        var track = el('div', 'f-track');
        var bar = el('div', 'f-bar');
        bar.style.width = Math.max(1.5, (s[1] / max) * 100) + '%';
        track.append(bar);
        row.append(el('span', '', s[0]), track, el('b', '', String(s[1])), el('span', 'muted small', s[2] ? '↳ ' + s[2] : ''));
        box.append(row);
      });
    }
    var tbody = $('top-products');
    tbody.textContent = '';
    var ids = Object.keys(f.products).sort(function (a, b) {
      return f.products[b].product - f.products[a].product;
    });
    if (!ids.length) return emptyRow(tbody, 5, 'Pas encore de visites mesurées.');
    ids.slice(0, 12).forEach(function (id) {
      var p = f.products[id];
      var tr = el('tr');
      tr.append(el('td', '', f.names[id] || id), el('td', 'num', String(p.product)), el('td', 'num', String(p.add)), el('td', 'num', pct(p.add, p.product)), el('td', 'num', String(p.sold)));
      tbody.append(tr);
    });
  }

  function emptyRow(tbody, cols, text) {
    var tr = el('tr');
    var td = el('td', 'empty', text);
    td.colSpan = cols;
    tr.append(td);
    tbody.append(tr);
  }

  function orderCard(o) {
    var b = el('button', 'order' + (o.attention ? ' attn' : ''));
    b.type = 'button';
    var who = el('div', 'who');
    who.append(el('b', '', o.customer.name || o.customer.email || '—'), el('span', 'muted small', o.number + ' · ' + date(o.createdAt, true)));
    var mid = el('div', 'hide-compact');
    mid.append(el('span', 'chip brand', brandOf(o.store)), document.createTextNode(' '), el('span', 'chip chip-' + o.status, STATUS[o.status] || o.status));
    if (o.test) mid.append(document.createTextNode(' '), el('span', 'chip', 'test'));
    var items = el(
      'div',
      'items muted',
      (o.items || [])
        .map(function (i) {
          return i.qty + '× ' + i.name;
        })
        .join(', '),
    );
    var right = el('div', 'right');
    right.append(el('span', 'total', euros(o.totalCents)));
    if (o.attention) right.append(el('span', 'attn-text', 'À traiter'));
    else if (o.supplier && o.supplier.trackNumber) right.append(el('span', 'muted small', '📦 ' + o.supplier.trackNumber));
    b.append(who, mid, items, right);
    b.addEventListener('click', function () {
      openOrder(o);
    });
    return b;
  }

  function renderRecent() {
    var box = $('recent');
    box.textContent = '';
    var list = scopedOrders().slice(0, 5);
    if (!list.length) box.append(el('p', 'muted', 'Aucune commande pour l’instant.'));
    list.forEach(function (o) {
      box.append(orderCard(o));
    });
  }

  function renderOrders() {
    if (!data) return;
    document.querySelectorAll('#order-filter button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.f === orderFilter);
    });
    var q = $('order-search').value.trim().toLowerCase();
    var list = scopedOrders().filter(function (o) {
      if (orderFilter === 'attention' && !o.attention) return false;
      if (orderFilter === 'open' && (o.attention || ['shipped', 'delivered', 'cancelled'].indexOf(o.status) >= 0)) return false;
      if (orderFilter === 'shipped' && ['shipped', 'delivered'].indexOf(o.status) < 0) return false;
      if (!q) return true;
      var hay = [o.number, o.customer.name, o.customer.email, o.shipping.city]
        .concat(
          (o.items || []).map(function (i) {
            return i.name;
          }),
        )
        .join(' ')
        .toLowerCase();
      return hay.indexOf(q) >= 0;
    });
    var box = $('orders');
    box.textContent = '';
    if (!list.length) box.append(el('div', 'card empty', orderFilter === 'attention' ? 'Aucune commande à traiter. 👌' : 'Aucune commande.'));
    list.forEach(function (o) {
      box.append(orderCard(o));
    });
  }

  // ---------- Order drawer ----------
  function openOrder(o) {
    $('drawer-title').textContent = o.number + ' · ' + brandOf(o.store);
    var body = $('drawer-body');
    body.textContent = '';
    var head = el('div', 'row');
    head.append(el('span', 'chip chip-' + o.status, STATUS[o.status] || o.status), el('span', 'muted', date(o.createdAt, true)), el('b', 'total', euros(o.totalCents)));
    body.append(head);
    if (o.attention) body.append(el('div', 'notice', o.attention));

    var actions = el('div', 'row');
    if (o.attention && o.store !== 'off') actions.append(button('Renvoyer au fournisseur', 'btn primary', function (b) {
      act({ action: 'retry', sessionId: o.sessionId }, b, 'Commande renvoyée à CJ');
    }));
    if (o.attention) actions.append(button('Traité à la main', 'btn', function (b) {
      act({ action: 'resolve', sessionId: o.sessionId }, b, 'Marquée comme traitée');
    }));
    if (actions.childNodes.length) body.append(actions);

    if (['shipped', 'delivered', 'cancelled'].indexOf(o.status) < 0) {
      var ship = el('section');
      ship.append(el('h3', '', 'Expédition à la main'));
      var form = el('form', 'ship-form');
      var tn = el('input');
      tn.type = 'text';
      tn.placeholder = 'N° de suivi (facultatif)';
      tn.setAttribute('aria-label', 'Numéro de suivi');
      var carrier = el('input');
      carrier.type = 'text';
      carrier.value = o.store === 'off' ? 'Hermes' : '';
      carrier.placeholder = 'Transporteur';
      carrier.setAttribute('aria-label', 'Transporteur');
      var go = button('Marquer expédiée', 'btn primary', function () {});
      go.type = 'submit';
      form.append(tn, carrier, go);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        act({ action: 'ship', sessionId: o.sessionId, trackNumber: tn.value, carrier: carrier.value }, go, 'Marquée expédiée');
      });
      ship.append(form, el('p', 'muted small', 'Le client voit le statut et le numéro sur « Suivre ma commande ».'));
      body.append(ship);
    }

    var items = el('section');
    items.append(el('h3', '', 'Articles'));
    (o.items || []).forEach(function (i) {
      var r = el('div', 'row');
      r.append(el('span', '', i.qty + '× ' + i.name), el('span', 'muted', i.unitCents ? euros(i.unitCents) : ''));
      items.append(r);
    });
    body.append(items);

    var cust = el('section');
    cust.append(el('h3', '', 'Client & livraison'));
    var a = o.shipping || {};
    var addr = [a.name || o.customer.name, a.line1, a.line2, [a.postalCode, a.city].filter(Boolean).join(' '), a.country].filter(Boolean).join('\n');
    var box = el('div', 'addr', addr);
    cust.append(box);
    var r2 = el('div', 'row');
    r2.append(button('Copier l’adresse', 'btn sm', function () {
      copy(addr, 'Adresse copiée');
    }));
    if (o.customer.email) {
      var mail = el('a', 'btn sm', 'Écrire au client');
      mail.href = 'mailto:' + o.customer.email + '?subject=' + encodeURIComponent('Ihre Bestellung ' + o.number);
      r2.append(mail);
    }
    cust.append(r2);
    var dl = el('dl');
    [['E-mail', o.customer.email], ['Téléphone', o.customer.phone], ['Paiement', o.test ? 'Stripe (test)' : 'Stripe']].forEach(function (x) {
      if (!x[1]) return;
      dl.append(el('dt', '', x[0]), el('dd', '', x[1]));
    });
    cust.append(dl);
    body.append(cust);

    var sup = el('section');
    sup.append(el('h3', '', 'Fournisseur'));
    var dl2 = el('dl');
    [['Source', o.supplier.provider], ['Commande', o.supplier.orderId], ['Statut', o.supplier.status], ['Transporteur', o.supplier.logisticName], ['Suivi', o.supplier.trackNumber]].forEach(function (x) {
      dl2.append(el('dt', '', x[0]), el('dd', '', x[1] || '—'));
    });
    sup.append(dl2);
    body.append(sup);

    var hist = el('section');
    hist.append(el('h3', '', 'Historique'));
    var ul = el('ul', 'timeline');
    (o.history || []).forEach(function (h) {
      var li = el('li');
      li.append(el('span', 'muted small', date(h.at, true) + ' · '), document.createTextNode(h.event));
      ul.append(li);
    });
    hist.append(ul);
    body.append(hist);
    openDrawer();
  }

  function openDrawer() {
    $('drawer').hidden = false;
    document.body.style.overflow = 'hidden';
    var c = document.querySelector('.drawer-head [data-close]');
    if (c) c.focus();
  }
  function closeDrawer() {
    $('drawer').hidden = true;
    document.body.style.overflow = '';
  }
  function button(label, cls, fn) {
    var b = el('button', cls, label);
    b.type = 'button';
    b.addEventListener('click', function () {
      fn(b);
    });
    return b;
  }
  function copy(text, msg) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () {
      toast(msg);
    });
  }
  function act(body, btn, msg) {
    btn.disabled = true;
    api('POST', body)
      .then(function () {
        toast(msg);
        closeDrawer();
        return load();
      })
      .catch(function (e) {
        btn.disabled = false;
        toast('Erreur : ' + e.message);
      });
  }

  // ---------- Customers ----------
  function renderCrm() {
    var by = {};
    scopedOrders().forEach(function (o) {
      if (!o.customer || !o.customer.email) return;
      var k = o.customer.email.toLowerCase();
      var c = (by[k] = by[k] || { name: '', email: k, phone: '', city: '', stores: {}, orders: 0, total: 0, last: '' });
      c.name = c.name || o.customer.name || '';
      c.phone = c.phone || o.customer.phone || '';
      c.city = [o.shipping.city, o.shipping.country].filter(Boolean).join(', ') || c.city;
      c.stores[brandOf(o.store)] = true;
      c.orders += 1;
      c.total += o.totalCents || 0;
      if (o.createdAt > c.last) c.last = o.createdAt;
    });
    var all = Object.keys(by)
      .map(function (k) {
        return by[k];
      })
      .sort(function (a, b) {
        return b.last.localeCompare(a.last);
      });
    var q = $('crm-search').value.trim().toLowerCase();
    var list = all.filter(function (c) {
      return !q || (c.name + ' ' + c.email + ' ' + c.city).toLowerCase().indexOf(q) >= 0;
    });
    $('crm-count').textContent =
      all.length + ' client' + (all.length > 1 ? 's' : '') + (all.length ? ' · ' + all.filter(function (c) { return c.orders > 1; }).length + ' récurrent(s)' : '');
    var tbody = $('crm');
    tbody.textContent = '';
    if (!list.length) return emptyRow(tbody, 6, all.length ? 'Aucun résultat.' : 'Les clients apparaîtront ici dès la première commande.');
    list.forEach(function (c) {
      var tr = el('tr');
      var who = el('td');
      var mail = el('a', '', c.email);
      mail.href = 'mailto:' + c.email;
      who.append(el('b', '', c.name || '—'), el('span', 'sub', ''));
      who.lastChild.append(mail);
      if (c.phone) who.append(el('span', 'sub', c.phone));
      tr.append(who, el('td', '', Object.keys(c.stores).join(', ')), el('td', '', c.city), el('td', 'num', String(c.orders)), el('td', 'num', euros(c.total)), el('td', '', date(c.last)));
      tbody.append(tr);
    });
  }

  // ---------- Reviews ----------
  function renderReviews() {
    var box = $('reviews');
    box.textContent = '';
    var list = (data.pendingReviews || []).filter(function (r) {
      return inScope(r.store);
    });
    if (!list.length) return box.append(el('div', 'card empty', 'Aucun avis en attente.'));
    list.forEach(function (r) {
      var card = el('div', 'review');
      var head = el('p');
      head.append(el('span', 'stars', '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)), document.createTextNode('  '), el('span', 'muted', brandOf(r.store) + ' · ' + r.product + ' · ' + r.name + ' · ' + r.order));
      card.append(head);
      if (r.title) card.append(el('p', '', r.title));
      card.append(el('p', 'muted', r.text));
      var row = el('div', 'row');
      row.append(
        button('Publier', 'btn primary sm', function (b) {
          act({ action: 'approveReview', reviewId: r.id }, b, 'Avis publié');
        }),
        button('Refuser', 'btn sm', function (b) {
          act({ action: 'rejectReview', reviewId: r.id }, b, 'Avis refusé');
        }),
      );
      card.append(row);
      box.append(card);
    });
  }

  // ---------- Catalogue ----------
  function renderCatalog() {
    var tbody = $('catalog');
    tbody.textContent = '';
    if (current === 'off') return emptyRow(tbody, 6, 'Le stock OFF. se gère dans l’admin OFF. (lien dans le menu).');
    var q = $('catalog-search').value.trim().toLowerCase();
    var inactive = $('catalog-inactive').checked;
    var n = 0;
    data.stores
      .filter(function (s) {
        return inScope(s.id);
      })
      .forEach(function (s) {
        (s.catalog || []).forEach(function (p) {
          if (!p.active && !inactive) return;
          var hay = (p.name + ' ' + p.parts.map(function (c) { return c.sku + ' ' + c.name; }).join(' ')).toLowerCase();
          if (q && hay.indexOf(q) < 0) return;
          n++;
          var tr = el('tr', p.active ? '' : 'dim');
          var name = el('td');
          name.append(el('b', '', p.name), el('span', 'sub', s.brand + (p.parts.length > 1 ? ' · set de ' + p.parts.length : '') + (p.active ? '' : ' · inactif')));
          var margin = p.priceCents - p.costCents;
          var refs = el('td');
          var ship = el('td');
          var sig = el('td');
          p.parts.forEach(function (c) {
            var line = el('div', 'small');
            var a = el('a', '', c.sku || '—');
            a.href = c.url;
            a.target = '_blank';
            a.rel = 'noopener';
            line.append(document.createTextNode(p.parts.length > 1 ? c.qty + '× ' : ''), a);
            if (!c.vid) line.append(el('span', 'attn-text', ' · variante à confirmer'));
            refs.append(line);
            ship.append(el('div', 'small', (c.shippingDays ? c.shippingDays + ' j' : '—') + (c.logisticName ? ' · ' + c.logisticName : '')));
            var src = c.sourcing || {};
            sig.append(el('div', 'small muted', [src.supplierRating ? src.supplierRating + '/5' : '', src.listedByStores != null ? src.listedByStores + ' boutiques' : ''].filter(Boolean).join(' · ') || '—'));
          });
          var m = el('td', 'num');
          m.append(el('span', margin / p.priceCents < 0.3 ? 'attn-text' : 'ok-text', euros(margin)), el('span', 'sub', Math.round((margin / p.priceCents) * 100) + ' %'));
          tr.append(name, el('td', 'num', euros(p.priceCents)), m, refs, ship, sig);
          tbody.append(tr);
        });
      });
    if (!n) emptyRow(tbody, 6, 'Aucun produit.');
  }

  // ---------- Supply audit ----------
  function quote(q) {
    return q.days.min + '–' + q.days.max + ' j · $' + q.priceUsd.toFixed(2);
  }
  function routeCell(r, to) {
    var td = el('td', 'small');
    (r.routes || [])
      .filter(function (x) {
        return x.to === to;
      })
      .forEach(function (x) {
        if (x.error) return td.append(el('div', 'muted', x.from + ' : pas de route'));
        var txt = x.from + ' : ' + quote(x.cheapest);
        if (x.fastest.days.max < x.cheapest.days.max) txt += ' (express ' + quote(x.fastest) + ')';
        td.append(el('div', x.from !== 'CN' && x.cheapest.days.max <= 5 ? 'ok-route' : '', txt));
      });
    return td;
  }
  function altCell(id) {
    var td = el('td', 'small');
    var x = data.alternatives && data.alternatives.results && data.alternatives.results[id];
    if (!x) return td;
    if (x.error) return td.append(el('span', 'attn-text', 'Erreur CJ : ' + x.error)), td;
    if (!x.candidates.length) return td.append(el('span', 'muted', 'Aucun « ' + x.keyword + ' » en Allemagne')), td;
    x.candidates.forEach(function (c) {
      var box = el('div', 'alt');
      var a = el('a', '', c.name || c.pid);
      a.href = c.url;
      a.target = '_blank';
      a.rel = 'noopener';
      box.append(a, el('span', 'sub', [c.sellPriceUsd ? '$' + c.sellPriceUsd.toFixed(2) : '', c.weightG ? c.weightG + ' g' : '', c.inventory != null ? 'stock ' + c.inventory : ''].filter(Boolean).join(' · ')));
      td.append(box);
    });
    return td;
  }
  function renderAudit() {
    var tbody = $('audit');
    tbody.textContent = '';
    var a = data.supplyAudit;
    $('audit-info').textContent = !a ? 'Jamais lancée' : a.finishedAt ? 'Dernière analyse : ' + date(a.finishedAt, true) : 'Analyse incomplète — relancer';
    if (!a) return emptyRow(tbody, 6, 'Cliquez sur « Analyser le stock » (environ 10 minutes, laisser la page ouverte).');
    var brand = current === 'all' ? null : brandOf(current);
    var order = { DE: 0, EU: 1, CN: 2 };
    Object.keys(a.results)
      .map(function (k) {
        return a.results[k];
      })
      .filter(function (r) {
        return (
          !brand ||
          r.usedIn.some(function (u) {
            return u.brand === brand;
          })
        );
      })
      .sort(function (x, y) {
        return (order[x.verdict] === undefined ? 3 : order[x.verdict]) - (order[y.verdict] === undefined ? 3 : order[y.verdict]);
      })
      .forEach(function (r) {
        var tr = el('tr');
        var name = el('td');
        r.usedIn.forEach(function (u, i) {
          if (i) name.append(el('br'));
          name.append(el('b', '', u.brand + ' '), document.createTextNode(u.product + (u.part ? ' · ' + u.part : '') + (u.prospect ? ' (prospect)' : '')));
        });
        if (r.weightG) name.append(el('span', 'sub', r.weightG + ' g · $' + (r.sellPriceUsd || 0).toFixed(2)));
        var stock = el('td', 'small');
        if (r.error) stock.append(el('span', 'attn-text', 'Erreur CJ : ' + r.error));
        else
          Object.keys(r.stock || {}).forEach(function (c) {
            stock.append(el('div', r.stock[c] > 0 ? '' : 'muted', c + ' : ' + r.stock[c]));
          });
        var v = el('td');
        if (r.verdict) v.append(el('span', 'chip chip-verdict-' + r.verdict, VERDICT[r.verdict]));
        tr.append(name, stock, routeCell(r, 'DE'), routeCell(r, 'FR'), v, altCell(r.pid || r.id));
        tbody.append(tr);
      });
  }
  function runAudit(btn, kind) {
    btn.disabled = true;
    var step = function (cursor) {
      return api('POST', { action: 'auditSupply', cursor: cursor, kind: kind }).then(function (r) {
        $('audit-info').textContent = 'Analyse en cours : ' + r.next + ' / ' + r.total + ' produits… (laisser la page ouverte)';
        return r.done ? null : step(r.next);
      });
    };
    step(0)
      .then(function () {
        toast('Analyse terminée');
        return load();
      })
      .catch(function (e) {
        $('audit-info').textContent = 'Analyse interrompue (' + e.message + ') — relancer';
      })
      .then(function () {
        btn.disabled = false;
      });
  }

  // ---------- Radar ----------
  function renderRadar() {
    var tbody = $('radar');
    if (!tbody) return;
    tbody.textContent = '';
    if (!radar || !radar.scores || !radar.scores.length) {
      $('radar-info').textContent = 'Aucun scan reçu. Le scan tourne chaque jour sur votre PC (tâche Windows « ALGBr Radar »).';
      return emptyRow(tbody, 9, 'En attente du premier scan.');
    }
    var srcs = radar.sources || {};
    var missing = Object.keys(srcs).filter(function (k) {
      return /needs|optional/.test(String(srcs[k]));
    });
    $('radar-info').textContent = 'Scan ' + ago(radar.generatedAt) + ' (' + date(radar.generatedAt, true) + ') · ' + radar.scores.length + ' concepts' + (missing.length ? ' · sources manquantes : ' + missing.join(', ') : '');
    fillSelect($('radar-universe'), radar.scores.map(function (s) { return s.universe; }), null);
    fillSelect($('radar-decision'), radar.scores.map(function (s) { return s.decision; }), DECISION);
    var uni = $('radar-universe').value;
    var dec = $('radar-decision').value;
    var q = $('radar-search').value.trim().toLowerCase();
    var fmt = function (v) {
      return v === null || v === undefined ? '—' : String(Math.round(v));
    };
    var list = radar.scores.filter(function (s) {
      return (!uni || s.universe === uni) && (!dec || s.decision === dec) && (!q || s.concept.toLowerCase().indexOf(q) >= 0);
    });
    if (!list.length) return emptyRow(tbody, 9, 'Aucun concept pour ce filtre.');
    list.slice(0, 80).forEach(function (s) {
      var tr = el('tr', s.decision === 'REJECT' ? 'dim' : '');
      var c = el('td');
      c.append(el('b', '', s.concept));
      if (s.explanation) c.title = s.explanation;
      var price = (s.marketPriceEur ? s.marketPriceEur.toFixed(2) + ' €' : '—') + ' / ' + (s.landedEur ? s.landedEur.toFixed(2) + ' €' : '—');
      var d = el('td');
      d.append(el('span', 'chip chip-radar-' + s.decision, DECISION[s.decision] || s.decision));
      tr.append(c, el('td', '', s.universe), el('td', 'small', s.stage), el('td', 'num', fmt(s.trend)), el('td', 'num', fmt(s.cash)), el('td', 'num', fmt(s.risk)), el('td', 'small', price), el('td', 'num', fmt(s.opportunity)), d);
      tbody.append(tr);
    });
  }
  function fillSelect(sel, values, labels) {
    if (sel.options.length > 1) return;
    Array.from(new Set(values))
      .filter(Boolean)
      .sort()
      .forEach(function (v) {
        var o = el('option', '', labels && labels[v] ? labels[v] : v);
        o.value = v;
        sel.append(o);
      });
  }

  // ---------- Settings ----------
  function renderSetup() {
    var ul = $('setup');
    ul.textContent = '';
    setupItems().forEach(function (i) {
      var li = el('li', i[0] ? 'ok' : 'todo-i');
      var txt = el('div');
      txt.append(el('b', '', i[1]), el('span', 'muted small', i[2]));
      li.append(el('span', 'ic', i[0] ? '✓' : '!'), txt);
      ul.append(li);
    });
  }

  // ---------- Events ----------
  $('login').addEventListener('submit', function (e) {
    e.preventDefault();
    password = e.target.password.value;
    store(KEY, password);
    $('login-error').hidden = true;
    load();
  });
  $('logout').addEventListener('click', function () {
    try {
      sessionStorage.removeItem(KEY);
    } catch (e) {
      /* ignore */
    }
    location.reload();
  });
  $('refresh').addEventListener('click', function () {
    radar = null;
    load().then(function () {
      toast('À jour');
    });
  });
  document.querySelectorAll('#order-filter button').forEach(function (b) {
    b.addEventListener('click', function () {
      orderFilter = b.dataset.f;
      renderOrders();
    });
  });
  $('order-search').addEventListener('input', renderOrders);
  $('crm-search').addEventListener('input', renderCrm);
  $('catalog-search').addEventListener('input', renderCatalog);
  $('catalog-inactive').addEventListener('change', renderCatalog);
  ['radar-universe', 'radar-decision'].forEach(function (id) {
    $(id).addEventListener('change', renderRadar);
  });
  $('radar-search').addEventListener('input', renderRadar);
  $('audit-run').addEventListener('click', function (e) {
    runAudit(e.currentTarget, 'stock');
  });
  $('alt-run').addEventListener('click', function (e) {
    runAudit(e.currentTarget, 'alternatives');
  });
  document.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', closeDrawer);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('drawer').hidden) closeDrawer();
  });
  window.addEventListener('hashchange', show);
  // Refresh quietly every 2 minutes while the tab is visible.
  setInterval(function () {
    if (data && document.visibilityState === 'visible' && $('drawer').hidden) load();
  }, 120000);

  show();
  if (password) {
    $('login').hidden = true;
    load();
  }
})();
