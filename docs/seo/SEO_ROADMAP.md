# SEO roadmap AlGBr

## P0 : jour du lancement
- Lever le `noindex` (voir SEARCH_CONSOLE_SETUP.md, étape 0), propriété Domaine algbr.eu, sitemaps, Bing + Crawler Hints (IndexNow).
- Merchant Center : flux des boutiques live (MERCHANT_CENTER_SETUP.md).

## P1 : semaines 1–2
1. algbr.eu : créer de vraies pages /fr/ et /en/ (aujourd'hui traduites par JavaScript sur la même URL, invisibles pour Google) avec hreflang.
2. OFF : page Private Sourcing dédiée, page Authentizität (processus réel uniquement), dimensions des images.
3. Liens internes vers les URL propres (sans `.html`) pour éviter les redirections 308.
4. Raccourcir les 22 titles produit > 60 caractères en gardant le mot-clé en tête.

## P2 : semaines 2–6 : catégories par territoire (uniquement avec assez de produits réels)
| Boutique | Catégories candidates (produits actifs) |
|---|---|
| GO (11) | Packwürfel & Organisation, Schlafen im Flugzeug, Taschen |
| SPACE (11) | Küche ohne Bohren, Schreibtisch & Kabel, Schrank & Wäsche |
| EASE (12) | Füße, Schreibtisch, Bewegung & Stretching |
| GLOW (13) | Satin für die Nacht, Beauty-Taschen, Pinsel & Ordnung |
| KIN (13) | Tierhaare entfernen, Fellpflege, Bad & Pfoten, Unterwegs |
| JOY (7) | Weihnachtsdeko, Geschenkverpackung (URL permanentes, réactivées chaque saison, jamais /christmas-2026/) |
Chaque catégorie : intro originale, liste des produits, FAQ courte, CollectionPage + BreadcrumbList, lien depuis l'accueil et depuis chaque fiche.

## P3 : contenu transactionnel (1 guide par mois et par boutique, seulement s'il répond vraiment)
- GO : Handgepäck für 7 Tage packen ; beste Packwürfel fürs Handgepäck.
- SPACE : Bad aufbewahren ohne Bohren ; kleine Wohnung organisieren.
- GLOW : Satin-Kissenbezug richtig pflegen ; Beauty-Tasche für die Reise packen.
- KIN : Tierhaare vom Sofa entfernen ; Tierhaare im Auto.
- JOY : Weihnachtsgeschenke unter 30 Euro ; Weihnachtsdeko kleine Wohnung.
- OFF : Timberland Größen EU/US/UK ; Markenschuhe unter UVP kaufen : worauf achten.

## P4 : GEO / moteurs IA
- Garder des réponses factuelles visibles (FAQ) et l'entité AlGBr cohérente partout (même nom, même adresse, même e-mail).
- Pas de llms.txt pour l'instant : aucun moteur ne l'utilise comme garantie d'indexation. Les crawlers de recherche IA (OAI-SearchBot, Claude-SearchBot, PerplexityBot) sont déjà autorisés par `User-agent: *`.

## Métriques (baseline J0 = jour du lancement, puis J+7, J+30, J+90)
Par propriété : pages indexées / exclues, impressions, clics, CTR, position moyenne, requêtes de marque (GO, KIN… + « by AlGBr »), fiches marchandes valides, clics Merchant Center (fiches gratuites), Core Web Vitals.
OFF en plus : délai publication → indexation et → première impression, requêtes par référence (TB0A2R35…), par pointure, trafic de l'Archive, demandes Private Sourcing venant du référencement naturel, écarts stock/flux signalés par Merchant Center.

Objectifs réalistes à 30 jours (pas de garantie de position) : 100 % des fiches produit indexées, 0 erreur de fiche marchande, premières impressions sur les références OFF et sur les noms de marque.
