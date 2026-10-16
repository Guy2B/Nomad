# JOY · joy.algbr.eu

Boutique de Noël d'ALGBr (7 produits actifs : 5 box et 2 articles à l'unité). « Make Christmas feel like Christmas. » / « Weihnachten, wie es sein soll. » Même architecture que les autres boutiques de `shops/`.

| Fichier | Contenu |
|---|---|
| `products.json` | Catalogue : prix (en centimes), textes FR/DE/EN, SEO, photos, produits CJ (`components`), `costCents` (revient port compris), `active`. |
| `site.json` | Marque, textes de la page d'accueil (`ui`), FAQ, livraison, coordonnées légales (`company`), `launched` (false = invisible pour Google). |
| `assets/` | Photos produit (`products/`), favicon, `theme.css` (vert sapin, rouge canneberge, or). |

- **Approvisionnement** : dropshipping CJ depuis l'entrepôt allemand (`fromCountryCode: "DE"`, transporteur `DHL DE to DE`). Tous les produits viennent du même vendeur CJ (SKU `CJSD2994…`), pour qu'une box parte en un seul colis.
- **Délai affiché** : 5 à 7 jours ouvrés (délai annoncé par CJ pour DHL DE→DE), livraison en Allemagne uniquement.
- **Date limite Noël** : vendredi 11 décembre (FAQ). À adapter si CJ annonce autre chose.
- **Adresse** : https://joy.algbr.eu (à rattacher dans Cloudflare)
- **Hébergement** : Cloudflare Worker joy-algbr (config : `wrangler.toml` de ce dossier)
- **Publier une modification** : automatique : envoyer la modification sur GitHub (GitHub Desktop → Commit → Push).
- **Aperçu local** : `node scripts/build.mjs joy` à la racine du dépôt, puis ouvrir `dist/`.
- **Nom interne** : `joy` (préfixe des commandes `JO`, clé du CRM, à ne pas changer).

À faire avant d'ouvrir : vérifier la conformité GPSR des articles à bougies (fabricant, consignes), passer `launched` à `true`, rattacher le domaine. Fin de saison : passer les produits à `"active": false` après Noël.
