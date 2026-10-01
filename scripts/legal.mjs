/**
 * Legal pages for a German online shop (Kleinunternehmer). German is the
 * authoritative version. Fields in [brackets] come from catalog/site.json and
 * must be completed; have the texts checked before launch (see docs/LEGAL-CHECKLIST.md).
 */
export function legalPages(site) {
  const c = site.company;
  const addr = `${c.name}<br>${c.owner}<br>${c.street}<br>${c.city}<br>${c.country}`;
  const days = site.shipping.deliveryDays;
  const countries = site.shipping.countries.join(', ');

  const de = {
    impressum: `
<h1>Impressum</h1>
<h2>Angaben gemäß § 5 DDG</h2>
<p>${addr}</p>
<h2>Kontakt</h2>
<p>E-Mail: ${c.email}${c.phone ? `<br>Telefon: ${c.phone}` : ''}</p>
<h2>Umsatzsteuer</h2>
<p>${c.taxNote}. Es wird keine Umsatzsteuer ausgewiesen.</p>
<h2>Verbraucherstreitbeilegung</h2>
<p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
<h2>Verantwortlich für den Inhalt</h2>
<p>${c.owner}, Anschrift wie oben.</p>`,

    datenschutz: `
<h1>Datenschutzerklärung</h1>
<h2>1. Verantwortlicher</h2>
<p>${addr}<br>E-Mail: ${c.email}</p>
<h2>2. Welche Daten wir verarbeiten</h2>
<p>Für die Abwicklung Ihrer Bestellung verarbeiten wir: Name, Liefer- und Rechnungsadresse, E-Mail-Adresse, Telefonnummer (für die Zustellung), bestellte Artikel und Beträge. Rechtsgrundlage ist die Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) sowie gesetzliche Aufbewahrungspflichten (Art. 6 Abs. 1 lit. c DSGVO).</p>
<h2>3. Empfänger</h2>
<ul>
<li><strong>Stripe</strong> (Stripe Payments Europe Ltd., Irland): Zahlungsabwicklung und Rechnungsversand. Ihre Zahlungsdaten gibt Stripe nicht an uns weiter.</li>
<li><strong>Unser Lieferant / Versandlager</strong> (CJdropshipping): erhält Name, Lieferadresse, Telefonnummer und E-Mail, um Ihre Bestellung zu verpacken und zu versenden. Die Ware kann aus einem Lager außerhalb der EU versendet werden; die Übermittlung erfolgt zur Vertragserfüllung (Art. 49 Abs. 1 lit. b DSGVO).</li>
<li><strong>Versanddienstleister</strong>: erhalten die für die Zustellung nötigen Angaben.</li>
<li><strong>Netlify</strong> (Netlify Inc., USA): Hosting dieser Website und Speicherung der Bestelldaten; Datenübermittlung auf Grundlage des EU-US Data Privacy Framework bzw. von Standardvertragsklauseln.</li>
</ul>
<h2>4. Speicherdauer</h2>
<p>Bestell- und Rechnungsdaten bewahren wir entsprechend den handels- und steuerrechtlichen Fristen auf (bis zu 10 Jahre), andere Daten nur so lange, wie es für die Bestellung nötig ist.</p>
<h2>5. Cookies und Tracking</h2>
<p>Diese Website setzt keine Tracking- oder Werbe-Cookies und lädt keine externen Schriftarten. Der Warenkorb wird nur lokal in Ihrem Browser gespeichert.</p>
<h2>6. Ihre Rechte</h2>
<p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie das Recht auf Beschwerde bei einer Datenschutzaufsichtsbehörde. Schreiben Sie uns an ${c.email}.</p>`,

    agb: `
<h1>Allgemeine Geschäftsbedingungen</h1>
<h2>§ 1 Geltungsbereich</h2>
<p>Diese AGB gelten für alle Bestellungen von Verbrauchern über diesen Online-Shop bei ${c.name}, ${c.street}, ${c.city}.</p>
<h2>§ 2 Vertragsschluss</h2>
<p>Die Darstellung der Produkte ist kein bindendes Angebot. Mit Klick auf den Bezahl-Button im Bestellprozess geben Sie ein verbindliches Angebot ab. Der Vertrag kommt mit der Zahlungsbestätigung zustande, die wir Ihnen per E-Mail senden.</p>
<h2>§ 3 Preise und Zahlung</h2>
<p>Alle Preise sind Endpreise. ${c.taxNote}; daher wird keine Umsatzsteuer berechnet. Die Zahlung erfolgt über Stripe (Karte, Apple Pay, Google Pay u. a.). Der Versand ist kostenlos, sofern nicht anders angegeben.</p>
<h2>§ 4 Lieferung</h2>
<p>Wir liefern nach: ${countries}. Die Lieferzeit beträgt in der Regel ${days} Werktage ab Zahlungseingang. Die Ware wird direkt von unserem Versandlager an Sie geschickt.</p>
<h2>§ 5 Eigentumsvorbehalt</h2>
<p>Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.</p>
<h2>§ 6 Widerrufsrecht</h2>
<p>Verbrauchern steht ein Widerrufsrecht zu; siehe <a href="widerruf.html">Widerrufsbelehrung</a>.</p>
<h2>§ 7 Gewährleistung</h2>
<p>Es gilt das gesetzliche Mängelhaftungsrecht.</p>
<h2>§ 8 Schlussbestimmungen</h2>
<p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts; zwingende Verbraucherschutzvorschriften des Staates Ihres gewöhnlichen Aufenthalts bleiben unberührt.</p>`,

    widerruf: `
<h1>Widerrufsbelehrung</h1>
<h2>Widerrufsrecht</h2>
<p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.</p>
<p>Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (${c.name}, ${c.street}, ${c.city}, E-Mail: ${c.email}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist. Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</p>
<h2>Folgen des Widerrufs</h2>
<p>Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet. Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den Nachweis erbracht haben, dass Sie die Waren zurückgesandt haben, je nachdem, welches der frühere Zeitpunkt ist.</p>
<p>Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, an uns zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden. [Rücksendeanschrift und Tragung der Rücksendekosten — à compléter.] Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.</p>
<h2>Muster-Widerrufsformular</h2>
<p>(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)</p>
<p>An ${c.name}, ${c.street}, ${c.city}, E-Mail: ${c.email}:<br>
Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)<br>
— Bestellt am (*)/erhalten am (*)<br>— Name des/der Verbraucher(s)<br>— Anschrift des/der Verbraucher(s)<br>— Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)<br>— Datum<br>(*) Unzutreffendes streichen.</p>`,

    versand: `
<h1>Versand & Zahlung</h1>
<h2>Versand</h2>
<p>Lieferländer: ${countries}. Der Versand ist kostenlos und erfolgt mit Sendungsverfolgung. Lieferzeit: in der Regel ${days} Werktage ab Zahlungseingang. Ihre Sendungsnummer finden Sie unter <a href="bestellung.html">Bestellung verfolgen</a>.</p>
<h2>Zahlung</h2>
<p>Die Zahlung erfolgt sicher über Stripe: Kreditkarte, Apple Pay, Google Pay und weitere angezeigte Methoden. Die Rechnung erhalten Sie automatisch per E-Mail.</p>
<h2>Zölle und Einfuhrabgaben</h2>
<p>[Hinweis zu Einfuhrumsatzsteuer/IOSS je nach Versandlager — à valider, voir docs/LEGAL-CHECKLIST.md.]</p>`,
  };

  const note = (lang) =>
    lang === 'fr'
      ? '<p class="legal-note">Traduction pour information — la version allemande fait foi.</p>'
      : '<p class="legal-note">Translation for information — the German version is authoritative.</p>';

  // FR/EN: short translations pointing to the authoritative German text.
  const short = {
    fr: {
      impressum: `<h1>Mentions légales</h1><p>${addr}</p><p>E-mail : ${c.email}</p><p>${c.taxNote} : pas de TVA facturée.</p>`,
      datenschutz: `<h1>Confidentialité</h1><p>Nous traitons les données nécessaires à votre commande (nom, adresses, e-mail, téléphone, articles). Destinataires : Stripe (paiement et facture), notre fournisseur/entrepôt CJdropshipping (expédition, possiblement hors UE), les transporteurs et Netlify (hébergement). Aucun cookie de suivi. Vos droits : accès, rectification, effacement, opposition — écrivez à ${c.email}.</p>`,
      agb: `<h1>Conditions générales de vente</h1><p>Le contrat est conclu à la confirmation du paiement. Prix finaux, TVA non applicable (§ 19 UStG). Livraison vers ${countries} en ${days} jours ouvrés, offerte. Droit de rétractation de 14 jours. Droit allemand, sous réserve des règles impératives de votre pays.</p>`,
      widerruf: `<h1>Droit de rétractation</h1><p>Vous pouvez vous rétracter dans les 14 jours suivant la réception, sans motif, par une déclaration claire à ${c.email}. Nous remboursons tous les paiements, livraison standard comprise, au plus tard 14 jours après votre déclaration, une fois les articles reçus ou leur renvoi prouvé.</p>`,
      versand: `<h1>Livraison & paiement</h1><p>Livraison suivie offerte vers ${countries}, en ${days} jours ouvrés. Paiement via Stripe ; facture automatique par e-mail.</p>`,
    },
    en: {
      impressum: `<h1>Legal notice</h1><p>${addr}</p><p>E-mail: ${c.email}</p><p>${c.taxNote}: no VAT charged.</p>`,
      datenschutz: `<h1>Privacy</h1><p>We process the data needed for your order (name, addresses, e-mail, phone, items). Recipients: Stripe (payment and invoice), our supplier/warehouse CJdropshipping (shipping, possibly outside the EU), carriers and Netlify (hosting). No tracking cookies. Your rights: access, rectification, erasure, objection — write to ${c.email}.</p>`,
      agb: `<h1>Terms and conditions</h1><p>The contract is concluded on payment confirmation. Final prices, no VAT (§ 19 UStG). Free delivery to ${countries} in ${days} working days. 14-day right of withdrawal. German law, without prejudice to mandatory rules of your country.</p>`,
      widerruf: `<h1>Right of withdrawal</h1><p>You may withdraw within 14 days of receipt without giving reasons, by a clear statement to ${c.email}. We refund all payments, including standard delivery, no later than 14 days after your statement, once the goods are back or their return is proven.</p>`,
      versand: `<h1>Shipping & payment</h1><p>Free tracked shipping to ${countries}, in ${days} working days. Payment through Stripe; invoice sent automatically by e-mail.</p>`,
    },
  };

  return {
    de,
    fr: Object.fromEntries(Object.entries(short.fr).map(([k, v]) => [k, v + note('fr')])),
    en: Object.fromEntries(Object.entries(short.en).map(([k, v]) => [k, v + note('en')])),
  };
}
