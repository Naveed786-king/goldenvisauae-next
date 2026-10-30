// Pure text helpers: normalising, tokens, shingles, similarity, slugs, keyword scoring, SEO checks.
// No imports — unit-testable with plain Node.

const STOP = new Set(
  'a an the and or but of for to in on at by with from as is are was were be been being it its this that these those you your yours we our us they their them i my me he she his her can could will would should may might must do does did not no yes if then than so such into about over under after before how what why when which who whom whose where there here also just very more most other some any each per via vs'.split(' '),
);

export function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalize(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9؀-ۿЀ-ӿ一-鿿ऀ-ॿ]+/g, ' ')
    .trim();
}

export function words(s: string): string[] {
  return normalize(s).split(' ').filter(Boolean);
}

/** Meaningful terms (no stop words), lightly stemmed */
export function terms(s: string): string[] {
  return words(s)
    .filter((w) => !STOP.has(w) && w.length > 1)
    .map(stem);
}

/** Very light English stemmer: families→family, renewal→renew, documents→document, processing→process */
export function stem(w: string): string {
  if (!/^[a-z]+$/.test(w) || w.length < 5) return w;
  let x = w.replace(/ies$/, 'y');
  for (const suf of ['ations', 'ation', 'ings', 'ing', 'als', 'al', 'ed', 'es', 's']) {
    if (suf === 's' && /(ss|us|is)$/.test(x)) continue; // status, process, analysis
    if (x.endsWith(suf) && x.length - suf.length >= 4) {
      x = x.slice(0, -suf.length);
      break;
    }
  }
  return x;
}

export function jaccard(a: Iterable<string | number>, b: Iterable<string | number>): number {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Share of A contained in B */
export function containment(a: Iterable<string | number>, b: Iterable<string | number>): number {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / A.size;
}

/** 32-bit FNV-1a */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Hashed 4-word shingles, sampled (keeps hashes divisible by `mod`) so fingerprints stay small */
export function shingles(text: string, n = 4, mod = 1, limit = 3000): number[] {
  const w = words(text);
  const out = new Set<number>();
  for (let i = 0; i + n <= w.length; i++) {
    const h = hash32(w.slice(i, i + n).join(' '));
    if (h % mod === 0) out.add(h);
    if (out.size >= limit) break;
  }
  return [...out];
}

/** Words that appear in almost every title on this site — ignored when comparing topics */
const DOMAIN_COMMON = new Set(['golden', 'visa', 'uae', 'dubai', 'emirate', 'guide', 'complete', 'explained', 'need', 'know', 'get', 'your', '2025', '2026', '2027', 'year', 'new', 'best']);

/** Topic terms: meaningful words minus the ones every title shares */
export function topicTerms(s: string): string[] {
  const t = terms(s).filter((w) => !DOMAIN_COMMON.has(w));
  return t.length ? t : terms(s);
}

export function titleSimilarity(a: string, b: string): number {
  return jaccard(topicTerms(a), topicTerms(b));
}

export function slugify(s: string, max = 70): string {
  const base = normalize(s)
    .split(' ')
    .filter((w) => w && !['a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'and', 'your', 'you', 'is', 'are', 'can', 'do', 'does', 'what', 'how'].includes(w))
    .join('-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (base.length <= max) return base;
  return base.slice(0, max).replace(/-[^-]*$/, '');
}

// ---------------------------------------------------------------- keyword scoring

const COMMERCIAL = /\b(cost|price|prices|fee|fees|apply|application|requirements?|documents?|eligib\w*|consultant|agency|agent|near me|online|process|renew\w*|how much|cheap|best|service|services)\b/;
const QUESTION = /^(how|what|can|does|is|are|why|when|which|who|do|should)\b/;
const LOCAL = /\b(dubai|uae|abu dhabi|ras al khaimah|rak|sharjah|ajman|emirates)\b/;

export function keywordIntent(k: string): 'info' | 'commercial' | 'local' | 'news' {
  const s = normalize(k);
  if (COMMERCIAL.test(s)) return 'commercial';
  if (LOCAL.test(s) && !QUESTION.test(s)) return 'local';
  return 'info';
}

/** 0-100 score from demand (hits, position), intent, trend and penalties */
export function scoreKeyword(k: string, o: { hits: number; bestPos: number; markets: number; trending?: boolean; banned?: string[] }): number {
  const s = normalize(k);
  const n = s.split(' ').length;
  if (n < 3) return 0;
  if (o.banned?.some((b) => b && s.includes(normalize(b)))) return 0;
  let score = 20;
  score += Math.min(25, o.hits * 5); // seen for many modifiers/markets
  score += Math.max(0, 10 - o.bestPos * 1.5); // near the top of suggestions
  score += Math.min(10, (o.markets - 1) * 3);
  if (COMMERCIAL.test(s)) score += 15;
  if (QUESTION.test(s)) score += 8;
  if (LOCAL.test(s)) score += 6;
  if (o.trending) score += 12;
  if (n > 10) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ---------------------------------------------------------------- SEO checklist

export type SeoInput = { title: string; seoTitle: string; metaDescription: string; slug: string; focusKeyword: string; contentHtml: string; faqCount: number; imageAltsMissing?: number };
export type SeoResult = { score: number; failed: string[]; passed: string[]; density: number; words: number };

export function seoScore(i: SeoInput): SeoResult {
  const kw = normalize(i.focusKeyword);
  const kwTerms = terms(i.focusKeyword);
  const has = (t: string) => {
    const s = normalize(t);
    if (!kw) return false;
    if (s.includes(kw)) return true;
    return kwTerms.length > 0 && containment(kwTerms, terms(t)) >= 0.8; // close variant
  };
  const text = stripHtml(i.contentHtml);
  const wc = words(text).length;
  const first100 = words(text).slice(0, 100).join(' ');
  const h2s = [...i.contentHtml.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => stripHtml(m[1]));
  const links = [...i.contentHtml.matchAll(/<a\s[^>]*href="([^"]+)"/gi)].map((m) => m[1]).filter((h) => h.startsWith('/'));
  const occurrences = kw ? (normalize(text).match(new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')) || []).length : 0;
  const density = wc ? (occurrences * Math.max(1, kw.split(' ').length) * 100) / wc : 0;
  const sentences = text.split(/[.!?]+\s/).filter((s) => s.trim());
  const avgSentence = sentences.length ? wc / sentences.length : 0;

  const checks: [string, boolean, number][] = [
    ['Focus keyword in title', has(i.title), 12],
    ['SEO title 50–60 characters', i.seoTitle.length >= 45 && i.seoTitle.length <= 65, 8],
    ['Focus keyword in SEO title', has(i.seoTitle), 6],
    ['Meta description 140–158 characters', i.metaDescription.length >= 130 && i.metaDescription.length <= 165, 8],
    ['Focus keyword in meta description', has(i.metaDescription), 6],
    ['Short slug with the keyword', i.slug.length <= 75 && kwTerms.some((t) => i.slug.includes(t)), 6],
    ['Focus keyword in the first 100 words', has(first100), 10],
    ['Focus keyword in at least one H2', h2s.some(has), 8],
    ['Keyword density 0.5–1.5% (not stuffed)', density >= 0.3 && density <= 2, 8],
    ['4–8 H2 sections', h2s.length >= 4 && h2s.length <= 9, 8],
    ['At least 3 internal links', new Set(links).size >= 3, 8],
    ['FAQ with 3–6 questions', i.faqCount >= 3 && i.faqCount <= 8, 6],
    ['Picture alt texts present', !i.imageAltsMissing, 2],
    ['No H1 in the content', !/<h1[\s>]/i.test(i.contentHtml), 2],
    ['Readable sentence length', avgSentence > 0 && avgSentence <= 24, 2],
  ];
  let score = 0;
  const failed: string[] = [];
  const passed: string[] = [];
  for (const [label, okk, w] of checks) {
    if (okk) {
      score += w;
      passed.push(label);
    } else failed.push(label);
  }
  return { score, failed, passed, density: Math.round(density * 100) / 100, words: wc };
}

// ---------------------------------------------------------------- honesty checks

const GUARANTEE = /\b(guarantee[ds]?|guaranteed approval|100\s?% (approval|success|guaranteed)|always approved|approval is certain|never rejected)\b/i;

/** Phrases from the banned list found in the text */
export function bannedFound(text: string, banned: string[]): string[] {
  const t = ' ' + normalize(stripHtml(text)) + ' ';
  return banned.filter((b) => {
    const n = normalize(b);
    return n && t.includes(' ' + n + ' ');
  });
}

export function guaranteeFound(text: string): string[] {
  const t = stripHtml(text);
  const out: string[] = [];
  for (const s of t.split(/(?<=[.!?])\s+/)) {
    if (GUARANTEE.test(s) && !/\b(no|not|never|nobody|cannot|can't|won't|doesn't|does not|do not|don't)\b[^.]{0,40}guarantee|guarantee[^.]{0,40}\b(not|never)\b/i.test(s)) out.push(s.trim().slice(0, 160));
  }
  return out;
}

/** Figures (amounts, percentages, durations) in the article that do not appear in the allowed sources */
export function unsupportedNumbers(html: string, allowed: string): string[] {
  const text = stripHtml(html);
  const pool = ' ' + String(allowed || '').replace(/,/g, '').toLowerCase() + ' ';
  const found = new Set<string>();
  const re = /(?:aed|usd|\$|€|£)\s?\d[\d,.]*(?:\s?(?:million|m|k|bn))?|\d[\d,.]*\s?(?:%|percent|aed|dirhams?|million)|\b\d{2,}[\d,]*\b/gi;
  for (const m of text.matchAll(re)) {
    const raw = m[0];
    const digits = raw.replace(/[^\d.]/g, '').replace(/\.$/, '');
    if (!digits) continue;
    const n = Number(digits);
    // years, small counts and list numbers are fine
    if (/^(19|20)\d\d$/.test(digits) || (n <= 12 && !/%|aed|\$|€|£|million/i.test(raw))) continue;
    if (pool.includes(digits) || pool.includes(digits.replace(/\.0+$/, ''))) continue;
    found.add(raw.trim());
  }
  return [...found].slice(0, 30);
}

/** Keeps only safe tags/attributes for post content (no h1, scripts, styles, external links) */
export function cleanArticleHtml(html: string, ownHosts: string[] = ['goldenvisauae.ai']): string {
  let s = String(html || '');
  s = s.replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<(script|style|iframe|object|embed|form|input|button)[^>]*\/?>/gi, '');
  s = s.replace(/<h1(\s[^>]*)?>/gi, '<h2>').replace(/<\/h1>/gi, '</h2>');
  s = s.replace(/\s(style|on\w+|class|id)="[^"]*"/gi, '');
  // external links -> plain text; own absolute links -> relative
  s = s.replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
    const h = href.trim();
    const own = ownHosts.find((host) => h.startsWith(`https://${host}`) || h.startsWith(`http://${host}`) || h.startsWith(`https://www.${host}`));
    if (own) return `<a href="${h.replace(/^https?:\/\/(www\.)?[^/]+/, '') || '/'}">${inner}</a>`;
    if (h.startsWith('/') && !h.startsWith('//')) return `<a href="${h}">${inner}</a>`;
    return inner;
  });
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

export function escapeHtml(s: string): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Puts inline <figure>s after the first paragraph of the N-th H2 section */
export function insertFigures(html: string, figures: { afterH2: number; html: string }[]) {
  const parts = html.split(/(?=<h2[\s>])/i); // parts[0] = intro, parts[n] = n-th H2 section
  for (const f of [...figures].sort((x, y) => y.afterH2 - x.afterH2)) {
    const i = Math.min(Math.max(1, f.afterH2), parts.length - 1);
    if (i < 1 || !parts[i]) {
      parts[parts.length - 1] += f.html;
      continue;
    }
    const sec = parts[i];
    const end = sec.search(/<\/p>/i);
    parts[i] = end >= 0 ? sec.slice(0, end + 4) + f.html + sec.slice(end + 4) : sec + f.html;
  }
  return parts.join('');
}

// ---------------------------------------------------------------- human voice check

/** Words and phrases language models use far more often than people (after Wikipedia's "Signs of AI writing") */
export const AI_WORDS = [
  'delve', 'delves', 'delving', 'tapestry', 'testament', 'pivotal', 'crucial', 'robust', 'seamless', 'seamlessly', 'leverage', 'leveraging',
  'unlock', 'unlocking', 'embark', 'realm', 'vibrant', 'showcase', 'showcasing', 'underscore', 'underscores', 'meticulous', 'meticulously',
  'ever-evolving', 'game-changer', 'navigate the', 'navigating the', 'intricate', 'intricacies', 'bolstered', 'garner', 'interplay',
  'look no further', "it's important to note", 'it is important to note', "it's worth noting", 'it is worth noting', 'in conclusion',
  'in summary', 'in today\'s', "let's dive", 'dive into', 'deep dive', "here's what you need to know", 'whether you\'re', 'whether you are',
  'comprehensive guide', 'ultimate guide', 'the landscape of', 'evolving landscape', 'plays a key role', 'plays a crucial role',
  'stands as', 'serves as a', 'nestled', 'in the heart of', 'breathtaking', 'rest assured', 'peace of mind', 'hassle-free', 'journey',
  'plays a vital role', 'plays a pivotal role', 'a wide range of', 'a myriad of', 'myriad', 'plethora', 'paramount', 'holistic', 'foster',
  'elevate', 'streamline', 'streamlined', 'empower', 'empowering', 'cutting-edge', 'state-of-the-art', 'key takeaways', 'in essence',
  'when it comes to', 'it is essential to', "it's essential to", 'it is crucial', 'navigating', 'commendable', 'noteworthy', 'invaluable',
  'firstly', 'lastly', 'to sum up', 'all in all', 'unparalleled', 'a testament to', 'dynamic landscape', 'thriving', 'bustling',
];

export type AiTells = { score: number; problems: string[] };

/**
 * Finds the patterns that make text read as machine-written. Each problem is written as an
 * instruction for the editor. Score 0 = reads like a person; the publisher rewrites at 3 or more.
 */
export function aiTells(html: string): AiTells {
  const text = stripHtml(html);
  const lower = ` ${text.toLowerCase()} `;
  const problems: string[] = [];
  let score = 0;

  const found = AI_WORDS.filter((w) => lower.includes(` ${w}`) || lower.includes(`${w} `));
  if (found.length) {
    score += Math.min(4, found.length);
    problems.push(`Replace these machine-sounding words/phrases with plain ones (or cut the sentence): ${found.slice(0, 15).map((w) => `"${w}"`).join(', ')}`);
  }
  const dashes = (text.match(/\s[—–]\s|[a-z][—–][a-z]|\s--\s/gi) || []).length;
  if (dashes > 2) {
    score += dashes > 8 ? 2 : 1;
    problems.push(`Remove the ${dashes} em/en dashes: use a comma, colon, full stop or brackets instead`);
  }
  const notBut = (text.match(/\bnot (just|only|merely|simply)\b[^.?!]{0,80}\bbut\b|\bit'?s not [^.?!]{1,60}[,;] it'?s\b|\bisn'?t (just|only) [^.?!]{1,60}[,;] it'?s\b/gi) || []).length;
  if (notBut) {
    score += Math.min(2, notBut);
    problems.push(`State the point directly instead of "not just X but Y" / "it's not X, it's Y" contrasts (${notBut} found)`);
  }
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3);
  if (sentences.length >= 15) {
    const lens = sentences.map((s) => s.split(/\s+/).length);
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
    const short = lens.filter((l) => l <= 7).length / lens.length;
    if (sd < 5.5 || short < 0.06) {
      score += 2;
      problems.push(`Sentences are too even (average ${Math.round(mean)} words, little variation): mix in some short, direct sentences and let a few run longer`);
    }
    const starts: Record<string, number> = {};
    for (const s of sentences) {
      const w = s.split(/\s+/)[0].toLowerCase().replace(/[^a-z']/g, '');
      if (['additionally', 'furthermore', 'moreover', 'however', 'overall', 'ultimately', 'importantly', 'notably'].includes(w)) starts[w] = (starts[w] || 0) + 1;
    }
    const conn = Object.entries(starts).filter(([, n]) => n >= 1);
    const connTotal = conn.reduce((a, [, n]) => a + n, 0);
    if (connTotal >= 3) {
      score += 1;
      problems.push(`Too many sentences open with stock connectors (${conn.map(([w, n]) => `${w} ×${n}`).join(', ')}): start with the subject or the action instead`);
    }
  }
  const boldLabels = (html.match(/<li>\s*<strong>[^<]{1,40}:?\s*<\/strong>\s*:?/gi) || []).length;
  if (boldLabels > 4) {
    score += 1;
    problems.push(`${boldLabels} list items start with a bold label: keep the bold only where it really helps, or turn the list into prose`);
  }
  const closers = (html.match(/<p>\s*(This (shows|means|is why|matters)|That'?s why|The bottom line|The takeaway|The key takeaway|Ultimately,|Overall,)[^<]{0,140}<\/p>/gi) || []).length;
  if (closers >= 2) {
    score += 1;
    problems.push(`Cut the ${closers} summary/closing lines that only restate the section ("This means…", "Ultimately…"): end each section on the last useful fact or next step`);
  }
  // the patterns AI detectors weigh most: flat paragraphs, missing contractions, no "we" voice, same openers
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => stripHtml(m[1])).filter((p) => p.split(/\s+/).length >= 6);
  if (paras.length >= 8) {
    const counts = paras.map((p) => p.split(/(?<=[.!?])\s+/).filter(Boolean).length);
    const single = counts.filter((c) => c === 1).length / counts.length;
    const pm = counts.reduce((a, b) => a + b, 0) / counts.length;
    const psd = Math.sqrt(counts.reduce((a, b) => a + (b - pm) ** 2, 0) / counts.length);
    if (psd < 0.8 || single < 0.08) {
      score += 1;
      problems.push(`Paragraphs all have about the same length (${pm.toFixed(1)} sentences each): make a few of them a single short sentence and let one or two run longer`);
    }
  }
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 400) {
    const contractions = (text.match(/\b\w+'(ll|re|ve|d|s|t|m)\b/gi) || []).filter((c) => !/'s$/i.test(c) || /^(it|that|there|here|what|who|he|she|let)'s$/i.test(c)).length;
    if ((contractions / wordCount) * 100 < 0.5) {
      score += 1;
      problems.push(`Almost no contractions (${contractions} in ${wordCount} words): write "you'll", "it's", "don't", "we've" where a person would say them`);
    }
    if (!/\b(we|we're|we've|our|us)\b/i.test(text)) {
      score += 1;
      problems.push('No "we" anywhere: say what we see with clients and what we check first, where COMPANY FACTS support it');
    }
  }
  if (sentences.length >= 15) {
    const first: Record<string, number> = {};
    for (const s of sentences) {
      const w = s.split(/\s+/)[0].toLowerCase().replace(/[^a-z']/g, '');
      if (w) first[w] = (first[w] || 0) + 1;
    }
    const [topWord, topN] = Object.entries(first).sort((a, b) => b[1] - a[1])[0] || ['', 0];
    if (topN / sentences.length > 0.2) {
      score += 1;
      problems.push(`${topN} of ${sentences.length} sentences start with "${topWord}": vary how sentences open`);
    }
  }
  const triads = (text.match(/\b\w+, \w+(,)? and \w+\b/g) || []).length;
  if (sentences.length && triads / sentences.length > 0.25) {
    score += 1;
    problems.push('Too many lists of three ("fast, simple and reliable"): keep groups of three only where there really are three things');
  }
  return { score, problems };
}
