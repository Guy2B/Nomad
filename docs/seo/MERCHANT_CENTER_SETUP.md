# Google Merchant Center : mise en place

Prérequis : boutiques en live (Stripe live, `noindex` levé), pages légales accessibles (Impressum, AGB, Widerruf, Versand, Datenschutz : déjà en place sur chaque boutique).

## Flux disponibles (générés automatiquement)

| Boutique | Flux | Mise à jour |
|---|---|---|
| GO | https://go.algbr.eu/feed.xml | à chaque déploiement |
| SPACE | https://space.algbr.eu/feed.xml | à chaque déploiement |
| EASE | https://ease.algbr.eu/feed.xml | à chaque déploiement |
| GLOW | https://glow.algbr.eu/feed.xml | à chaque déploiement |
| KIN | https://kin.algbr.eu/feed.xml | à chaque déploiement |
| JOY | https://joy.algbr.eu/feed.xml | à chaque déploiement |
| OFF. | https://off.algbr.eu/feed.xml | en direct (cache 5 min) : une paire vendue disparaît du flux |

Contenu : id (SKU ; OFF : référence + pointure), titre et description de la page, lien canonique /de/, images, prix = prix de la page, disponibilité, état, marque, livraison par pays et délais.
- Boutiques catalogue : marque = la marque AlGBr (GO, KIN…), `identifier_exists = no` (pas de GTIN : produits de marque propre, jamais inventé).
- OFF. : marque réelle (Timberland), `mpn` = référence fabricant, `gtin` = EAN réel quand il est saisi, `size` + `size_system EU`, `color`, `condition`.

## Étapes

1. merchants.google.com → créer le compte au nom de AlGBr (Guy Beaho), pays Allemagne, devise EUR.
2. **Site web** : revendiquer `algbr.eu` (validation via Search Console, même compte Google). Vérifier que Merchant Center accepte les liens produits des sous-domaines. S'il les refuse, créer un compte multi-clients (MCA) avec un sous-compte par boutique et revendiquer chaque sous-domaine.
3. **Livraison** : paramétrer « gratuit, 6–10 jours ouvrés » (boutiques Chine) ; JOY « gratuit, 5–7 jours, DE » ; OFF « 5,79 €, Hermes, 2–4 jours, DE ». Les délais du flux et des données structurées s'alignent dessus.
4. **Retours** : 14 jours, frais de retour à la charge du client, retour par courrier.
5. **Produits → Sources de données → Ajouter → Fichier sur un site web** : coller l'URL `feed.xml`, récupération quotidienne (OFF : toutes les heures si l'option est proposée).
6. Activer les **fiches gratuites** (free listings). Pas de campagne payante nécessaire.

## Points de vigilance

- Prix flux = prix page = prix Stripe : tous viennent de `products.json` (catalogue) ou de D1 (OFF).
- OFF : une paire unique vendue doit disparaître vite. Le flux est en direct, mais Merchant Center ne le relit qu'à sa fréquence de récupération. Pour les paires très demandées, utiliser « Mettre à jour maintenant » après une vente.
- Ne jamais ajouter de prix barré qui n'est pas un vrai prix précédent. L'UVP d'OFF n'est affichée que si elle est saisie.
- JOY : ne pas soumettre le flux avant le lancement (GPSR en attente).
