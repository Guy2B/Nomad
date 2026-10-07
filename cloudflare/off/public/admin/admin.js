/* OFF. admin: publish a piece with photos from the phone, edit / duplicate / mark sold, sourcing requests. API: api.algbr.eu/api/off/*. */
(function () {
  'use strict';
  var API = 'https://api.algbr.eu';
  var KEY = 'off-admin';
  var $ = function (id) {
    return document.getElementById(id);
  };
  var password = '';
  try {
    password = sessionStorage.getItem(KEY) || '';
  } catch (e) {
    password = '';
  }
  var images = [];
  var data = null;
  var eur = function (c) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((c || 0) / 100);
  };
  var el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  function api(method, path, body, isForm) {
    var headers = { authorization: 'Bearer ' + password };
    if (body && !isForm) headers['content-type'] = 'application/json';
    return fetch(API + path, { method: method, headers: headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined }).then(function (r) {
      if (r.status === 401) throw new Error('auth');
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.error || 'error');
        return d;
      });
    });
  }

  function load() {
    return api('GET', '/api/off/admin')
      .then(function (d) {
        data = d;
        $('login').hidden = true;
        $('app').hidden = false;
        $('logout').hidden = false;
        render();
      })
      .catch(function (e) {
        $('login').hidden = false;
        $('app').hidden = true;
        if (password && e.message === 'auth') $('loginError').hidden = false;
      });
  }

  function render() {
    var s = data.stats;
    var stats = $('stats');
    stats.textContent = '';
    [
      ['En ligne', s.live],
      ['Valeur du stock', eur(s.stockValueCents)],
      ['Coût du stock', eur(s.stockCostCents)],
      ['Marge sur ventes', eur(s.soldMarginCents)],
      ['Demandes ouvertes', s.openRequests],
    ].forEach(function (x) {
      var b = el('div', 'stat');
      b.append(el('span', '', x[0]), el('strong', '', String(x[1])));
      stats.append(b);
    });

    var list = $('list');
    list.textContent = '';
    if (!data.products.length) list.append(el('p', 'muted', 'Aucune paire pour le moment.'));
    data.products.forEach(function (p) {
      var row = el('div', 'item');
      var img = el('img');
      img.alt = '';
      if (p.images[0]) img.src = p.images[0];
      var info = el('div');
      var line = el('div');
      line.append(el('span', 'pill ' + p.status, p.status.toUpperCase()), el('b', '', p.brand + ' ' + p.name));
      info.append(line, el('div', 'muted', [p.color, p.size_eu && 'EU ' + p.size_eu, p.ref, 'stock ' + p.stock].filter(Boolean).join(' · ')));
      info.append(el('div', 'muted', eur(p.price_cents) + (p.purchase_cents ? ' · achat ' + eur(p.purchase_cents) + ' · marge ' + eur(p.price_cents - p.purchase_cents) : '')));
      var actions = el('div', 'actions');
      var view = el('a', 'small ghost', 'Voir');
      view.href = '/de/p/' + p.slug;
      view.target = '_blank';
      view.style.cssText = 'padding:7px 10px;background:#ece8e0;color:#111;text-decoration:none;font-weight:800;font-size:12px';
      actions.append(view, button('Modifier', function () {
        fill(p, false);
      }), button('Dupliquer (autre taille)', function () {
        fill(p, true);
      }));
      if (p.status !== 'sold') actions.append(button('Vendu', function (b) {
        status(p.id, 'sold', b);
      }));
      if (p.status !== 'live') actions.append(button('Remettre en ligne', function (b) {
        status(p.id, 'live', b);
      }));
      if (p.status !== 'archived') actions.append(button('Archiver', function (b) {
        if (confirm('Archiver cette paire ? Elle disparaît du site.')) status(p.id, 'archived', b);
      }));
      row.append(img, info, actions);
      list.append(row);
    });

    var reqs = $('requests');
    reqs.textContent = '';
    if (!data.requests.length) reqs.append(el('p', 'muted', 'Aucune demande.'));
    data.requests.forEach(function (r) {
      var row = el('div', 'req' + (r.status === 'done' ? ' done' : ''));
      var info = el('div');
      info.append(el('b', '', [r.brand, r.model, r.color].filter(Boolean).join(' · ') || 'Demande'));
      info.append(el('div', 'muted', ['EU ' + (r.size_eu || '?'), r.max_budget_cents ? 'budget ' + eur(r.max_budget_cents) : '', r.lang, new Date(r.created_at).toLocaleString('fr-FR')].filter(Boolean).join(' · ')));
      var mail = el('a', '', r.email);
      mail.href = 'mailto:' + r.email + '?subject=' + encodeURIComponent('OFF. — ' + [r.brand, r.model].filter(Boolean).join(' '));
      info.append(mail);
      if (r.notes) info.append(el('div', 'muted', r.notes));
      row.append(info, button(r.status === 'done' ? 'Rouvrir' : 'Traité', function (b) {
        b.disabled = true;
        api('POST', '/api/off/admin', { action: 'request', id: r.id, status: r.status === 'done' ? 'new' : 'done' }).then(load);
      }));
      reqs.append(row);
    });
  }

  function button(label, fn) {
    var b = el('button', 'small ghost', label);
    b.type = 'button';
    b.addEventListener('click', function () {
      fn(b);
    });
    return b;
  }

  function status(id, s, b) {
    b.disabled = true;
    api('POST', '/api/off/admin', { action: 'status', id: id, status: s })
      .then(load)
      .catch(function () {
        b.disabled = false;
      });
  }

  function fill(p, duplicate) {
    var f = $('f');
    var map = { id: duplicate ? '' : p.id, brand: p.brand, ref: p.ref, name: p.name, color: p.color, gtin: duplicate ? '' : p.gtin, sizeEU: duplicate ? '' : p.size_eu, sizeUS: duplicate ? '' : p.size_us, sizeUK: duplicate ? '' : p.size_uk, cm: duplicate ? '' : p.cm, price: p.price_cents / 100, rrp: p.rrp_cents ? p.rrp_cents / 100 : '', purchasePrice: p.purchase_cents ? p.purchase_cents / 100 : '', stock: duplicate ? 1 : p.stock, condition: p.condition, status: duplicate ? 'live' : p.status === 'archived' ? 'draft' : p.status, description: p.description || '' };
    Object.keys(map).forEach(function (k) {
      if (f.elements[k]) f.elements[k].value = map[k] === null || map[k] === undefined ? '' : map[k];
    });
    images = duplicate ? [] : p.images.slice();
    drawPreviews();
    $('formTitle').textContent = duplicate ? 'Nouvelle taille de : ' + p.name : 'Modifier : ' + p.name;
    $('save').textContent = duplicate ? 'Publier' : 'Enregistrer';
    f.scrollIntoView({ behavior: 'smooth' });
  }

  function resetForm() {
    $('f').reset();
    $('f').elements.id.value = '';
    images = [];
    drawPreviews();
    $('formTitle').textContent = 'Nouvelle paire';
    $('save').textContent = 'Publier';
    $('saveState').textContent = '';
  }

  function drawPreviews() {
    var box = $('previews');
    box.textContent = '';
    images.forEach(function (u, i) {
      var d = el('div', 'preview');
      var img = el('img');
      img.src = u;
      img.alt = '';
      var x = el('button', '', '×');
      x.type = 'button';
      x.setAttribute('aria-label', 'Retirer');
      x.addEventListener('click', function () {
        images.splice(i, 1);
        drawPreviews();
      });
      d.append(img, x);
      if (i === 0) d.append(el('span', 'main', 'principale'));
      box.append(d);
    });
  }

  // Photos are resized in the browser (max 1600 px, WebP) before upload: fast on mobile data, light pages.
  function shrink(file) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(
          function (b) {
            URL.revokeObjectURL(img.src);
            resolve(b ? new File([b], 'photo.webp', { type: 'image/webp' }) : file);
          },
          'image/webp',
          0.84,
        );
      };
      img.onerror = function () {
        resolve(file);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  function upload(files) {
    var list = Array.prototype.slice.call(files).filter(function (f) {
      return /^image\/(jpeg|png|webp)$/.test(f.type);
    });
    if (!list.length) return;
    var state = $('uploadState');
    var done = 0;
    $('save').disabled = true;
    state.textContent = 'Envoi des photos : 0 / ' + list.length;
    return list
      .reduce(function (chain, file) {
        return chain.then(function () {
          return shrink(file).then(function (small) {
            var fd = new FormData();
            fd.append('file', small);
            fd.append('ref', $('f').elements.ref.value || 'product');
            return api('POST', '/api/off/upload', fd, true).then(function (r) {
              images.push(r.url);
              drawPreviews();
              state.textContent = 'Envoi des photos : ' + ++done + ' / ' + list.length;
            });
          });
        });
      }, Promise.resolve())
      .catch(function (e) {
        state.textContent = 'Erreur pendant l’envoi (' + e.message + ').';
      })
      .then(function () {
        $('save').disabled = false;
      });
  }

  var drop = $('drop');
  drop.addEventListener('click', function () {
    $('files').click();
  });
  drop.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') $('files').click();
  });
  $('files').addEventListener('change', function (e) {
    upload(e.target.files);
    e.target.value = '';
  });
  ['dragenter', 'dragover'].forEach(function (t) {
    drop.addEventListener(t, function (e) {
      e.preventDefault();
      drop.classList.add('drag');
    });
  });
  ['dragleave', 'drop'].forEach(function (t) {
    drop.addEventListener(t, function (e) {
      e.preventDefault();
      drop.classList.remove('drag');
    });
  });
  drop.addEventListener('drop', function (e) {
    upload(e.dataTransfer.files);
  });

  $('f').addEventListener('submit', function (e) {
    e.preventDefault();
    var product = Object.fromEntries(new FormData(e.target).entries());
    product.images = images;
    if (!images.length && !confirm('Publier sans photo ?')) return;
    $('save').disabled = true;
    $('saveState').textContent = 'Enregistrement…';
    api('POST', '/api/off/admin', { action: 'save', product: product })
      .then(function (p) {
        $('saveState').textContent = 'En ligne : off.algbr.eu/de/p/' + p.slug;
        resetForm();
        $('saveState').textContent = 'Enregistré ✓';
        return load();
      })
      .catch(function (err) {
        $('saveState').textContent = err.message === 'missing-fields' ? 'Marque, référence, nom et prix sont obligatoires.' : 'Erreur : ' + err.message;
      })
      .then(function () {
        $('save').disabled = false;
      });
  });
  $('reset').addEventListener('click', resetForm);

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
    password = '';
    location.reload();
  });
  if (password) load();
})();
