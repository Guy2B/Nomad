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

  function summary() {
    var f = form.elements;
    var type = f.type.options[f.type.selectedIndex].text;
    var budget = f.budget.options[f.budget.selectedIndex].text;
    return [f.name.value, f.email.value, f.company.value, type, budget, '', f.message.value].filter(function (x, i) { return x || i === 5; }).join('\n');
  }

  function showFallback() {
    var link = fallback.querySelector('[data-mailto]');
    var base = link.getAttribute('href').split('?')[0];
    var type = form.elements.type.options[form.elements.type.selectedIndex].text;
    link.href = base + '?subject=' + encodeURIComponent('Projekt: ' + type) + '&body=' + encodeURIComponent(summary());
    fallback.hidden = false;
    say('err', status.dataset.fallback);
    link.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    fallback.hidden = true;
    var invalid = [];
    Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea'), function (el) {
      if (el.name === 'website' || el.type === 'hidden') return;
      var bad = !el.checkValidity();
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad) invalid.push(el);
    });
    if (invalid.length) {
      say('err', status.dataset.error);
      invalid[0].focus();
      return;
    }
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
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
