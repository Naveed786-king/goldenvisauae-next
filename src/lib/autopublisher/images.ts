// AI pictures: prompt builder, generation (OpenAI / Gemini), automatic quality control
// (sharpness, vision check, duplicate check), WebP output and saving to the Media library.
import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { savePublicFile } from '@/lib/upload';
import { AutoConfig } from './config';
import { AiError, completeJson, http, isFakeAi, providerKey } from './ai';
import { autoLog, countAiCall } from './log';
import { pickSceneTypes, sceneType } from './scene-types';
import { designBrief, designCheck, designPrompt, designSizes, type DesignBrief } from './infographic';
import { slugify } from './text';
import { dhash, hamming, sharpness } from './imaging';
import { readLocal } from './local-file';
import { pickReference, referenceImage } from './references';
import { composeCover, watermark, type CoverBrand, type CoverText } from './cover-design';
import { coverBrand, coverText } from './cover';
import { companyFacts } from './prompts';
export { readLocal };

export { dhash, hamming, sharpness };

// ---------------------------------------------------------------- prompts

import { buildImagePrompt, pictureSafe } from './image-prompt';
export { buildImagePrompt, peopleAllowed } from './image-prompt';

// ---------------------------------------------------------------- generation

export async function generateImage(prompt: string, cfg: AutoConfig, reference?: Buffer | null): Promise<Buffer> {
  if (isFakeAi()) return fakeImage(prompt);
  try {
    return await generateWith(cfg.images.provider, prompt, cfg, reference);
  } catch (e) {
    // a wrong OpenAI key must not stop the pictures when a Gemini key works
    if (cfg.images.provider === 'openai' && e instanceof AiError && e.kind !== 'network' && (await providerKey(cfg, 'gemini'))) {
      await autoLog('warn', `OpenAI pictures not available (${e.message.slice(0, 160)}), using Gemini for this picture.`);
      return generateWith('gemini', prompt, cfg, reference);
    }
    throw e;
  }
}

async function generateWith(which: 'openai' | 'gemini', prompt: string, cfg: AutoConfig, reference?: Buffer | null): Promise<Buffer> {
  const key = await providerKey(cfg, which === 'openai' ? 'openai' : 'gemini');
  if (!key) throw new AiError('config', `No ${which === 'openai' ? 'OpenAI' : 'Gemini'} key for pictures. Add it in AI & pictures.`);
  await countAiCall();
  if (which === 'openai') {
    // the chosen model first, then OpenAI's other picture models (accounts differ in which ones they have)
    const tried: string[] = [];
    for (const model of [...new Set([workingOpenAiModel, cfg.images.openaiModel, ...OPENAI_IMAGE_MODELS].filter(Boolean) as string[])]) {
      try {
        const out = await openAiPicture(model, key, prompt, cfg, reference);
        if (workingOpenAiModel !== model) {
          workingOpenAiModel = model;
          if (model !== cfg.images.openaiModel) await autoLog('info', `OpenAI picture model "${cfg.images.openaiModel}" is not available on this account, using "${model}".`);
        }
        return out;
      } catch (e) {
        if (!(e instanceof AiError) || !MODEL_MISSING.test(e.message)) throw e;
        tried.push(model);
      }
    }
    throw new AiError('config', `None of the OpenAI picture models works on this account (${tried.join(', ')}). Verify the organization at platform.openai.com → Settings → Organization, or use Google Gemini for pictures.`);
  }
  return geminiPicture(key, prompt, cfg, reference);
}

const OPENAI_IMAGE_MODELS = ['gpt-image-2', 'gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini'];
const MODEL_MISSING = /does not exist|model_not_found|not found|invalid model|do not have access|must be verified|verify your organization/i;
let workingOpenAiModel = '';

async function openAiPicture(model: string, key: string, prompt: string, cfg: AutoConfig, reference?: Buffer | null): Promise<Buffer> {
  {
    // with a library photo: the edits endpoint takes it as input and paints a new picture inspired by it
    if (reference && !model.startsWith('dall-e')) {
      const fd = new FormData();
      fd.append('model', model);
      fd.append('prompt', prompt);
      fd.append('size', '1536x1024');
      fd.append('quality', cfg.images.quality);
      fd.append('n', '1');
      fd.append('image', new Blob([new Uint8Array(reference)], { type: 'image/jpeg' }), 'reference.jpg');
      const j = await http('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd }, 180_000, 'OpenAI images');
      const b64 = j?.data?.[0]?.b64_json;
      if (!b64) throw new AiError('bad_output', 'OpenAI returned no picture');
      return Buffer.from(b64, 'base64');
    }
    const body: any = { model, prompt, n: 1, size: model.startsWith('dall-e') ? '1792x1024' : '1536x1024' };
    if (model.startsWith('dall-e')) Object.assign(body, { response_format: 'b64_json', quality: cfg.images.quality === 'high' ? 'hd' : 'standard' });
    else body.quality = cfg.images.quality;
    const j = await http('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }, 180_000, 'OpenAI images');
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) throw new AiError('bad_output', 'OpenAI returned no picture');
    return Buffer.from(b64, 'base64');
  }
}

async function geminiPicture(key: string, prompt: string, cfg: AutoConfig, reference?: Buffer | null): Promise<Buffer> {
  const base = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com';
  const model = cfg.images.geminiModel || 'gemini-2.5-flash-image';
  const j = await http(
    `${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `${prompt}\nWide 16:9 landscape format.` }, ...(reference ? [{ inlineData: { mimeType: 'image/jpeg', data: reference.toString('base64') } }] : [])] }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } }) },
    180_000,
    'Gemini images',
  );
  const part = (j?.candidates?.[0]?.content?.parts || []).find((p: any) => p.inlineData?.data || p.inline_data?.data);
  const b64 = part?.inlineData?.data || part?.inline_data?.data;
  if (!b64) throw new AiError('bad_output', `Gemini returned no picture (${j?.candidates?.[0]?.finishReason || 'empty'})`);
  return Buffer.from(b64, 'base64');
}

/** Dry-run picture: a soft gradient with shapes and fine noise (sharp enough to pass the checks) */
async function fakeImage(seed: string): Promise<Buffer> {
  let h = Math.floor(Math.random() * 2 ** 31); // every dry-run picture differs
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const tilt = h % 2 ? 'x1="0" y1="0" x2="1" y2="1"' : 'x1="1" y1="0" x2="0" y2="1"';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><defs><linearGradient id="g" ${tilt}><stop offset="0" stop-color="hsl(${hue},45%,82%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},50%,55%)"/></linearGradient></defs><rect width="1536" height="1024" fill="url(#g)"/>${Array.from({ length: 40 }, (_, i) => `<circle cx="${(h >> (i % 16)) % 1536}" cy="${(h * (i + 3)) % 1024}" r="${20 + ((h >> i) % 90)}" fill="hsl(${(hue + i * 9) % 360},60%,${40 + (i % 30)}%)" opacity=".55"/>`).join('')}${Array.from({ length: 120 }, (_, i) => `<rect x="${(i * 97) % 1536}" y="${(i * 61) % 1024}" width="3" height="${40 + (i % 50)}" fill="#1a1406" opacity=".5"/>`).join('')}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ---------------------------------------------------------------- quality control

/** Closest picture we have already used (by dHash) */
export async function nearestImage(hash: string): Promise<{ distance: number; refId?: string }> {
  const rows = await prisma.autoFingerprint.findMany({ where: { kind: 'image' }, select: { refId: true, sig: true } });
  let best = { distance: 64 } as { distance: number; refId?: string };
  for (const r of rows) {
    try {
      const h = JSON.parse(r.sig).h;
      const d = hamming(hash, h);
      if (d < best.distance) best = { distance: d, refId: r.refId };
    } catch {
      /* ignore */
    }
  }
  return best;
}

/** Vision check with the text AI: realism, text/letters, hands/faces, artefacts, topic */
/** Inline pictures are small and sit inside the text, so they pass one point below the cover minimum (never under 5) */
export function realismNeeded(minRealism: number, kind: 'cover' | 'inline'): number {
  return kind === 'inline' ? Math.max(5, minRealism - 1) : minRealism;
}

export async function visionCheck(buf: Buffer, purpose: string, cfg: AutoConfig, kind: 'cover' | 'inline' = 'cover', title = '', propText: 'none' | 'passport' | 'official' = 'none', designWords: string[] | null = null): Promise<{ ok: boolean; realism: number; match: number; issues: string[] }> {
  const small = await sharp(buf).resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 82 }).toBuffer();
  const r = await completeJson<any>({
    system: 'You are a strict picture quality inspector for a premium consultancy website. Be honest and critical.',
    prompt: `Check this picture, meant for: "${pictureSafe(purpose) || 'a UAE visa article'}"${title ? ` in an article titled "${pictureSafe(title)}"` : ''}.
${designWords ? designCheck(designWords) + '\nRealism here means overall quality: 9-10 = looks like a professional designer made it, 7-8 = good with tiny flaws, under 6 = clearly broken or amateur.\n' : 'Reject it if ANY of these is true: visible text, letters, numbers, logos or watermarks; deformed or extra fingers/hands; warped or uncanny faces; obvious AI artefacts; blurry or low detail; documents with readable details; off-topic or unrealistic scene.\n'}Off-topic too: plants or places that do not exist in the UAE (olive trees, cypresses, European streets, snow).
On-topic for this UAE visa and residency consultancy: closed passports with a plain cover or in a leather holder, blank gold or white cards, luggage, airports and planes, consultants talking with clients in an office, families and travellers, UAE landmarks, skylines, homes, offices and coastlines. A plain passport cover or a blank card is fine as long as nothing on it is readable.
${propText === 'official' ? 'Allowed exception: the UAE national emblem and the exact words UNITED ARAB EMIRATES, PASSPORT or GOLDEN VISA on a passport cover or card prop. Reject them if the lettering is misspelled, garbled or invented, or if any personal data, ID number or face appears.\n' : propText === 'passport' ? 'Allowed exception: a simple crest and the single word PASSPORT, spelled exactly, on a passport cover. Any other lettering, or PASSPORT misspelled or garbled, still counts as visible text.\n' : ''}Realism: 9-10 = indistinguishable from a professional photo, 7-8 = convincing photo with tiny flaws, 5-6 = clearly AI-looking, under 5 = broken.
Do not fail a picture only because a small detail of the scene description is missing or different (the number of people or objects, a pose, an object left out); judge the photo itself.
Match: how clearly a reader connects this picture with the article title, 0-10 (7+ = obviously about this topic, under 5 = generic or unrelated).
Return JSON only: {"ok": true|false, "realism": 0-10, "match": 0-10, "issues": ["…"]}`,
    images: [{ mime: 'image/jpeg', data: small.toString('base64') }],
    temperature: 0,
    maxTokens: 1500,
    timeoutMs: 60_000,
  });
  const realism = Math.max(0, Math.min(10, Number(r?.realism) || 0));
  const issues = Array.isArray(r?.issues) ? r.issues.map(String).slice(0, 6) : [];
  const match = r?.match == null ? 10 : Math.max(0, Math.min(10, Number(r.match) || 0));
  if (title && match < 5) issues.push(`does not fit the article title (match ${match}/10)`);
  return { ok: !!r?.ok && realism >= realismNeeded(cfg.images.minRealism, kind) && (!title || match >= 5), realism, match, issues };
}

// ---------------------------------------------------------------- output

async function saveWebp(buf: Buffer, name: string, alt: string): Promise<{ url: string; size: number }> {
  const file = new File([new Uint8Array(buf)], `${name}.webp`, { type: 'image/webp' });
  const saved = await savePublicFile(file);
  await prisma.media.create({ data: { filename: saved.filename, url: saved.url, mime: 'image/webp', size: saved.size, alt: alt.slice(0, 300) } }).catch(() => null);
  return { url: saved.url, size: saved.size };
}

export type PictureSpec = { purpose: string; hint?: string; alt: string; kind: 'cover' | 'inline'; placement?: string; idea?: string; types?: string[]; section?: { heading: string; text: string }; brief?: DesignBrief; others?: string[] };
export type PictureResult = { ok: true; url: string; ogUrl?: string; width: number; height: number; alt: string; hash: string; sharpness: number; realism: number; attempts: number; sceneType?: string } | { ok: false; reason: string; attempts: number };

/**
 * The AI photo editor: three concrete, realistic scenes that clearly fit this article (title, section,
 * summary), in the style of the library photo when there is one. Safe for picture models: no readable
 * text or numbers, people only at a natural distance.
 */
export async function pictureConcept(spec: PictureSpec, ctx: { topic: string; focusKeyword: string; summary?: string }, refCaption: string, cfg: AutoConfig, banner = false, types: string[] = [], recentAlts: string[] = [], backdrop = false, refIdea = false): Promise<{ scenes: string[]; alts: string[]; alt: string }> {
  const passportRule = cfg.images.officialSymbols
    ? 'Passports may show the UAE national emblem and the words UNITED ARAB EMIRATES and PASSPORT in gold on the cover (spelled exactly); cards may say GOLDEN VISA. No personal data, names, ID numbers, photos of a person or barcodes.'
    : 'Picture models print garbled words and numbers on documents, so a passport is always inside a closed dark leather passport holder whose front is completely smooth plain leather (no crest, no embossing, no stitching patterns that look like letters); the gold visa card is a smooth plain gold card like a blank metal card, with no chip, numbers, letters or embossing.';
  const kinds = (types.length ? types : ['consult', 'airport', 'desk'])
    .map((id, i) => `${i + 1}. ${sceneType(id)?.brief || id}`)
    .join('\n');
  const task = backdrop
    ? `Write 3 scenes for the BACKDROP photo of a designed article cover. A gold card graphic is placed on the centre-right of the photo afterwards, so the photo is a clean, beautiful scenic backdrop with nothing important in the centre: skyline, water, sky, the UAE flag or a landmark that fits the title. No desks, documents, passports or cards in the photo; people only small in the distance. Bright warm golden-hour light, left third pale and soft.
Use these 3 kinds, in this order, as backdrops:
${kinds}
Rules:
- Photorealistic, one real place per scene, real UAE plants and architecture only.
- No text, numbers, logos or signs.
- Each scene 1-2 sentences, at most 50 words.`
    : banner
    ? `Write 3 rich, detailed scenes for the photo half of a designed article cover (the title is drawn on the left, so the photo itself carries no words). A reader must see "UAE visa" at a glance and connect it with THIS title. The subject fills the right two thirds of the frame, large and close; the left third stays bright and simple (soft warm daylight, pale out-of-focus background).
Make the 3 scenes 3 DIFFERENT kinds of picture, in this order:
${kinds}
Shape each kind around THIS title so it could not be used for another article. Add visa touches only where they fit naturally (luggage, the Dubai skyline); passports and cards only in desk or flat-lay scenes, lying on the surface.
Rules:
- Photorealistic, bright warm golden-hour light, layered depth (detailed foreground, clear middle ground, skyline behind), gold, white and black tones. Never dark rooms or black backgrounds. Never an almost empty table.
- People only at a natural distance (medium shot, side, back or three-quarter view); no close-up faces or hands, and nobody holds a passport, card or document.
- One real place per scene, shot in one take: never a view of one place through the window of another (no airliner interiors, no scenes inside windows).
- ${passportRule}
- No other text, numbers, prices, logos, signs, flags with writing or screens with content.
- Each scene 2-3 sentences, at most 70 words.`
    : `Write 3 photo scenes for this picture, each a real moment a photographer could shoot in the UAE that clearly shows what THIS title is about. They must be 3 DIFFERENT kinds of picture, in this order:
${kinds}
Shape each kind around the exact subject of the title (who, where, what moment), so it could not be used for another article.
Every scene must clearly feel like a UAE visa and residency story. Give each one a natural visa touch that fits the moment, and use a DIFFERENT one in each scene: a plain dark leather passport holder resting on a table or peeking from a bag, a smooth plain gold card lying on a desk, suitcases or a carry-on, an airliner in the sky above the city, an airport arrivals hall, a consultant's desk with closed folders, keys to a new home.
Rules:
- Photorealistic editorial photo, natural light, believable details. Different place or camera angle in each scene.
- People are welcome when they help, but at a natural distance (side or back view, or medium shot); never close-up faces or hands.
- Nothing readable: no text, numbers, prices, logos, signs, screens with content, charts or open documents. Passports only closed with a plain cover; cards blank. Nobody holds a passport, card or document.
- One real place per scene, shot in one take (no view of another place inside a window).
- Each scene 1-2 sentences, at most 50 words.`;
  const r = await completeJson<{ scenes?: string[]; alts?: string[]; alt?: string }>({
    system: 'You are the photo editor of a UAE visa and residency consultancy blog. You pick realistic photos that a reader instantly connects with the article.',
    prompt: `ARTICLE TITLE: ${ctx.topic}
FOCUS KEYWORD: ${ctx.focusKeyword}
PICTURE FOR: ${spec.kind === 'cover' ? 'the cover (top of the article)' : 'a picture inside the article: another, different view of what the TITLE is about'}
The picture follows the TITLE only: show exactly what the title is about.
${refCaption ? `${refIdea ? 'OUR LIBRARY PHOTO THAT FITS THIS TITLE (take it as an IDEA for the kind of scene and mood; create your own new scene, never a copy)' : 'OUR LIBRARY PHOTO TO TAKE STYLE FROM (colours and light only)'}: ${refCaption}\n` : ''}${recentAlts.length ? `OUR RECENT PICTURES (do NOT repeat their place, objects, people or composition; this picture must look clearly different): ${recentAlts.slice(0, 14).join(' | ')}\n` : ''}${spec.idea ? `THE ADMIN'S OWN IDEA FOR THIS PICTURE (follow it closely; only change what breaks the rules below): ${spec.idea}\n` : ''}HOUSE STYLE: ${cfg.images.houseStyle || 'bright, calm, premium, natural light, subtle warm gold accents'}

${task}
Return JSON only: {"scenes": ["", "", ""], "alts": ["short alt text for scene 1", "for scene 2", "for scene 3"]} (alt texts describe what is visible and include the focus keyword where natural)`,
    temperature: 0.8,
    maxTokens: 2000,
    timeoutMs: 60_000,
  });
  const raw = Array.isArray(r?.scenes) ? r.scenes : [];
  const rawAlts = Array.isArray(r?.alts) ? r.alts : [];
  const keep = raw.map((x, i) => ({ scene: String(x).trim(), alt: String(rawAlts[i] || '').trim().slice(0, 200) })).filter((x) => x.scene.length > 15).slice(0, 4);
  return { scenes: keep.map((x) => x.scene), alts: keep.map((x) => x.alt), alt: keep[0]?.alt || String(r?.alt || '').trim().slice(0, 200) };
}

// ---------------------------------------------------------------- variety across the blog

const RECENT_KEY = 'autopublisher.recentScenes';
let recentChain: Promise<unknown> = Promise.resolve();

/** Kinds of picture used most recently (newest first) and the alt texts of the latest pictures */
export async function recentPictures(): Promise<{ types: string[]; alts: string[] }> {
  const row = await prisma.setting.findUnique({ where: { key: RECENT_KEY } }).catch(() => null);
  let types: string[] = [];
  try {
    const v = JSON.parse(row?.value || '[]');
    if (Array.isArray(v)) types = v.map(String).slice(0, 30);
  } catch {}
  const media = await prisma.media
    .findMany({ where: { OR: [{ filename: { contains: '-cover-' } }, { filename: { contains: '-inline-' } }], NOT: { alt: '' } }, orderBy: { createdAt: 'desc' }, take: 14, select: { alt: true } })
    .catch(() => [] as { alt: string }[]);
  return { types, alts: media.map((m) => String(m.alt || '').slice(0, 120)).filter(Boolean) };
}

/** Notes the kind of picture just used, so the next ones pick something else (one write at a time) */
async function remember(res: PictureResult, type?: string): Promise<PictureResult> {
  if (!res.ok || !type) return res;
  recentChain = recentChain
    .then(async () => {
      const { types } = await recentPictures();
      const value = JSON.stringify([type, ...types].slice(0, 30));
      await prisma.setting.upsert({ where: { key: RECENT_KEY }, create: { key: RECENT_KEY, value }, update: { value } });
    })
    .catch(() => null);
  await recentChain;
  return { ...res, sceneType: type };
}

const SAFE_SCENE = [
  'The Dubai skyline with Burj Khalifa at golden hour, seen across the water from a quiet promenade, warm sunlight on glass towers, a few date palms in the foreground. No people, no documents.',
  'The Abu Dhabi Corniche at golden hour: modern towers along the turquoise sea, a palm-lined waterfront walkway. No people, no documents.',
  'Dubai Creek at sunset with traditional wooden dhows moored along the quay and the modern city behind. No people, no documents.',
  'Dubai Marina towers and calm water at golden hour, yachts moored along the marina, warm reflections. No people, no documents.',
  'Golden desert dunes at sunset with the distant Dubai skyline and Burj Khalifa on the horizon. No people, no documents.',
  'Modern Dubai Downtown towers and Burj Khalifa against a clear late-afternoon sky, photographed from a terrace with a sand-coloured stone balustrade and date palms in the foreground. No people, no documents.',
];

/**
 * A picture the AI art director designs from scratch for this title (or for the heading it sits under):
 * free style and layout, words only from the article, our logo added afterwards. 3 tries for a cover, 2 inside.
 */
async function produceDesigned(spec: PictureSpec, ctx: { topic: string; focusKeyword: string; variant: number; jobId?: string; summary?: string; headings?: string[]; articleText?: string }, cfg: AutoConfig): Promise<PictureResult> {
  const reasons: string[] = [];
  const brand = cfg.images.showLogo !== false ? await coverBrand(cfg).catch(() => null) : null;
  const look: Look = { emblem: brand?.emblem || null, designed: spec.kind === 'cover' };
  const facts = (await companyFacts(cfg).catch(() => ({ text: '' }))).text;
  const recent = await recentPictures().catch(() => ({ types: [] as string[], alts: [] as string[] }));
  const text = spec.kind === 'inline' && spec.section ? `${spec.section.heading}\n${spec.section.text}` : ctx.articleText || [ctx.summary, ...(ctx.headings || [])].filter(Boolean).join('\n');
  const tries = spec.kind === 'cover' ? 3 : 2;
  for (let attempt = 1; attempt <= tries; attempt++) {
    let brief;
    try {
      // a new design every try: never the same pattern twice
      brief =
        attempt === 1 && spec.brief
          ? spec.brief
          : await designBrief({ title: ctx.topic, kind: spec.kind, heading: spec.section?.heading, text, facts, recent: recent.alts, recentDesigns: await recentDesigns(), others: [...(spec.others || []), ...(spec.brief?.look ? [spec.brief.look] : [])], officialSymbols: cfg.images.officialSymbols });
    } catch (e: any) {
      if (e instanceof AiError && (e.kind === 'quota' || e.kind === 'config')) throw e;
      reasons.push(`attempt ${attempt}: design step failed (${e?.message || e})`);
      continue;
    }
    let raw: Buffer;
    try {
      raw = await generateImage(designPrompt(brief, cfg.images.officialSymbols), cfg, null);
    } catch (e: any) {
      if (e instanceof AiError && (e.kind === 'quota' || e.kind === 'config')) throw e;
      reasons.push(`attempt ${attempt}: ${e?.message || e}`);
      continue;
    }
    const sharpScore = await sharpness(raw);
    const hash = await dhash(raw);
    const near = await nearestImage(hash);
    if (near.distance <= Math.min(6, cfg.quality.maxImageDistance)) {
      reasons.push(`attempt ${attempt}: too similar to a picture we used (distance ${near.distance})`);
      continue;
    }
    let v: { ok: boolean; realism: number; match?: number; issues: string[] };
    try {
      v = await visionCheck(raw, spec.kind === 'cover' ? ctx.topic : spec.section?.heading || ctx.topic, cfg, spec.kind, ctx.topic, 'none', brief.words);
    } catch (e: any) {
      if (e instanceof AiError && (e.kind === 'quota' || e.kind === 'config' || e.kind === 'auth')) throw e;
      v = { ok: true, realism: 0, issues: ['vision check unavailable'] };
    }
    if (!v.ok) {
      reasons.push(`attempt ${attempt}: check failed (quality ${v.realism}${v.issues.length ? `: ${v.issues.join(', ')}` : ''})`);
      continue;
    }
    const alt = brief.alt || spec.alt;
    await rememberDesign(brief.look);
    return remember(await savePicture({ ...spec, alt }, ctx, raw, hash, sharpScore, v.realism, attempt, look), 'design');
  }
  return { ok: false, reason: reasons.join(' · ') || 'no attempt succeeded', attempts: tries };
}

const DESIGNS_KEY = 'autopublisher.recentDesigns';
/** What the latest designed pictures looked like (newest first), so new ones look different */
async function recentDesigns(): Promise<string[]> {
  const row = await prisma.setting.findUnique({ where: { key: DESIGNS_KEY } }).catch(() => null);
  try {
    const v = JSON.parse(row?.value || '[]');
    return Array.isArray(v) ? v.map(String).slice(0, 15) : [];
  } catch {
    return [];
  }
}
async function rememberDesign(look: string) {
  if (!look) return;
  recentChain = recentChain
    .then(async () => {
      const value = JSON.stringify([look, ...(await recentDesigns())].slice(0, 15));
      await prisma.setting.upsert({ where: { key: DESIGNS_KEY }, create: { key: DESIGNS_KEY, value }, update: { value } });
    })
    .catch(() => null);
  await recentChain;
}

/**
 * Designs all pictures of one article one after another, each seeing the designs before it, so the cover and
 * the inside pictures never look alike. The pictures themselves are then made at the same time.
 */
export async function planDesigns(specs: PictureSpec[], ctx: { topic: string; articleText?: string; summary?: string; headings?: string[] }, cfg: AutoConfig): Promise<PictureSpec[]> {
  if (cfg.images.coverStyle !== 'design' || isFakeAi()) return specs;
  const facts = (await companyFacts(cfg).catch(() => ({ text: '' }))).text;
  const recent = await recentPictures().catch(() => ({ types: [] as string[], alts: [] as string[] }));
  const past = await recentDesigns();
  const looks: string[] = [];
  const out: PictureSpec[] = [];
  for (const spec of specs) {
    const text = spec.kind === 'inline' && spec.section ? `${spec.section.heading}\n${spec.section.text}` : ctx.articleText || [ctx.summary, ...(ctx.headings || [])].filter(Boolean).join('\n');
    const brief = await designBrief({ title: ctx.topic, kind: spec.kind, heading: spec.section?.heading, text, facts, recent: recent.alts, recentDesigns: past, others: [...looks], officialSymbols: cfg.images.officialSymbols }).catch(() => undefined);
    if (brief?.look) looks.push(brief.look);
    out.push({ ...spec, brief, others: [...looks] });
  }
  return out;
}

/** Problems that make a picture unusable even as a fallback (text, logos, broken hands or faces) */
const SERIOUS = /text|letter|number|digit|logo|watermark|brand|finger|hand|face|emblem|sign|caption|readable/i;

/**
 * Makes one picture: generate → sharpness → duplicate check → vision check. Covers get 4 attempts,
 * inline pictures 2 (they are optional). If no cover attempt passes, the best clean attempt is used
 * when it is at most one point under the minimum and has no serious problem (text, logos, hands, faces).
 * Saves WebP files (cover 1600×900 + Open Graph 1200×630, inline 1200 wide).
 */
export async function producePicture(spec: PictureSpec, ctx: { topic: string; focusKeyword: string; variant: number; jobId?: string; summary?: string; headings?: string[]; articleText?: string }, cfg: AutoConfig): Promise<PictureResult> {
  if (cfg.images.coverStyle === 'design' && !isFakeAi()) {
    const designed = await produceDesigned(spec, ctx, cfg);
    if (designed.ok === true) return designed;
    await autoLog('warn', `Designed picture failed (${designed.reason.slice(0, 300)}), making a realistic photo instead.`, ctx.jobId);
    return producePicture(spec, ctx, { ...cfg, images: { ...cfg.images, coverStyle: 'photo' } });
  }
  const reasons: string[] = [];
  // covers in "banner" style: the AI makes the photo, the title/cards/logo are drawn on top in the site's style
  const banner = spec.kind === 'cover' && cfg.images.coverStyle === 'banner';
  const brand = banner || cfg.images.showLogo ? await coverBrand(cfg) : null;
  const words = banner ? await coverText({ title: ctx.topic, summary: ctx.summary, headings: ctx.headings, facts: (await companyFacts(cfg).catch(() => ({ text: '' }))).text }) : null;
  // a title about a visa gets the gold UAE GOLDEN VISA card on its cover (drawn by us, so the lettering is exact)
  // only when the cover designer says the visa itself is the subject, and not on every cover in a row
  const lastKinds = (await recentPictures().catch(() => ({ types: [] as string[] }))).types.slice(0, 2);
  const visaCard = !!(banner && cfg.images.visaCard !== 'off' && /\bvisas?\b/i.test(ctx.topic) && words?.visaCard && !(lastKinds.length === 2 && lastKinds.every((t) => t === 'flag-skyline')));
  const look: Look = { banner: banner && brand && words ? { text: words, brand, visaCard } : undefined, emblem: cfg.images.showLogo ? brand?.emblem || null : null };
  const symbols = banner && cfg.images.officialSymbols;
  const maxAttempts = spec.kind === 'cover' ? 4 : 2;
  const needed = realismNeeded(cfg.images.minRealism, spec.kind);
  let best: { raw: Buffer; hash: string; sharp: number; realism: number; attempt: number } | null = null;
  // a photo from the admin's library (best match for this title/section) as inspiration, if there are any
  const ref = await pickReference(`${ctx.topic} ${ctx.focusKeyword}`).catch((e) => {
    void autoLog('warn', `Photo library not available: ${e instanceof Error ? e.message : e}`, ctx.jobId);
    return null;
  });
  const refImg = ref ? await referenceImage(ref.url).catch(() => null) : null;
  if (ref && refImg) await autoLog('info', `Using library photo as inspiration (${spec.kind}): ${ref.caption || ref.url}`, ctx.jobId);
  // a different kind of picture than the blog's recent ones (and than the other pictures of this article)
  const recent = await recentPictures();
  const chosen = spec.types?.length ? spec.types : pickSceneTypes([`${ctx.topic} ${ctx.focusKeyword}`], recent.types, ctx.variant)[0];
  // a second round of covers starts from the backup kinds
  const rotated = chosen.slice(ctx.variant % 2 && spec.kind === 'cover' && !spec.types ? 1 : 0).concat(chosen).slice(0, 3);
  // behind the gold card: the skyline with the UAE flag first, then calm backdrops fitted to the title
  const types = visaCard ? ['flag-skyline', ...rotated.filter((t) => t !== 'flag-skyline')].slice(0, 3) : rotated;
  // scenes written for THIS article by the AI photo editor (so the picture fits the title)
  const concept = await pictureConcept(spec, ctx, ref && refImg ? ref.caption : '', cfg, banner, types, recent.alts, visaCard, !!ref?.matched).catch((e) => {
    if (e instanceof AiError && (e.kind === 'quota' || e.kind === 'config')) throw e;
    void autoLog('warn', `Picture idea step failed, using house scenes: ${e instanceof Error ? e.message : e}`, ctx.jobId);
    return { scenes: [] as string[], alts: [] as string[], alt: '' };
  });
  // the alt text must describe the scene that was actually used (attempt k uses scene k)
  const generic = /—|^cover|illustration for/i.test(spec.alt);
  const safeAlt = `UAE city view at golden hour, ${ctx.focusKeyword || ctx.topic}`.slice(0, 200);
  const altFor = (attempt: number) => (spec.kind === 'cover' && attempt === maxAttempts && attempt > 1 ? (generic ? safeAlt : spec.alt) : '') || (generic && concept.scenes.length ? concept.alts[(attempt - 1) % concept.scenes.length] || concept.alt : '') || spec.alt;
  let safeRetry = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // the last cover try is the safest kind of photo (architecture, no people, no documents), so a cover is almost always ready
    const safeTry = spec.kind === 'cover' && attempt === maxAttempts && attempt > 1;
    const scene = safeTry ? SAFE_SCENE[(Math.abs(ctx.variant) + safeRetry * 3) % SAFE_SCENE.length] : concept.scenes.length ? concept.scenes[(attempt - 1) % concept.scenes.length] : undefined;
    const prompt = buildImagePrompt({ purpose: spec.purpose, hint: attempt === 1 ? spec.hint : undefined, topic: ctx.topic, houseStyle: cfg.images.houseStyle, variant: ctx.variant + attempt * 5, scene, withReference: !!refImg && !safeTry, refIdea: !!ref?.matched, symbols, still: banner });
    let raw: Buffer;
    try {
      raw = await generateImage(prompt, cfg, safeTry ? null : refImg);
    } catch (e: any) {
      if (e instanceof AiError && (e.kind === 'quota' || e.kind === 'config')) throw e;
      reasons.push(`attempt ${attempt}: ${e?.message || e}`);
      continue;
    }
    const sharpScore = await sharpness(raw);
    if (sharpScore < cfg.images.minSharpness) {
      reasons.push(`attempt ${attempt}: too soft (sharpness ${sharpScore} < ${cfg.images.minSharpness})`);
      continue;
    }
    const hash = await dhash(raw);
    const near = await nearestImage(hash);
    if (near.distance <= cfg.quality.maxImageDistance) {
      reasons.push(`attempt ${attempt}: too similar to a picture we used (distance ${near.distance})`);
      // the safe skyline try gets one more go with a different place
      if (safeTry && safeRetry === 0) {
        safeRetry = 1;
        attempt--;
      }
      continue;
    }
    let v: { ok: boolean; realism: number; match?: number; issues: string[] };
    if (isFakeAi()) v = { ok: true, realism: 9, issues: [] };
    else {
      try {
        v = await visionCheck(raw, scene || spec.purpose, cfg, spec.kind, ctx.topic, symbols ? 'official' : 'none');
      } catch (e: any) {
        // budget / missing key stop the job as before; a garbled or failed answer from the checker is not a
        // verdict on the picture — it already passed sharpness and duplicate checks, so keep it and say so
        if (e instanceof AiError && (e.kind === 'quota' || e.kind === 'config' || e.kind === 'auth')) throw e;
        await autoLog('warn', `Vision check could not run (${e?.message || e}) — picture kept after sharpness and duplicate checks.`, ctx.jobId);
        v = { ok: true, realism: 0, issues: ['vision check unavailable'] };
      }
    }
    if (!v.ok) {
      reasons.push(`attempt ${attempt}: vision check failed (realism ${v.realism}${v.issues.length ? `: ${v.issues.join(', ')}` : ''})`);
      const clean = !v.issues.some((i) => SERIOUS.test(i)) && (v.match ?? 10) >= 5;
      if (clean && v.realism >= Math.max(5, needed - 1) && (!best || v.realism > best.realism)) best = { raw, hash, sharp: sharpScore, realism: v.realism, attempt };
      continue;
    }
    return remember(await savePicture({ ...spec, alt: altFor(attempt) }, ctx, raw, hash, sharpScore, v.realism, attempt, look), visaCard ? 'flag-skyline' : spec.kind === 'cover' && attempt === maxAttempts && attempt > 1 ? 'skyline-flight' : types[(attempt - 1) % types.length]);
  }
  if (best && spec.kind === 'cover') {
    await autoLog('info', `No cover attempt reached ${needed}/10 — using the best clean attempt (realism ${best.realism}, no text, logos, hands or faces).`, ctx.jobId);
    return remember(await savePicture({ ...spec, alt: altFor(best.attempt) }, ctx, best.raw, best.hash, best.sharp, best.realism, maxAttempts, look), visaCard ? 'flag-skyline' : types[(best.attempt - 1) % types.length]);
  }
  await autoLog('warn', `Picture failed after ${maxAttempts} attempts (${spec.kind}): ${reasons.join(' · ')}`, ctx.jobId);
  return { ok: false, reason: reasons.join(' · '), attempts: maxAttempts };
}

type Look = { banner?: { text: CoverText; brand: CoverBrand; visaCard?: boolean }; emblem: Buffer | null; designed?: boolean };

/** Small logo mark on photos (when "Show logo on pictures" is on) */
async function marked(buf: Buffer, look: Look, quality: number): Promise<Buffer> {
  if (!look.emblem) return buf;
  return sharp(await watermark(buf, look.emblem)).webp({ quality }).toBuffer();
}

async function savePicture(spec: PictureSpec, ctx: { topic: string; focusKeyword: string; jobId?: string }, raw: Buffer, hash: string, sharpScore: number, realism: number, attempt: number, look: Look = { emblem: null }): Promise<PictureResult> {
  const base = `${slugify(ctx.focusKeyword || ctx.topic, 40)}-${spec.kind}`;
  let out: { url: string }, ogUrl: string | undefined, width: number, height: number;
  if (spec.kind === 'cover') {
    const [cover, og] = look.designed
      ? await designSizes(raw).then(async (s) => [await marked(s.cover, look, 86), await marked(s.og, look, 84)])
      : look.banner
      ? await Promise.all([composeCover(raw, look.banner.text, look.banner.brand, 1600, 900, { visaCard: look.banner.visaCard }), composeCover(raw, look.banner.text, look.banner.brand, 1200, 630, { visaCard: look.banner.visaCard })])
      : await Promise.all([
          sharp(raw).resize(1600, 900, { fit: 'cover', position: 'attention' }).webp({ quality: 82 }).toBuffer().then((b) => marked(b, look, 82)),
          sharp(raw).resize(1200, 630, { fit: 'cover', position: 'attention' }).webp({ quality: 80 }).toBuffer().then((b) => marked(b, look, 80)),
        ]);
    out = await saveWebp(cover, base, spec.alt);
    ogUrl = (await saveWebp(og, `${base}-og`, spec.alt)).url;
    const cm = look.designed ? await sharp(cover).metadata() : null;
    width = cm?.width || 1600;
    height = cm?.height || 900;
  } else {
    const buf = await marked(await sharp(raw).resize(1200, undefined, { withoutEnlargement: false }).webp({ quality: 80 }).toBuffer(), look, 80);
    const meta = await sharp(buf).metadata();
    out = await saveWebp(buf, base, spec.alt);
    width = meta.width || 1200;
    height = meta.height || 800;
  }
  await prisma.autoFingerprint
    .upsert({ where: { kind_refId: { kind: 'image', refId: out.url } }, update: { sig: JSON.stringify({ h: hash }) }, create: { kind: 'image', refId: out.url, sig: JSON.stringify({ h: hash }), title: spec.alt.slice(0, 200) } })
    .catch(() => null);
  await autoLog('info', `Picture ready (${spec.kind}, attempt ${attempt}, sharpness ${sharpScore}, realism ${realism}): ${out.url}`, ctx.jobId);
  return { ok: true, url: out.url, ogUrl, width, height, alt: spec.alt, hash, sharpness: sharpScore, realism, attempts: attempt };
}

/** Registers the dHash of pictures already on the site (blog covers in Media), so new ones never repeat them */
export async function fingerprintExistingImages(limit = 40): Promise<number> {
  const have = new Set((await prisma.autoFingerprint.findMany({ where: { kind: 'image' }, select: { refId: true } })).map((r) => r.refId));
  const covers = (await prisma.post.findMany({ select: { cover: true } })).map((p) => p.cover).filter((c): c is string => !!c && !have.has(c));
  let n = 0;
  for (const url of covers.slice(0, limit)) {
    try {
      const buf = await readLocal(url);
      if (!buf) continue;
      await prisma.autoFingerprint.create({ data: { kind: 'image', refId: url, sig: JSON.stringify({ h: await dhash(buf) }) } });
      n++;
    } catch {
      /* skip unreadable */
    }
  }
  return n;
}

/** <figure> markup for an inline picture */
export function figureHtml(p: { url: string; alt: string; width: number; height: number; caption?: string }) {
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<figure><img src="${p.url}" alt="${esc(p.alt)}" width="${p.width}" height="${p.height}" loading="lazy" decoding="async">${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}</figure>`;
}
