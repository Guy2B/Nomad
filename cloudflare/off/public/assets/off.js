/* OFF. storefront: shop filters, private sourcing form, buy button (reserve + Stripe), thank-you and tracking. */
(function () {
  'use strict';
  var API = document.body.dataset.api;
  var LANG = document.body.dataset.lang;
  var I = {};
  try {
    I = JSON.parse(document.getElementById('i18n').textContent);
  } catch (e) {
    I = {};
  }
  var $ = function (id) {
    return document.getElementById(id);
  };
  var post = function (path, body) {
    return fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) {
      return r.json().then(function (d) {
        return { ok: r.ok, status: r.status, data: d };
      });
    });
  };

  // Shop filters (cards are rendered by the server; we only show/hide and reorder).
  var grid = $('liveGrid');
  if (grid && $('q')) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
    var apply = function () {
      var q = $('q').value.trim().toLowerCase();
      var b = $('brandFilter').value;
      var s = $('sizeFilter').value;
      var sort = $('sortFilter').value;
      var shown = cards.filter(function (c) {
        var ok = (!q || c.dataset.q.indexOf(q) >= 0) && (!b || c.dataset.brand === b) && (!s || c.dataset.size === s);
        c.hidden = !ok;
        return ok;
      });
      shown
        .sort(function (x, y) {
          if (sort === 'asc') return x.dataset.price - y.dataset.price;
          if (sort === 'desc') return y.dataset.price - x.dataset.price;
          return y.dataset.date < x.dataset.date ? -1 : 1;
        })
        .forEach(function (c) {
          grid.appendChild(c);
        });
      if (I.count) $('resultCount').textContent = I.count[shown.length === 1 ? 0 : 1].replace(/^\d+/, shown.length);
      $('noMatch').hidden = shown.length > 0 || cards.length === 0;
    };
    ['q', 'brandFilter', 'sizeFilter', 'sortFilter'].forEach(function (id) {
      $(id).addEventListener(id === 'q' ? 'input' : 'change', apply);
    });
  }

  // Private sourcing form.
  var form = $('sourceForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(form).entries());
      data.lang = LANG;
      var notice = $('notice');
      var btn = form.querySelector('button[type=submit]');
      if (!data.email || !data.sizeEU) {
        notice.textContent = I.find.error;
        notice.className = 'notice full is-error';
        notice.hidden = false;
        return;
      }
      btn.disabled = true;
      post('/api/off/sourcing', data)
        .then(function (r) {
          notice.hidden = false;
          if (r.ok) {
            notice.textContent = I.find.ok;
            notice.className = 'notice full';
            form.reset();
          } else {
            notice.textContent = I.find.error;
            notice.className = 'notice full is-error';
          }
        })
        .catch(function () {
          notice.hidden = false;
          notice.textContent = I.find.error;
          notice.className = 'notice full is-error';
        })
        .then(function () {
          btn.disabled = false;
        });
    });
  }

  // Product gallery.
  document.querySelectorAll('.thumbs button').forEach(function (b, i, all) {
    if (i === 0) b.setAttribute('aria-current', 'true');
    b.addEventListener('click', function () {
      $('mainImg').src = b.dataset.img;
      all.forEach(function (x) {
        x.removeAttribute('aria-current');
      });
      b.setAttribute('aria-current', 'true');
    });
  });

  // Buy: reserve the piece and go to Stripe Checkout.
  var buy = $('buy');
  if (buy) {
    buy.addEventListener('click', function () {
      var msg = $('buyMsg');
      buy.disabled = true;
      msg.textContent = I.pdp.reserving;
      post('/api/off/checkout', { id: buy.dataset.id, lang: LANG })
        .then(function (r) {
          if (r.ok && r.data.url) {
            location.href = r.data.url;
            return;
          }
          msg.textContent = r.data.error === 'reserved' ? I.pdp.reserved : r.data.error === 'sold' ? I.pdp.soldNow : I.pdp.error;
          buy.disabled = false;
        })
        .catch(function () {
          msg.textContent = I.pdp.error;
          buy.disabled = false;
        });
    });
  }

  // Thank-you page: show the order number once the webhook has recorded it.
  var num = $('orderNum');
  if (num) {
    var session = new URLSearchParams(location.search).get('session');
    num.textContent = num.dataset.wait;
    var tries = 0;
    var poll = function () {
      if (!session || tries++ > 20) return;
      fetch(API + '/api/track?session=' + encodeURIComponent(session))
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (d) {
          if (d && d.number) num.textContent = d.number;
          else setTimeout(poll, 2500);
        })
        .catch(function () {
          setTimeout(poll, 2500);
        });
    };
    poll();
  }

  // Order tracking.
  var track = $('trackForm');
  if (track) {
    track.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(track);
      var out = $('trackOut');
      fetch(API + '/api/track?order=' + encodeURIComponent(f.get('order')) + '&email=' + encodeURIComponent(f.get('email')))
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (d) {
          if (!d) {
            out.textContent = I.notFound;
            return;
          }
          out.textContent = '';
          var p = document.createElement('p');
          p.textContent = d.number + ' · ' + ((I.status && I.status[d.status]) || d.status) + (d.trackNumber ? ' · Hermes ' + d.trackNumber : '');
          out.appendChild(p);
        })
        .catch(function () {
          out.textContent = I.notFound;
        });
    });
  }
})();
