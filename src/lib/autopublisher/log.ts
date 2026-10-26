// Auto Publisher log + small state helpers (daily AI-call budget, pause, lock). Never throws.
import { prisma } from '@/lib/db';
import { dayKey, scrubSecrets } from './pure';

export type Level = 'info' | 'warn' | 'error';

export async function autoLog(level: Level, message: string, jobId?: string | null) {
  try {
    await prisma.autoLog.create({ data: { level, message: scrubSecrets(message).slice(0, 4000), jobId: jobId || null } });
    // keep the table small: every ~50 writes, drop everything beyond the newest 2000 lines
    if (Math.random() < 0.02) {
      const cut = await prisma.autoLog.findMany({ orderBy: { createdAt: 'desc' }, skip: 2000, take: 1, select: { createdAt: true } });
      if (cut[0]) await prisma.autoLog.deleteMany({ where: { createdAt: { lte: cut[0].createdAt } } });
    }
  } catch {
    /* logging must never break anything */
  }
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    return row ? { ...fallback, ...JSON.parse(row.value) } : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: any) {
  const v = JSON.stringify(value);
  await prisma.setting.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
}

/** AI calls made today (Dubai time) */
export async function aiCallsToday(): Promise<number> {
  const s = await readJson('autopublisher:calls', { day: '', count: 0 });
  return s.day === dayKey() ? s.count : 0;
}

export async function countAiCall() {
  try {
    const s = await readJson('autopublisher:calls', { day: '', count: 0 });
    const today = dayKey();
    await writeJson('autopublisher:calls', { day: today, count: (s.day === today ? s.count : 0) + 1 });
  } catch {
    /* ignore */
  }
}

/** Rate-limit back-off set by the AI client (separate from the admin's own "pause") */
export async function getBackoff(): Promise<{ until: string; reason: string }> {
  return readJson('autopublisher:backoff', { until: '', reason: '' });
}

export async function setBackoff(minutes: number, reason: string) {
  await writeJson('autopublisher:backoff', { until: new Date(Date.now() + minutes * 60_000).toISOString(), reason });
}

/**
 * Cross-process lock in the Setting table. Returns a release function, or null if another
 * tick holds a lock that has not expired yet.
 */
export async function acquireLock(name = 'autopublisher:lock', ttlMs = 10 * 60_000): Promise<null | (() => Promise<void>)> {
  const owner = Math.random().toString(36).slice(2);
  const now = Date.now();
  try {
    const row = await prisma.setting.findUnique({ where: { key: name } });
    if (row) {
      const cur = JSON.parse(row.value || '{}');
      if (cur.expires && cur.expires > now) return null;
      // take over an expired lock only if nobody changed it in between
      const res = await prisma.setting.updateMany({ where: { key: name, value: row.value }, data: { value: JSON.stringify({ owner, expires: now + ttlMs }) } });
      if (res.count !== 1) return null;
    } else {
      await prisma.setting.create({ data: { key: name, value: JSON.stringify({ owner, expires: now + ttlMs }) } });
    }
  } catch {
    return null; // e.g. unique clash when two processes create the row at once
  }
  return async () => {
    try {
      const row = await prisma.setting.findUnique({ where: { key: name } });
      if (row && JSON.parse(row.value || '{}').owner === owner) await prisma.setting.update({ where: { key: name }, data: { value: JSON.stringify({ owner: '', expires: 0 }) } });
    } catch {
      /* ignore */
    }
  };
}
