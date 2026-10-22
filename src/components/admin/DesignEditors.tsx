'use client';
import { useState } from 'react';
import { Save, Palette, Type, Sparkles, PanelTop, PanelBottom, MousePointerClick, Code, Eye, RefreshCw } from 'lucide-react';
import type { Field } from '@/components/blocks/types';
import { FieldGroup } from './FieldInput';
import { Btn, Card, PageTitle, Spinner } from './ui';
import { useSetting } from './SettingsEditors';

const o = (...pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }));

export const HEADER_DESIGN_FIELDS: Field[] = [
  { name: 'style', label: 'Header style', type: 'select', options: o(['glass', 'Glass (frosted, see-through)'], ['solid', 'Solid colour'], ['transparent', 'Glass floating over the hero image']) },
  { name: 'bg', label: 'Background colour', type: 'color', half: true },
  { name: 'text', label: 'Text colour', type: 'color', half: true },
  { name: 'opacity', label: 'Background strength', type: 'range', min: 40, max: 100, step: 1, unit: '%', half: true },
  { name: 'blur', label: 'Glass blur', type: 'range', min: 0, max: 40, step: 1, unit: 'px', half: true },
  { name: 'height', label: 'Header height', type: 'range', min: 52, max: 120, step: 2, unit: 'px', half: true },
  { name: 'logoHeight', label: 'Logo height', type: 'range', min: 24, max: 120, step: 1, unit: 'px', half: true },
  { name: 'menuSize', label: 'Menu text size', type: 'range', min: 11, max: 22, step: 1, unit: 'px', half: true },
  { name: 'menuUppercase', label: 'Menu in CAPITALS', type: 'boolean', half: true },
  { name: 'sticky', label: 'Stay on top while scrolling', type: 'boolean', half: true },
  { name: 'shrink', label: 'Shrink when scrolling', type: 'boolean', half: true },
  { name: 'glow', label: 'Gold glow line', type: 'boolean', half: true },
  { name: 'topbarBg', label: 'Top bar background', type: 'color', half: true },
  { name: 'topbarText', label: 'Top bar text', type: 'color', half: true },
];

export const FOOTER_DESIGN_FIELDS: Field[] = [
  { name: 'style', label: 'Footer style', type: 'select', options: o(['light', 'Light (clean)'], ['glass', 'Glass'], ['dark', 'Black']) },
  { name: 'bg', label: 'Background colour', type: 'color', half: true },
  { name: 'text', label: 'Text colour', type: 'color', half: true },
  { name: 'heading', label: 'Column title colour', type: 'color', half: true },
  { name: 'logoHeight', label: 'Logo height', type: 'range', min: 24, max: 140, step: 1, unit: 'px', half: true },
  { name: 'bgImage', label: 'Watermark image (optional) — replaces the large emblem; empty = default emblem', type: 'image' },
  { name: 'watermark', label: 'Show large emblem watermark', type: 'boolean' },
];

const COLOR_FIELDS: Field[] = [
  { name: 'gold', label: 'Main gold', type: 'color', half: true },
  { name: 'goldLight', label: 'Light gold', type: 'color', half: true },
  { name: 'ink', label: 'Dark navy (backgrounds & text)', type: 'color', half: true },
  { name: 'sand', label: 'Sand (light sections)', type: 'color', half: true },
];
const FONT_FIELDS: Field[] = [
  { name: 'heading', label: 'Headings font', type: 'font', half: true },
  { name: 'body', label: 'Text font', type: 'font', half: true },
  { name: 'arabic', label: 'Arabic font', type: 'font', half: true },
  { name: 'headingWeight', label: 'Heading weight', type: 'range', min: 300, max: 900, step: 100, half: true },
  { name: 'baseSize', label: 'Base text size', type: 'range', min: 13, max: 20, step: 1, unit: 'px' },
];
const SHAPE_FIELDS: Field[] = [
  { name: 'card', label: 'Card corner radius', type: 'range', min: 0, max: 48, step: 1, unit: 'px', half: true },
  { name: 'button', label: 'Button shape', type: 'select', options: o(['999', 'Pill'], ['16', 'Rounded'], ['8', 'Soft'], ['0', 'Square']), half: true },
];
const BUTTON_FIELDS: Field[] = [
  { name: 'style', label: 'Gold button style', type: 'select', options: o(['gradient', 'Gold gradient + shine'], ['solid', 'Solid gold'], ['outline', 'Gold outline'], ['glass', 'Gold glass']), half: true },
  { name: 'uppercase', label: 'Buttons in CAPITALS', type: 'boolean', half: true },
];
const GLASS_FIELDS: Field[] = [
  { name: 'enabled', label: 'Glass effect on cards & boxes', type: 'boolean', half: true },
  { name: 'orbs', label: 'Soft gold light behind glass', type: 'boolean', half: true },
  { name: 'blur', label: 'Blur', type: 'range', min: 0, max: 40, step: 1, unit: 'px', half: true },
  { name: 'opacity', label: 'Glass whiteness (dark sections)', type: 'range', min: 0, max: 60, step: 1, unit: '%', half: true },
  { name: 'border', label: 'Glass border strength', type: 'range', min: 0, max: 60, step: 1, unit: '%' },
];
const ANIM_FIELDS: Field[] = [
  { name: 'enabled', label: 'Animations on', type: 'boolean' },
  {
    name: 'style',
    label: 'Default section entrance (every section)',
    type: 'select',
    options: o(['none', 'Only gentle text reveals'], ['fade-up', 'Fade up'], ['fade', 'Fade in'], ['zoom', 'Zoom in'], ['slide-left', 'Slide from right'], ['slide-right', 'Slide from left'], ['flip', '3D flip'], ['blur', 'Blur in'], ['bounce', 'Bounce']),
    half: true,
  },
  { name: 'duration', label: 'Speed', type: 'range', min: 150, max: 3000, step: 50, unit: 'ms', half: true },
];

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card
      title={
        (
          <span className="flex items-center gap-2">
            {icon} {title}
          </span>
        ) as any
      }
      className="p-0"
    >
      <div className="p-5">{children}</div>
    </Card>
  );
}

/* ---------------- Admin → Design ---------------- */
export function DesignEditor() {
  const d = useSetting<any>('design');
  const s = useSetting<any>('site');
  const [stamp, setStamp] = useState(Date.now());
  const [saving, setSaving] = useState(false);
  if (!d.value || !s.value) return <Spinner />;
  const v = d.value;
  const set = (k: string) => (x: any) => d.setValue({ ...v, [k]: x });

  async function saveAll() {
    setSaving(true);
    await s.save();
    await d.save();
    setSaving(false);
    setStamp(Date.now());
  }

  return (
    <div>
      <PageTitle
        title="Design & style"
        subtitle="Colours, fonts, glass effect, buttons, animations, header and footer for the whole website. Each page section can also be styled on its own (Pages → section → 🎨 Design)."
        actions={
          <>
            <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100">
              <Eye className="h-4 w-4" /> View site
            </a>
            <Btn onClick={saveAll} loading={saving}>
              <Save className="h-4 w-4" /> Save
            </Btn>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="space-y-6">
          <Section title="Brand colours" icon={<Palette className="h-4 w-4 text-gold-deep" />}>
            <FieldGroup fields={COLOR_FIELDS} data={s.value.colors} onChange={(c) => s.setValue({ ...s.value, colors: c })} />
          </Section>
          <Section title="Typography" icon={<Type className="h-4 w-4 text-gold-deep" />}>
            <FieldGroup fields={FONT_FIELDS} data={v.fonts} onChange={set('fonts')} />
          </Section>
          <Section title="Glass effect" icon={<Sparkles className="h-4 w-4 text-gold-deep" />}>
            <FieldGroup fields={GLASS_FIELDS} data={v.glass} onChange={set('glass')} />
          </Section>
          <Section title="Buttons & shapes" icon={<MousePointerClick className="h-4 w-4 text-gold-deep" />}>
            <div className="grid gap-5">
              <FieldGroup fields={BUTTON_FIELDS} data={v.buttons} onChange={set('buttons')} />
              <FieldGroup fields={SHAPE_FIELDS} data={v.radius} onChange={set('radius')} />
            </div>
          </Section>
          <Section title="Animations" icon={<Sparkles className="h-4 w-4 text-gold-deep" />}>
            <FieldGroup fields={ANIM_FIELDS} data={v.animation} onChange={set('animation')} />
          </Section>
          <Section title="Header design" icon={<PanelTop className="h-4 w-4 text-gold-deep" />}>
            <FieldGroup fields={HEADER_DESIGN_FIELDS} data={v.header} onChange={set('header')} />
          </Section>
          <Section title="Footer design" icon={<PanelBottom className="h-4 w-4 text-gold-deep" />}>
            <FieldGroup fields={FOOTER_DESIGN_FIELDS} data={v.footer} onChange={set('footer')} />
          </Section>
          <Section title="Custom CSS (advanced)" icon={<Code className="h-4 w-4 text-gold-deep" />}>
            <FieldGroup fields={[{ name: 'customCss', label: 'CSS added to every page', type: 'textarea' }]} data={v} onChange={d.setValue} />
          </Section>
        </div>
        <div className="xl:sticky xl:top-6 self-start">
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 text-xs font-bold text-gray-500">
              Live preview (updates after Save)
              <button onClick={() => setStamp(Date.now())} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-gray-100">
                <RefreshCw className="h-3.5 w-3.5" /> Reload
              </button>
            </div>
            <iframe key={stamp} src={`/?preview=${stamp}`} className="h-[78vh] w-full" title="Preview" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Header/footer design card used on the Header and Footer admin pages */
export function PartDesignCard({ part }: { part: 'header' | 'footer' }) {
  const d = useSetting<any>('design');
  if (!d.value) return <Spinner />;
  return (
    <Card
      title={part === 'header' ? 'Header design (style, glass, colours, sizes)' : 'Footer design (style, colours, logo)'}
      actions={
        <Btn size="sm" onClick={() => d.save()} loading={d.saving}>
          <Save className="h-4 w-4" /> Save design
        </Btn>
      }
      className="p-0"
    >
      <div className="p-5">
        <FieldGroup fields={part === 'header' ? HEADER_DESIGN_FIELDS : FOOTER_DESIGN_FIELDS} data={d.value[part]} onChange={(x) => d.setValue({ ...d.value, [part]: x })} />
      </div>
    </Card>
  );
}
