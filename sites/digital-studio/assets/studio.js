/* algbr.de · menu and contact form. No tracking, no storage. */
(function () {
  'use strict';

  // Mobile menu
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // Contact form
  var form = document.querySelector('[data-contact]');
  if (!form) return;
  form.elements.t.value = String(Date.now());
  if (form.querySelector('.cf-turnstile')) {
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    document.head.appendChild(s);
  }
  var status = form.querySelector('.form-status');
  var button = form.querySelector('button[type=submit]');
  var fallback = form.querySelector('.form-fallback');
  var label = button.textContent;

  function say(kind, text) {
    status.className = 'form-status ' + (kind || '');
    status.textContent = text || '';
  }

  function text(el) {
    if (!el) return '';
    if (el.tagName === 'SELECT') return el.value ? el.options[el.selectedIndex].text : '';
    return el.value.trim();
  }
  function summary() {
    var f = form.elements;
    var lines = [];
    Array.prototype.forEach.call(form.querySelectorAll('fieldset'), function (fs) {
      lines.push('## ' + fs.querySelector('legend').textContent.trim());
      Array.prototype.forEach.call(fs.querySelectorAll('label'), function (l) {
        var el = l.querySelector('input, select, textarea');
        if (!el || el.name === 'consent') return;
        if (el.type === 'checkbox') { if (el.checked) lines.push('- ' + l.textContent.trim()); return; }
        var v = text(el);
        if (v) lines.push(l.firstChild.textContent.trim() + ': ' + v);
      });
      lines.push('');
    });
    return lines.join('\n');
  }

  // Prefill from the service and industry pages (?type=shop, ?industry=beauty).
  var q = new URLSearchParams(location.search);
  ['type', 'industry'].forEach(function (k) {
    var v = q.get(k), el = form.elements[k];
    if (v && el && Array.prototype.some.call(el.options, function (o) { return o.value === v; })) el.value = v;
  });

  function showFallback() {
    var link = fallback.querySelector('[data-mailto]');
    var base = link.getAttribute('href').split('?')[0];
    link.href = base + '?subject=' + encodeURIComponent('Projekt: ' + (text(form.elements.type) || 'algbr.de')) + '&body=' + encodeURIComponent(summary());
    fallback.hidden = false;
    say('err', status.dataset.fallback);
    link.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    fallback.hidden = true;
    var invalid = [];
    Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea'), function (el) {
      if (el.name === 'website' || el.type === 'hidden' || el.name === 'features') return;
      var bad = !el.checkValidity();
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad) invalid.push(el);
    });
    if (invalid.length) {
      say('err', status.dataset.error);
      invalid[0].focus();
      return;
    }
    var data = { features: [] };
    new FormData(form).forEach(function (v, k) { if (k === 'features') data.features.push(v); else data[k] = v; });
    data.consent = form.elements.consent.checked;
    button.disabled = true;
    button.textContent = button.dataset.sending;
    say('', '');
    fetch(form.action, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (r) {
        if (r.status === 200 && r.body.ok) {
          form.reset();
          form.elements.t.value = String(Date.now());
          say('ok', status.dataset.ok);
        } else if (r.status === 400 && r.body.fields) {
          r.body.fields.forEach(function (n) { if (form.elements[n]) form.elements[n].setAttribute('aria-invalid', 'true'); });
          say('err', status.dataset.error);
        } else {
          showFallback();
        }
      })
      .catch(showFallback)
      .then(function () {
        button.disabled = false;
        button.textContent = label;
      });
  });
})();
