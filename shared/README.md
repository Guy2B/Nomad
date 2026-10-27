# shared/

| Fichier | Rôle | Lu par |
|---|---|---|
| `brands.json` | **Registre officiel des marques** : identité, domaine, statut, logo, thème, langues, type de boutique, textes du portfolio, politique de promotion croisée. Ni prix, ni stock, ni catalogue. | Digital Studio (`sites/digital-studio`), `tests/registry.test.mjs` |
| `software.json` | **Registre des logiciels** (nΣxt LifeOS…). `public: false` = jamais publié. | Digital Studio, tests |
| `registry.mjs` | Chargement (accroches lues dans `site.json`) et contrôle de cohérence avec les sources. | Studio, tests |
| `platform.json` | Configuration de vente commune : adresse de l'API (`https://api.algbr.eu`), encart nΣxt, encart « famille » (sélection des boutiques sœurs). | Boutiques, API, OFF. |
| `prospects.json`, `alt-keywords.json` | Produits à l'étude et mots-clés pour l'audit de stock CJ (dashboard). | API |

Règles :
- Une marque nouvelle s'ajoute d'abord dans `brands.json` ; `npm test` signale toute incohérence avec son `site.json`.
- Les identifiants historiques (`nomad`, `appart-reset`, `body-care`) restent les `storeId` : ne jamais les changer.
- ALGEBRA et OFF. ne sont pas éligibles à l'encart « famille » (`crossPromotion.eligible: false`) ; un choix contraire
  dans `platform.json` fait échouer les tests, donc la publication.
