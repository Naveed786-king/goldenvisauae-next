// Picture prompts for the Auto Publisher — no imports, so they can be unit-tested with plain Node.

// Visa and residency themes only, people-free (AI pictures fail the realism check mostly on hands,
// faces and anything with writing). Passports are always closed with a plain cover, cards are blank.
const SCENES = [
  'a closed navy-blue passport with a plain cover (no emblem, no writing) resting on a light marble desk beside a cup of Arabic coffee, a window with the Dubai skyline softly out of focus behind',
  'a blank matte-gold card and a closed plain passport on a walnut desk in warm window light, Burj Khalifa visible through the window',
  'two hard-shell suitcases standing by a floor-to-ceiling window overlooking the Dubai Marina towers at golden hour, an empty bright apartment',
  'a passenger jet taking off over the Dubai skyline at sunset, Burj Khalifa on the horizon',
  'a spacious modern airport terminal hall in soft daylight with high curved ceilings and palm trees, empty of people',
  'a set of new house keys on a marble kitchen island in a bright Dubai villa, palm trees outside the window',
  'a closed plain passport on top of a leather travel wallet beside a small model aeroplane on a light desk, soft daylight',
  'the Dubai skyline with Burj Khalifa at blue hour seen across calm water, premium and calm',
  'a quiet villa entrance in a modern Dubai community with luggage at the door, palm trees and morning light, no people',
  'the Ras Al Khaimah coastline and Jebel Jais mountains at golden hour, a modern waterfront residence in the foreground',
  'a premium consultancy meeting room in Business Bay with a closed plain passport and a blank gold card on the table, city view, no people',
  'Dubai Creek with traditional dhows and modern towers behind at sunrise, calm water',
];
const PEOPLE = ['South Asian', 'Arab', 'European', 'East Asian', 'African', 'Latin American', 'Central Asian'];
const TIME = ['soft morning light', 'bright midday daylight through large windows', 'warm late-afternoon light', 'calm golden-hour light'];
const ANGLE = ['eye-level shot', 'slightly elevated wide shot', 'wide establishing shot', 'architectural straight-on shot'];

const NEVER =
  'No text, letters, numbers, prices, logos, signs, signage, plaques, screens, charts, whiteboards, price tags, watermarks, captions or banners anywhere. No flags with text. Passports only closed with a completely plain cover (no emblem, no writing); cards only blank; no open documents, visas, stamps or ID cards. No government logos or emblems. No laptops, phones or screens with brand logos. No books, magazines, newspapers, labels or packaging. No real or famous people.';
const NO_PEOPLE = 'No people, no faces, no hands, no body parts anywhere in the picture.';
const PEOPLE_WORDS = /\b(people|person|persons|family|families|couple|man|men|woman|women|child|children|kid|kids|parent|parents|consultant|consultants|emirati|traveller|travellers|traveler|travelers|businessman|businesswoman|advisor|adviser|investor|hand|hands|face|faces|someone|client|clients|professional|employee|worker|emirates id|id card|document|documents|paperwork|visa stamp|open passport)\b/i;

// Words that make picture models draw text or numbers (cost articles asked for price signs and charts)
const TEXT_WORDS = /\b(cost|costs|price|prices|pricing|fee|fees|breakdown|budget|calculator|calculation|chart|charts|graph|graphs|table|tables|infographic|diagram|sign|signs|signage|plaque|plaques|board|whiteboard|screen|screens|display|poster|receipt|invoice|form|forms|certificate|stamp|label|labels|checklist|list|timeline|number|numbers|digits?|aed|dirhams?|usd|dollars?|percent)\b/gi;

/** Topic or purpose text made safe for a picture prompt: no figures, currencies or text-prone words */
export function pictureSafe(text: string): string {
  return String(text || '')
    .replace(/[0-9][0-9.,:%/-]*/g, ' ')
    .replace(/[$€£₹%#]/g, ' ')
    .replace(TEXT_WORDS, ' ')
    .replace(/["“”«»]/g, '')
    .replace(/\s+([?.,:;!])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** The house style may ask for people on purpose ("show people", "families in pictures") */
export function peopleAllowed(houseStyle?: string): boolean {
  return /\b(people|person|family|families|humans?)\b/i.test(houseStyle || '') && !/\bno (people|person|humans?)\b/i.test(houseStyle || '');
}

/** Editorial-photo prompt: sharp, realistic, varied, on-brand */
const PEOPLE_RULES = 'People appear at a natural distance (side or back view, or a medium shot), relaxed and natural; no close-up faces or hands, no extra fingers, no warped faces.';

// banner photos: a real-looking passport usually carries the word PASSPORT, so that one word is allowed
const NEVER_BANNER =
  'No text, letters or numbers anywhere in the picture: a passport only inside a closed plain leather holder with a smooth blank front, cards smooth plain gold with no chip, numbers or embossing, no prices, logos, signs, watermarks, labels, titles or screens. No personal data or photos of a person.';

const NEVER_SYMBOLS =
  'The passport cover may show the UAE national emblem and the words UNITED ARAB EMIRATES and PASSPORT in gold, spelled exactly; a residence card may say GOLDEN VISA. Nothing else readable: no other text, numbers, prices, logos, signs, watermarks or screens. No personal data, names, ID numbers, barcodes or photos of a person on any document.';

export function buildImagePrompt(o: { purpose: string; hint?: string; topic: string; houseStyle?: string; variant: number; scene?: string; withReference?: boolean; symbols?: boolean; still?: boolean }) {
  const v = Math.abs(o.variant);
  // a scene written for this article by the AI photo editor: used as it is (it already follows the rules)
  if (o.scene) {
    const hasPeople = PEOPLE_WORDS.test(o.scene) || peopleAllowed(o.houseStyle);
    return [
      o.withReference ? 'Use the attached photo only as inspiration for its style, light, colours and kind of place. Create a NEW, different photograph with its own composition and details; do not copy it.' : '',
      // no topic words for banner photos: picture models tend to print them as text on the image
      o.still
        ? 'Rich, premium wide photograph for a website header, full of meaningful detail. It must contain no text, titles, captions or lettering at all. The main subject fills the RIGHT two thirds of the frame and is large, close and detailed; the left third is bright and simple (soft warm daylight, pale out-of-focus background) with nothing important in it. Bright overall, no black or dark areas.'
        : `Realistic editorial photograph for a UAE visa article about ${pictureSafe(o.topic) || 'UAE residency'}.`,
      `Scene: ${o.scene}`,
      o.still
        ? `Shot on a full-frame camera with a ${hasPeople ? '35 mm' : '50 mm'} lens, layered depth (detailed foreground, clear middle ground, Dubai skyline behind), bright warm golden-hour daylight, gold, white and black tones, glossy reflections.`
        : `Shot on a full-frame camera with a ${v % 2 ? '35 mm' : '50 mm'} lens, ${TIME[(v + 2) % TIME.length]}.`,
      'Sharp focus, true-to-life colours, realistic materials, believable details, premium calm mood.',
      o.houseStyle ? `House style: ${o.houseStyle}.` : '',
      o.symbols ? NEVER_SYMBOLS : o.still ? NEVER_BANNER : NEVER,
      hasPeople ? PEOPLE_RULES : NO_PEOPLE,
    ]
      .filter(Boolean)
      .join(' ');
  }
  const withPeople = peopleAllowed(o.houseStyle);
  // the article AI often suggests people with passports — the riskiest picture there is
  const raw = o.hint?.trim() || '';
  TEXT_WORDS.lastIndex = 0;
  const textProne = /\d/.test(raw) || new RegExp(TEXT_WORDS.source, 'i').test(raw);
  const hint = raw && !textProne && (withPeople || !PEOPLE_WORDS.test(raw)) ? raw : '';
  const scene = hint || SCENES[v % SCENES.length];
  const people = PEOPLE[(v * 3 + 1) % PEOPLE.length];
  return [
    `Editorial photograph for an article about ${pictureSafe(o.topic) || 'UAE residency'}. Purpose: ${pictureSafe(o.purpose).replace(new RegExp(PEOPLE_WORDS.source, 'gi'), (w) => (withPeople ? w : 'scene')) || 'illustration'}.`,
    `Scene: ${scene}.`,
    withPeople ? `If people appear: ${people} people of mixed ages, natural poses, relaxed and confident, hands relaxed and mostly out of frame.` : '',
    `Shot on a full-frame camera with a ${v % 2 ? '24 mm' : '35 mm'} lens, ${ANGLE[v % ANGLE.length]}, ${TIME[(v + 2) % TIME.length]}.`,
    'Sharp focus, no motion blur, no heavy bokeh, realistic materials and light, true-to-life colours, premium calm mood, subtle warm gold accents.',
    o.houseStyle ? `House style: ${o.houseStyle}.` : '',
    NEVER,
    withPeople ? 'No distorted hands, no extra fingers, no warped faces.' : NO_PEOPLE,
  ]
    .filter(Boolean)
    .join(' ');
}
