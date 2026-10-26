import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { MARKETS } from '@/lib/autopublisher/research';
import { LOCALES } from '@/lib/i18n/config';
import { autoLog } from '@/lib/autopublisher/log';

export const dynamic = 'force-dynamic';

const str = (v: any, max = 20000) => String(v ?? '').slice(0, max);
const int = (v: any, d: number, a: number, b: number) => Math.min(b, Math.max(a, Math.round(Number.isFinite(Number(v)) ? Number(v) : d)));

function clean(b: any) {
  const markets = (Array.isArray(b.markets) ? b.markets : []).map((x: any) => String(x).toUpperCase()).filter((x: string) => MARKETS[x]);
  const codes = LOCALES.map((l: any) => (typeof l === 'string' ? l : l.code));
  const languages = (Array.isArray(b.languages) ? b.languages : []).map(String).filter((x: string) => codes.includes(x));
  const minWords = int(b.minWords, 1500, 600, 6000);
  const stop = b.stopRule && typeof b.stopRule === 'object' ? b.stopRule : {};
  return {
    name: str(b.name, 120).trim() || 'Untitled mission',
    active: !!b.active,
    focus: str(b.focus, 2000),
    keywords: str(b.keywords, 5000),
    markets: JSON.stringify(markets.length ? markets : ['AE']),
    languages: JSON.stringify(languages),
    postsPerWeek: int(b.postsPerWeek, 21, 0, 70),
    publishMode: b.publishMode === 'publish' ? 'publish' : 'review',
    category: str(b.category, 60),
    minWords,
    maxWords: Math.max(minWords + 200, int(b.maxWords, 2500, 800, 8000)),
    tone: str(b.tone, 500),
    customTitles: str(b.customTitles, 100000),
    stopRule: JSON.stringify({ type: ['never', 'date', 'count', 'titles'].includes(stop.type) ? stop.type : 'never', value: str(stop.value, 40) }),
  };
}

export async function GET() {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const items = await prisma.autoMission.findMany({ orderBy: { createdAt: 'asc' } });
  return ok({ items: items.map((m) => ({ ...m, markets: JSON.parse(m.markets || '[]'), languages: JSON.parse(m.languages || '[]'), stopRule: JSON.parse(m.stopRule || '{}') })), markets: MARKETS });
}

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return fail('Admins only', 403);
  const b = await req.json().catch(() => null);
  if (!b) return fail('Invalid data');
  if (b.duplicateOf) {
    const src = await prisma.autoMission.findUnique({ where: { id: String(b.duplicateOf) } });
    if (!src) return fail('Not found', 404);
    const { id, createdAt, updatedAt, lastRunAt, total, ...rest } = src;
    const m = await prisma.autoMission.create({ data: { ...rest, name: `${src.name} (copy)`, active: false } });
    return ok({ item: m });
  }
  const m = await prisma.autoMission.create({ data: clean(b) });
  await autoLog('info', `Mission created: ${m.name}`);
  return ok({ item: m });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const b = await req.json().catch(() => null);
  if (!b?.id) return fail('Invalid data');
  const m = await prisma.autoMission.update({ where: { id: String(b.id) }, data: clean(b) }).catch(() => null);
  if (!m) return fail('Not found', 404);
  return ok({ item: m });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return fail('Missing id');
  await prisma.autoMission.delete({ where: { id } }).catch(() => null);
  return ok();
}
