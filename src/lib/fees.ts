// Visa cost calculator: settings, defaults and the pricing rules.
// Every label and price is editable in Admin → Cost calculator; the rules below decide
// which dependants, packages and add-ons belong to each visa service (by its ID).
import DEFAULTS from './fees-defaults.json';

export type FeeOption = { id: string; label: string; gov: number; pro: number; multi?: boolean; toggle?: boolean };
export type FeeGroup = { id: string; label: string; options: FeeOption[] };
export type FeeTexts = typeof DEFAULTS.texts;

export type FeeSettings = {
  enabled: boolean;
  vat: number; // % on professional fees
  texts: FeeTexts;
  groups: FeeGroup[];
  packages: FeeOption[];
  cancelPackages: FeeOption[];
  familyStandard: FeeOption[];
  familyPremium: FeeOption[];
  depCancel: FeeOption[];
  addons: FeeOption[];
  deposit: FeeOption;
  vipMedical: FeeOption;
  medical: FeeOption[];
  familyFileLow: number;
  familyFileHigh: number;
};

export const defaultFees = DEFAULTS as unknown as FeeSettings;

/** Lists of options that can be edited in the admin (key, title) */
export const FEE_LISTS: { key: keyof FeeSettings; title: string; help: string }[] = [
  { key: 'packages', title: 'Service packages', help: 'One must be chosen — added per applicant on top of the government fee.' },
  { key: 'cancelPackages', title: 'Cancellation packages', help: 'Shown instead of the normal packages for cancellation services.' },
  { key: 'familyStandard', title: 'Family packages — standard', help: '2-year investor / employment sponsor visas and their dependants.' },
  { key: 'familyPremium', title: 'Family packages — premium', help: 'Golden / retirement newborns and parents.' },
  { key: 'depCancel', title: 'Dependant cancellation packages', help: 'Used for the dependant cancellation service.' },
  { key: 'addons', title: 'Optional add-ons', help: 'Family file opening price is set below (285 / 320).' },
  { key: 'medical', title: 'Medical test choices', help: 'First = normal, second = VIP (price per adult).' },
];

const all = (s: FeeSettings) => s.groups.flatMap((g) => g.options);
const byId = (s: FeeSettings, id: string) => all(s).find((o) => o.id === id);

/** Dependant rows that can be added to a main service (adults 18+ with medical / children without) */
export function dependantsForOption(s: FeeSettings, id: string): { adult?: FeeOption; child?: FeeOption } {
  const pick = (a?: string, c?: string) => ({ adult: a ? byId(s, a) : undefined, child: c ? byId(s, c) : undefined });
  if (id.startsWith('g10-')) return pick('g10-dep-adult', 'g10-dep-child');
  if (id.startsWith('p2-')) return pick('dep-new-adult-outside', 'dep-new-child-outside');
  if (id.startsWith('inv2-') || id === 'nb-investor') return pick('inv2-dep-adult-inside', 'inv2-dep-child-outside');
  if (id.startsWith('emp2-') || id === 'nb-employment') return pick('emp2-dep-adult-inside', 'emp2-dep-child-outside');
  if (id.startsWith('ret-')) return pick('ret-dep', 'ret-dep');
  if (id.startsWith('par-')) return pick('par-new-outside');
  if (id.startsWith('dep-') || id.startsWith('nb-')) return pick('dep-new-adult-outside', 'dep-new-child-outside');
  return {};
}

/** Children under 18 and cancellations never need a medical fitness test */
export function needsMedical(id: string) {
  return !/child|nb-/.test(id) && !id.includes('cancel');
}

const DEPOSIT_OPTIONS = ['inv2-dep-adult-inside', 'inv2-dep-child-outside', 'nb-investor'];
const VIP_MEDICAL_OPTIONS = ['inv2-owner', 'inv2-dep-adult-inside', 'emp2-sponsor', 'emp2-dep-adult-inside'];

/** Family file opening: low price for employment / 2-year investor dependants, high price otherwise. Valuation only for Golden Visa. */
export function addonsForOption(s: FeeSettings, id: string): FeeOption[] {
  const low = /^(inv2-dep|emp2-dep)/.test(id) || id === 'nb-investor' || id === 'nb-employment';
  const golden = id.startsWith('g10-');
  const list = s.addons.filter((a) => a.id !== 'valuation' || golden).map((a) => (a.id === 'family-file' ? { ...a, gov: low ? s.familyFileLow : s.familyFileHigh } : a));
  if (DEPOSIT_OPTIONS.includes(id)) list.push(s.deposit);
  if (VIP_MEDICAL_OPTIONS.includes(id)) list.push(s.vipMedical);
  return list;
}

/** Package choices for a service */
export function packagesForOption(s: FeeSettings, id: string): FeeOption[] {
  if (id === 'inv2-owner' || id === 'emp2-sponsor') return s.familyStandard;
  if (id === 'p2-new-outside' || id === 'p2-renew') return s.packages.filter((p) => p.id !== 'vip');
  if (/^(inv2-dep|emp2-dep)/.test(id) || id === 'nb-investor' || id === 'nb-employment') return s.familyStandard;
  if (id === 'nb-golden' || id === 'nb-retirement') return s.familyPremium;
  if (id === 'dep-cancel') return s.depCancel;
  if (id.startsWith('par-') && id !== 'par-cancel') return s.familyPremium;
  if (id.includes('cancel')) return s.cancelPackages;
  return s.packages;
}

export function aed(n: number) {
  return `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Every option list in a fixed order (used by the translation engine to line translations up) */
export function feeLabelLists(s: FeeSettings): FeeOption[][] {
  return [...s.groups.map((g) => g.options), s.packages, s.cancelPackages, s.familyStandard, s.familyPremium, s.depCancel, s.addons, [s.deposit], [s.vipMedical], s.medical];
}
