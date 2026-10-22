// Background translation queue (runs inside the website server process).
import { after } from 'next/server';
import { getSetting } from '../settings';
import { TRANSLATED_LOCALES } from './config';
import { translateEntity, allTranslatableEntities, Entity } from './content';
import { notReadyReason } from './translate';

type Job = { entity: Entity; id: string; locale: string; force: boolean };

type QueueState = {
  queue: Job[];
  keys: Set<string>;
  running: boolean;
  workers: number;
  done: number;
  failed: number;
  lastError: string;
  current: string;
};

const g = globalThis as unknown as { __rgvQueue?: QueueState };
const Q: QueueState = (g.__rgvQueue ??= { queue: [], keys: new Set(), running: false, workers: 0, done: 0, failed: 0, lastError: '', current: '' });

export async function targetLocales() {
  const cfg = await getSetting('translation');
  return TRANSLATED_LOCALES.filter((l) => cfg.enabled.includes(l));
}

export function queueStatus() {
  return { pending: Q.queue.length, running: Q.running, current: Q.current, done: Q.done, failed: Q.failed, lastError: Q.lastError };
}

/** Add translation jobs. locales defaults to all enabled languages. */
export async function enqueue(entity: Entity, id: string, opts: { locales?: string[]; force?: boolean; priority?: boolean } = {}) {
  const cfg = await getSetting('translation');
  if (cfg.provider === 'off') return;
  const locales = opts.locales || (await targetLocales());
  for (const locale of locales) {
    const key = `${entity}:${id}:${locale}`;
    if (Q.keys.has(key)) continue;
    Q.keys.add(key);
    const job = { entity, id, locale, force: !!opts.force };
    if (opts.priority) Q.queue.unshift(job);
    else Q.queue.push(job);
  }
  run(cfg.provider === 'google' || notReadyReason(cfg) ? 1 : 4);
  keepAlive();
}

/** Resolves when the queue is empty (or after maxMs). */
export async function waitIdle(maxMs: number) {
  const end = Date.now() + maxMs;
  while ((Q.running || Q.queue.length) && Date.now() < end) await new Promise((r) => setTimeout(r, 500));
}

/**
 * Serverless hosts (Vercel) freeze the process after the response is sent.
 * after() keeps the function alive so background translations can finish.
 */
export function keepAlive(maxMs = 55_000) {
  if (!process.env.VERCEL || (!Q.running && !Q.queue.length)) return;
  try {
    after(() => waitIdle(maxMs));
  } catch {
    // called outside a request (e.g. startup) - nothing to keep alive
  }
}

/** Called after content is saved in the admin panel */
export async function onContentSaved(entity: Entity, id: string) {
  const cfg = await getSetting('translation');
  if (!cfg.autoTranslate || cfg.provider === 'off') return;
  await enqueue(entity, id, { priority: true });
}

/** Queue everything that may be missing or out of date */
export async function enqueueAll(force = false) {
  const list = await allTranslatableEntities();
  const locales = await targetLocales();
  // Language by language so that whole languages become ready one after another
  for (const locale of locales) for (const e of list) await enqueue(e.entity, e.id, { locales: [locale], force });
}

/** Starts up to `parallel` workers that empty the queue (paid APIs can work in parallel). */
function run(parallel = 1) {
  if (!Q.workers) Q.workers = 0;
  while (Q.workers < parallel && Q.queue.length > Q.workers) {
    Q.workers++;
    Q.running = true;
    worker().finally(() => {
      Q.workers--;
      if (!Q.workers) {
        Q.running = false;
        Q.current = '';
      }
    });
  }
}

async function worker() {
  while (Q.queue.length) {
    const job = Q.queue.shift()!;
    Q.keys.delete(`${job.entity}:${job.id}:${job.locale}`);
    Q.current = `${job.entity} → ${job.locale}`;
    try {
      await translateEntity(job.entity, job.id, job.locale, job.force);
      Q.done++;
      Q.lastError = '';
    } catch (e) {
      Q.failed++;
      Q.lastError = `${job.entity} ${job.locale}: ${(e as Error).message}`;
      console.error('[translate]', Q.lastError);
      // a wrong/missing key would fail every job - stop instead of retrying everything
      if (/API key|limit reached|turned off/i.test((e as Error).message)) {
        Q.queue.length = 0;
        Q.keys.clear();
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
