# Search Console et Bing : mise en place

## Étape 0 : ouvrir l'indexation (jour du lancement, quand Stripe est en live)

1. Boutiques catalogue : dans `shops/<boutique>/site.json`, `"launched": true` (GO, SPACE, EASE, GLOW, KIN ; JOY après la réponse GPSR de CJ). Commit + push : l'en-tête `X-Robots-Tag: noindex` disparaît au déploiement.
2. OFF. : variable `LAUNCHED=true` du Worker `off-algbr` (Cloudflare → Workers → off-algbr → Settings → Variables). `robots.txt` passe alors à `Allow: /` avec le sitemap.
3. Vérifier : `https://<boutique>/de/` ne renvoie plus `x-robots-tag` ; `https://<boutique>/robots.txt` contient `Sitemap:`.

## Étape 1 : une seule propriété « Domaine » pour tout

Search Console → Ajouter une propriété → **Domaine** → `algbr.eu`. Google donne un enregistrement TXT : l'ajouter dans Cloudflare (DNS de algbr.eu). Cette propriété couvre algbr.eu et tous les sous-domaines (go, space, ease, glow, kin, joy, off).

Ajouter en plus une propriété « Préfixe d'URL » par boutique (même validation DNS, instantanée) pour lire les rapports boutique par boutique.

## Étape 2 : sitemaps (une fois par sous-domaine)

| Propriété | Sitemap |
|---|---|
| https://algbr.eu/ | https://algbr.eu/sitemap.xml |
| https://go.algbr.eu/ | https://go.algbr.eu/sitemap.xml |
| https://space.algbr.eu/ | https://space.algbr.eu/sitemap.xml |
| https://ease.algbr.eu/ | https://ease.algbr.eu/sitemap.xml |
| https://glow.algbr.eu/ | https://glow.algbr.eu/sitemap.xml |
| https://kin.algbr.eu/ | https://kin.algbr.eu/sitemap.xml |
| https://joy.algbr.eu/ | https://joy.algbr.eu/sitemap.xml |
| https://off.algbr.eu/ | https://off.algbr.eu/sitemap.xml |

## Étape 3 : contrôles le jour 1

- Inspection d'URL sur l'accueil /de/ et 2 fiches produit par boutique → « Demander l'indexation ».
- Test des résultats enrichis (search.google.com/test/rich-results) sur une fiche produit par boutique et une fiche OFF : Product, Offer, fiche marchande, Breadcrumb, FAQ doivent être valides.
- Rapport « Fiches marchandes » (Merchant listings) : surveiller les avertissements.

## Étape 4 : Bing Webmaster Tools + IndexNow

- bing.com/webmasters → « Importer depuis Google Search Console » (reprend propriétés et sitemaps).
- IndexNow sans code : Cloudflare → algbr.eu → Caching → Configuration → **Crawler Hints : ON**. Cloudflare signale alors les pages modifiées à Bing et Yandex (IndexNow). Utile surtout pour OFF (paires publiées et vendues).

## Étape 5 : baseline (J0) puis J+7, J+30, J+90

Exporter par propriété : pages indexées / exclues, impressions, clics, CTR, position moyenne, rapport Fiches marchandes, Core Web Vitals. Voir SEO_ROADMAP.md (métriques).
