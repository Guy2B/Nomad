# algbr.de · Al.G.B.r. Digital Studio + écosystème AlGBr

Site officiel du studio et vitrine de l'écosystème : Studio, Services, Brands (une fiche par marque), Software,
Work, About, Contact, Impressum, Datenschutz. DE (référence), EN, FR.

| Fichier | Rôle |
|---|---|
| `build.mjs` | Génère `dist/` (sans dépendance). Vérifie d'abord le registre : un registre incohérent bloque le build. |
| `content/copy.mjs` | Textes de l'interface et des pages. |
| `content/work.mjs` | Études de cas. Chaque résultat cite sa preuve (`evidence`, jamais affichée). |
| `content/legal.mjs` | Impressum (repris tel quel) et Datenschutz (sections hébergement et formulaire adaptées, **à faire relire**). |
| `assets/` | CSS, JS, police Schibsted Grotesk (OFL, auto-hébergée), images reprises du site actuel. |
| `worker/index.mjs` | Redirection de `/` selon la langue du navigateur, `POST /api/contact` (validation, pot de miel, délai minimal, Turnstile facultatif, envoi Resend). |
| `wrangler.toml` | Worker `algbr-studio` : prévisualisation `*.workers.dev` par défaut, domaine `algbr.de` avec `--env live`. |
| `tests/studio.test.mjs` | Pages, liens, SEO, en-têtes, règles d'honnêteté, Worker de contact. |

Les marques et logiciels viennent de `shared/brands.json` et `shared/software.json` : pour modifier une fiche, modifier
le registre (l'accroche d'une boutique se modifie dans son `site.json`).

## Local

```bash
node sites/digital-studio/build.mjs          # → sites/digital-studio/dist
npm run test:studio                          # tests du Studio + registre
cd sites/digital-studio && npx wrangler dev  # site + Worker sur http://localhost:8787
```

Variables de build : `STUDIO_ORIGIN` (défaut `https://algbr.de`), `STUDIO_NOINDEX=1` (prévisualisation),
`STUDIO_TURNSTILE_SITEKEY` (facultatif). Secrets du Worker : `RESEND_API_KEY`, `TURNSTILE_SECRET` (facultatif).
Sans `RESEND_API_KEY`, le formulaire propose l'envoi par la messagerie du visiteur (lien `mailto:` prérempli).

## Publication

Job `studio` de `.github/workflows/deploy-cloudflare.yml`. Sans la variable de dépôt `STUDIO_LIVE`, publication en
prévisualisation `noindex` sur `algbr-studio.<compte>.workers.dev`. Mise en ligne sur algbr.de :
`docs/architecture/ALGBR_TARGET.md` §6.
