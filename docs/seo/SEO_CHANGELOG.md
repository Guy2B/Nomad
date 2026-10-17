# SEO changelog

## 2026-10-17

Boutiques catalogue (`scripts/premium.mjs`, `scripts/build.mjs`) :
- Offer : `deliveryTime` (handlingTime 1–2 j + transitTime dérivé de `shipping.deliveryDays` ou du `deliveryDays` du produit), `seller` AlGBr.
- MerchantReturnPolicy : `returnFees: ReturnFeesCustomerResponsibility`, `returnPolicyCountry: DE`.
- Accueil : `OnlineStore` « <MARQUE> by AlGBr », description du territoire, `brand`, `parentOrganization` AlGBr.
- sitemap.xml : suppression des `lastmod` artificiels (date du build).
- Nouveau `/feed.xml` (Google Merchant Center, RSS 2.0).

OFF. (`shops/off/worker.mjs`, `shops/off/faq.mjs`, `shops/off/public/assets/off.css`) :
- hreflang `x-default`, `og:type`, `og:site_name`.
- Product : `seller`, `deliveryTime`, `hasMerchantReturnPolicy`, `size` (EU) ; BreadcrumbList.
- Accueil : `OnlineStore` OFF. by AlGBr (adresse, parentOrganization) + FAQ visible DE/FR/EN + `FAQPage`.
- `noindex` sur /danke et /bestellung.
- sitemap.xml : `lastmod` réel, hreflang.
- Alt des photos : marque, modèle, couleur, pointure.

algbr.eu (`index.html`, `sitemap.xml`) :
- `Organization` AlGBr avec les 7 marques, canonical, `og:url`, `og:image` absolue.
- Sitemap : retrait des pages noindex et des pages de redirection /fr/ /en/.

Inchangé volontairement : prix, stocks, références, design, tunnel de paiement, `noindex` de pré-lancement.
