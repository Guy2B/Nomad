/**
 * Algebra launch catalogue. Single source of truth for the site build, the checkout (server-side price check)
 * and the supplier adapter.
 *
 * Status vocabulary (see docs/LAUNCH_CHECKLIST.md):
 *   PREVIEW                    real blank + published supplier price, sample not yet approved, imagery = MOCKUP
 *   NEEDS_SUPPLIER_APPROVAL    blank or decoration not on the supplier's public price list: not purchasable
 * Prices are HYPOTHESES within the brief's ranges (section 11). They are not applied automatically elsewhere:
 * change them here, rerun `npm run economics`, read docs/ECONOMICS.md.
 * Supplier facts carry a `source`; anything not published is the string 'TO VERIFY'.
 */

export const TV = 'TO VERIFY';

export const colors = {
  ivory: { tone: 'light', hex: '#EDE8DD', ink: 'navy', name: { de: 'Ivory', en: 'Ivory', fr: 'Ivoire' }, supplierColor: TV },
  'deep-navy': { tone: 'dark', hex: '#1A2236', ink: 'ivory', name: { de: 'Deep Navy', en: 'Deep Navy', fr: 'Marine profond' }, supplierColor: TV },
  black: { tone: 'dark', hex: '#161616', ink: 'ivory', name: { de: 'Schwarz', en: 'Black', fr: 'Noir' }, supplierColor: TV },
  sage: { tone: 'light', hex: '#8F9B86', ink: 'navy', name: { de: 'Salbei', en: 'Sage', fr: 'Sauge' }, supplierColor: TV },
  taupe: { tone: 'light', hex: '#A6978A', ink: 'navy', name: { de: 'Taupe', en: 'Taupe', fr: 'Taupe' }, supplierColor: TV },
  burgundy: { tone: 'dark', hex: '#5E1F2C', ink: 'ivory', name: { de: 'Burgund', en: 'Burgundy', fr: 'Bordeaux' }, supplierColor: TV },
};

const A61 = 'https://www.a61partner.de/de/dropshipping-preise.html (read 22.10.2026)';

/** Supplier blanks with the A61 published prices (first figure gross incl. 19 % VAT, second net; see docs/SUPPLIERS.md). */
export const blanks = {
  prepster: {
    label: 'Stanley/Stella PREPSTER 2.0 Unisex Heavy Poloshirt STPU222',
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 240,
    source: A61,
    a61: { embroidery: { id: 8757, gross: 20.3, net: 17.06 }, print1: { id: 8758, gross: 23.1, net: 19.41 }, print2: { id: 8758, gross: 27.8, net: 23.36 } },
  },
  sparker: {
    label: 'Stanley/Stella SPARKER 2.0 Unisex Heavy T-Shirt STTU171',
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 220,
    source: A61,
    a61: { embroidery: { id: 8614, gross: 23.9, net: 20.08 }, print1: { id: 8540, gross: 16.35, net: 13.74 }, print2: { id: 8540, gross: 21.15, net: 17.77 } },
  },
  muser: {
    label: 'Stella MUSER Women T-Shirt STTW172',
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 180,
    source: A61,
    a61: { embroidery: { id: 8982, gross: 22.4, net: 18.82 }, print1: { id: 8723, gross: 11.4, net: 9.58 }, print2: { id: 8723, gross: 16.2, net: 13.61 } },
  },
  changer: {
    label: 'Stanley/Stella CHANGER 2.0 Unisex Sweatshirt STSU178',
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 350,
    source: A61,
    a61: { embroidery: { id: 7867, gross: 30.85, net: 25.92 }, print1: { id: 7727, gross: 27.3, net: 22.94 }, print2: { id: 7727, gross: 32.1, net: 26.97 } },
  },
  blaster: {
    label: 'Stanley/Stella BLASTER 2.0 Oversized T-Shirt STTU959',
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 200,
    source: A61 + ' (re-read 23.10.2026)',
    a61: { embroidery: { id: 8897, gross: 19.8, net: 16.64 }, print1: { id: 8896, gross: 12.3, net: 10.34 }, print2: { id: 8896, gross: 17.1, net: 14.37 } },
  },
  asher: {
    // heavier "premium" option for a later capsule; not used by a product yet
    label: 'Stanley/Stella ASHER Heavyweight Boxy T-Shirt STTU078',
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 280,
    source: A61 + ' (re-read 23.10.2026)',
    a61: { embroidery: { id: 9071, gross: 25.1, net: 21.09 }, print1: { id: 9030, gross: 18.7, net: 15.71 }, print2: { id: 9030, gross: 23.5, net: 19.75 } },
  },
  alma: {
    label: 'Stella ALMA Women Sweatshirt STSW212',
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 300,
    source: A61,
    // Embroidery is NOT on the public list for ALMA (print only) → NEEDS SUPPLIER APPROVAL.
    a61: { embroidery: null, print1: { id: 8868, gross: 19.9, net: 16.72 }, print2: { id: 8868, gross: 24.7, net: 20.76 } },
  },
  elliser: {
    label: 'Stanley/Stella ELLISER women polo (exists at Stanley/Stella, not on the A61 list)',
    composition: { de: TV, en: TV, fr: TV },
    gsm: TV,
    source: 'Not listed by A61 (22.10.2026)',
    a61: { embroidery: null, print1: null, print2: null },
  },
};

const careEssential = {
  de: 'Pflegehinweise laut Etikett im Kleidungsstück. Empfehlung für Stickerei: auf links waschen, nicht direkt über die Stickerei bügeln.',
  en: 'Follow the care label inside the garment. For embroidery we recommend washing inside out and not ironing directly over the stitching.',
  fr: "Suivez l'étiquette d'entretien du vêtement. Pour la broderie, nous conseillons un lavage sur l'envers et de ne pas repasser directement dessus.",
};
const careGraphic = {
  de: 'Pflegehinweise laut Etikett. Empfehlung für den Druck: auf links waschen, nicht im Trockner, nicht über den Druck bügeln.',
  en: 'Follow the care label. For the print we recommend washing inside out, no tumble dry, no ironing over the print.',
  fr: "Suivez l'étiquette. Pour l'impression : lavage sur l'envers, pas de sèche-linge, pas de repassage sur le motif.",
};

const sizesMen = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const sizesWomen = ['XS', 'S', 'M', 'L', 'XL'];

export const products = [
  // ---------------------------------------------------------------- ESSENTIALS · MEN
  {
    id: 'ALG-M-POLO',
    slug: 'the-polo-men',
    line: 'essentials',
    gender: 'men',
    category: 'polos',
    name: { de: 'The Polo', en: 'The Polo', fr: 'The Polo' },
    price: 89,
    status: 'PREVIEW',
    blank: 'prepster',
    decoration: { method: 'embroidery', option: 'embroidery', placement: 'left chest, 18 mm', file: 'brand/symbol-embroidery.svg' },
    colors: ['deep-navy'], // photo available in navy only (owner's moodboard); more colours with new photos
    sizes: sizesMen,
    copy: {
      lead: {
        de: 'Schwerer Bio-Piqué, ruhiger Kragen, das Algebra-Symbol klein auf der Brust gestickt.',
        en: 'Heavy organic piqué, a calm collar, the Algebra symbol embroidered small on the chest.',
        fr: "Piqué bio épais, col sobre, le symbole Algebra brodé discrètement sur la poitrine.",
      },
      fit: {
        de: 'Gerader, entspannter Schnitt. Unisex-Größen, für Herren normal ausfallend. Zwischen zwei Größen: für einen klaren Sitz die kleinere, für einen lockeren die größere.',
        en: 'Straight, relaxed cut. Unisex sizing that fits men true to size. Between sizes: take the smaller for a clean line, the larger for an easy fit.',
        fr: "Coupe droite et décontractée. Taillant unisexe, normal pour un homme. Entre deux tailles : la plus petite pour une ligne nette, la plus grande pour plus d'aisance.",
      },
      fabric: {
        de: 'Schwerer Piqué aus Bio-Baumwolle, 240 g/m².',
        en: 'Heavy organic cotton piqué, 240 g/m².',
        fr: 'Piqué épais en coton bio, 240 g/m².',
      },
      detail: {
        de: 'Symbol gestickt, rund 18 mm, Ton in Ton oder im Kontrast je nach Farbe.',
        en: 'Embroidered symbol, about 18 mm, tonal or contrast depending on the colour.',
        fr: 'Symbole brodé, environ 18 mm, ton sur ton ou en contraste selon la couleur.',
      },
      design: {
        de: 'Ein A, dessen zweiter Balken zum Gleichheitszeichen wird. Proportion statt Logo-Fläche.',
        en: 'An A whose second bar becomes an equals sign. Proportion instead of a logo billboard.',
        fr: 'Un A dont la seconde barre devient un signe égal. La proportion plutôt qu’un logo envahissant.',
      },
    },
    care: careEssential,
  },
  {
    id: 'ALG-M-TEE',
    slug: 'the-heavy-tee',
    line: 'essentials',
    gender: 'men',
    category: 't-shirts',
    name: { de: 'The Heavy Tee', en: 'The Heavy Tee', fr: 'The Heavy Tee' },
    price: 59,
    status: 'PREVIEW',
    blank: 'sparker',
    decoration: { method: 'embroidery', option: 'embroidery', placement: 'left chest, 16 mm', file: 'brand/symbol-embroidery.svg' },
    colors: ['ivory', 'black', 'deep-navy'],
    sizes: sizesMen,
    copy: {
      lead: {
        de: 'Ein dichtes T-Shirt mit Stand. Gerippter Kragen, kleines gesticktes Symbol.',
        en: 'A dense tee with structure. Ribbed collar, small embroidered symbol.',
        fr: 'Un t-shirt dense qui se tient. Col côtelé, petit symbole brodé.',
      },
      fit: {
        de: 'Gerade, leicht weit. Unisex-Größen, für Herren normal ausfallend.',
        en: 'Straight, slightly roomy. Unisex sizing, true to size for men.',
        fr: 'Droit, légèrement ample. Taillant unisexe, normal pour un homme.',
      },
      fabric: {
        de: 'Jersey, 220 g/m².',
        en: 'Jersey, 220 g/m².',
        fr: 'Jersey, 220 g/m².',
      },
      detail: {
        de: 'Symbol gestickt, rund 16 mm, auf Brusthöhe.',
        en: 'Embroidered symbol, about 16 mm, at chest height.',
        fr: 'Symbole brodé, environ 16 mm, à hauteur de poitrine.',
      },
      design: {
        de: 'Kein Spruch, keine Fläche. Nur das Zeichen.',
        en: 'No slogan, no billboard. Just the mark.',
        fr: 'Pas de slogan, pas de surface. Seulement le signe.',
      },
    },
    care: careEssential,
  },
  {
    id: 'ALG-M-CREW',
    slug: 'the-crew-men',
    line: 'essentials',
    gender: 'unisex', // Changer 2.0 is a unisex sweatshirt
    category: 'sweaters',
    name: { de: 'The Crew', en: 'The Crew', fr: 'The Crew' },
    price: 109,
    status: 'PREVIEW',
    blank: 'changer',
    decoration: { method: 'embroidery', option: 'embroidery', placement: 'left chest, 20 mm, tone on tone', file: 'brand/symbol-embroidery.svg' },
    colors: ['ivory'], // photo available in ivory only; more colours with new photos
    sizes: sizesMen,
    copy: {
      lead: {
        de: 'Schweres Sweatshirt mit Rundhals. Das Symbol Ton in Ton gestickt.',
        en: 'A heavy crewneck sweatshirt. The symbol embroidered tone on tone.',
        fr: 'Sweat col rond épais. Le symbole brodé ton sur ton.',
      },
      fit: {
        de: 'Regulär, leicht kastig. Unisex-Größen, für Herren normal ausfallend.',
        en: 'Regular, slightly boxy. Unisex sizing, true to size for men.',
        fr: 'Coupe régulière, légèrement carrée. Taillant unisexe, normal pour un homme.',
      },
      fabric: {
        de: 'Sweat, 350 g/m², innen angeraut.',
        en: 'Sweat fabric, 350 g/m², brushed inside.',
        fr: 'Molleton, 350 g/m², gratté à l’intérieur.',
      },
      detail: {
        de: 'Ton-in-Ton-Stickerei, rund 20 mm. Rippbündchen an Kragen, Ärmeln und Saum.',
        en: 'Tonal embroidery, about 20 mm. Rib at collar, cuffs and hem.',
        fr: 'Broderie ton sur ton, environ 20 mm. Bord côte au col, aux poignets et à l’ourlet.',
      },
      design: {
        de: 'Fast unsichtbar, bis das Licht darauf fällt.',
        en: 'Almost invisible, until the light catches it.',
        fr: 'Presque invisible, jusqu’à ce que la lumière l’accroche.',
      },
    },
    care: careEssential,
  },
  // ---------------------------------------------------------------- ESSENTIALS · WOMEN
  {
    id: 'ALG-W-POLO',
    slug: 'the-polo-women',
    line: 'essentials',
    gender: 'women',
    category: 'polos',
    name: { de: 'The Polo', en: 'The Polo', fr: 'The Polo' },
    price: 89,
    status: 'NEEDS_SUPPLIER_APPROVAL',
    blank: 'elliser',
    decoration: { method: 'embroidery', option: 'embroidery', placement: 'left chest, 16 mm', file: 'brand/symbol-embroidery.svg' },
    colors: ['ivory', 'deep-navy', 'black'],
    sizes: sizesWomen,
    copy: {
      lead: {
        de: 'Der Polo im Damenschnitt. Kommt, sobald unser Produktionspartner den Schnitt bestätigt.',
        en: 'The polo in a women’s cut. Arrives as soon as our production partner confirms the cut.',
        fr: 'Le polo en coupe femme. Disponible dès que notre partenaire de production confirme la coupe.',
      },
      fit: { de: 'Taillierter Damenschnitt (wird bestätigt).', en: 'Shaped women’s cut (to be confirmed).', fr: 'Coupe femme cintrée (à confirmer).' },
      fabric: { de: 'Wird mit dem Muster veröffentlicht.', en: 'Published with the approved sample.', fr: 'Publié avec l’échantillon validé.' },
      detail: { de: 'Symbol gestickt, rund 16 mm.', en: 'Embroidered symbol, about 16 mm.', fr: 'Symbole brodé, environ 16 mm.' },
      design: {
        de: 'Gleiche Welt, eigener Schnitt. Wir nennen nichts Damenmodell, was nur verkleinert ist.',
        en: 'Same world, its own cut. We do not call something a women’s piece if it is only smaller.',
        fr: 'Même univers, coupe propre. Nous n’appelons pas « femme » un modèle simplement réduit.',
      },
    },
    care: careEssential,
  },
  {
    id: 'ALG-W-TEE',
    slug: 'the-premium-tee',
    line: 'essentials',
    gender: 'women',
    category: 't-shirts',
    name: { de: 'The Premium Tee', en: 'The Premium Tee', fr: 'The Premium Tee' },
    price: 55,
    status: 'PREVIEW',
    blank: 'muser',
    decoration: { method: 'embroidery', option: 'embroidery', placement: 'left chest, 14 mm', file: 'brand/symbol-embroidery.svg' },
    colors: ['ivory', 'black', 'deep-navy'],
    sizes: sizesWomen,
    copy: {
      lead: {
        de: 'Ein klares T-Shirt im Damenschnitt. Weich, nicht dünn. Kleines gesticktes Symbol.',
        en: 'A clean tee in a women’s cut. Soft, not thin. Small embroidered symbol.',
        fr: 'Un t-shirt net en coupe femme. Doux sans être fin. Petit symbole brodé.',
      },
      fit: {
        de: 'Damenschnitt, gerade mit leicht taillierter Linie. Normal ausfallend.',
        en: 'Women’s cut, straight with a slightly shaped line. True to size.',
        fr: 'Coupe femme, droite avec une ligne légèrement cintrée. Taille normalement.',
      },
      fabric: {
        de: 'Jersey, 180 g/m².',
        en: 'Jersey, 180 g/m².',
        fr: 'Jersey, 180 g/m².',
      },
      detail: { de: 'Symbol gestickt, rund 14 mm.', en: 'Embroidered symbol, about 14 mm.', fr: 'Symbole brodé, environ 14 mm.' },
      design: {
        de: 'Leise genug für das Büro, klar genug für alles danach.',
        en: 'Quiet enough for the office, clear enough for everything after.',
        fr: 'Assez discret pour le bureau, assez net pour tout le reste.',
      },
    },
    care: careEssential,
  },
  {
    id: 'ALG-W-CREW',
    slug: 'the-crew-women',
    line: 'essentials',
    gender: 'women',
    category: 'sweaters',
    name: { de: 'The Crew', en: 'The Crew', fr: 'The Crew' },
    price: 105,
    status: 'NEEDS_SUPPLIER_APPROVAL',
    blank: 'alma',
    decoration: { method: 'embroidery', option: 'embroidery', placement: 'left chest, 18 mm, tone on tone', file: 'brand/symbol-embroidery.svg' },
    colors: ['ivory', 'deep-navy', 'taupe'],
    sizes: sizesWomen,
    copy: {
      lead: {
        de: 'Das Sweatshirt im Damenschnitt, Ton-in-Ton-Symbol. Freigabe der Stickerei beim Partner ausstehend.',
        en: 'The crewneck in a women’s cut, tonal symbol. Embroidery approval pending with our partner.',
        fr: 'Le sweat en coupe femme, symbole ton sur ton. Validation de la broderie en attente chez notre partenaire.',
      },
      fit: { de: 'Damenschnitt, leicht verkürzt (wird bestätigt).', en: 'Women’s cut, slightly cropped (to be confirmed).', fr: 'Coupe femme, légèrement raccourcie (à confirmer).' },
      fabric: {
        de: 'Sweat, 300 g/m².',
        en: 'Sweat fabric, 300 g/m².',
        fr: 'Molleton, 300 g/m².',
      },
      detail: { de: 'Ton-in-Ton-Stickerei, rund 18 mm.', en: 'Tonal embroidery, about 18 mm.', fr: 'Broderie ton sur ton, environ 18 mm.' },
      design: {
        de: 'Fast unsichtbar, bis das Licht darauf fällt.',
        en: 'Almost invisible, until the light catches it.',
        fr: 'Presque invisible, jusqu’à ce que la lumière l’accroche.',
      },
    },
    care: careEssential,
  },
  // ---------------------------------------------------------------- GRAPHIC SERIES · CAPSULE 01 "PHYSICS IN INK"
  // Direction from the owner's reference boards (22.10.2026). Artwork: scripts/physics.mjs. Equations checked in docs/GRAPHIC_SERIES.md.
  ...[
    {
      key: 'navier-stokes',
      id: 'ALG-G-01-NAVIERSTOKES',
      name: 'Navier–Stokes 01',
      field: { de: 'Strömungsmechanik', en: 'Fluid dynamics', fr: 'Mécanique des fluides' },
      colors: ['ivory', 'black', 'deep-navy'],
      symbol: {
        glyph: '≈',
        de: 'Die Navier-Stokes-Gleichungen beschreiben, wie sich zähe Flüssigkeiten und Gase bewegen: Wasser, Luft, Rauch. Ob ihre Lösungen in drei Dimensionen immer glatt bleiben, ist bis heute unbewiesen und eines der Millennium-Probleme des Clay Institute.',
        en: 'The Navier–Stokes equations describe how viscous fluids move: water, air, smoke. Whether their solutions in three dimensions always stay smooth is still unproven, one of the Clay Institute’s Millennium Prize Problems.',
        fr: 'Les équations de Navier-Stokes décrivent le mouvement des fluides visqueux : l’eau, l’air, la fumée. Savoir si leurs solutions restent toujours régulières en trois dimensions n’est toujours pas démontré, c’est l’un des problèmes du millénaire du Clay Institute.',
      },
      equation: '∂u/∂t + (u·∇)u = −∇p/ρ + ν∇²u',
    },
    {
      key: 'black-hole',
      id: 'ALG-G-02-BLACKHOLE',
      name: 'Black Hole 02',
      field: { de: 'Gravitation', en: 'Gravitation', fr: 'Gravitation' },
      colors: ['black', 'deep-navy', 'ivory'],
      symbol: {
        glyph: '○',
        de: 'Ein Schwarzes Loch ist ein Bereich, aus dem nicht einmal Licht entkommt. rₛ = 2GM/c² ist der Schwarzschild-Radius: Wird eine Masse M auf diesen Radius verdichtet, entsteht ein Schwarzes Loch.',
        en: 'A black hole is a region from which not even light escapes. rₛ = 2GM/c² is the Schwarzschild radius: compress a mass M within it and it becomes a black hole.',
        fr: 'Un trou noir est une région dont même la lumière ne peut s’échapper. rₛ = 2GM/c² est le rayon de Schwarzschild : une masse M comprimée sous ce rayon devient un trou noir.',
      },
      equation: 'rₛ = 2GM/c²',
    },
    {
      key: 'entanglement',
      id: 'ALG-G-03-ENTANGLEMENT',
      name: 'Entanglement 03',
      field: { de: 'Quantenphysik', en: 'Quantum physics', fr: 'Physique quantique' },
      colors: ['ivory', 'black', 'deep-navy'],
      symbol: {
        glyph: '∞',
        de: 'Zwei verschränkte Teilchen teilen sich einen gemeinsamen Zustand. Misst man das eine, kennt man das Ergebnis des anderen, egal wie weit es entfernt ist. Nachrichten lassen sich so nicht schneller als Licht senden.',
        en: 'Two entangled particles share one state. Measure one and you know the result for the other, however far away it is. It still cannot carry a message faster than light.',
        fr: 'Deux particules intriquées partagent un même état. Mesurer l’une donne le résultat de l’autre, quelle que soit la distance. Cela ne permet pas pour autant d’envoyer un message plus vite que la lumière.',
      },
      equation: '|ψ⟩ = (|00⟩ + |11⟩)/√2',
    },
    {
      key: 'curvature',
      id: 'ALG-G-04-CURVATURE',
      name: 'Curvature 04',
      field: { de: 'Allgemeine Relativitätstheorie', en: 'General relativity', fr: 'Relativité générale' },
      colors: ['deep-navy', 'black', 'ivory'],
      symbol: {
        glyph: 'Δ',
        de: 'Einsteins Feldgleichungen (1915) verbinden die Krümmung der Raumzeit mit Masse und Energie. Masse sagt dem Raum, wie er sich krümmt, und der gekrümmte Raum sagt der Masse, wie sie sich bewegt.',
        en: 'Einstein’s field equations (1915) link the curvature of spacetime to mass and energy. Mass tells space how to curve; curved space tells mass how to move.',
        fr: 'Les équations d’Einstein (1915) relient la courbure de l’espace-temps à la masse et à l’énergie. La masse dit à l’espace comment se courber, l’espace courbé dit à la masse comment se mouvoir.',
      },
      equation: 'R_μν − ½Rg_μν + Λg_μν = (8πG/c⁴)T_μν',
    },
    {
      key: 'epr-er',
      id: 'ALG-G-05-EPRER',
      name: 'EPR = ER 05',
      field: { de: 'Quantengravitation', en: 'Quantum gravity', fr: 'Gravité quantique' },
      colors: ['black', 'ivory', 'deep-navy'],
      symbol: {
        glyph: '⚭',
        de: 'Eine Vermutung von Maldacena und Susskind (2013): Verschränkte Teilchen (EPR, 1935) könnten durch eine Einstein-Rosen-Brücke (ER, 1935) verbunden sein, also durch ein Wurmloch. Eine Idee der theoretischen Physik, nicht bewiesen.',
        en: 'A conjecture by Maldacena and Susskind (2013): entangled particles (EPR, 1935) might be connected by an Einstein–Rosen bridge (ER, 1935), a wormhole. An idea in theoretical physics, not a proven fact.',
        fr: 'Une conjecture de Maldacena et Susskind (2013) : des particules intriquées (EPR, 1935) pourraient être reliées par un pont d’Einstein-Rosen (ER, 1935), un trou de ver. Une idée de physique théorique, pas un fait établi.',
      },
      equation: 'EPR = ER',
    },
    // ---- Capsule 02 "Pure Forms" (owner's boards, 22.10.2026 22:29–22:34). Chest: Algebra symbol.
    ...[
      ['euler', 'ALG-G-06-EULER', 'Euler 06', { de: 'Mathematik', en: 'Mathematics', fr: 'Mathématiques' }, ['black', 'deep-navy', 'ivory'], 'e', 'e^{iπ} + 1 = 0', {
        de: 'Eulers Identität verbindet fünf Grundzahlen der Mathematik in einer Zeile: e, i, π, 1 und 0. Sie folgt aus der Formel e^{iθ} = cos θ + i sin θ für θ = π.',
        en: 'Euler’s identity links five fundamental numbers in one line: e, i, π, 1 and 0. It follows from the formula e^{iθ} = cos θ + i sin θ with θ = π.',
        fr: 'L’identité d’Euler relie cinq nombres fondamentaux en une ligne : e, i, π, 1 et 0. Elle découle de la formule e^{iθ} = cos θ + i sin θ pour θ = π.',
      }],
      ['lorenz', 'ALG-G-07-LORENZ', 'Lorenz 07', { de: 'Chaostheorie', en: 'Chaos theory', fr: 'Théorie du chaos' }, ['black', 'deep-navy', 'ivory'], '∿', 'dx/dt = σ(y − x)', {
        de: 'Edward Lorenz’ vereinfachtes Wettermodell von 1963. Winzige Unterschiede am Anfang führen zu völlig anderen Bahnen: der Ursprung des Begriffs Schmetterlingseffekt.',
        en: 'Edward Lorenz’s simplified weather model from 1963. Tiny differences at the start lead to completely different paths: where the idea of the butterfly effect comes from.',
        fr: 'Le modèle météo simplifié d’Edward Lorenz, en 1963. D’infimes différences au départ mènent à des trajectoires totalement différentes : l’origine de l’« effet papillon ».',
      }],
      ['maxwell', 'ALG-G-08-MAXWELL', 'Maxwell 08', { de: 'Elektromagnetismus', en: 'Electromagnetism', fr: 'Électromagnétisme' }, ['black', 'deep-navy', 'ivory'], '∇', '∇×B = μ_{0}J + μ_{0}ε_{0} ∂E/∂t', {
        de: 'Vier Gleichungen von James Clerk Maxwell beschreiben elektrische und magnetische Felder. Aus ihnen folgen Wellen, die sich mit Lichtgeschwindigkeit ausbreiten: Licht selbst.',
        en: 'Four equations by James Clerk Maxwell describe electric and magnetic fields. They predict waves that travel at the speed of light: light itself.',
        fr: 'Quatre équations de James Clerk Maxwell décrivent les champs électriques et magnétiques. Elles prédisent des ondes qui voyagent à la vitesse de la lumière : la lumière elle-même.',
      }],
      ['mandelbrot', 'ALG-G-09-MANDELBROT', 'Mandelbrot 09', { de: 'Fraktale Geometrie', en: 'Fractal geometry', fr: 'Géométrie fractale' }, ['black', 'deep-navy', 'ivory'], '✳', 'z_{n+1} = z_{n}^{2} + c', {
        de: 'Alle Zahlen c, für die z → z² + c ab z = 0 beschränkt bleibt. Eine Regel aus einer Zeile, ein Rand mit unendlich vielen Details.',
        en: 'All numbers c for which z → z² + c, starting at z = 0, stays bounded. A one-line rule, an edge with endless detail.',
        fr: 'Tous les nombres c pour lesquels z → z² + c, en partant de z = 0, reste borné. Une règle d’une ligne, un bord aux détails infinis.',
      }],
      ['tesseract', 'ALG-G-10-TESSERACT', 'Tesseract 10', { de: 'Vierte Dimension', en: 'Fourth dimension', fr: 'Quatrième dimension' }, ['black', 'deep-navy', 'ivory'], '⧈', '16 · 32 · 24 · 8', {
        de: 'Der Würfel in vier Dimensionen. Was man sieht, ist sein Schatten im Raum: 16 Ecken, 32 Kanten, 24 Quadrate, 8 Würfel.',
        en: 'The cube in four dimensions. What you see is its shadow in space: 16 vertices, 32 edges, 24 squares, 8 cubes.',
        fr: 'Le cube en quatre dimensions. Ce que l’on voit est son ombre dans l’espace : 16 sommets, 32 arêtes, 24 carrés, 8 cubes.',
      }],
      ['higgs', 'ALG-G-11-HIGGS', 'Higgs Field 11', { de: 'Teilchenphysik', en: 'Particle physics', fr: 'Physique des particules' }, ['black', 'deep-navy', 'ivory'], 'φ', 'V(φ) = −μ^{2}|φ|^{2} + λ|φ|^{4}', {
        de: 'Das Higgs-Feld gibt Elementarteilchen ihre Masse. Sein Potenzial hat die Form eines Huts: Oben ist es instabil, das Feld kommt im Tal zur Ruhe. Das Higgs-Boson wurde 2012 am CERN nachgewiesen.',
        en: 'The Higgs field gives elementary particles their mass. Its potential is shaped like a hat: the top is unstable, the field settles in the valley. The Higgs boson was observed at CERN in 2012.',
        fr: 'Le champ de Higgs donne leur masse aux particules élémentaires. Son potentiel a la forme d’un chapeau : le sommet est instable, le champ se stabilise dans la vallée. Le boson de Higgs a été observé au CERN en 2012.',
      }],
      ['big-bang', 'ALG-G-12-BIGBANG', 'Big Bang 12', { de: 'Kosmologie', en: 'Cosmology', fr: 'Cosmologie' }, ['black', 'deep-navy', 'ivory'], '✶', 'H^{2} = 8πGρ/3 − kc^{2}/a^{2} + Λc^{2}/3', {
        de: 'Das Universum dehnt sich seit rund 13,8 Milliarden Jahren aus einem extrem heißen, dichten Zustand aus. Die Friedmann-Gleichung beschreibt, wie diese Ausdehnung von Materie, Krümmung und kosmologischer Konstante abhängt.',
        en: 'The universe has been expanding for about 13.8 billion years from an extremely hot, dense state. The Friedmann equation describes how that expansion depends on matter, curvature and the cosmological constant.',
        fr: 'L’Univers est en expansion depuis environ 13,8 milliards d’années, à partir d’un état extrêmement chaud et dense. L’équation de Friedmann décrit comment cette expansion dépend de la matière, de la courbure et de la constante cosmologique.',
      }],
    ].map(([key, id, name, field, colors, glyph, equation, text]) => ({ key, id, name, field, colors, equation, capsule: 'Capsule 02 · Pure Forms', symbol: { glyph, ...text } })),
  ].map((g) => ({
    id: g.id,
    slug: g.key,
    line: 'graphic',
    gender: 'unisex',
    category: 't-shirts',
    capsule: g.capsule || 'Capsule 01 · Physics in Ink',
    graphic: g.key,
    field: g.field,
    equation: g.equation,
    name: { de: g.name, en: g.name, fr: g.name },
    price: 69,
    status: 'PREVIEW',
    // Two cuts: unisex oversized (Blaster 2.0, confirmed on the A61 list 23.10.2026) or women's (Muser).
    // Price of a ~30 × 40 cm three-colour back print inside the "2-sided" price: asked to A61, TO VERIFY.
    cuts: [
      { id: 'unisex', blank: 'blaster', sizes: sizesMen, name: { de: 'Unisex Oversize', en: 'Unisex oversized', fr: 'Unisexe oversize' } },
      { id: 'women', blank: 'muser', sizes: sizesWomen, name: { de: 'Damenschnitt', en: 'Women’s cut', fr: 'Coupe femme' } },
    ],
    blank: 'blaster',
    decoration: {
      method: 'print',
      option: 'print2',
      placement: 'front: icon 70 × 70 mm, left chest · back: 300 × 400 mm',
      file: `capsule/${g.key}/front-<tone>.svg + capsule/${g.key}/back-<tone>.svg`,
      technique: TV,
    },
    colors: g.colors,
    sizes: sizesMen,
    symbol: g.symbol,
    copy: {
      lead: {
        de: `${g.name.replace(/ \d{2}$/, '')}: eine Zeichnung in Tusche auf dem Rücken, mit der echten Gleichung. Vorne ein kleines Zeichen.`,
        en: `${g.name.replace(/ \d{2}$/, '')}: an ink drawing on the back, with the real equation. A small sign on the chest.`,
        fr: `${g.name.replace(/ \d{2}$/, '')} : un dessin à l’encre au dos, avec la vraie équation. Un petit signe sur la poitrine.`,
      },
      fit: {
        de: 'Zwei Schnitte: Unisex Oversize (kastig, überschnittene Schultern) oder Damenschnitt.',
        en: 'Two cuts: unisex oversized (boxy, dropped shoulders) or women’s cut.',
        fr: 'Deux coupes : unisexe oversize (carré, épaules tombantes) ou coupe femme.',
      },
      fabric: {
        de: 'Unisex Oversize 200 g/m², Damen 180 g/m².',
        en: 'Unisex oversized 200 g/m², women 180 g/m².',
        fr: 'Unisexe oversize 200 g/m², femme 180 g/m².',
      },
      detail: {
        de: 'Rückendruck bis 30 × 40 cm, Zeichen auf der Brust 7 × 7 cm. Drei Tintenfarben, auf helle und dunkle Stoffe abgestimmt.',
        en: 'Back print up to 30 × 40 cm, chest sign 7 × 7 cm. Three ink colours, matched to light or dark fabric.',
        fr: 'Impression dos jusqu’à 30 × 40 cm, signe poitrine 7 × 7 cm. Trois couleurs d’encre, adaptées au tissu clair ou foncé.',
      },
      design: {
        de: 'Originalgrafik von Algebra: Tusche, Hilfslinien, Notizen von Hand. Physik als Zeichnung, nicht als Schulbuch.',
        en: 'Original Algebra artwork: ink, construction lines, handwritten notes. Physics as a drawing, not a textbook.',
        fr: 'Graphisme original Algebra : encre, lignes de construction, notes à la main. La physique comme un dessin, pas comme un manuel.',
      },
    },
    care: careGraphic,
  })),
];

/** Shipping policy (decision documented in docs/ECONOMICS.md). Delivery times stay TO VERIFY until A61 confirms. */
export const shipping = {
  countries: ['DE', 'FR', 'AT', 'BE', 'NL', 'LU'],
  zones: {
    DE: { fee: 4.9, freeFrom: 100, supplierCostNet: 5.8, deliveryDays: TV },
    EU: { fee: 7.9, freeFrom: 150, supplierCostNet: 8.32, deliveryDays: TV },
  },
  packagingNetPerShipment: 0.8,
};

export const zoneOf = (country) => (country === 'DE' ? 'DE' : 'EU');

/** Variant SKU: ALG-M-POLO-DNV-M. Supplier SKU stays TO VERIFY until A61 gives its variant IDs. */
export const colorCode = { ivory: 'IVO', 'deep-navy': 'DNV', black: 'BLK', sage: 'SAG', taupe: 'TAU', burgundy: 'BUR' };

export function variantsOf(p) {
  const cuts = p.cuts || [{ id: null, blank: p.blank, sizes: p.sizes }];
  const out = [];
  for (const cut of cuts) {
    for (const c of p.colors) {
      for (const s of cut.sizes) {
        const sku = [p.id, cut.id ? (cut.id === 'women' ? 'W' : 'U') : null, colorCode[c], s].filter(Boolean).join('-');
        const b = blanks[cut.blank];
        const option = b.a61[p.decoration.option];
        out.push({
          sku,
          productId: p.id,
          cut: cut.id,
          color: c,
          size: s,
          blank: cut.blank,
          supplier: 'a61',
          supplierArticleId: option ? option.id : TV,
          supplierVariantId: TV,
          decoration: p.decoration.method,
          printFile: p.line === 'graphic' ? { front: `capsule/${p.graphic}/front-${colors[c].tone}.svg`, back: `capsule/${p.graphic}/back-${colors[c].tone}.svg` } : null,
          embroideryFile: p.decoration.method === 'embroidery' ? 'brand/symbol-embroidery.svg (digitized DST: TO VERIFY)' : null,
          purchasable: p.status === 'PREVIEW',
        });
      }
    }
  }
  return out;
}

export const allVariants = () => products.flatMap(variantsOf);
export const productById = (id) => products.find((p) => p.id === id);
export const variantBySku = (sku) => allVariants().find((v) => v.sku === sku);
