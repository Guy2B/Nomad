/**
 * Texts of algbr.de (DE reference, EN, FR). Facts only: nothing here may claim a client, a figure or a
 * result that is not documented in the repositories (see docs/architecture/ALGBR_AUDIT.md §8).
 * Brand and software facts come from shared/brands.json and shared/software.json, not from this file.
 */

export const LANGS = ['de', 'en', 'fr'];
export const DEFAULT_LANG = 'de';

/** URL slug of each page (same in every language, so links and hreflang stay simple). */
export const PAGES = ['', 'services', 'brands', 'software', 'work', 'about', 'contact', 'impressum', 'datenschutz'];

export const UI = {
  de: {
    htmlLang: 'de',
    langName: 'Deutsch',
    skip: 'Zum Inhalt springen',
    nav: { '': 'Studio', services: 'Leistungen', brands: 'Marken', software: 'Software', work: 'Arbeiten', about: 'Über uns', contact: 'Kontakt' },
    menu: 'Menü',
    language: 'Sprache',
    cta: 'Projekt anfragen',
    footer: {
      line: 'Websites, Shops, Software und Automatisierung. Gebaut und betrieben von AlGBr.',
      legal: { impressum: 'Impressum', datenschutz: 'Datenschutz' },
      rights: 'Alle Rechte vorbehalten.',
    },
    status: { live: 'Online', preview: 'Vorschau', seasonal: 'Saisonal', planned: 'Geplant', retired: 'Eingestellt', development: 'In Entwicklung', beta: 'Beta' },
    shopType: {
      dropshipping: 'Gemeinsame Handelsplattform, Versand durch Partnerlager',
      'own-stock': 'Eigener Bestand, eigener Versand',
      'print-on-demand': 'Eigene Marke, Produktion nach Bestellung',
    },
    category: { fashion: 'Mode', travel: 'Reisen', 'home-organisation': 'Ordnung zuhause', wellbeing: 'Wohlbefinden', beauty: 'Schönheit & Schlaf', pets: 'Haustiere', seasonal: 'Saisonal', outlet: 'Outlet' },
    visit: 'Website öffnen',
    details: 'Mehr zur Marke',
    allBrands: 'Alle Marken',
    internal: 'Eigenes Projekt von AlGBr',
    client: 'Kundenprojekt',
    languages: 'Sprachen',
    domain: 'Adresse',
    model: 'Modell',
    planned: 'Umzug geplant nach',
    legalNote: '',
  },
  en: {
    htmlLang: 'en',
    langName: 'English',
    skip: 'Skip to content',
    nav: { '': 'Studio', services: 'Services', brands: 'Brands', software: 'Software', work: 'Work', about: 'About', contact: 'Contact' },
    menu: 'Menu',
    language: 'Language',
    cta: 'Start a project',
    footer: {
      line: 'Websites, shops, software and automation. Built and run by AlGBr.',
      legal: { impressum: 'Legal notice', datenschutz: 'Privacy' },
      rights: 'All rights reserved.',
    },
    status: { live: 'Live', preview: 'Preview', seasonal: 'Seasonal', planned: 'Planned', retired: 'Retired', development: 'In development', beta: 'Beta' },
    shopType: {
      dropshipping: 'Shared commerce platform, shipped from partner warehouses',
      'own-stock': 'Own stock, own shipping',
      'print-on-demand': 'Own label, made after each order',
    },
    category: { fashion: 'Fashion', travel: 'Travel', 'home-organisation': 'Home organisation', wellbeing: 'Wellbeing', beauty: 'Beauty & sleep', pets: 'Pets', seasonal: 'Seasonal', outlet: 'Outlet' },
    visit: 'Open website',
    details: 'About the brand',
    allBrands: 'All brands',
    internal: 'In-house AlGBr project',
    client: 'Client project',
    languages: 'Languages',
    domain: 'Address',
    model: 'Model',
    planned: 'Moving to',
    legalNote: 'The legally binding version of this page is German.',
  },
  fr: {
    htmlLang: 'fr',
    langName: 'Français',
    skip: 'Aller au contenu',
    nav: { '': 'Studio', services: 'Services', brands: 'Marques', software: 'Logiciels', work: 'Réalisations', about: 'À propos', contact: 'Contact' },
    menu: 'Menu',
    language: 'Langue',
    cta: 'Démarrer un projet',
    footer: {
      line: 'Sites, boutiques, logiciels et automatisations. Conçus et exploités par AlGBr.',
      legal: { impressum: 'Mentions légales', datenschutz: 'Confidentialité' },
      rights: 'Tous droits réservés.',
    },
    status: { live: 'En ligne', preview: 'Aperçu', seasonal: 'Saisonnier', planned: 'Prévu', retired: 'Arrêté', development: 'En développement', beta: 'Bêta' },
    shopType: {
      dropshipping: 'Plateforme commerciale commune, expédition depuis des entrepôts partenaires',
      'own-stock': 'Stock propre, expédition par nos soins',
      'print-on-demand': 'Marque propre, fabrication après commande',
    },
    category: { fashion: 'Mode', travel: 'Voyage', 'home-organisation': 'Rangement', wellbeing: 'Bien-être', beauty: 'Beauté & sommeil', pets: 'Animaux', seasonal: 'Saisonnier', outlet: 'Outlet' },
    visit: 'Ouvrir le site',
    details: 'Découvrir la marque',
    allBrands: 'Toutes les marques',
    internal: 'Projet interne d’AlGBr',
    client: 'Projet client',
    languages: 'Langues',
    domain: 'Adresse',
    model: 'Modèle',
    planned: 'Déménagement prévu vers',
    legalNote: 'Seule la version allemande de cette page fait foi.',
  },
};

export const META = {
  de: {
    '': ['Al.G.B.r. Digital Studio · Websites, Shops und Software', 'Digital Studio von AlGBr: Websites, Webshops, Markenauftritt, Software und Automatisierung. Wir betreiben unsere eigenen Marken und Anwendungen auf derselben Technik.'],
    services: ['Leistungen · Al.G.B.r. Digital Studio', 'Websites, E-Commerce, Branding, Softwareentwicklung, Automatisierung sowie Wartung und Optimierung, aus einer Hand.'],
    brands: ['Marken · Al.G.B.r. Digital Studio', 'Die Marken von AlGBr: Algebra, GO, SPACE, EASE, GLOW, KIN, JOY und OFF. Eigene Projekte, gebaut und betrieben vom Studio.'],
    software: ['Software · Al.G.B.r. Digital Studio', 'Eigene Anwendungen des Studios, darunter nΣxt LifeOS.'],
    work: ['Arbeiten · Al.G.B.r. Digital Studio', 'Fallstudien: Aufbau, Technik, Funktionen und dokumentierte Ergebnisse.'],
    about: ['Über uns · Al.G.B.r. Digital Studio', 'Wer hinter dem Studio steht und wie wir arbeiten.'],
    contact: ['Kontakt · Al.G.B.r. Digital Studio', 'Beschreiben Sie Ihr Projekt. Sie erhalten eine Antwort per E-Mail.'],
    impressum: ['Impressum · AlGBr', 'Angaben gemäß § 5 DDG.'],
    datenschutz: ['Datenschutz · AlGBr', 'Datenschutzerklärung von algbr.de.'],
  },
  en: {
    '': ['Al.G.B.r. Digital Studio · Websites, shops and software', 'AlGBr Digital Studio: websites, online shops, branding, software and automation. We run our own brands and apps on the same technology.'],
    services: ['Services · Al.G.B.r. Digital Studio', 'Website development, e-commerce, branding, software development, automation, maintenance and optimisation, from one team.'],
    brands: ['Brands · Al.G.B.r. Digital Studio', 'The AlGBr brands: Algebra, GO, SPACE, EASE, GLOW, KIN, JOY and OFF. In-house projects built and run by the studio.'],
    software: ['Software · Al.G.B.r. Digital Studio', 'Applications built by the studio, including nΣxt LifeOS.'],
    work: ['Work · Al.G.B.r. Digital Studio', 'Case studies: design, technology, features and documented results.'],
    about: ['About · Al.G.B.r. Digital Studio', 'Who is behind the studio and how we work.'],
    contact: ['Contact · Al.G.B.r. Digital Studio', 'Describe your project. You will get an answer by e-mail.'],
    impressum: ['Legal notice · AlGBr', 'Information under § 5 DDG (German law).'],
    datenschutz: ['Privacy · AlGBr', 'Privacy policy of algbr.de.'],
  },
  fr: {
    '': ['Al.G.B.r. Digital Studio · Sites, boutiques et logiciels', 'Le Digital Studio d’AlGBr : sites web, boutiques en ligne, identité de marque, logiciels et automatisations. Nous exploitons nos propres marques et applications sur la même technologie.'],
    services: ['Services · Al.G.B.r. Digital Studio', 'Création de sites, e-commerce, identité de marque, développement logiciel, automatisation, maintenance et optimisation, par une seule équipe.'],
    brands: ['Marques · Al.G.B.r. Digital Studio', 'Les marques d’AlGBr : Algebra, GO, SPACE, EASE, GLOW, KIN, JOY et OFF. Des projets internes conçus et exploités par le studio.'],
    software: ['Logiciels · Al.G.B.r. Digital Studio', 'Les applications développées par le studio, dont nΣxt LifeOS.'],
    work: ['Réalisations · Al.G.B.r. Digital Studio', 'Études de cas : conception, technologies, fonctionnalités et résultats documentés.'],
    about: ['À propos · Al.G.B.r. Digital Studio', 'Qui se trouve derrière le studio et comment nous travaillons.'],
    contact: ['Contact · Al.G.B.r. Digital Studio', 'Décrivez votre projet. Vous recevrez une réponse par e-mail.'],
    impressum: ['Mentions légales · AlGBr', 'Informations selon le § 5 DDG (droit allemand).'],
    datenschutz: ['Confidentialité · AlGBr', 'Politique de confidentialité d’algbr.de.'],
  },
};

export const HOME = {
  de: {
    title: 'Wir bauen digitale Produkte und betreiben sie selbst.',
    lead: 'Al.G.B.r. Digital Studio entwickelt Websites, Shops, Software und Automatisierungen für Unternehmen. Dieselbe Technik trägt jeden Tag unsere eigenen Marken und Anwendungen.',
    directory: 'Das AlGBr-Ökosystem',
    directoryNote: 'Jede Zeile ist eine Adresse, die wir gebaut haben und betreiben.',
    servicesTitle: 'Was wir für Sie bauen',
    workTitle: 'Ausgewählte Arbeiten',
    brandsTitle: 'Unsere Marken',
    brandsLead: 'Acht eigene Marken, jede mit eigenem Auftritt. Gebaut auf einer gemeinsamen Plattform oder, wo es das Geschäft verlangt, auf einem eigenen Ablauf.',
    softwareTitle: 'Eigene Software',
    contactTitle: 'Erzählen Sie uns, was Ihr digitales System erledigen soll.',
    contactLead: 'Ein paar Angaben genügen. Wir antworten per E-Mail mit Rückfragen oder einem ersten Vorschlag.',
  },
  en: {
    title: 'We build digital products, and we run them ourselves.',
    lead: 'Al.G.B.r. Digital Studio develops websites, shops, software and automation for businesses. The same technology runs our own brands and applications every day.',
    directory: 'The AlGBr ecosystem',
    directoryNote: 'Every line is an address we built and operate.',
    servicesTitle: 'What we build for you',
    workTitle: 'Selected work',
    brandsTitle: 'Our brands',
    brandsLead: 'Eight in-house brands, each with its own identity. Built on one shared platform or, where the business needs it, on a flow of their own.',
    softwareTitle: 'Our software',
    contactTitle: 'Tell us what your digital system should do.',
    contactLead: 'A few details are enough. We reply by e-mail with questions or a first proposal.',
  },
  fr: {
    title: 'Nous concevons des produits numériques, et nous les exploitons nous-mêmes.',
    lead: 'Al.G.B.r. Digital Studio développe des sites, des boutiques, des logiciels et des automatisations pour les entreprises. La même technologie fait tourner chaque jour nos propres marques et applications.',
    directory: 'L’écosystème AlGBr',
    directoryNote: 'Chaque ligne est une adresse que nous avons construite et que nous exploitons.',
    servicesTitle: 'Ce que nous construisons pour vous',
    workTitle: 'Réalisations choisies',
    brandsTitle: 'Nos marques',
    brandsLead: 'Huit marques internes, chacune avec sa propre identité. Construites sur une plateforme commune ou, quand l’activité l’exige, sur un circuit propre.',
    softwareTitle: 'Nos logiciels',
    contactTitle: 'Dites-nous ce que votre système numérique doit accomplir.',
    contactLead: 'Quelques informations suffisent. Nous répondons par e-mail avec nos questions ou une première proposition.',
  },
};

/** Services: the six areas of the brief. `id` is also the contact form's project type. */
export const SERVICES = {
  de: [
    { id: 'website', title: 'Website-Entwicklung', text: 'Klare, schnelle Seiten, die Ihr Angebot erklären und Anfragen erzeugen. Mehrsprachig, wenn Ihre Kunden es sind.', items: ['Struktur und Texte, die führen', 'Mobile-first, Barrierefreiheit als Ziel', 'Technische SEO, saubere Mehrsprachigkeit'] },
    { id: 'ecommerce', title: 'E-Commerce', text: 'Produkte, Warenkorb, Zahlung, Rechnung, Versand und Sendungsverfolgung. So, wie wir es für unsere eigenen Shops betreiben.', items: ['Sichere Zahlung über Stripe Checkout', 'Preise serverseitig geprüft', 'Bestellungen, Retouren und Kundendaten in einem System'] },
    { id: 'branding', title: 'Branding & Design', text: 'Name, Zeichen, Farben, Schrift und Bildsprache, die zusammenpassen und sich konsequent anwenden lassen.', items: ['Logo und Markenregeln', 'Design-Tokens für Web und Druck', 'Produktions- und Druckdateien'] },
    { id: 'software', title: 'Softwareentwicklung', text: 'Web-Apps, PWA, Kundenportale und interne Werkzeuge, von der ersten Skizze bis zum Betrieb.', items: ['Klickbarer Prototyp vor der Entwicklung', 'Automatisierte Tests', 'Datenschutz von Anfang an mitgedacht'] },
    { id: 'automation', title: 'Automatisierung', text: 'Wiederkehrende Abläufe zwischen Shop, Lieferant, E-Mail und Buchhaltung, die ohne Handarbeit laufen.', items: ['Bestellweitergabe an Lieferanten', 'Statusabgleich und Benachrichtigungen', 'Webhooks und geplante Aufgaben'] },
    { id: 'maintenance', title: 'Wartung & Optimierung', text: 'Updates, Sicherheit, Geschwindigkeit und Weiterentwicklung nach dem Launch, planbar und persönlich.', items: ['Sicherheits-Header und Updates', 'Performance und Core Web Vitals', 'Änderungen ohne Agentur-Warteschlange'] },
  ],
  en: [
    { id: 'website', title: 'Website development', text: 'Clear, fast pages that explain what you offer and bring in enquiries. Multilingual when your customers are.', items: ['Structure and copy that guide', 'Mobile-first, accessibility as a goal', 'Technical SEO, clean multilingual setup'] },
    { id: 'ecommerce', title: 'E-commerce', text: 'Products, cart, payment, invoice, shipping and tracking. The way we run it for our own shops.', items: ['Secure payment with Stripe Checkout', 'Prices checked on the server', 'Orders, returns and customers in one system'] },
    { id: 'branding', title: 'Branding & design', text: 'Name, mark, colours, type and imagery that belong together and can be applied consistently.', items: ['Logo and brand rules', 'Design tokens for web and print', 'Production and print files'] },
    { id: 'software', title: 'Software development', text: 'Web apps, PWAs, customer portals and internal tools, from first sketch to operation.', items: ['Clickable prototype before development', 'Automated tests', 'Privacy designed in from the start'] },
    { id: 'automation', title: 'Automation', text: 'Recurring work between shop, supplier, e-mail and accounting that runs without manual steps.', items: ['Orders passed on to suppliers', 'Status sync and notifications', 'Webhooks and scheduled jobs'] },
    { id: 'maintenance', title: 'Maintenance & optimisation', text: 'Updates, security, speed and new features after launch, planned and personal.', items: ['Security headers and updates', 'Performance and Core Web Vitals', 'Changes without an agency queue'] },
  ],
  fr: [
    { id: 'website', title: 'Création de sites web', text: 'Des pages claires et rapides qui expliquent votre offre et génèrent des demandes. Multilingues si vos clients le sont.', items: ['Structure et textes qui guident', 'Mobile d’abord, accessibilité comme objectif', 'SEO technique, multilingue propre'] },
    { id: 'ecommerce', title: 'E-commerce', text: 'Produits, panier, paiement, facture, livraison et suivi. Comme nous le faisons tourner pour nos propres boutiques.', items: ['Paiement sécurisé par Stripe Checkout', 'Prix vérifiés côté serveur', 'Commandes, retours et clients dans un même système'] },
    { id: 'branding', title: 'Identité & design', text: 'Nom, symbole, couleurs, typographie et images qui vont ensemble et s’appliquent avec constance.', items: ['Logo et règles de marque', 'Design tokens pour le web et l’impression', 'Fichiers de production et d’impression'] },
    { id: 'software', title: 'Développement logiciel', text: 'Applications web, PWA, espaces clients et outils internes, du premier croquis à l’exploitation.', items: ['Prototype cliquable avant le développement', 'Tests automatisés', 'Protection des données pensée dès le départ'] },
    { id: 'automation', title: 'Automatisation', text: 'Les tâches répétitives entre boutique, fournisseur, e-mail et comptabilité, qui tournent sans intervention.', items: ['Transmission des commandes aux fournisseurs', 'Synchronisation des statuts et notifications', 'Webhooks et tâches planifiées'] },
    { id: 'maintenance', title: 'Maintenance & optimisation', text: 'Mises à jour, sécurité, vitesse et évolutions après la mise en ligne, planifiées et personnelles.', items: ['En-têtes de sécurité et mises à jour', 'Performance et Core Web Vitals', 'Modifications sans file d’attente d’agence'] },
  ],
};

export const SERVICES_PAGE = {
  de: {
    title: 'Leistungen',
    lead: 'Keine starre Agentur-Schublade: Wir kombinieren die Bausteine, die Ihre Kunden führen und Ihre Abläufe vereinfachen. Ein Ansprechpartner von der Idee bis zum Betrieb.',
    processTitle: 'Ablauf',
    process: [
      ['Verstehen', 'Ziel, Kunden, Abläufe, Inhalte und Erfolg, in einem geführten Briefing.'],
      ['Entwerfen', 'Ein klickbarer Prototyp, um Rhythmus, Inhalte und Aktionen früh zu prüfen.'],
      ['Bauen', 'Entwicklung, Verwaltung, Tests, Barrierefreiheit und Performance.'],
      ['Begleiten', 'Launch, Einweisung, Support und kontinuierliche Weiterentwicklung.'],
    ],
    industriesTitle: 'Branchen, für die wir Lösungen geplant haben',
    industries: ['Handwerk', 'Beauty & Kosmetik', 'Gastronomie', 'Coaching', 'Friseur', 'Events', 'Arzt & Praxis', 'Immobilien'],
    pricingTitle: 'Richtwerte',
    pricingLead: 'Zur Orientierung. Der verbindliche Preis folgt nach dem Briefing, mit klar definiertem Umfang.',
    pricing: [
      ['Start', 'ab 690 €', 'Landingpage mit Storyline, mobile-first Design und Anfrageformular.'],
      ['Business', 'ab 1.490 €', 'Website mit bis zu fünf Kernseiten, SEO-Struktur und eigener Verwaltung.'],
      ['Commerce', 'ab 2.490 €', 'Webshop mit Produkten, Zahlung, Versand und Einweisung.'],
      ['Produkt', 'nach Analyse', 'App, Plattform oder verbundenes System: Prototyp, Daten, Entwicklungsplan.'],
    ],
    vat: 'Kleinunternehmer gemäß § 19 UStG, es wird keine Umsatzsteuer ausgewiesen.',
  },
  en: {
    title: 'Services',
    lead: 'No rigid agency box: we combine the building blocks that guide your customers and simplify your operations. One contact from idea to operation.',
    processTitle: 'How a project runs',
    process: [
      ['Understand', 'Goal, customers, processes, content and success, in a guided brief.'],
      ['Design', 'A clickable prototype to check rhythm, content and actions early.'],
      ['Build', 'Development, admin, tests, accessibility and performance.'],
      ['Support', 'Launch, onboarding, support and continuous improvement.'],
    ],
    industriesTitle: 'Industries we have planned solutions for',
    industries: ['Trades', 'Beauty', 'Restaurants', 'Coaching', 'Hair salons', 'Events', 'Medical practices', 'Real estate'],
    pricingTitle: 'Guide prices',
    pricingLead: 'For orientation. The binding price follows the brief, with a clearly defined scope.',
    pricing: [
      ['Start', 'from €690', 'Landing page with a storyline, mobile-first design and enquiry form.'],
      ['Business', 'from €1,490', 'Website with up to five core pages, SEO structure and its own admin.'],
      ['Commerce', 'from €2,490', 'Online shop with products, payment, shipping and onboarding.'],
      ['Product', 'after analysis', 'App, platform or connected system: prototype, data, development plan.'],
    ],
    vat: 'Small business under § 19 UStG (German VAT law): no VAT is charged.',
  },
  fr: {
    title: 'Services',
    lead: 'Pas de case d’agence figée : nous combinons les briques qui guident vos clients et simplifient votre activité. Un seul interlocuteur, de l’idée à l’exploitation.',
    processTitle: 'Déroulement',
    process: [
      ['Comprendre', 'Objectif, clients, processus, contenus et critères de réussite, dans un brief guidé.'],
      ['Concevoir', 'Un prototype cliquable pour valider tôt le rythme, les contenus et les actions.'],
      ['Construire', 'Développement, administration, tests, accessibilité et performance.'],
      ['Accompagner', 'Mise en ligne, prise en main, support et évolutions continues.'],
    ],
    industriesTitle: 'Secteurs pour lesquels nous avons conçu des solutions',
    industries: ['Artisanat', 'Beauté', 'Restauration', 'Coaching', 'Coiffure', 'Événementiel', 'Cabinets médicaux', 'Immobilier'],
    pricingTitle: 'Prix indicatifs',
    pricingLead: 'À titre d’orientation. Le prix ferme suit le brief, avec un périmètre clairement défini.',
    pricing: [
      ['Start', 'dès 690 €', 'Page d’atterrissage avec narration, design mobile d’abord et formulaire de demande.'],
      ['Business', 'dès 1 490 €', 'Site jusqu’à cinq pages principales, structure SEO et administration propre.'],
      ['Commerce', 'dès 2 490 €', 'Boutique en ligne avec produits, paiement, livraison et prise en main.'],
      ['Produit', 'sur analyse', 'Application, plateforme ou système connecté : prototype, données, plan de développement.'],
    ],
    vat: 'Micro-entreprise au sens du § 19 UStG (droit allemand) : pas de TVA facturée.',
  },
};

export const BRANDS_PAGE = {
  de: { title: 'Marken', lead: 'Alle Marken von AlGBr sind eigene Projekte: vom Studio entworfen, gebaut und betrieben. Jede hat ihren eigenen Auftritt; die Technik dahinter teilen sie, wo es sinnvoll ist.' },
  en: { title: 'Brands', lead: 'Every AlGBr brand is an in-house project: designed, built and run by the studio. Each has its own identity; they share the technology behind them where it makes sense.' },
  fr: { title: 'Marques', lead: 'Toutes les marques d’AlGBr sont des projets internes : conçus, construits et exploités par le studio. Chacune a sa propre identité ; elles partagent la technologie quand c’est pertinent.' },
};

export const SOFTWARE_PAGE = {
  de: { title: 'Software', lead: 'Anwendungen, die das Studio selbst entwickelt, betreibt und weiterentwickelt.', more: 'Weitere Anwendungen sind in Entwicklung und erscheinen hier, sobald sie nutzbar sind.', stack: 'Technik', platforms: 'Plattformen', quality: 'Qualität', version: 'Version' },
  en: { title: 'Software', lead: 'Applications the studio develops, runs and keeps improving itself.', more: 'More applications are in development and will appear here once they are ready to use.', stack: 'Technology', platforms: 'Platforms', quality: 'Quality', version: 'Version' },
  fr: { title: 'Logiciels', lead: 'Des applications que le studio développe, exploite et fait évoluer lui-même.', more: 'D’autres applications sont en développement et apparaîtront ici dès qu’elles seront utilisables.', stack: 'Technologies', platforms: 'Plateformes', quality: 'Qualité', version: 'Version' },
};

export const PLATFORM_NAMES = {
  'web-pwa': { de: 'Web (PWA)', en: 'Web (PWA)', fr: 'Web (PWA)' },
  android: { de: 'Android', en: 'Android', fr: 'Android' },
  ios: { de: 'iOS', en: 'iOS', fr: 'iOS' },
};

export const WORK_PAGE = {
  de: { title: 'Arbeiten', lead: 'Was wir gebaut haben, wie es aufgebaut ist und was sich belegen lässt. Ergebnisse nennen wir nur, wenn sie dokumentiert sind.', challenge: 'Aufgabe', approach: 'Konzeption', tech: 'Technik', features: 'Funktionen', results: 'Dokumentierte Ergebnisse', status: 'Stand' },
  en: { title: 'Work', lead: 'What we built, how it is put together and what can be shown. We only state results that are documented.', challenge: 'Brief', approach: 'Design', tech: 'Technology', features: 'Features', results: 'Documented results', status: 'Status' },
  fr: { title: 'Réalisations', lead: 'Ce que nous avons construit, comment c’est conçu et ce qui peut être démontré. Nous ne citons que des résultats documentés.', challenge: 'Enjeu', approach: 'Conception', tech: 'Technologies', features: 'Fonctionnalités', results: 'Résultats documentés', status: 'État' },
};

export const ABOUT = {
  de: {
    title: 'Über uns',
    lead: 'Al.G.B.r. Digital Studio ist der Bereich von AlGBr, der Websites, Shops und Software für andere baut. AlGBr ist ein inhabergeführtes Unternehmen mit Sitz in Lampertheim, gegründet von Guy Beaho.',
    blocks: [
      ['Wir betreiben, was wir bauen', 'Unsere Shops, unsere Modemarke und unsere App laufen auf derselben Technik, die wir Kunden anbieten. Fehler finden wir zuerst bei uns selbst.'],
      ['Ein Ansprechpartner', 'Sie sprechen mit der Person, die plant und baut. Keine Weitergabe zwischen Vertrieb, Projektleitung und Entwicklung.'],
      ['Drei Sprachen', 'Wir arbeiten auf Deutsch, Französisch und Englisch, und wir bauen Websites in diesen Sprachen sauber mehrsprachig.'],
      ['Ehrlich im Detail', 'Keine erfundenen Bewertungen, keine künstliche Knappheit, keine Zahlen ohne Beleg: auf unseren Seiten und auf denen unserer Kunden.'],
    ],
  },
  en: {
    title: 'About',
    lead: 'Al.G.B.r. Digital Studio is the part of AlGBr that builds websites, shops and software for others. AlGBr is an owner-run company based in Lampertheim, Germany, founded by Guy Beaho.',
    blocks: [
      ['We run what we build', 'Our shops, our fashion label and our app run on the same technology we offer to clients. We find the bugs on our own projects first.'],
      ['One contact', 'You talk to the person who plans and builds. No hand-offs between sales, project management and development.'],
      ['Three languages', 'We work in German, French and English, and we build properly multilingual websites in these languages.'],
      ['Honest in the details', 'No invented reviews, no artificial scarcity, no figures without evidence: on our sites and on our clients’.'],
    ],
  },
  fr: {
    title: 'À propos',
    lead: 'Al.G.B.r. Digital Studio est la branche d’AlGBr qui conçoit des sites, des boutiques et des logiciels pour d’autres. AlGBr est une entreprise dirigée par son fondateur, Guy Beaho, basée à Lampertheim en Allemagne.',
    blocks: [
      ['Nous exploitons ce que nous construisons', 'Nos boutiques, notre marque de mode et notre application tournent sur la même technologie que celle proposée à nos clients. Nous trouvons les défauts d’abord chez nous.'],
      ['Un seul interlocuteur', 'Vous parlez avec la personne qui conçoit et développe. Aucun relais entre commercial, chef de projet et développeur.'],
      ['Trois langues', 'Nous travaillons en allemand, en français et en anglais, et nous construisons des sites proprement multilingues dans ces langues.'],
      ['Honnêtes dans le détail', 'Pas d’avis inventés, pas de fausse rareté, pas de chiffres sans preuve : sur nos sites comme sur ceux de nos clients.'],
    ],
  },
};

export const CONTACT = {
  de: {
    title: 'Projekt anfragen',
    lead: 'Beschreiben Sie kurz, was Sie vorhaben. Sie erhalten eine persönliche Antwort per E-Mail.',
    name: 'Name',
    email: 'E-Mail',
    company: 'Unternehmen (optional)',
    type: 'Art des Projekts',
    typeOther: 'Etwas anderes',
    budget: 'Budgetrahmen (optional)',
    budgets: ['Noch offen', 'unter 1.500 €', '1.500 bis 5.000 €', 'über 5.000 €'],
    message: 'Ihre Nachricht',
    messageHint: 'Ziel, Zeitrahmen, vorhandene Website oder Inhalte.',
    consent: 'Ich bin einverstanden, dass meine Angaben zur Beantwortung der Anfrage verarbeitet werden. Details in der',
    consentLink: 'Datenschutzerklärung',
    submit: 'Anfrage senden',
    sending: 'Wird gesendet …',
    sent: 'Danke. Ihre Anfrage ist angekommen; Sie erhalten eine Antwort per E-Mail.',
    error: 'Die Anfrage konnte nicht gesendet werden. Bitte prüfen Sie die markierten Felder.',
    fallback: 'Der direkte Versand ist gerade nicht verfügbar. Ihre Nachricht ist vorbereitet: senden Sie sie mit Ihrem E-Mail-Programm.',
    fallbackButton: 'E-Mail öffnen',
    direct: 'Lieber direkt?',
    honeypot: 'Bitte leer lassen',
  },
  en: {
    title: 'Start a project',
    lead: 'Briefly describe what you have in mind. You will get a personal answer by e-mail.',
    name: 'Name',
    email: 'E-mail',
    company: 'Company (optional)',
    type: 'Project type',
    typeOther: 'Something else',
    budget: 'Budget range (optional)',
    budgets: ['Not sure yet', 'under €1,500', '€1,500 to €5,000', 'over €5,000'],
    message: 'Your message',
    messageHint: 'Goal, timeline, existing website or content.',
    consent: 'I agree that my details are processed to answer this request. Details in the',
    consentLink: 'privacy policy',
    submit: 'Send request',
    sending: 'Sending …',
    sent: 'Thank you. Your request has arrived; you will get an answer by e-mail.',
    error: 'The request could not be sent. Please check the highlighted fields.',
    fallback: 'Direct sending is not available right now. Your message is ready: send it with your e-mail app.',
    fallbackButton: 'Open e-mail',
    direct: 'Prefer e-mail?',
    honeypot: 'Leave this empty',
  },
  fr: {
    title: 'Démarrer un projet',
    lead: 'Décrivez brièvement votre projet. Vous recevrez une réponse personnelle par e-mail.',
    name: 'Nom',
    email: 'E-mail',
    company: 'Entreprise (facultatif)',
    type: 'Type de projet',
    typeOther: 'Autre chose',
    budget: 'Budget envisagé (facultatif)',
    budgets: ['Pas encore défini', 'moins de 1 500 €', '1 500 à 5 000 €', 'plus de 5 000 €'],
    message: 'Votre message',
    messageHint: 'Objectif, calendrier, site ou contenus existants.',
    consent: 'J’accepte que mes informations soient traitées pour répondre à ma demande. Détails dans la',
    consentLink: 'politique de confidentialité',
    submit: 'Envoyer la demande',
    sending: 'Envoi …',
    sent: 'Merci. Votre demande est bien arrivée ; vous recevrez une réponse par e-mail.',
    error: 'La demande n’a pas pu être envoyée. Vérifiez les champs signalés.',
    fallback: 'L’envoi direct n’est pas disponible pour le moment. Votre message est prêt : envoyez-le avec votre messagerie.',
    fallbackButton: 'Ouvrir la messagerie',
    direct: 'Plutôt par e-mail ?',
    honeypot: 'Laisser vide',
  },
};

export const NOT_FOUND = {
  de: ['Diese Seite gibt es nicht.', 'Vielleicht wurde sie verschoben. Die Startseite führt zu allen Bereichen.', 'Zur Startseite'],
  en: ['This page does not exist.', 'It may have moved. The home page leads to every section.', 'Go to the home page'],
  fr: ['Cette page n’existe pas.', 'Elle a peut-être été déplacée. L’accueil mène à toutes les rubriques.', 'Aller à l’accueil'],
};
