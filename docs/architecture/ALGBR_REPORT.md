# Rapport de livraison · restructuration AlGBr (27 octobre 2026)

> **Mise à jour du 27.10.2026, 11 h 40 : bascules effectuées et vérifiées.**
> - **algbr.de** : zone transférée de Porkbun vers Cloudflare (serveurs de noms confirmés au registre DENIC), Digital Studio en
>   ligne et indexable, `www` et les sous-domaines boutiques (go, space, ease, glow, kin, off, next) redirigés en 301 avec le
>   chemin, messagerie contact@algbr.de inchangée (MX et transfert Porkbun).
> - **algbr.eu** : ALGEBRA en ligne (toujours en mode preview, Stripe test, e-mails Resend), `www.algbr.eu` et
>   `algebra.algbr.eu` redirigés en 301, anciennes pages du Studio redirigées vers leur équivalent sur algbr.de,
>   webhook Stripe déplacé sur `https://algbr.eu/api/stripe/webhook`, domaine retiré de GitHub Pages (dépôt `algbr`).
> - Variables de dépôt actives : `STUDIO_LIVE=true`, `ALGEBRA_ORIGIN=https://algbr.eu`. Retour arrière : `ALGBR_TARGET.md` §7.
> - Enregistrements GitHub Pages supprimés de la zone algbr.eu (pour un éventuel retour arrière) : `A` 185.199.108–111.153,
>   `AAAA` 2606:50c0:8000–8003::153, `www` CNAME guy2b.github.io.

Branche `restructure/algbr-ecosystem` du dépôt Nomad. **Rien n'a été déployé, aucun domaine, DNS, webhook,
prix, stock ou commande n'a été modifié.** Fusionner la branche publie seulement des changements sans effet de domaine
(voir §4) ; les bascules sont des actions séparées, réversibles, décrites dans `ALGBR_TARGET.md`.

## 1. Correspondance avec les livrables demandés

| # | Livrable | Où |
|---|---|---|
| 1 | Audit de l'architecture actuelle | `docs/architecture/ALGBR_AUDIT.md` |
| 2 | Diagramme de la nouvelle architecture | `ALGBR_TARGET.md` §1 (Mermaid + version texte) |
| 3 | Fichiers créés et modifiés | §2 ci-dessous |
| 4 | Nouvelle structure des marques | `shared/brands.json`, `shared/software.json`, `shared/registry.mjs`, `ALGBR_TARGET.md` §4 |
| 5 | Digital Studio fonctionnel localement | `sites/digital-studio/` (`npm run build:studio`, `cd sites/digital-studio && npx wrangler dev`) |
| 6 | ALGEBRA préparée pour algbr.eu | `algebra/worker/wrangler.toml` `[env.apex]`, `algebra/worker/src/legacy.js`, variable `ALGEBRA_ORIGIN` |
| 7 | Portfolio et logiciels intégrés | pages Brands (une fiche par marque) et Software, alimentées par les registres |
| 8 | Harmonisation des configurations | registre ↔ `site.json` ↔ config ALGEBRA ↔ OFF. contrôlés par tests ; liens d'organisation ; filtres CI ; documentation corrigée |
| 9 | Tests exécutés et résultats | §3 |
| 10 | Procédure de déploiement Cloudflare | `ALGBR_TARGET.md` §5, `sites/digital-studio/README.md`, workflow |
| 11 | Plan de migration DNS | `ALGBR_TARGET.md` §6 |
| 12 | Procédure de rollback | `ALGBR_TARGET.md` §7 |
| 13 | Points à valider manuellement | §5 ci-dessous |

## 2. Fichiers

Créés :
- `docs/architecture/ALGBR_AUDIT.md`, `ALGBR_TARGET.md`, `ALGBR_REPORT.md`
- `shared/brands.json`, `shared/software.json`, `shared/registry.mjs`, `tests/registry.test.mjs`
- `sites/digital-studio/` : `build.mjs`, `content/{copy,work,legal}.mjs`, `assets/` (CSS, JS, police OFL, images reprises
  du site actuel du studio), `worker/index.mjs`, `wrangler.toml`, `tests/studio.test.mjs`, `README.md`
- `algebra/worker/src/legacy.js`, `algebra/tests/legacy.test.mjs`

Modifiés :
- `.github/workflows/deploy-cloudflare.yml` : job `studio`, interrupteurs `ALGEBRA_ORIGIN` / `STUDIO_LIVE`, filtre API resserré
- `engine/lib/orders.mjs`, `tests/flow.test.mjs` : le webhook des boutiques ignore les sessions ALGEBRA (audit S1)
- `algebra/worker/src/index.js` : `metadata.store = 'algebra'` sur les sessions Stripe, redirections héritées (inactives par défaut)
- `algebra/worker/wrangler.toml` : environnement `apex` ajouté, environnement par défaut inchangé
- `algebra/scripts/build.mjs` : pastilles de couleur en classes (la CSP les supprimait, constaté en navigateur)
- `shops/{go,space,ease,glow,kin,joy}/site.json` (`byAlgbr`), `scripts/premium.mjs`, `shops/off/worker.mjs` : organisation → algbr.de
- `package.json` : scripts `build:studio`, `test:studio`, `test:all`, `deploy:studio` ; `npm test` inclut le registre
- Documentation : `README.md`, `shared/README.md`, `shared/platform.json` (`note`), `scripts/build.mjs` (en-tête),
  `algebra/README.md`, `algebra/.env.example`, `algebra/ALGEBRA_LAUNCH_REPORT.md`

Contenu de l'ancien Studio repris (27.10.2026, après relecture) : 6 pages de services, 8 pages de secteurs, FAQ de l'accueil et briefing guidé en 4 étapes (mêmes questions que l'ancien « Projektarchitekt »), texte allemand d'origine, traductions EN et FR. Les anciennes URL redirigent vers leur page équivalente.

Aucun fichier supprimé ou déplacé dans l'existant. Aucun prix, catalogue, produit, stock, schéma D1 ni identifiant
historique modifié.

## 3. Tests et vérifications exécutés

| Vérification | Résultat |
|---|---|
| `npm test` (moteur, OFF., Radar, après-vente, trafic, flux + garde webhook, registre) | 57 / 57 |
| `npm run test:studio` (pages, liens internes, canonical/hreflang/x-default, sitemap, en-têtes, absence de style/script en ligne, règles d'honnêteté, Worker de contact) | 26 / 26 |
| `cd algebra && npm test` (catalogue, prix, webhook, état des commandes, fournisseur, marque, redirections héritées, environnement apex) | 52 / 52 |
| QA navigateur ALGEBRA (`npm run qa`, 7 largeurs, panier, checkout simulé, suivi, consentement, SEO, a11y, 404) | 36 / 36 |
| Builds : GO, SPACE, EASE, GLOW, KIN, JOY, backend, ALGEBRA (origine actuelle et algbr.eu), Studio (public et preview) | OK |
| Différence de build avec `main` (GO, GLOW, JOY) | seules les URL d'organisation changent ; sortie du backend identique |
| `wrangler deploy --dry-run` : ALGEBRA défaut et `--env apex`, Studio défaut et `--env live` | OK (liaisons et variables attendues) |
| axe-core (WCAG 2.2 AA + bonnes pratiques) sur 9 pages du Studio, 1280 px et 390 px | 0 violation après corrections (contraste des statuts, ordre des titres) ; aucun débordement horizontal |
| Simulation de paiement | uniquement en mode test et simulé ; aucune transaction réelle |

Non vérifiable depuis cet environnement : état réel du DNS et des hébergeurs, Stripe et Resend en conditions réelles,
Core Web Vitals en production (le Studio pèse environ 830 Ko au total pour 53 pages, sans script tiers).

## 4. Ce que provoque la fusion dans `main`

- Republication automatique de l'API, de GLOW, KIN, JOY et OFF. (fichiers `site.json`, `scripts/`, worker OFF. modifiés) :
  seul changement visible, les liens « by AlGBr » et le JSON-LD d'organisation vers `https://algbr.de/`.
  **Condition : algbr.de doit répondre** (redirection actuelle ou Studio). À vérifier avant la fusion ; sinon, retirer
  le commit `shops: "by AlGBr" …` et le rejouer après la bascule.
- Republication d'ALGEBRA sur algebra.algbr.eu (même domaine, pastilles corrigées, métadonnées Stripe enrichies).
- Première publication du Worker `algbr-studio` sur `*.workers.dev`, en `noindex`.
- GO, SPACE, EASE (Cloudflare Pages) se reconstruisent comme à chaque push.

## 5. Points à valider manuellement

Bloquants avant les bascules :
1. **DNS** (état relevé le 27.10.2026 dans `ALGBR_TARGET.md` §6) : algbr.eu est chez Cloudflare et pointe vers GitHub Pages ;
   algbr.de est chez Porkbun et doit passer chez Cloudflare (étape 1). Exporter les deux zones et les transferts Porkbun
   avant de changer quoi que ce soit ; conserver MX, SPF, DKIM, DMARC.
2. **Datenschutz du Studio** : sections 2 (hébergement Cloudflare) et 4 (formulaire, Resend, Turnstile) à faire relire.
3. **Stripe** : liste des endpoints webhook ; à la bascule d'ALGEBRA, nouvel endpoint `https://algbr.eu/api/stripe/webhook`
   et son secret.
4. **Secrets du Worker `algbr-studio`** : `RESEND_API_KEY` (et `TURNSTILE_SECRET` + variable `STUDIO_TURNSTILE_SITEKEY` si
   Turnstile est souhaité).
5. **Cloudflare Pages GO/SPACE/EASE** : régler les « Build watch paths » (`ALGBR_TARGET.md` §5).

À confirmer :
6. Textes du Studio (DE/EN/FR), en particulier la page About (nom du fondateur, aucune biographie ajoutée).
7. Prix indicatifs « ab 690 € / 1.490 € / 2.490 € » repris du site actuel : toujours valables ?
8. Lune Beauty présenté comme projet client sans chiffres : les statistiques de l'ancien site (« 10+ Anfragen »,
   « 60 % ») ne sont reprises qu'avec une confirmation écrite.
9. nΣxt LifeOS : plateformes affichées Web (PWA), Android, iOS ; accès « essai gratuit » repris de `platform.json`.
   Disponibilité réelle dans les stores à confirmer. Le logo « Sigma Life OS » n'a pas été repris (ancien nom).
10. Impressum : ajout de la mention « Marke Algebra » à la liste des offres d'AlGBr.
11. Redirections `.de` : GLOW et KIN redirigent bien (Porkbun) ; joy.algbr.de n'a pas de redirection.
12. Pages ALGEBRA « Collections », « Essentials », « The House », « Journal » : non créées. Les collections existent sous
    d'autres noms (shop, men, women, polos, t-shirts, sweaters, knitwear, graphic-series) ; un Journal demande du contenu
    éditorial réel : à fournir avant toute création.
13. Protection des interfaces admin : Cloudflare Access recommandé (audit S2).
14. Lien « by AlGBr » de nΣxt dans le dépôt `sum-plus` (pointe encore vers algbr.eu).
15. Poids du dépôt (masters ALGEBRA, 124 Mo) : Git LFS ou stockage externe à décider.
