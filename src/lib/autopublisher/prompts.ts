// System prompts and the company facts the writer may use. These decide article quality.
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { AutoConfig } from './config';

const SITE = 'Golden Visa UAE (goldenvisauae.ai), run by Brightlink Management Consultancy L.L.C, Business Bay, Dubai';

export function monthYear(d = new Date()) {
  return d.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' });
}

/** Everything the writer may state about the company, prices and timelines */
export async function companyFacts(cfg: AutoConfig) {
  const k = cfg.knowledge;
  const services = await prisma.service.findMany({ where: { active: true }, orderBy: { order: 'asc' }, select: { title: true, subtitle: true, slug: true } }).catch(() => []);
  let fees = '';
  try {
    const f: any = await getSetting('fees');
    if (f?.enabled !== false) {
      const lines: string[] = [];
      for (const g of f.groups || []) for (const o of g.options || []) lines.push(`${g.label} — ${o.label}: government fee AED ${o.gov}${o.pro ? `, our fee AED ${o.pro}` : ''}`);
      for (const o of f.packages || []) lines.push(`Package ${o.label}: AED ${o.pro}`);
      fees = lines.slice(0, 60).join('\n');
    }
  } catch {
    /* no calculator data */
  }
  const faqs = await prisma.faq.findMany({ where: { active: true }, select: { question: true } }).catch(() => []);
  const block = [
    k.about && `ABOUT US:\n${k.about}`,
    `SERVICES WE OFFER (link to them, never compete with them):\n${services.map((s) => `- ${s.title}${s.subtitle ? ` — ${s.subtitle}` : ''} (/services/${s.slug})`).join('\n')}${k.services ? `\n${k.services}` : ''}`,
    (k.prices || fees) && `REAL PRICES AND FEES (only these numbers may be used for our prices):\n${[k.prices, fees].filter(Boolean).join('\n')}`,
    k.timelines && `REAL TIMELINES:\n${k.timelines}`,
    k.cases && `REAL ANONYMISED CASES (may be used as examples, never embellished):\n${k.cases}`,
    k.mistakes && `COMMON MISTAKES WE SEE:\n${k.mistakes}`,
    k.rules && `RULES — NEVER SAY OR PROMISE:\n${k.rules}`,
    k.cta && `CALL TO ACTION:\n${k.cta}`,
  ]
    .filter(Boolean)
    .join('\n\n');
  return { text: block, services, faqQuestions: faqs.map((f) => f.question) };
}

/** Pages and posts the article may link to */
export async function linkTargets(topicTerms: string[]) {
  const posts = await prisma.post.findMany({ where: { status: 'published' }, select: { slug: true, title: true } }).catch(() => []);
  const score = (t: string) => topicTerms.filter((w) => t.toLowerCase().includes(w)).length;
  const related = posts
    .map((p) => ({ ...p, s: score(p.title) }))
    .filter((p) => p.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 8)
    .map((p) => ({ href: `/blog/${p.slug}`, title: p.title }));
  const fixed = [
    { href: '/services/golden-visa-cost', title: 'Golden Visa cost calculator' },
    { href: '/apply', title: 'Apply online' },
    { href: '/check-visa-status', title: 'Check visa status / eligibility' },
    { href: '/contact', title: 'Talk to a consultant' },
  ];
  return { related, fixed };
}

const STYLE = (cfg: AutoConfig) => `STYLE
- Write for people first. Every paragraph must teach something specific or help a decision.
- Plain, confident, warm. Mix short and long sentences. Active voice. Paragraphs of at most 3–4 sentences.
- Show experience: practical steps, the real documents involved, what usually goes wrong, decision tables and checklists.
- No fluff, no clichés, no rhetorical openings ("Are you dreaming of…"), no "In conclusion".
- Never use these phrases: ${cfg.quality.bannedPhrases.join('; ')}.

ACCURACY (non-negotiable)
- Facts about our company, prices, timelines and cases come ONLY from COMPANY FACTS. If something is not there, stay general.
- Government rules: describe carefully, say "as of ${monthYear()}" and advise checking the latest rules where they change.
- Never invent numbers, statistics, approval rates, reviews, testimonials, quotes, awards or licence numbers.
- Never guarantee or promise visa approval — the UAE authorities decide.
- Never mention competitors. No external links — internal links only (relative URLs from the list provided).`;

const ARTICLE_JSON = `Return JSON only, exactly this shape:
{
 "title": "", "seoTitle": "50-60 chars, starts with the focus keyword where natural", "metaDescription": "140-158 chars, includes the focus keyword",
 "focusKeyword": "", "secondaryKeywords": [""], "slug": "short-keyword-slug", "excerpt": "1-2 sentences",
 "category": "", "tags": [""], "quickAnswer": "2-4 sentence direct answer",
 "contentHtml": "<h2>…</h2><p>…</p> … (no <h1>, no quick answer box, no FAQ section, no inline styles, no scripts)",
 "faq": [{"q": "", "a": ""}],
 "internalLinks": [{"anchor": "", "href": "/…"}],
 "imagePlan": [{"purpose": "", "prompt": "", "alt": "", "placement": "cover | after-h2-N"}]
}`;

export function briefPrompt(cfg: AutoConfig, ctx: any) {
  const system = `You are a senior content strategist for ${SITE}, a UAE Golden Visa and residency consultancy.
You plan articles that outrank generic pages because they are more useful, more specific and more trustworthy.
${STYLE(cfg)}`;
  const prompt = `Plan one article.

FOCUS KEYWORD: ${ctx.focusKeyword}
SECONDARY KEYWORDS: ${(ctx.secondary || []).join(', ') || '—'}
QUESTIONS PEOPLE ASK: ${(ctx.questions || []).join(' | ') || '—'}
RELATED SEARCHES: ${(ctx.related || []).join(' | ') || '—'}
TARGET MARKETS: ${(ctx.markets || []).join(', ')}
MISSION: ${ctx.missionFocus || '—'} · tone: ${ctx.tone || 'expert, warm'} · length ${ctx.minWords}-${ctx.maxWords} words
${ctx.kind === 'refresh' ? `THIS IS A REFRESH of our own existing article "${ctx.topicTitle}". Keep its topic and promise, expand it to full depth, fix anything outdated, improve structure and usefulness. Keep the title unless a clearer one serves the same search.\nOUR EXISTING TEXT (ours — you may reuse and improve it):\n${ctx.existingText || ''}` : ''}
${ctx.kind === 'replace' ? `THIS IS A REPLACEMENT: write a completely new, original article on the topic "${ctx.topicTitle}" from your own expertise and the research below. Do not imitate any existing page; use a fresh structure and angle.` : ''}
${ctx.customTitle && ctx.kind !== 'refresh' ? `REQUIRED TITLE: ${ctx.customTitle}` : ''}
${ctx.category ? `CATEGORY: ${ctx.category}` : `CATEGORY: choose one of: ${ctx.categories.join(', ')}`}

FRESH NEWS (may be used, with "as of" dates):
${(ctx.news || []).map((n: any) => `- ${n.title} (${n.source}, ${n.date}): ${n.snippet}`).join('\n') || '—'}

COMPANY FACTS:
${ctx.facts || '— (none given: stay general about the company)'}

EXISTING FAQ QUESTIONS ON OUR SITE (do not repeat word for word): ${(ctx.faqQuestions || []).slice(0, 40).join(' | ')}

INTERNAL LINK TARGETS:
${[...ctx.links.fixed, ...ctx.links.related].map((l: any) => `- ${l.href} — ${l.title}`).join('\n')}

Return JSON only:
{"intent":"", "reader":{"who":"","country":"","fears":"","wants":""}, "angle":"what makes this better than the current top results",
 "title":"", "outline":[{"h2":"","h3":[""],"notes":""}], "quickAnswer":"what the quick answer must say",
 "table":"which table or checklist helps (or empty)", "companyFacts":["facts from COMPANY FACTS to use"],
 "faq":["3-6 questions"], "internalLinks":[{"anchor":"","href":""}], "cta":"",
 "imagePlan":[{"purpose":"cover"},{"purpose":"","placement":"after-h2-2"}], "category":""}`;
  return { system, prompt };
}

export function writePrompt(cfg: AutoConfig, ctx: any) {
  const system = `You are an expert writer who has personally handled hundreds of UAE visa files for ${SITE}.
You write deep, original, human articles from a brief. Length comes from useful substance, never padding.
${STYLE(cfg)}
HTML: use <h2>/<h3>, <p>, <ul>/<ol>, <table> (with <thead>), <blockquote> sparingly, and <a href="/…"> for internal links (at least 3).`;
  const prompt = `Write the full article from this brief. Target ${ctx.minWords}-${ctx.maxWords} words in contentHtml.

BRIEF:
${JSON.stringify(ctx.brief, null, 1)}

FOCUS KEYWORD: ${ctx.focusKeyword} (in the title, the first 100 words and one H2; natural density ~1%)
COMPANY FACTS:
${ctx.facts || '— (none: stay general)'}

FRESH NEWS:
${(ctx.news || []).map((n: any) => `- ${n.title} (${n.source}, ${n.date}): ${n.snippet}`).join('\n') || '—'}

${ARTICLE_JSON}`;
  return { system, prompt };
}

export function editPrompt(cfg: AutoConfig, ctx: any) {
  const system = `You are a strict senior human editor at ${SITE}. You turn a draft into an article a careful expert would be proud to sign.
${STYLE(cfg)}`;
  const prompt = `Edit this article. Do all of this:
1. Remove every cliché and every banned phrase. Vary sentence length and rhythm. Short paragraphs.
2. Add concrete examples and specific numbers ONLY if they appear in RESEARCH or COMPANY FACTS below.
3. List every claim that is not supported by RESEARCH, COMPANY FACTS or well-known public rules, then remove or soften it.
4. Keep the HTML conventions and all internal links (fix any that are not in the allowed list).
5. Score the final article honestly.

ALLOWED INTERNAL LINKS: ${ctx.allowedLinks.join(', ')}
RESEARCH:
${ctx.research || '—'}
COMPANY FACTS:
${ctx.facts || '—'}
${ctx.notes ? `EDITOR NOTES FROM THE LAST ROUND (fix these): ${ctx.notes}` : ''}

ARTICLE (JSON):
${JSON.stringify(ctx.article)}

Return JSON only: {"article": <same shape as the input article>, "quality": {"score": 0-100, "helpfulness": 0-100, "originality": 0-100, "accuracy": 0-100, "readability": 0-100, "eeat": 0-100, "reasons": [""]}, "unsupportedClaims": [""]}`;
  return { system, prompt };
}

export function fixPrompt(cfg: AutoConfig, article: any, problems: string[], extra = '') {
  const system = `You are a precise editor at ${SITE}. Fix only what is listed, keep everything else.
${STYLE(cfg)}`;
  const prompt = `Fix these problems in the article:
${problems.map((p) => `- ${p}`).join('\n')}
${extra}

ARTICLE (JSON):
${JSON.stringify(article)}

${ARTICLE_JSON}`;
  return { system, prompt };
}

/** Native rewrite: adapts (not translates word for word) an article for readers in one language/market */
export function nativePrompt(cfg: AutoConfig, article: any, locale: { code: string; name: string }) {
  const system = `You are a native ${locale.name} editor and UAE visa expert at ${SITE}. You adapt articles for ${locale.name}-speaking readers so they read as if written in ${locale.name} from the start.
Rules: keep every fact, number, warning and internal link exactly; do not add new facts or numbers; never promise approval; natural, idiomatic ${locale.name}; keep the HTML structure (h2/h3/p/ul/ol/table/a, figures unchanged); no external links.`;
  const prompt = `Adapt this article into natural ${locale.name} (${locale.code}) for readers from ${locale.name}-speaking countries. Adapt examples and phrasing to them where useful, without changing facts.

ARTICLE (JSON):
${JSON.stringify({ title: article.title, seoTitle: article.seoTitle, metaDescription: article.metaDescription, excerpt: article.excerpt, quickAnswer: article.quickAnswer, contentHtml: article.contentHtml, faq: article.faq, category: article.category, tags: article.tags })}

Return JSON only with the same keys: {"title":"","seoTitle":"","metaDescription":"","excerpt":"","quickAnswer":"","contentHtml":"","faq":[{"q":"","a":""}],"category":"","tags":[""]}`;
  return { system, prompt };
}
