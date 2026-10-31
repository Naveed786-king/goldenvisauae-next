// "Designed by GPT" pictures: for every title the AI art director designs a new picture from scratch (style,
// layout, scene, people, visa elements, the words on it), the way a designer works in ChatGPT. Nothing is a
// fixed template: only the safety rules are fixed, and our logo is always added afterwards. The words come
// from the article itself (never invented facts); a checker reads the finished picture and refuses
// misspelled or garbled lettering.
import sharp from 'sharp';
import { AiError, completeJson } from './ai';
import { guaranteeFound } from './text';

export type DesignBrief = { prompt: string; words: string[]; alt: string };

const clip = (s: unknown, n: number) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
// a picture must never promise more than the article
const risky = (s: string) => guaranteeFound(s).length > 0 || /\b(guarantee|guaranteed|100%|instant approval|best price|cheapest)\b/i.test(s);

/** The art director: a complete, original picture design for this title (or one section of it) */
export async function designBrief(input: { title: string; kind: 'cover' | 'inline'; heading?: string; text: string; facts?: string; recent?: string[]; officialSymbols?: boolean }): Promise<DesignBrief> {
  const focus = input.kind === 'cover' ? `the cover of the article titled "${input.title}"` : `a picture placed under the heading "${input.heading}" in the article "${input.title}"`;
  const r = await completeJson<any>({
    system: 'You are the art director of a UAE visa and residency consultancy blog. For each article you design a fresh, striking picture that fits its title, the way a top designer would in ChatGPT: you choose the style, layout, scene and words yourself.',
    prompt: `Design ${focus}.
TEXT OF THE ARTICLE${input.kind === 'inline' ? ' SECTION' : ''} (the only source of facts, numbers and steps):
${String(input.text).slice(0, 3500)}
${input.facts ? `COMPANY FACTS (only for claims about us):\n${String(input.facts).slice(0, 1000)}\n` : ''}${input.recent?.length ? `OUR RECENT PICTURES (make this one clearly different in style, layout and scene): ${input.recent.slice(0, 10).join(' | ')}\n` : ''}
Choose what works best for THIS title: for example a bold infographic with a headline and steps, a timeline, a checklist, a comparison, a photorealistic scene with a short headline, or a premium editorial photo. It must feel like a UAE visa and residency topic (passport, visa card, flight, skyline, consultant, family, home… whatever fits) and look realistic and professional.
Write:
- prompt: a complete, vivid instruction for the picture AI (120-260 words): style, layout, scene, people (natural hands and faces), UAE setting, colours, typography. Put every word that should appear in the picture in double quotes inside the prompt.
- words: the exact list of every text string that appears in the picture (keep it short: a headline and at most 8 short items). Words only from the TEXT (titles, steps, numbers that are in the TEXT). An empty list is fine for a picture without words.
- alt: one sentence describing the picture for blind readers, with the article's keyword.
Rules for the design: no guarantees or promises of approval; no prices, fees or percentages unless they are in the TEXT; no logos, watermarks or website addresses (we add our logo ourselves); ${input.officialSymbols ? 'a passport or card may carry a simple gold crest' : 'passports and cards carry no national emblem (a plain cover, or only the words given)'}; never personal data, ID numbers, barcodes or faces printed on documents.
Return JSON only: {"prompt":"","words":[""],"alt":""}`,
    temperature: 0.9,
    maxTokens: 2500,
    timeoutMs: 90_000,
  });
  const prompt = clip(r?.prompt, 2400);
  const words = (Array.isArray(r?.words) ? r.words : []).map((w: any) => clip(w, 80)).filter(Boolean).slice(0, 14);
  if (prompt.length < 60) throw new AiError('bad_output', 'The picture design was empty');
  if (risky(prompt) || words.some(risky)) throw new AiError('bad_output', 'The picture design promised approval or a guarantee');
  return { prompt, words, alt: clip(r?.alt, 200) };
}

/** Fixed safety rules added to every design (the design itself is free) */
export function designPrompt(b: DesignBrief, officialSymbols: boolean): string {
  return [
    b.prompt,
    b.words.length ? `Spell every word exactly as given: ${b.words.map((w) => `"${w}"`).join(', ')}. Show no other words, letters or numbers.` : 'No words, letters or numbers anywhere in the picture.',
    'Landscape format. Keep everything important away from the edges (nothing cut off). Leave the bottom-right corner free of text (our logo goes there).',
    officialSymbols ? 'No personal data, ID numbers or barcodes on documents.' : 'No national emblems on passports or cards; no personal data, ID numbers or barcodes.',
    'No logos, watermarks or website addresses.',
  ].join(' ');
}

/** Sizes for the site: the cover keeps the whole picture (never cropped), the Open Graph copy sits on a blurred fill */
export async function designSizes(raw: Buffer): Promise<{ cover: Buffer; og: Buffer }> {
  const cover = await sharp(raw).resize({ width: 1600 }).webp({ quality: 86 }).toBuffer();
  const fill = await sharp(raw).resize(1200, 630, { fit: 'cover' }).blur(28).modulate({ brightness: 0.9 }).toBuffer();
  const inner = await sharp(raw).resize(1200, 630, { fit: 'inside' }).toBuffer();
  const im = await sharp(inner).metadata();
  const og = await sharp(fill)
    .composite([{ input: inner, left: Math.round((1200 - (im.width || 1200)) / 2), top: Math.round((630 - (im.height || 630)) / 2) }])
    .webp({ quality: 84 })
    .toBuffer();
  return { cover, og };
}

/** The checker's rules for a designed picture (words are expected, but they must be right) */
export function designCheck(words: string[]): string {
  return `This is a designed blog picture: ${words.length ? 'text, cards and icons are EXPECTED' : 'it should carry no text'}.
Reject it if ANY of these is true: ${words.length ? `misspelled, garbled, cut-off or nonsense words, or words that differ from the planned words (${words.join(' | ')}); ` : 'any visible text; '}deformed hands or faces; national emblems, personal data or ID numbers on documents; logos or watermarks; a messy or broken layout; a background that does not look like the UAE.`;
}
