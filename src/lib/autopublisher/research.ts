// Keyword research from free sources (Google Autocomplete, Google Trends RSS, Google News RSS).
// Polite: cached 6 h, about 1 request per second, 10 s timeouts, a source failing never breaks a job.
import { prisma } from '@/lib/db';
import { autoLog } from './log';
import { isFakeAi } from './ai';
import { keywordIntent, normalize, scoreKeyword, terms } from './text';

const UA = 'Mozilla/5.0 (compatible; GoldenVisaUAE-Publisher/1.0; +https://goldenvisauae.ai)';
const CACHE_MS = 6 * 3_600_000;

type CacheEntry = { at: number; body: string };
const g = globalThis as unknown as { __apCache?: Map<string, CacheEntry>; __apLastReq?: number };
const cache = (g.__apCache ??= new Map());

/** Market → language used for Autocomplete (we write in English, so most markets use en) */
export const MARKETS: Record<string, { name: string; flag: string; hl: string }> = {
  AE: { name: 'UAE', flag: '🇦🇪', hl: 'en' },
  IN: { name: 'India', flag: '🇮🇳', hl: 'en' },
  PK: { name: 'Pakistan', flag: '🇵🇰', hl: 'en' },
  GB: { name: 'United Kingdom', flag: '🇬🇧', hl: 'en' },
  US: { name: 'United States', flag: '🇺🇸', hl: 'en' },
  RU: { name: 'Russia', flag: '🇷🇺', hl: 'en' },
  CN: { name: 'China', flag: '🇨🇳', hl: 'en' },
  SA: { name: 'Saudi Arabia', flag: '🇸🇦', hl: 'en' },
  NG: { name: 'Nigeria', flag: '🇳🇬', hl: 'en' },
  EG: { name: 'Egypt', flag: '🇪🇬', hl: 'en' },
  DE: { name: 'Germany', flag: '🇩🇪', hl: 'en' },
  FR: { name: 'France', flag: '🇫🇷', hl: 'en' },
  TR: { name: 'Türkiye', flag: '🇹🇷', hl: 'en' },
  PH: { name: 'Philippines', flag: '🇵🇭', hl: 'en' },
  ZA: { name: 'South Africa', flag: '🇿🇦', hl: 'en' },
  CA: { name: 'Canada', flag: '🇨🇦', hl: 'en' },
};

const MODIFIERS = {
  question: ['how', 'what', 'can', 'does', 'is', 'why', 'when', 'which', 'who'],
  commercial: ['cost', 'price', 'fees', 'apply', 'requirements', 'documents', 'eligibility', 'consultant', 'agency', 'near me', 'online', 'process', 'time', 'renewal'],
  comparison: ['vs', 'or', 'alternative', 'better than'],
  audience: ['for indian', 'for pakistani', 'for british', 'for russian', 'for chinese', 'for nigerian', 'for doctors', 'for engineers', 'for investors', 'for family', 'for retirees'],
  alphabet: 'abcdefghijklmnopqrstuvwxyz'.split(''),
};

async function politeFetch(url: string, timeoutMs = 10_000): Promise<string | null> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.body;
  const wait = (g.__apLastReq || 0) + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  g.__apLastReq = Date.now();
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' }, signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
    if (!res.ok) return null;
    const body = await res.text();
    cache.set(url, { at: Date.now(), body });
    if (cache.size > 2000) cache.delete(cache.keys().next().value as string);
    return body;
  } catch {
    return null;
  }
}

export async function autocomplete(q: string, gl: string, hl = 'en'): Promise<string[]> {
  if (isFakeAi()) return [`${q} requirements 2026`, `${q} cost for family`, `how to apply for ${q}`];
  const body = await politeFetch(`https://suggestqueries.google.com/complete/search?client=firefox&hl=${hl}&gl=${gl.toLowerCase()}&q=${encodeURIComponent(q)}`);
  if (!body) return [];
  try {
    const j = JSON.parse(body);
    return Array.isArray(j?.[1]) ? j[1].map((x: any) => String(x)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export type NewsItem = { title: string; snippet: string; source: string; date: string; link: string };

function parseRss(xml: string): NewsItem[] {
  const out: NewsItem[] = [];
  const pick = (block: string, tag: string) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim() : '';
  };
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const b = m[1];
    out.push({ title: pick(b, 'title'), snippet: pick(b, 'description').slice(0, 400), source: pick(b, 'source'), date: pick(b, 'pubDate'), link: pick(b, 'link') });
  }
  return out;
}

export async function googleNews(q: string, gl = 'AE'): Promise<NewsItem[]> {
  if (isFakeAi()) return [];
  const body = await politeFetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=${gl}&ceid=${gl}:en`);
  return body ? parseRss(body).slice(0, 15) : [];
}

export async function googleTrends(gl: string): Promise<NewsItem[]> {
  if (isFakeAi()) return [];
  const body = await politeFetch(`https://trends.google.com/trending/rss?geo=${gl}`);
  return body ? parseRss(body).slice(0, 30) : [];
}

/** Recent news (last `days`) relevant to the given words */
export function freshRelevant(items: NewsItem[], relevance: string[], days = 7): NewsItem[] {
  const rel = new Set(relevance);
  const cutoff = Date.now() - days * 86_400_000;
  return items.filter((n) => {
    const t = Date.parse(n.date);
    if (Number.isFinite(t) && t < cutoff) return false;
    return terms(`${n.title} ${n.snippet}`).filter((w) => rel.has(w)).length >= 2;
  });
}

function seedsOf(m: { keywords: string; focus: string }): string[] {
  const list = String(m.keywords || '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list.slice(0, 20) : [m.focus].filter(Boolean);
}

/**
 * One research pass for a mission: queries a rotating slice of seed × market × modifier
 * (at most `budget` requests), scores the suggestions and stores them in the keyword bank.
 */
export async function researchMission(mission: { id: string; keywords: string; focus: string; markets: string }, budget = 45, competitorBrands: string[] = []) {
  const seeds = seedsOf(mission);
  let markets: string[] = [];
  try {
    markets = JSON.parse(mission.markets || '[]');
  } catch {
    /* ignore */
  }
  if (!markets.length) markets = ['AE'];
  const mods = [...MODIFIERS.question, ...MODIFIERS.commercial, ...MODIFIERS.comparison, ...MODIFIERS.audience, ...MODIFIERS.alphabet];
  const combos: { q: string; gl: string }[] = [];
  for (const s of seeds) for (const gl of markets) {
    combos.push({ q: s, gl });
    for (const m of mods) combos.push({ q: MODIFIERS.question.includes(m) ? `${m} ${s}` : `${s} ${m}`, gl });
  }
  // rotate through the combinations across runs
  const stateKey = `autopublisher:research:${mission.id}`;
  const row = await prisma.setting.findUnique({ where: { key: stateKey } }).catch(() => null);
  let offset = row ? Number(JSON.parse(row.value).offset) || 0 : 0;
  const slice: typeof combos = [];
  for (let i = 0; i < Math.min(budget, combos.length); i++) slice.push(combos[(offset + i) % combos.length]);
  offset = (offset + slice.length) % Math.max(1, combos.length);
  await prisma.setting.upsert({ where: { key: stateKey }, update: { value: JSON.stringify({ offset, at: new Date().toISOString() }) }, create: { key: stateKey, value: JSON.stringify({ offset, at: new Date().toISOString() }) } }).catch(() => null);

  // trends + news once per market (cached)
  const relevance = [...new Set(seeds.flatMap((s) => terms(s)).concat(terms(mission.focus)))];
  const trending = new Set<string>();
  for (const gl of markets.slice(0, 4)) {
    for (const t of freshRelevant(await googleTrends(gl), relevance, 3)) trending.add(normalize(t.title));
  }

  const found = new Map<string, { hits: number; bestPos: number; markets: Set<string> }>();
  let requests = 0;
  for (const c of slice) {
    const list = await autocomplete(c.q, c.gl, MARKETS[c.gl]?.hl || 'en');
    requests++;
    list.forEach((k, pos) => {
      const key = normalize(k);
      if (!key) return;
      const f = found.get(key) || { hits: 0, bestPos: 99, markets: new Set<string>() };
      f.hits++;
      f.bestPos = Math.min(f.bestPos, pos);
      f.markets.add(c.gl);
      found.set(key, f);
    });
  }
  // keep only suggestions that share a word with the mission
  let saved = 0;
  for (const [k, f] of found) {
    if (!terms(k).some((w) => relevance.includes(w))) continue;
    const isTrend = [...trending].some((t) => t && (t.includes(k) || k.includes(t)));
    const score = scoreKeyword(k, { hits: f.hits, bestPos: f.bestPos, markets: f.markets.size, trending: isTrend, banned: competitorBrands });
    if (score <= 0) continue;
    try {
      const existing = await prisma.autoKeyword.findUnique({ where: { keyword: k } });
      if (existing) {
        await prisma.autoKeyword.update({ where: { id: existing.id }, data: { hits: existing.hits + f.hits, score: Math.max(existing.score, score) } });
      } else {
        await prisma.autoKeyword.create({ data: { keyword: k, market: [...f.markets].join(','), source: isTrend ? 'trends' : 'autocomplete', intent: keywordIntent(k), score, hits: f.hits, status: 'new' } });
        saved++;
      }
    } catch {
      /* unique race — ignore */
    }
  }
  await autoLog('info', `Research "${seeds[0] || mission.focus}": ${requests} lookups, ${found.size} suggestions, ${saved} new keywords`);
  return { requests, suggestions: found.size, saved };
}

/** Related questions and suggestions for a chosen focus keyword (for H2s and FAQ) */
export async function clusterFor(focus: string, markets: string[]) {
  const gl = markets[0] || 'AE';
  const qs = new Set<string>();
  const related = new Set<string>();
  for (const q of [focus, `how ${focus}`, `can ${focus}`, `what ${focus}`, `${focus} cost`]) {
    for (const s of await autocomplete(q, gl)) {
      const n = normalize(s);
      if (n === normalize(focus)) continue;
      if (/^(how|what|can|does|is|are|why|when|which|who|do|should)\b/.test(n)) qs.add(s);
      else related.add(s);
    }
  }
  return { questions: [...qs].slice(0, 10), related: [...related].slice(0, 10) };
}
