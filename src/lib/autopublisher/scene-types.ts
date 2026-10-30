// Kinds of picture the blog can use. Every picture in an article gets a DIFFERENT kind, picked by
// what its title or section is about, and kinds used for recent pictures are pushed back, so the blog
// does not show the same desk-with-a-passport photo again and again.

export type SceneType = { id: string; words: RegExp; brief: string; people: boolean };

export const SCENE_TYPES: SceneType[] = [
  { id: 'desk', people: false, words: /\b(document|requirement|checklist|paper|apply|application|form|eligib|criteria|prepare)/i, brief: 'a premium desk still life: a passport in a plain dark leather holder, a smooth plain gold card, closed document folders and a fountain pen on marble, the Dubai skyline softly behind a large window' },
  { id: 'consult', people: true, words: /\b(consult|advice|advis|help|mistake|myth|question|explain|process|step|guide|how to)/i, brief: 'an Emirati consultant in a white kandura (or an Emirati woman in a black abaya) talking with clients across a clean desk in a bright modern consultancy office (nothing held in the hands), the Dubai skyline through floor-to-ceiling windows' },
  { id: 'airport', people: true, words: /\b(travel|entry|enter|arriv|relocat|mov|permit|flight|airport|abroad|outside the uae|land)/i, brief: 'travellers seen from behind pushing suitcases on a trolley through a bright, modern Dubai airport terminal hall with tall glass walls' },
  { id: 'family-home', people: true, words: /\b(family|families|spouse|wife|husband|child|children|kid|sponsor|dependent|parent|mother|father)/i, brief: 'a family with young children arriving at or settling into a bright Dubai villa or apartment, suitcases in the hallway, warm daylight' },
  { id: 'keys', people: false, words: /\b(property|real estate|villa|apartment|home|house|mortgage|off-plan|title deed|landlord|buy)/i, brief: 'a set of new house keys with a small gold key ring on a marble kitchen counter of a modern Dubai apartment, the city or marina softly visible behind' },
  { id: 'investor', people: true, words: /\b(invest|investor|capital|deposit|fund|wealth|portfolio|aed\s?2|million)/i, brief: 'a well-dressed investor standing at the window of a high-rise office, looking out over Downtown Dubai, seen from behind or the side' },
  { id: 'business', people: true, words: /\b(business|company|licen[cs]e|free zone|freezone|setup|set up|trade|entrepreneur|startup|founder|owner|partner)/i, brief: 'colleagues in a bright modern Dubai business-district office or free-zone lobby, glass walls and plants, natural movement' },
  { id: 'professional', people: true, words: /\b(employ|salary|job|work|career|professional|skilled|engineer|manager|executive|talent|specialist)/i, brief: 'a professional walking with a laptop bag through a modern Dubai office tower lobby or along a shaded business-district walkway' },
  { id: 'campus', people: true, words: /\b(student|university|graduat|scholar|school|education|study|academic|grade)/i, brief: 'students walking on a modern university campus in the UAE with palm trees and contemporary architecture' },
  { id: 'medical', people: false, words: /\b(medical|health|insurance|fitness|test|doctor|nurse|clinic|hospital|frontline)/i, brief: 'a clean, bright modern clinic corridor or medical test centre waiting area with soft daylight, no signs or screens' },
  { id: 'service-hall', people: true, words: /\b(biometric|emirates id|renew|cancel|typing|amer|stamp|icp|gdrfa|status|track|government|approval|reject)/i, brief: 'a calm, bright modern government service centre hall in the UAE with a few people waiting on designer seats, no signs or screens' },
  { id: 'time', people: false, words: /\b(timeline|how long|days|weeks|month|expir|validity|valid|10-year|5-year|deadline|period|duration|grace)/i, brief: 'an elegant brass hourglass and a leather diary (closed) on a desk by a window with a soft-focus Dubai skyline' },
  { id: 'retire', people: true, words: /\b(retire|retiree|senior|pension|55|elderly|old age)/i, brief: 'a relaxed retired couple walking along a palm-lined beach promenade in the UAE at golden hour, seen from behind or the side' },
  { id: 'creative', people: true, words: /\b(creative|artist|scientist|athlete|research|innovation|inventor|culture|designer|content creator|gamer)/i, brief: 'a creative professional at work in a bright Dubai studio or lab with large windows, focused on their craft' },
  { id: 'landmark', people: true, words: /\b(uae|emirate|abu dhabi|dubai|sharjah|ras al|citizenship|nationality|residen|living|life|culture)/i, brief: 'a traveller seen from behind looking at the Dubai skyline with Burj Khalifa from a waterfront promenade with date palms, in beautiful light (Burj Khalifa is the only named landmark: picture models invent the others)' },
  { id: 'skyline-flight', people: false, words: /\b(passport|visa-free|second passport|world|global|countries|travel freedom|citizenship|flight)/i, brief: 'an airliner climbing over the Dubai skyline and Burj Khalifa at golden hour, photographed from the ground across the city (outdoor, no windows or interiors)' },
  { id: 'lifestyle', people: true, words: /\b(lifestyle|cost of living|quality|community|neighbourhood|neighborhood|weekend|marina|beach)/i, brief: 'people strolling along the Dubai Marina promenade at golden hour, yachts and towers behind' },
  // only used as the backdrop behind the drawn gold visa card (never picked by words)
  { id: 'flag-skyline', people: false, words: /(?!)/, brief: 'the Dubai skyline with Burj Khalifa at golden hour seen across calm water, a correct UAE flag (vertical red band at the pole, then horizontal green, white and black stripes) waving on a tall flagpole near the right edge, open sky in the middle of the frame' },
  { id: 'cost', people: false, words: /\b(cost|fee|price|pay|budget|afford|cheap|expens|charge|aed)/i, brief: 'a neat flat lay of a closed leather wallet, a smooth plain gold card without any markings and a plain leather passport holder on a light stone desk, sunlight' },
];

const byId = new Map(SCENE_TYPES.map((t) => [t.id, t]));
export const sceneType = (id?: string) => (id ? byId.get(id) : undefined);

/** Small stable number from a string (so the same article gets the same choice when retried) */
function jitter(seed: number, id: string) {
  let h = seed | 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 100) / 100;
}

/**
 * For each picture of an article (texts[i] = its title or section), an ordered list of 3 scene kinds:
 * the best fit first, then two backups for retries. The first choices are all different from each
 * other, and kinds used for the blog's recent pictures (newest first in `recent`) are pushed back.
 */
export function pickSceneTypes(texts: string[], recent: string[], seed: number): string[][] {
  const used = new Set<string>();
  return texts.map((text, i) => {
    const scored = SCENE_TYPES.map((t) => {
      const hits = (String(text).match(new RegExp(t.words.source, 'gi')) || []).length;
      const age = recent.indexOf(t.id);
      const recency = age === -1 ? 0 : age < 4 ? 5 : age < 10 ? 2.5 : 1;
      return { id: t.id, s: Math.min(hits, 3) * 3 - recency + jitter(seed + i * 17, t.id) * 1.5 - (used.has(t.id) ? 100 : 0) };
    }).sort((a, b) => b.s - a.s);
    const pick = scored.slice(0, 3).map((x) => x.id);
    used.add(pick[0]);
    return pick;
  });
}
