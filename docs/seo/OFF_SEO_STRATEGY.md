# OFF. by AlGBr : stratégie SEO

Positionnement à faire comprendre : OFF. by AlGBr vend des chaussures de marque authentiques issues d'offres outlet, depuis son propre stock en Allemagne, en très petites quantités, généralement sous l'UVP quand elle est connue, avec un service de Private Sourcing. OFF. n'est ni revendeur ni outlet officiel d'une marque.

## Ce qui est en place

- URL produit = marque + modèle + couleur + référence + pointure (`/de/p/timberland-cedar-bay-essential-boat-shoe-medium-brown-full-grain-tb0a2r35eiu-eu45`) : stable, lisible, une URL par paire. À conserver.
- Title : « Timberland Cedar Bay Essential Boat Shoe · Medium Brown Full Grain EU 45 | OFF. », description avec pointure, prix, origine Allemagne.
- Product : brand Timberland, mpn = référence fabricant, gtin = EAN réel, couleur, taille EU, 5 photos, état, prix, disponibilité (InStock / SoldOut), livraison 2–4 jours, retours 14 jours, vendeur AlGBr, fil d'Ariane.
- Flux Merchant Center en direct, paires disponibles uniquement.
- Paire vendue : la page reste en ligne (SoldOut), le bouton devient « faire rechercher », la paire passe dans l'Archive de l'accueil.
- FAQ factuelle (DE/FR/EN) pour les moteurs IA.

## Mots-clés par intention (à valider dans Search Console après lancement)

| Intention | Exemples | Page cible |
|---|---|---|
| Référence exacte | TB0A2R35EIU, TB0A2R35EP1, TB0A2R35EM8 | fiche produit (référence dans l'URL, le schéma, l'en-tête de la fiche) |
| Modèle + pointure | Timberland Cedar Bay 45, Cedar Bay EU 45 | fiche produit |
| Marque + réduction | Timberland reduziert, Timberland unter UVP, chaussures Timberland soldées | accueil (puis page marque quand le stock le justifie) |
| Générique outlet | Markenschuhe unter UVP, Outlet Schuhe Deutschland | accueil |
| Recherche introuvable | Schuhe in Größe 45 finden, bestimmtes Modell finden | Private Sourcing (page dédiée à créer) |

## Politique d'indexation des paires vendues

- Garder la page en ligne en SoldOut tant qu'elle a des impressions ou des clics (Search Console, filtre par URL).
- Après 90 jours sans impression : passer la page en noindex, la garder accessible depuis l'Archive.
- Ne jamais renvoyer une page vendue en 404 si elle reçoit encore du trafic.
(Décision à prendre avec les données ; aucune règle automatique n'est codée pour l'instant.)

## Prochaines étapes (par ordre)

1. Lancement : `LAUNCHED=true`, sitemap dans Search Console, flux dans Merchant Center.
2. Photos : pour chaque paire, profil gauche/droit, dessus, semelle, étiquette avec la référence, boîte. Ce sont les photos de la paire vendue (Google Images / Lens).
3. Page **Private Sourcing** dédiée `/de/private-sourcing` (et fr/en) : fonctionnement, marques, délai de réponse (24–48 h), sans engagement, aucune garantie de trouver.
4. Page **Authentizität** : décrire uniquement le contrôle réellement fait (source outlet, contrôle de la référence et de l'EAN, inspection de la paire, photos réelles).
5. Page **marque** `/de/timberland` quand il y a au moins 6 à 8 paires (disponibles et archivées) : sinon page trop pauvre.
6. Dimensions des images (`width`/`height`) dans le rendu pour éviter les décalages de mise en page.

## À ne pas faire

- « Official Timberland Outlet », logo Timberland comme logo du site, `brand: OFF.` sur un produit Timberland.
- GTIN inventé, UVP non vérifiable, réduction calculée sur un prix de référence inventé.
- Pages de catégories vides ou une page par pointure.
