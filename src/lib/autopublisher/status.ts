// Status summary for the admin Overview tab.
import { prisma } from '@/lib/db';
import { AutoConfig } from './config';
import { isFakeAi, providerKey } from './ai';
import { aiCallsToday, getBackoff } from './log';
import { dayKey } from './pure';

export async function getStatus(cfg: AutoConfig) {
  const now = new Date();
  const startToday = new Date(`${dayKey(now)}T00:00:00+04:00`);
  const startWeek = new Date(startToday.getTime() - 6 * 86_400_000);
  const backoff = await getBackoff();
  const writerKey = await providerKey(cfg, cfg.writer);
  const paused = cfg.pausedUntil && new Date(cfg.pausedUntil) > now ? cfg.pausedUntil : '';
  const backedOff = backoff.until && new Date(backoff.until) > now ? backoff : null;
  const calls = await aiCallsToday();

  const count = async (where: any) => {
    try {
      return await prisma.autoJob.count({ where });
    } catch {
      return 0;
    }
  };
  const since = (d: Date) => ({ updatedAt: { gte: d } });
  const stats = {
    today: { written: await count({ ...since(startToday), stage: { in: ['publish', 'done'] } }), published: await count({ ...since(startToday), stage: 'done' }), held: await count({ ...since(startToday), stage: 'held' }), failed: await count({ ...since(startToday), stage: 'failed' }) },
    week: { written: await count({ ...since(startWeek), stage: { in: ['publish', 'done'] } }), published: await count({ ...since(startWeek), stage: 'done' }), held: await count({ ...since(startWeek), stage: 'held' }), failed: await count({ ...since(startWeek), stage: 'failed' }) },
  };

  let state: 'off' | 'no_key' | 'paused' | 'backoff' | 'budget' | 'ready' = 'ready';
  if (!cfg.enabled) state = 'off';
  else if (!writerKey && !isFakeAi()) state = 'no_key';
  else if (paused) state = 'paused';
  else if (backedOff) state = 'backoff';
  else if (cfg.quality.maxAiCallsPerDay > 0 && calls >= cfg.quality.maxAiCallsPerDay) state = 'budget';

  return {
    state,
    fakeAi: isFakeAi(),
    writerHasKey: !!writerKey,
    pausedUntil: paused,
    backoff: backedOff,
    aiCallsToday: calls,
    maxAiCallsPerDay: cfg.quality.maxAiCallsPerDay,
    stats,
    pipelineReady: true,
    tickEveryMinutes: process.env.VERCEL ? 10 : 2,
    tickerDisabled: process.env.DISABLE_AUTOPUBLISHER === '1',
  };
}
