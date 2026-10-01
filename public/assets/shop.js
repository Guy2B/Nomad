/* Storefront script shared by every store of the Nomad platform: cart (this browser only), checkout, thank-you and tracking pages. */
(function () {
  'use strict';
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
  function add(id) {
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
    var thumb = e.target.closest('[data-thumb]');
    if (thumb) {
      var main = document.querySelector('[data-main]');
      if (main) main.src = thumb.getAttribute('data-thumb');
    }
  });

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
      var empty = cart.length === 0;
      document.querySelector('[data-cart-empty]').hidden = !empty;
      document.querySelector('[data-cart-summary]').hidden = empty;
      document.querySelector('[data-subtotal]').textContent = money(subtotal);
      document.querySelector('[data-shipping]').textContent = data.shippingCents ? money(data.shippingCents) : t.free;
      document.querySelector('[data-total]').textContent = money(subtotal + data.shippingCents);
    };
    render();
    var btn = document.querySelector('[data-checkout]');
    btn.addEventListener('click', function () {
      btn.disabled = true;
      document.querySelector('[data-checkout-error]').hidden = true;
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
          document.querySelector('[data-checkout-error]').hidden = false;
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
          o.items.forEach(function (i) {
            list.append(el('li', '', i.qty + ' × ' + i.name));
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
