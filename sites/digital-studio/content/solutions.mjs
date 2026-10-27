/**
 * Service detail pages and industry pages, ported from the current Digital Studio site (repository Guy2B/algbr:
 * leistungen/*.html and branchen/*.html, German). German text is taken unchanged; EN and FR are translations.
 * `legacy` = the old path on algbr.eu, redirected here after the switch (algebra/worker/src/legacy.js).
 */

/** Shared blocks of every service page (old site: "Wie wir entscheiden", "Mobile, Performance und Datenschutz", FAQ). */
export const SERVICE_COMMON = {
  de: {
    eyebrow: 'Leistungsumfang',
    itemsTitle: 'Was enthalten sein kann',
    aside: 'Die technische Lösung folgt Ihrem Geschäftsziel, nicht umgekehrt.',
    blocks: [
      ['Wie wir entscheiden', 'Wir priorisieren den kürzesten Weg zu einem nützlichen Ergebnis. Funktionen werden nicht aufgenommen, weil sie modern klingen, sondern weil sie einen Kundenweg vereinfachen, Vertrauen aufbauen, Zeit sparen oder Daten verlässlich nutzbar machen.'],
      ['Mobile, Performance und Datenschutz', 'Jede Lösung wird mobile-first aufgebaut. Externe Dienste, Cookies und Tracking werden nur eingesetzt, wenn sie notwendig sind und rechtlich sowie technisch sauber integriert werden können.'],
    ],
    faqTitle: 'Häufige Fragen',
    faq: [
      ['Wie beginnt das Projekt?', 'Mit einem strukturierten Briefing und einer kostenlosen Ersteinschätzung.'],
      ['Ist ein Festpreis möglich?', 'Ja, sobald Umfang, Inhalte und Abhängigkeiten klar definiert sind.'],
      ['Kann die Lösung später erweitert werden?', 'Ja. Die Architektur wird so geplant, dass sinnvolle Erweiterungen möglich bleiben.'],
    ],
    cta: 'Aus Ihrer Idee wird ein klarer Projektumfang.',
    ctaButton: 'Projekt beschreiben',
    related: 'Passende Branchen',
  },
  en: {
    eyebrow: 'Scope',
    itemsTitle: 'What it can include',
    aside: 'The technology follows your business goal, not the other way round.',
    blocks: [
      ['How we decide', 'We prioritise the shortest path to a useful result. Features are not added because they sound modern, but because they simplify a customer journey, build trust, save time or make data reliably usable.'],
      ['Mobile, performance and privacy', 'Every solution is built mobile-first. External services, cookies and tracking are only used when they are necessary and can be integrated cleanly, legally and technically.'],
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      ['How does a project start?', 'With a structured brief and a free first assessment.'],
      ['Is a fixed price possible?', 'Yes, once scope, content and dependencies are clearly defined.'],
      ['Can the solution be extended later?', 'Yes. The architecture is planned so that sensible extensions remain possible.'],
    ],
    cta: 'Your idea becomes a clear project scope.',
    ctaButton: 'Describe your project',
    related: 'Related industries',
  },
  fr: {
    eyebrow: 'Périmètre',
    itemsTitle: 'Ce qui peut être inclus',
    aside: 'La solution technique suit votre objectif, pas l’inverse.',
    blocks: [
      ['Comment nous décidons', 'Nous privilégions le chemin le plus court vers un résultat utile. Une fonctionnalité n’est pas retenue parce qu’elle sonne moderne, mais parce qu’elle simplifie un parcours client, crée de la confiance, fait gagner du temps ou rend les données fiables et exploitables.'],
      ['Mobile, performance et protection des données', 'Chaque solution est conçue mobile d’abord. Services externes, cookies et suivi ne sont utilisés que s’ils sont nécessaires et peuvent être intégrés proprement, juridiquement comme techniquement.'],
    ],
    faqTitle: 'Questions fréquentes',
    faq: [
      ['Comment démarre un projet ?', 'Par un brief structuré et une première évaluation gratuite.'],
      ['Un prix forfaitaire est-il possible ?', 'Oui, dès que le périmètre, les contenus et les dépendances sont clairement définis.'],
      ['La solution peut-elle évoluer plus tard ?', 'Oui. L’architecture est pensée pour que les extensions utiles restent possibles.'],
    ],
    cta: 'Votre idée devient un périmètre de projet clair.',
    ctaButton: 'Décrire votre projet',
    related: 'Secteurs concernés',
  },
};

/** One detail page per service of content/copy.mjs SERVICES (same ids). */
export const SERVICE_DETAIL = {
  website: {
    legacy: '/leistungen/websites.html',
    industries: ['trades', 'restaurants', 'medical', 'real-estate'],
    de: { name: 'Website erstellen lassen', h1: 'Websites, die Vertrauen schaffen und Anfragen auslösen.', lead: 'Von der Landingpage bis zur mehrseitigen Firmenwebsite: klare Storyline, mobile-first UX, schnelle Technik und eine SEO-fähige Struktur.', items: ['Strategie und Nutzerführung', 'Individuelles Responsive Design', 'Technische SEO und strukturierte Daten', 'Kontakt, Buchung oder Lead-Formular', 'Performance, Barrierearmut und Sicherheit', 'Veröffentlichung und Einweisung'], tags: ['Landingpage ab 690 €', 'Business-Website ab 1.490 €', 'Erweiterungen nach Umfang'] },
    en: { name: 'Website development', h1: 'Websites that build trust and bring in enquiries.', lead: 'From a landing page to a multi-page company website: a clear storyline, mobile-first UX, fast technology and an SEO-ready structure.', items: ['Strategy and user guidance', 'Custom responsive design', 'Technical SEO and structured data', 'Contact, booking or lead form', 'Performance, accessibility and security', 'Launch and onboarding'], tags: ['Landing page from €690', 'Business website from €1,490', 'Extensions by scope'] },
    fr: { name: 'Création de site web', h1: 'Des sites qui inspirent confiance et génèrent des demandes.', lead: 'De la page d’atterrissage au site d’entreprise de plusieurs pages : une narration claire, une expérience mobile d’abord, une technique rapide et une structure prête pour le SEO.', items: ['Stratégie et parcours utilisateur', 'Design responsive sur mesure', 'SEO technique et données structurées', 'Formulaire de contact, de réservation ou de demande', 'Performance, accessibilité et sécurité', 'Mise en ligne et prise en main'], tags: ['Page d’atterrissage dès 690 €', 'Site d’entreprise dès 1 490 €', 'Extensions selon le périmètre'] },
  },
  ecommerce: {
    legacy: '/leistungen/webshop.html',
    industries: ['beauty', 'restaurants', 'events'],
    de: { name: 'Webshop erstellen lassen', h1: 'E-Commerce, das Markenwirkung und einfache Abläufe verbindet.', lead: 'Wir bauen Online-Shops für Produkte, Services, Gutscheine oder hybride Geschäftsmodelle, von der Produktlogik bis zur Verwaltung.', items: ['Shop- und Kategoriearchitektur', 'Produktvarianten und Suche', 'Checkout, Zahlung und Versand', 'Gutscheine und Aktionen', 'Schnittstellen zu CRM, Warenwirtschaft oder Buchhaltung', 'SEO, Performance und Tracking nach Einwilligung'], tags: ['Webshop ab 2.490 €', 'Shopify oder WooCommerce', 'Headless / individuell nach Analyse'] },
    en: { name: 'Online shop development', h1: 'E-commerce that combines brand impact with simple operations.', lead: 'We build online shops for products, services, vouchers or hybrid business models, from product logic to administration.', items: ['Shop and category architecture', 'Product variants and search', 'Checkout, payment and shipping', 'Vouchers and promotions', 'Interfaces to CRM, inventory or accounting', 'SEO, performance and tracking after consent'], tags: ['Online shop from €2,490', 'Shopify or WooCommerce', 'Headless / custom after analysis'] },
    fr: { name: 'Création de boutique en ligne', h1: 'Un e-commerce qui allie image de marque et fonctionnement simple.', lead: 'Nous créons des boutiques en ligne pour des produits, des services, des bons cadeaux ou des modèles hybrides, de la logique produit à l’administration.', items: ['Architecture de la boutique et des catégories', 'Variantes de produits et recherche', 'Paiement, encaissement et livraison', 'Bons cadeaux et promotions', 'Interfaces avec CRM, gestion des stocks ou comptabilité', 'SEO, performance et suivi après consentement'], tags: ['Boutique dès 2 490 €', 'Shopify ou WooCommerce', 'Headless / sur mesure après analyse'] },
  },
  branding: {
    legacy: null,
    industries: ['beauty', 'coaching', 'hair'],
    de: { name: 'Branding & Design', h1: 'Ein Markenauftritt, der überall gleich erkennbar bleibt.', lead: 'Name, Zeichen, Farben, Schrift und Bildsprache, abgestimmt auf Website, Shop, Druck und Produkt. Mit Regeln, die auch nach dem Projekt eingehalten werden können.', items: ['Logo und Wortmarke', 'Farb- und Schriftsystem', 'Design-Tokens für Web und App', 'Markenregeln und Anwendungsbeispiele', 'Produktions- und Druckdateien (Stick, Druck)', 'Bildsprache und Fotobriefing'], tags: ['Umfang nach Briefing', 'Für neue und bestehende Marken', 'Algebra als Referenz'] },
    en: { name: 'Branding & design', h1: 'A brand that stays recognisable everywhere.', lead: 'Name, mark, colours, type and imagery, aligned across website, shop, print and product. With rules that can still be followed after the project.', items: ['Logo and wordmark', 'Colour and type system', 'Design tokens for web and app', 'Brand rules and usage examples', 'Production and print files (embroidery, print)', 'Imagery and photo brief'], tags: ['Scope after the brief', 'For new and existing brands', 'Algebra as a reference'] },
    fr: { name: 'Identité & design', h1: 'Une marque qui reste reconnaissable partout.', lead: 'Nom, symbole, couleurs, typographie et images, cohérents entre site, boutique, impression et produit. Avec des règles que l’on peut continuer à appliquer après le projet.', items: ['Logo et logotype', 'Système de couleurs et de typographies', 'Design tokens pour le web et les applications', 'Règles de marque et exemples d’usage', 'Fichiers de production et d’impression (broderie, impression)', 'Direction photo et brief de prise de vue'], tags: ['Périmètre selon le brief', 'Pour marques nouvelles ou existantes', 'Algebra comme référence'] },
  },
  software: {
    legacy: '/leistungen/apps.html',
    industries: ['coaching', 'events', 'real-estate'],
    de: { name: 'App & Webanwendung entwickeln', h1: 'Ein digitales Produkt, das Menschen tatsächlich benutzen.', lead: 'Vom klickbaren Prototyp über die PWA bis zur App-Grundlage für iOS und Android. Der Fokus liegt auf klarer UX, sinnvollen Funktionen und einer skalierbaren Basis.', items: ['Discovery und Funktionspriorisierung', 'Wireframes und klickbarer Prototyp', 'Benutzerkonten und Rollen', 'Cloud-Daten und APIs', 'Admin- oder Testmodus', 'PWA sowie mobile Integrationen'], tags: ['Prototyp nach Analyse', 'MVP mit klarer erster Phase', 'Weiterentwicklung planbar'] },
    en: { name: 'App & web application development', h1: 'A digital product people actually use.', lead: 'From a clickable prototype through a PWA to an app foundation for iOS and Android. The focus is on clear UX, meaningful features and a scalable base.', items: ['Discovery and feature prioritisation', 'Wireframes and clickable prototype', 'User accounts and roles', 'Cloud data and APIs', 'Admin or test mode', 'PWA and mobile integrations'], tags: ['Prototype after analysis', 'MVP with a clear first phase', 'Planned further development'] },
    fr: { name: 'Développement d’applications', h1: 'Un produit numérique que les gens utilisent vraiment.', lead: 'Du prototype cliquable à la PWA, jusqu’à une base d’application iOS et Android. L’accent est mis sur une UX claire, des fonctionnalités utiles et une base évolutive.', items: ['Cadrage et priorisation des fonctionnalités', 'Maquettes et prototype cliquable', 'Comptes utilisateurs et rôles', 'Données cloud et API', 'Mode administrateur ou de test', 'PWA et intégrations mobiles'], tags: ['Prototype après analyse', 'MVP avec une première phase claire', 'Évolutions planifiables'] },
  },
  automation: {
    legacy: '/leistungen/crm-booking.html',
    industries: ['beauty', 'hair', 'medical', 'real-estate'],
    de: { name: 'CRM, Booking & Automatisierung', h1: 'Kundenwege und interne Arbeit in einem System.', lead: 'Buchungen, Services, Kundeninformationen, Erinnerungen und Auswertungen werden so verbunden, dass Ihr Team weniger doppelt pflegt.', items: ['Online-Terminbuchung', 'Service- und Mitarbeiterlogik', 'Kunden- und Kontaktverwaltung', 'Erinnerungen und Statusabläufe', 'Cloud-Daten und Exporte', 'Automatisierungen und Rollen'], tags: ['Als Website-Erweiterung', 'Als eigenständiges Tool', 'Lune-Beauty-Architektur als Referenz'] },
    en: { name: 'CRM, booking & automation', h1: 'Customer journeys and internal work in one system.', lead: 'Bookings, services, customer information, reminders and reports are connected so that your team maintains less twice.', items: ['Online appointment booking', 'Service and staff logic', 'Customer and contact management', 'Reminders and status workflows', 'Cloud data and exports', 'Automations and roles'], tags: ['As a website extension', 'As a stand-alone tool', 'Lune Beauty architecture as a reference'] },
    fr: { name: 'CRM, réservation & automatisation', h1: 'Parcours clients et travail interne dans un seul système.', lead: 'Réservations, prestations, informations clients, rappels et analyses sont reliés pour que votre équipe ne saisisse plus deux fois la même chose.', items: ['Réservation de rendez-vous en ligne', 'Logique des prestations et des collaborateurs', 'Gestion des clients et des contacts', 'Rappels et suivi des statuts', 'Données cloud et exports', 'Automatisations et rôles'], tags: ['En extension d’un site', 'En outil autonome', 'Architecture Lune Beauty comme référence'] },
  },
  maintenance: {
    legacy: '/leistungen/seo-support.html',
    industries: ['trades', 'restaurants', 'medical'],
    de: { name: 'SEO, GEO & Web-Support', h1: 'Sichtbar bleiben, technisch gesund bleiben, sinnvoll wachsen.', lead: 'Technische Qualität allein reicht nicht. Wir verbinden Suchintention, klare Inhalte, lokale Seiten, strukturierte Daten und kontinuierliche Betreuung.', items: ['Technische SEO-Prüfung', 'Leistungs- und Branchenseiten', 'Lokale Suchbegriffe und interne Verlinkung', 'Schema.org und maschinenlesbare Inhalte', 'Updates, Backups und Monitoring', 'Monatliche oder punktuelle Betreuung'], tags: ['Web-Support ab 59 €/Monat', 'SEO-Audit nach Umfang', 'Inhalte und Landingpages einzeln planbar'] },
    en: { name: 'SEO, GEO & web support', h1: 'Stay visible, stay technically healthy, grow sensibly.', lead: 'Technical quality alone is not enough. We combine search intent, clear content, local pages, structured data and ongoing support.', items: ['Technical SEO review', 'Service and industry pages', 'Local search terms and internal linking', 'Schema.org and machine-readable content', 'Updates, backups and monitoring', 'Monthly or one-off support'], tags: ['Web support from €59/month', 'SEO audit by scope', 'Content and landing pages planned individually'] },
    fr: { name: 'SEO, GEO & maintenance web', h1: 'Rester visible, rester sain techniquement, grandir avec méthode.', lead: 'La qualité technique ne suffit pas. Nous associons intention de recherche, contenus clairs, pages locales, données structurées et accompagnement continu.', items: ['Audit SEO technique', 'Pages de services et de secteurs', 'Mots-clés locaux et maillage interne', 'Schema.org et contenus lisibles par les machines', 'Mises à jour, sauvegardes et surveillance', 'Accompagnement mensuel ou ponctuel'], tags: ['Maintenance dès 59 €/mois', 'Audit SEO selon le périmètre', 'Contenus et pages d’atterrissage à la carte'] },
  },
};

/** Shared blocks of every industry page (old site, identical on all eight). */
export const INDUSTRY_COMMON = {
  de: {
    title: 'Branchen',
    lead: 'Jede Branche braucht andere Einstiege, Funktionen und Vertrauenssignale. Für diese Branchen haben wir Lösungen geplant.',
    homeTitle: 'Für Ihren Alltag gedacht, nicht für ein Template.',
    eyebrow: 'Für Ihre Branche',
    aside: 'Die Inhalte und Funktionen werden nach dem typischen Kundenweg Ihrer Branche priorisiert.',
    itemsTitle: 'Empfohlene Bausteine',
    blocks: [
      ['Was Besucher zuerst verstehen müssen', 'Innerhalb weniger Sekunden sollte klar sein, welche Leistung angeboten wird, für wen sie gedacht ist, in welcher Region sie verfügbar ist und welcher nächste Schritt sinnvoll ist. Mobile Kontaktwege werden deshalb nicht als Nebensache behandelt.'],
      ['Was intern leichter werden kann', 'Je nach Bedarf verbinden wir Anfragen, Buchungen, Kundeninformationen, Dokumente oder Statusabläufe. Dadurch bleibt die Website nicht nur eine digitale Visitenkarte, sondern kann echte Arbeit abnehmen.'],
      ['Sichtbarkeit in Google und KI-Suche', 'Eigene Leistungsseiten, regionale Inhalte, klare Überschriften, strukturierte Daten und echte Referenzen schaffen eine bessere Grundlage für Suchmaschinen. Garantierte Rankings werden nicht versprochen; die technische und inhaltliche Basis wird jedoch gezielt aufgebaut.'],
    ],
    cta: 'Welche Funktionen braucht Ihr Betrieb wirklich?',
    ctaButton: 'Lösung konfigurieren',
    related: 'Passende Leistungen',
  },
  en: {
    title: 'Industries',
    lead: 'Every industry needs its own entry points, features and trust signals. These are the industries we have planned solutions for.',
    homeTitle: 'Built for your day-to-day, not for a template.',
    eyebrow: 'For your industry',
    aside: 'Content and features are prioritised along the typical customer journey of your industry.',
    itemsTitle: 'Recommended building blocks',
    blocks: [
      ['What visitors must understand first', 'Within a few seconds it should be clear what is offered, who it is for, where it is available and what the sensible next step is. Mobile contact options are therefore never an afterthought.'],
      ['What can become easier internally', 'Depending on your needs, we connect enquiries, bookings, customer information, documents or status workflows. The website is then not just a digital business card, it takes real work off your hands.'],
      ['Visibility in Google and AI search', 'Dedicated service pages, regional content, clear headings, structured data and genuine references give search engines a better foundation. We never promise guaranteed rankings, but we build the technical and content basis deliberately.'],
    ],
    cta: 'Which features does your business really need?',
    ctaButton: 'Configure a solution',
    related: 'Related services',
  },
  fr: {
    title: 'Secteurs',
    lead: 'Chaque secteur a besoin de ses propres points d’entrée, fonctionnalités et signaux de confiance. Voici les secteurs pour lesquels nous avons conçu des solutions.',
    homeTitle: 'Pensé pour votre quotidien, pas pour un modèle.',
    eyebrow: 'Pour votre secteur',
    aside: 'Contenus et fonctionnalités sont priorisés selon le parcours client typique de votre secteur.',
    itemsTitle: 'Briques recommandées',
    blocks: [
      ['Ce que le visiteur doit comprendre d’abord', 'En quelques secondes, il doit être clair ce qui est proposé, pour qui, dans quelle région et quelle est la prochaine étape. Les moyens de contact sur mobile ne sont donc jamais secondaires.'],
      ['Ce qui peut devenir plus simple en interne', 'Selon vos besoins, nous relions demandes, réservations, informations clients, documents ou suivis de statut. Le site n’est alors plus une simple carte de visite : il prend en charge un vrai travail.'],
      ['Visibilité sur Google et dans la recherche IA', 'Des pages de services dédiées, des contenus régionaux, des titres clairs, des données structurées et de vraies références donnent une meilleure base aux moteurs de recherche. Aucun classement n’est garanti, mais la base technique et éditoriale est construite avec méthode.'],
    ],
    cta: 'De quelles fonctionnalités votre activité a-t-elle vraiment besoin ?',
    ctaButton: 'Configurer une solution',
    related: 'Services concernés',
  },
};

/** The eight industries. `icon` = name of an inline icon in build.mjs (no emoji, no external file). */
export const INDUSTRIES = [
  {
    id: 'trades', icon: 'wrench', legacy: '/branchen/handwerk.html', services: ['website', 'maintenance'],
    de: { label: 'Handwerk', name: 'Websites für Handwerker', h1: 'Mehr lokale Anfragen, bessere Referenzen und ein professioneller erster Eindruck.', lead: 'Handwerksbetriebe brauchen keine abstrakte Image-Seite. Interessenten wollen Leistungen, Einsatzgebiet, Arbeitsbeispiele, Erreichbarkeit und einen einfachen Weg zur Anfrage sehen.', items: ['Leistungsseiten nach Gewerk', 'Lokale SEO-Seiten für Einsatzgebiete', 'Vorher-Nachher-Referenzen', 'Angebots- und Rückrufanfrage', 'Karriere- und Mitarbeiterbereich', 'WhatsApp oder Telefon als schnelle Kontaktoption'] },
    en: { label: 'Trades', name: 'Websites for tradespeople', h1: 'More local enquiries, better references and a professional first impression.', lead: 'Trade businesses do not need an abstract image page. Prospects want to see services, service area, examples of work, availability and a simple way to get in touch.', items: ['Service pages per trade', 'Local SEO pages for service areas', 'Before-and-after references', 'Quote and call-back request', 'Careers and staff section', 'WhatsApp or phone as a quick contact option'] },
    fr: { label: 'Artisanat', name: 'Sites pour artisans', h1: 'Plus de demandes locales, de meilleures références et une première impression professionnelle.', lead: 'Une entreprise artisanale n’a pas besoin d’une page d’image abstraite. Les prospects veulent voir les prestations, la zone d’intervention, des exemples de chantiers, la disponibilité et un moyen simple de demander un devis.', items: ['Pages de prestations par métier', 'Pages SEO locales par zone d’intervention', 'Références avant-après', 'Demande de devis et de rappel', 'Espace recrutement et équipe', 'WhatsApp ou téléphone comme contact rapide'] },
  },
  {
    id: 'beauty', icon: 'sparkle', legacy: '/branchen/beauty.html', services: ['website', 'automation'],
    de: { label: 'Beauty & Kosmetik', name: 'Websites & Booking für Beauty', h1: 'Von der Marke bis zur Buchung: ein durchgängiges Kundenerlebnis.', lead: 'Beauty-Angebote leben von Vertrauen, Ästhetik, klaren Services und einem reibungslosen Terminweg. Lune Beauty zeigt, wie Website, Skin Check, Booking, CRM und Cloud verbunden werden können.', items: ['Servicekatalog und Preise', 'Online-Buchung', 'Skin-, Hair- oder Beratungs-Check', 'Bewertungen und Ergebnisse', 'CRM und Kundennotizen', 'Erinnerungen und Follow-up'] },
    en: { label: 'Beauty', name: 'Websites & booking for beauty', h1: 'From brand to booking: one seamless customer experience.', lead: 'Beauty businesses live on trust, aesthetics, clear services and a smooth path to an appointment. Lune Beauty shows how website, skin check, booking, CRM and cloud can work together.', items: ['Service menu and prices', 'Online booking', 'Skin, hair or consultation check', 'Reviews and results', 'CRM and client notes', 'Reminders and follow-up'] },
    fr: { label: 'Beauté', name: 'Sites et réservation pour la beauté', h1: 'De la marque à la réservation : une expérience client continue.', lead: 'Les métiers de la beauté reposent sur la confiance, l’esthétique, des prestations claires et une prise de rendez-vous fluide. Lune Beauty montre comment relier site, diagnostic de peau, réservation, CRM et cloud.', items: ['Carte des soins et tarifs', 'Réservation en ligne', 'Diagnostic peau, cheveux ou conseil', 'Avis et résultats', 'CRM et notes clients', 'Rappels et suivi'] },
  },
  {
    id: 'restaurants', icon: 'plate', legacy: '/branchen/gastronomie.html', services: ['website', 'ecommerce'],
    de: { label: 'Gastronomie', name: 'Websites für Gastronomie', h1: 'Appetit wecken, Reservierungen vereinfachen und Gäste aktuell informieren.', lead: 'Restaurants, Cafés und Bars brauchen auf dem Smartphone sofort verfügbare Informationen: Menü, Öffnungszeiten, Reservierung, Lage und aktuelle Events.', items: ['Digitale Speisekarte', 'Reservierung und Gruppenanfrage', 'Gutscheine und Events', 'Abholung oder Bestellintegration', 'Google Business und lokale SEO', 'Mehrsprachige Inhalte'] },
    en: { label: 'Restaurants', name: 'Websites for restaurants', h1: 'Whet the appetite, simplify reservations and keep guests up to date.', lead: 'Restaurants, cafés and bars need information that is instantly available on a phone: menu, opening hours, reservations, location and current events.', items: ['Digital menu', 'Reservations and group requests', 'Vouchers and events', 'Pick-up or ordering integration', 'Google Business and local SEO', 'Multilingual content'] },
    fr: { label: 'Restauration', name: 'Sites pour la restauration', h1: 'Donner envie, simplifier les réservations et informer les clients en temps réel.', lead: 'Restaurants, cafés et bars ont besoin d’informations immédiatement accessibles sur mobile : carte, horaires, réservation, accès et événements du moment.', items: ['Carte numérique', 'Réservation et demandes de groupe', 'Bons cadeaux et événements', 'Retrait ou intégration de commande', 'Google Business et SEO local', 'Contenus multilingues'] },
  },
  {
    id: 'coaching', icon: 'target', legacy: '/branchen/coach.html', services: ['website', 'software'],
    de: { label: 'Coaching', name: 'Websites für Coaches', h1: 'Expertise verständlich machen und Interessenten in ein klares Erstgespräch führen.', lead: 'Die Website strukturiert Positionierung, Angebote, Ergebnisse und den Weg vom ersten Interesse bis zum Termin oder digitalen Produkt.', items: ['Positionierung und Angebotsseiten', 'Terminbuchung', 'Lead-Magnet oder Check', 'Zahlung und digitale Produkte', 'Kundenbereich oder Kurszugang', 'E-Mail-Follow-up'] },
    en: { label: 'Coaching', name: 'Websites for coaches', h1: 'Make expertise easy to understand and lead prospects into a clear first conversation.', lead: 'The website structures positioning, offers, results and the path from first interest to an appointment or a digital product.', items: ['Positioning and offer pages', 'Appointment booking', 'Lead magnet or self-check', 'Payment and digital products', 'Client area or course access', 'E-mail follow-up'] },
    fr: { label: 'Coaching', name: 'Sites pour coachs', h1: 'Rendre l’expertise compréhensible et conduire les prospects vers un premier échange clair.', lead: 'Le site structure le positionnement, les offres, les résultats et le chemin entre le premier intérêt et le rendez-vous ou le produit numérique.', items: ['Positionnement et pages d’offres', 'Prise de rendez-vous', 'Aimant à prospects ou auto-diagnostic', 'Paiement et produits numériques', 'Espace client ou accès aux cours', 'Suivi par e-mail'] },
  },
  {
    id: 'hair', icon: 'scissors', legacy: '/branchen/friseur.html', services: ['website', 'automation'],
    de: { label: 'Friseur', name: 'Websites & Booking für Friseure', h1: 'Stil zeigen, Leistungen erklären und freie Termine leichter füllen.', lead: 'Salons brauchen eine schnelle mobile Experience: Team, Leistungen, Preise, Ergebnisse, Terminbuchung und klare Kontaktmöglichkeiten.', items: ['Leistungen und Preise', 'Teamprofile', 'Online-Termine', 'Galerie und Social Proof', 'Erinnerungen', 'Kundendaten und Präferenzen'] },
    en: { label: 'Hair salons', name: 'Websites & booking for hair salons', h1: 'Show your style, explain your services and fill free slots more easily.', lead: 'Salons need a fast mobile experience: team, services, prices, results, appointment booking and clear ways to get in touch.', items: ['Services and prices', 'Team profiles', 'Online appointments', 'Gallery and social proof', 'Reminders', 'Client data and preferences'] },
    fr: { label: 'Coiffure', name: 'Sites et réservation pour salons de coiffure', h1: 'Montrer son style, expliquer ses prestations et remplir plus facilement les créneaux libres.', lead: 'Un salon a besoin d’une expérience mobile rapide : équipe, prestations, tarifs, réalisations, prise de rendez-vous et contacts clairs.', items: ['Prestations et tarifs', 'Profils de l’équipe', 'Rendez-vous en ligne', 'Galerie et preuves sociales', 'Rappels', 'Données et préférences clients'] },
  },
  {
    id: 'events', icon: 'ticket', legacy: '/branchen/event.html', services: ['website', 'ecommerce'],
    de: { label: 'Events', name: 'Event-Websites & Ticketing', h1: 'Von der Aufmerksamkeit bis zur Anmeldung in einem konsistenten Ablauf.', lead: 'Eventseiten müssen Programm, Ort, Zeit, Tickets und Updates schnell vermitteln, auch unter Zeitdruck auf dem Smartphone.', items: ['Event-Landingpage', 'Programm und Speaker', 'Tickets oder Anmeldung', 'QR- und E-Mail-Kommunikation', 'Sponsoren und Partner', 'Nachbereitung und Medien'] },
    en: { label: 'Events', name: 'Event websites & ticketing', h1: 'From attention to registration in one consistent flow.', lead: 'Event pages must convey programme, venue, time, tickets and updates quickly, even under time pressure on a phone.', items: ['Event landing page', 'Programme and speakers', 'Tickets or registration', 'QR and e-mail communication', 'Sponsors and partners', 'Follow-up and media'] },
    fr: { label: 'Événementiel', name: 'Sites d’événements et billetterie', h1: 'De l’attention à l’inscription, dans un parcours cohérent.', lead: 'Une page d’événement doit transmettre vite programme, lieu, horaires, billets et mises à jour, même dans l’urgence sur un téléphone.', items: ['Page d’atterrissage de l’événement', 'Programme et intervenants', 'Billets ou inscription', 'Communication par QR code et e-mail', 'Sponsors et partenaires', 'Suivi et médias après l’événement'] },
  },
  {
    id: 'medical', icon: 'stethoscope', legacy: '/branchen/arzt.html', services: ['website', 'maintenance'],
    de: { label: 'Arzt & Praxis', name: 'Websites für Arztpraxen', h1: 'Vertrauenswürdige Information, barrierearme Bedienung und klare Kontaktwege.', lead: 'Praxis-Websites müssen Leistungen, Team, Sprechzeiten, Zugang und Terminwege verständlich darstellen. Sensible Gesundheitsdaten erfordern besondere Zurückhaltung und geeignete Systeme.', items: ['Leistungen und Praxisinformationen', 'Barrierearme Struktur', 'Termin- oder Rückrufanfrage', 'Formulare nur mit geeigneter Sicherheit', 'Mehrsprachige Hinweise', 'Lokale Auffindbarkeit'] },
    en: { label: 'Medical practices', name: 'Websites for medical practices', h1: 'Trustworthy information, accessible use and clear ways to get in touch.', lead: 'Practice websites must present services, team, opening hours, access and appointment options clearly. Sensitive health data calls for particular restraint and suitable systems.', items: ['Services and practice information', 'Accessible structure', 'Appointment or call-back request', 'Forms only with appropriate security', 'Multilingual notices', 'Local findability'] },
    fr: { label: 'Cabinets médicaux', name: 'Sites pour cabinets médicaux', h1: 'Une information fiable, un usage accessible et des contacts clairs.', lead: 'Le site d’un cabinet doit présenter clairement actes, équipe, horaires, accès et prise de rendez-vous. Les données de santé sensibles exigent une retenue particulière et des outils adaptés.', items: ['Actes et informations pratiques', 'Structure accessible', 'Demande de rendez-vous ou de rappel', 'Formulaires uniquement avec une sécurité adaptée', 'Informations multilingues', 'Visibilité locale'] },
  },
  {
    id: 'real-estate', icon: 'house', legacy: '/branchen/immobilien.html', services: ['website', 'automation'],
    de: { label: 'Immobilien', name: 'Websites für Immobilien', h1: 'Objekte überzeugend präsentieren und qualifizierte Anfragen strukturieren.', lead: 'Makler und Immobilienunternehmen brauchen schnelle Objektseiten, Filter, klare Exposés und einen verlässlichen Weg von der Anfrage ins CRM.', items: ['Objektlisten und Filter', 'Exposé und Mediengalerie', 'Bewertungs-Lead', 'Kauf- und Mietanfragen', 'Makler-CRM und Status', 'Lokale SEO-Seiten'] },
    en: { label: 'Real estate', name: 'Websites for real estate', h1: 'Present properties convincingly and structure qualified enquiries.', lead: 'Agents and property companies need fast listing pages, filters, clear exposés and a reliable path from enquiry to CRM.', items: ['Listings and filters', 'Exposé and media gallery', 'Valuation lead', 'Purchase and rental enquiries', 'Agent CRM and status', 'Local SEO pages'] },
    fr: { label: 'Immobilier', name: 'Sites pour l’immobilier', h1: 'Présenter les biens de façon convaincante et structurer des demandes qualifiées.', lead: 'Agents et sociétés immobilières ont besoin de fiches rapides, de filtres, de dossiers clairs et d’un chemin fiable entre la demande et le CRM.', items: ['Listes de biens et filtres', 'Dossier et galerie médias', 'Demande d’estimation', 'Demandes d’achat et de location', 'CRM agent et statuts', 'Pages SEO locales'] },
  },
];

/** Home FAQ of the old site (5 questions), with FAQPage structured data. */
export const HOME_FAQ = {
  de: { title: 'Wichtige Fragen vor dem Start', items: [
    ['Wie läuft ein Projekt ab?', 'Sie füllen ein geführtes Briefing aus. Danach klären wir Ziel, Umfang, Inhalte und Zeitplan. Sie sehen früh einen klickbaren Entwurf und geben gezielt Feedback.'],
    ['Ist die Website für Smartphones optimiert?', 'Ja. Jede Oberfläche wird mobile-first geplant und auf gängigen Bildschirmgrößen getestet.'],
    ['Kann meine Website Buchungen oder ein CRM enthalten?', 'Ja. Buchung, Servicekatalog, Kundenverwaltung, Cloud-Daten und Automatisierungen lassen sich zu einem System verbinden, wie bei Lune Beauty.'],
    ['Ist SEO enthalten?', 'Jede Website erhält eine technische SEO-Grundlage. Für nachhaltige Sichtbarkeit empfehlen wir zusätzlich Leistungs- und Branchenseiten, lokale Inhalte und strukturierte Daten.'],
    ['Betreuen Sie die Website nach dem Launch?', 'Ja. Updates, Backups, kleine Änderungen und Weiterentwicklung, planbar und persönlich.'],
  ] },
  en: { title: 'Questions before you start', items: [
    ['How does a project work?', 'You fill in a guided brief. Then we clarify goal, scope, content and timeline. You see a clickable draft early and give targeted feedback.'],
    ['Is the website optimised for smartphones?', 'Yes. Every interface is planned mobile-first and tested on common screen sizes.'],
    ['Can my website include bookings or a CRM?', 'Yes. Booking, service menu, customer management, cloud data and automations can be connected into one system, as with Lune Beauty.'],
    ['Is SEO included?', 'Every website gets a technical SEO foundation. For lasting visibility we also recommend service and industry pages, local content and structured data.'],
    ['Do you support the website after launch?', 'Yes. Updates, backups, small changes and further development, planned and personal.'],
  ] },
  fr: { title: 'Questions avant de commencer', items: [
    ['Comment se déroule un projet ?', 'Vous remplissez un brief guidé. Nous précisons ensuite l’objectif, le périmètre, les contenus et le calendrier. Vous voyez tôt une maquette cliquable et donnez un retour ciblé.'],
    ['Le site est-il optimisé pour les smartphones ?', 'Oui. Chaque interface est conçue mobile d’abord et testée sur les tailles d’écran courantes.'],
    ['Mon site peut-il intégrer des réservations ou un CRM ?', 'Oui. Réservation, catalogue de prestations, gestion clients, données cloud et automatisations peuvent former un seul système, comme pour Lune Beauty.'],
    ['Le SEO est-il inclus ?', 'Chaque site reçoit une base SEO technique. Pour une visibilité durable, nous recommandons en plus des pages de services et de secteurs, des contenus locaux et des données structurées.'],
    ['Assurez-vous le suivi après la mise en ligne ?', 'Oui. Mises à jour, sauvegardes, petites modifications et évolutions, planifiées et personnelles.'],
  ] },
};
