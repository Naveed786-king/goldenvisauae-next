import { ok, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { getAutoConfig } from '@/lib/autopublisher/config';
import { rebuildFingerprints, siteReport } from '@/lib/autopublisher/similarity';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET() {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const cfg = await getAutoConfig();
  return ok(await siteReport(cfg));
}

/** Rebuild fingerprints (in batches; call again until remaining = 0) */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const b = await req.json().catch(() => ({}));
  const cfg = await getAutoConfig();
  const done = await rebuildFingerprints(cfg.quality.embeddings !== 'off' ? 20 : 400, cfg, !!b.force);
  return ok({ done });
}
