/** OFF. texts (de/fr/en). German is the reference language of the shop. */
export const LANGS = ['de', 'fr', 'en'];

export const money = (lang, cents) =>
  new Intl.NumberFormat(lang === 'en' ? 'en-IE' : lang === 'fr' ? 'fr-FR' : 'de-DE', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);

export const CONDITION = {
  de: { new: 'Neu mit Originalkarton', new_no_box: 'Neu, ohne Originalkarton', like_new: 'Wie neu (kaum getragen)' },
  fr: { new: 'Neuf avec boîte d’origine', new_no_box: 'Neuf, sans boîte d’origine', like_new: 'Comme neuf (très peu porté)' },
  en: { new: 'New with original box', new_no_box: 'New, without original box', like_new: 'Like new (barely worn)' },
};

const legal = {
  de: { impressum: 'Impressum', datenschutz: 'Datenschutz', agb: 'AGB', widerruf: 'Widerruf', versand: 'Versand & Zahlung' },
  fr: { impressum: 'Mentions légales', datenschutz: 'Confidentialité', agb: 'CGV', widerruf: 'Rétractation', versand: 'Livraison & paiement' },
  en: { impressum: 'Legal notice', datenschutz: 'Privacy', agb: 'Terms', widerruf: 'Withdrawal', versand: 'Shipping & payment' },
};

export const T = {
  de: {
    top: 'OFF. · Markenware unter UVP · Echter Bestand in Deutschland',
    nav: { shop: 'Shop', archive: 'Archiv', find: 'Private Sourcing', track: 'Bestellung' },
    seo: { title: 'OFF. by AlGBr · Markenschuhe unter UVP, sofort verfügbar', description: 'Originale Markenschuhe aus dem Outlet, unter UVP, geprüft und aus Deutschland verschickt. Einzelstücke, wenn weg, dann weg. Private Sourcing für Ihre Größe.' },
    hero: {
      eyebrow: 'Ausgewählt unter UVP',
      title: ['Originale Marken.', 'Unter UVP. Sofort da.'],
      text: 'Wir kaufen ausgewählte Markenpaare im Outlet, prüfen sie und stellen sie online, sobald sie bei uns in Deutschland auf Lager sind. Einzelstücke, wenn weg, dann weg.',
      cta: 'Jetzt verfügbar',
      cta2: 'Ihre Größe suchen lassen',
      live: 'Live-Bestand',
      liveText: 'Referenzen, die jetzt versandbereit sind. Die Auswahl ändert sich mit jedem neuen Fund.',
    },
    promise: ['100 % Originalware', 'Versand aus Deutschland in 2–4 Werktagen', '14 Tage Widerrufsrecht'],
    shop: {
      eyebrow: 'Jetzt verfügbar', title: 'Neu eingetroffen', search: 'Marke, Modell, Referenz suchen', brand: 'Marke', allBrands: 'Alle Marken', size: 'Größe', allSizes: 'Alle Größen',
      sort: 'Sortierung', newest: 'Neueste zuerst', priceAsc: 'Preis aufsteigend', priceDesc: 'Preis absteigend',
      count: (n) => `${n} ${n === 1 ? 'Artikel' : 'Artikel'}`, meta: 'Echter Bestand · Begrenzte Stückzahl', empty: 'Gerade ist alles verkauft. Neue Funde kommen bald oder lassen Sie Ihre Größe suchen.', noMatch: 'Kein Treffer für diese Auswahl.',
    },
    archive: { eyebrow: 'Frühere Funde', title: 'Verkauft. Weiter anfragbar.', text: 'Diese Paare sind weg. Wir suchen gerne ein ähnliches in Ihrer Größe.' },
    find: {
      eyebrow: 'Private Sourcing', title: 'Ein bestimmtes Paar gesucht?', text: 'Marke, Modell, Farbe, Größe und Budget: wir melden uns innerhalb von 24–48 Stunden, wenn wir es finden.',
      points: ['Unverbindlich und kostenlos', 'Nur Originalware', 'Antwort per E-Mail'],
      brand: 'Marke', model: 'Modell', color: 'Farbe', size: 'EU-Größe', budget: 'Max. Budget (€)', email: 'E-Mail', notes: 'Referenz / Notiz',
      privacy: 'Wir nutzen Ihre Angaben nur, um auf Ihre Anfrage zu antworten.', submit: 'Anfrage senden', ok: 'Danke! Ihre Anfrage ist bei uns. Wir melden uns per E-Mail.', error: 'Senden nicht möglich. Bitte prüfen Sie E-Mail und Größe.',
    },
    pdp: {
      back: 'Zurück zum Shop', photo: 'Foto', rrp: 'UVP des Herstellers', vat: 'Endpreis, keine Umsatzsteuer ausgewiesen (§ 19 UStG), zzgl. 5,79 € Versand.', inStock: '● 1 verfügbar · versandbereit in Deutschland', inStockN: (n) => `● ${n} verfügbar · versandbereit in Deutschland`, soldOut: 'Verkauft · früherer Fund',
      size: 'Größe', condition: 'Zustand', ship: 'Versand', shipText: 'Hermes mit Sendungsverfolgung · 5,79 € · 2–4 Werktage', returns: 'Rückgabe', returnsText: '14 Tage Widerrufsrecht',
      buy: 'Jetzt kaufen', request: 'Ähnliches Paar anfragen', otherSize: 'Andere Größe suchen lassen', details: 'Details', authentic: 'Originalware · aus eigenem Bestand in Deutschland', more: 'Ebenfalls verfügbar',
      metaTail: 'Originalware unter UVP, Versand aus Deutschland.', reserving: 'Einen Moment, der Artikel wird für Sie reserviert…', reserved: 'Gerade reserviert jemand dieses Paar. Bitte in 30 Minuten erneut versuchen.', soldNow: 'Leider gerade verkauft.', error: 'Die Kasse ist gerade nicht erreichbar. Bitte später erneut versuchen.',
    },
    thanks: { title: 'Danke für Ihre Bestellung!', text: 'Sie erhalten die Bestätigung und die Rechnung per E-Mail. Wir verschicken Ihr Paar innerhalb von 1–2 Werktagen.', wait: 'Ihre Bestellnummer erscheint gleich…', back: 'Zurück zum Shop' },
    track: { title: 'Bestellung verfolgen', text: 'Bestellnummer und E-Mail eingeben.', number: 'Bestellnummer', submit: 'Status anzeigen' },
    notFound: 'Seite nicht gefunden',
    sold: 'VERKAUFT', one: '1 VERFÜGBAR', left: (n) => `${n} VERFÜGBAR`,
    footer: 'Originale Markenschuhe unter UVP, aus Deutschland verschickt.', rights: 'Eine Marke von AlGBr.', service: 'Service', contact: 'Kontakt', legal: legal.de,
    status: { processing: 'In Bearbeitung', supplier_ordered: 'Wird verpackt', shipped: 'Verschickt', delivered: 'Zugestellt', cancelled: 'Storniert' }, trackNotFound: 'Keine Bestellung mit diesen Angaben gefunden.',
  },
  fr: {
    top: 'OFF. · Grandes marques sous le prix conseillé · Stock réel en Allemagne',
    nav: { shop: 'Boutique', archive: 'Archive', find: 'Private Sourcing', track: 'Commande' },
    seo: { title: 'OFF. by AlGBr · Chaussures de marque sous le prix conseillé', description: 'Chaussures de marque authentiques issues d’outlet, sous le prix conseillé, vérifiées et expédiées depuis l’Allemagne. Pièces uniques. Private Sourcing pour votre pointure.' },
    hero: {
      eyebrow: 'Sélectionné sous le prix conseillé',
      title: ['Marques authentiques.', 'Moins chères. Disponibles.'],
      text: 'Nous achetons des paires de marque choisies en outlet, les vérifions et les mettons en ligne dès qu’elles sont en stock chez nous, en Allemagne. Pièces uniques, une fois parties, c’est fini.',
      cta: 'Disponible maintenant',
      cta2: 'Faire chercher ma pointure',
      live: 'Stock en direct',
      liveText: 'Références prêtes à partir. La sélection change à chaque nouvelle trouvaille.',
    },
    promise: ['100 % authentique', 'Expédié d’Allemagne en 2–4 jours ouvrés', '14 jours de rétractation'],
    shop: {
      eyebrow: 'Disponible maintenant', title: 'Nouveautés', search: 'Marque, modèle, référence', brand: 'Marque', allBrands: 'Toutes les marques', size: 'Pointure', allSizes: 'Toutes les pointures',
      sort: 'Tri', newest: 'Plus récents', priceAsc: 'Prix croissant', priceDesc: 'Prix décroissant',
      count: (n) => `${n} article${n > 1 ? 's' : ''}`, meta: 'Stock réel · Quantités limitées', empty: 'Tout est vendu pour le moment. De nouvelles trouvailles arrivent ou faites chercher votre pointure.', noMatch: 'Aucun résultat pour cette sélection.',
    },
    archive: { eyebrow: 'Trouvailles passées', title: 'Vendu. Toujours demandable.', text: 'Ces paires sont parties. Nous pouvons en chercher une similaire à votre pointure.' },
    find: {
      eyebrow: 'Private Sourcing', title: 'Vous cherchez une paire précise ?', text: 'Marque, modèle, couleur, pointure et budget : nous revenons vers vous sous 24–48 heures si nous la trouvons.',
      points: ['Sans engagement et gratuit', 'Uniquement de l’authentique', 'Réponse par e-mail'],
      brand: 'Marque', model: 'Modèle', color: 'Couleur', size: 'Pointure EU', budget: 'Budget max. (€)', email: 'E-mail', notes: 'Référence / note',
      privacy: 'Vos informations servent uniquement à répondre à votre demande.', submit: 'Envoyer la demande', ok: 'Merci ! Votre demande est bien reçue. Nous vous répondons par e-mail.', error: 'Envoi impossible. Vérifiez l’e-mail et la pointure.',
    },
    pdp: {
      back: 'Retour à la boutique', photo: 'Photo', rrp: 'Prix conseillé du fabricant', vat: 'Prix final, TVA non applicable (§ 19 UStG), + 5,79 € de livraison.', inStock: '● 1 disponible · prêt à partir d’Allemagne', inStockN: (n) => `● ${n} disponibles · prêts à partir d’Allemagne`, soldOut: 'Vendu · trouvaille passée',
      size: 'Pointure', condition: 'État', ship: 'Livraison', shipText: 'Hermes suivi · 5,79 € · 2–4 jours ouvrés', returns: 'Retour', returnsText: '14 jours de rétractation',
      buy: 'Acheter', request: 'Demander une paire similaire', otherSize: 'Faire chercher une autre pointure', details: 'Détails', authentic: 'Authentique · issu de notre stock en Allemagne', more: 'Également disponible',
      metaTail: 'Authentique, sous le prix conseillé, expédié d’Allemagne.', reserving: 'Un instant, l’article vous est réservé…', reserved: 'Quelqu’un est en train de réserver cette paire. Réessayez dans 30 minutes.', soldNow: 'Désolé, elle vient d’être vendue.', error: 'Le paiement est indisponible pour le moment. Réessayez plus tard.',
    },
    thanks: { title: 'Merci pour votre commande !', text: 'Vous recevez la confirmation et la facture par e-mail. Nous expédions votre paire sous 1–2 jours ouvrés.', wait: 'Votre numéro de commande arrive…', back: 'Retour à la boutique' },
    track: { title: 'Suivre ma commande', text: 'Saisissez votre numéro de commande et votre e-mail.', number: 'Numéro de commande', submit: 'Voir le statut' },
    notFound: 'Page introuvable',
    sold: 'VENDU', one: '1 DISPONIBLE', left: (n) => `${n} DISPONIBLES`,
    footer: 'Chaussures de marque authentiques sous le prix conseillé, expédiées d’Allemagne.', rights: 'Une marque AlGBr.', service: 'Service', contact: 'Contact', legal: legal.fr,
    status: { processing: 'En préparation', supplier_ordered: 'En cours d’emballage', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée' }, trackNotFound: 'Aucune commande trouvée avec ces informations.',
  },
  en: {
    top: 'OFF. · Branded pieces below RRP · Real stock in Germany',
    nav: { shop: 'Shop', archive: 'Archive', find: 'Private Sourcing', track: 'Order' },
    seo: { title: 'OFF. by AlGBr · Branded shoes below RRP, available now', description: 'Authentic branded outlet shoes below RRP, checked and shipped from Germany. One-offs, once gone, they’re gone. Private sourcing for your size.' },
    hero: {
      eyebrow: 'Selected below retail',
      title: ['Authentic brands.', 'Below RRP. Available now.'],
      text: 'We buy selected branded pairs at outlets, check them and publish them as soon as they are in stock with us in Germany. One-offs, once gone, they’re gone.',
      cta: 'Available now',
      cta2: 'Find my size',
      live: 'Live inventory',
      liveText: 'References ready to ship now. The selection changes with every new find.',
    },
    promise: ['100 % authentic', 'Ships from Germany in 2–4 working days', '14-day right of withdrawal'],
    shop: {
      eyebrow: 'Live now', title: 'New arrivals', search: 'Search brand, model, reference', brand: 'Brand', allBrands: 'All brands', size: 'Size', allSizes: 'All sizes',
      sort: 'Sort', newest: 'Newest', priceAsc: 'Price low to high', priceDesc: 'Price high to low',
      count: (n) => `${n} item${n > 1 ? 's' : ''}`, meta: 'Real stock · Limited quantities', empty: 'Everything is sold right now. New finds are coming or ask us to find your size.', noMatch: 'No match for this selection.',
    },
    archive: { eyebrow: 'Past finds', title: 'Sold. Still requestable.', text: 'These pairs are gone. We are happy to look for a similar one in your size.' },
    find: {
      eyebrow: 'Private sourcing', title: 'Looking for a specific pair?', text: 'Brand, model, colour, size and budget: we get back to you within 24–48 hours if we find it.',
      points: ['Free and non-binding', 'Authentic only', 'Reply by e-mail'],
      brand: 'Brand', model: 'Model', color: 'Colour', size: 'EU size', budget: 'Max. budget (€)', email: 'E-mail', notes: 'Reference / notes',
      privacy: 'We only use your details to reply to your request.', submit: 'Send request', ok: 'Thank you! Your request has arrived. We will reply by e-mail.', error: 'Could not send. Please check e-mail and size.',
    },
    pdp: {
      back: 'Back to the shop', photo: 'Photo', rrp: 'Manufacturer’s RRP', vat: 'Final price, no VAT shown (§ 19 UStG), plus €5.79 shipping.', inStock: '● 1 available · ready to ship in Germany', inStockN: (n) => `● ${n} available · ready to ship in Germany`, soldOut: 'Sold · past find',
      size: 'Size', condition: 'Condition', ship: 'Shipping', shipText: 'Hermes tracked · €5.79 · 2–4 working days', returns: 'Returns', returnsText: '14-day right of withdrawal',
      buy: 'Buy now', request: 'Request a similar pair', otherSize: 'Find another size', details: 'Details', authentic: 'Authentic · from our own stock in Germany', more: 'Also available',
      metaTail: 'Authentic, below RRP, shipped from Germany.', reserving: 'One moment, reserving the item for you…', reserved: 'Someone is checking out this pair right now. Please try again in 30 minutes.', soldNow: 'Sorry, it has just sold.', error: 'Checkout is unavailable right now. Please try again later.',
    },
    thanks: { title: 'Thank you for your order!', text: 'You will receive the confirmation and invoice by e-mail. We ship your pair within 1–2 working days.', wait: 'Your order number is on its way…', back: 'Back to the shop' },
    track: { title: 'Track my order', text: 'Enter your order number and e-mail.', number: 'Order number', submit: 'Show status' },
    notFound: 'Page not found',
    sold: 'SOLD', one: '1 AVAILABLE', left: (n) => `${n} AVAILABLE`,
    footer: 'Authentic branded shoes below RRP, shipped from Germany.', rights: 'An AlGBr brand.', service: 'Service', contact: 'Contact', legal: legal.en,
    status: { processing: 'Processing', supplier_ordered: 'Being packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }, trackNotFound: 'No order found with these details.',
  },
};
