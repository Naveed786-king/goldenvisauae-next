// Government fee lines for a file, from the prices in Admin > Cost calculator.
import { addonsForOption, dependantsForOption, needsMedical, type FeeOption, type FeeSettings } from '@/lib/fees';
import type { QuoteLine } from './files';

/** The main calculator option for a service, chosen from its name and where the client is. */
export function mainOption(s: FeeSettings, service: string, location: 'in' | 'out'): FeeOption | undefined {
  const all = s.groups.flatMap((g) => g.options);
  const by = (id: string) => all.find((o) => o.id === id);
  const t = service.toLowerCase();
  const renew = /renew/.test(t);
  const cancel = /cancel/.test(t);
  const where = location === 'in' ? 'inside' : 'outside';
  if (/golden/.test(t)) return by(cancel ? 'g10-cancel' : renew ? 'g10-renew' : 'g10-new');
  if (/retire/.test(t)) return by(cancel ? 'ret-cancel' : renew ? 'ret-renew' : 'ret-new');
  if (/parent/.test(t)) return by(cancel ? 'par-cancel' : renew ? 'par-renew' : `par-new-${where}`);
  if (/newborn|new born|baby/.test(t)) return by('nb-investor');
  if (/property/.test(t)) return by(cancel ? 'p2-cancel' : renew ? 'p2-renew' : 'p2-new-outside');
  if (/employ/.test(t)) return by('emp2-sponsor');
  if (/investor|partner|business|company/.test(t)) return by('inv2-owner');
  if (/family|dependant|spouse|wife|husband|child/.test(t)) return by(cancel ? 'dep-cancel' : renew ? 'dep-renew-adult' : `dep-new-adult-${where}`);
  return by('g10-new');
}

const line = (label: string, qty: number, unit: number): QuoteLine => ({ label, qty, unit, amount: Math.round(qty * unit * 100) / 100 });

/** Lines for the main applicant, adults and children, VIP medical and the family file. */
export function governmentLines(s: FeeSettings, o: { service: string; location: 'in' | 'out'; adults: number; kids: number; vip: boolean; newFile: boolean }): QuoteLine[] {
  const main = mainOption(s, o.service, o.location);
  if (!main) return [];
  const lines: QuoteLine[] = [line(`Main applicant: ${main.label}`, 1, main.gov)];
  const dep = dependantsForOption(s, main.id);
  if (o.adults && dep.adult) lines.push(line(`Adult dependant: ${dep.adult.label}`, o.adults, dep.adult.gov));
  if (o.kids && (dep.child || dep.adult)) {
    const c = dep.child || dep.adult!;
    lines.push(line(`Child: ${c.label}`, o.kids, c.gov));
  }
  if (o.vip && needsMedical(main.id)) lines.push(line(s.vipMedical.label, 1 + (o.adults || 0), s.vipMedical.gov));
  if ((o.adults || o.kids) && o.newFile) {
    const file = addonsForOption(s, main.id).find((a) => a.id === 'family-file');
    if (file && file.gov) lines.push(line(file.label, 1, file.gov));
  }
  return lines.filter((l) => l.amount > 0);
}
