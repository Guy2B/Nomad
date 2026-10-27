/**
 * Long-form pages. Legal pages are STRUCTURES with placeholders, never legal advice:
 * every one carries the LEGAL REVIEW REQUIRED notice until a lawyer or a legal-text service has replaced it.
 * Facts that depend on the supplier (delivery times, return address) stay placeholders until confirmed.
 */
import { site } from './config.mjs';

const o = site.operator;
const addr = `${o.name}<br>Inhaber: ${o.owner}<br>${o.street}<br>${o.city}<br>${o.country}`;
const retAddr = `${o.name}, ${o.street}, ${o.city}, ${o.country}`;
const review = {
  de: '<p class="notice">LEGAL REVIEW REQUIRED · Platzhalter-Struktur, nicht rechtlich geprüft. Vor dem Start durch geprüften Text ersetzen.</p>',
  en: '<p class="notice">LEGAL REVIEW REQUIRED · Placeholder structure, not legally reviewed. Replace with reviewed text before launch.</p>',
  fr: '<p class="notice">LEGAL REVIEW REQUIRED · Structure provisoire, non validée juridiquement. À remplacer par un texte validé avant le lancement.</p>',
};
const deFirst = {
  de: '',
  en: '<p class="small muted">The German version is the binding one. This translation is for information.</p>',
  fr: '<p class="small muted">La version allemande fait foi. Cette traduction est fournie à titre d’information.</p>',
};

export const pages = {
  faq: {
    de: [
      ['Wo werden die Stücke gefertigt?', 'Jedes Stück wird einzeln für dich in Europa bestickt oder bedruckt und aus der EU verschickt.'],
      ['Woraus sind die Stücke?', 'Aus Bio-Baumwolle. Material und Grammatur stehen auf jeder Produktseite.'],
      ['Wie wird verschickt?', 'Mit Sendungsverfolgung. Den Link bekommst du per E-Mail, sobald dein Paket unterwegs ist.'],
      ['Wohin liefert ihr?', 'Nach Deutschland, Frankreich, Österreich, Belgien, die Niederlande und Luxemburg.'],
      ['Was kostet der Versand?', 'Deutschland 4,90 €, ab 100 € Bestellwert kostenlos. Übrige Lieferländer 7,90 €, ab 150 € kostenlos.'],
      ['Kann ich zurückgeben?', 'Ja. Du hast ein gesetzliches Widerrufsrecht von 14 Tagen ab Erhalt der Ware. Wie es funktioniert, steht auf der Seite Rücksendungen.'],
      ['Welche Größe passt mir?', 'Jede Produktseite beschreibt den Schnitt. Die Größentabelle mit den Maßen des Kleidungsstücks findest du auf der Seite Größentabelle.'],
      ['Wie bezahle ich?', 'Über Stripe. Welche Zahlungsarten angezeigt werden, hängt von deinem Land ab. Wir sehen und speichern keine Kartendaten.'],
      ['Was bedeutet das Symbol?', 'Ein A mit einem zweiten Balken, der an ein Gleichheitszeichen erinnert: Gleichgewicht und Proportion.'],
    ],
    en: [
      ['Where are the pieces made?', 'Every piece is embroidered or printed for you in Europe and shipped from the EU.'],
      ['What are the pieces made of?', 'Organic cotton. Material and weight are on every product page.'],
      ['How is my order shipped?', 'Tracked. You get the link by email as soon as your parcel is on its way.'],
      ['Where do you ship?', 'Germany, France, Austria, Belgium, the Netherlands and Luxembourg.'],
      ['How much is shipping?', 'Germany 4.90 €, free from 100 €. Other countries 7.90 €, free from 150 €.'],
      ['Can I return?', 'Yes. You have a statutory 14-day right of withdrawal from receipt. The returns page explains how.'],
      ['Which size fits me?', 'Every product page describes the fit. Garment measurements are on the size guide page.'],
      ['How do I pay?', 'Through Stripe. The methods shown depend on your country. We never see or store card details.'],
      ['What does the symbol mean?', 'An A with a second bar that recalls an equals sign: balance and proportion.'],
    ],
    fr: [
      ['Où les pièces sont-elles fabriquées ?', 'Chaque pièce est brodée ou imprimée pour vous en Europe, puis expédiée depuis l’UE.'],
      ['En quoi sont les pièces ?', 'En coton biologique. Composition et grammage figurent sur chaque page produit.'],
      ['Comment ma commande est-elle expédiée ?', 'Avec suivi. Vous recevez le lien par e-mail dès que votre colis part.'],
      ['Où livrez-vous ?', 'En Allemagne, France, Autriche, Belgique, aux Pays-Bas et au Luxembourg.'],
      ['Combien coûte la livraison ?', 'Allemagne 4,90 €, offerte dès 100 €. Autres pays 7,90 €, offerte dès 150 €.'],
      ['Puis-je retourner un article ?', 'Oui. Vous disposez d’un droit légal de rétractation de 14 jours à réception. La page Retours explique comment faire.'],
      ['Quelle taille choisir ?', 'Chaque page produit décrit la coupe. Les mesures des vêtements sont dans le guide des tailles.'],
      ['Comment payer ?', 'Via Stripe. Les moyens proposés dépendent de votre pays. Nous ne voyons ni ne stockons vos données de carte.'],
      ['Que signifie le symbole ?', 'Un A doté d’une seconde barre qui évoque un signe égal : équilibre et proportion.'],
    ],
  },
  sizeGuide: {
    de: `<p>Messe ein Kleidungsstück, das dir gut passt, flach liegend, und vergleiche es mit den Maßen unten.</p>
<ol><li><strong>Brustbreite:</strong> von Naht zu Naht, 2 cm unter dem Ärmelansatz.</li><li><strong>Länge:</strong> vom höchsten Punkt der Schulter bis zum Saum.</li><li><strong>Ärmel:</strong> von der Schulternaht bis zum Ärmelende.</li></ol>
<p>Unsere Unisex-Schnitte fallen weit und kastig, der Damenschnitt normal. Für Fragen zur Größe schreib uns: wir helfen gern.</p>`,
    en: `<p>Measure a garment that fits you well, lying flat, and compare it with the measurements below.</p>
<ol><li><strong>Chest width:</strong> seam to seam, 2 cm below the armhole.</li><li><strong>Length:</strong> from the highest point of the shoulder to the hem.</li><li><strong>Sleeve:</strong> from the shoulder seam to the cuff.</li></ol>
<p>Our unisex cuts are roomy and boxy, the women's cut is true to size. Questions about sizing? Write to us, we are happy to help.</p>`,
    fr: `<p>Mesurez à plat un vêtement qui vous va bien et comparez avec les mesures ci-dessous.</p>
<ol><li><strong>Largeur poitrine :</strong> de couture à couture, 2 cm sous l’emmanchure.</li><li><strong>Longueur :</strong> du point le plus haut de l’épaule à l’ourlet.</li><li><strong>Manche :</strong> de la couture d’épaule au bout de la manche.</li></ol>
<p>Nos coupes unisexes sont amples et carrées, la coupe femme taille normalement. Une question sur la taille ? Écrivez-nous, nous vous aidons volontiers.</p>`,
  },
  about: {
    de: `<p class="about__kicker">Stil beginnt mit Haltung.</p>
<p class="lead">ALGEBRA ist eine europäische Modemarke für zeitlose Essentials, klare Silhouetten und durchdachte Details.</p>
<p>Unsere Philosophie ist einfach: Schönheit entsteht durch Balance. Zwischen Form und Funktion. Zwischen Zurückhaltung und Ausdruck. Zwischen dem Vertrauten und dem Besonderen.</p>
<p>Inspiriert von der Ästhetik der Mathematik, steht ALGEBRA für Präzision, Harmonie und Individualität. Unser charakteristisches Monogramm – ein A mit zwei horizontalen Linien – verkörpert diesen Gedanken.</p>
<p>Von klassischen Poloshirts und hochwertigen Basics bis hin zu ausdrucksstarken Designs unserer Graphic Series verbindet jede Kollektion eine gemeinsame Idee: zeitgemäße Eleganz mit unverwechselbarem Charakter.</p>
<p class="about__credo">Wir glauben nicht an das Überflüssige. Wir glauben an das Wesentliche.</p>
<p class="about__sign"><span>ALGEBRA</span><em>Built on proportion.</em></p>`,
    en: `<p class="about__kicker">Style begins with attitude.</p>
<p class="lead">ALGEBRA is a European fashion label for timeless essentials, clean silhouettes and considered details.</p>
<p>Our philosophy is simple: beauty comes from balance. Between form and function. Between restraint and expression. Between the familiar and the exceptional.</p>
<p>Inspired by the aesthetics of mathematics, ALGEBRA stands for precision, harmony and individuality. Our signature monogram, an A with two horizontal lines, embodies this idea.</p>
<p>From classic polo shirts and refined basics to the expressive designs of our Graphic Series, every collection shares one idea: contemporary elegance with unmistakable character.</p>
<p class="about__credo">We do not believe in the superfluous. We believe in the essential.</p>
<p class="about__sign"><span>ALGEBRA</span><em>Built on proportion.</em></p>`,
    fr: `<p class="about__kicker">Le style commence par une attitude.</p>
<p class="lead">ALGEBRA est une marque de mode européenne d’essentiels intemporels, de silhouettes épurées et de détails réfléchis.</p>
<p>Notre philosophie est simple : la beauté naît de l’équilibre. Entre la forme et la fonction. Entre la retenue et l’expression. Entre le familier et l’exceptionnel.</p>
<p>Inspirée par l’esthétique des mathématiques, ALGEBRA incarne la précision, l’harmonie et l’individualité. Notre monogramme, un A traversé de deux lignes horizontales, porte cette idée.</p>
<p>Des polos classiques et des basiques de grande qualité jusqu’aux créations expressives de notre Graphic Series, chaque collection partage une même idée : une élégance contemporaine au caractère affirmé.</p>
<p class="about__credo">Nous ne croyons pas au superflu. Nous croyons à l’essentiel.</p>
<p class="about__sign"><span>ALGEBRA</span><em>Built on proportion.</em></p>`,
  },
  shipping: {
    de: `<h2>Lieferländer und Kosten</h2><table><thead><tr><th>Land</th><th>Versand</th><th>Kostenlos ab</th></tr></thead><tbody><tr><td>Deutschland</td><td>4,90 €</td><td>100 €</td></tr><tr><td>Frankreich, Österreich, Belgien, Niederlande, Luxemburg</td><td>7,90 €</td><td>150 €</td></tr></tbody></table>
<h2>Versand</h2><p>Mit Sendungsverfolgung, aus der EU.</p>
<h2>Sendungsverfolgung</h2><p>Sobald dein Paket unterwegs ist, bekommst du eine E-Mail mit dem Link zur Sendungsverfolgung. Du kannst den Status auch unter „Bestellung verfolgen“ abrufen.</p>`,
    en: `<h2>Countries and costs</h2><table><thead><tr><th>Country</th><th>Shipping</th><th>Free from</th></tr></thead><tbody><tr><td>Germany</td><td>4.90 €</td><td>100 €</td></tr><tr><td>France, Austria, Belgium, Netherlands, Luxembourg</td><td>7.90 €</td><td>150 €</td></tr></tbody></table>
<h2>Carrier</h2><p>Tracked, from the EU.</p>
<h2>Tracking</h2><p>Once your parcel is on its way you get an email with the tracking link. You can also check the status under “Track order”.</p>`,
    fr: `<h2>Pays et frais</h2><table><thead><tr><th>Pays</th><th>Livraison</th><th>Offerte dès</th></tr></thead><tbody><tr><td>Allemagne</td><td>4,90 €</td><td>100 €</td></tr><tr><td>France, Autriche, Belgique, Pays-Bas, Luxembourg</td><td>7,90 €</td><td>150 €</td></tr></tbody></table>
<h2>Transporteur</h2><p>Avec suivi, depuis l’UE.</p>
<h2>Suivi</h2><p>Dès que votre colis est en route, vous recevez un e-mail avec le lien de suivi. Vous pouvez aussi consulter le statut sous « Suivre ma commande ».</p>`,
  },
  returns: {
    de: `<p>Du kannst deine Bestellung innerhalb von 14 Tagen ab Erhalt ohne Angabe von Gründen widerrufen. Die vollständige Belehrung steht in der <a href="../withdrawal/">Widerrufsbelehrung</a>.</p>
<ol><li>Schreib uns an <strong>${o.email}</strong> mit deiner Bestellnummer, oder nutze das Muster-Widerrufsformular.</li><li>Schicke die Ware an: ${retAddr}.</li><li>Sobald die Ware bei uns ist (oder du die Rücksendung nachweist), erstatten wir den Kaufpreis inklusive der Standard-Versandkosten über die ursprüngliche Zahlungsart, spätestens 14 Tage nach deinem Widerruf.</li></ol>
<p>Die unmittelbaren Kosten der Rücksendung trägst du.</p>`,
    en: `${deFirst.en}<p>You can withdraw from your order within 14 days of receipt without giving reasons. The full notice is on the <a href="../withdrawal/">right of withdrawal</a> page.</p>
<ol><li>Email us at <strong>${o.email}</strong> with your order number, or use the model withdrawal form.</li><li>Send the goods to: ${retAddr}.</li><li>Once they are back (or you prove you sent them), we refund the price including standard shipping to the original payment method, at the latest 14 days after your withdrawal.</li></ol>
<p>You bear the direct cost of returning the goods.</p>`,
    fr: `${deFirst.fr}<p>Vous pouvez vous rétracter dans les 14 jours suivant la réception, sans motif. Le texte complet est sur la page <a href="../withdrawal/">droit de rétractation</a>.</p>
<ol><li>Écrivez-nous à <strong>${o.email}</strong> avec votre numéro de commande, ou utilisez le formulaire type.</li><li>Renvoyez les articles à : ${retAddr}.</li><li>Dès réception (ou preuve de l’envoi), nous remboursons le prix et la livraison standard via le moyen de paiement initial, au plus tard 14 jours après votre rétractation.</li></ol>
<p>Les frais directs de renvoi sont à votre charge.</p>`,
  },
  imprint: {
    de: `<h2>Angaben gemäß § 5 DDG</h2><p>${addr}</p><p>E-Mail: ${o.email}${o.phone ? `<br>Telefon: ${o.phone}` : ''}</p><p>${o.taxNote}</p>
<h2>Verantwortlich für den Inhalt</h2><p>${o.owner}, Anschrift wie oben</p>
<h2>Verbraucherstreitbeilegung</h2><p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
<p>Algebra ist eine Marke von ${o.name}.</p>`,
    en: `${deFirst.en}<p>${addr}</p><p>Email: ${o.email}</p><p>${o.taxNote}: no VAT charged.</p><p>Algebra is a brand of ${o.name}.</p>`,
    fr: `${deFirst.fr}<p>${addr}</p><p>E-mail : ${o.email}</p><p>${o.taxNote} : pas de TVA facturée.</p><p>Algebra est une marque de ${o.name}.</p>`,
  },
  privacy: {
    de: `<h2>1. Verantwortlicher</h2><p>${addr}<br>E-Mail: ${o.email}</p>
<h2>2. Bestellungen</h2><p>Für die Abwicklung Ihrer Bestellung verarbeiten wir: Name, Lieferadresse, E-Mail-Adresse, bestellte Artikel und Beträge. Rechtsgrundlage ist die Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) sowie gesetzliche Aufbewahrungspflichten (Art. 6 Abs. 1 lit. c DSGVO).</p>
<h2>3. Empfänger</h2><ul>
<li><strong>Stripe</strong> (Stripe Payments Europe Ltd., Irland): Zahlungsabwicklung. Ihre Zahlungsdaten gibt nur Stripe ein und verarbeitet sie; wir sehen sie nicht.</li>
<li><strong>Dienstleister für Fertigung und Versand</strong> (Auftragsverarbeiter mit Sitz in der EU): erhalten Name, Lieferadresse und Bestellinhalt, um Ihr Stück zu besticken oder zu bedrucken und zu versenden.</li>
<li><strong>Versanddienstleister</strong>: erhalten die für die Zustellung nötigen Angaben.</li>
<li><strong>Cloudflare</strong> (Cloudflare, Inc., USA): Auslieferung dieser Website, Betrieb der Bestell-Schnittstelle und Speicherung der Bestelldaten (Cloudflare Workers, D1-Datenbank); Datenübermittlung auf Grundlage des EU-US Data Privacy Framework bzw. von Standardvertragsklauseln.</li>
<li><strong>Resend</strong> (Resend, Inc., USA): Versand von Bestell- und Versandbestätigungen sowie des Newsletters; gleiche Grundlage.</li></ul>
<h2>4. Newsletter</h2><p>Nur mit Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) und nach Bestätigung per E-Mail (Double-Opt-in). Wir speichern E-Mail-Adresse, Sprache und Zeitpunkt der Anmeldung und Bestätigung. Abmeldung jederzeit.</p>
<h2>5. Speicher im Browser und Statistik</h2><p>Technisch notwendig und ohne Einwilligung speichern wir im Browser den Inhalt Ihrer Tasche, das Lieferland und Ihre Cookie-Auswahl. Eine Besucherstatistik nutzen wir nur, wenn Sie ihr zustimmen; derzeit ist kein Statistikdienst eingebunden.</p>
<h2>6. Speicherdauer</h2><p>Bestell- und Rechnungsdaten bewahren wir entsprechend den handels- und steuerrechtlichen Fristen auf (bis zu 10 Jahre), andere Daten nur so lange, wie es für den Zweck nötig ist.</p>
<h2>7. Ihre Rechte</h2><p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie das Recht auf Beschwerde bei einer Datenschutzaufsichtsbehörde. Schreiben Sie uns an ${o.email}.</p>`,
    en: `${deFirst.en}<p>Controller: ${addr}, ${o.email}.</p><p>We process the data needed for your order (name, address, e-mail, items). Recipients: Stripe (payment), service providers for making and shipping your piece (processors based in the EU), carriers, Cloudflare (hosting, order API, database), Resend (e-mails). Newsletter only after double opt-in. In your browser we only store your bag, delivery country and cookie choice; no analytics service is active. Your rights: access, rectification, erasure, restriction, portability, objection, complaint to a supervisory authority. Write to ${o.email}.</p>`,
    fr: `${deFirst.fr}<p>Responsable : ${addr}, ${o.email}.</p><p>Nous traitons les données nécessaires à votre commande (nom, adresse, e-mail, articles). Destinataires : Stripe (paiement), des prestataires de fabrication et d’expédition (sous-traitants établis dans l’UE), les transporteurs, Cloudflare (hébergement, API de commande, base de données), Resend (e-mails). Newsletter uniquement après double confirmation. Dans votre navigateur, nous enregistrons seulement votre panier, le pays de livraison et votre choix de cookies ; aucun service de statistiques n’est actif. Vos droits : accès, rectification, effacement, limitation, portabilité, opposition, réclamation auprès d’une autorité. Écrivez à ${o.email}.</p>`,
  },
  terms: {
    de: `<h2>1. Geltungsbereich</h2><p>Diese AGB gelten für alle Bestellungen von Verbrauchern über den Online-Shop Algebra bei ${o.name}, Inhaber ${o.owner}, ${o.street}, ${o.city}.</p>
<h2>2. Vertragsschluss</h2><p>Die Darstellung der Produkte ist kein bindendes Angebot. Mit Klick auf den Bezahl-Button im Bestellprozess (Stripe Checkout) geben Sie ein verbindliches Angebot ab. Der Vertrag kommt mit der Zahlungsbestätigung zustande, die wir Ihnen per E-Mail senden.</p>
<h2>3. Fertigung auf Bestellung</h2><p>Jedes Stück wird nach Ihrer Bestellung aus den angebotenen Größen und Farben gefertigt (bestickt oder bedruckt) und aus der EU versendet.</p>
<h2>4. Preise, Versand und Zahlung</h2><p>Alle Preise sind Endpreise. ${o.taxNote}; daher wird keine Umsatzsteuer berechnet. Versand nach Deutschland 4,90 €, ab 100 € kostenlos; nach Frankreich, Österreich, Belgien, in die Niederlande und nach Luxemburg 7,90 €, ab 150 € kostenlos. Die Zahlung erfolgt über Stripe.</p>
<h2>5. Lieferzeit</h2><p>Die Lieferzeit wird auf der Produktseite und im Bestellprozess angegeben.</p>
<h2>6. Widerrufsrecht</h2><p>Verbrauchern steht ein Widerrufsrecht nach Maßgabe der <a href="../withdrawal/">Widerrufsbelehrung</a> zu.</p>
<h2>7. Gewährleistung</h2><p>Es gelten die gesetzlichen Mängelrechte.</p>
<h2>8. Recht</h2><p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts; zwingende Verbraucherschutzvorschriften des Staates Ihres gewöhnlichen Aufenthalts bleiben unberührt.</p>`,
    en: `${deFirst.en}<p>The contract with ${o.name} is concluded on payment confirmation. Pieces are made to order from the sizes and colours offered. Final prices, no VAT (§ 19 UStG). Shipping: Germany 4.90 € (free from 100 €), FR, AT, BE, NL, LU 7.90 € (free from 150 €). 14-day right of withdrawal. Statutory warranty. German law, without prejudice to mandatory rules of your country.</p>`,
    fr: `${deFirst.fr}<p>Le contrat avec ${o.name} est conclu à la confirmation du paiement. Les pièces sont fabriquées à la commande, dans les tailles et couleurs proposées. Prix finaux, TVA non applicable (§ 19 UStG). Livraison : Allemagne 4,90 € (offerte dès 100 €), FR, AT, BE, NL, LU 7,90 € (offerte dès 150 €). Droit de rétractation de 14 jours. Garantie légale. Droit allemand, sous réserve des règles impératives de votre pays.</p>`,
  },
  withdrawal: {
    de: `<h2>Widerrufsrecht</h2><p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.</p>
<p>Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (${o.name}, ${o.street}, ${o.city}, E-Mail: ${o.email}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist. Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</p>
<h2>Folgen des Widerrufs</h2><p>Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet. Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den Nachweis erbracht haben, dass Sie die Waren zurückgesandt haben, je nachdem, welches der frühere Zeitpunkt ist.</p>
<p>Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, an uns zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden. Bitte senden Sie die Waren an: ${retAddr}. Sie tragen die unmittelbaren Kosten der Rücksendung der Waren. Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.</p>
<h2>Muster-Widerrufsformular</h2><p>(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)</p>
<p>An ${o.name}, ${o.street}, ${o.city}, E-Mail: ${o.email}:<br>
Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)<br>
Bestellt am (*)/erhalten am (*)<br>Name des/der Verbraucher(s)<br>Anschrift des/der Verbraucher(s)<br>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)<br>Datum<br>(*) Unzutreffendes streichen.</p>`,
    en: `${deFirst.en}<p>You may withdraw from this contract within 14 days of receipt without giving reasons, by a clear statement to ${o.name}, ${o.street}, ${o.city}, ${o.email}. We refund all payments, including standard delivery, no later than 14 days after your statement, once the goods are back or their return is proven. Send the goods to: ${retAddr}. You bear the direct cost of returning the goods.</p>`,
    fr: `${deFirst.fr}<p>Vous pouvez vous rétracter dans les 14 jours suivant la réception, sans motif, par une déclaration claire à ${o.name}, ${o.street}, ${o.city}, ${o.email}. Nous remboursons tous les paiements, livraison standard comprise, au plus tard 14 jours après votre déclaration, une fois les articles reçus ou leur renvoi prouvé. Renvoyez les articles à : ${retAddr}. Les frais directs de renvoi sont à votre charge.</p>`,
  },
  cookies: {
    de: `<p>Technisch notwendig (ohne Einwilligung): <code>alg_bag</code> (Inhalt der Tasche), <code>alg_consent</code> (Ihre Auswahl), <code>alg_country</code> (Lieferland). Alles im lokalen Speicher Ihres Browsers, keine Cookies von Dritten.</p><p>Statistik nur mit Ihrer Einwilligung. Derzeit ist kein Statistikdienst eingebunden.</p><p>Sie können Ihre Auswahl jederzeit über „Cookie-Einstellungen“ im Fuß der Seite ändern.</p>`,
    en: `${deFirst.en}<p>Strictly necessary (no consent needed): <code>alg_bag</code>, <code>alg_consent</code>, <code>alg_country</code>, stored in your browser. Statistics only with consent; no analytics service is active today. Change your choice any time via “Cookie settings” in the footer.</p>`,
    fr: `${deFirst.fr}<p>Strictement nécessaires (sans consentement) : <code>alg_bag</code>, <code>alg_consent</code>, <code>alg_country</code>, stockés dans votre navigateur. Statistiques uniquement avec consentement ; aucun service actif aujourd’hui. Modifiez votre choix à tout moment via « Réglages cookies » en bas de page.</p>`,
  },
  accessibility: {
    de: `<p>Wir gestalten den Shop nach WCAG 2.2 AA: Tastaturbedienung, sichtbarer Fokus, Textalternativen, ausreichende Kontraste, beschriftete Formulare.</p><p>Barrieren melden: ${o.email}</p>`,
    en: `${deFirst.en}<p>We build the shop to WCAG 2.2 AA: keyboard use, visible focus, text alternatives, sufficient contrast, labelled forms. Report a barrier: ${o.email}</p>`,
    fr: `${deFirst.fr}<p>Nous concevons la boutique selon le WCAG 2.2 AA : navigation clavier, focus visible, alternatives textuelles, contrastes suffisants, formulaires étiquetés. Signaler un obstacle : ${o.email}</p>`,
  },
};

export const legalTitles = {
  imprint: { de: 'Impressum', en: 'Imprint', fr: 'Mentions légales' },
  privacy: { de: 'Datenschutzerklärung', en: 'Privacy policy', fr: 'Politique de confidentialité' },
  terms: { de: 'AGB', en: 'Terms and conditions', fr: 'Conditions générales de vente' },
  withdrawal: { de: 'Widerrufsbelehrung', en: 'Right of withdrawal', fr: 'Droit de rétractation' },
  shipping: { de: 'Versand', en: 'Shipping', fr: 'Livraison' },
  returns: { de: 'Rücksendungen', en: 'Returns', fr: 'Retours' },
  cookies: { de: 'Cookies', en: 'Cookies', fr: 'Cookies' },
  accessibility: { de: 'Barrierefreiheit', en: 'Accessibility', fr: 'Accessibilité' },
};
