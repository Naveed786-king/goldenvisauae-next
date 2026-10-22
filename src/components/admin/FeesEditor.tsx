'use client';
import { useState } from 'react';
import { Save, Plus, Trash2, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Btn, Card, PageTitle, Spinner, Toggle } from './ui';
import { useSetting } from './SettingsEditors';
import { FieldGroup } from './FieldInput';
import type { Field } from '@/components/blocks/types';
import { FEE_LISTS, type FeeOption, type FeeSettings } from '@/lib/fees';
import { cn } from '@/lib/utils';

const TEXT_LABELS: Record<string, string> = {
  title: 'Title', lead: 'Subtitle', q1: 'Step 1 — question', q1sub: 'Step 1 — help', q2: 'Medical — question', q2sub: 'Medical — help',
  medNormal: 'Normal medical', medNormalSub: 'Normal medical — note', medVip: 'VIP medical', medVipSub: 'VIP medical — note',
  q3: 'Family — question', q3sub: 'Family — help', justMe: 'Just me', justMeSub: 'Just me — note', yesFamily: 'Add family', yesFamilySub: 'Add family — note',
  q4: 'Family size — question', q4sub: 'Family size — help', adults: 'Adults', adultsSub: 'Adults — note', children: 'Children', childrenSub: 'Children — note',
  packages: 'Packages heading', addons: 'Add-ons heading', required: '“Required?”', yes: 'Yes', no: 'No', item: 'Table: item', govFee: 'Table: government', proFee: 'Table: our fee',
  subtotal: 'Table: subtotal', vatLabel: 'VAT line', totalLabel: 'Total label', note: 'Footnote', wa: 'WhatsApp button', share: 'Share button', shared: 'Share done',
  save: 'Save as lead button', saved: 'Lead saved message', reset: 'Recalculate', close: 'Close', next: 'Continue', back: 'Back', calc: 'Calculate button', step: 'Step', of: 'of',
};

function OptionsTable({ list, onChange, showFlags = true }: { list: FeeOption[]; onChange: (l: FeeOption[]) => void; showFlags?: boolean }) {
  const set = (i: number, patch: Partial<FeeOption>) => onChange(list.map((o, k) => (k === i ? { ...o, ...patch } : o)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-left text-[0.7rem] uppercase tracking-wider text-gray-500">
            <th className="w-36 pb-2 pr-2">ID (rules)</th>
            <th className="pb-2 pr-2">Label (shown to visitors)</th>
            <th className="w-28 pb-2 pr-2">Government AED</th>
            <th className="w-28 pb-2 pr-2">Our fee AED</th>
            {showFlags && <th className="w-24 pb-2 pr-2">Options</th>}
            <th className="w-20 pb-2" />
          </tr>
        </thead>
        <tbody>
          {list.map((o, i) => (
            <tr key={i} className="align-top">
              <td className="py-1 pr-2">
                <input className="admin-input font-mono !text-xs" value={o.id} onChange={(e) => set(i, { id: e.target.value.trim() })} />
              </td>
              <td className="py-1 pr-2">
                <textarea rows={2} className="admin-input" value={o.label} onChange={(e) => set(i, { label: e.target.value })} />
              </td>
              <td className="py-1 pr-2">
                <input type="number" className="admin-input" value={o.gov} onChange={(e) => set(i, { gov: Number(e.target.value) || 0 })} />
              </td>
              <td className="py-1 pr-2">
                <input type="number" className="admin-input" value={o.pro} onChange={(e) => set(i, { pro: Number(e.target.value) || 0 })} />
              </td>
              {showFlags && (
                <td className="space-y-1 py-1 pr-2 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={!!o.multi} onChange={(e) => set(i, { multi: e.target.checked })} /> per person
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={!!o.toggle} onChange={(e) => set(i, { toggle: e.target.checked })} /> yes / no
                  </label>
                </td>
              )}
              <td className="py-1">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-gray-400 hover:bg-gray-100" title="Up">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-gray-400 hover:bg-gray-100" title="Down">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onChange(list.filter((_, k) => k !== i))} className="rounded p-1 text-red-400 hover:bg-red-50" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => onChange([...list, { id: `custom-${Date.now().toString(36)}`, label: 'New option', gov: 0, pro: 0, multi: true }])} className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-amber-700 hover:bg-amber-50">
        <Plus className="h-3.5 w-3.5" /> Add option
      </button>
    </div>
  );
}

function Fold({ title, help, children, open: initial = false }: { title: string; help?: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <Card className="p-0">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
        <span>
          <span className="block font-bold">{title}</span>
          {help && <span className="mt-0.5 block text-xs text-gray-500">{help}</span>}
        </span>
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-gray-400 transition', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-gray-100 p-5">{children}</div>}
    </Card>
  );
}

export function FeesEditor() {
  const s = useSetting<FeeSettings>('fees');
  if (!s.value) return <Spinner />;
  const v = s.value;
  const set = (patch: Partial<FeeSettings>) => s.setValue({ ...v, ...patch });
  const textFields: Field[] = Object.keys(v.texts).map((k) => ({ name: k, label: TEXT_LABELS[k] || k, type: k === 'note' || k.endsWith('sub') ? 'textarea' : 'text', half: !(k === 'note' || k.endsWith('sub')) }));

  return (
    <div className="max-w-5xl space-y-4">
      <PageTitle
        title="Cost calculator"
        subtitle="Every visa service, government fee, our fee, package and add-on of the calculator. Visitors open it from the menu, the gold button and the “Cost calculator” page section."
        actions={
          <Btn onClick={() => s.save()} loading={s.saving}>
            <Save className="h-4 w-4" /> Save
          </Btn>
        }
      />
      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Toggle checked={v.enabled !== false} onChange={(x) => set({ enabled: x })} label="Calculator switched on" />
          <label>
            <span className="admin-label">VAT on our fees (%)</span>
            <input type="number" className="admin-input" value={v.vat} onChange={(e) => set({ vat: Number(e.target.value) || 0 })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="admin-label">Family file (employment / 2-yr)</span>
              <input type="number" className="admin-input" value={v.familyFileLow} onChange={(e) => set({ familyFileLow: Number(e.target.value) || 0 })} />
            </label>
            <label>
              <span className="admin-label">Family file (other)</span>
              <input type="number" className="admin-input" value={v.familyFileHigh} onChange={(e) => set({ familyFileHigh: Number(e.target.value) || 0 })} />
            </label>
          </div>
        </div>
      </Card>

      <Fold title="Visa services (step 1)" help="Groups and their services. The ID decides the rules (dependants, packages, add-ons) — keep the IDs of existing services." open>
        <div className="space-y-6">
          {v.groups.map((g, gi) => (
            <div key={gi} className="rounded-2xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-[240px] flex-1">
                  <span className="admin-label">Group name</span>
                  <input className="admin-input" value={g.label} onChange={(e) => set({ groups: v.groups.map((x, k) => (k === gi ? { ...x, label: e.target.value } : x)) })} />
                </label>
                <button type="button" onClick={() => set({ groups: v.groups.filter((_, k) => k !== gi) })} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" /> Delete group
                </button>
              </div>
              <div className="mt-3">
                <OptionsTable list={g.options} onChange={(l) => set({ groups: v.groups.map((x, k) => (k === gi ? { ...x, options: l } : x)) })} />
              </div>
            </div>
          ))}
          <Btn variant="ghost" size="sm" onClick={() => set({ groups: [...v.groups, { id: `group-${Date.now().toString(36)}`, label: 'New group', options: [] }] })}>
            <Plus className="h-4 w-4" /> Add group
          </Btn>
        </div>
      </Fold>

      {FEE_LISTS.map((l) => (
        <Fold key={String(l.key)} title={l.title} help={l.help}>
          <OptionsTable list={(v as any)[l.key] || []} onChange={(x) => set({ [l.key]: x } as any)} showFlags={l.key === 'addons'} />
        </Fold>
      ))}

      <Fold title="Extra add-ons" help="Security deposit (some 2-year investor dependants) and VIP medical (sponsors).">
        <OptionsTable list={[v.deposit, v.vipMedical]} onChange={(x) => set({ deposit: x[0] || v.deposit, vipMedical: x[1] || v.vipMedical })} />
      </Fold>

      <Fold title="Texts" help="Questions, buttons and labels. Translated into every language automatically after saving.">
        <FieldGroup fields={textFields} data={v.texts} onChange={(x) => set({ texts: x as any })} />
      </Fold>
    </div>
  );
}

const OFFER_FIELDS: Field[] = [
  { name: 'enabled', label: 'Show the pop-up', type: 'boolean', half: true },
  { name: 'delay', label: 'Show after (seconds)', type: 'number', half: true },
  { name: 'eyebrow', label: 'Small heading', type: 'text' },
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'lead', label: 'Text', type: 'textarea' },
  { name: 'govtLabel', label: 'Label: government fee', type: 'text', half: true },
  { name: 'ourLabel', label: 'Label: our fee (with pick-up)', type: 'text', half: true },
  { name: 'ourLabelPlain', label: 'Label: our fee', type: 'text', half: true },
  { name: 'noPickup', label: 'Label: no pick-up', type: 'text', half: true },
  { name: 'totalLabel', label: 'Label: total', type: 'text', half: true },
  {
    name: 'packages',
    label: 'Packages',
    type: 'list',
    itemLabel: 'Package',
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'govt', label: 'Government fee (AED)', type: 'text', half: true },
      { name: 'fee', label: 'Our fee (AED)', type: 'text', half: true },
      { name: 'price', label: 'Total (AED)', type: 'text', half: true },
      { name: 'time', label: 'Time', type: 'text', half: true },
      { name: 'pickup', label: 'Pick-up & drop-off included', type: 'boolean' },
    ],
  },
  { name: 'bullets', label: 'Points (one per line)', type: 'lines' },
  { name: 'cta', label: 'Main button', type: 'link' },
  { name: 'waLabel', label: 'WhatsApp button', type: 'text', half: true },
  { name: 'waPrefix', label: 'WhatsApp message start', type: 'text', half: true },
  { name: 'note', label: 'Small note', type: 'text' },
];

export function OfferEditor() {
  const s = useSetting<any>('offer');
  if (!s.value) return <Spinner />;
  return (
    <div className="max-w-4xl">
      <PageTitle
        title="Offer pop-up"
        subtitle="The “Limited time offer” window that appears a few seconds after a visitor opens a page (once per page per visit)."
        actions={
          <Btn onClick={() => s.save()} loading={s.saving}>
            <Save className="h-4 w-4" /> Save
          </Btn>
        }
      />
      <Card>
        <FieldGroup fields={OFFER_FIELDS} data={s.value} onChange={s.setValue} />
      </Card>
    </div>
  );
}
