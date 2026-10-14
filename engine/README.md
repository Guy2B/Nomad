# engine/

Le moteur commun des six boutiques, exécuté par `backend/` (api.algbr.eu) :
- `functions/` : les points d'entrée de l'API (checkout, webhook Stripe, admin, suivi, avis, OFF., Radar, synchronisation CJ).
- `lib/` : la logique partagée (catalogue et prix, Stripe, CJ, CRM, commandes, pages OFF., audit de stock, Radar).

Toute modification ici concerne les six boutiques : lancer `npm test`, puis `npm run deploy:api`.
