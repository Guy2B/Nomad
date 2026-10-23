/**
 * Product page copy, Algebra voice. Every section is [headline, text] per language.
 * Public facts only: no supplier, no base garment name, no supplier SKU (those live in worker/src/fulfillment/mapping.js).
 * spec = what the customer sees under "Product information". needs_verification: true = the values come from the
 * legacy base garment and must be confirmed for the final (Valadio) reference. A live build refuses to publish them.
 */

const shipping = {
  de: ['Aus der EU versendet.', 'Lieferung nach Deutschland, Frankreich, Österreich, Belgien, die Niederlande und Luxemburg. 14 Tage gesetzliches Widerrufsrecht ab Erhalt der Bestellung.'],
  en: ['Shipped from the EU.', 'Delivery to Germany, France, Austria, Belgium, the Netherlands and Luxembourg. 14-day statutory right of withdrawal from receipt of your order.'],
  fr: ['Expédié depuis l’UE.', 'Livraison en Allemagne, France, Autriche, Belgique, aux Pays-Bas et au Luxembourg. Droit de rétractation légal de 14 jours à compter de la réception.'],
};

const careEmb = {
  de: ['Für eine lange Lebensdauer.', 'Pflegehinweise im Kleidungsstück beachten. Auf links waschen und nicht direkt über die Stickerei bügeln.'],
  en: ['Made to last.', 'Follow the care label inside the garment. Wash inside out and do not iron directly over the embroidery.'],
  fr: ['Pour durer longtemps.', 'Suivez l’étiquette d’entretien. Lavez sur l’envers et ne repassez pas directement sur la broderie.'],
};
const carePrint = {
  de: ['Damit der Druck bleibt.', 'Pflegehinweise im Kleidungsstück beachten. Auf links waschen, nicht in den Trockner, nicht über den Druck bügeln.'],
  en: ['To keep the print at its best.', 'Follow the care label. Wash inside out, no tumble dryer, no ironing over the print.'],
  fr: ['Pour que l’imprimé dure.', 'Suivez l’étiquette d’entretien. Lavez sur l’envers, pas de sèche-linge, pas de repassage sur l’imprimé.'],
};

const signature = {
  de: ['Balance. Struktur. Proportion.', 'Das Algebra-Symbol reduziert unsere Idee auf das Wesentliche. Kein lautes Branding. Ein Zeichen für diejenigen, die genauer hinsehen.'],
  en: ['Balance. Structure. Proportion.', 'The Algebra symbol reduces our idea to its essence. No loud branding. A sign for those who look closer.'],
  fr: ['Équilibre. Structure. Proportion.', 'Le symbole Algebra réduit notre idée à l’essentiel. Pas de logo bruyant. Un signe pour ceux qui regardent de plus près.'],
};

const contrast = {
  de: 'Elfenbein auf Schwarz und Navy, Navy auf Elfenbein.',
  en: 'Ivory on black and navy, navy on ivory.',
  fr: 'Ivoire sur noir et navy, navy sur ivoire.',
};

export const copy = {
  'ALG-M-POLO': {
    lead: {
      de: ['Reduktion mit Präsenz.', 'Schwerer Piqué, klare Linien und ein präzise gesetztes Algebra-Symbol. Ein Polo für einen ruhigen, selbstverständlichen Stil.'],
      en: ['Restraint with presence.', 'Heavy piqué, clean lines and a precisely placed Algebra symbol. A polo for a calm, self-assured style.'],
      fr: ['La sobriété, avec présence.', 'Un piqué épais, des lignes nettes et le symbole Algebra placé avec précision. Un polo pour un style calme et assuré.'],
    },
    fit: {
      de: ['Klar. Ausgewogen. Zeitlos.', 'Eine klassische Polo-Silhouette mit ruhiger Linie und genügend Struktur für einen gepflegten Look, ohne steif zu wirken. Zwischen zwei Größen: die kleinere für eine klare Linie, die größere für mehr Leichtigkeit.'],
      en: ['Clean. Balanced. Timeless.', 'A classic polo silhouette with a calm line and enough structure for a polished look, without feeling stiff. Between sizes: the smaller for a clean line, the larger for more ease.'],
      fr: ['Net. Équilibré. Intemporel.', 'Une silhouette de polo classique, une ligne calme et assez de tenue pour une allure soignée, sans raideur. Entre deux tailles : la plus petite pour une ligne nette, la plus grande pour plus d’aisance.'],
    },
    fabric: {
      de: ['Substanz, die man spürt.', 'Dichter, strukturierter Piqué aus Bio-Baumwolle, angenehm im Griff. Für ein Polo mit mehr Präsenz und einem hochwertigen Fall.'],
      en: ['Substance you can feel.', 'Dense, structured organic cotton piqué, pleasant to the hand. For a polo with more presence and a fine drape.'],
      fr: ['Une matière qui se sent.', 'Un piqué de coton bio dense et structuré, agréable au toucher. Pour un polo plus présent, au tombé soigné.'],
    },
    detail: {
      de: ['18 mm. Präzise gestickt.', `Das Algebra-Symbol sitzt dezent auf der linken Brust. ${contrast.de} Bewusst klein. Präzise ausgeführt.`],
      en: ['18 mm. Precisely embroidered.', `The Algebra symbol sits discreetly on the left chest. ${contrast.en} Deliberately small. Precisely made.`],
      fr: ['18 mm. Brodé avec précision.', `Le symbole Algebra se place discrètement sur la poitrine gauche. ${contrast.fr} Volontairement petit. Exécuté avec précision.`],
    },
    spec: { needs_verification: true, material: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' }, weight: '240 g/m²', finish: 'embroidery' },
    care: careEmb,
  },
  'ALG-W-POLO': {
    lead: {
      de: ['Klassik, neu proportioniert.', 'Der Algebra-Polo im Damenschnitt: taillierte Linie, weicher Kragen, das Symbol fein gestickt.'],
      en: ['A classic, re-proportioned.', 'The Algebra polo in a women’s cut: a shaped line, a soft collar, the symbol finely embroidered.'],
      fr: ['Un classique, aux proportions revues.', 'Le polo Algebra en coupe femme : une ligne cintrée, un col souple, le symbole finement brodé.'],
    },
    fit: {
      de: ['Tailliert. Leicht. Präzise.', 'Ein eigener Damenschnitt, keine verkleinerte Herrenform. Körpernah an der Taille, bequem an den Schultern.'],
      en: ['Shaped. Light. Precise.', 'A cut of its own, not a scaled-down men’s pattern. Close at the waist, easy at the shoulders.'],
      fr: ['Cintré. Léger. Précis.', 'Une coupe à part entière, pas un modèle homme réduit. Près du corps à la taille, aisé aux épaules.'],
    },
    fabric: {
      de: ['Piqué mit Haltung.', 'Strukturierter Baumwoll-Piqué, atmungsaktiv und formstabil.'],
      en: ['Piqué with poise.', 'Structured cotton piqué, breathable and holding its shape.'],
      fr: ['Un piqué qui a de la tenue.', 'Piqué de coton structuré, respirant et qui garde sa forme.'],
    },
    detail: {
      de: ['Bewusst klein.', `Das Algebra-Symbol, rund 18 mm hoch, auf der linken Brust gestickt. ${contrast.de}`],
      en: ['Deliberately small.', `The Algebra symbol, about 18 mm high, embroidered on the left chest. ${contrast.en}`],
      fr: ['Volontairement petit.', `Le symbole Algebra, environ 18 mm de haut, brodé sur la poitrine gauche. ${contrast.fr}`],
    },
    spec: { needs_verification: true, material: { de: 'Baumwoll-Piqué', en: 'Cotton piqué', fr: 'Piqué de coton' }, weight: null, finish: 'embroidery' },
    care: careEmb,
  },
  'ALG-M-TEE': {
    lead: {
      de: ['Das T-Shirt, auf das man zurückkommt.', 'Schwerer Jersey, eine ruhige Form und das Algebra-Symbol auf der Brust. Für jeden Tag, ohne gewöhnlich zu sein.'],
      en: ['The T-shirt you come back to.', 'Heavy jersey, a calm shape and the Algebra symbol on the chest. For every day, without being ordinary.'],
      fr: ['Le T-shirt vers lequel on revient.', 'Un jersey épais, une forme calme et le symbole Algebra sur la poitrine. Pour tous les jours, sans être ordinaire.'],
    },
    fit: {
      de: ['Gerade. Entspannt. Sauber.', 'Gerader Schnitt mit leicht überschnittener Schulter. Fällt normal aus.'],
      en: ['Straight. Relaxed. Clean.', 'Straight cut with a slightly dropped shoulder. True to size.'],
      fr: ['Droit. Décontracté. Net.', 'Coupe droite, épaule légèrement tombante. Taille normalement.'],
    },
    fabric: {
      de: ['Gewicht, das bleibt.', 'Dichter Jersey aus Bio-Baumwolle. Hält die Form, Wäsche für Wäsche.'],
      en: ['Weight that lasts.', 'Dense organic cotton jersey. Keeps its shape, wash after wash.'],
      fr: ['Une matière qui dure.', 'Jersey de coton bio dense. Garde sa forme, lavage après lavage.'],
    },
    detail: {
      de: ['Ein Zeichen. Gestickt.', `Das Algebra-Symbol, rund 18 mm hoch, auf der linken Brust. ${contrast.de}`],
      en: ['One sign. Embroidered.', `The Algebra symbol, about 18 mm high, on the left chest. ${contrast.en}`],
      fr: ['Un signe. Brodé.', `Le symbole Algebra, environ 18 mm de haut, sur la poitrine gauche. ${contrast.fr}`],
    },
    spec: { needs_verification: true, material: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' }, weight: '220 g/m²', finish: 'embroidery' },
    care: careEmb,
  },
  'ALG-W-TEE': {
    lead: {
      de: ['Klar geschnitten. Leicht getragen.', 'Ein T-Shirt im Damenschnitt aus feinem Jersey, mit dem Algebra-Symbol auf der Brust.'],
      en: ['Clean cut. Worn lightly.', 'A women’s cut T-shirt in fine jersey, with the Algebra symbol on the chest.'],
      fr: ['Une coupe nette. Une allure légère.', 'Un T-shirt en coupe femme, jersey fin, le symbole Algebra sur la poitrine.'],
    },
    fit: {
      de: ['Körpernah. Ausgewogen.', 'Leicht taillierter Damenschnitt mit rundem Ausschnitt. Fällt normal aus.'],
      en: ['Close. Balanced.', 'Slightly shaped women’s cut with a round neck. True to size.'],
      fr: ['Ajusté. Équilibré.', 'Coupe femme légèrement cintrée, col rond. Taille normalement.'],
    },
    fabric: {
      de: ['Fein und weich.', 'Leichter Jersey aus Bio-Baumwolle, angenehm auf der Haut.'],
      en: ['Fine and soft.', 'Light organic cotton jersey, soft against the skin.'],
      fr: ['Fin et doux.', 'Jersey léger de coton bio, doux sur la peau.'],
    },
    detail: {
      de: ['Ein Zeichen. Gestickt.', `Das Algebra-Symbol, rund 18 mm hoch, auf der linken Brust. ${contrast.de}`],
      en: ['One sign. Embroidered.', `The Algebra symbol, about 18 mm high, on the left chest. ${contrast.en}`],
      fr: ['Un signe. Brodé.', `Le symbole Algebra, environ 18 mm de haut, sur la poitrine gauche. ${contrast.fr}`],
    },
    spec: { needs_verification: true, material: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' }, weight: '180 g/m²', finish: 'embroidery' },
    care: careEmb,
  },
  'ALG-M-SWEAT': {
    lead: {
      de: ['Ruhe, die man trägt.', 'Ein schweres Sweatshirt mit Rundhals, klarer Linie und dem Algebra-Symbol auf der Brust.'],
      en: ['Calm you can wear.', 'A heavy crewneck sweatshirt with a clean line and the Algebra symbol on the chest.'],
      fr: ['Un calme qui se porte.', 'Un sweat épais à col rond, une ligne nette et le symbole Algebra sur la poitrine.'],
    },
    fit: {
      de: ['Regulär. Leicht kastig.', 'Gerade Form mit Rippbündchen an Kragen, Ärmeln und Saum. Fällt normal aus.'],
      en: ['Regular. Slightly boxy.', 'Straight shape with rib at collar, cuffs and hem. True to size.'],
      fr: ['Régulier. Légèrement carré.', 'Forme droite, bord côte au col, aux poignets et à l’ourlet. Taille normalement.'],
    },
    fabric: {
      de: ['Dicht. Warm. Weich.', 'Schwerer Sweatstoff, innen angeraut.'],
      en: ['Dense. Warm. Soft.', 'Heavy sweat fabric, brushed inside.'],
      fr: ['Dense. Chaud. Doux.', 'Molleton épais, gratté à l’intérieur.'],
    },
    detail: {
      de: ['20 mm. Gestickt.', `Das Algebra-Symbol auf der linken Brust. ${contrast.de}`],
      en: ['20 mm. Embroidered.', `The Algebra symbol on the left chest. ${contrast.en}`],
      fr: ['20 mm. Brodé.', `Le symbole Algebra sur la poitrine gauche. ${contrast.fr}`],
    },
    spec: { needs_verification: true, material: { de: 'Baumwolle (Bio)', en: 'Cotton (organic)', fr: 'Coton (bio)' }, weight: '350 g/m²', finish: 'embroidery' },
    care: careEmb,
  },
  'ALG-W-SWEAT': {
    lead: {
      de: ['Weich gerahmt.', 'Das Sweatshirt im Damenschnitt, mit dem Algebra-Symbol auf der Brust.'],
      en: ['Softly framed.', 'The crewneck in a women’s cut, with the Algebra symbol on the chest.'],
      fr: ['Tout en douceur.', 'Le sweat en coupe femme, avec le symbole Algebra sur la poitrine.'],
    },
    fit: {
      de: ['Feminin. Entspannt.', 'Eigener Damenschnitt, leicht verkürzt, mit Rippbündchen.'],
      en: ['Feminine. Relaxed.', 'A women’s cut of its own, slightly cropped, with rib trims.'],
      fr: ['Féminin. Décontracté.', 'Une coupe femme à part entière, légèrement raccourcie, bords côtes.'],
    },
    fabric: {
      de: ['Weich von innen.', 'Sweatstoff aus Bio-Baumwolle, innen angeraut.'],
      en: ['Soft on the inside.', 'Organic cotton sweat fabric, brushed inside.'],
      fr: ['Doux à l’intérieur.', 'Molleton de coton bio, gratté à l’intérieur.'],
    },
    detail: {
      de: ['Ein Zeichen auf der Brust.', `Das Algebra-Symbol, rund 18 mm hoch. ${contrast.de}`],
      en: ['One sign on the chest.', `The Algebra symbol, about 18 mm high. ${contrast.en}`],
      fr: ['Un signe sur la poitrine.', `Le symbole Algebra, environ 18 mm de haut. ${contrast.fr}`],
    },
    spec: { needs_verification: true, material: { de: '100 % Bio-Baumwolle', en: '100% organic cotton', fr: '100 % coton biologique' }, weight: '300 g/m²', finish: 'embroidery' },
    care: careEmb,
  },
};

/** Graphic Series: same structure, the equation section comes from the catalogue entry. */
export function graphicCopy(name) {
  const n = name.replace(/ \d{2}$/, '');
  return {
    lead: {
      de: [`${n}.`, 'Eine der großen Gleichungen der Welt, groß auf dem Rücken: Tusche, Kupfer und Petrol. Vorne nur das Algebra-Symbol.'],
      en: [`${n}.`, 'One of the great equations of the world, large on the back: ink, copper and teal. On the front, only the Algebra symbol.'],
      fr: [`${n}.`, 'L’une des grandes équations du monde, en grand dans le dos : encre, cuivre et pétrole. Devant, seulement le symbole Algebra.'],
    },
    fit: {
      de: ['Zwei Schnitte.', 'Unisex oder Damenschnitt. Fallen normal aus.'],
      en: ['Two cuts.', 'Unisex or women’s cut. True to size.'],
      fr: ['Deux coupes.', 'Unisexe ou coupe femme. Taillent normalement.'],
    },
    fabric: {
      de: ['Fester Jersey.', 'Baumwoll-Jersey mit Stand, damit der Druck ruhig liegt.'],
      en: ['Firm jersey.', 'Cotton jersey with body, so the print lies calmly.'],
      fr: ['Un jersey qui a du corps.', 'Jersey de coton avec de la tenue, pour que l’imprimé tombe bien.'],
    },
    detail: {
      de: ['Der ganze Rücken.', 'Druck über fast den ganzen Rücken. Vorne das Algebra-Symbol, klein auf der linken Brust.'],
      en: ['The whole back.', 'A print across almost the whole back. The Algebra symbol small on the left chest.'],
      fr: ['Tout le dos.', 'Un imprimé sur presque tout le dos. Le symbole Algebra, discret, sur la poitrine gauche.'],
    },
    signature: {
      de: ['Gezeichnet, nicht abgeschrieben.', 'Originalgrafik von Algebra: Tusche, Sternenstaub, Hilfslinien. Die Gleichung ist echt, die Zeichnung gehört uns.'],
      en: ['Drawn, not copied.', 'Original Algebra artwork: ink, stardust, construction lines. The equation is real, the drawing is ours.'],
      fr: ['Dessiné, pas recopié.', 'Graphisme original Algebra : encre, poussière d’étoiles, lignes de construction. L’équation est vraie, le dessin est le nôtre.'],
    },
    spec: { needs_verification: true, material: { de: 'Baumwolle (Bio)', en: 'Cotton (organic)', fr: 'Coton (bio)' }, weight: null, finish: 'print' },
    care: carePrint,
  };
}

export const common = { shipping, signature };
