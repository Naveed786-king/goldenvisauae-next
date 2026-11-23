import { ok, fail } from '@/lib/api';
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { currentStageId, decisionOf, metaOf, stepsFor } from '@/lib/portal/files';
import { stepGroupFor } from '@/lib/portal/config';

export const dynamic = 'force-dynamic';
const CLOSED = new Set(['completed', 'rejected', 'cancelled', 'withdrawn', 'archived']);

/** Open files per service group (step list) and per step, for the Application steps page. */
export async function GET() {
  if (!(await requireStaff())) return fail('Unauthorized', 401);
  const apps = await prisma.application.findMany({ select: { id: true, service: true, status: true, stageId: true, stageDates: true, decision: true, meta: true } as any });
  const out: Record<string, { files: number; perStep: Record<string, number> }> = {};
  for (const a of apps as any[]) {
    if (CLOSED.has(a.status) || decisionOf(a).result === 'withdrawn' || metaOf(a).archived) continue;
    const g = stepGroupFor(a.service);
    const steps = await stepsFor(a.service);
    const id = currentStageId(a, steps);
    out[g] = out[g] || { files: 0, perStep: {} };
    out[g].files++;
    if (id) out[g].perStep[id] = (out[g].perStep[id] || 0) + 1;
  }
  return ok(out);
}
