/**
 * Algebra launch catalogue. Single source of truth for the site build, the checkout (server-side price check)
 * and the supplier adapter.
 *
 * Status vocabulary (see docs/LAUNCH_CHECKLIST.md):
 *   PREVIEW                    real blank + published supplier price, sample not yet approved, imagery = MOCKUP
 *   NEEDS_SUPPLIER_APPROVAL    blank or decoration not on the supplier's public price list: not purchasable
 * Prices are HYPOTHESES within the brief's ranges (section 11). They are not applied automatically elsewhere:
 * change them here, rerun `npm run economics`, read docs/ECONOMICS.md.
 * Public product facts only. Supplier, base garment, supplier SKU and costs: worker/src/fulfillment/mapping.js (server only).
 */

export const TV = 'TO VERIFY';

export const colors = {
  ivory: { tone: 'light', hex: '#EDE8DD', ink: 'navy', name: { de: 'Ivory', en: 'Ivory', fr: 'Ivoire' }, supplierColor: TV },
  'deep-navy': { tone: 'dark', hex: '#1A2236', ink: 'ivory', name: { de: 'Deep Navy', en: 'Deep Navy', fr: 'Marine profond' }, supplierColor: TV },
  black: { tone: 'dark', hex: '#161616', ink: 'ivory', name: { de: 'Schwarz', en: 'Black', fr: 'Noir' }, supplierColor: TV },
  sage: { tone: 'light', hex: '#8F9B86', ink: 'navy', name: { de: 'Salbei', en: 'Sage', fr: 'Sauge' }, supplierColor: TV },
  taupe: { tone: 'light', hex: '#A6978A', ink: 'navy', name: { de: 'Taupe', en: 'Taupe', fr: 'Taupe' }, supplierColor: TV },
  burgundy: { tone: 'dark', hex: '#5E1F2C', ink: 'ivory', name: { de: 'Burgund', en: 'Burgundy', fr: 'Bordeaux' }, supplierColor: TV },
  olive: { tone: 'dark', hex: '#4F5A31', ink: 'ivory', name: { de: 'Oliv', en: 'Olive', fr: 'Vert olive' }, supplierColor: TV },
};


/** Base garment specs shown to customers (composition, weight). Keys are internal; names never reach the site. */
export const blanks = {
  'polo-m': {
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 240,
  },
  'tee-m': {
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 220,
  },
  'tee-w': {
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 180,
  },
  'sweat-m': {
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 350,
  },
  'tee-oversize': {
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 200,
  },
  'tee-unisex': {
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 180,
  },
  'tee-w-fitted': {
    composition: { de: '100 % Baumwolle', en: '100% cotton', fr: '100 % coton' },
    gsm: 185,
  },
  'tee-heavy': {
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 280,
  },
  'sweat-w': {
    composition: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' },
    gsm: 300,
  },
  'polo-w': {
    composition: { de: TV, en: TV, fr: TV },
    gsm: TV,
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

/**
 * Graphic Series cuts (test order 30.10.2026: one of each). live: false = prepared, not on the site until real worn photos
 * of that cut exist (flat supplier-template renders, scripts/cuts.py, were not good enough: 31.10.2026).
 */
export const graphicCuts = [
  { id: 'unisex', code: 'U', blank: 'tee-unisex', sizes: sizesMen, name: { de: 'Unisex', en: 'Unisex', fr: 'Unisexe' } },
  { id: 'oversize', code: 'O', live: false, blank: 'tee-oversize', sizes: sizesMen, price: 75, name: { de: 'Oversize', en: 'Oversize', fr: 'Oversize' } },
  { id: 'women', code: 'W', live: false, blank: 'tee-w-fitted', sizes: sizesWomen, name: { de: 'Damen tailliert', en: 'Women’s fitted', fr: 'Femme cintrée' } },
  { id: 'women-straight', code: 'R', live: false, blank: 'tee-w', sizes: sizesWomen, name: { de: 'Damen gerade', en: 'Women’s straight', fr: 'Femme droite' } },
];
/** Price of a product in a cut (cut.price when set, else the product price). */
export const priceOf = (p, cutId) => (p.cuts?.find((c) => c.id === cutId)?.price ?? p.price);
/** Lowest price of a product (cards, sorting). */
export const minPrice = (p) => Math.min(p.price, ...(p.cuts || []).map((c) => c.price ?? p.price));

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
    blank: 'polo-m',
    decoration: { method: 'embroidery', option: 'embroidery', placement: 'left chest, A 25 mm wide (≈ 18 mm high)', file: 'brand/algebra-a-signature-master.svg' },
    colors: ['deep-navy', 'black', 'ivory', 'olive'],
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
        de: 'Symbol gestickt, rund 18 mm hoch, Elfenbein auf Dunkel, Navy auf Elfenbein.',
        en: 'Embroidered symbol, about 18 mm high, ivory on dark, navy on ivory.',
        fr: 'Symbole brodé, environ 18 mm de haut, ivoire sur foncé, navy sur ivoire.',
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
    name: { de: 'The Tee', en: 'The Tee', fr: 'The Tee' },
    price: 59,
    status: 'PREVIEW',
    blank: 'tee-m',
    decoration: { method: 'embroidery', option: 'embroidery', placement: 'left chest, A 25 mm wide (≈ 18 mm high)', file: 'brand/algebra-a-signature-master.svg' },
    colors: ['ivory', 'black', 'deep-navy', 'olive'],
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
        de: 'Symbol gestickt, rund 18 mm hoch, auf Brusthöhe.',
        en: 'Embroidered symbol, about 18 mm high, at chest height.',
        fr: 'Symbole brodé, environ 18 mm de haut, à hauteur de poitrine.',
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
    id: 'ALG-M-SWEAT',
    slug: 'the-crew-men',
    line: 'essentials',
    gender: 'men', // Changer 2.0 (unisex blank), shown in the men's range; women have The Crew in Alma
    category: 'sweaters',
    name: { de: 'The Sweat', en: 'The Sweat', fr: 'The Sweat' },
    price: 109,
    status: 'PREVIEW',
    blank: 'sweat-m',
    decoration: { method: 'embroidery', option: 'embroidery', placement: 'left chest, A 25 mm wide (≈ 18 mm high), tone on tone', file: 'brand/algebra-a-signature-master.svg' },
    colors: ['black', 'deep-navy', 'ivory', 'olive'],
    sizes: sizesMen,
    copy: {
      lead: {
        de: 'Schweres Sweatshirt mit Rundhals. Das Symbol klein auf der Brust gestickt.',
        en: 'A heavy crewneck sweatshirt. The symbol embroidered small on the chest.',
        fr: 'Sweat col rond épais. Le symbole brodé discrètement sur la poitrine.',
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
        de: 'Symbol gestickt, rund 18 mm hoch, Elfenbein auf Dunkel, Navy auf Elfenbein. Rippbündchen an Kragen, Ärmeln und Saum.',
        en: 'Embroidered symbol, about 18 mm high, ivory on dark, navy on ivory. Rib at collar, cuffs and hem.',
        fr: 'Symbole brodé, environ 18 mm de haut, ivoire sur foncé, navy sur ivoire. Bord côte au col, aux poignets et à l’ourlet.',
      },
      design: {
        de: 'Ruhig getragen, präzise gemacht.',
        en: 'Worn quietly, made precisely.',
        fr: 'Porté calmement, fait avec précision.',
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
    blank: 'polo-w',
    decoration: { method: 'embroidery', option: 'embroidery', placement: 'left chest, A 25 mm wide (≈ 18 mm high)', file: 'brand/algebra-a-signature-master.svg' },
    colors: ['ivory', 'deep-navy', 'black', 'olive'],
    sizes: sizesWomen,
    copy: {
      lead: {
        de: 'Der Polo im Damenschnitt, Piqué, das Symbol auf der Brust gestickt. Bald erhältlich.',
        en: 'The polo in a women’s cut, piqué, the symbol embroidered on the chest. Coming soon.',
        fr: 'Le polo en coupe femme, piqué, le symbole brodé sur la poitrine. Bientôt disponible.',
      },
      fit: { de: 'Taillierter Damenschnitt (wird bestätigt).', en: 'Shaped women’s cut (to be confirmed).', fr: 'Coupe femme cintrée (à confirmer).' },
      fabric: { de: 'Wird mit dem Muster veröffentlicht.', en: 'Published with the approved sample.', fr: 'Publié avec l’échantillon validé.' },
      detail: { de: 'Symbol gestickt, rund 18 mm hoch.', en: 'Embroidered symbol, about 18 mm high.', fr: 'Symbole brodé, environ 18 mm de haut.' },
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
    name: { de: 'The Tee', en: 'The Tee', fr: 'The Tee' },
    price: 55,
    status: 'PREVIEW',
    blank: 'tee-w',
    decoration: { method: 'embroidery', option: 'embroidery', placement: 'left chest, A 25 mm wide (≈ 18 mm high)', file: 'brand/algebra-a-signature-master.svg' },
    colors: ['ivory', 'black', 'deep-navy', 'olive'],
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
      detail: { de: 'Symbol gestickt, rund 18 mm hoch.', en: 'Embroidered symbol, about 18 mm high.', fr: 'Symbole brodé, environ 18 mm de haut.' },
      design: {
        de: 'Leise genug für das Büro, klar genug für alles danach.',
        en: 'Quiet enough for the office, clear enough for everything after.',
        fr: 'Assez discret pour le bureau, assez net pour tout le reste.',
      },
    },
    care: careEssential,
  },
  {
    id: 'ALG-W-SWEAT',
    slug: 'the-crew-women',
    line: 'essentials',
    gender: 'women',
    category: 'sweaters',
    name: { de: 'The Sweat', en: 'The Sweat', fr: 'The Sweat' },
    price: 105,
    status: 'NEEDS_SUPPLIER_APPROVAL',
    blank: 'sweat-w',
    decoration: { method: 'embroidery', option: 'embroidery', placement: 'left chest, A 25 mm wide (≈ 18 mm high), tone on tone', file: 'brand/algebra-a-signature-master.svg' },
    colors: ['ivory', 'deep-navy', 'black', 'olive'],
    sizes: sizesWomen,
    copy: {
      lead: {
        de: 'Das Sweatshirt im Damenschnitt, 300 g/m², das Symbol auf der Brust. Bald erhältlich.',
        en: 'The crewneck in a women’s cut, 300 g/m², the symbol on the chest. Coming soon.',
        fr: 'Le sweat en coupe femme, 300 g/m², le symbole sur la poitrine. Bientôt disponible.',
      },
      fit: { de: 'Damenschnitt, leicht verkürzt (wird bestätigt).', en: 'Women’s cut, slightly cropped (to be confirmed).', fr: 'Coupe femme, légèrement raccourcie (à confirmer).' },
      fabric: {
        de: 'Sweat, 300 g/m².',
        en: 'Sweat fabric, 300 g/m².',
        fr: 'Molleton, 300 g/m².',
      },
      detail: { de: 'Symbol auf der Brust, rund 18 mm hoch.', en: 'Symbol on the chest, about 18 mm high.', fr: 'Symbole sur la poitrine, environ 18 mm de haut.' },
      design: {
        de: 'Ruhig getragen, präzise gemacht.',
        en: 'Worn quietly, made precisely.',
        fr: 'Porté calmement, fait avec précision.',
      },
    },
    care: careEssential,
  },
  // ---------------------------------------------------------------- THE KNIT (not published: no supplier reference chosen yet)
  // Real knitted fabric (fine gauge crewneck), never a sweatshirt. Every fact below needs_verification.
  ...['men', 'women'].map((g) => ({
    id: g === 'men' ? 'ALG-M-KNIT' : 'ALG-W-KNIT',
    slug: g === 'men' ? 'the-knit-men' : 'the-knit-women',
    line: 'essentials',
    gender: g,
    category: 'knitwear',
    name: { de: 'The Knit', en: 'The Knit', fr: 'The Knit' },
    price: null, // set only after the supplier cost is known (no automatic price)
    status: 'DRAFT',
    needs_verification: true,
    blank: null,
    decoration: { method: 'embroidery', option: 'embroidery', placement: 'left chest, A 25 mm wide (≈ 18 mm high), tone on tone (to confirm on knit)', file: 'brand/algebra-a-signature-master.svg' },
    colors: ['black', 'deep-navy', 'ivory', 'olive'],
    sizes: g === 'men' ? sizesMen : sizesWomen,
    copy: { lead: { de: '', en: '', fr: '' } },
    care: careEssential,
  })),
  // ---------------------------------------------------------------- GRAPHIC SERIES · CAPSULE 01 "PHYSICS IN INK"
  // Direction from the owner's reference boards (22.10.2026). Artwork: scripts/physics.mjs. Equations checked in docs/GRAPHIC_SERIES.md.
  ...[
    {
      key: 'navier-stokes',
      hidden: true, // no drawing in the AW26 series yet
      id: 'ALG-G-01-NAVIERSTOKES',
      name: 'Navier–Stokes 01',
      field: { de: 'Strömungsmechanik', en: 'Fluid dynamics', fr: 'Mécanique des fluides' },
      colors: ['ivory', 'black', 'deep-navy', 'olive'],
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
      hidden: true, // no drawing in the AW26 series yet
      id: 'ALG-G-02-BLACKHOLE',
      name: 'Black Hole 02',
      field: { de: 'Gravitation', en: 'Gravitation', fr: 'Gravitation' },
      colors: ['black', 'deep-navy', 'ivory', 'olive'],
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
      colors: ['black', 'deep-navy', 'ivory', 'olive'],
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
      hidden: true, // no drawing in the AW26 series yet
      id: 'ALG-G-04-CURVATURE',
      name: 'Curvature 04',
      field: { de: 'Allgemeine Relativitätstheorie', en: 'General relativity', fr: 'Relativité générale' },
      colors: ['deep-navy', 'black', 'ivory', 'olive'],
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
      hidden: true, // no drawing in the AW26 series yet
      id: 'ALG-G-05-EPRER',
      name: 'EPR = ER 05',
      field: { de: 'Quantengravitation', en: 'Quantum gravity', fr: 'Gravité quantique' },
      colors: ['black', 'ivory', 'deep-navy', 'olive'],
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
      ['euler', 'ALG-G-06-EULER', 'Euler 06', { de: 'Mathematik', en: 'Mathematics', fr: 'Mathématiques' }, ['black', 'deep-navy', 'ivory', 'olive'], 'e', 'e^{iπ} + 1 = 0', {
        de: 'Eulers Identität verbindet fünf Grundzahlen der Mathematik in einer Zeile: e, i, π, 1 und 0. Sie folgt aus der Formel e^{iθ} = cos θ + i sin θ für θ = π.',
        en: 'Euler’s identity links five fundamental numbers in one line: e, i, π, 1 and 0. It follows from the formula e^{iθ} = cos θ + i sin θ with θ = π.',
        fr: 'L’identité d’Euler relie cinq nombres fondamentaux en une ligne : e, i, π, 1 et 0. Elle découle de la formule e^{iθ} = cos θ + i sin θ pour θ = π.',
      }],
      ['lorenz', 'ALG-G-07-LORENZ', 'Lorenz 07', { de: 'Chaostheorie', en: 'Chaos theory', fr: 'Théorie du chaos' }, ['black', 'deep-navy', 'ivory', 'olive'], '∿', 'dx/dt = σ(y − x)', {
        de: 'Edward Lorenz’ vereinfachtes Wettermodell von 1963. Winzige Unterschiede am Anfang führen zu völlig anderen Bahnen: der Ursprung des Begriffs Schmetterlingseffekt.',
        en: 'Edward Lorenz’s simplified weather model from 1963. Tiny differences at the start lead to completely different paths: where the idea of the butterfly effect comes from.',
        fr: 'Le modèle météo simplifié d’Edward Lorenz, en 1963. D’infimes différences au départ mènent à des trajectoires totalement différentes : l’origine de l’« effet papillon ».',
      }],
      ['maxwell', 'ALG-G-08-MAXWELL', 'Maxwell 08', { de: 'Elektromagnetismus', en: 'Electromagnetism', fr: 'Électromagnétisme' }, ['black', 'deep-navy', 'ivory', 'olive'], '∇', '∇×B = μ_{0}J + μ_{0}ε_{0} ∂E/∂t', {
        de: 'Vier Gleichungen von James Clerk Maxwell beschreiben elektrische und magnetische Felder. Aus ihnen folgen Wellen, die sich mit Lichtgeschwindigkeit ausbreiten: Licht selbst.',
        en: 'Four equations by James Clerk Maxwell describe electric and magnetic fields. They predict waves that travel at the speed of light: light itself.',
        fr: 'Quatre équations de James Clerk Maxwell décrivent les champs électriques et magnétiques. Elles prédisent des ondes qui voyagent à la vitesse de la lumière : la lumière elle-même.',
      }],
      ['mandelbrot', 'ALG-G-09-MANDELBROT', 'Mandelbrot 09', { de: 'Fraktale Geometrie', en: 'Fractal geometry', fr: 'Géométrie fractale' }, ['black', 'deep-navy', 'ivory', 'olive'], '✳', 'z_{n+1} = z_{n}^{2} + c', {
        de: 'Alle Zahlen c, für die z → z² + c ab z = 0 beschränkt bleibt. Eine Regel aus einer Zeile, ein Rand mit unendlich vielen Details.',
        en: 'All numbers c for which z → z² + c, starting at z = 0, stays bounded. A one-line rule, an edge with endless detail.',
        fr: 'Tous les nombres c pour lesquels z → z² + c, en partant de z = 0, reste borné. Une règle d’une ligne, un bord aux détails infinis.',
      }],
      ['tesseract', 'ALG-G-10-TESSERACT', 'Tesseract 10', { de: 'Vierte Dimension', en: 'Fourth dimension', fr: 'Quatrième dimension' }, ['black', 'deep-navy', 'ivory', 'olive'], '⧈', '16 · 32 · 24 · 8', {
        de: 'Der Würfel in vier Dimensionen. Was man sieht, ist sein Schatten im Raum: 16 Ecken, 32 Kanten, 24 Quadrate, 8 Würfel.',
        en: 'The cube in four dimensions. What you see is its shadow in space: 16 vertices, 32 edges, 24 squares, 8 cubes.',
        fr: 'Le cube en quatre dimensions. Ce que l’on voit est son ombre dans l’espace : 16 sommets, 32 arêtes, 24 carrés, 8 cubes.',
      }],
      ['higgs', 'ALG-G-11-HIGGS', 'Higgs Field 11', { de: 'Teilchenphysik', en: 'Particle physics', fr: 'Physique des particules' }, ['black', 'deep-navy', 'ivory', 'olive'], 'φ', 'V(φ) = −μ^{2}|φ|^{2} + λ|φ|^{4}', {
        de: 'Das Higgs-Feld gibt Elementarteilchen ihre Masse. Sein Potenzial hat die Form eines Huts: Oben ist es instabil, das Feld kommt im Tal zur Ruhe. Das Higgs-Boson wurde 2012 am CERN nachgewiesen.',
        en: 'The Higgs field gives elementary particles their mass. Its potential is shaped like a hat: the top is unstable, the field settles in the valley. The Higgs boson was observed at CERN in 2012.',
        fr: 'Le champ de Higgs donne leur masse aux particules élémentaires. Son potentiel a la forme d’un chapeau : le sommet est instable, le champ se stabilise dans la vallée. Le boson de Higgs a été observé au CERN en 2012.',
      }],
      ['big-bang', 'ALG-G-12-BIGBANG', 'Big Bang 12', { de: 'Kosmologie', en: 'Cosmology', fr: 'Cosmologie' }, ['black', 'deep-navy', 'ivory', 'olive'], '✶', 'H^{2} = 8πGρ/3 − kc^{2}/a^{2} + Λc^{2}/3', {
        de: 'Das Universum dehnt sich seit rund 13,8 Milliarden Jahren aus einem extrem heißen, dichten Zustand aus. Die Friedmann-Gleichung beschreibt, wie diese Ausdehnung von Materie, Krümmung und kosmologischer Konstante abhängt.',
        en: 'The universe has been expanding for about 13.8 billion years from an extremely hot, dense state. The Friedmann equation describes how that expansion depends on matter, curvature and the cosmological constant.',
        fr: 'L’Univers est en expansion depuis environ 13,8 milliards d’années, à partir d’un état extrêmement chaud et dense. L’équation de Friedmann décrit comment cette expansion dépend de la matière, de la courbure et de la constante cosmologique.',
      }],
      ['feynman', 'ALG-G-13-FEYNMAN', 'Feynman 13', { de: 'Quantenelektrodynamik', en: 'Quantum electrodynamics', fr: 'Électrodynamique quantique' }, ['black', 'deep-navy', 'ivory', 'olive'], 'γ', 'ℒ = ψ̄(iγ^{μ}D_{μ} − m)ψ − ¼F_{μν}F^{μν}', {
        de: 'Richard Feynman zeichnete Teilchenprozesse als einfache Diagramme: gerade Linien für Elektronen, Wellenlinien für Photonen. Jedes Diagramm steht für einen Term der Rechnung. Die Quantenelektrodynamik gehört zu den am genauesten bestätigten Theorien der Physik.',
        en: 'Richard Feynman drew particle processes as simple diagrams: straight lines for electrons, wavy lines for photons. Each diagram stands for one term of the calculation. Quantum electrodynamics is among the most precisely confirmed theories in physics.',
        fr: 'Richard Feynman dessinait les processus entre particules comme de simples diagrammes : des lignes droites pour les électrons, des lignes ondulées pour les photons. Chaque diagramme correspond à un terme du calcul. L’électrodynamique quantique est l’une des théories les mieux vérifiées de la physique.',
      }],
      ['mobius', 'ALG-G-14-MOBIUS', 'Möbius 14', { de: 'Topologie', en: 'Topology', fr: 'Topologie' }, ['black', 'deep-navy', 'ivory', 'olive'], '∞', 'χ = 0', {
        de: 'Ein Band, einmal verdreht und geschlossen: Es hat nur eine Seite und nur eine Kante. August Ferdinand Möbius beschrieb es 1858. Seine Euler-Charakteristik ist null.',
        en: 'A strip, twisted once and closed: it has only one side and only one edge. August Ferdinand Möbius described it in 1858. Its Euler characteristic is zero.',
        fr: 'Une bande, tordue une fois puis refermée : elle n’a qu’une seule face et un seul bord. August Ferdinand Möbius l’a décrite en 1858. Sa caractéristique d’Euler vaut zéro.',
      }],
    ].map(([key, id, name, field, colors, glyph, equation, text]) => ({ key, id, name, field, colors, equation, hidden: key === 'tesseract', symbol: { glyph, ...text } })),
  ].map((g) => ({
    id: g.id,
    slug: g.key,
    line: 'graphic',
    gender: 'unisex',
    category: 't-shirts',
    capsule: 'Graphic Series · AW 2026',
    graphic: g.key,
    field: g.field,
    equation: g.equation,
    name: { de: g.name, en: g.name, fr: g.name },
    price: 69,
    status: g.hidden ? 'DRAFT' : 'PREVIEW',
    // Four cuts, same print (back) and the A (left chest). code = letter in the variant SKU. price: only when it differs.
    // Base garments, supplier colours and print price: worker/src/fulfillment/mapping.js (server only).
    cuts: graphicCuts.filter((c) => c.live !== false),
    blank: 'tee-unisex',
    decoration: {
      method: 'print',
      option: 'print2',
      placement: 'front: official A, 25 mm wide (≈ 18 mm high), left chest · back: full-back print ~350 × 500 mm (max print area: see fulfillment mapping)',
      file: `design/prints/${g.key}.png (owner drawing 1024 × 1536: upscale to ≥ 3500 px before production) + brand/algebra-a-signature-master.svg`,
      technique: TV,
    },
    colors: g.colors,
    sizes: sizesMen,
    symbol: g.symbol,
    copy: {
      lead: {
        de: `${g.name.replace(/ \d{2}$/, '')}: ein großer Rückendruck in Tusche, Kupfer und Petrol, mit der echten Gleichung. Vorne das Algebra-Symbol.`,
        en: `${g.name.replace(/ \d{2}$/, '')}: a full back print in ink, copper and teal, with the real equation. The Algebra symbol on the chest.`,
        fr: `${g.name.replace(/ \d{2}$/, '')} : un grand imprimé dos à l’encre, cuivre et pétrole, avec la vraie équation. Le symbole Algebra sur la poitrine.`,
      },
      fit: {
        de: 'Unisex, gerade geschnitten.',
        en: 'Unisex, straight cut.',
        fr: 'Unisexe, coupe droite.',
      },
      fabric: {
        de: 'Unisex 180 g/m².',
        en: 'Unisex 180 g/m².',
        fr: 'Unisexe 180 g/m².',
      },
      detail: {
        de: 'Druck über fast den ganzen Rücken. Das Symbol klein auf der linken Brust.',
        en: 'A print across almost the whole back. The symbol small on the left chest.',
        fr: 'Un imprimé sur presque tout le dos. Le symbole discret sur la poitrine gauche.',
      },
      design: {
        de: 'Originalgrafik von Algebra: Tusche, Sternenstaub, Hilfslinien. Die großen Gleichungen der Welt, als Bild getragen.',
        en: 'Original Algebra artwork: ink, stardust, construction lines. The great equations of the world, worn as an image.',
        fr: 'Graphisme original Algebra : encre, poussière d’étoiles, lignes de construction. Les grandes équations du monde, portées comme une image.',
      },
    },
    care: careGraphic,
  })),
];

/** Shipping policy (decision documented in docs/ECONOMICS.md). Delivery times stay TO VERIFY until Valadio confirms. */
export const shipping = {
  countries: ['DE', 'FR', 'AT', 'BE', 'NL', 'LU'],
  zones: {
    DE: { fee: 4.9, freeFrom: 100, supplierCostNet: 5.8, deliveryDays: TV },
    EU: { fee: 7.9, freeFrom: 150, supplierCostNet: 8.32, deliveryDays: TV },
  },
  packagingNetPerShipment: 0.8,
};

export const zoneOf = (country) => (country === 'DE' ? 'DE' : 'EU');

/** Variant SKU: ALG-M-POLO-DNV-M. Supplier SKUs live in worker/src/fulfillment/mapping.js. */
export const colorCode = { ivory: 'IVO', 'deep-navy': 'DNV', black: 'BLK', sage: 'SAG', taupe: 'TAU', burgundy: 'BUR', olive: 'OLV' };

export function variantsOf(p) {
  const cuts = p.cuts || [{ id: null, blank: p.blank, sizes: p.sizes }];
  const out = [];
  for (const cut of cuts) {
    for (const c of p.colors) {
      for (const s of cut.sizes) {
        const sku = [p.id, cut.id ? cut.code : null, colorCode[c], s].filter(Boolean).join('-');
        out.push({
          sku,
          productId: p.id,
          cut: cut.id,
          price: cut.price ?? p.price,
          color: c,
          size: s,
          decoration: p.decoration.method,
          // graphic: design-source (design/prints) is never sent; production needs a print-master (worker/src/fulfillment PRINT_MASTER)
          printFile: p.line === 'graphic' ? { design: p.graphic, front: `brand/algebra-a-signature-master${colors[c].tone === 'light' ? '' : '-ivory'}.svg`, source: `design/prints/${p.graphic}.png` } : null,
          embroideryFile: p.decoration.method === 'embroidery' ? 'brand/algebra-a-signature-master.svg (embroidery file to be digitized from the master: TO VERIFY)' : null,
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
