# ALGBr Shops — les 6 boutiques, un seul moteur · by Al.G.B.r.

**Un dépôt, six dossiers de boutique identiques, un moteur commun** (panier, paiement Stripe,
commande CJ automatique, pages légales, CRM et dashboard). Une correction du moteur vaut
pour les six boutiques.

```
shops/                 ← une boutique = un dossier, même architecture partout
  go/      GO     · go.algbr.eu      voyage
  space/   SPACE  · space.algbr.eu   rangement
  ease/    EASE   · ease.algbr.eu    bien-être
  glow/    GLOW   · glow.algbr.eu    beauté
  kin/     KIN    · kin.algbr.eu     animaux
  off/     OFF.   · off.algbr.eu     outlet (votre propre stock)
shared/                données communes : adresse de l'API, prospects et mots-clés du sourcing
engine/                le moteur : functions/ (API) + lib/ (prix, Stripe, CJ, CRM, Radar)
backend/               le serveur api.algbr.eu (Cloudflare Worker) qui fait tourner engine/
public/                gabarits communs : style et script des boutiques, dashboard /admin/
scripts/               construction (build.mjs), pages légales, images, publication d'OFF.
tests/                 npm test : prix, paiement, commande CJ, OFF., Radar
docs/                  checklist légale
```

## Une boutique (GO, SPACE, EASE, GLOW, KIN)

| Fichier | Contenu |
|---|---|
| `shops/<boutique>/products.json` | **Le catalogue** : prix, textes FR/DE/EN, SEO, photos, produit CJ (simple ou kit). |
| `shops/<boutique>/site.json` | Marque, textes de la page d'accueil, FAQ, livraison, coordonnées légales, `"launched"`. |
| `shops/<boutique>/assets/` | Photos (`products/`), logo, favicon, `theme.css` (couleurs de la marque). |
| `shops/<boutique>/README.md` | Adresse, hébergement, comment modifier et publier cette boutique. |

OFF. est différent : ses paires, prix et photos sont dans la base de données et se gèrent sur
**off.algbr.eu/admin** (aussi depuis le téléphone). Le dossier `shops/off/` contient seulement la
mise en page du site (voir `shops/off/README.md`).

Les noms internes des boutiques restent `nomad` (GO), `appart-reset` (SPACE) et `body-care`
(EASE) : les commandes et les clients déjà enregistrés y font référence. Les dossiers portent
le nom de la marque ; `node scripts/build.mjs` accepte les deux.

## Où tout est hébergé

| Partie | Hébergement | Publication |
|---|---|---|
| GO, SPACE, EASE | Cloudflare Pages (go-algbr, space-algbr, ease-algbr) | automatique à chaque envoi sur GitHub (`main`) |
| GLOW, KIN | Cloudflare Workers (glow-algbr, kin-algbr) | automatique à chaque envoi sur GitHub (GitHub Actions) |
| OFF. | Cloudflare Worker off-algbr | automatique à chaque envoi sur GitHub (GitHub Actions) |
| API + dashboard (api.algbr.eu) | Cloudflare Worker api-algbr, base D1 `algbr-crm` | automatique à chaque envoi sur GitHub (GitHub Actions), aussi quand un prix change |

La publication automatique des Workers est dans `.github/workflows/deploy-cloudflare.yml` : elle ne
publie que ce qui a changé, après `npm test`. Les commandes `npm run deploy:api`, `deploy:glow`,
`deploy:kin` et `deploy:off` restent disponibles à la main. Elle utilise le secret GitHub
`CLOUDFLARE_API_TOKEN` (Settings → Secrets and variables → Actions).

Les domaines `.de` redirigent vers les `.eu` (Porkbun). Les secrets (Stripe, CJ, mot de passe
admin, RADAR_KEY) sont saisis dans le tableau de bord Cloudflare du Worker api-algbr, jamais
dans le code.

## Le parcours d'une commande

```
Client ──► Boutique ──► Stripe Checkout ──► paiement + facture client
                              │ webhook
                              ▼
                 CRM (D1) : client + commande
                              │
                              ▼
          CJdropshipping (adresse, produits), payé depuis le solde CJ si CJ_AUTO_PAY=true
                              │ toutes les heures : statut + numéro de suivi
                              ▼
          « Suivre ma commande » · dashboard · notification ntfy
```
Une commande test (Stripe en mode test) n'est jamais envoyée à CJ. Les commandes OFF. ne
partent pas chez CJ : elles sont à expédier soi-même (Hermes).

## Modifier une boutique

1. Modifier `shops/<boutique>/products.json`, `site.json` ou une image dans `assets/`.
   Nouvelles photos : les déposer dans `assets/products/` puis `npm run images` (WebP).
2. `npm test`, puis aperçu local : `node scripts/build.mjs <boutique>` (résultat dans `dist/`).
3. Valider (« commit ») et envoyer (« push ») avec GitHub Desktop : les six boutiques se
   republient seules en 1 à 3 minutes (suivi : onglet Actions du dépôt sur GitHub).

## Ajouter une boutique

Copier un dossier de `shops/` (site.json, products.json, assets/, README.md), l'ajouter dans
`engine/lib/catalog.mjs`, créer son hébergement (Worker comme GLOW : copier
`shops/glow/wrangler.toml`), et mettre son domaine dans `site.json` (baseUrl, sert aussi à
autoriser l'API). Les commandes arrivent dans le même CRM et le même dashboard.

## Développement

```bash
npm install
npm test                       # tests du moteur
node scripts/build.mjs go      # construit une boutique dans dist/
npm run deploy:api             # publie l'API et le dashboard
```

Légal : `docs/LEGAL-CHECKLIST.md` (pages générées depuis `site.json` → `company`, à faire relire).
