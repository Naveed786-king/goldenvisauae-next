import { ok, fail } from '@/lib/api';
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { currentStageId, decisionOf, stepsFor } from '@/lib/portal/files';

export const dynamic = 'force-dynamic';
const CLOSED = new Set(['completed', 'rejected', 'cancelled', 'withdrawn', 'archived']);

/** Open files per step list (Golden Visa / other services) and per step, for the Application steps page. */
export async function GET() {
  if (!(await requireStaff())) return fail('Unauthorized', 401);
  const apps = await prisma.application.findMany({ select: { id: true, service: true, status: true, stageId: true, stageDates: true, decision: true } as any });
  const out: Record<'golden' | 'other', { files: number; perStep: Record<string, number> }> = { golden: { files: 0, perStep: {} }, other: { files: 0, perStep: {} } };
  for (const a of apps as any[]) {
    if (CLOSED.has(a.status) || decisionOf(a).result === 'withdrawn') continue;
    const g = /golden/i.test(a.service || '') ? 'golden' : 'other';
    const steps = await stepsFor(a.service);
    const id = currentStageId(a, steps);
    out[g].files++;
    if (id) out[g].perStep[id] = (out[g].perStep[id] || 0) + 1;
  }
  return ok(out);
}
