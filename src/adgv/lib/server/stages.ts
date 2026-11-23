import 'server-only';
import { stepsFor as gvSteps } from '@/lib/portal/files';
import type { StageDef } from '@/adgv/lib/stage-defs';
import type { Application } from './store';

export async function getStages() { return null; }
export const stepGroupOf = (a: Pick<Application, 'stepGroup'>) => a.stepGroup;
export async function stepsFor(a: Pick<Application, 'route'>): Promise<StageDef[]> {
  return (await gvSteps(a.route)).map((s) => ({ id: s.id, name: s.name, group: s.group, next: s.next, notify: s.notify }));
}
/** Step names of both lists (Admin > Client system > Application steps). */
export async function allStepNames(): Promise<Record<string, string[]>> {
  const s = await getSetting();
  const { STEP_SERVICES } = await import('@/lib/portal/config');
  const out: Record<string, string[]> = {};
  for (const g of STEP_SERVICES) {
    const own = s.groups?.[g];
    out[g] = (g === 'Golden Visa' ? s.golden : Array.isArray(own) && own.length ? own : s.other).map((x) => x.name);
  }
  return out;
}
async function getSetting() {
  const { getSetting: g } = await import('@/lib/settings');
  return g('steps');
}
