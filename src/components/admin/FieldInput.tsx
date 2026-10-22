'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Plus, Trash2, GripVertical } from 'lucide-react';
import type { Field } from '@/components/blocks/types';
import { ICON_NAMES, Icon } from '@/components/ui/Icon';
import RichEditor from './RichEditor';
import { ImageInput } from './MediaPicker';
import { Toggle } from './ui';
import { cn } from '@/lib/utils';
import { FONTS } from '@/lib/design';

export function FieldInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const label = (
    <label className="admin-label">
      {field.label}
      {field.help && <span className="ml-1 font-normal text-gray-400">— {field.help}</span>}
    </label>
  );

  switch (field.type) {
    case 'text':
      return (
        <div>
          {label}
          <input dir="auto" className="admin-input" value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'number':
      return (
        <div>
          {label}
          <input type="number" className="admin-input" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
      );
    case 'textarea':
      return (
        <div>
          {label}
          <textarea className="admin-input min-h-[90px] resize-y" value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'lines':
      return (
        <div>
          {label}
          <textarea className="admin-input min-h-[110px] resize-y font-mono text-[0.8rem] leading-relaxed" value={value ?? ''} placeholder="One item per line" onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'richtext':
      return (
        <div>
          {label}
          <RichEditor value={value} onChange={onChange} />
        </div>
      );
    case 'image':
      return (
        <div>
          {label}
          <ImageInput value={value} onChange={onChange} />
        </div>
      );
    case 'boolean':
      return (
        <div className="pt-1">
          <Toggle checked={!!value} onChange={onChange} label={field.label} />
        </div>
      );
    case 'select':
      return (
        <div>
          {label}
          <select className="admin-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            <option value="">— Default —</option>
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    case 'icon':
      return <IconPicker label={field.label} value={value} onChange={onChange} />;
    case 'link':
      return (
        <div>
          {label}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="admin-input" placeholder="Button text" value={value?.label ?? ''} onChange={(e) => onChange({ ...(value || {}), label: e.target.value })} />
            <input className="admin-input" placeholder="/page, https://…, whatsapp, phone" value={value?.href ?? ''} onChange={(e) => onChange({ ...(value || {}), href: e.target.value })} />
          </div>
        </div>
      );
    case 'heading':
      return <p className="col-span-full -mb-2 mt-2 border-b border-gray-100 pb-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-gold-deep">{field.label}</p>;
    case 'color':
      return (
        <div>
          {label}
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
              value={/^#[0-9a-f]{6}$/i.test(value || '') ? value : '#c8a255'}
              onChange={(e) => onChange(e.target.value)}
            />
            <input className="admin-input font-mono" value={value ?? ''} placeholder="Default" onChange={(e) => onChange(e.target.value)} />
            {value ? (
              <button type="button" onClick={() => onChange('')} className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-gray-400 hover:bg-gray-100" title="Reset">
                ✕
              </button>
            ) : null}
          </div>
        </div>
      );
    case 'range': {
      const has = value !== '' && value !== undefined && value !== null;
      return (
        <div>
          <label className="admin-label flex items-center justify-between">
            <span>{field.label}</span>
            <span className="flex items-center gap-1 font-mono font-normal text-gray-500">
              {has ? `${value}${field.unit || ''}` : 'Default'}
              {has && (
                <button type="button" onClick={() => onChange('')} className="ml-1 rounded px-1 text-gray-400 hover:bg-gray-100" title="Reset">
                  ✕
                </button>
              )}
            </span>
          </label>
          <input
            type="range"
            className={cn('w-full accent-[#C8A255]', !has && 'opacity-40')}
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            value={has ? value : field.min ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );
    }
    case 'font':
      return (
        <div>
          {label}
          <select className="admin-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            <option value="">— Default —</option>
            {FONTS.map((f) => (
              <option key={f.family} value={f.family}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      );
    case 'list':
      return <ListInput field={field} value={Array.isArray(value) ? value : []} onChange={onChange} />;
    default:
      return null;
  }
}

function IconPicker({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label className="admin-label">{label}</label>
      <button type="button" onClick={() => setOpen(!open)} className="admin-input flex items-center gap-2 text-left">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gold/15 text-gold-deep">
          <Icon name={value} className="h-4 w-4" />
        </span>
        <span className="flex-1 text-sm">{value || 'Choose icon'}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 grid max-h-64 w-full grid-cols-6 gap-1 overflow-y-auto rounded-xl bg-white p-2 shadow-2xl ring-1 ring-gray-200 sm:w-[340px]">
          {ICON_NAMES.map((n) => (
            <button
              type="button"
              key={n}
              title={n}
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
              className={cn('grid aspect-square place-items-center rounded-lg hover:bg-gold/20', value === n && 'bg-gold text-ink')}
            >
              <Icon name={n} className="h-5 w-5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ListInput({ field, value, onChange }: { field: Field; value: any[]; onChange: (v: any[]) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const subFields = field.fields || [];
  const titleKey = subFields.find((f) => ['title', 'name', 'label', 'tab', 'value', 'question'].includes(f.name))?.name;

  const update = (i: number, k: string, v: any) => {
    const copy = [...value];
    copy[i] = { ...copy[i], [k]: v };
    onChange(copy);
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const copy = [...value];
    const [x] = copy.splice(from, 1);
    copy.splice(to, 0, x);
    onChange(copy);
    setOpen(to);
  };

  return (
    <div>
      <label className="admin-label">
        {field.label} <span className="font-normal text-gray-400">({value.length})</span>
      </label>
      <div className="space-y-2">
        {value.map((item, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIdx !== null && dragIdx !== i) move(dragIdx, i);
              setDragIdx(null);
            }}
            className={cn('rounded-xl bg-gray-50 ring-1 ring-gray-200', dragIdx === i && 'opacity-50')}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <GripVertical className="h-4 w-4 cursor-grab text-gray-300" />
              <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex-1 truncate text-left text-sm font-semibold text-gray-700">
                {(titleKey && item?.[titleKey]) || `${field.itemLabel || 'Item'} ${i + 1}`}
              </button>
              <button type="button" onClick={() => move(i, i - 1)} className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-700" title="Move up">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => move(i, i + 1)} className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-700" title="Move down">
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const copy = [...value];
                  copy.splice(i + 1, 0, JSON.parse(JSON.stringify(item)));
                  onChange(copy);
                }}
                className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                title="Duplicate"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Remove this item?')) onChange(value.filter((_, j) => j !== i));
                }}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {open === i && (
              <div className="grid gap-4 border-t border-gray-200 bg-white p-4 rounded-b-xl">
                {subFields.map((sf) => (
                  <FieldInput key={sf.name} field={sf} value={item?.[sf.name]} onChange={(v) => update(i, sf.name, v)} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          onChange([...value, {}]);
          setOpen(value.length);
        }}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-gold-deep hover:bg-gold/10"
      >
        <Plus className="h-4 w-4" /> Add {field.itemLabel?.toLowerCase() || 'item'}
      </button>
    </div>
  );
}

export function FieldGroup({ fields, data, onChange }: { fields: Field[]; data: Record<string, any>; onChange: (d: Record<string, any>) => void }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.name} className={f.half ? '' : 'sm:col-span-2'}>
          <FieldInput field={f} value={data?.[f.name]} onChange={(v) => onChange({ ...data, [f.name]: v })} />
        </div>
      ))}
    </div>
  );
}
