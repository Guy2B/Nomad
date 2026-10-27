/**
 * Transactional e-mail through Resend (HTTP API). Without RESEND_API_KEY the mail is only logged (MOCKED),
 * so the order flow never fails because of e-mail. Templates are short and factual: no pressure, no fake urgency.
 */
const T = {
  confirm: {
    de: (o) => [`Bestellung ${o.number} ist bestätigt`, `Danke für deine Bestellung bei Algebra.\n\nBestellnummer: ${o.number}\nBetrag: ${o.total.toFixed(2).replace('.', ',')} €\n\nJedes Stück wird jetzt für dich gefertigt. Sobald dein Paket unterwegs ist, bekommst du den Link zur Sendungsverfolgung.\n\nAlgebra`],
    en: (o) => [`Order ${o.number} is confirmed`, `Thank you for your Algebra order.\n\nOrder number: ${o.number}\nAmount: ${o.total.toFixed(2)} €\n\nEach piece is now being made for you. Once your parcel is on its way, you will get the tracking link.\n\nAlgebra`],
    fr: (o) => [`Commande ${o.number} confirmée`, `Merci pour votre commande Algebra.\n\nNuméro de commande : ${o.number}\nMontant : ${o.total.toFixed(2).replace('.', ',')} €\n\nChaque pièce est maintenant fabriquée pour vous. Dès que votre colis part, vous recevrez le lien de suivi.\n\nAlgebra`],
  },
  shipped: {
    de: (o) => [`Bestellung ${o.number} ist unterwegs`, `Deine Bestellung ${o.number} wurde verschickt.\n\nVersand: ${o.carrier || ''} ${o.tracking_number || ''}\n${o.tracking_url || ''}\n\nAlgebra`],
    en: (o) => [`Order ${o.number} is on its way`, `Your order ${o.number} has shipped.\n\nCarrier: ${o.carrier || ''} ${o.tracking_number || ''}\n${o.tracking_url || ''}\n\nAlgebra`],
    fr: (o) => [`Commande ${o.number} expédiée`, `Votre commande ${o.number} est en route.\n\nTransporteur : ${o.carrier || ''} ${o.tracking_number || ''}\n${o.tracking_url || ''}\n\nAlgebra`],
  },
  delivered: {
    de: (o) => [`Bestellung ${o.number} ist angekommen`, `Laut Versanddienst ist deine Bestellung ${o.number} zugestellt. Passt alles? Antworte einfach auf diese E-Mail, wenn etwas nicht stimmt.\n\nAlgebra`],
    en: (o) => [`Order ${o.number} has arrived`, `According to the carrier your order ${o.number} was delivered. Does everything fit? Just reply to this email if something is wrong.\n\nAlgebra`],
    fr: (o) => [`Commande ${o.number} livrée`, `Selon le transporteur, votre commande ${o.number} a été livrée. Tout va bien ? Répondez simplement à cet e-mail si quelque chose ne va pas.\n\nAlgebra`],
  },
  newsletter: {
    de: (link) => ['Bitte bestätige deine Anmeldung', `Ein Klick, und du bekommst neue Kapseln von Algebra per E-Mail:\n${link}\n\nWenn du dich nicht angemeldet hast, ignoriere diese E-Mail.`],
    en: (link) => ['Please confirm your subscription', `One click and you will get new Algebra capsules by email:\n${link}\n\nIf you did not sign up, ignore this email.`],
    fr: (link) => ['Merci de confirmer votre inscription', `Un clic et vous recevrez les nouvelles capsules Algebra par e-mail :\n${link}\n\nSi vous ne vous êtes pas inscrit, ignorez cet e-mail.`],
  },
  // A Circle: calm, precise, never promotional (no "congratulations", no discount, no urgency).
  circleConfirm: {
    de: ({ link, firstName }) => ['Bitte bestätige: A Circle', `${firstName ? `Hallo ${firstName},\n\n` : ''}ein Klick, und du bist Teil von A Circle:\n${link}\n\nA Circle ist kostenlos, du kannst jederzeit austreten. Wenn du dich nicht angemeldet hast, ignoriere diese E-Mail einfach.\n\nAlgebra`],
    en: ({ link, firstName }) => ['Please confirm: A Circle', `${firstName ? `Hello ${firstName},\n\n` : ''}one click and you are part of A Circle:\n${link}\n\nA Circle is free and you can leave at any time. If you did not sign up, simply ignore this email.\n\nAlgebra`],
    fr: ({ link, firstName }) => ['Merci de confirmer : A Circle', `${firstName ? `Bonjour ${firstName},\n\n` : ''}un clic, et vous faites partie d’A Circle :\n${link}\n\nA Circle est gratuit, vous pouvez le quitter à tout moment. Si vous ne vous êtes pas inscrit, ignorez simplement cet e-mail.\n\nAlgebra`],
  },
  circleWelcome: {
    de: ({ link }) => ['Du bist dabei.', `A Circle gibt dir den ersten Zugang zu ausgewählten Veröffentlichungen von Algebra: neue Kapitel, die Graphic Series, die Knitwear.\n\nWir schreiben selten, und nur, wenn es etwas zu zeigen gibt.\n\nDeine Mitgliedschaft und deine Einstellungen:\n${link}\n\nAlgebra\nBuilt on proportion.`],
    en: ({ link }) => ['You’re inside.', `A Circle gives you first access to selected Algebra releases: new chapters, the Graphic Series, the knitwear.\n\nWe write rarely, and only when there is something to show.\n\nYour membership and preferences:\n${link}\n\nAlgebra\nBuilt on proportion.`],
    fr: ({ link }) => ['Vous y êtes.', `A Circle vous donne un premier accès à une sélection de sorties Algebra : nouveaux chapitres, Graphic Series, maille.\n\nNous écrivons rarement, et seulement quand il y a quelque chose à montrer.\n\nVotre adhésion et vos préférences :\n${link}\n\nAlgebra\nBuilt on proportion.`],
  },
};
// Flows prepared but not sent automatically yet (need a scheduler and consent rules, see docs/EMAIL_FLOWS.md):
// welcome (after newsletter confirmation), abandoned cart (only with consent), post-purchase care tips, review request.

export async function sendMail(env, { to, subject, text, replyTo }, fetchImpl = fetch) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
    console.log(`[mail MOCKED] to=${to} subject=${subject}`);
    return { mocked: true };
  }
  const r = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text, reply_to: replyTo || env.OWNER_EMAIL }),
  });
  if (!r.ok) console.log(`[mail] Resend ${r.status}`);
  return { ok: r.ok };
}

export function template(kind, lang, arg) {
  const t = T[kind][lang] || T[kind].de;
  const [subject, text] = t(arg);
  return { subject, text };
}

export async function notifyOwner(env, subject, text, fetchImpl = fetch) {
  // push to the phone like the AlGBr shops (ntfy), plus e-mail
  if (env.NTFY_TOPIC) {
    try {
      await fetchImpl(`https://ntfy.sh/${encodeURIComponent(env.NTFY_TOPIC)}`, { method: 'POST', headers: { title: `Algebra: ${subject}`.slice(0, 200) }, body: text.slice(0, 2000) });
    } catch {
      /* best effort */
    }
  }
  if (env.OWNER_EMAIL) await sendMail(env, { to: env.OWNER_EMAIL, subject: `[Algebra] ${subject}`, text }, fetchImpl);
  else console.log(`[owner] ${subject}: ${text}`);
}
