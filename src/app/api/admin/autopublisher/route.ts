import { ok, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { getAutoConfig, publicConfig, saveAutoConfig, PROVIDERS, ProviderId } from '@/lib/autopublisher/config';
import { getStatus } from '@/lib/autopublisher/status';
import { testProvider } from '@/lib/autopublisher/ai';
import { autoLog } from '@/lib/autopublisher/log';
import { producePicture } from '@/lib/autopublisher/images';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Settings (keys masked) + live status */
export async function GET() {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const cfg = await getAutoConfig();
  return ok({ config: publicConfig(cfg), status: await getStatus(cfg), providers: PROVIDERS });
}

/** Save settings. Masked keys sent back keep the stored key. */
export async function PUT(req: Request) {
  const s = await requireAdmin();
  if (!s) return fail('Admins only', 403);
  const body = await req.json().catch(() => null);
  if (!body?.config || typeof body.config !== 'object') return fail('Invalid data');
  const before = await getAutoConfig();
  const next = await saveAutoConfig(body.config);
  if (before.enabled !== next.enabled) await autoLog('info', `Publisher switched ${next.enabled ? 'ON' : 'OFF'} by ${s.email}`);
  return ok({ config: publicConfig(next), status: await getStatus(next) });
}

/** Actions: test a provider, pause, resume */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return fail('Admins only', 403);
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || '');

  if (action === 'test') {
    const id = String(body.provider || '') as ProviderId;
    if (!PROVIDERS.some((p) => p.id === id)) return fail('Unknown provider');
    try {
      const r = await testProvider(id);
      await autoLog('info', `Test ${id} OK (${r.model}, ${r.ms} ms)`);
      return ok(r);
    } catch (e: any) {
      await autoLog('warn', `Test ${id} failed: ${e?.message || e}`);
      return fail(e?.message || 'Test failed', 400);
    }
  }

  if (action === 'testPicture') {
    try {
      const cfg = await getAutoConfig();
      const t = Date.now();
      const r = await producePicture(
        { kind: 'inline', purpose: String(body.purpose || 'a family reviewing documents in a bright Dubai apartment').slice(0, 300), alt: 'Test picture — family reviewing documents in Dubai' },
        { topic: 'UAE Golden Visa for families', focusKeyword: 'golden visa test picture', variant: Math.floor(Math.random() * 1000) },
        cfg,
      );
      return r.ok ? ok({ ...r, ms: Date.now() - t }) : fail(`Picture failed the checks: ${(r as { reason: string }).reason}`);
    } catch (e: any) {
      return fail(e?.message || 'Picture test failed');
    }
  }

  if (action === 'pause') {
    const hours = Math.min(24 * 30, Math.max(1, Number(body.hours) || 24));
    const next = await saveAutoConfig({ pausedUntil: new Date(Date.now() + hours * 3_600_000).toISOString() } as any);
    await autoLog('info', `Paused for ${hours} h by ${s.email}`);
    return ok({ config: publicConfig(next), status: await getStatus(next) });
  }

  if (action === 'resume') {
    const next = await saveAutoConfig({ pausedUntil: '' } as any);
    await autoLog('info', `Resumed by ${s.email}`);
    return ok({ config: publicConfig(next), status: await getStatus(next) });
  }

  return fail('Unknown action');
}
