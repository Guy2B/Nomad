# OFF. by ALGBr · off.algbr.eu

Outlet de votre propre stock (chaussures Timberland), expédié par vous (Hermes).

**Produits, prix, photos, réservations et ventes ne sont pas dans ce dossier** : ils sont dans la
base de données et se gèrent sur **https://off.algbr.eu/admin** (aussi depuis le téléphone).

Ce dossier contient la mise en page du site :

| Fichier | Contenu |
|---|---|
| `worker.mjs` | Les pages (accueil, fiche produit, pages légales, flux Google, sitemap), générées à chaque visite depuis la base. |
| `i18n.mjs` | Tous les textes du site en DE / FR / EN. |
| `public/assets/` | Style (`off.css`), script (`off.js`), favicon. |
| `public/admin/` | L'admin OFF. (ajout de paires, photos depuis le téléphone). |
| `wrangler.toml` | Hébergement : Cloudflare Worker off-algbr, base D1 `algbr-crm`, photos dans KV `OFF_MEDIA`. `LAUNCHED = "false"` = invisible pour Google. |

- **Publier une modification de mise en page** : automatique, envoyer la modification sur GitHub (GitHub Desktop → Commit → Push).
- Le paiement et les commandes passent par le moteur commun (`engine/lib/off.mjs`) ; les commandes OFF. ne partent jamais chez CJ.
