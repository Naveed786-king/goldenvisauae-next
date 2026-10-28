// Photo library: pictures the admin uploads as inspiration. Each one gets a short description
// from the vision AI; for every article picture the best matching photo (by title and section)
// is sent along to the picture AI, which makes a NEW photo in the same style and kind of scene.
import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { AutoConfig } from './config';
import { AiError, completeJson } from './ai';
import { autoLog } from './log';
import { stem, terms } from './text';
import { readLocal } from './local-file';

export type Reference = { id: string; url: string; caption: string; tags: string };

/** Small JPEG of a library photo (for the vision AI and as the picture AI's reference) */
export async function referenceImage(url: string, size = 1024): Promise<Buffer> {
  const raw = await readLocal(url);
  if (!raw) throw new Error(`Photo not found: ${url}`);
  return sharp(raw).rotate().resize(size, size, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

/** Writes a description + keywords for library photos that have none yet. Returns how many were described. */
export async function describeReferences(cfg: AutoConfig, limit = 5): Promise<number> {
  const todo = await prisma.autoReference.findMany({ where: { caption: '' }, orderBy: { createdAt: 'asc' }, take: limit });
  let done = 0;
  for (const r of todo) {
    try {
      const img = await referenceImage(r.url, 768);
      const d = await completeJson<{ caption?: string; tags?: string[] }>({
        system: 'You describe photos for the picture library of a UAE visa and residency consultancy. Be literal and specific.',
        prompt: 'Describe this photo in ONE sentence (place, main objects, people if any, light and mood). Then give 6-12 single-word tags (lowercase, English) a writer would search for.\nReturn JSON only: {"caption": "", "tags": [""]}',
        images: [{ mime: 'image/jpeg', data: img.toString('base64') }],
        temperature: 0.2,
        maxTokens: 800,
        timeoutMs: 60_000,
      });
      const caption = String(d?.caption || '').trim().slice(0, 480) || 'Photo from our library';
      const tags = (Array.isArray(d?.tags) ? d.tags : []).map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 15).join(', ').slice(0, 480);
      await prisma.autoReference.update({ where: { id: r.id }, data: { caption, tags } });
      done++;
    } catch (e) {
      // budget / missing key: stop and try again later; a broken file gets a placeholder so it is not retried forever
      if (e instanceof AiError && (e.kind === 'quota' || e.kind === 'config' || e.kind === 'auth')) throw e;
      await prisma.autoReference.update({ where: { id: r.id }, data: { caption: 'Photo from our library (could not be described)' } });
      await autoLog('warn', `Could not describe library photo ${r.url}: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (done) await autoLog('info', `Described ${done} library photo(s)`);
  return done;
}

const stems = (s: string) => new Set(terms(s).map(stem));

/** How well a library photo fits a picture: shared words between title/section and its description, tags and file name */
export function referenceScore(want: Set<string>, r: { caption: string; tags: string; url: string }): number {
  const have = stems(`${r.caption} ${r.tags} ${r.url.split('/').pop()?.replace(/[-_.]/g, ' ') || ''}`);
  let n = 0;
  for (const w of want) if (have.has(w)) n++;
  return n;
}

/**
 * The library photo for one article picture: the best match by words, rarely used photos first among
 * equals; with no match at all, the least recently used photo (so the library still sets the style).
 */
export async function pickReference(text: string, excludeIds: string[] = []): Promise<Reference | null> {
  const refs = await prisma.autoReference.findMany({ where: { active: true, id: { notIn: excludeIds } }, select: { id: true, url: true, caption: true, tags: true, uses: true, lastUsedAt: true } });
  if (!refs.length) return null;
  const want = stems(text);
  const ranked = refs
    .map((r) => ({ r, s: referenceScore(want, r) - Math.min(1, r.uses * 0.1) }))
    .sort((a, b) => b.s - a.s || (a.r.lastUsedAt?.getTime() || 0) - (b.r.lastUsedAt?.getTime() || 0));
  const best = ranked[0].s > 0 ? ranked[0].r : [...refs].sort((a, b) => (a.lastUsedAt?.getTime() || 0) - (b.lastUsedAt?.getTime() || 0))[0];
  await prisma.autoReference.update({ where: { id: best.id }, data: { uses: { increment: 1 }, lastUsedAt: new Date() } });
  return { id: best.id, url: best.url, caption: best.caption, tags: best.tags };
}
