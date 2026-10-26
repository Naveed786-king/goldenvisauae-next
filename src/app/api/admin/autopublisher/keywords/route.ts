import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { researchMission } from '@/lib/autopublisher/research';
import { keywordIntent, normalize, scoreKeyword } from '@/lib/autopublisher/text';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const u = new URL(req.url);
  const q = normalize(u.searchParams.get('q') || '');
  const status = u.searchParams.get('status') || '';
  const where: any = {};
  if (q) where.keyword = { contains: q };
  if (['new', 'used', 'skipped'].includes(status)) where.status = status;
  const [items, counts] = await Promise.all([
    prisma.autoKeyword.findMany({ where, orderBy: [{ score: 'desc' }, { hits: 'desc' }], take: 300 }),
    prisma.autoKeyword.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  return ok({ items, counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const b = await req.json().catch(() => ({}));
  if (b.action === 'add') {
    const list = String(b.keywords || '').split(/\n+/).map((k) => normalize(k)).filter((k) => k.split(' ').length >= 2).slice(0, 200);
    let added = 0;
    for (const k of list) {
      const score = Math.max(60, scoreKeyword(k, { hits: 1, bestPos: 0, markets: 1 }));
      const r = await prisma.autoKeyword.upsert({ where: { keyword: k }, update: { status: 'new' }, create: { keyword: k, source: 'manual', intent: keywordIntent(k), score, hits: 1, status: 'new', market: 'manual' } }).catch(() => null);
      if (r) added++;
    }
    return ok({ added });
  }
  if (b.action === 'status' && b.id && ['new', 'used', 'skipped'].includes(b.status)) {
    await prisma.autoKeyword.update({ where: { id: String(b.id) }, data: { status: b.status } });
    return ok();
  }
  if (b.action === 'delete' && b.id) {
    await prisma.autoKeyword.delete({ where: { id: String(b.id) } }).catch(() => null);
    return ok();
  }
  if (b.action === 'research') {
    const missions = await prisma.autoMission.findMany({ where: b.missionId ? { id: String(b.missionId) } : { active: true } });
    if (!missions.length) return fail('Create a mission first (seed keywords come from missions)');
    let saved = 0,
      requests = 0;
    for (const m of missions.slice(0, 3)) {
      const r = await researchMission(m, 40);
      saved += r.saved;
      requests += r.requests;
    }
    return ok({ saved, requests });
  }
  return fail('Unknown action');
}
