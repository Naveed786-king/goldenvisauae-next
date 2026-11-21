import { ok, fail, refreshSite } from '@/lib/api';
import { requireStaff } from '@/lib/auth';
import { getSetting, saveSetting } from '@/lib/settings';
import { MASK, SECRET_FIELDS } from '@/lib/portal/config';

const KEYS = ['site', 'header', 'footer', 'smtp', 'translation', 'design', 'fees', 'offer', 'payments', 'whatsapp', 'clientMail', 'pdf', 'steps', 'portal'] as const;
// settings with keys or business details: only admins see and change them
const ADMIN_ONLY = ['smtp', 'payments', 'whatsapp'];
type Key = (typeof KEYS)[number];

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const { key } = await params;
  if (!KEYS.includes(key as Key)) return fail('Unknown setting', 404);
  if (ADMIN_ONLY.includes(key) && s.role !== 'ADMIN') return fail('Admins only', 403);
  const value: any = await getSetting(key as Key);
  for (const f of SECRET_FIELDS[key] || []) if (value[f]) value[f] = MASK;
  if (key === 'smtp' && value.pass) value.pass = '••••••••';
  if (key === 'translation' && value.apiKey) value.apiKey = '••••••••';
  if (key === 'translation' && value.geminiKey) value.geminiKey = '••••••••';
  return ok({ value });
}

export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const { key } = await params;
  if (!KEYS.includes(key as Key)) return fail('Unknown setting', 404);
  if ((ADMIN_ONLY.includes(key) || key === 'site' || key === 'translation' || key === 'design' || key === 'portal') && s.role !== 'ADMIN') return fail('Only admins can change these settings', 403);
  const { value } = await req.json().catch(() => ({}));
  if (!value || typeof value !== 'object') return fail('Invalid data');
  if (SECRET_FIELDS[key]) {
    const current: any = await getSetting(key as Key);
    for (const f of SECRET_FIELDS[key]) {
      if (value[f] === MASK) value[f] = current[f];
      else if (typeof value[f] === 'string') value[f] = value[f].trim();
    }
  }
  if (key === 'portal' && typeof value.url === 'string') value.url = value.url.trim().replace(/\/+$/, '');
  if (key === 'smtp') {
    const current: any = await getSetting('smtp');
    if (value.pass === '••••••••') value.pass = current.pass;
  }
  if (key === 'translation') {
    const current: any = await getSetting('translation');
    if (value.apiKey === '••••••••') value.apiKey = current.apiKey;
    if (value.geminiKey === '••••••••') value.geminiKey = current.geminiKey;
    if (typeof value.geminiKey === 'string') value.geminiKey = value.geminiKey.trim();
    if (!Array.isArray(value.enabled) || !value.enabled.includes('en')) value.enabled = ['en', ...(value.enabled || [])];
  }
  if (key === 'site' && value.colors) {
    for (const c of Object.keys(value.colors)) value.colors[c] = String(value.colors[c]).replace(/[^#a-zA-Z0-9(),.% ]/g, '');
  }
  await saveSetting(key as Key, value);
  refreshSite();
  // New engine/key: translate everything again with it (hand-edited translations are kept)
  if (key === 'translation' && value.autoTranslate) {
    try {
      await (await import('@/lib/i18n/jobs')).enqueueAll(false);
    } catch {}
  }
  if (key === 'header' || key === 'footer' || key === 'site' || key === 'fees' || key === 'offer') {
    try {
      await (await import('@/lib/i18n/jobs')).onContentSaved('settings', key);
    } catch {}
  }
  return ok();
}
