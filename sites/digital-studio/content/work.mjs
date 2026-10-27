/**
 * Case studies of algbr.de. Every "result" must be documented in a repository or report named in `evidence`
 * (kept here for review, never rendered). No client figures without written confirmation.
 */
export const WORK = [
  {
    id: 'lune-beauty',
    kind: 'client',
    image: 'assets/work/lune-site.webp',
    url: 'https://lunebeauty.de',
    evidence: 'Guy2B/algbr index.html (Kundenprojekt, live). Kennzahlen des Kunden nicht übernommen: schriftliche Freigabe fehlt.',
    title: { de: 'Lune Beauty', en: 'Lune Beauty', fr: 'Lune Beauty' },
    summary: {
      de: 'Website mit CRM für ein Kosmetikstudio in Worms: online so hochwertig wie vor Ort, mit Anfragen ohne Telefon-Pingpong.',
      en: 'Website with CRM for a beauty studio in Worms: as refined online as in the studio, with enquiries that need no phone tag.',
      fr: 'Site avec CRM pour un institut de beauté à Worms : aussi soigné en ligne que sur place, avec des demandes sans allers-retours téléphoniques.',
    },
    challenge: {
      de: 'Ein Premium-Studio, das online genauso hochwertig wirkt wie vor Ort und Anfragen direkt bekommt.',
      en: 'A premium studio that looks as refined online as on site and receives enquiries directly.',
      fr: 'Un institut premium aussi élégant en ligne qu’en vrai, qui reçoit les demandes directement.',
    },
    approach: {
      de: 'Eigene Bildsprache statt Vorlage, Behandlungen und Preise auf einen Blick, Anfrage mit einem Klick.',
      en: 'Own imagery instead of a template, treatments and prices at a glance, enquiry in one click.',
      fr: 'Une identité visuelle propre plutôt qu’un modèle, soins et tarifs en un coup d’œil, demande en un clic.',
    },
    tech: ['Web', 'CRM', 'Booking'],
    features: {
      de: ['Terminanfrage und WhatsApp mit einem Klick', 'Behandlungen und Preise übersichtlich', 'Skin Check, CRM und Bewertungen im Hintergrund'],
      en: ['Appointment request and WhatsApp in one click', 'Clear treatments and prices', 'Skin check, CRM and reviews behind the scenes'],
      fr: ['Demande de rendez-vous et WhatsApp en un clic', 'Soins et tarifs lisibles', 'Diagnostic de peau, CRM et avis en arrière-plan'],
    },
    results: {
      de: ['Website und CRM im Einsatz'],
      en: ['Website and CRM in use'],
      fr: ['Site et CRM en service'],
    },
  },
  {
    id: 'commerce-platform',
    kind: 'internal',
    brands: ['go', 'space', 'ease', 'glow', 'kin', 'joy', 'off'],
    image: 'assets/brands/go.webp',
    evidence: 'Nomad: README.md, engine/, backend/, .github/workflows/deploy-cloudflare.yml, tests/',
    title: { de: 'AlGBr Commerce-Plattform', en: 'AlGBr commerce platform', fr: 'Plateforme commerce AlGBr' },
    summary: {
      de: 'Sieben Shops, ein gemeinsamer Motor: Warenkorb, Zahlung, Rechnung, Lieferantenbestellung, Sendungsverfolgung und Dashboard für alle Marken.',
      en: 'Seven shops, one shared engine: cart, payment, invoice, supplier order, tracking and dashboard for every brand.',
      fr: 'Sept boutiques, un moteur commun : panier, paiement, facture, commande fournisseur, suivi et tableau de bord pour toutes les marques.',
    },
    challenge: {
      de: 'Mehrere Marken schnell und mit wenig Fixkosten starten, ohne dass jede Marke eigene Technik braucht oder ihre Identität verliert.',
      en: 'Launch several brands quickly with low fixed costs, without each brand needing its own technology or losing its identity.',
      fr: 'Lancer plusieurs marques rapidement avec peu de coûts fixes, sans que chacune ait besoin de sa propre technique ni perde son identité.',
    },
    approach: {
      de: 'Ein Shop ist ein Ordner mit Katalog, Texten und Gestaltung; der gemeinsame Motor erledigt den Rest. Ein Sonderfall bleibt ein Sonderfall: OFF. verkauft aus eigenem Bestand und hat einen eigenen Ablauf.',
      en: 'A shop is a folder with catalogue, copy and design; the shared engine does the rest. A special case stays special: OFF. sells from its own stock and has a flow of its own.',
      fr: 'Une boutique est un dossier avec catalogue, textes et design ; le moteur commun fait le reste. Un cas particulier le reste : OFF. vend sur son propre stock et dispose de son propre circuit.',
    },
    tech: ['Cloudflare Workers & Pages', 'Cloudflare D1', 'Stripe Checkout', 'CJdropshipping API', 'Resend', 'GitHub Actions'],
    features: {
      de: ['Preise werden nur auf dem Server berechnet', 'Bestellung beim Lieferanten automatisch nach Zahlung', 'Statusabgleich jede Stunde, Sendungsverfolgung für Kunden', 'Statische Seiten in drei Sprachen mit hreflang, strukturierten Daten und Produkt-Feed', 'Statistik ohne Cookies'],
      en: ['Prices are computed on the server only', 'Supplier order placed automatically after payment', 'Hourly status sync, tracking for customers', 'Static pages in three languages with hreflang, structured data and product feed', 'Analytics without cookies'],
      fr: ['Prix calculés uniquement côté serveur', 'Commande fournisseur automatique après paiement', 'Synchronisation horaire des statuts, suivi pour les clients', 'Pages statiques en trois langues avec hreflang, données structurées et flux produits', 'Statistiques sans cookies'],
    },
    results: {
      de: ['7 Shops auf einer Plattform online', 'Jeder Shop in Deutsch, Französisch und Englisch', 'Automatische Tests vor jeder Veröffentlichung; schlägt ein Test fehl, wird nichts veröffentlicht', 'Neue Marke: ein Ordner und ein Eintrag im Markenregister'],
      en: ['7 shops live on one platform', 'Every shop in German, French and English', 'Automated tests before every release; if one fails, nothing is published', 'New brand: one folder and one entry in the brand registry'],
      fr: ['7 boutiques en ligne sur une seule plateforme', 'Chaque boutique en allemand, français et anglais', 'Tests automatisés avant chaque publication ; si un test échoue, rien n’est publié', 'Nouvelle marque : un dossier et une entrée dans le registre des marques'],
    },
  },
  {
    id: 'algebra',
    kind: 'internal',
    brands: ['algebra'],
    image: 'assets/work/algebra-campaign.webp',
    evidence: 'Nomad: algebra/ALGEBRA_LAUNCH_REPORT.md (22.10.2026), algebra/tests, algebra/qa/report.json',
    title: { de: 'Algebra · Modemarke', en: 'Algebra · fashion label', fr: 'Algebra · marque de mode' },
    summary: {
      de: 'Eine Modemarke von Grund auf: Zeichen, Typografie, Kollektion, Shop und eine Bestelllogik, bei der jedes Stück erst nach der Zahlung entsteht.',
      en: 'A fashion label from scratch: mark, typography, collection, shop and an order flow in which each piece is made only after payment.',
      fr: 'Une marque de mode de A à Z : symbole, typographie, collection, boutique et une logique de commande où chaque pièce n’est fabriquée qu’après paiement.',
    },
    challenge: {
      de: 'Eine Premium-Marke ohne Lagerbestand aufbauen, die wie ein eigenständiges Modehaus wirkt.',
      en: 'Build a premium label without inventory that reads as an independent fashion house.',
      fr: 'Construire une marque premium sans stock qui ait la crédibilité d’une maison de mode indépendante.',
    },
    approach: {
      de: 'Ein festgeschriebenes Markenzeichen, ein einziger Katalog als Quelle für Shop, Kasse und Produktion, klare Kennzeichnung von Entwürfen und Mockups.',
      en: 'One locked brand mark, a single catalogue feeding shop, checkout and production, clear labelling of concepts and mockups.',
      fr: 'Un symbole de marque verrouillé, un catalogue unique pour la boutique, le paiement et la production, des concepts et maquettes clairement signalés.',
    },
    tech: ['Cloudflare Workers', 'Cloudflare D1', 'Stripe Checkout', 'Production partner API', 'Resend'],
    features: {
      de: ['Markensystem mit Regeln für Stick und Druck', 'Shop in Deutsch, Englisch und Französisch', 'Nicht freigegebene Produkte sind serverseitig nicht kaufbar', 'Bestellstatus von Zahlung bis Zustellung'],
      en: ['Brand system with rules for embroidery and print', 'Shop in German, English and French', 'Products not yet approved cannot be bought, enforced on the server', 'Order status from payment to delivery'],
      fr: ['Système de marque avec règles de broderie et d’impression', 'Boutique en allemand, anglais et français', 'Produits non validés impossibles à acheter, contrôle côté serveur', 'Statut de commande du paiement à la livraison'],
    },
    results: {
      de: ['Stand: Vorschau, noch nicht öffentlich im Verkauf', '36 von 36 Browser-Prüfungen bestanden (lokal)', 'Lighthouse mobil, lokal gemessen: Performance 97 bis 100, Barrierefreiheit 99 bis 100'],
      en: ['Status: preview, not yet on public sale', '36 of 36 browser checks passed (local)', 'Lighthouse mobile, measured locally: performance 97 to 100, accessibility 99 to 100'],
      fr: ['État : aperçu, pas encore en vente publique', '36 contrôles navigateur sur 36 réussis (en local)', 'Lighthouse mobile, mesuré en local : performance 97 à 100, accessibilité 99 à 100'],
    },
  },
  {
    id: 'next',
    kind: 'internal',
    software: 'next',
    image: 'assets/work/next-screens.webp',
    evidence: 'sum-plus: README.md, CHANGELOG.md 1.0.0 (30.09.2026)',
    title: { de: 'nΣxt LifeOS', en: 'nΣxt LifeOS', fr: 'nΣxt LifeOS' },
    summary: {
      de: 'Eine eigene App, die aus Aufgaben, Kalender und Mails höchstens drei erklärte Entscheidungen pro Tag macht.',
      en: 'An in-house app that turns tasks, calendar and mail into at most three explained decisions a day.',
      fr: 'Une application maison qui transforme tâches, agenda et e-mails en trois décisions expliquées par jour au maximum.',
    },
    challenge: {
      de: 'Persönliche Daten nützlich machen, ohne die Kontrolle darüber abzugeben.',
      en: 'Make personal data useful without giving up control over it.',
      fr: 'Rendre les données personnelles utiles sans en perdre le contrôle.',
    },
    approach: {
      de: 'Lokal zuerst, offline nutzbar, keine externe Aktion ohne Bestätigung; Cloud-Funktionen nur in der EU.',
      en: 'Local-first, usable offline, no external action without confirmation; cloud functions in the EU only.',
      fr: 'Local d’abord, utilisable hors ligne, aucune action externe sans confirmation ; fonctions cloud uniquement dans l’UE.',
    },
    tech: ['TypeScript', 'Preact', 'Vite', 'Firebase', 'Capacitor'],
    features: null,
    results: null,
  },
];
