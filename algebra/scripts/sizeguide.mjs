// Size guide: measured garment (flat), print size on the back, one diagram per cut (06.11.2026).
// Sources: Stanley/Stella Creator 2.0 (STTU169) and Stella Muser (STTW172) size charts; print sizes = our Printegy files.
const T = {
  de: { intro: 'Maße am flach liegenden Shirt, in cm. Herstellerangaben, ± 1–2 cm.', size: 'Größe', chest: 'Brustbreite', length: 'Länge', sleeve: 'Ärmel', print: 'Druck Rücken (B × H)', unisex: 'Unisex (gerader Schnitt)', women: 'Damen (gerader Schnitt)', fitted: 'Damen tailliert', printNote: 'In XS und S ist der Druck kleiner, damit das Motiv im gleichen Verhältnis auf dem Rücken sitzt.', a: 'Symbol: 25 mm breit, linke Brust.', front: 'Vorne', back: 'Hinten' },
  en: { intro: 'Garment measured flat, in cm. Manufacturer figures, ± 1–2 cm.', size: 'Size', chest: 'Chest width', length: 'Length', sleeve: 'Sleeve', print: 'Back print (W × H)', unisex: 'Unisex (straight cut)', women: 'Women (straight cut)', fitted: 'Women’s fitted', printNote: 'In XS and S the print is smaller, so the drawing keeps the same proportion on the back.', a: 'Symbol: 25 mm wide, left chest.', front: 'Front', back: 'Back' },
  fr: { intro: 'Vêtement mesuré à plat, en cm. Données fabricant, ± 1–2 cm.', size: 'Taille', chest: 'Largeur poitrine', length: 'Longueur', sleeve: 'Manche', print: 'Impression dos (L × H)', unisex: 'Unisexe (coupe droite)', women: 'Femme (coupe droite)', fitted: 'Femme cintrée', printNote: 'En XS et S, l’impression est plus petite pour que le dessin garde la même proportion sur le dos.', a: 'Symbole : 25 mm de large, poitrine gauche.', front: 'Devant', back: 'Dos' },
};
const CUTS = {
  unisex: [
    ['XS', 47.5, 65, 21, '35 × 44'], ['S', 49.5, 69, 22.5, '35 × 44'], ['M', 53.5, 73, 24, '39 × 49'],
    ['L', 56.5, 75, 24.5, '39 × 49'], ['XL', 59.5, 77, 25, '39 × 49'], ['XXL', 63.5, 79, 25.5, '39 × 49'],
  ],
  women: [
    ['XS', 45, 56.5, 18, '29 × 36'], ['S', 48, 59.5, 18.5, '29 × 36'], ['M', 51, 61.5, 19, '29 × 36'],
    ['L', 54, 63.5, 19.5, '29 × 36'], ['XL', 57, 65.5, 20, '29 × 36'],
  ],
  // B&C #E190 women (manufacturer chart: half chest, body length; sleeve not published)
  fitted: [
    ['XS', 41, 58, null, '29 × 36'], ['S', 44, 60, null, '29 × 36'], ['M', 47, 62, null, '33 × 41'],
    ['L', 50, 64, null, '33 × 41'], ['XL', 53, 66, null, '33 × 41'],
  ],
};
const n = (v, lang) => (lang === 'en' ? String(v) : String(v).replace('.', ','));
// one tee outline, front (with the A position) and back (with the print box), measured on size M
function diagram(L, { w, l, pw, ph }) {
  const s = 3.2; // px per cm
  const W = w * s, H = l * s, sl = 14 * s, nk = 9 * s;
  const tee = (x) => `<path d="M${x + W * 0.22} 20 Q${x + W / 2} ${20 + nk} ${x + W * 0.78} 20 L${x + W + sl * 0.9} ${20 + sl * 0.55} L${x + W + sl * 0.55} ${20 + sl * 1.25} L${x + W} ${20 + sl * 0.95} L${x + W} ${20 + H} L${x} ${20 + H} L${x} ${20 + sl * 0.95} L${x - sl * 0.55} ${20 + sl * 1.25} L${x - sl * 0.9} ${20 + sl * 0.55} Z" fill="none" stroke="currentColor" stroke-width="1.2"/>`;
  const gap = 150, x1 = 70, x2 = x1 + W + gap, vw = x2 + W + 80, vh = H + 90;
  const ax = x1 + W * 0.72, ay = 20 + 0.2 * H;
  const px = x2 + (W - pw * s) / 2, py = 20 + 3.5 * s;
  return `<svg class="sg__svg" viewBox="0 0 ${vw} ${vh}" role="img" aria-label="${L.front} / ${L.back}">
${tee(x1)}${tee(x2)}
<path d="M${ax - 5} ${ay + 5} L${ax} ${ay - 5} L${ax + 5} ${ay + 5} M${ax - 2.5} ${ay + 1.5} H${ax + 2.5} M${ax - 3} ${ay + 3.5} H${ax + 3}" stroke="currentColor" stroke-width="1" fill="none"/>
<line x1="${x1}" y1="${20 + sl * 1.25 + 14}" x2="${x1 + W}" y2="${20 + sl * 1.25 + 14}" stroke="currentColor" stroke-width=".8" marker-start="url(#sga)" marker-end="url(#sga)"/>
<text x="${x1 + W / 2}" y="${20 + sl * 1.25 + 8}" text-anchor="middle" class="sg__lb">${L.chest} ${String(w).replace('.', ',')} cm</text>
<line x1="${x1 - 26}" y1="20" x2="${x1 - 26}" y2="${20 + H}" stroke="currentColor" stroke-width=".8" marker-start="url(#sga)" marker-end="url(#sga)" transform="translate(${-sl * 0.2},0)"/>
<text x="${x1 - 40 - sl * 0.2}" y="${20 + H / 2}" text-anchor="middle" class="sg__lb" transform="rotate(-90 ${x1 - 40 - sl * 0.2} ${20 + H / 2})">${L.length} ${String(l).replace('.', ',')} cm</text>
<rect x="${px}" y="${py}" width="${pw * s}" height="${ph * s}" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="${px + (pw * s) / 2}" y="${py + (ph * s) / 2}" text-anchor="middle" class="sg__lb">${pw} × ${ph} cm</text>
<text x="${x1 + W / 2}" y="${vh - 10}" text-anchor="middle" class="sg__cap">${L.front} · M</text>
<text x="${x2 + W / 2}" y="${vh - 10}" text-anchor="middle" class="sg__cap">${L.back} · M</text>
<defs><marker id="sga" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 2 L8 5 L2 8" fill="none" stroke="currentColor"/></marker></defs>
</svg>`;
}
function table(L, rows, lang) {
  return `<table class="sg__tbl"><thead><tr><th>${L.size}</th><th>${L.chest}</th><th>${L.length}</th><th>${L.sleeve}</th><th>${L.print}</th></tr></thead><tbody>${rows.map(([s, c, l, sl, p]) => `<tr><td><strong>${s}</strong></td><td>${n(c, lang)}</td><td>${n(l, lang)}</td><td>${sl == null ? '–' : n(sl, lang)}</td><td>${p}</td></tr>`).join('')}</tbody></table>`;
}
export function sizeGuide(lang) {
  const L = T[lang];
  const u = CUTS.unisex[2], w = CUTS.women[2], f = CUTS.fitted[2];
  return `<p>${L.intro}</p>
<section class="sg"><h2>${L.unisex}</h2>${diagram(L, { w: u[1], l: u[2], pw: 39, ph: 49 })}${table(L, CUTS.unisex, lang)}</section>
<section class="sg"><h2>${L.women}</h2>${diagram(L, { w: w[1], l: w[2], pw: 29, ph: 36 })}${table(L, CUTS.women, lang)}</section>
<section class="sg"><h2>${L.fitted}</h2>${diagram(L, { w: f[1], l: f[2], pw: 33, ph: 41 })}${table(L, CUTS.fitted, lang)}</section>
<p class="small">${L.printNote} ${L.a}</p>`;
}
