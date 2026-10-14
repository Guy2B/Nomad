# backend/

Le serveur **api.algbr.eu** : Cloudflare Worker `api-algbr` (`wrangler.toml`), base D1 `algbr-crm`,
synchronisation CJ toutes les heures. Il sert l'API (`engine/`) et le dashboard `/admin/` (`public/admin/`).

Publication automatique à chaque envoi sur GitHub (ou `npm run deploy:api` à la main). Les secrets (Stripe, CJ, mot de passe admin,
RADAR_KEY) se saisissent dans le tableau de bord Cloudflare, jamais ici.
