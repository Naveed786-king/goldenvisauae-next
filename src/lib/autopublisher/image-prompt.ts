// Picture prompts for the Auto Publisher — no imports, so they can be unit-tested with plain Node.

// People-free by default: AI pictures fail the realism check mostly on hands, faces and documents.
const SCENES = [
  'a modern, airy consultancy office interior in Business Bay with plants, warm wood and a city view, no people',
  'the Dubai skyline at golden hour seen from across the water, calm and premium',
  'a bright, minimal desk by a large window with a coffee cup, a plant and plain unlabelled folders, no screens or devices, no people',
  'the Ras Al Khaimah coastline at golden hour, calm sea and mountains in the distance',
  'a contemporary residential community with palm trees and villas in soft morning light',
  'an elegant, sunlit apartment living room with a view of the Dubai Marina towers, no people',
  'a quiet waterfront promenade with palm trees and modern towers in the evening, no people',
  'a modern building lobby with marble floor, warm lighting and green plants, no people',
  'Dubai Creek with traditional dhows and modern towers behind, soft morning light',
  'a premium meeting room with a round table, chairs and floor-to-ceiling windows, no people',
];
const PEOPLE = ['South Asian', 'Arab', 'European', 'East Asian', 'African', 'Latin American', 'Central Asian'];
const TIME = ['soft morning light', 'bright midday daylight through large windows', 'warm late-afternoon light', 'calm golden-hour light'];
const ANGLE = ['eye-level shot', 'slightly elevated wide shot', 'wide establishing shot', 'architectural straight-on shot'];

const NEVER =
  'No text, letters, numbers, logos, signs, watermarks, captions or banners anywhere. No flags with text. No passports, Emirates ID cards, visas, cards or documents. No government logos or emblems. No laptops, phones or screens with brand logos. No books, magazines, newspapers, labels or packaging. No real or famous people.';
const NO_PEOPLE = 'No people, no faces, no hands, no body parts anywhere in the picture.';
const PEOPLE_WORDS = /\b(people|person|persons|family|families|couple|man|men|woman|women|child|children|kid|kids|parent|parents|consultant|investor|hand|hands|face|faces|someone|client|clients|professional|employee|worker|passport|emirates id|id card|card|document|documents|paperwork|visa stamp)\b/i;

/** The house style may ask for people on purpose ("show people", "families in pictures") */
export function peopleAllowed(houseStyle?: string): boolean {
  return /\b(people|person|family|families|humans?)\b/i.test(houseStyle || '') && !/\bno (people|person|humans?)\b/i.test(houseStyle || '');
}

/** Editorial-photo prompt: sharp, realistic, varied, on-brand */
export function buildImagePrompt(o: { purpose: string; hint?: string; topic: string; houseStyle?: string; variant: number }) {
  const v = Math.abs(o.variant);
  const withPeople = peopleAllowed(o.houseStyle);
  // the article AI often suggests people with passports — the riskiest picture there is
  const hint = o.hint?.trim() && (withPeople || !PEOPLE_WORDS.test(o.hint)) ? o.hint.trim() : '';
  const scene = hint || SCENES[v % SCENES.length];
  const people = PEOPLE[(v * 3 + 1) % PEOPLE.length];
  return [
    `Editorial photograph for an article about "${o.topic}". Purpose: ${o.purpose.replace(PEOPLE_WORDS, (w) => (withPeople ? w : 'scene'))}.`,
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
