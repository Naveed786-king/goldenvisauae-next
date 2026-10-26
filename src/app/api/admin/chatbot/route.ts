import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { getChatConfig, publicChatConfig, saveChatConfig } from '@/lib/chatbot/config';
import { chatRepliesToday } from '@/lib/chatbot/engine';
import { PROVIDERS } from '@/lib/autopublisher/config';
import { dayKey } from '@/lib/autopublisher/pure';
import { callModel, isFakeAi, providerKey } from '@/lib/autopublisher/ai';
import { getAutoConfig } from '@/lib/autopublisher/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function stats() {
  const startToday = new Date(`${dayKey()}T00:00:00+04:00`);
  const startWeek = new Date(startToday.getTime() - 6 * 86_400_000);
  const c = (where: any) => prisma.chatSession.count({ where }).catch(() => 0);
  const reasons = await prisma.chatSession.groupBy({ by: ['handover'], where: { createdAt: { gte: startWeek }, status: 'handed' }, _count: { _all: true } }).catch(() => []);
  return {
    today: { chats: await c({ createdAt: { gte: startToday } }), handed: await c({ createdAt: { gte: startToday }, status: 'handed' }), withContact: await c({ createdAt: { gte: startToday }, OR: [{ phone: { not: null } }, { email: { not: null } }] }) },
    week: { chats: await c({ createdAt: { gte: startWeek } }), handed: await c({ createdAt: { gte: startWeek }, status: 'handed' }), withContact: await c({ createdAt: { gte: startWeek }, OR: [{ phone: { not: null } }, { email: { not: null } }] }) },
    reasons: Object.fromEntries(reasons.map((r) => [r.handover || 'other', r._count._all])),
    repliesToday: await chatRepliesToday(),
  };
}

export async function GET() {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const cfg = await getChatConfig();
  return ok({ config: publicChatConfig(cfg), stats: await stats(), providers: PROVIDERS });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const b = await req.json().catch(() => null);
  if (!b?.config || typeof b.config !== 'object') return fail('Invalid data');
  const next = await saveChatConfig(b.config);
  return ok({ config: publicChatConfig(next), stats: await stats() });
}

/** Test the chatbot's AI connection with a short call */
export async function POST() {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const cfg = await getChatConfig();
  if (isFakeAi()) return ok({ answer: 'Fake mode: connected', ms: 0 });
  const key = cfg.key?.trim() || (await providerKey(await getAutoConfig(), cfg.provider));
  if (!key) return fail(`No API key for ${cfg.provider}. Add one here or in Auto Publisher → AI & pictures.`);
  const t = Date.now();
  try {
    const answer = await callModel(cfg.provider, key, cfg.model, { system: 'You are a connection test.', prompt: 'Reply with: connected', temperature: 0, maxTokens: 50, timeoutMs: 30_000 });
    return ok({ answer: answer.slice(0, 200), ms: Date.now() - t });
  } catch (e: any) {
    return fail(e?.message || 'Test failed');
  }
}
