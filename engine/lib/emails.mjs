/**
 * Customer e-mails after the purchase, in the order's language (de, fr, en):
 *   shipped · delivered · address (house number missing) · cancelled (refunded) · review.
 * One plain layout for every store: brand name, a few lines, one button, legal footer.
 */
import platform from '../../shared/platform.json' with { type: 'json' };
import { product as productOf, store as storeById } from './catalog.mjs';
import { euros } from './notify.mjs';

export const API_BASE = String(platform.api || 'https://api.algbr.eu').replace(/\/$/, '');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Brand, colours, links and legal footer of the order's store (OFF. has no catalogue). */
export function brandOf(order) {
  const s = storeById(order.store)?.site;
  const company = s?.company ?? storeById('nomad')?.site?.company ?? {};
  return {
    brand: s?.brand || order.brand || 'AlGBr',
    color: s?.themeColor || '#1d1d1f',
    baseUrl: (s?.baseUrl || 'https://off.algbr.eu').replace(/\/$/, ''),
    from: s?.shipping?.from === 'DE' ? 'DE' : 'CN',
    deliveryDays: s?.shipping?.deliveryDays || '',
    company,
  };
}

const langOf = (order) => (['de', 'fr', 'en'].includes(order.lang) ? order.lang : 'de');
const firstName = (order) => String(order.customer?.name || order.shipping?.name || '').trim().split(/\s+/)[0] || '';

/** Public tracking page of the carrier: DHL Germany for the German warehouse, 17TRACK for every other carrier. */
export function carrierUrl(order) {
  const tn = order.supplier?.trackNumber;
  if (!tn) return null;
  const carrier = String(order.supplier?.logisticName || '');
  if (/dhl/i.test(carrier) && order.shipping?.country === 'DE')
    return `https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=${encodeURIComponent(tn)}`;
  return `https://t.17track.net/${langOf(order) === 'de' ? 'de' : langOf(order) === 'fr' ? 'fr' : 'en'}#nums=${encodeURIComponent(tn)}`;
}

const T = {
  de: {
    hello: (n) => (n ? `Hallo ${n},` : 'Hallo,'),
    bye: (b) => `Herzliche Grüße\nIhr ${b}-Team`,
    footer: (n) => `Sie erhalten diese E-Mail zu Ihrer Bestellung ${n}.`,
    shipped: {
      subject: (o) => `Ihre Bestellung ${o.number} ist unterwegs`,
      lines: (o, b) => [
        'gute Nachricht: Ihre Bestellung ist auf dem Weg zu Ihnen.',
        o.supplier.trackNumber ? `Versand mit ${o.supplier.logisticName || 'Paketdienst'}, Sendungsnummer ${o.supplier.trackNumber}.` : '',
        'Die Sendungsverfolgung zeigt die ersten Daten manchmal erst nach 24 Stunden an.',
      ],
      cta: 'Sendung verfolgen',
    },
    delivered: {
      subject: (o) => `Ihre Bestellung ${o.number} wurde zugestellt`,
      lines: () => [
        'Ihr Paket wurde zugestellt. Wir hoffen, alles ist in bestem Zustand bei Ihnen angekommen.',
        'Fehlt etwas oder ist etwas beschädigt? Antworten Sie einfach auf diese E-Mail, wir kümmern uns sofort darum.',
      ],
      cta: 'Bestellung ansehen',
    },
    address: {
      subject: (o) => `Bitte ergänzen Sie Ihre Lieferadresse (${o.number})`,
      lines: (o) => [
        'vielen Dank für Ihre Bestellung! Damit wir sie versenden können, fehlt in Ihrer Lieferadresse noch die Hausnummer oder ein Teil der Adresse:',
        addressLine(o),
        'Bitte ergänzen Sie sie mit einem Klick, das dauert 30 Sekunden. Danach geht Ihre Bestellung sofort in den Versand.',
      ],
      cta: 'Adresse ergänzen',
    },
    cancelled: {
      subject: (o) => `Ihre Bestellung ${o.number}: volle Erstattung`,
      lines: (o) => [
        'es tut uns sehr leid: Unser Lieferant kann Ihre Bestellung leider nicht ausliefern.',
        `Wir haben Ihnen den vollen Betrag von ${euros(o.refund?.cents ?? o.totalCents)} erstattet. Je nach Bank erscheint die Gutschrift innerhalb von 5 bis 10 Werktagen auf Ihrem Konto.`,
        'Bitte entschuldigen Sie die Unannehmlichkeiten.',
      ],
      cta: 'Zum Shop',
    },
    review: {
      subject: (o) => `Wie gefällt Ihnen ${o.items[0]?.name || 'Ihre Bestellung'}?`,
      lines: (o) => [
        `Ihre Bestellung ${o.number} ist jetzt einige Tage bei Ihnen. Wie zufrieden sind Sie?`,
        'Ihre ehrliche Bewertung hilft anderen Kundinnen und Kunden und dauert nur eine Minute.',
        'Etwas nicht in Ordnung? Antworten Sie auf diese E-Mail, wir helfen gern.',
      ],
      cta: 'Bewertung schreiben',
    },
  },
  fr: {
    hello: (n) => (n ? `Bonjour ${n},` : 'Bonjour,'),
    bye: (b) => `Bien à vous,\nL’équipe ${b}`,
    footer: (n) => `Vous recevez cet e-mail au sujet de votre commande ${n}.`,
    shipped: {
      subject: (o) => `Votre commande ${o.number} est en route`,
      lines: (o) => [
        'bonne nouvelle : votre commande est en route.',
        o.supplier.trackNumber ? `Transporteur ${o.supplier.logisticName || ''}, numéro de suivi ${o.supplier.trackNumber}.`.replace('  ', ' ') : '',
        'Le suivi affiche parfois les premières informations seulement après 24 heures.',
      ],
      cta: 'Suivre le colis',
    },
    delivered: {
      subject: (o) => `Votre commande ${o.number} a été livrée`,
      lines: () => [
        'Votre colis a été livré. Nous espérons que tout est arrivé en parfait état.',
        'Un article manque ou est abîmé ? Répondez simplement à cet e-mail, nous nous en occupons tout de suite.',
      ],
      cta: 'Voir la commande',
    },
    address: {
      subject: (o) => `Merci de compléter votre adresse de livraison (${o.number})`,
      lines: (o) => [
        'merci pour votre commande ! Pour pouvoir l’expédier, il manque le numéro de rue ou une partie de votre adresse :',
        addressLine(o),
        'Complétez-la en un clic, cela prend 30 secondes. Votre commande part ensuite immédiatement.',
      ],
      cta: 'Compléter l’adresse',
    },
    cancelled: {
      subject: (o) => `Votre commande ${o.number} : remboursement intégral`,
      lines: (o) => [
        'nous sommes vraiment désolés : notre fournisseur ne peut malheureusement pas livrer votre commande.',
        `Nous vous avons remboursé l’intégralité, soit ${euros(o.refund?.cents ?? o.totalCents)}. Selon votre banque, le crédit apparaît sous 5 à 10 jours ouvrés.`,
        'Toutes nos excuses pour ce désagrément.',
      ],
      cta: 'Retour à la boutique',
    },
    review: {
      subject: (o) => `Que pensez-vous de ${o.items[0]?.name || 'votre commande'} ?`,
      lines: (o) => [
        `Votre commande ${o.number} est chez vous depuis quelques jours. Êtes-vous satisfait(e) ?`,
        'Votre avis sincère aide les autres clients et ne prend qu’une minute.',
        'Un souci ? Répondez à cet e-mail, nous vous aidons volontiers.',
      ],
      cta: 'Donner mon avis',
    },
  },
  en: {
    hello: (n) => (n ? `Hello ${n},` : 'Hello,'),
    bye: (b) => `Kind regards,\nThe ${b} team`,
    footer: (n) => `You are receiving this e-mail about your order ${n}.`,
    shipped: {
      subject: (o) => `Your order ${o.number} is on its way`,
      lines: (o) => [
        'good news: your order is on its way to you.',
        o.supplier.trackNumber ? `Shipped with ${o.supplier.logisticName || 'the carrier'}, tracking number ${o.supplier.trackNumber}.` : '',
        'Tracking sometimes shows the first scan only after 24 hours.',
      ],
      cta: 'Track the parcel',
    },
    delivered: {
      subject: (o) => `Your order ${o.number} has been delivered`,
      lines: () => [
        'Your parcel has been delivered. We hope everything arrived in perfect condition.',
        'Something missing or damaged? Just reply to this e-mail and we will sort it out right away.',
      ],
      cta: 'View the order',
    },
    address: {
      subject: (o) => `Please complete your delivery address (${o.number})`,
      lines: (o) => [
        'thank you for your order! To ship it, your delivery address still needs the house number or part of the address:',
        addressLine(o),
        'Please complete it in one click, it takes 30 seconds. Your order ships right after.',
      ],
      cta: 'Complete the address',
    },
    cancelled: {
      subject: (o) => `Your order ${o.number}: full refund`,
      lines: (o) => [
        'we are very sorry: our supplier is unable to deliver your order.',
        `We have refunded the full amount of ${euros(o.refund?.cents ?? o.totalCents)}. Depending on your bank, it shows on your account within 5 to 10 working days.`,
        'Please accept our apologies for the inconvenience.',
      ],
      cta: 'Back to the shop',
    },
    review: {
      subject: (o) => `How do you like ${o.items[0]?.name || 'your order'}?`,
      lines: (o) => [
        `Your order ${o.number} has been with you for a few days now. How happy are you with it?`,
        'Your honest review helps other customers and takes just a minute.',
        'Something not right? Reply to this e-mail, we are happy to help.',
      ],
      cta: 'Write a review',
    },
  },
};

function addressLine(o) {
  const a = o.shipping || {};
  return [a.line1, a.line2, [a.postalCode, a.city].filter(Boolean).join(' '), a.country].filter(Boolean).join(', ');
}

/** Signed link to the address form (no login: the signature proves the e-mail came from us). */
export const addressUrl = (order, token) =>
  `${API_BASE}/api/address?o=${encodeURIComponent(order.sessionId)}&t=${encodeURIComponent(token)}`;

/** Where the button of each e-mail leads. */
function ctaUrl(kind, order, b, extra) {
  const lang = langOf(order);
  const shopOrder = `${b.baseUrl}/${lang}/bestellung.html?order=${encodeURIComponent(order.number)}`;
  if (kind === 'shipped') return carrierUrl(order) || shopOrder;
  if (kind === 'delivered') return shopOrder;
  if (kind === 'address') return extra.addressUrl;
  if (kind === 'cancelled') return `${b.baseUrl}/${lang}/`;
  if (kind === 'review') {
    const p = order.items[0]?.id || '';
    return `${b.baseUrl}/${lang}/bewertung.html?p=${encodeURIComponent(p)}&o=${encodeURIComponent(order.number)}&e=${encodeURIComponent(order.customer.email)}`;
  }
  return `${b.baseUrl}/${lang}/`;
}

const SAFETY = {
  de: { title: 'Produktsicherheit', who: 'Hersteller / verantwortliche Person in der EU', material: 'Material' },
  fr: { title: 'Sécurité du produit', who: 'Fabricant / personne responsable dans l’UE', material: 'Matière' },
  en: { title: 'Product safety', who: 'Manufacturer / responsible person in the EU', material: 'Material' },
};

/**
 * Product safety information (EU GPSR) for the items of the order that carry warnings:
 * responsible operator in the EU, product identifier, material, warnings. Sent with the
 * shipping and delivery e-mails, because the supplier's warehouse cannot add a leaflet.
 */
export function safetyLines(order) {
  const lang = langOf(order);
  const items = (order.items || [])
    .map((i) => productOf(order.store, i.id))
    .filter((p, i, a) => p && (p.safety || p.material) && a.indexOf(p) === i);
  if (!items.length) return [];
  const c = brandOf(order).company;
  const t = SAFETY[lang];
  const out = [`${t.title}`, `${t.who}: ${[c.name, c.street, c.city, c.country].filter(Boolean).join(', ')}${c.email ? `, ${c.email}` : ''}`];
  for (const p of items) {
    const name = p.name || p.id;
    const bits = [p.material?.[lang] ? `${t.material}: ${p.material[lang]}.` : '', ...(p.safety?.[lang] ?? [])].filter(Boolean);
    out.push(`${name} (${p.sku || p.id}): ${bits.join(' ')}`);
  }
  return out;
}

/** Builds { subject, html, text } for one kind of customer e-mail. */
export function customerEmail(kind, order, extra = {}) {
  const t = T[langOf(order)];
  const k = t[kind];
  if (!k) throw new Error(`unknown mail ${kind}`);
  const b = brandOf(order);
  const lines = k.lines(order, b).filter(Boolean);
  const url = ctaUrl(kind, order, b, extra);
  const c = b.company;
  const legal = [c.name, c.street, c.city, c.email].filter(Boolean).join(' · ');
  const subject = k.subject(order);
  const safety = kind === 'shipped' || kind === 'delivered' ? safetyLines(order) : [];
  const text = [t.hello(firstName(order)), '', ...lines, '', `${k.cta}: ${url}`, '', t.bye(b.brand), ...(safety.length ? ['', ...safety] : []), '', '—', t.footer(order.number), legal].join('\n');
  const p = (s) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2b2b2b">${esc(s)}</p>`;
  const html = `<!doctype html><html lang="${langOf(order)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f1ec">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<tr><td style="padding:28px 32px 8px;border-bottom:1px solid #eee">
<span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:.06em;font-weight:700;color:${esc(b.color)}">${esc(b.brand)}</span><span style="font-size:12px;color:#8a8a8a"> by AlGBr</span>
</td></tr>
<tr><td style="padding:28px 32px 8px">
${p(t.hello(firstName(order)))}
${lines.map(p).join('\n')}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 24px"><tr><td style="border-radius:999px;background:${esc(b.color)}">
<a href="${esc(url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px">${esc(k.cta)}</a>
</td></tr></table>
${t
  .bye(b.brand)
  .split('\n')
  .map((l, i) => `<p style="margin:0;font-size:15px;line-height:1.6;color:#2b2b2b">${i ? `<b>${esc(l)}</b>` : esc(l)}</p>`)
  .join('')}
</td></tr>
${
  safety.length
    ? `<tr><td style="padding:18px 32px 0"><p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#2b2b2b">${esc(safety[0])}</p>${safety
        .slice(1)
        .map((l) => `<p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#555">${esc(l)}</p>`)
        .join('')}</td></tr>`
    : ''
}
<tr><td style="padding:24px 32px 28px">
<p style="margin:0 0 6px;font-size:12px;color:#8a8a8a">${esc(t.footer(order.number))}</p>
<p style="margin:0;font-size:12px;color:#8a8a8a">${esc(legal)}</p>
</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html, text, replyTo: c.email || undefined, brand: b.brand };
}
