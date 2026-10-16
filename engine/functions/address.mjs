/**
 * /api/address?o=<sessionId>&t=<signature> — the customer completes a delivery
 * address that CJ refused (no house number). Link sent by e-mail (aftersale.mjs).
 *   GET  → small form in the order's language, prefilled
 *   POST → address saved, order sent to CJ right away, owner notified
 */
import { brandOf } from '../lib/emails.mjs';
import { validAddressToken } from '../lib/aftersale.mjs';
import { fulfill, hasHouseNumber } from '../lib/orders.mjs';
import { notifyOwner } from '../lib/notify.mjs';
import { crm, getOrder, saveOrder } from '../lib/store.mjs';

const T = {
  de: {
    title: 'Lieferadresse ergänzen',
    intro: (n) => `Bestellung ${n}: Bitte geben Sie Straße und Hausnummer vollständig an, damit wir versenden können.`,
    line1: 'Straße und Hausnummer',
    line2: 'Adresszusatz (optional)',
    zip: 'PLZ',
    city: 'Ort',
    country: 'Land',
    send: 'Adresse speichern',
    needNumber: 'Bitte geben Sie auch die Hausnummer an (z. B. Hauptstraße 12).',
    done: 'Vielen Dank! Ihre Adresse ist gespeichert und Ihre Bestellung geht jetzt in den Versand. Sie erhalten eine E-Mail mit der Sendungsnummer.',
    already: 'Vielen Dank, Ihre Adresse liegt uns bereits vollständig vor. Sie müssen nichts mehr tun.',
    invalid: 'Dieser Link ist ungültig. Bitte antworten Sie auf unsere E-Mail.',
  },
  fr: {
    title: 'Compléter l’adresse de livraison',
    intro: (n) => `Commande ${n} : indiquez la rue avec le numéro pour que nous puissions expédier.`,
    line1: 'Numéro et rue',
    line2: 'Complément (facultatif)',
    zip: 'Code postal',
    city: 'Ville',
    country: 'Pays',
    send: 'Enregistrer l’adresse',
    needNumber: 'Indiquez aussi le numéro de rue (ex. 12 rue de la Paix).',
    done: 'Merci ! Votre adresse est enregistrée et votre commande part maintenant. Vous recevrez un e-mail avec le numéro de suivi.',
    already: 'Merci, nous avons déjà votre adresse complète. Vous n’avez plus rien à faire.',
    invalid: 'Ce lien n’est pas valide. Répondez simplement à notre e-mail.',
  },
  en: {
    title: 'Complete your delivery address',
    intro: (n) => `Order ${n}: please enter your street with the house number so that we can ship.`,
    line1: 'Street and house number',
    line2: 'Address line 2 (optional)',
    zip: 'Postcode',
    city: 'City',
    country: 'Country',
    send: 'Save address',
    needNumber: 'Please include the house number too (e.g. 12 Main Street).',
    done: 'Thank you! Your address is saved and your order is now shipping. You will get an e-mail with the tracking number.',
    already: 'Thank you, we already have your complete address. Nothing more to do.',
    invalid: 'This link is not valid. Please just reply to our e-mail.',
  },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function page(order, lang, body, status = 200) {
  const b = order ? brandOf(order) : { brand: 'ALGBr', color: '#1d1d1f' };
  const t = T[lang];
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(t.title)} · ${esc(b.brand)}</title>
<style>
:root{--c:${b.color}}*{box-sizing:border-box}body{margin:0;background:#f4f1ec;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#222}
main{max-width:520px;margin:40px auto;padding:0 16px}.card{background:#fff;border-radius:16px;padding:28px}
.brand{font:700 24px Georgia,serif;letter-spacing:.06em;color:var(--c)}.brand small{font:12px sans-serif;color:#888;letter-spacing:0}
h1{font-size:20px;margin:18px 0 6px}p{margin:0 0 16px}label{display:block;font-size:14px;margin:12px 0 4px;color:#555}
input{width:100%;padding:12px;border:1px solid #d6d2cb;border-radius:10px;font:inherit}input[readonly]{background:#f7f5f1}
.row{display:flex;gap:10px}.row>div:first-child{flex:0 0 38%}.err{color:#b3261e;font-size:14px}
button{margin-top:20px;width:100%;padding:14px;border:0;border-radius:999px;background:var(--c);color:#fff;font:600 16px sans-serif;cursor:pointer}
</style></head><body><main><div class="card"><div class="brand">${esc(b.brand)} <small>by ALGBr</small></div>${body}</div></main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      'referrer-policy': 'no-referrer',
    },
  });
}

function form(order, lang, t, values, error = '') {
  const a = values;
  const f = (name, label, value, extra = '') => `<label for="${name}">${esc(label)}</label><input id="${name}" name="${name}" value="${esc(value)}" ${extra}>`;
  return `<h1>${esc(t.title)}</h1><p>${esc(t.intro(order.number))}</p>${error ? `<p class="err">${esc(error)}</p>` : ''}
<form method="post">
${f('line1', t.line1, a.line1, 'required maxlength="100" autocomplete="address-line1"')}
${f('line2', t.line2, a.line2, 'maxlength="100" autocomplete="address-line2"')}
<div class="row"><div>${f('zip', t.zip, a.postalCode, 'required maxlength="12" autocomplete="postal-code"')}</div><div>${f('city', t.city, a.city, 'required maxlength="60" autocomplete="address-level2"')}</div></div>
${f('country', t.country, a.country, 'readonly')}
<button type="submit">${esc(t.send)}</button></form>`;
}

export default async (req) => {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('o') || '';
  const token = url.searchParams.get('t') || '';
  const store = crm();
  const order = /^cs_[A-Za-z0-9_]+$/.test(sessionId) && validAddressToken(sessionId, token) ? await getOrder(store, sessionId) : null;
  const lang = ['de', 'fr', 'en'].includes(order?.lang) ? order.lang : 'de';
  const t = T[lang];
  if (!order) return page(null, lang, `<h1>${esc(t.title)}</h1><p>${esc(t.invalid)}</p>`, 404);
  if (order.issue !== 'address') return page(order, lang, `<h1>${esc(t.title)}</h1><p>${esc(t.already)}</p>`);
  if (req.method === 'GET') return page(order, lang, form(order, lang, t, order.shipping));
  if (req.method !== 'POST') return new Response('method', { status: 405 });

  const p = new URLSearchParams(await req.text());
  const next = {
    ...order.shipping,
    line1: clean(p.get('line1'), 100),
    line2: clean(p.get('line2'), 100),
    postalCode: clean(p.get('zip'), 12),
    city: clean(p.get('city'), 60),
  };
  if (!next.line1 || !next.postalCode || !next.city || !hasHouseNumber(next))
    return page(order, lang, form(order, lang, t, next, t.needNumber), 400);

  order.history.push({ at: new Date().toISOString(), event: `address completed by customer (was: ${order.shipping.line1} ${order.shipping.line2}`.trim() + ')' });
  order.shipping = next;
  order.attention = null;
  order.issue = null;
  if (order.status === 'needs_attention') order.status = 'paid';
  await saveOrder(store, order);
  const done = await fulfill(store, order);
  await notifyOwner(
    `${done.brand} - Adresse completee ${done.number}`,
    done.attention ? `Adresse completee par le client, mais : ${done.attention}` : 'Adresse completee par le client : commande envoyee a CJ automatiquement.',
    done.attention ? 'high' : 'default',
  );
  return page(order, lang, `<h1>${esc(t.title)}</h1><p>${esc(t.done)}</p>`);
};

export const config = { path: '/api/address' };
