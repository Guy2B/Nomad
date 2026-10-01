# Checklist légale avant la première vente (Allemagne)

Ce n'est pas un conseil juridique : à valider avec un **Steuerberater** et, pour les textes, un service de textes juridiques (Händlerbund, IT-Recht Kanzlei, Trusted Shops…).

| # | Obligation | Pourquoi | Statut |
|---|---|---|---|
| 1 | **Gewerbeanmeldung** | Vente en ligne régulière = activité commerciale. | ☐ |
| 2 | **Kleinunternehmer (§ 19 UStG)** confirmé auprès du Finanzamt | Les factures Stripe portent la mention « keine Umsatzsteuer ». Le statut tombe au-delà de 25 000 € (année précédente) / 100 000 € (année en cours). | ☐ |
| 3 | **Ventes à distance UE et importations** | Les colis viennent de Chine : TVA à l'importation (IOSS de CJ via `CJ_IOSS_TYPE=3`, ou propre IOSS) et seuil UE de 10 000 € de ventes à distance vers d'autres pays. **Point à clarifier en priorité avec le Steuerberater.** Privilégier les entrepôts CJ dans l'UE quand ils existent. | ☐ |
| 4 | **LUCID (VerpackG)** | Obligatoire avant de vendre des produits emballés à des particuliers en Allemagne, et adhésion à un système dual (licence d'emballage). Valable aussi en dropshipping. | ☐ |
| 5 | **GPSR (règlement UE 2023/988)** | Pour chaque produit : opérateur économique responsable **dans l'UE**, informations de sécurité, coordonnées du fabricant sur la fiche. À obtenir de CJ / du fabricant. | ☐ |
| 6 | **Steam Mini (appareil électrique)** | Marquage CE, déclaration de conformité, prise UE, et **enregistrement ElektroG (stiftung ear / WEEE)** avant toute vente. Le produit est **désactivé** (`"active": false`) tant que ce n'est pas fait. | ☐ |
| 7 | **Impressum, Datenschutz, AGB, Widerruf** | Pages générées avec vos coordonnées (`stores/<id>/site.json`). Les modèles sont une base : à faire relire. Compléter l'adresse de retour dans la page Widerruf. | ☐ |
| 8 | **Bouton de commande** | Stripe affiche « Payer » ; vérifier que la mention « zahlungspflichtig bestellen » est respectée (Stripe Checkout en allemand l'affiche). | ☐ |
| 9 | **Photos produit** | Photos issues des fiches CJ : CJ autorise leur usage par ses dropshippers, mais vérifier les droits et remplacer par vos propres photos après réception des échantillons. | ☐ |
| 10 | **Prix barrés** | Un prix barré doit correspondre à un prix réellement pratiqué (règle des 30 jours, PAngV § 11). À défaut, retirer `compare` du catalogue. | ☐ |
| 11 | **Retours** | 14 jours de droit de rétractation (légal). Prévoir une adresse de retour en UE ou une politique de remboursement sans retour pour les petits montants. | ☐ |
