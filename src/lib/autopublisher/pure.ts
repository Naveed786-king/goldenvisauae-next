// Pure helpers for the Auto Publisher — no imports, so they can be unit-tested with plain Node.

export function deepMerge<T>(base: T, over: any): T {
  if (Array.isArray(base)) return (Array.isArray(over) ? over : base) as T;
  if (base && typeof base === 'object') {
    const out: any = { ...base };
    if (over && typeof over === 'object' && !Array.isArray(over)) {
      for (const k of Object.keys(over)) {
        const b = (base as any)[k];
        out[k] = b !== undefined && b !== null && typeof b === 'object' && !Array.isArray(b) ? deepMerge(b, over[k]) : over[k];
      }
    }
    return out;
  }
  return (over === undefined ? base : over) as T;
}

export const MASK = '••••••';

/** "sk-abc…wxyz1234" → "••••••1234" (empty stays empty) */
export function maskKey(v?: string | null): string {
  const s = String(v || '');
  if (!s) return '';
  return MASK + s.slice(-4);
}

export function isMasked(v?: string | null): boolean {
  return typeof v === 'string' && v.startsWith(MASK);
}

/** Walks an object and masks every string field whose name ends in "key" (case-insensitive) */
export function maskSecrets<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map((x) => maskSecrets(x)) as any;
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj as any)) out[k] = /key$/i.test(k) && typeof v === 'string' ? maskKey(v) : maskSecrets(v);
    return out;
  }
  return obj;
}

/** Puts the stored secret back wherever the browser sent a masked value (or nothing) */
export function unmaskSecrets<T>(incoming: T, stored: any): T {
  if (Array.isArray(incoming)) return incoming;
  if (incoming && typeof incoming === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(incoming as any)) {
      const old = stored && typeof stored === 'object' ? stored[k] : undefined;
      if (/key$/i.test(k) && typeof v === 'string') out[k] = isMasked(v) ? (old ?? '') : v.trim();
      else out[k] = unmaskSecrets(v, old);
    }
    return out;
  }
  return incoming;
}

/** Removes anything that looks like an API key from a message before it is logged or shown */
export function scrubSecrets(msg: string): string {
  return String(msg || '')
    .replace(/(sk-[a-z]*-?)[A-Za-z0-9_\-]{12,}/g, '$1•••')
    .replace(/AIza[0-9A-Za-z_\-]{20,}/g, 'AIza•••')
    .replace(/([?&]key=)[^&\s"]+/gi, '$1•••')
    .replace(/(Bearer\s+)[A-Za-z0-9._\-]{12,}/gi, '$1•••');
}

/**
 * Parses JSON returned by an AI model: strips code fences and text around the JSON,
 * tolerates trailing commas. Returns null when nothing usable is found.
 */
export function parseJsonLoose(raw: string): any {
  if (raw == null) return null;
  let s = String(raw).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const tryParse = (t: string) => {
    try {
      return JSON.parse(t);
    } catch {
      try {
        return JSON.parse(t.replace(/,\s*([}\]])/g, '$1'));
      } catch {
        return undefined;
      }
    }
  };
  let v = tryParse(s);
  if (v !== undefined) return v;
  // first { … last } or first [ … last ]
  for (const [open, close] of [['{', '}'], ['[', ']']] as const) {
    const a = s.indexOf(open);
    const b = s.lastIndexOf(close);
    if (a >= 0 && b > a) {
      v = tryParse(s.slice(a, b + 1));
      if (v !== undefined) return v;
    }
  }
  return null;
}

/** Local calendar day in a time zone, e.g. "2026-10-26" (used for daily budgets) */
export function dayKey(d = new Date(), timeZone = 'Asia/Dubai'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Parses one custom-title line: "Title | 2026-11-05 | Category | /uploads/media/x.webp" */
export function parseCustomTitle(line: string): { title: string; date?: string; category?: string; image?: string } | null {
  const parts = String(line || '').split('|').map((x) => x.trim());
  const title = parts[0];
  if (!title) return null;
  const out: { title: string; date?: string; category?: string; image?: string } = { title };
  for (const p of parts.slice(1)) {
    if (!p) continue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(p)) out.date = p;
    else if (/^(https?:\/\/|\/)/.test(p)) out.image = p;
    else if (!out.category) out.category = p;
  }
  return out;
}

/**
 * "Thinking" models (Gemini 2.5+/3, OpenAI o-series and GPT-5, also via OpenRouter) spend output tokens on
 * hidden reasoning before they answer. A small limit then cuts the answer off mid-JSON, so short calls get
 * a floor. The limit is only a ceiling — normal answers stay as short as the prompt asks.
 */
export function thinkingModel(model: string): boolean {
  const m = model.toLowerCase().replace(/^[a-z-]+\//, '');
  return /^gemini-(2\.5|[3-9])/.test(m) || /^(o\d|gpt-5)/.test(m) || /thinking|reason|deepseek-r1/.test(m);
}
export function outputBudget(model: string, maxTokens: number): number {
  return thinkingModel(model) ? Math.max(maxTokens, 4096) : maxTokens;
}
