// "Designed by GPT" pictures: for every title the AI art director designs a new picture from scratch (style,
// layout, scene, people, visa elements, the words on it), the way a designer works in ChatGPT. Nothing is a
// fixed template: only the safety rules are fixed, and our logo is always added afterwards. The words come
// from the article itself (never invented facts); a checker reads the finished picture and refuses
// misspelled or garbled lettering.
import sharp from 'sharp';
import { AiError, completeJson } from './ai';
import { guaranteeFound } from './text';
import { edgeMap } from './pure';

export type DesignBrief = { prompt: string; words: string[]; alt: string; look: string; corner: Corner };
export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const clip = (s: unknown, n: number) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
// a picture must never promise more than the article
const risky = (s: string) => guaranteeFound(s).length > 0 || /\b(guarantee|guaranteed|100%|instant approval|best price|cheapest)\b/i.test(s);

/** The art director: a complete, original picture design for this title (or one section of it) */
export async function designBrief(input: { title: string; kind: 'cover' | 'inline'; heading?: string; text: string; facts?: string; recent?: string[]; recentDesigns?: string[]; others?: string[]; officialSymbols?: boolean }): Promise<DesignBrief> {
  const focus = input.kind === 'cover' ? `the cover of the article titled "${input.title}"` : `a picture placed under the heading "${input.heading}" in the article "${input.title}"`;
  const r = await completeJson<any>({
    system: 'You are the art director of a UAE visa and residency consultancy blog. For each article you design a fresh, striking picture that fits its title, the way a top designer would in ChatGPT: you choose the style, layout, scene and words yourself.',
    prompt: `Design ${focus}.
THE FULL TITLE: "${input.title}"
The picture must show exactly what this full title is about, and nothing that is not in the title: no other subjects, people, places or ideas from elsewhere. ${input.kind === 'cover' ? 'If the picture has a headline, it is the full title word for word.' : 'It still shows the subject of the full title, seen from the angle of its heading.'}
TEXT OF THE ARTICLE${input.kind === 'inline' ? ' SECTION' : ''} (the only source of facts, numbers and steps):
${String(input.text).slice(0, 3500)}
${input.facts ? `COMPANY FACTS (only for claims about us):\n${String(input.facts).slice(0, 1000)}\n` : ''}${input.recent?.length ? `OUR RECENT PICTURES (make this one clearly different in style, layout and scene): ${input.recent.slice(0, 10).join(' | ')}\n` : ''}
${input.recentDesigns?.length ? `OUR LAST DESIGNS (this one must look clearly different from all of them): ${input.recentDesigns.slice(0, 12).join(' | ')}\n` : ''}${input.others?.length ? `THE OTHER PICTURES IN THIS SAME ARTICLE (this one must be completely different from them: another style, layout, scene and colours): ${input.others.join(' | ')}\n` : ''}How to think (like the best UAE visa blogs):
1. HERO: the main thing THIS ${input.kind === 'cover' ? 'title' : 'heading'} is about, shown big, realistic and in front: for example a certificate, a laptop or phone showing a government portal, a passport with a gold residence card, a family, an investor, a villa, a doctor, a student, an Emirates ID card, an aircraft. Every title has its own hero, so pictures differ by themselves.
2. PLACE: the place named in the title (Abu Dhabi, Ras Al Khaimah with its mountains, Sharjah, Dubai Marina…) as a real photographic background; Dubai when no place is named.
3. Then you decide the style, layout, colours and words yourself: a magazine or poster cover with a bold headline, a photo story, an infographic, a split layout… whatever presents THIS hero best. No template and no house style to repeat. It must feel like a UAE visa and residency topic and look like a real, premium photo or design.
Never use these overused ideas: a sign, plaque, board, clipboard, frame or display stand on a desk; papers or a passport lying on a desk by a window as the main picture.
Write:
- prompt: a complete, vivid instruction for the picture AI (120-260 words): style, layout, scene, people (natural hands and faces), UAE setting, colours, typography. Put every word that should appear in the picture in double quotes inside the prompt.
- words: the exact list of every text string that appears in the picture (keep it short: a headline and at most 8 short items). Words only from the TEXT (titles, steps, numbers that are in the TEXT). An empty list is fine for a picture without words.
- alt: one sentence describing the picture for blind readers, with the article's keyword.
- look: one short line naming the hero, place, style, layout and colours you chose.
- corner: the corner kept free for our logo (top-left, top-right, bottom-left or bottom-right), where it does not cover the headline or the hero.
Rules for the design: no guarantees or promises of approval; no prices, fees or percentages unless they are in the TEXT; no logos, watermarks or website addresses (we add our logo ourselves); ${input.officialSymbols ? 'a passport or card may carry a simple gold crest' : 'passports and cards carry no national emblem (a plain cover, or only the words given)'}; never personal data, ID numbers, barcodes or faces printed on documents.
Return JSON only: {"prompt":"","words":[""],"alt":"","look":"","corner":"top-left"}`,
    temperature: 0.9,
    maxTokens: 2500,
    timeoutMs: 90_000,
  });
  const prompt = clip(r?.prompt, 2400);
  const words = (Array.isArray(r?.words) ? r.words : []).map((w: any) => clip(w, 80)).filter(Boolean).slice(0, 14);
  if (prompt.length < 60) throw new AiError('bad_output', 'The picture design was empty');
  if (risky(prompt) || words.some(risky)) throw new AiError('bad_output', 'The picture design promised approval or a guarantee');
  const corner: Corner = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(r?.corner) ? r.corner : 'top-left';
  return { prompt, words, alt: clip(r?.alt, 200), look: clip(r?.look, 160), corner };
}

/** Fixed safety rules added to every design (the design itself is free) */
export function designPrompt(b: DesignBrief, officialSymbols: boolean, cover = false): string {
  const free = b.corner || 'top-left';
  return [
    b.prompt,
    b.words.length ? `Spell every word exactly as given: ${b.words.map((w) => `"${w}"`).join(', ')}. Show no other words, letters or numbers.` : 'No words, letters or numbers anywhere in the picture.',
    `Wide 16:9 landscape banner. Safe area: every word and the main subject stay well inside the frame, with clear empty space (at least a tenth of the height) between the top edge and the headline, and at least 6% of the width on the left and right of every line of text; no letter may touch or cross any edge of the picture. Leave the ${free} corner empty and calm (our logo goes there).`,
    officialSymbols ? 'No personal data, ID numbers or barcodes on documents.' : 'No national emblems on passports or cards; no personal data, ID numbers or barcodes.',
    'No logos, watermarks or website addresses.',
  ].join(' ');
}

/**
 * The picture at exactly W x H without empty bands: it is scaled to cover the frame and the strip that is
 * trimmed off is taken where the picture has the least detail (plain sky, wall or table, never the headline).
 */
export async function smartFit(raw: Buffer, W: number, H: number): Promise<Buffer> {
  const meta = await sharp(raw).metadata();
  const w0 = meta.width || W;
  const h0 = meta.height || H;
  const scale = Math.max(W / w0, H / h0);
  const sw = Math.max(W, Math.round(w0 * scale));
  const sh = Math.max(H, Math.round(h0 * scale));
  const scaled = await sharp(raw).resize(sw, sh, { fit: 'fill' }).toBuffer();
  const vertical = sh > H; // trimming rows (taller picture) or columns (wider picture)
  const extra = vertical ? sh - H : sw - W;
  if (extra <= 0) return sharp(scaled).extract({ left: 0, top: 0, width: W, height: H }).toBuffer();
  // detail per row (or column) on a small copy
  const k = 4;
  const g = await sharp(scaled).resize(Math.round(sw / k), Math.round(sh / k), { fit: 'fill' }).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  const detail = edgeMap(g.data, g.info.width, g.info.height, g.info.channels);
  const ew = g.info.width;
  const eh = g.info.height;
  const n = vertical ? eh : ew;
  const line = new Float64Array(n);
  for (let y = 0; y < eh; y++) for (let x = 0; x < ew; x++) line[vertical ? y : x] += detail[y * ew + x];
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + line[i];
  const cut = Math.round(extra / k);
  let best = Math.floor(cut / 2);
  let bestCost = Infinity;
  // offset o: o lines trimmed from the start, (cut - o) from the end; ties go to the centre
  for (let o = 0; o <= cut; o++) {
    const cost = pre[o] + (pre[n] - pre[n - (cut - o)]) + Math.abs(o - cut / 2) * 1e-6;
    if (cost < bestCost) {
      bestCost = cost;
      best = o;
    }
  }
  const off = Math.min(extra, best * k);
  return sharp(scaled).extract(vertical ? { left: 0, top: off, width: W, height: H } : { left: off, top: 0, width: W, height: H }).toBuffer();
}

/** Sizes for the site: every cover is exactly 16:9 (all blog cards the same size), the Open Graph copy 1200x630 */
export async function designSizes(raw: Buffer): Promise<{ cover: Buffer; og: Buffer }> {
  const cover = await sharp(await smartFit(raw, 1600, 900)).webp({ quality: 86 }).toBuffer();
  const og = await sharp(await smartFit(raw, 1200, 630)).webp({ quality: 84 }).toBuffer();
  return { cover, og };
}

/** The checker's rules for a designed picture (words are expected, but they must be right) */
export function designCheck(words: string[]): string {
  return `This is a designed blog picture: ${words.length ? 'text, cards and icons are EXPECTED' : 'it should carry no text'}.
Reject it if ANY of these is true: ${words.length ? `any word or letter that touches or is cut by the top, bottom, left or right edge of the picture (look closely at the very top line); misspelled, garbled, cut-off or nonsense words, or words that differ from the planned words (${words.join(' | ')}); ` : 'any visible text; '}deformed hands or faces; national emblems, personal data or ID numbers on documents; logos or watermarks; a messy or broken layout; a background that does not look like the UAE.`;
}
