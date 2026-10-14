# GLOW · glow.algbr.eu

Boutique GLOW d'ALGBr (13 produits actifs). Même architecture que les autres boutiques de `shops/`.

| Fichier | Contenu |
|---|---|
| `products.json` | Catalogue : prix (en centimes), textes FR/DE/EN, SEO, photos, produit CJ (`supplier` ou `components` pour un kit), `active`. |
| `site.json` | Marque, textes de la page d'accueil (`ui`), FAQ, livraison, coordonnées légales (`company`), `launched` (false = invisible pour Google). |
| `assets/` | Photos produit (`products/`), logo, favicon, `theme.css` (couleurs). |

- **Adresse** : https://glow.algbr.eu (le `.de` redirige ici)
- **Hébergement** : Cloudflare Worker glow-algbr (config : `wrangler.toml` de ce dossier)
- **Publier une modification** : automatique : envoyer la modification sur GitHub (GitHub Desktop → Commit → Push).
- **Aperçu local** : `node scripts/build.mjs glow` à la racine du dépôt, puis ouvrir `dist/`.
- **Nom interne** : `glow` (préfixe des commandes et clé du CRM, à ne pas changer).

Le panier, le paiement, l'envoi à CJ et les pages légales viennent du moteur commun (`engine/`) :
une correction là-bas s'applique aux six boutiques.
