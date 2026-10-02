# Nomad — plateforme dropshipping multi-boutiques « zéro action » · by Al.G.B.r.

**Un seul backend, un seul dashboard, plusieurs marques.** Aujourd'hui :

| Boutique | Dossier | Site Netlify | Rôle |
|---|---|---|---|
| **NOMAD** (voyage) | `stores/nomad/` | `nomad-travel-store` (racine du dépôt) | boutique + **API commune + admin de toutes les boutiques** |
| **APPART RESET** (petits appartements) | `stores/appart-reset/` | `appart-reset` (Base directory = `sites/appart-reset`) | boutique statique, appelle l'API de Nomad |
| **BODY CARE** (bien-être bureau) | `stores/body-care/` | `body-care-store` (Base directory = `sites/body-care`) | boutique statique, appelle l'API de Nomad |

Ajouter une marque : copier un dossier `stores/<id>/` (site.json, products.json, assets/), l'ajouter dans `netlify/lib/catalog.mjs`, créer `sites/<id>/netlify.toml`, puis un site Netlify avec ce Base directory. Les commandes de toutes les marques arrivent dans le même CRM et le même admin (filtre par boutique), avec leur propre préfixe de commande (NM-…, AR-…).

Un produit peut être un **kit** (`components`) : à la commande, chaque élément part chez CJ avec sa quantité (ex. Laundry Reset = 1 séchoir + 1 sac + 4 crochets).

**SEO** : titres et descriptions Google par produit et par langue (`seo` dans products.json / site.json), données structurées Product/FAQ/HowTo, hreflang, canonical, sitemap, et un guide par boutique (`guides`). Le site reste en `noindex` tant que `"launched": true` n'est pas mis dans site.json (après les pages légales).

Le client commande → Stripe encaisse **et envoie la facture** → le CRM enregistre le client et la commande → la commande part **automatiquement chez CJdropshipping** avec l'adresse de livraison → CJ expédie et vous facture dans votre compte CJ → le numéro de suivi remonte tout seul. Vous recevez une notification sur le téléphone à chaque commande ; vous n'intervenez que si une commande est marquée **« Action requise »**.

```
Client ──► Boutique (Netlify) ──► Stripe Checkout ──► paiement + facture client (e-mail, PDF)
                                        │
                                        ▼ webhook
                          CRM (Netlify Blobs) : client + commande
                                        │
                                        ▼
                    CJdropshipping createOrderV2 (adresse, produits)
                    payé depuis votre solde CJ si CJ_AUTO_PAY=true
                    → facture fournisseur dans votre compte CJ
                                        │
                     toutes les heures : statut + numéro de suivi
                                        ▼
                  Page « Suivre ma commande » · Admin · notification ntfy
```

## Structure

| Dossier | Rôle |
|---|---|
| `stores/<id>/products.json` | **Le catalogue d'une marque** : prix, textes FR/DE/EN, SEO, photos, correspondance fournisseur CJ (produit simple ou kit). |
| `stores/<id>/site.json` | Marque, préfixe de commande, SEO, textes propres, guide, livraison, facture (§ 19 UStG), **vos coordonnées légales**. |
| `stores/<id>/assets/` | Photos, favicon, `theme.css` (couleurs de la marque). |
| `scripts/build.mjs <store>` | Génère une boutique dans `dist/` (3 langues, pages produit, panier, suivi, pages légales). |
| `netlify/functions/` | `checkout` (Stripe), `stripe-webhook` (CRM + commande CJ), `track` (suivi client), `admin`, `cj-sync` (toutes les heures). |
| `netlify/lib/` | Logique partagée (prix, Stripe, CJ, CRM, notifications). |
| `public/` | Style, script de la boutique, admin, photos produits. |
| `tests/` | `npm test` : prix, facture, signature Stripe, commande CJ, idempotence. |

## Mise en route (une seule fois)

### 1. Stripe — paiement et facture client
1. Compte Stripe activé (vérification d'identité, IBAN).
2. **Paramètres → Facturation → Factures** : nom, adresse, e-mail, et la mention *Kleinunternehmer* (déjà ajoutée automatiquement en pied de facture par la boutique).
3. **Paramètres → E-mails clients** : activer « Paiements réussis » et l'envoi des factures.
4. **Développeurs → Webhooks → Ajouter un endpoint** : `https://<votre-site>/api/stripe/webhook`, événements `checkout.session.completed` et `checkout.session.async_payment_succeeded`. Copier le **secret de signature** (`whsec_…`).
5. Copier la **clé secrète** (`sk_live_…`, ou `sk_test_…` pour tester).

### 2. CJdropshipping — commande fournisseur automatique
1. Compte CJ → **Paramètres → API** → générer la **clé API** (format `CJ…@api@…`).
2. Pour chaque produit : commander un **échantillon**, choisir la variante exacte, puis renseigner `cjVid` (ID de variante) dans `stores/<id>/products.json` (pour un kit : chaque élément de `components`). Le `cjSku` est déjà rempli et suffit en attendant.
3. Vérifier le mode de livraison (`logisticName`, par défaut « CJPacket Ordinary ») et privilégier un **entrepôt UE** quand il existe (`fromCountryCode`).
4. Approvisionner le **solde CJ**, puis mettre `CJ_AUTO_PAY=true` : les commandes fournisseur sont alors payées automatiquement. Sans cela, elles sont créées et il faut les payer à la main dans CJ (la boutique vous le signale).

### 3. Variables Netlify (Site → Configuration → Environment variables)
| Variable | Valeur |
|---|---|
| `STRIPE_SECRET_KEY` | clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `CJ_API_KEY` | clé API CJ |
| `CJ_AUTO_PAY` | `true` quand le solde CJ est approvisionné |
| `CJ_IOSS_TYPE` | `3` = IOSS de CJ (le client ne paie pas de TVA à l'import) — à valider, voir la checklist |
| `ADMIN_PASSWORD` | mot de passe de l'admin (12 caractères minimum) |
| `NTFY_TOPIC` | sujet ntfy pour les notifications (peut être le même que pour Σ ou un nouveau) |

**Ces valeurs sont des secrets : saisissez-les vous-même dans Netlify, jamais dans le code.**

### 4. Vos informations légales
Compléter `stores/<id>/site.json` → `company` (pour chaque marque) (nom, adresse, e-mail), puis `npm run build`. Les pages Impressum, Datenschutz, AGB, Widerruf et Versand sont générées à partir de là. **À faire relire** (voir `docs/LEGAL-CHECKLIST.md`).

## Au quotidien
- **Admin** : `https://<votre-site>/admin/` — chiffre d'affaires, marge estimée, clients, commandes, check-list de configuration, bouton « Renvoyer au fournisseur » ou « Traité à la main » sur les commandes en « Action requise ».
- **Notifications** : une notification par commande, prioritaire si une action est requise.
- **Factures** : clients → Stripe (Paiements / Factures) ; fournisseur → compte CJ (Commandes / Factures).

## Ajouter un produit
1. Ajouter l'entrée dans `stores/<id>/products.json` (copier un produit existant).
2. Déposer les photos dans `stores/<id>/assets/products/` puis `npm run images` (conversion WebP).
3. `npm test && npm run build`, puis pousser : Netlify republie.

## Développement
```bash
npm install
npm test          # tests du flux de commande
npm run build     # génère dist/
npx netlify dev   # boutique + fonctions en local
```
