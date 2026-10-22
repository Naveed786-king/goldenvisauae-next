import { Fragment, type ReactNode } from 'react';

/**
 * The new UAE Dirham symbol (public/dirham.svg). It is drawn with a CSS mask, so it
 * takes the colour of the text around it (see .dh in globals.css).
 * "AED 12,499" → [symbol] 12,499 — used for prices, tables, calculators and article text.
 */
export function Dirham({ className }: { className?: string }) {
  return <span className={className ? `dh ${className}` : 'dh'} role="img" aria-label="AED" />;
}

// "AED" written before an amount (Latin or Arabic digits), e.g. "AED 2M", "AED 1,050", "AED 15,375"
const RE = /\bAED\s?(?=[\d٠-٩])/g;

/** Plain text → text with the symbol in place of "AED" before an amount */
export function withDirham(text: ReactNode): ReactNode {
  if (typeof text !== 'string' || !text.includes('AED')) return text;
  const parts = text.split(RE);
  if (parts.length === 1) return text;
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && <Dirham />}
      {p}
    </Fragment>
  ));
}

const strip = (h: string) => h.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/"/g, '&quot;').trim();

/** Tables in articles: each cell gets its column name, so phones can show rows as stacked cards */
function stackTables(html: string) {
  if (!html.includes('<table')) return html;
  return html.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (whole, attrs: string, body: string) => {
    const headRow = body.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i);
    if (!headRow || !/<th\b/i.test(headRow[1])) return whole;
    const heads = Array.from(headRow[1].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)).map((m) => strip(m[1]));
    if (heads.length < 2) return whole;
    const rows = body.replace(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi, (tr, trAttrs: string, cells: string) => {
      if (!/<td\b/i.test(cells)) return tr;
      let i = 0;
      const out = cells.replace(/<td\b([^>]*)>/gi, (_td, a: string) => {
        const label = heads[i++] || '';
        return /data-label=/.test(a) ? `<td${a}>` : `<td${a} data-label="${label}">`;
      });
      return `<tr${trAttrs}>${out}</tr>`;
    });
    const cls = /class="/.test(attrs) ? attrs.replace(/class="/, 'class="rte-stack ') : `${attrs} class="rte-stack"`;
    return `<table${cls}>${rows}</table>`;
  });
}

/** HTML (articles, rich text) → dirham symbol in text (never inside tags) + phone-friendly tables */
export function dirhamHtml(html?: string | null): string {
  if (!html) return '';
  let out = stackTables(html);
  if (out.includes('AED')) out = out.replace(/(>|^)([^<]*)/g, (_m, a: string, txt: string) => a + txt.replace(RE, '<span class="dh" role="img" aria-label="AED"></span>'));
  return out;
}
