// Machine translation engine. Providers:
//   gemini  - Google Gemini AI (needs API key) - default, used for new blog posts
//   claude  - Anthropic Claude AI (needs API key)
//   deepl   - DeepL API (needs API key; no Hindi)
//   google  - free Google Translate web endpoint (no key, lower quality)
// A provider that fails NEVER silently falls back to another one.
import crypto from 'crypto';
import { prisma } from '../db';
import { getSetting } from '../settings';
import { localeInfo } from './config';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex');
const hasLetters = (s: string) => /\p{L}/u.test(s);

/* ------------------------------------------------------------------ memory */
let memProvider = 'google';
const memKey = (locale: string, text: string) => (memProvider === 'google' ? `${locale}:${hash(text)}` : `${memProvider}:${locale}:${hash(text)}`);

/** Built-in professional translations shipped with the website (prisma/translations/*.json) */
const packKey = (locale: string, text: string) => `pack:${locale}:${hash(text)}`;

async function memGet(locale: string, texts: string[]) {
  const keys = texts.map((t) => memKey(locale, t));
  const pkeys = texts.map((t) => packKey(locale, t));
  try {
    const rows = await prisma.translationMemory.findMany({ where: { key: { in: [...keys, ...pkeys] } } });
    const map = new Map(rows.map((r) => [r.key, r.text]));
    // built-in professional translations always win over machine translations
    return keys.map((k, i) => map.get(pkeys[i]) || map.get(k));
  } catch {
    return keys.map(() => undefined);
  }
}
async function memSet(locale: string, pairs: [string, string][]) {
  for (const [src, out] of pairs) {
    if (!out || out === src) continue;
    const key = memKey(locale, src);
    await prisma.translationMemory.upsert({ where: { key }, update: { text: out }, create: { key, text: out } }).catch(() => {});
  }
}

/* ------------------------------------------------------------------ google */
async function googleOne(text: string, target: string, attempt = 0): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(target)}&dt=t`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'Mozilla/5.0' },
    body: 'q=' + encodeURIComponent(text),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt < 4) {
      await sleep(1500 * (attempt + 1));
      return googleOne(text, target, attempt + 1);
    }
  }
  if (!res.ok) throw new Error(`Google translate HTTP ${res.status}`);
  const data: any = await res.json();
  return (data?.[0] || []).map((p: any) => p?.[0] || '').join('');
}

/** Translates many single-line strings with as few requests as possible */
async function googleMany(texts: string[], target: string): Promise<string[]> {
  const out: string[] = new Array(texts.length);
  let batch: number[] = [];
  let size = 0;
  const flush = async () => {
    if (!batch.length) return;
    const joined = batch.map((i) => texts[i]).join('\n');
    let parts: string[] | null = null;
    try {
      const tr = await googleOne(joined, target);
      parts = tr.split('\n');
      if (parts.length !== batch.length) parts = null;
    } catch {
      parts = null;
    }
    if (parts) batch.forEach((i, k) => (out[i] = parts![k].trim()));
    else {
      for (const i of batch) {
        try {
          out[i] = (await googleOne(texts[i], target)).trim();
        } catch {
          out[i] = texts[i];
        }
        await sleep(120);
      }
    }
    batch = [];
    size = 0;
    await sleep(150);
  };
  for (let i = 0; i < texts.length; i++) {
    const len = texts[i].length + 1;
    if (size + len > 3500) await flush();
    batch.push(i);
    size += len;
  }
  await flush();
  return out;
}

/* ------------------------------------------------------------------ claude */
async function claudeCall(apiKey: string, model: string, system: string, content: string, attempt = 0): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 16000, system, messages: [{ role: 'user', content }] }),
  });
  if ((res.status === 429 || res.status === 529 || res.status >= 500) && attempt < 5) {
    await sleep(Math.min(60_000, 4000 * 2 ** attempt));
    return claudeCall(apiKey, model, system, content, attempt + 1);
  }
  if (res.status === 401) throw new Error('Claude API key is not valid - check it in Admin → Languages');
  if (!res.ok) throw new Error(`Claude API HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d: any = await res.json();
  return (d.content || []).map((c: any) => c.text || '').join('');
}
const SYS = (lang: string) =>
  `You are a professional translator for a UAE Golden Visa consultancy website. Translate from English to ${lang}. Keep brand names (Golden Visa UAE, Brightlink, ICP, GDRFA, DLD, Amer, Tasheel, Emirates ID, Oqood, Ejari, AED amounts, phone numbers, emails, URLs) unchanged. Use natural, formal, persuasive language as a native speaker would write it - never word-for-word. Use the standard script and conventions of the language (e.g. Modern Standard Arabic, Simplified Chinese, Devanagari Hindi with Romanian diacritics ș ț).`;

async function claudeMany(texts: string[], locale: string, apiKey: string, model: string) {
  const lang = localeInfo(locale).name;
  const out: string[] = [];
  for (let i = 0; i < texts.length; i += 80) {
    const chunk = texts.slice(i, i + 80);
    const raw = await claudeCall(apiKey, model, SYS(lang), `Translate each string in this JSON array. Reply with ONLY a JSON array of the same length, same order.\n\n${JSON.stringify(chunk)}`);
    const m = raw.match(/\[[\s\S]*\]/);
    const arr = m ? JSON.parse(m[0]) : null;
    if (!Array.isArray(arr) || arr.length !== chunk.length) throw new Error('Claude returned an invalid translation list');
    out.push(...arr.map(String));
  }
  return out;
}

/* ------------------------------------------------------------------ gemini */
async function geminiCall(apiKey: string, model: string, system: string, content: string, json: boolean, attempt = 0): Promise<string> {
  const res = await fetch(`${process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com'}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: content }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 65536, ...(json ? { responseMimeType: 'application/json' } : {}) },
    }),
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await sleep(Math.min(60_000, 4000 * 2 ** attempt));
    return geminiCall(apiKey, model, system, content, json, attempt + 1);
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    const t = await res.text();
    if (/API key|API_KEY|PERMISSION_DENIED|UNAUTHENTICATED/i.test(t)) throw new Error('Gemini API key is not valid - check it in Admin → Languages');
    throw new Error(`Gemini API HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  if (res.status === 404) throw new Error(`Gemini model "${model}" was not found - choose another model in Admin → Languages`);
  if (!res.ok) throw new Error(`Gemini API HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d: any = await res.json();
  const cand = d.candidates?.[0];
  const text = (cand?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || '').join('');
  if (!text) throw new Error(`Gemini returned no text (${cand?.finishReason || d.promptFeedback?.blockReason || 'unknown reason'})`);
  return text;
}

async function geminiMany(texts: string[], locale: string, apiKey: string, model: string) {
  const lang = localeInfo(locale).name;
  const out: string[] = [];
  for (let i = 0; i < texts.length; i += 80) {
    const chunk = texts.slice(i, i + 80);
    const raw = await geminiCall(apiKey, model, SYS(lang), `Translate each string in this JSON array. Reply with ONLY a JSON array of strings of the same length, same order.\n\n${JSON.stringify(chunk)}`, true);
    const m = raw.match(/\[[\s\S]*\]/);
    let arr: any = null;
    try {
      arr = m ? JSON.parse(m[0]) : null;
    } catch {}
    if (!Array.isArray(arr) || arr.length !== chunk.length) throw new Error('Gemini returned an invalid translation list');
    out.push(...arr.map(String));
  }
  return out;
}

/* ------------------------------------------------------------------ deepl */
async function deeplMany(texts: string[], locale: string, apiKey: string, html = false) {
  const target = localeInfo(locale).deepl;
  if (!target) throw new Error('DeepL does not support ' + locale);
  const host = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const out: string[] = [];
  for (let i = 0; i < texts.length; i += 40) {
    const body = new URLSearchParams();
    texts.slice(i, i + 40).forEach((t) => body.append('text', t));
    body.set('source_lang', 'EN');
    body.set('target_lang', target);
    if (html) body.set('tag_handling', 'html');
    const res = await fetch(`${host}/v2/translate`, { method: 'POST', headers: { Authorization: `DeepL-Auth-Key ${apiKey}` }, body });
    if (res.status === 403) throw new Error('DeepL API key is not valid - check it in Admin → Languages');
    if (res.status === 456) throw new Error('DeepL monthly limit reached');
    if (!res.ok) throw new Error(`DeepL HTTP ${res.status}`);
    const d: any = await res.json();
    out.push(...d.translations.map((t: any) => t.text));
  }
  return out;
}

/* ------------------------------------------------------------------ public */
export const DEFAULT_MODEL = 'claude-sonnet-5-5';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

type Cfg = { provider: string; apiKey?: string; geminiKey?: string; model?: string; geminiModel?: string };

/** API key for the chosen provider */
export function providerKey(cfg: Cfg) {
  return (cfg.provider === 'gemini' ? cfg.geminiKey : cfg.apiKey) || '';
}

/** Model for the chosen provider */
export function providerModel(cfg: Cfg) {
  if (cfg.provider === 'gemini') return cfg.geminiModel || DEFAULT_GEMINI_MODEL;
  if (cfg.provider === 'claude') return cfg.model || DEFAULT_MODEL;
  return '';
}

function engineName(cfg: Cfg) {
  return cfg.provider === 'claude' || cfg.provider === 'gemini' ? `${cfg.provider}-${providerModel(cfg)}` : cfg.provider;
}

export async function translationConfig() {
  const cfg = await getSetting('translation');
  memProvider = engineName(cfg);
  return cfg;
}

/** Short id of the engine in use - stored with every translation so a new engine re-translates old text. */
export async function engineTag() {
  const cfg = await translationConfig();
  if (notReadyReason(cfg)) return 'pack'; // no API key: only the built-in translations are used
  return engineName(cfg);
}

/** Why translation cannot run right now ('' = ready) */
export function notReadyReason(cfg: Cfg) {
  if (cfg.provider === 'off') return 'Translation is turned off';
  const names: Record<string, string> = { claude: 'Claude (Anthropic)', deepl: 'DeepL', gemini: 'Google Gemini' };
  if (names[cfg.provider] && !providerKey(cfg)) return `Add your ${names[cfg.provider]} API key in Admin → Languages to start translating`;
  return '';
}

/** packOnly: use ONLY the built-in translations (instant, no internet) - English stays where none exists */
export type TrOpts = { packOnly?: boolean };

/** Translate plain strings (multi-line strings are translated line by line). Returns same-length array. */
export async function translateTexts(texts: string[], locale: string, opts: TrOpts = {}): Promise<string[]> {
  if (texts.some((t) => t && t.includes('\n'))) {
    const flat: string[] = [];
    const shape = texts.map((t) => {
      const ls = (t || '').split('\n');
      flat.push(...ls);
      return ls.length;
    });
    const tr = await translateLines(flat, locale, opts);
    let k = 0;
    return shape.map((n) => tr.slice(k, (k += n)).join('\n'));
  }
  return translateLines(texts, locale, opts);
}

async function translateLines(texts: string[], locale: string, opts: TrOpts = {}): Promise<string[]> {
  const cfg = await translationConfig();
  const result: string[] = texts.slice();
  const idx: number[] = [];
  texts.forEach((t, i) => {
    if (t && hasLetters(t)) idx.push(i);
  });
  if (!idx.length || (cfg.provider === 'off' && !opts.packOnly)) return result;

  const unique = Array.from(new Set(idx.map((i) => texts[i])));
  const cached = await memGet(locale, unique);
  const todo = unique.filter((_, k) => !cached[k]);
  const map = new Map<string, string>();
  unique.forEach((u, k) => cached[k] && map.set(u, cached[k]!));

  if (todo.length) {
    let translated: string[];
    if (opts.packOnly || notReadyReason(cfg)) {
      // No API key yet: texts without a built-in translation stay in English for now
      idx.forEach((i) => (result[i] = map.get(texts[i]) || texts[i]));
      return result;
    }
    if (cfg.provider === 'gemini') translated = await geminiMany(todo, locale, providerKey(cfg), providerModel(cfg));
    else if (cfg.provider === 'claude') translated = await claudeMany(todo, locale, cfg.apiKey, providerModel(cfg));
    else if (cfg.provider === 'deepl') translated = await deeplMany(todo, locale, cfg.apiKey);
    else translated = await googleMany(todo, localeInfo(locale).google);
    todo.forEach((t, k) => translated[k] && map.set(t, translated[k]));
    await memSet(locale, todo.map((t, k) => [t, translated[k]] as [string, string]));
  }
  idx.forEach((i) => (result[i] = map.get(texts[i]) || texts[i]));
  return result;
}

const BLOCK_TAG = /^<\/?(p|div|h[1-6]|li|ul|ol|table|thead|tbody|tr|td|th|blockquote|section|article|br|hr|img|figure|figcaption)\b/i;

/** Translate an HTML fragment, keeping all tags. */
export async function translateHtml(html: string, locale: string, opts: TrOpts = {}): Promise<string> {
  if (!html || !hasLetters(html.replace(/<[^>]+>/g, ''))) return html;
  const cfg = await translationConfig();
  if (cfg.provider === 'off' && !opts.packOnly) return html;

  const [cachedWhole] = await memGet(locale, [html]);
  if (cachedWhole) return cachedWhole;

  if (opts.packOnly || notReadyReason(cfg)) return html; // no API key and no built-in translation for this text
  if (cfg.provider === 'claude' || cfg.provider === 'deepl' || cfg.provider === 'gemini') {
    let out: string;
    const ask = `Translate the text inside this HTML. Keep every HTML tag and attribute (href, src, class, id) exactly as it is, translate image alt text and titles. Reply with ONLY the translated HTML.\n\n${html}`;
    if (cfg.provider === 'claude') {
      out = await claudeCall(cfg.apiKey, providerModel(cfg), SYS(localeInfo(locale).name), ask);
      out = out.replace(/^```(?:html)?\s*|\s*```$/g, '').trim();
    } else if (cfg.provider === 'gemini') {
      out = await geminiCall(providerKey(cfg), providerModel(cfg), SYS(localeInfo(locale).name), ask, false);
      out = out.replace(/^```(?:html)?\s*|\s*```$/g, '').trim();
    } else {
      out = (await deeplMany([html], locale, cfg.apiKey, true))[0];
    }
    await memSet(locale, [[html, out]]);
    return out;
  }

  // Google: split into "runs" of text + inline tags between block-level tags
  const tokens = html.split(/(<[^>]+>)/g).filter((t) => t !== '');
  const runs: { tokens: string[]; block: boolean }[] = [];
  let cur: string[] = [];
  const push = () => {
    if (cur.length) runs.push({ tokens: cur, block: false });
    cur = [];
  };
  for (const t of tokens) {
    if (t.startsWith('<') && BLOCK_TAG.test(t)) {
      push();
      runs.push({ tokens: [t], block: true });
    } else cur.push(t);
  }
  push();

  // Try each run as a whole (keeps sentence context); verify tags survived
  const texts = runs.map((r) => (r.block ? '' : r.tokens.join('').replace(/\s+/g, ' ')));
  const whole = await translateTexts(texts.map((t) => (t && hasLetters(t.replace(/<[^>]+>/g, '')) ? t : '')), locale);
  const out: string[] = [];
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    if (r.block || !texts[i] || !hasLetters(texts[i].replace(/<[^>]+>/g, ''))) {
      out.push(r.tokens.join(''));
      continue;
    }
    const srcTags = (texts[i].match(/<[^>]+>/g) || []).map((t) => t.replace(/\s+/g, ' ')).sort().join('|');
    const outTags = (whole[i].match(/<[^>]+>/g) || []).map((t) => t.replace(/\s+/g, ' ')).sort().join('|');
    if (srcTags === outTags) out.push(whole[i]);
    else {
      // fall back: translate the text pieces separately
      const parts = r.tokens.map((t) => (t.startsWith('<') ? '' : t));
      const tr = await translateTexts(parts.map((p) => p.trim()), locale);
      out.push(r.tokens.map((t, k) => (t.startsWith('<') || !parts[k].trim() ? t : t.replace(parts[k].trim(), tr[k]))).join(''));
    }
  }
  const result = out.join('');
  await memSet(locale, [[html, result]]);
  return result;
}

/** Quick self-test used by the admin panel */
export async function testTranslation(locale = 'ar') {
  const why = notReadyReason(await translationConfig());
  if (why) throw new Error(why);
  const [out] = await translateTexts(['Apply for your Golden Visa today'], locale);
  return out;
}
