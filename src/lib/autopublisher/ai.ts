// Text AI client for the Auto Publisher: Gemini, Claude, ChatGPT (OpenAI) and OpenRouter.
// Every call has a timeout, counts against the daily budget, and never logs keys.
// AUTOPUBLISHER_FAKE_AI=1 returns fixed sample JSON (no network, no cost) for dry runs.
import { getSetting } from '@/lib/settings';
import { AutoConfig, getAutoConfig, ProviderId } from './config';
import { aiCallsToday, autoLog, countAiCall, setBackoff } from './log';
import { parseJsonLoose, scrubSecrets } from './pure';

export class AiError extends Error {
  kind: 'quota' | 'auth' | 'config' | 'bad_output' | 'network' | 'other';
  constructor(kind: AiError['kind'], message: string) {
    super(scrubSecrets(message));
    this.kind = kind;
  }
}

export type CompleteOpts = {
  system: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  role?: 'writer' | 'editor';
  provider?: ProviderId; // force a provider (used by the Test buttons)
  timeoutMs?: number;
  skipBudget?: boolean;
};

export const isFakeAi = () => process.env.AUTOPUBLISHER_FAKE_AI === '1';

/** Resolves the key for a provider: the publisher's own key, then the environment, then (Gemini) the Languages key */
export async function providerKey(cfg: AutoConfig, id: ProviderId): Promise<string> {
  const own = cfg.providers[id]?.key?.trim();
  if (own) return own;
  const env = { gemini: process.env.GEMINI_API_KEY, claude: process.env.ANTHROPIC_API_KEY, openai: process.env.OPENAI_API_KEY, openrouter: process.env.OPENROUTER_API_KEY }[id];
  if (env) return env.trim();
  if (id === 'gemini' && cfg.useTranslationGeminiKey) {
    const t: any = await getSetting('translation');
    if (t?.geminiKey) return String(t.geminiKey).trim();
  }
  return '';
}

export async function complete(opts: CompleteOpts): Promise<string> {
  const cfg = await getAutoConfig();
  const id: ProviderId = opts.provider || (opts.role === 'editor' && cfg.editor ? cfg.editor : cfg.writer);
  if (isFakeAi()) return fakeAnswer(opts);
  if (!opts.skipBudget) {
    const used = await aiCallsToday();
    if (cfg.quality.maxAiCallsPerDay > 0 && used >= cfg.quality.maxAiCallsPerDay) throw new AiError('quota', `Daily AI budget reached (${used} calls). The publisher continues tomorrow.`);
  }
  const key = await providerKey(cfg, id);
  if (!key) throw new AiError('config', `No API key for ${id}. Add it in Auto Publisher → AI & pictures.`);
  const model = cfg.providers[id]?.model?.trim();
  if (!model) throw new AiError('config', `No model name set for ${id}.`);

  const timeoutMs = opts.timeoutMs ?? 180_000;
  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? 8000;
  await countAiCall();
  try {
    if (id === 'gemini') return await callGemini(key, model, opts, temperature, maxTokens, timeoutMs);
    if (id === 'claude') return await callClaude(key, model, opts, temperature, maxTokens, timeoutMs);
    return await callOpenAiCompatible(id, key, model, opts, temperature, maxTokens, timeoutMs);
  } catch (e: any) {
    const err = e instanceof AiError ? e : new AiError(e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'network' : 'other', e?.message || String(e));
    if (err.kind === 'quota' && !opts.skipBudget) {
      await setBackoff(30, `${id}: ${err.message}`);
      await autoLog('warn', `${id} rate limit / quota — pausing 30 minutes. ${err.message}`);
    }
    throw err;
  }
}

/** complete() + JSON parsing; on unparseable output asks once more for valid JSON only */
export async function completeJson<T = any>(opts: CompleteOpts): Promise<T> {
  const raw = await complete({ ...opts, json: true });
  const v = parseJsonLoose(raw);
  if (v !== null) return v as T;
  const retry = await complete({ ...opts, json: true, prompt: `${opts.prompt}\n\nYour previous answer was not valid JSON. Return valid JSON only — no code fences, no text before or after.` });
  const v2 = parseJsonLoose(retry);
  if (v2 === null) throw new AiError('bad_output', 'The AI did not return valid JSON (tried twice).');
  return v2 as T;
}

/** Short real call used by the admin "Test" button: returns the answer or throws the exact error */
export async function testProvider(id: ProviderId): Promise<{ answer: string; ms: number; model: string }> {
  const cfg = await getAutoConfig();
  const t = Date.now();
  const answer = await complete({
    provider: id,
    system: 'You are a connection test. Reply briefly.',
    prompt: 'Reply with exactly: {"ok":true,"message":"Golden Visa UAE publisher connected"}',
    json: true,
    temperature: 0,
    maxTokens: 200,
    timeoutMs: 45_000,
    skipBudget: true,
  });
  return { answer: answer.slice(0, 500), ms: Date.now() - t, model: isFakeAi() ? 'fake' : cfg.providers[id].model };
}

/** Text embedding (256 numbers) for the meaning check. Returns null when switched off. */
export async function embed(text: string, cfg?: AutoConfig): Promise<number[] | null> {
  const c = cfg || (await getAutoConfig());
  const which = c.quality.embeddings;
  if (which === 'off') return null;
  if (isFakeAi()) {
    // deterministic pseudo-embedding from words (dry runs only)
    const v = new Array(256).fill(0);
    for (const w of text.toLowerCase().split(/\W+/).filter(Boolean)) {
      let h = 0;
      for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) >>> 0;
      v[h % 256] += 1;
    }
    return v;
  }
  const key = await providerKey(c, which);
  if (!key) return null;
  const input = text.slice(0, 6000);
  await countAiCall();
  if (which === 'gemini') {
    const base = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com';
    const model = c.quality.embedModelGemini;
    const j = await http(`${base}/v1beta/models/${encodeURIComponent(model)}:embedContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text: input }] }, outputDimensionality: 256 }) }, 30_000, 'Gemini embeddings');
    const v = j?.embedding?.values;
    return Array.isArray(v) ? v.slice(0, 256) : null;
  }
  const j = await http('https://api.openai.com/v1/embeddings', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: c.quality.embedModelOpenai, input, dimensions: 256 }) }, 30_000, 'OpenAI embeddings');
  const v = j?.data?.[0]?.embedding;
  return Array.isArray(v) ? v.slice(0, 256) : null;
}

// ---------------------------------------------------------------- providers

async function http(url: string, init: RequestInit, timeoutMs: number, who: string) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 600);
    try {
      const j = JSON.parse(text);
      msg = j?.error?.message || j?.error?.type || j?.message || msg;
    } catch {
      /* keep raw text */
    }
    const kind = res.status === 429 || /quota|rate.?limit|resource.?exhausted|overloaded/i.test(msg) ? 'quota' : res.status === 401 || res.status === 403 ? 'auth' : 'other';
    throw new AiError(kind, `${who} HTTP ${res.status}: ${msg}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError('bad_output', `${who} returned a non-JSON response`);
  }
}

async function callGemini(key: string, model: string, o: CompleteOpts, temperature: number, maxTokens: number, timeoutMs: number) {
  const base = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com';
  const body: any = {
    systemInstruction: { parts: [{ text: o.system }] },
    contents: [{ role: 'user', parts: [{ text: o.prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens, ...(o.json ? { responseMimeType: 'application/json' } : {}) },
  };
  const j = await http(`${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) }, timeoutMs, 'Gemini');
  const parts = j?.candidates?.[0]?.content?.parts || [];
  const out = parts.map((p: any) => p.text || '').join('').trim();
  if (!out) throw new AiError('bad_output', `Gemini returned no text (${j?.candidates?.[0]?.finishReason || j?.promptFeedback?.blockReason || 'empty'})`);
  return out;
}

async function callClaude(key: string, model: string, o: CompleteOpts, temperature: number, maxTokens: number, timeoutMs: number) {
  const body = {
    model,
    max_tokens: maxTokens,
    temperature,
    system: o.system + (o.json ? '\n\nReturn valid JSON only.' : ''),
    messages: [{ role: 'user', content: o.prompt }],
  };
  const j = await http('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body) }, timeoutMs, 'Claude');
  const out = (j?.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('').trim();
  if (!out) throw new AiError('bad_output', `Claude returned no text (${j?.stop_reason || 'empty'})`);
  return out;
}

async function callOpenAiCompatible(id: ProviderId, key: string, model: string, o: CompleteOpts, temperature: number, maxTokens: number, timeoutMs: number) {
  const isOpenAi = id === 'openai';
  const url = isOpenAi ? 'https://api.openai.com/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
  // reasoning models (o-series, gpt-5) only accept the default temperature
  const reasoning = /^(o\d|gpt-5)/i.test(model.replace(/^openai\//, ''));
  const body: any = {
    model,
    messages: [
      { role: 'system', content: o.system },
      { role: 'user', content: o.prompt },
    ],
    ...(reasoning ? {} : { temperature }),
    ...(isOpenAi ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
    ...(o.json ? { response_format: { type: 'json_object' } } : {}),
  };
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, 'content-type': 'application/json' };
  if (!isOpenAi) {
    headers['HTTP-Referer'] = 'https://goldenvisauae.ai';
    headers['X-Title'] = 'Golden Visa UAE Auto Publisher';
  }
  const who = isOpenAi ? 'OpenAI' : 'OpenRouter';
  const j = await http(url, { method: 'POST', headers, body: JSON.stringify(body) }, timeoutMs, who);
  const out = String(j?.choices?.[0]?.message?.content || '').trim();
  if (!out) throw new AiError('bad_output', `${who} returned no text (${j?.choices?.[0]?.finish_reason || 'empty'})`);
  return out;
}

// ---------------------------------------------------------------- fake mode (dry runs)

function fakeAnswer(o: CompleteOpts): string {
  if (/connection test/i.test(o.system)) return JSON.stringify({ ok: true, message: 'Golden Visa UAE publisher connected (fake mode)' });
  if (!o.json) return 'Fake AI answer for a dry run.';
  if (/content strategist/i.test(o.system)) return JSON.stringify({ intent: 'informational', reader: { who: 'family', country: 'AE', fears: 'rejection', wants: 'clear steps' }, angle: 'checklist with mistakes', title: FAKE_ARTICLE.title, outline: [{ h2: 'What this sample shows', h3: [], notes: '' }], quickAnswer: 'sample', table: '', companyFacts: [], faq: ['Is this a real article?'], internalLinks: FAKE_ARTICLE.internalLinks, cta: 'Talk to us', imagePlan: [{ purpose: 'cover' }], category: 'Process' });
  if (/strict senior human editor/i.test(o.system)) return JSON.stringify({ article: FAKE_ARTICLE, quality: { score: 90, helpfulness: 90, originality: 90, accuracy: 90, readability: 90, eeat: 90, reasons: ['Fake mode sample'] }, unsupportedClaims: [] });
  return JSON.stringify(FAKE_ARTICLE);
}

export const FAKE_ARTICLE = {
  title: 'Golden Visa document checklist for families (sample)',
  seoTitle: 'Golden Visa Document Checklist for Families | Golden Visa UAE',
  metaDescription: 'A sample article produced in fake mode: the documents a family usually prepares for a UAE Golden Visa, step by step, with common mistakes to avoid.',
  focusKeyword: 'golden visa document checklist',
  secondaryKeywords: ['golden visa documents', 'family golden visa'],
  slug: 'golden-visa-document-checklist-families-sample',
  excerpt: 'Sample article created in dry-run mode to test the pipeline without spending money.',
  category: 'Process',
  tags: ['golden visa', 'documents'],
  quickAnswer: 'This is a fake-mode sample. Real articles are written by the selected AI provider.',
  contentHtml:
    '<h2>Golden visa document checklist: what this sample shows</h2><p>The pipeline produced this golden visa document checklist without calling any AI provider, so you can test research, checks and publishing for free.</p><h2>Documents most families prepare</h2><ul><li>Passports and photos</li><li>Attested marriage and birth certificates</li><li>Health insurance</li></ul><p>See <a href="/services/golden-visa">Golden Visa services</a>, the <a href="/services/golden-visa-cost">cost calculator</a> and <a href="/apply">apply online</a>.</p><h2>Common mistakes</h2><p>Names that differ between documents cause most delays.</p><h2>Next steps</h2><p>Talk to a consultant before you submit.</p>',
  faq: [
    { q: 'Is this a real article?', a: 'No, it is a dry-run sample.' },
    { q: 'Does fake mode cost anything?', a: 'No, no AI provider is called.' },
    { q: 'Where does a real article go?', a: 'To the review queue or straight to the blog, depending on the mission.' },
  ],
  internalLinks: [{ anchor: 'Golden Visa services', href: '/services/golden-visa' }],
  imagePlan: [],
  quality: 92,
  ok: true,
};
