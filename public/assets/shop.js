/* Storefront script shared by every store of the Nomad platform: cart (this browser only), checkout, thank-you and tracking pages. */
(function () {
  'use strict';
  if (location.protocol === 'http:' && !/^(localhost|127\.)/.test(location.hostname)) {
    location.replace('https:' + location.href.slice(5));
    return;
  }
  var body = document.body;
  var page = body.getAttribute('data-page');
  var lang = body.getAttribute('data-lang') || 'de';
  // One cart per store; the API is shared by every store of the platform (same origin for the host store).
  var STORE = body.getAttribute('data-store') || 'nomad';
  var API = body.getAttribute('data-api') || '';
  var KEY = STORE + '-cart';
  var dataEl = document.getElementById('shop-data');
  var data = dataEl ? JSON.parse(dataEl.textContent) : null;

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }
  function write(cart) {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch (e) {
      /* private mode: the cart lives for this page only */
    }
    count();
  track('view');
  if (page === 'product') {
    var pid = (document.querySelector('.buy [data-add]') || {}).getAttribute && document.querySelector('.buy [data-add]').getAttribute('data-add');
    if (pid) track('product', pid);
  }
  }
  function count() {
    var n = read().reduce(function (a, l) {
      return a + (l.qty || 0);
    }, 0);
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  }
  function money(cents) {
    var loc = { de: 'de-DE', fr: 'fr-FR', en: 'en-IE' }[lang] || 'de-DE';
    return new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR' }).format(cents / 100);
  }
  function track(type, product) {
    try {
      var payload = JSON.stringify({ store: STORE, type: type, product: product || null });
      var url = API + '/api/event';
      if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([payload], { type: 'text/plain' }));
      else fetch(url, { method: 'POST', body: payload, keepalive: true, headers: { 'content-type': 'text/plain' } });
    } catch (e) {
      /* measurement must never break the shop */
    }
  }
  function add(id) {
    track('add', id);
    var cart = read();
    var line = cart.find(function (l) {
      return l.id === id;
    });
    if (line) line.qty = Math.min(9, line.qty + 1);
    else cart.push({ id: id, qty: 1 });
    write(cart);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /** Stripe Checkout for the current cart; used by the cart page and the drawer. */
  function startCheckout(btn, errEl) {
    btn.disabled = true;
    if (errEl) errEl.hidden = true;
    track('checkout');
    fetch(API + '/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ store: STORE, cart: read(), lang: lang }),
    })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok || !j.url) throw new Error(j.error || 'checkout');
          location.href = j.url;
        });
      })
      .catch(function () {
        if (errEl) errEl.hidden = false;
        btn.disabled = false;
      });
  }

  // ---------------------------------------------------------------- cart drawer (every page)
  var drawer = null;
  function openDrawer() {
    if (!data || page === 'cart') return false;
    var t = data.t.cart;
    var root = body.getAttribute('data-root') || '';
    if (!drawer) {
      drawer = el('div', 'drawer');
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');
      drawer.setAttribute('aria-label', t.added);
      drawer.innerHTML = '<div class="drawer-overlay" data-drawer-close></div><aside class="drawer-panel"><header class="drawer-head"><b></b><button type="button" class="drawer-x" data-drawer-close></button></header><div class="drawer-lines"></div><footer class="drawer-foot"><p class="drawer-sum"><span></span><b></b></p><p class="muted small drawer-ship"></p><button type="button" class="btn btn-dark btn-lg btn-block" data-drawer-checkout></button><p class="error" data-drawer-error hidden></p><a class="drawer-view"></a></footer></aside>';
      document.body.appendChild(drawer);
      drawer.querySelector('.drawer-head b').textContent = t.added;
      drawer.querySelector('.drawer-x').textContent = '×';
      drawer.querySelector('.drawer-x').setAttribute('aria-label', t.close);
      drawer.querySelector('.drawer-sum span').textContent = t.subtotal;
      drawer.querySelector('.drawer-ship').textContent = t.shipping + ': ' + (data.shippingCents ? money(data.shippingCents) : t.free) + ' · ' + t.vat;
      drawer.querySelector('[data-drawer-checkout]').textContent = t.checkout;
      drawer.querySelector('[data-drawer-error]').textContent = t.error;
      var view = drawer.querySelector('.drawer-view');
      view.textContent = t.viewCart + ' →';
      view.href = root + lang + '/warenkorb.html';
      drawer.addEventListener('click', function (e) {
        if (e.target.closest('[data-drawer-close]')) closeDrawer();
        var co = e.target.closest('[data-drawer-checkout]');
        if (co) startCheckout(co, drawer.querySelector('[data-drawer-error]'));
        var plus = e.target.closest('[data-drawer-add]');
        if (plus) {
          add(plus.getAttribute('data-drawer-add'));
          fillDrawer();
        }
        var rm = e.target.closest('[data-drawer-remove]');
        if (rm) {
          var id = rm.getAttribute('data-drawer-remove');
          write(read().filter(function (x) { return x.id !== id; }));
          fillDrawer();
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeDrawer();
      });
    }
    fillDrawer();
    drawer.classList.add('open');
    document.documentElement.classList.add('no-scroll');
    drawer.querySelector('[data-drawer-checkout]').focus();
    return true;
  }
  function fillDrawer() {
    var root = body.getAttribute('data-root') || '';
    var box = drawer.querySelector('.drawer-lines');
    box.textContent = '';
    var subtotal = 0;
    read().forEach(function (l) {
      var p = data.products[l.id];
      if (!p) return;
      subtotal += p.price * l.qty;
      var row = el('div', 'drawer-line');
      var img = el('img');
      img.src = root + 'assets/products/' + p.img;
      img.alt = '';
      img.width = 64;
      img.height = 64;
      var info = el('div');
      info.append(el('b', '', p.name), el('span', 'muted small', l.qty + ' × ' + money(p.price)));
      var rm = el('button', 'link small', data.t.cart.remove);
      rm.type = 'button';
      rm.setAttribute('data-drawer-remove', l.id);
      row.append(img, info, rm);
      box.appendChild(row);
    });
    // Suggestions: companions of what is in the cart (max 2).
    var inCart = {};
    read().forEach(function (l) { inCart[l.id] = true; });
    var sugg = [];
    read().forEach(function (l) {
      ((data.products[l.id] || {}).upsells || []).forEach(function (id) {
        if (!inCart[id] && data.products[id] && sugg.indexOf(id) < 0) sugg.push(id);
      });
    });
    if (sugg.length) {
      box.appendChild(el('p', 'drawer-sugg-title', data.t.cart.upsell));
      sugg.slice(0, 2).forEach(function (id) {
        var p = data.products[id];
        var row = el('div', 'drawer-line drawer-sugg');
        var img = el('img');
        img.src = root + 'assets/products/' + p.img;
        img.alt = '';
        img.width = 64;
        img.height = 64;
        var info = el('div');
        info.append(el('b', '', p.name), el('span', 'muted small', money(p.price)));
        var b = el('button', 'btn btn-line btn-sm', '+ ' + data.t.cart.addShort);
        b.type = 'button';
        b.setAttribute('data-drawer-add', id);
        row.append(img, info, b);
        box.appendChild(row);
      });
    }
    drawer.querySelector('.drawer-sum b').textContent = money(subtotal);
    drawer.querySelector('[data-drawer-checkout]').disabled = subtotal === 0;
    if (subtotal === 0) closeDrawer();
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open');
    document.documentElement.classList.remove('no-scroll');
  }

  // Root page: open the shop in the visitor's language.
  if (page === 'root') {
    var pref = (navigator.language || 'de').slice(0, 2);
    location.replace((['de', 'fr', 'en'].indexOf(pref) >= 0 ? pref : 'de') + '/index.html');
    return;
  }

  count();

  document.addEventListener('click', function (e) {
    var addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      add(addBtn.getAttribute('data-add'));
      if (openDrawer()) return;
      if (addBtn.hasAttribute('data-go-cart')) {
        location.href = (body.getAttribute('data-root') || '') + lang + '/warenkorb.html';
      } else {
        addBtn.classList.add('added');
        setTimeout(function () {
          addBtn.classList.remove('added');
        }, 1200);
      }
      return;
    }
    var all = e.target.closest('[data-add-all]');
    if (all) {
      all.getAttribute('data-add-all').split(',').forEach(function (id) {
        if (id) add(id);
      });
      if (openDrawer()) return;
      location.href = (body.getAttribute('data-root') || '') + lang + '/warenkorb.html';
      return;
    }
    var thumb = e.target.closest('[data-thumb]');
    if (thumb) {
      var main = document.querySelector('[data-main]');
      if (main) main.src = thumb.getAttribute('data-thumb');
    }
  });

  // Product page: sticky buy bar once the main "add to cart" button has scrolled out of view.
  var bar = document.querySelector('[data-buy-bar]');
  var mainBuy = document.querySelector('.buy [data-add]');
  if (bar && mainBuy && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      bar.classList.toggle('show', !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0);
    }).observe(mainBuy);
  }

  // ---------------------------------------------------------------- cart
  if (page === 'cart' && data) {
    var t = data.t.cart;
    var linesEl = document.querySelector('[data-cart-lines]');
    var render = function () {
      var cart = read().filter(function (l) {
        return data.products[l.id];
      });
      linesEl.textContent = '';
      var subtotal = 0;
      cart.forEach(function (l) {
        var p = data.products[l.id];
        subtotal += p.price * l.qty;
        var row = el('div', 'line');
        var img = el('img');
        img.src = '../assets/products/' + p.img;
        img.alt = '';
        img.width = 72;
        img.height = 72;
        var info = el('div', 'line-info');
        var name = el('a', 'line-name', p.name);
        name.href = p.url;
        info.appendChild(name);
        info.appendChild(el('span', 'muted small', money(p.price)));
        var qty = el('select');
        qty.setAttribute('aria-label', t.qty + ' ' + p.name);
        for (var q = 1; q <= 9; q++) {
          var o = el('option', '', String(q));
          o.value = String(q);
          if (q === l.qty) o.selected = true;
          qty.appendChild(o);
        }
        qty.addEventListener('change', function () {
          var c = read();
          c.forEach(function (x) {
            if (x.id === l.id) x.qty = Number(qty.value);
          });
          write(c);
          render();
        });
        var rm = el('button', 'link', t.remove);
        rm.type = 'button';
        rm.addEventListener('click', function () {
          write(
            read().filter(function (x) {
              return x.id !== l.id;
            }),
          );
          render();
        });
        var total = el('b', 'line-total', money(p.price * l.qty));
        row.append(img, info, qty, total, rm);
        linesEl.appendChild(row);
      });
      renderUpsell();
      var empty = cart.length === 0;
      document.querySelector('[data-cart-empty]').hidden = !empty;
      document.querySelector('[data-cart-summary]').hidden = empty;
      document.querySelector('[data-subtotal]').textContent = money(subtotal);
      document.querySelector('[data-shipping]').textContent = data.shippingCents ? money(data.shippingCents) : t.free;
      document.querySelector('[data-total]').textContent = money(subtotal + data.shippingCents);
    };
    // Upsells: what goes with the cart (each product lists its logical companions).
    var upEl = document.querySelector('[data-upsell]');
    var renderUpsell = function () {
      if (!upEl) return;
      var cart = read();
      var inCart = {};
      cart.forEach(function (l) {
        inCart[l.id] = true;
      });
      var ids = [];
      cart.forEach(function (l) {
        ((data.products[l.id] || {}).upsells || []).forEach(function (id) {
          if (!inCart[id] && data.products[id] && ids.indexOf(id) < 0) ids.push(id);
        });
      });
      var row = upEl.querySelector('[data-upsell-row]');
      row.textContent = '';
      ids.slice(0, 3).forEach(function (id) {
        var p = data.products[id];
        var card = el('div', 'upsell');
        var img = el('img');
        img.src = '../assets/products/' + p.img;
        img.alt = '';
        img.width = 64;
        img.height = 64;
        var info = el('div', 'line-info');
        var name = el('a', 'line-name', p.name);
        name.href = p.url;
        info.append(name, el('span', 'muted small', money(p.price)));
        var b = el('button', 'btn btn-line btn-xs', '+ ' + t.addShort);
        b.type = 'button';
        b.addEventListener('click', function () {
          add(id);
          render();
        });
        card.append(img, info, b);
        row.appendChild(card);
      });
      upEl.hidden = ids.length === 0;
    };
    render();
    var btn = document.querySelector('[data-checkout]');
    btn.addEventListener('click', function () {
      startCheckout(btn, document.querySelector('[data-checkout-error]'));
    });
  }

  // ---------------------------------------------------------------- reviews
  var revBox = document.querySelector('[data-reviews]');
  if (revBox && data) {
    var rt = data.t.reviews;
    fetch(API + '/api/reviews?store=' + encodeURIComponent(STORE) + '&product=' + encodeURIComponent(revBox.getAttribute('data-reviews')))
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (j) {
        if (!j || !j.count) return;
        var sum = revBox.querySelector('[data-reviews-summary]');
        sum.textContent = '';
        var stars = el('p', 'stars-big', '★★★★★'.slice(0, Math.round(j.average)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(j.average)));
        sum.append(stars, el('p', 'muted', String(j.average).replace('.', lang === 'en' ? '.' : ',') + ' / 5 · ' + rt.basedOn.replace('{n}', j.count)));
        var list = revBox.querySelector('[data-reviews-list]');
        j.reviews.forEach(function (r) {
          var item = el('article', 'review');
          item.append(el('p', 'review-stars', '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)));
          if (r.title) item.append(el('h3', '', r.title));
          item.append(el('p', '', r.text));
          item.append(el('p', 'muted small', r.name + ' · ' + rt.verified + ' · ' + new Date(r.createdAt).toLocaleDateString(lang)));
          list.append(item);
        });
      })
      .catch(function () {});
  }
  var revForm = document.querySelector('[data-review-form]');
  if (revForm && data) {
    var pre = new URLSearchParams(location.search).get('p');
    if (pre && revForm.product.querySelector('option[value="' + pre + '"]')) revForm.product.value = pre;
    revForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = document.querySelector('[data-review-error]');
      err.hidden = true;
      var f = revForm;
      var rating = (f.querySelector('input[name=rating]:checked') || {}).value;
      var payload = { order: f.order.value, email: f.email.value, product: f.product.value, rating: Number(rating || 0), title: f.title.value, text: f.text.value, name: f.name.value, consent: f.consent.checked, lang: lang };
      var btn = f.querySelector('button[type=submit]');
      btn.disabled = true;
      fetch(API + '/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok) throw new Error(j.error || 'default');
            f.hidden = true;
            document.querySelector('[data-review-thanks]').hidden = false;
          });
        })
        .catch(function (x) {
          err.textContent = data.t.reviews.errors[x.message] || data.t.reviews.errors['default'];
          err.hidden = false;
          btn.disabled = false;
        });
    });
  }

  // ---------------------------------------------------------------- thank you
  if (page === 'thanks' && data) {
    write([]);
    var session = new URLSearchParams(location.search).get('session');
    var target = document.querySelector('[data-order-number]');
    var tries = 0;
    var poll = function () {
      if (!session) return;
      fetch(API + '/api/track?session=' + encodeURIComponent(session))
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (j) {
          if (j && j.number) {
            target.textContent = '';
            target.append(el('span', 'muted', data.t.thanks.number + ' '), el('b', '', j.number));
          } else if (++tries < 15) setTimeout(poll, 2000);
        })
        .catch(function () {
          if (++tries < 15) setTimeout(poll, 2000);
        });
    };
    poll();
  }

  // ---------------------------------------------------------------- tracking
  if (page === 'track' && data) {
    var form = document.querySelector('[data-track-form]');
    var out = document.querySelector('[data-track-result]');
    var tt = data.t.track;
    var params = new URLSearchParams(location.search);
    if (params.get('order')) form.order.value = params.get('order');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      out.textContent = '';
      var q = '?order=' + encodeURIComponent(form.order.value.trim()) + '&email=' + encodeURIComponent(form.email.value.trim());
      fetch(API + '/api/track' + q)
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (o) {
          if (!o) {
            out.append(el('p', 'error', tt.notFound));
            return;
          }
          var box = el('div', 'status-box');
          box.append(el('p', 'muted small', o.number), el('h2', '', tt.status[o.status] || o.status));
          var list = el('ul', 'plain');
          var canReview = o.status === 'shipped' || o.status === 'delivered';
          o.items.forEach(function (i) {
            var li = el('li', '', i.qty + ' × ' + i.name);
            if (canReview && i.id && data.t.reviews) {
              var a = el('a', 'review-link', '★ ' + data.t.reviews.rate);
              a.href = 'bewertung.html?p=' + encodeURIComponent(i.id);
              li.append(a);
            }
            list.append(li);
          });
          box.append(list);
          box.append(
            o.trackNumber
              ? el('p', '', tt.tracking + ' : ' + o.trackNumber + (o.carrier ? ' (' + o.carrier + ')' : ''))
              : el('p', 'muted small', tt.noTracking),
          );
          out.append(box);
        })
        .catch(function () {
          out.append(el('p', 'error', tt.notFound));
        });
    });
  }
})();
