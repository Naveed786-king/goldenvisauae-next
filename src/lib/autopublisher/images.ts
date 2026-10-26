// AI pictures: prompt builder, generation (OpenAI / Gemini), automatic quality control
// (sharpness, vision check, duplicate check), WebP output and saving to the Media library.
import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { savePublicFile } from '@/lib/upload';
import { AutoConfig } from './config';
import { AiError, completeJson, http, isFakeAi, providerKey } from './ai';
import { autoLog, countAiCall } from './log';
import { slugify } from './text';
import { dhash, hamming, sharpness } from './imaging';

export { dhash, hamming, sharpness };

// ---------------------------------------------------------------- prompts

import { buildImagePrompt } from './image-prompt';
export { buildImagePrompt, peopleAllowed } from './image-prompt';

// ---------------------------------------------------------------- generation

export async function generateImage(prompt: string, cfg: AutoConfig): Promise<Buffer> {
  if (isFakeAi()) return fakeImage(prompt);
  const which = cfg.images.provider;
  const key = await providerKey(cfg, which === 'openai' ? 'openai' : 'gemini');
  if (!key) throw new AiError('config', `No ${which === 'openai' ? 'OpenAI' : 'Gemini'} key for pictures. Add it in AI & pictures.`);
  await countAiCall();
  if (which === 'openai') {
    const model = cfg.images.openaiModel || 'gpt-image-1';
    const body: any = { model, prompt, n: 1, size: model.startsWith('dall-e') ? '1792x1024' : '1536x1024' };
    if (model.startsWith('dall-e')) Object.assign(body, { response_format: 'b64_json', quality: cfg.images.quality === 'high' ? 'hd' : 'standard' });
    else body.quality = cfg.images.quality;
    const j = await http('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }, 180_000, 'OpenAI images');
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) throw new AiError('bad_output', 'OpenAI returned no picture');
    return Buffer.from(b64, 'base64');
  }
  const base = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com';
  const model = cfg.images.geminiModel || 'gemini-2.5-flash-image';
  const j = await http(
    `${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `${prompt}\nWide 16:9 landscape format.` }] }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } }) },
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
export async function visionCheck(buf: Buffer, purpose: string, cfg: AutoConfig): Promise<{ ok: boolean; realism: number; issues: string[] }> {
  const small = await sharp(buf).resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 82 }).toBuffer();
  const r = await completeJson<any>({
    system: 'You are a strict picture quality inspector for a premium consultancy website. Be honest and critical.',
    prompt: `Check this picture, meant for: "${purpose}".
Reject it if ANY of these is true: visible text, letters, numbers, logos or watermarks; deformed or extra fingers/hands; warped or uncanny faces; obvious AI artefacts; blurry or low detail; documents with readable details; off-topic or unrealistic scene.
People-free scenes of UAE cities, architecture, offices, homes or coastlines ARE on-topic for this visa and residency consultancy.
Return JSON only: {"ok": true|false, "realism": 0-10, "issues": ["…"]}`,
    images: [{ mime: 'image/jpeg', data: small.toString('base64') }],
    temperature: 0,
    maxTokens: 1500,
    timeoutMs: 60_000,
  });
  const realism = Math.max(0, Math.min(10, Number(r?.realism) || 0));
  const issues = Array.isArray(r?.issues) ? r.issues.map(String).slice(0, 6) : [];
  return { ok: !!r?.ok && realism >= cfg.images.minRealism, realism, issues };
}

// ---------------------------------------------------------------- output

async function saveWebp(buf: Buffer, name: string, alt: string): Promise<{ url: string; size: number }> {
  const file = new File([new Uint8Array(buf)], `${name}.webp`, { type: 'image/webp' });
  const saved = await savePublicFile(file);
  await prisma.media.create({ data: { filename: saved.filename, url: saved.url, mime: 'image/webp', size: saved.size, alt: alt.slice(0, 300) } }).catch(() => null);
  return { url: saved.url, size: saved.size };
}

export type PictureSpec = { purpose: string; hint?: string; alt: string; kind: 'cover' | 'inline'; placement?: string };
export type PictureResult = { ok: true; url: string; ogUrl?: string; width: number; height: number; alt: string; hash: string; sharpness: number; realism: number; attempts: number } | { ok: false; reason: string; attempts: number };

/**
 * Makes one picture: up to 3 attempts of generate → sharpness → vision → duplicate check,
 * then saves WebP files (cover 1600×900 + Open Graph 1200×630, inline 1200 wide).
 */
export async function producePicture(spec: PictureSpec, ctx: { topic: string; focusKeyword: string; variant: number; jobId?: string }, cfg: AutoConfig): Promise<PictureResult> {
  const reasons: string[] = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    const prompt = buildImagePrompt({ purpose: spec.purpose, hint: attempt === 1 ? spec.hint : undefined, topic: ctx.topic, houseStyle: cfg.images.houseStyle, variant: ctx.variant + attempt * 5 });
    let raw: Buffer;
    try {
      raw = await generateImage(prompt, cfg);
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
      continue;
    }
    let v: { ok: boolean; realism: number; issues: string[] };
    if (isFakeAi()) v = { ok: true, realism: 9, issues: [] };
    else {
      try {
        v = await visionCheck(raw, spec.purpose, cfg);
      } catch (e: any) {
        // budget / missing key stop the job as before; a garbled or failed answer from the checker is not a
        // verdict on the picture — it already passed sharpness and duplicate checks, so keep it and say so
        if (e instanceof AiError && (e.kind === 'quota' || e.kind === 'config' || e.kind === 'auth')) throw e;
        await autoLog('warn', `Vision check could not run (${e?.message || e}) — picture kept after sharpness and duplicate checks; please look at it in review.`, ctx.jobId);
        v = { ok: true, realism: 0, issues: ['vision check unavailable'] };
      }
    }
    if (!v.ok) {
      reasons.push(`attempt ${attempt}: vision check failed (realism ${v.realism}${v.issues.length ? `: ${v.issues.join(', ')}` : ''})`);
      continue;
    }
    const base = `${slugify(ctx.focusKeyword || ctx.topic, 40)}-${slugify(spec.purpose, 24) || spec.kind}`;
    let out: { url: string }, ogUrl: string | undefined, width: number, height: number;
    if (spec.kind === 'cover') {
      const cover = await sharp(raw).resize(1600, 900, { fit: 'cover', position: 'attention' }).webp({ quality: 82 }).toBuffer();
      const og = await sharp(raw).resize(1200, 630, { fit: 'cover', position: 'attention' }).webp({ quality: 80 }).toBuffer();
      out = await saveWebp(cover, base, spec.alt);
      ogUrl = (await saveWebp(og, `${base}-og`, spec.alt)).url;
      width = 1600;
      height = 900;
    } else {
      const img = sharp(raw).resize(1200, undefined, { withoutEnlargement: false });
      const buf = await img.webp({ quality: 80 }).toBuffer();
      const meta = await sharp(buf).metadata();
      out = await saveWebp(buf, base, spec.alt);
      width = meta.width || 1200;
      height = meta.height || 800;
    }
    await prisma.autoFingerprint
      .upsert({ where: { kind_refId: { kind: 'image', refId: out.url } }, update: { sig: JSON.stringify({ h: hash }) }, create: { kind: 'image', refId: out.url, sig: JSON.stringify({ h: hash }), title: spec.alt.slice(0, 200) } })
      .catch(() => null);
    await autoLog('info', `Picture ready (${spec.kind}, attempt ${attempt}, sharpness ${sharpScore}, realism ${v.realism}): ${out.url}`, ctx.jobId);
    return { ok: true, url: out.url, ogUrl, width, height, alt: spec.alt, hash, sharpness: sharpScore, realism: v.realism, attempts: attempt };
  }
  await autoLog('warn', `Picture failed after 3 attempts (${spec.purpose}): ${reasons.join(' · ')}`, ctx.jobId);
  return { ok: false, reason: reasons.join(' · '), attempts: 3 };
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

async function readLocal(url: string): Promise<Buffer | null> {
  const { readStored } = await import('@/lib/upload');
  if (url.startsWith('/uploads/')) return readStored(url);
  if (url.startsWith('/')) {
    const { promises: fs } = await import('fs');
    const path = await import('path');
    try {
      return await fs.readFile(path.join(process.cwd(), 'public', url));
    } catch {
      return null;
    }
  }
  return null;
}

/** <figure> markup for an inline picture */
export function figureHtml(p: { url: string; alt: string; width: number; height: number; caption?: string }) {
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<figure><img src="${p.url}" alt="${esc(p.alt)}" width="${p.width}" height="${p.height}" loading="lazy" decoding="async">${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}</figure>`;
}
