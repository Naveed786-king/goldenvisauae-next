// Auto Publisher settings: one row in the Setting table (key "autopublisher"), deep-merged with defaults.
// Secrets are only returned to the browser masked (see maskSecrets / unmaskSecrets).
import { prisma } from '@/lib/db';
import { deepMerge, maskSecrets, unmaskSecrets } from './pure';

export type ProviderId = 'gemini' | 'claude' | 'openai' | 'openrouter';
export const PROVIDERS: { id: ProviderId; name: string; keyHint: string; keyUrl: string }[] = [
  { id: 'gemini', name: 'Google Gemini', keyHint: 'AIza…', keyUrl: 'https://aistudio.google.com/apikey' },
  { id: 'claude', name: 'Claude (Anthropic)', keyHint: 'sk-ant-…', keyUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'openai', name: 'ChatGPT (OpenAI)', keyHint: 'sk-…', keyUrl: 'https://platform.openai.com/api-keys' },
  { id: 'openrouter', name: 'OpenRouter', keyHint: 'sk-or-…', keyUrl: 'https://openrouter.ai/keys' },
];

export const DEFAULT_BANNED = [
  'in conclusion', 'in today\'s fast-paced world', 'in the ever-evolving', 'delve', 'dive into', 'navigating the', 'embark on',
  'unlock the', 'unleash', 'game-changer', 'a testament to', 'tapestry', 'landscape of', 'look no further', 'rest assured',
  'seamless', 'cutting-edge', 'it is important to note', 'it\'s worth noting', 'whether you\'re', 'are you dreaming of',
  'in this article, we will', 'buckle up', 'elevate your', 'robust', 'myriad', 'plethora', 'pivotal', 'paramount',
  'guaranteed approval', '100% approval', 'guarantee your visa',
];

export type AutoConfig = {
  enabled: boolean;
  pausedUntil: string; // ISO date; publisher idles until then
  writer: ProviderId;
  editor: ProviderId | ''; // '' = same as writer
  providers: Record<ProviderId, { key: string; model: string }>;
  useTranslationGeminiKey: boolean; // reuse the Gemini key from Languages when none is set here
  images: {
    provider: 'openai' | 'gemini';
    openaiModel: string;
    geminiModel: string;
    quality: 'low' | 'medium' | 'high';
    inline: number; // inline pictures per article
    houseStyle: string;
    onFail: 'hold' | 'skip'; // a picture that fails QC: hold the article, or publish without that inline picture
    minSharpness: number; // Laplacian variance on a 512px grey copy; lower = blurry
    minRealism: number; // 0-10 from the vision check
  };
  quality: {
    minQuality: number;
    minSeo: number;
    maxTextSimilarity: number;
    maxTitleSimilarity: number;
    maxImageDistance: number;
    meaningThreshold: number;
    bannedPhrases: string[];
    dailyCap: number; // posts per day for the whole site
    activeFrom: number; // hour 0-23 (Dubai time)
    activeTo: number;
    refreshPerWeek: number;
    maxAiCallsPerDay: number;
    embeddings: 'off' | 'gemini' | 'openai'; // meaning check (uses that provider's key)
    embedModelGemini: string;
    embedModelOpenai: string;
    refreshMode: 'review' | 'publish'; // refreshed / replaced posts: wait for approval, or update the live post directly
  };
  knowledge: { about: string; services: string; prices: string; timelines: string; cases: string; mistakes: string; rules: string; cta: string };
};

export const DEFAULT_CONFIG: AutoConfig = {
  enabled: false,
  pausedUntil: '',
  writer: 'gemini',
  editor: '',
  providers: {
    gemini: { key: '', model: 'gemini-3.8-flash' },
    claude: { key: '', model: 'claude-sonnet-5-5' },
    openai: { key: '', model: 'gpt-4.1' },
    openrouter: { key: '', model: 'anthropic/claude-sonnet-5.5' },
  },
  useTranslationGeminiKey: true,
  images: { provider: 'openai', openaiModel: 'gpt-image-1', geminiModel: 'gemini-2.5-flash-image', quality: 'high', inline: 2, houseStyle: '', onFail: 'skip', minSharpness: 60, minRealism: 7 },
  quality: {
    minQuality: 80,
    minSeo: 80,
    maxTextSimilarity: 0.3,
    maxTitleSimilarity: 0.6,
    maxImageDistance: 10,
    meaningThreshold: 0.86,
    bannedPhrases: DEFAULT_BANNED,
    dailyCap: 4,
    activeFrom: 0,
    activeTo: 24,
    refreshPerWeek: 7,
    maxAiCallsPerDay: 200,
    embeddings: 'off',
    embedModelGemini: 'text-embedding-004',
    embedModelOpenai: 'text-embedding-3-small',
    refreshMode: 'publish',
  },
  knowledge: {
    about: '',
    services: '',
    prices: '',
    timelines: '',
    cases: '',
    mistakes: '',
    rules: 'Never guarantee visa approval — the UAE authorities decide.\nNever invent prices, timelines, reviews or client stories.',
    cta: '',
  },
};

const KEY = 'autopublisher';

export async function getAutoConfig(): Promise<AutoConfig> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    return deepMerge(DEFAULT_CONFIG, row ? JSON.parse(row.value) : {});
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** Saves a (possibly partial, possibly masked) config coming from the admin screen */
export async function saveAutoConfig(incoming: Partial<AutoConfig>): Promise<AutoConfig> {
  const current = await getAutoConfig();
  const clean = unmaskSecrets(incoming || {}, current);
  const next = deepMerge(current, clean);
  next.quality = sanitizeQuality(next.quality);
  next.images.inline = clamp(Math.round(Number(next.images.inline) || 0), 0, 6);
  next.images.minSharpness = clamp(Number(next.images.minSharpness) || 0, 0, 5000);
  next.images.minRealism = clamp(Number(next.images.minRealism) || 0, 0, 10);
  const value = JSON.stringify(next);
  await prisma.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
  return next;
}

/** What the admin screen receives: keys masked */
export function publicConfig(cfg: AutoConfig) {
  return maskSecrets(cfg);
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function sanitizeQuality(q: AutoConfig['quality']): AutoConfig['quality'] {
  const num = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const D = DEFAULT_CONFIG.quality;
  return {
    minQuality: clamp(num(q.minQuality, D.minQuality), 0, 100),
    minSeo: clamp(num(q.minSeo, D.minSeo), 0, 100),
    maxTextSimilarity: clamp(num(q.maxTextSimilarity, D.maxTextSimilarity), 0.05, 0.95),
    maxTitleSimilarity: clamp(num(q.maxTitleSimilarity, D.maxTitleSimilarity), 0.05, 0.95),
    maxImageDistance: clamp(Math.round(num(q.maxImageDistance, D.maxImageDistance)), 0, 32),
    meaningThreshold: clamp(num(q.meaningThreshold, D.meaningThreshold), 0.5, 0.99),
    bannedPhrases: (Array.isArray(q.bannedPhrases) ? q.bannedPhrases : String(q.bannedPhrases || '').split('\n')).map((x) => String(x).trim()).filter(Boolean).slice(0, 300),
    dailyCap: clamp(Math.round(num(q.dailyCap, D.dailyCap)), 0, 50),
    activeFrom: clamp(Math.round(num(q.activeFrom, D.activeFrom)), 0, 23),
    activeTo: clamp(Math.round(num(q.activeTo, D.activeTo)), 1, 24),
    refreshPerWeek: clamp(Math.round(num(q.refreshPerWeek, D.refreshPerWeek)), 0, 100),
    maxAiCallsPerDay: clamp(Math.round(num(q.maxAiCallsPerDay, D.maxAiCallsPerDay)), 0, 5000),
    embeddings: (['off', 'gemini', 'openai'] as const).includes(q.embeddings as any) ? q.embeddings : 'off',
    embedModelGemini: String(q.embedModelGemini || D.embedModelGemini).trim(),
    embedModelOpenai: String(q.embedModelOpenai || D.embedModelOpenai).trim(),
    refreshMode: q.refreshMode === 'publish' ? 'publish' : 'review',
  };
}
