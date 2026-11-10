/**
 * Graphic Series AW26: the nine chapters (owner text 10.11.2026, FR original; DE/EN translated).
 * Keys = catalog graphic keys. Order = the order of the series. Public copy: no supplier data.
 * Changes to the owner draft: Mandelbrot "la plus petite broderie" → "le plus petit détail" (the series is printed);
 * Maxwell "le geste de l'artisan…" → copper as the colour of the sign and the drawings (no craft claim).
 */
export const series = {
  title: {
    de: 'Neun Ausdrucksformen. Eine Philosophie.',
    en: 'Nine Expressions. One Philosophy.',
    fr: 'Neuf expressions. Une philosophie.',
  },
  poem: {
    de: ['Es gibt die Verbindungen, die man nicht sieht.', 'Die Formen, die sich wiederholen.', 'Die Kräfte, die sich übertragen.', 'Die Bewegungen, die man nicht vorhersehen kann.', 'Die Strukturen, die der Materie ihren Charakter geben.', 'Und die Anfänge, die unzählige Möglichkeiten in sich tragen.'],
    en: ['There are the bonds we cannot see.', 'The forms that repeat themselves.', 'The forces that are passed on.', 'The movements no one can predict.', 'The structures that give matter its character.', 'And the beginnings that carry countless possibilities.'],
    fr: ['Il y a les liens que l’on ne voit pas.', 'Les formes qui se répètent.', 'Les forces qui se transmettent.', 'Les mouvements que l’on ne peut prévoir.', 'Les structures qui donnent à la matière son caractère.', 'Et les commencements qui portent en eux d’innombrables possibilités.'],
  },
  outro: {
    de: ['Von den Samen des Awélé bis zu den Diagrammen von Feynman, von überlieferten Geometrien bis zu den Figuren von Mandelbrot: Algebra erkundet die Sprachen, mit denen der Mensch die Welt zu verstehen sucht.', 'Jede Kreation ist ein Fragment dieser Suche. Jedes Motiv eine Einladung, weiter zu sehen als der Schein. Jedes Detail ein Ausdruck des Ganzen.', 'Wir tragen nicht nur Bilder. Wir tragen Ideen.'],
    en: ['From the seeds of Awélé to the diagrams of Feynman, from geometries handed down by tradition to the figures of Mandelbrot, Algebra explores the languages through which we try to understand the world.', 'Each creation is a fragment of that search. Each motif, an invitation to look beyond appearances. Each detail, an expression of the whole.', 'We do not only wear images. We wear ideas.'],
    fr: ['Des graines d’Awélé aux diagrammes de Feynman, des géométries transmises par les traditions aux figures de Mandelbrot, Algebra explore les langages par lesquels l’humanité cherche à comprendre le monde.', 'Chaque création est un fragment de cette recherche. Chaque motif, une invitation à regarder plus loin que l’apparence. Chaque détail, une expression de l’ensemble.', 'Nous ne portons pas seulement des images. Nous portons des idées.'],
  },
};

export const chapters = {
  entanglement: {
    title: { de: 'Die Kunst der unsichtbaren Verbindungen', en: 'The art of invisible bonds', fr: 'L’art des liens invisibles' },
    dialogue: { de: 'Im Dialog mit Leere und gegenseitiger Abhängigkeit.', en: 'In dialogue with emptiness and interdependence.', fr: 'Dialogue avec la vacuité et l’interdépendance.' },
    text: {
      de: ['Zwei Systeme können Quantenkorrelationen bewahren, die über das hinausgehen, was unsere klassische Intuition nahelegt.', 'Diese physikalische Wirklichkeit trifft im Nachdenken auf eine alte Frage: Können wir ein Ding verstehen, ohne seine Beziehungen zu betrachten?', 'Für Algebra steht die Verschränkung für eine Eleganz, in der jedes Detail zu einem größeren Ganzen gehört.'],
      en: ['Two systems can keep quantum correlations beyond what our classical intuition suggests.', 'In reflection, this physical reality meets an old question: can we understand a thing without considering its relations?', 'For Algebra, entanglement inspires an elegance in which every detail belongs to a larger whole.'],
      fr: ['Deux systèmes peuvent conserver des corrélations quantiques au-delà de ce que suggère notre intuition classique.', 'Cette réalité physique rencontre, sur le terrain de la réflexion, une question ancienne : pouvons-nous comprendre une chose sans considérer ses relations ?', 'Pour Algebra, l’intrication inspire une élégance dans laquelle chaque détail appartient à un ensemble plus vaste.'],
    },
    close: { de: 'Was uns verbindet, ist nicht immer sichtbar.', en: 'What connects us is not always visible.', fr: 'Ce qui nous relie ne se voit pas toujours.' },
  },
  euler: {
    title: { de: 'Die Schönheit des Wesentlichen', en: 'The beauty of the essential', fr: 'La beauté de l’essentiel' },
    dialogue: { de: 'Im Dialog mit dem Awélé und der Einfachheit der Regeln.', en: 'In dialogue with Awélé and the simplicity of rules.', fr: 'Dialogue avec l’Awélé et la simplicité des règles.' },
    text: {
      de: ['Eulers Denken zeigt, wie mathematische Beziehungen Begriffe vereinen können, die weit voneinander entfernt scheinen.', 'Wie beim Awélé, wo wenige Regeln eine Fülle von Strategien hervorbringen, entsteht Komplexität manchmal aus einer erstaunlich knappen Struktur.', 'Für Algebra folgt Luxus diesem Prinzip: wenige Elemente, jedes genau an seinem Platz.'],
      en: ['Euler’s thinking shows how mathematical relations can unite notions that seem far apart.', 'As in Awélé, where a few rules give rise to a wealth of strategies, complexity sometimes emerges from a strikingly concise structure.', 'For Algebra, luxury follows this principle: few elements, each exactly in its place.'],
      fr: ['La pensée d’Euler révèle comment des relations mathématiques peuvent unir des notions qui semblent éloignées.', 'Comme dans l’Awélé, où quelques règles donnent naissance à une richesse de stratégies, la complexité surgit parfois d’une structure étonnamment concise.', 'Pour Algebra, le luxe suit ce principe : peu d’éléments, mais chacun parfaitement à sa place.'],
    },
    close: { de: 'Raffinesse beginnt, wo nichts überflüssig ist.', en: 'Sophistication begins when nothing is superfluous.', fr: 'La sophistication commence lorsque rien n’est superflu.' },
  },
  lorenz: {
    title: { de: 'Die Eleganz des Unvorhersehbaren', en: 'The elegance of the unpredictable', fr: 'L’élégance de l’imprévisible' },
    dialogue: { de: 'Im Dialog mit der Vergänglichkeit.', en: 'In dialogue with impermanence.', fr: 'Dialogue avec l’impermanence.' },
    text: {
      de: ['In manchen dynamischen Systemen kann ein winziger Unterschied am Anfang zu einer völlig anderen Entwicklung führen.', 'Der Lorenz-Attraktor gibt dieser Empfindlichkeit eine eindrucksvolle Form. Er erinnert daran, dass die Welt nicht stillsteht und Gleichgewicht nicht Abwesenheit von Bewegung bedeutet.', 'Bei Algebra schließt Beherrschung die Überraschung nicht aus. Tradition verbietet keine Veränderung.'],
      en: ['In some dynamical systems, a tiny initial difference can lead to a profoundly different evolution.', 'The Lorenz attractor gives this sensitivity a striking shape. It reminds us that the world is not still, and that balance does not mean the absence of movement.', 'At Algebra, mastery does not exclude surprise. Tradition does not forbid change.'],
      fr: ['Dans certains systèmes dynamiques, une infime différence initiale peut entraîner une évolution profondément différente.', 'L’attracteur de Lorenz donne une forme saisissante à cette sensibilité. Il nous rappelle que le monde n’est pas immobile et que l’équilibre ne signifie pas l’absence de mouvement.', 'Chez Algebra, la maîtrise n’exclut pas la surprise. La tradition n’interdit pas le changement.'],
    },
    close: { de: 'Eleganz heißt nicht, die Zeit anzuhalten, sondern ihre Wandlungen zu durchqueren.', en: 'Elegance is not freezing time, but moving through its transformations.', fr: 'L’élégance n’est pas de figer le temps, mais de traverser ses transformations.' },
  },
  maxwell: {
    title: { de: 'Das Licht des Unsichtbaren', en: 'The light of the invisible', fr: 'La lumière de l’invisible' },
    dialogue: { de: 'Im Dialog mit dem Kupfer und der Übertragung.', en: 'In dialogue with copper and transmission.', fr: 'Dialogue avec le cuivre et la transmission.' },
    text: {
      de: ['Maxwells Arbeiten haben die Beschreibungen von Elektrizität, Magnetismus und Licht vereint.', 'Kupfer, seit Langem ein Leiter in den Techniken des Menschen, wird hier zu einem treffenden Symbol: ein altes Material im Herzen moderner Erfindungen.', 'Bei Algebra ist Kupfer die Farbe, die unser Zeichen und unsere Zeichnungen durchzieht.'],
      en: ['Maxwell’s work unified the descriptions of electricity, magnetism and light.', 'Copper, long used as a conductor in human techniques, becomes a fitting symbol here: an ancient material at the heart of modern inventions.', 'At Algebra, copper is the colour that runs through our sign and our drawings.'],
      fr: ['Les travaux de Maxwell ont unifié les descriptions de l’électricité, du magnétisme et de la lumière.', 'Le cuivre, conducteur utilisé depuis longtemps dans les techniques humaines, devient ici un symbole particulièrement juste : une matière ancienne au cœur d’innovations modernes.', 'Chez Algebra, le cuivre est la couleur qui traverse notre signe et nos dessins.'],
    },
    close: { de: 'Manche Kräfte sieht man nicht. Ihre Wirkung verändert die Welt.', en: 'Some forces cannot be seen. Their effects transform the world.', fr: 'Certaines forces ne se voient pas. Leurs effets transforment le monde.' },
  },
  mandelbrot: {
    title: { de: 'Das Unendliche im Detail', en: 'The infinite in the detail', fr: 'L’infini dans le détail' },
    dialogue: { de: 'Im Dialog mit der Selbstähnlichkeit und den traditionellen Geometrien.', en: 'In dialogue with self-similarity and traditional geometries.', fr: 'Dialogue avec l’autosimilarité et les géométries traditionnelles.' },
    text: {
      de: ['Die fraktale Geometrie erforscht Strukturen, deren Komplexität sich erneuert, wenn man den Maßstab wechselt.', 'Auch manche künstlerische und architektonische Traditionen haben sich wiederholende oder selbstähnliche geometrische Ordnungen entwickelt.', 'Für Algebra ist das ein Gestaltungsversprechen: Das kleinste Detail soll dieselbe Identität ausdrücken wie die ganze Silhouette.'],
      en: ['Fractal geometry explores structures whose complexity renews itself as the scale changes.', 'Some artistic and architectural traditions have also developed repeating or self-similar geometric orders.', 'For Algebra, this is a design promise: the smallest detail should express the same identity as the whole silhouette.'],
      fr: ['La géométrie fractale explore des structures dont la complexité se renouvelle lorsqu’on change d’échelle.', 'Certaines traditions artistiques et architecturales ont, elles aussi, développé des organisations géométriques répétitives ou autosimilaires.', 'Pour Algebra, c’est une promesse de design : le plus petit détail doit exprimer la même identité que la silhouette entière.'],
    },
    close: { de: 'Das Detail ist nicht nebensächlich. Es trägt den Geist des Ganzen.', en: 'The detail is not secondary. It holds the spirit of the whole.', fr: 'Le détail n’est pas secondaire. Il contient l’esprit de l’ensemble.' },
  },
  higgs: {
    title: { de: 'Was dem Unsichtbaren Gestalt gibt', en: 'What gives the invisible a body', fr: 'Ce qui donne corps à l’invisible' },
    dialogue: { de: 'Im Dialog mit Immanenz und Emergenz.', en: 'In dialogue with immanence and emergence.', fr: 'Dialogue avec l’immanence et l’émergence.' },
    text: {
      de: ['Das Higgs-Feld wirkt in dem Mechanismus, durch den bestimmte Elementarteilchen ihre Masse erhalten.', 'Diese Entdeckung lädt ein, über das unmittelbar Sichtbare hinauszublicken, zu den physikalischen Strukturen, die zu den Eigenschaften der Materie beitragen.', 'Ohne Wissenschaft und Metaphysik zu vermischen, schöpft Algebra daraus eine ästhetische Überzeugung: Wahrer Wert hängt nicht nur davon ab, was sich zeigt.'],
      en: ['The Higgs field plays a part in the mechanism by which certain elementary particles acquire their mass.', 'This discovery invites us to look beyond what appears at first, towards the physical structures that contribute to the properties of matter.', 'Without confusing science and metaphysics, Algebra draws an aesthetic conviction from it: deep value does not depend only on what is shown.'],
      fr: ['Le champ de Higgs intervient dans le mécanisme par lequel certaines particules élémentaires acquièrent leur masse.', 'Cette découverte nous invite à regarder au-delà de ce qui apparaît immédiatement, vers les structures physiques qui contribuent aux propriétés de la matière.', 'Sans confondre science et métaphysique, Algebra y puise une conviction esthétique : la valeur profonde ne dépend pas seulement de ce qui se montre.'],
    },
    close: { de: 'Wahrer Luxus verkündet sich nicht. Er offenbart sich.', en: 'True luxury does not announce itself. It reveals itself.', fr: 'Le luxe véritable ne se proclame pas. Il se révèle.' },
  },
  'big-bang': {
    title: { de: 'Das Erbe der Anfänge', en: 'The legacy of beginnings', fr: 'L’héritage des commencements' },
    dialogue: { de: 'Im Dialog mit dem Samen des Awélé und der Weitergabe.', en: 'In dialogue with the Awélé seed and transmission.', fr: 'Dialogue avec la graine d’Awélé et la transmission.' },
    text: {
      de: ['Das Urknallmodell beschreibt die Entwicklung des Universums aus einem extrem heißen und dichten Anfangszustand.', 'In einem ganz anderen Maßstab eröffnet ein Samen des Awélé eine Folge von Zügen und Möglichkeiten. Diese Annäherung ist keine physikalische Gleichsetzung, sondern ein Gründungsbild: Ein Anfang kann eine ungeheure Geschichte in sich tragen.', 'Auch jede Kreation von Algebra beginnt mit einer Absicht, einem Material, einer Geste.'],
      en: ['The Big Bang model describes the evolution of the universe from an extremely hot and dense initial state.', 'On a completely different scale, an Awélé seed opens a succession of moves and possibilities. This is not a physical equivalence but a founding image: a beginning can carry an immense story within it.', 'Every Algebra creation, too, begins with an intention, a material, a gesture.'],
      fr: ['Le modèle du Big Bang décrit l’évolution de l’Univers depuis un état initial extrêmement chaud et dense.', 'À une tout autre échelle, une graine d’Awélé ouvre une succession de mouvements et de possibilités. Ce rapprochement n’est pas une équivalence physique. C’est une image fondatrice : un commencement peut porter en lui une histoire immense.', 'Chaque création Algebra commence elle aussi par une intention, une matière, un geste.'],
    },
    close: { de: 'Jede große Geschichte hat einen ersten Zug.', en: 'Every great story has a first move.', fr: 'Toute grande histoire possède un premier mouvement.' },
  },
  feynman: {
    title: { de: 'Die Intelligenz des Strichs', en: 'The intelligence of the line', fr: 'L’intelligence du trait' },
    dialogue: { de: 'Im Dialog mit algorithmischem Denken und symbolischen Sprachen.', en: 'In dialogue with algorithmic thinking and symbolic languages.', fr: 'Dialogue avec la pensée algorithmique et les langages symboliques.' },
    text: {
      de: ['Feynman-Diagramme bieten eine grafische Art, Rechnungen zu Wechselwirkungen zwischen Teilchen zu ordnen.', 'Wie die Regeln eines Spiels oder die Struktur eines Musters zeigen sie die Kraft einer präzisen Bildsprache. Ein Strich wird zur Beziehung. Eine Anordnung drückt eine komplexe Idee aus.', 'Bei Algebra suchen wir dieselbe Ökonomie des Zeichens: viel Bedeutung mit sehr wenig Material.'],
      en: ['Feynman diagrams offer a graphic way to organise calculations about interactions between particles.', 'Like the rules of a game or the structure of a pattern, they show the power of a precise visual language. A line becomes a relation. A configuration expresses a complex idea.', 'At Algebra, we seek the same economy of the sign: a great deal of meaning with very little matter.'],
      fr: ['Les diagrammes de Feynman offrent une manière graphique d’organiser des calculs relatifs aux interactions entre particules.', 'Comme les règles d’un jeu ou les structures d’un motif, ils montrent la puissance d’un langage visuel précis. Un trait devient une relation. Une configuration exprime une idée complexe.', 'Chez Algebra, nous recherchons cette même économie du signe : donner beaucoup de sens à très peu de matière.'],
    },
    close: { de: 'Ein genauer Strich kann ein Universum erzählen.', en: 'A precise line can tell a universe.', fr: 'Un trait juste peut raconter un univers.' },
  },
  mobius: {
    title: { de: 'Die Kunst der Einheit', en: 'The art of unity', fr: 'L’art de l’unité' },
    dialogue: { de: 'Im Dialog mit Immanenz, Vergänglichkeit und Gleichgewicht.', en: 'In dialogue with immanence, impermanence and balance.', fr: 'Dialogue avec l’immanence, l’impermanence et l’équilibre.' },
    text: {
      de: ['Ein einfaches Band. Eine halbe Drehung. Eine Form, die unsere Intuition auf den Kopf stellt.', 'Das Möbiusband hat nur eine Seite und nur eine Kante. Was wie zwei entgegengesetzte Seiten aussieht, gehört zu einer einzigen, durchgehenden Fläche.', 'Innen und außen. Erbe und Erneuerung. Hier und anderswo. Keine Welten, die einander entgegenstehen müssen, sondern Dimensionen, die zusammenfinden können. Bei Algebra steht Möbius für Kontinuität durch Wandel.'],
      en: ['A simple strip. A half twist. A shape that overturns our intuition.', 'The Möbius strip has only one side and only one edge. What looks like two opposite sides belongs to one continuous surface.', 'Inside and outside. Heritage and innovation. Here and elsewhere. Not worlds bound to oppose each other, but dimensions able to meet. At Algebra, Möbius expresses continuity through transformation.'],
      fr: ['Un simple ruban. Une demi-torsion. Une forme qui bouleverse notre intuition.', 'Le ruban de Möbius ne possède qu’une seule face et un seul bord. Ce qui paraît être deux côtés opposés appartient en réalité à une même surface continue.', 'L’intérieur et l’extérieur. L’héritage et l’innovation. L’ici et l’ailleurs. Non pas des mondes condamnés à s’opposer, mais des dimensions capables de se rejoindre. Chez Algebra, Möbius exprime la continuité à travers la transformation.'],
    },
    close: { de: 'Eine einzige Fläche. Unendlich viele Perspektiven.', en: 'One single surface. An infinity of perspectives.', fr: 'Une seule surface. Une infinité de perspectives.' },
  },
};
