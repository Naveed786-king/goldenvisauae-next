// The words and brand assets for designed covers (the drawing itself is in cover-design.ts).
import { getSetting } from '@/lib/settings';
import { AutoConfig } from './config';
import { completeJson } from './ai';
import { COVER_ICONS, COVER_ICON_NAMES, CoverBrand, CoverText } from './cover-design';
import { readLocal } from './local-file';
import { guaranteeFound, stripHtml } from './text';
import { autoLog } from './log';

const DEFAULT_COLORS = { gold: '#C9A24A', goldLight: '#ECD9A3', ink: '#0B0B0C', sand: '#FAF8F3' };
const hex = (v: unknown, d: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim() : d);

/** Theme colours, logo, emblem and ribbon text from the site settings (so covers follow the website) */
export async function coverBrand(cfg: AutoConfig): Promise<CoverBrand> {
  const site: any = await getSetting('site').catch(() => ({}));
  const c = site?.colors || {};
  const colors = { gold: hex(c.gold, DEFAULT_COLORS.gold), goldLight: hex(c.goldLight, DEFAULT_COLORS.goldLight), ink: hex(c.ink, DEFAULT_COLORS.ink), sand: hex(c.sand, DEFAULT_COLORS.sand) };
  const logo = cfg.images.showLogo ? await readLocal(String(site?.logo || '/brand/logo.webp')).catch(() => null) : null;
  const emblem = cfg.images.showLogo ? await readLocal('/brand/coin.webp').catch(() => null) : null;
  const host = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  return { colors, logo, emblem, ribbon: cfg.images.ribbonText || host || String(site?.name || '') };
}

const short = (s: unknown, max: number) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  return (cut.slice(0, cut.lastIndexOf(' ')) || t.slice(0, max)).trim();
};
const icon = (name: unknown, fallback: string) => (String(name || '') in COVER_ICONS ? String(name) : fallback);
/** A cover must never promise or claim more than the article and our facts do */
const unsafe = (s: string) => guaranteeFound(s).length > 0 || /\b(guarantee|approved|100%|instant approval|cheapest|best price)\b/i.test(s) || /\b(AED|USD|\$|%)\b/i.test(s);

/** Title split into two balanced lines, for when the AI step is not available */
export function splitTitle(title: string): { line1: string; line2: string } {
  const words = String(title || '').split(/[:\-–—]\s*|\s+/).filter(Boolean);
  if (words.length <= 2) return { line1: words.join(' '), line2: '' };
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ').length;
    const b = words.slice(i).join(' ').length;
    if (Math.abs(a - b) < bestDiff) {
      bestDiff = Math.abs(a - b);
      best = i;
    }
  }
  return { line1: short(words.slice(0, best).join(' '), 26), line2: short(words.slice(best).join(' '), 26) };
}

function fallbackText(title: string, headings: string[]): CoverText {
  const { line1, line2 } = splitTitle(title);
  // without the AI step we cannot pick fitting icons, so the cover shows just the title
  void headings;
  return { line1, line2, subtitle: '', cards: [], features: [] };
}

/** Cover words written from the article (and only our real facts for the bottom bar) */
export async function coverText(input: { title: string; summary?: string; headings?: string[]; facts?: string }): Promise<CoverText> {
  const headings = (input.headings || []).map((h) => stripHtml(h)).filter(Boolean);
  const fb = fallbackText(input.title, headings);
  try {
    const r = await completeJson<any>({
      system: 'You are the cover designer of a UAE visa and residency consultancy blog. You write the few words that go on a designed article cover. Short, specific, honest.',
      prompt: `ARTICLE TITLE: ${input.title}
${input.summary ? `WHAT IT SAYS: ${String(input.summary).slice(0, 700)}\n` : ''}SECTIONS: ${headings.slice(0, 12).join(' | ') || '—'}
COMPANY FACTS (the only claims about us you may use):
${String(input.facts || '—').slice(0, 1800)}

Write the cover:
- line1 and line2: the title split into two short lines (each at most 22 characters). You may shorten the title but keep its meaning and main keyword. Title Case.
- subtitle: the angle in at most 40 characters (e.g. "What actually changed", "A 90-day plan").
- cards: ONLY when the article is built from 3-4 clear parts, steps, documents or options that a reader benefits from seeing at a glance (a checklist, a process, requirements, a comparison): then 4 labels (at most 16 characters each), each with one icon that clearly matches it. For a news item, a single question, an opinion or an explainer without clear parts, return an empty list: the cover then shows just the title.
- features: exactly 4 labels (at most 20 characters each) for the bottom bar: services or facts about us taken from COMPANY FACTS, or plain topic words. Never: approved, guaranteed, prices, percentages, "best", or anything not in COMPANY FACTS.
- visaCard: true ONLY when the golden visa itself is the main subject of the title (what it is, who qualifies, cost, how to apply, renewal, benefits, rule changes). false when the title is mainly about a person, place or activity (a family moving, buying property, students, medical tests, a business setup, a city): those covers show a real photo scene that tells that story instead.
- icon names only from: ${COVER_ICON_NAMES.join(', ')}
Return JSON only: {"line1":"","line2":"","subtitle":"","cards":[{"label":"","icon":""}],"features":[{"label":"","icon":""}],"visaCard":false}`,
      temperature: 0.5,
      maxTokens: 1500,
      timeoutMs: 60_000,
    });
    const cards = (Array.isArray(r?.cards) ? r.cards : []).map((c: any, i: number) => ({ label: short(c?.label, 18), icon: icon(c?.icon, ['document', 'calendar', 'family', 'check'][i % 4]) })).filter((c: { label: string }) => c.label && !unsafe(c.label)).slice(0, 4);
    const features = (Array.isArray(r?.features) ? r.features : []).map((c: any, i: number) => ({ label: short(c?.label, 22), icon: icon(c?.icon, ['shield', 'support', 'calendar', 'family'][i % 4]) })).filter((c: { label: string }) => c.label && !unsafe(c.label)).slice(0, 4);
    const line1 = short(r?.line1, 26);
    const subtitle = short(r?.subtitle, 44);
    if (!line1 || unsafe(`${line1} ${r?.line2 || ''}`)) return fb;
    return { line1, line2: short(r?.line2, 26), subtitle: unsafe(subtitle) ? '' : subtitle, cards: cards.length >= 3 ? cards : [], features, visaCard: r?.visaCard === true };
  } catch (e) {
    // the cover still gets the title and section names
    await autoLog('warn', `Cover words could not be written, using the title: ${e instanceof Error ? e.message : e}`);
    return fb;
  }
}
