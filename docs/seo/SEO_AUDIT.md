# Audit SEO AlGBr (17 octobre 2026)

Périmètre : algbr.eu, GO, SPACE, EASE, GLOW, KIN, JOY (sites statiques générés par `scripts/build.mjs`) et OFF. (Worker rendu à la demande depuis D1, `shops/off/worker.mjs`).

Méthode : build complet des 6 boutiques catalogue (405 pages HTML analysées : title, meta description, H1, canonical, hreflang, robots, Open Graph, JSON-LD, images), lecture du code d'OFF et rendu local avec données de test, lecture des en-têtes et de `robots.txt` / `sitemap.xml` d'OFF en production, lecture des fichiers d'algbr.eu.

## Inventaire

| Site | Hébergement | Langues | Pages indexables visées | Produits actifs | Sitemap | Indexation aujourd'hui |
|---|---|---|---|---|---|---|
| algbr.eu | GitHub Pages | DE (FR/EN par JavaScript) | 15 | – | oui | indexable |
| go.algbr.eu | Cloudflare Pages | de/fr/en | 3 × 13 | 11 | oui | **noindex** (pré-lancement) |
| space.algbr.eu | Cloudflare Pages | de/fr/en | 3 × 13 | 11 | oui | **noindex** |
| ease.algbr.eu | Cloudflare Pages | de/fr/en | 3 × 14 | 12 | oui | **noindex** |
| glow.algbr.eu | Worker | de/fr/en | 3 × 15 | 13 | oui | **noindex** |
| kin.algbr.eu | Worker | de/fr/en | 3 × 15 | 13 | oui | **noindex** |
| joy.algbr.eu | Worker | de (fr/en) | 3 × 9 | 7 | oui | **noindex** (lancement après GPSR) |
| off.algbr.eu | Worker + D1 | de/fr/en | 3 × (1 + produits) | 3 (dont vendus) | dynamique | **noindex + robots Disallow: /** |

Points déjà bons (constatés, pas modifiés) :
- URLs propres et stables : `/de/produkt/<id>`, `/de/ratgeber/<slug>`, OFF `/de/p/<marque-modèle-couleur-référence-pointure>`.
- Canonical auto-référent correct, hreflang de/fr/en + x-default sur les boutiques catalogue.
- Une seule H1 par page (sauf la page racine de choix de langue, sans H1, canonical vers /de/).
- 0 image sans `alt`, 0 image sans dimensions sur les boutiques catalogue.
- Panier, remerciement, suivi de commande et formulaire d'avis en `noindex`.
- Product + Offer + BreadcrumbList sur chaque produit, FAQPage sur l'accueil, HowTo sur les guides.
- Aucun faux avis (pas d'AggregateRating), aucun faux prix barré, aucun GTIN inventé.
- OFF : marque réelle (Timberland) en `brand`, référence fabricant en `mpn`, EAN réel en `gtin`, 5 photos de la paire, prix UVP affiché uniquement si renseigné, paire vendue marquée `SoldOut` et conservée dans l'archive.
- EASE : aucune promesse médicale visible ; les mots « therapy », « sciatica », « plantar »… n'existent que dans des notes internes et des URL fournisseur jamais affichées.
- robots.txt : `User-agent: *` autorise Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot ; /admin/ et /api/ exclus.

## CRITICAL

| # | Problème | Portée | Statut |
|---|---|---|---|
| C1 | **Toutes les boutiques sont exclues de Google** : en-tête `X-Robots-Tag: noindex, nofollow` (catalogue, tant que `launched` n'est pas `true` dans `site.json`) ; OFF : `noindex` + `robots.txt: Disallow: /` (tant que `LAUNCHED` ≠ `true`). | 7 boutiques | **Volontaire, lié au lancement.** À lever le jour où Stripe est en live (voir SEARCH_CONSOLE_SETUP.md, étape 0). Ouvrir l'indexation avant fait arriver des visiteurs sur un paiement en mode test. |

## HIGH (corrigé dans ce passage)

| # | Problème | Correction |
|---|---|---|
| H1 | Offer sans délai de livraison structuré ni frais de retour ni vendeur (recommandés pour les fiches marchandes Google). | `deliveryTime` (préparation + transport, dérivé du délai réel de chaque boutique ou produit), `returnFees: ReturnFeesCustomerResponsibility`, `returnPolicyCountry`, `seller: AlGBr`. Boutiques catalogue + OFF. |
| H2 | Aucun flux Merchant Center pour les 6 boutiques catalogue. | `/feed.xml` généré à chaque build (RSS 2.0 Google) : id = SKU, titre et description de la page, lien canonique DE, images, prix, disponibilité, marque, `identifier_exists=no` (produits de marque propre, aucun GTIN inventé), délais de préparation et de transport, livraison par pays. |
| H3 | Entités : chaque boutique se déclarait `OnlineStore` isolé avec son seul slogan ; algbr.eu sans `Organization`, sans canonical, `og:image` relative. | Boutiques : `OnlineStore` « GO by AlGBr » avec description de territoire, `brand`, `parentOrganization: AlGBr`. algbr.eu : `Organization` AlGBr listant les 7 marques avec URL et définition, canonical, `og:url`, `og:image` absolue. |
| H4 | OFF : pas de `x-default`, pas de BreadcrumbList, pas de politique de retour ni de taille en données structurées, pages remerciement et suivi indexables, aucune donnée d'entité sur l'accueil. | Corrigé (`x-default` → /de/, BreadcrumbList, `MerchantReturnPolicy`, `SizeSpecification` EU, `noindex` sur danke/bestellung, `OnlineStore` OFF. by AlGBr avec adresse et `parentOrganization`). |
| H5 | Sitemaps : `lastmod` = date du build sur toutes les URL (signal faux) ; OFF sans hreflang ni `lastmod` ; algbr.eu listait des pages `noindex` et des pages de redirection. | Catalogue : `lastmod` retiré. OFF : `lastmod` réel (`updated_at` du produit) + hreflang. algbr.eu : impressum, datenschutz, /fr/, /en/ retirés. |
| H6 | OFF : aucune réponse factuelle citable (moteurs IA). | FAQ visible DE/FR/EN sur l'accueil + `FAQPage` : ce qu'est OFF., authenticité, stock en Allemagne, délais, paire vendue, Private Sourcing, retours. Uniquement des faits déjà affichés. OFF. y est explicitement décrit comme n'étant ni revendeur ni outlet officiel d'une marque. |
| H7 | OFF : vignettes photo sans texte alternatif ; photo principale sans pointure dans l'alt. | Alt descriptif (marque, modèle, couleur, EU). |

## MEDIUM (non corrigé, voir SEO_ROADMAP.md)

- M1 algbr.eu : FR et EN sont traduits par JavaScript sur la même URL (`/?lang=fr`) ; Google ne voit que l'allemand. Il faut de vraies pages /fr/ et /en/.
- M2 Pas de pages catégories : l'accueil regroupe les produits par ancres (#produkte). Les pages catégories par territoire sont la prochaine source de longue traîne.
- M3 Liens internes en `.html` : Cloudflare répond par une redirection 308 vers l'URL propre. Sans gravité, mais du crawl perdu.
- M4 OFF : Private Sourcing et Archive sont des ancres de l'accueil, pas des pages ; pas de page marque (une seule marque, trois références : prématuré).
- M5 OFF : images sans `width`/`height` (risque de décalage de mise en page).
- M6 Identité légale : algbr.eu affiche « Al.G.B.r. Digital Studio » dans l'Impressum, les boutiques « AlGBr ». À harmoniser après l'enregistrement de la Gewerbe.
- M7 22 titres de fiches produit dépassent 60 caractères (tronqués dans Google, pas pénalisés).
- M8 Guides « Demnächst » affichés sur les accueils sans page derrière.

## LOW

- Titres des pages légales courts et génériques (normal).
- Page racine de chaque boutique : sélecteur de langue sans H1 (canonical vers /de/, sans impact).
- OFF : flux Merchant en allemand uniquement (pays cible DE, suffisant).

## Hors périmètre de ce passage
- Mesures de vitesse réelles (Core Web Vitals) : à lire dans Search Console après lancement ; les pages sont statiques, sans police externe, images WebP dimensionnées.
- Données Search Console : aucune (sites en noindex). La baseline commence le jour du lancement.
