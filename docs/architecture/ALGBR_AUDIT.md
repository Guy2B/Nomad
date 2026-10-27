# Audit de l'écosystème AlGBr (27 octobre 2026)

Périmètre : dépôt `Guy2B/Nomad` (commit `3c24625`, branche `main`), plus le dépôt public `Guy2B/algbr`
(site actuel du Digital Studio) et `Guy2B/sum-plus` (nΣxt LifeOS) pour les dépendances de domaine.
Méthode : lecture du code, des configurations Wrangler et du workflow, exécution des tests et des builds.
Aucun secret, clé ou donnée personnelle n'est reproduit ici. Les sites en production n'ont pas pu être
consultés depuis l'environnement d'audit (accès réseau restreint) : tout ce qui concerne l'état réel du DNS
est marqué **À VÉRIFIER**.

## 1. Inventaire

| Élément | Dossier | Exécution | Domaine actuel | Déploiement |
|---|---|---|---|---|
| GO (id historique `nomad`) | `shops/go` | Cloudflare Pages `go-algbr` | go.algbr.eu (+ go.algbr.de → .eu, Porkbun) | Intégration Git de Cloudflare Pages |
| SPACE (id `appart-reset`) | `shops/space` | Cloudflare Pages `space-algbr` | space.algbr.eu (+ .de) | Intégration Git Pages |
| EASE (id `body-care`) | `shops/ease` | Cloudflare Pages `ease-algbr` | ease.algbr.eu (+ .de) | Intégration Git Pages |
| GLOW | `shops/glow` | Worker `glow-algbr` (assets) | glow.algbr.eu | GitHub Actions |
| KIN | `shops/kin` | Worker `kin-algbr` (assets) | kin.algbr.eu | GitHub Actions |
| JOY | `shops/joy` | Worker `joy-algbr` (assets) | joy.algbr.eu | GitHub Actions |
| OFF. | `shops/off` | Worker `off-algbr` (rendu D1 + KV) | off.algbr.eu (+ off.algbr.de) | GitHub Actions |
| API + dashboard | `backend/` + `engine/` + `public/admin` | Worker `api-algbr`, D1 `algbr-crm`, KV `OFF_MEDIA`, cron horaire | api.algbr.eu | GitHub Actions |
| ALGEBRA | `algebra/` (paquet npm autonome) | Worker `algebra` (site + API), D1 `algbr-crm` (tables `alg_*`), cron 30 min | algebra.algbr.eu, `SITE_MODE=preview` | GitHub Actions (job dédié) |
| Digital Studio | **dépôt `Guy2B/algbr`** (hors Nomad) | Firebase Hosting `algbr-3b4ee` + GitHub Pages | **algbr.eu** (sitemap et canonical) | Workflows Firebase et Pages du dépôt `algbr` |
| nΣxt LifeOS | **dépôt `Guy2B/sum-plus`** | PWA (Firebase / GitHub Pages) + API Netlify | next.algbr.eu | Hors Nomad |

État des tests au moment de l'audit :

| Suite | Résultat |
|---|---|
| `npm test` (racine : flux, approvisionnement, OFF., Radar, après-vente, trafic) | 45 / 45 réussis |
| `algebra: npm test` | 47 tests, 46 réussis, 0 échec, 1 ignoré |
| `algebra: npm run build` | OK, mode preview, 3 langues, 15 produits publiés, 122 pages |

## 2. Ce qui fonctionne et doit être conservé

- **Moteur commun** (`engine/`) : prix recalculés côté serveur (`priceCart`, le navigateur n'envoie jamais de montant),
  Stripe Checkout sans SDK, signature de webhook vérifiée (HMAC, tolérance 300 s, comparaison à temps constant),
  idempotence par session Stripe, commande CJ automatique, synchronisation horaire, après-vente (remboursement,
  litige), avis modérés, statistiques d'audience sans cookie (hash salé quotidien).
- **Identifiants historiques** : `nomad`, `appart-reset`, `body-care` restent les ids de magasin dans les commandes ;
  préfixes de commande (`GO`, `SP`, `EA`, `GL`, `KI`, `JO`, `OF`). Le build accepte dossier ou id. À ne jamais renommer.
- **Générateur de boutiques** (`scripts/build.mjs` + `premium.mjs`) : pages statiques DE/FR/EN, canonical,
  hreflang + `x-default`, JSON-LD Product/Offer/Breadcrumb/FAQ/HowTo, flux Merchant Center, `_headers` avec CSP stricte,
  `noindex` sur panier, remerciement, suivi.
- **OFF.** : circuit distinct (stock propre, expédition Hermes, admin mobile, photos KV, pages rendues depuis D1).
  Les commandes OFF. ne partent jamais chez CJ.
- **ALGEBRA** : paquet autonome très abouti (catalogue unique `data/catalog.mjs`, statuts `PREVIEW` /
  `NEEDS_SUPPLIER_APPROVAL` / `DRAFT`, refus serveur `NOT_PURCHASABLE`, mode preview qui refuse les clés Stripe live,
  fournisseur derrière une couche d'adaptation, mapping fournisseur côté serveur uniquement, marque verrouillée
  dans `algebra/brand/`, QA navigateur). Aucun encart vers les autres marques dans ses pages.
- **CI** : `dorny/paths-filter` ne publie que ce qui a changé, tests avant publication, secret nettoyé et masqué.
- **Sécurité de base** : aucun secret commité (scan des motifs Stripe, Resend, AWS, clés privées : rien trouvé) ;
  secrets saisis comme « Secret » dans Cloudflare ; `keep_vars = true`.

## 3. Ce qui est dupliqué

| Donnée | Copies | Risque |
|---|---|---|
| Coordonnées de l'exploitant (Impressum) | 6 × `shops/*/site.json` → `company`, `shops/off/worker.mjs`, `algebra/site/config.mjs`, `impressum.html` du dépôt `algbr` | Une copie oubliée lors d'un changement d'adresse = mentions légales divergentes |
| Identité des marques (nom, domaine, accroche, couleur) | `site.json`, `shared/platform.json` (family), `index.html` du dépôt `algbr` (cartes des 7 boutiques, prix « ab … ») | Le portfolio du studio se désynchronise des boutiques |
| URL de l'organisation AlGBr (`https://algbr.eu/`) | `byAlgbr` dans 6 `site.json`, JSON-LD dans `scripts/premium.mjs` (×2), `shops/off/worker.mjs` (×2), pied de page de nΣxt (`sum-plus/apps/web/index.html`) | **Après la bascule, ces liens pointeraient vers ALGEBRA** |
| Contrôle du jeton Cloudflare | deux blocs identiques dans le workflow | Maintenance |
| Logique CORS et JSON | `engine/lib/http.mjs` et `algebra/worker/src/index.js` | Faible, circuits volontairement séparés |

## 4. Ce qui mérite d'être mutualisé

- Un **registre des marques** (`shared/brands.json`) et des **logiciels** (`shared/software.json`) consommé par le
  Digital Studio et vérifié par des tests contre les `site.json` (pas de copie à la main).
- L'**URL de l'organisation** : une seule valeur (`organization.url` du registre) contrôlée par test.
- Les **coordonnées de l'exploitant** : un test de cohérence entre toutes les copies, en attendant une source unique
  (la génération des pages légales des boutiques n'est pas modifiée dans cette passe, par prudence).
- La **politique de promotion croisée** : éligibilité par marque dans le registre, sélection dans `platform.json`,
  ALGEBRA exclue par défaut, contrôlée par test.

## 5. Ce qui doit rester indépendant

- Les trois circuits de commande : **CJ** (6 boutiques catalogue via `api-algbr`), **OFF.** (stock propre),
  **ALGEBRA** (production à la demande via Valadio, A61 en secours désactivé). Pas de fusion.
- Les tables D1 : `kv` (CRM boutiques), `off_*`, `traffic_*`, `alg_*`. Base partagée, schémas séparés : à conserver.
- Le paquet `algebra/` (ses propres dépendances, tests, build et Worker).
- L'identité visuelle de chaque boutique (`theme.css`, accroches, images).
- Le Digital Studio : nouveau projet de déploiement, sans dépendance aux boutiques.

## 6. Ce qui est obsolète ou incohérent dans la documentation

- `shared/platform.json` → `note` décrit encore un backend **Netlify** ; le backend est un Worker Cloudflare.
- `scripts/build.mjs` (en-tête) parle aussi de Netlify pour le backend.
- `algebra/README.md` et `ALGEBRA_LAUNCH_REPORT.md` présentent **A61** comme fournisseur principal ;
  `worker/wrangler.toml` utilise **Valadio** (`FULFILLMENT_PROVIDER = "valadio"`) avec A61 en secours.
- `algebra/.env.example` : `MAIL_FROM=orders@algbr.eu` alors que `wrangler.toml` utilise `service@algbr.eu`.
- `ALGEBRA_LAUNCH_REPORT.md` §5 cite un projet Pages `algebra-shop`, un Worker `algebra-api` et une D1 `algebra` :
  la réalité est un Worker unique `algebra` sur la D1 partagée `algbr-crm`.
- `algebra/package.json` garde un script `pages:deploy` qui ne correspond plus au déploiement réel.
- Hébergement d'algbr.eu : `docs/seo/SEO_AUDIT.md` indique GitHub Pages, le dépôt `algbr` publie à la fois sur
  Firebase et GitHub Pages. **À VÉRIFIER** dans le DNS : lequel sert réellement algbr.eu.

## 7. Problèmes de sécurité, performance et maintenance

| # | Constat | Gravité | Traitement |
|---|---|---|---|
| S1 | **Webhook Stripe partagé** : ALGEBRA utilise le même compte Stripe. Si l'endpoint `api.algbr.eu/api/stripe/webhook` reçoit tous les `checkout.session.completed`, une session ALGEBRA (métadonnées `order_id`, sans `store`) est traitée comme une commande GO à panier vide : commande « needs_attention » parasite dans le CRM, données client copiées, notification au propriétaire. | Moyenne | Corrigé (garde dans le moteur + `store: 'algebra'` dans les métadonnées ALGEBRA, tests) |
| S2 | Authentification admin par mot de passe porteur (`ADMIN_PASSWORD`, `ADMIN_TOKEN`) sans limitation de tentatives. Comparaison à temps constant correcte, longueur minimale 12 côté boutiques. | Faible à moyenne | Recommandation : Cloudflare Access (gratuit jusqu'à 50 utilisateurs) devant `/admin/` et `/api/admin*`, ou règle de limitation de débit |
| S4 | ALGEBRA : la CSP (`style-src 'self'`) bloque les attributs `style="--c:…"` des pastilles de couleur (pages collection et produit) ; constaté dans Chromium : les pastilles s'affichent sans couleur. | Moyenne (UX) | Corrigé (classes générées, test) |
| S3 | Identifiants Cloudflare non secrets mais publics dans le dépôt (account id, ids D1 et KV). | Info | Acceptable (ce ne sont pas des secrets) ; ne jamais y ajouter de jeton |
| P1 | Poids du dépôt : `algebra/design` 70 Mo, `algebra/site/assets` 54 Mo, 588 JPG/PNG versionnés. Clones lents. | Maintenance | Recommandation : Git LFS ou stockage externe pour les masters, après validation |
| P2 | GO, SPACE, EASE (Cloudflare Pages) se reconstruisent à **chaque push** sur `main`, quel que soit le dossier modifié (sauf « build watch paths » réglés dans Cloudflare, **À VÉRIFIER**). Une modification du portfolio relancerait trois builds. | Maintenance | Réglage documenté dans `ALGBR_TARGET.md` |
| P3 | Filtre CI `api: shared/**` : toute modification du futur registre republierait l'API. | Maintenance | Filtre resserré aux fichiers réellement lus par l'API |
| M1 | Ajout d'une boutique = modifications manuelles à 4 endroits (`catalog.mjs`, workflow, `package.json`, `platform.json`). | Maintenance | Documenté ; registre comme point d'entrée |
| M2 | `shops/off/worker.mjs` importe `scripts/legal.mjs` (couplage Worker ↔ script de build). | Faible | Conservé, noté |

## 8. Incohérences de configuration et de domaine

1. **algbr.eu sert aujourd'hui le Digital Studio** (dépôt `algbr`, sitemap en `https://algbr.eu/…`), alors que la cible
   est ALGEBRA. La migration est donc un **échange de domaines entre deux hébergeurs** (Firebase ou GitHub Pages vers
   Cloudflare pour algbr.eu ; nouvelle mise en ligne du Studio sur algbr.de), pas une simple redirection.
2. Les **anciennes URL du Studio** sur algbr.eu (`/leistungen/*.html`, `/branchen/*.html`, `/project.html`,
   `/en/`, `/fr/`, `/impressum.html`, `/datenschutz.html`…) devront répondre par une 301 vers algbr.de après la bascule.
3. Les liens « by AlGBr » de toutes les boutiques et le `parentOrganization` / `seller` des JSON-LD pointent vers
   `https://algbr.eu/` : à faire pointer vers `https://algbr.de/` (**fait dans cette branche**, sans effet sur les prix,
   paniers ou commandes).
4. Le pied de page de nΣxt LifeOS (dépôt `sum-plus`) pointe aussi vers `https://algbr.eu/` : **à corriger dans ce
   dépôt-là** (hors périmètre Nomad).
5. ALGEBRA : `SITE_ORIGIN` a pour valeur par défaut `https://algebra.algbr.eu` dans `site/config.mjs` et
   `wrangler.toml`. Le workflow construit sans variable : changer la valeur par défaut basculerait la production au
   prochain push. La bascule doit donc passer par un interrupteur explicite.
6. Webhook Stripe d'ALGEBRA enregistré sur `https://algebra.algbr.eu/api/stripe/webhook` : un nouvel endpoint
   `https://algbr.eu/api/stripe/webhook` devra être créé au moment de la bascule (nouveau secret de signature).
7. E-mails : expéditeur `service@algbr.eu` (domaine vérifié dans Resend). La bascule de l'apex algbr.eu ne doit
   **pas** toucher aux enregistrements MX, SPF, DKIM et DMARC de la zone.
8. `shops/glow`, `kin`, `joy` n'ont pas d'alias `.de` dans `site.json` (`aliases: []`) contrairement à GO, SPACE, EASE ;
   le README annonce des redirections `.de` pour toutes. **À VÉRIFIER** chez Porkbun ; ne rien changer sans vérification.
9. Le Studio actuel affiche des statistiques client pour Lune Beauty (« 10+ Anfragen pro Monat », « 60 % ») et des
   prix indicatifs « ab … » par boutique : non vérifiables depuis le dépôt. Ils ne sont **pas repris** dans le nouveau
   Studio tant qu'ils ne sont pas confirmés.
10. Les pages ALGEBRA demandées « Collections », « Essentials », « The House », « Journal » n'existent pas encore
    (existant : shop, men, women, polos, t-shirts, sweaters, knitwear, graphic-series, about, faq, contact, tracking,
    pages légales). Aucun contenu éditorial n'existe pour un Journal : ne pas l'inventer.

## 9. Dépendances à respecter avant toute modification

- `engine/lib/catalog.mjs` importe statiquement les six `site.json` / `products.json` : déplacer `shops/` casse l'API.
- `shops/glow|kin|joy/wrangler.toml` pointent vers `../../dist` ; `backend/wrangler.toml` vers `../dist`.
- Les projets Cloudflare Pages GO/SPACE/EASE ont une commande de build configurée dans le tableau de bord
  (probablement `node scripts/build.mjs <boutique>`, **À VÉRIFIER**) : chemins `scripts/` et `shops/` à garder.
- `algebra/worker/wrangler.toml` → `../dist` ; le job CI travaille dans `algebra/`.
- La D1 `algbr-crm` est partagée par `api-algbr`, `off-algbr` et `algebra` : pas de migration destructive.

Conclusion : l'arborescence actuelle est déjà proche de la cible conceptuelle. Aucun déplacement de dossier n'est
justifié ; la restructuration consiste à **ajouter** `sites/digital-studio/` et les registres, à corriger les liens de
domaine et à préparer la bascule d'ALGEBRA derrière un interrupteur.
