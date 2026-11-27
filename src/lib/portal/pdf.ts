// Quotation and payment receipt PDFs (A4), in the site's colours with the gold seal (like the emails). Texts come from Admin → Client messages & PDFs.
import path from 'path';
import { readFile } from 'fs/promises';
import sharp from 'sharp';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { getSetting } from '@/lib/settings';

export type PdfDoc = {
  kind: 'quote' | 'receipt';
  title?: string;
  name: string;
  ref: string;
  /** extra facts in the client box, e.g. Receipt no., Paid on, Method */
  facts?: [string, string][];
  desc?: string;
  lines: [string, string][];
  totalLabel: string;
  total: string;
  notes?: string[];
};

const hexRgb = (h: string) => {
  const n = parseInt(h.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
/** The standard PDF fonts only cover Latin-1 */
const t = (v: unknown, max = 200) =>
  String(v ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[·•]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .slice(0, max);

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      out.push(line);
      line = w;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

let logoCache: Buffer | null | undefined;
async function logoPng(src: string) {
  if (logoCache !== undefined) return logoCache;
  try {
    const file = src && src.startsWith('/') && !src.startsWith('//') ? path.join(process.cwd(), 'public', src) : path.join(process.cwd(), 'public/brand/logo.webp');
    logoCache = await sharp(await readFile(file)).resize({ height: 140 }).png().toBuffer();
  } catch {
    logoCache = null;
  }
  return logoCache;
}

export async function makePdf(d: PdfDoc): Promise<Uint8Array> {
  const [cfg, site] = await Promise.all([getSetting('pdf'), getSetting('site')]);
  // the email look: dark band with the gold seal, gold line, light boxes
  const GOLD = /^#[0-9a-f]{6}$/i.test(cfg.accent) ? hexRgb(cfg.accent) : hexRgb('#c9a24a');
  const GOLD_L = hexRgb('#ecd9a3');
  const GREEN = hexRgb('#0b0b0c');
  const GREEN_D = hexRgb('#000000');
  const GREEN_M = hexRgb('#2b261d');
  const MID = hexRgb('#8a6a24');
  const INK = hexRgb('#1d1d1f');
  const SOFT = hexRgb('#6e6e73');
  const LINE = hexRgb('#ece6d8');
  const MINT = hexRgb('#faf8f3');
  const WHITE = rgb(1, 1, 1);

  const doc = await PDFDocument.create();
  const title = d.title || (d.kind === 'quote' ? cfg.quoteTitle : cfg.receiptTitle);
  doc.setTitle(t(`${title} ${d.ref}`));
  doc.setAuthor(t(site.name));
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const W = 595;
  const H = 842;
  const M = 50;
  const CW = W - 2 * M;
  const HEAD = 112; // the green band on the first page
  const host = t((process.env.NEXT_PUBLIC_SITE_URL || 'https://goldenvisauae.ai').replace(/^https?:\/\//, '').replace(/\/+$/, ''), 60);

  const footer = t(cfg.footer.trim() || [site.name, site.address, site.phoneDisplay, site.emailGeneral].filter(Boolean).join('  |  '), 400);
  const flines = wrap(footer, reg, 7.5, CW).slice(0, 4);
  const FOOT = 34 + flines.length * 11;
  const BOTTOM = FOOT + 18;

  const seal = cfg.showLogo === false ? null : await logoPng('/brand/coin-192.png');
  const sealImg = seal ? await doc.embedPng(seal) : null;

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  /** pages after the first: a thin green band with the name */
  const newPage = () => {
    page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 34, width: W, height: 34, color: GREEN });
    page.drawRectangle({ x: 0, y: H - 36.5, width: W, height: 2.5, color: GOLD });
    page.drawText(t(site.name), { x: M, y: H - 22, size: 10, font: bold, color: WHITE });
    const r = t(`${title} - ${d.ref}`, 80);
    page.drawText(r, { x: W - M - reg.widthOfTextAtSize(r, 8.5), y: H - 22, size: 8.5, font: reg, color: GOLD_L });
    y = H - 36.5 - 30;
  };
  const ensure = (need: number) => {
    if (y - need < BOTTOM) newPage();
  };
  const para = (s: string, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; after?: number; bullet?: boolean } = {}) => {
    const size = o.size ?? 10;
    const font = o.font ?? reg;
    const lh = size * 1.5;
    const indent = o.bullet ? 12 : 0;
    wrap(t(s, 1200), font, size, CW - indent).forEach((l, i) => {
      ensure(lh);
      if (i === 0 && o.bullet) page.drawRectangle({ x: M + 1, y: y - size + 2.5, width: 4, height: 4, color: GOLD });
      page.drawText(l, { x: M + indent, y: y - size, size, font, color: o.color ?? INK });
      y -= lh;
    });
    y -= o.after ?? 0;
  };

  // header band: seal, name and website on the left, document label and date on the right
  page.drawRectangle({ x: 0, y: H - HEAD, width: W, height: HEAD, color: GREEN });
  // soft diagonal light on the right side of the band (SVG path: y grows downwards from the given point)
  page.drawSvgPath(`M ${W * 0.58} 0 L ${W} 0 L ${W} ${HEAD} L ${W * 0.48} ${HEAD} Z`, { x: 0, y: H, color: GREEN_M, opacity: 0.45 });
  page.drawSvgPath(`M ${W * 0.74} 0 L ${W} 0 L ${W} ${HEAD} L ${W * 0.64} ${HEAD} Z`, { x: 0, y: H, color: GREEN_M, opacity: 0.35 });
  page.drawRectangle({ x: 0, y: H - HEAD - 3, width: W, height: 3, color: GOLD });
  const midY = H - HEAD / 2;
  let tx = M;
  if (sealImg) {
    const s = 58;
    page.drawImage(sealImg, { x: M, y: midY - s / 2, width: s, height: s });
    tx = M + s + 14;
  }
  page.drawText(t(site.name || 'Golden Visa UAE', 60), { x: tx, y: midY + 2, size: 19, font: bold, color: WHITE });
  page.drawText(host.toUpperCase().split('').join(' '), { x: tx, y: midY - 15, size: 7.5, font: bold, color: GOLD_L });
  const label = t((d.kind === 'quote' ? cfg.quoteLabel : cfg.receiptLabel) || (d.kind === 'quote' ? 'QUOTATION' : 'PAYMENT RECEIPT'), 40).toUpperCase();
  const lw = bold.widthOfTextAtSize(label, 9.5) + 26;
  page.drawRectangle({ x: W - M - lw, y: midY - 2, width: lw, height: 24, color: GOLD });
  page.drawText(label, { x: W - M - lw + 13, y: midY + 6, size: 9.5, font: bold, color: GREEN_D });
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  if (cfg.showDate !== false) page.drawText(date, { x: W - M - reg.widthOfTextAtSize(date, 9), y: midY - 17, size: 9, font: reg, color: rgb(0.85, 0.83, 0.78) });
  y = H - HEAD - 3 - 34;

  if (d.kind === 'receipt') {
    // a "PAID" stamp beside the title
    const st = 'PAID';
    const sw = bold.widthOfTextAtSize(st, 13) + 28;
    page.drawRectangle({ x: W - M - sw, y: y - 27, width: sw, height: 27, borderColor: MID, borderWidth: 1.6, color: MINT });
    page.drawText(st, { x: W - M - sw + 14, y: y - 19, size: 13, font: bold, color: MID });
  }
  para(title, { size: 23, font: serif, color: GREEN, after: 10 });

  // client box
  const facts: [string, string][] = [['Prepared for', d.name], ['Reference', d.ref], ...(d.facts || [])];
  const rowH = 32;
  const boxH = 16 + Math.ceil(facts.length / 2) * rowH;
  ensure(boxH + 10);
  page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: MINT, borderColor: LINE, borderWidth: 0.8 });
  page.drawRectangle({ x: M, y: y - boxH, width: 3, height: boxH, color: GOLD });
  facts.forEach(([k, v], i) => {
    const cx = M + 18 + (i % 2) * (CW / 2);
    const cy = y - 12 - Math.floor(i / 2) * rowH;
    page.drawText(t(k.toUpperCase()), { x: cx, y: cy - 8, size: 7.5, font: bold, color: SOFT });
    page.drawText(wrap(t(v), bold, 10.5, CW / 2 - 28)[0] ?? '', { x: cx, y: cy - 22, size: 10.5, font: bold, color: GREEN });
  });
  y -= boxH + 16;
  if (d.desc) para(d.desc, { color: SOFT, after: 4 });
  if (d.kind === 'quote' && cfg.intro) cfg.intro.split('\n').forEach((l) => l.trim() && para(l, { after: 2 }));
  y -= 6;

  // table
  const head = () => {
    ensure(54);
    page.drawRectangle({ x: M, y: y - 26, width: CW, height: 26, color: GREEN });
    page.drawText(d.kind === 'receipt' ? 'DETAILS' : 'ITEM', { x: M + 14, y: y - 17, size: 8.5, font: bold, color: WHITE });
    page.drawText('AMOUNT', { x: W - M - 14 - bold.widthOfTextAtSize('AMOUNT', 8.5), y: y - 17, size: 8.5, font: bold, color: GOLD_L });
    y -= 26;
  };
  head();
  d.lines.slice(0, 80).forEach(([label, amount], i) => {
    const ls = wrap(t(label), reg, 10, CW - 160);
    const rh = 14 + ls.length * 14;
    if (y - rh < BOTTOM) {
      newPage();
      head();
    }
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - rh, width: CW, height: rh, color: MINT });
    ls.forEach((l, k) => page.drawText(l, { x: M + 14, y: y - 17 - k * 14, size: 10, font: reg, color: INK }));
    const a = t(amount, 40);
    page.drawText(a, { x: W - M - 14 - bold.widthOfTextAtSize(a, 10), y: y - 17, size: 10, font: bold, color: INK });
    y -= rh;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: LINE });
  });

  // total: a green bar with the amount in gold
  ensure(70);
  y -= 14;
  page.drawRectangle({ x: M, y: y - 48, width: CW, height: 48, color: GREEN });
  page.drawRectangle({ x: M, y: y - 48, width: 4, height: 48, color: GOLD });
  page.drawText(t(d.totalLabel).toUpperCase(), { x: M + 18, y: y - 29, size: 10.5, font: bold, color: WHITE });
  const tt = t(d.total);
  page.drawText(tt, { x: W - M - 16 - bold.widthOfTextAtSize(tt, 17), y: y - 30, size: 17, font: bold, color: GOLD_L });
  y -= 66;

  const notes = [...(d.notes || []), ...(d.kind === 'quote' && cfg.notes ? cfg.notes.split('\n') : [])].map((s) => s.trim()).filter(Boolean);
  if (notes.length) {
    ensure(40);
    page.drawRectangle({ x: M, y: y - 13, width: 3, height: 14, color: GOLD });
    page.drawText('Notes', { x: M + 10, y: y - 12, size: 12, font: bold, color: GREEN });
    y -= 24;
    notes.forEach((n) => para(n, { size: 9, color: SOFT, bullet: true, after: 1 }));
  }
  if (cfg.signName || cfg.signTitle) {
    ensure(80);
    y -= 40;
    page.drawLine({ start: { x: M, y }, end: { x: M + 190, y }, thickness: 0.7, color: GREEN });
    y -= 6;
    if (cfg.signName) para(cfg.signName, { size: 10.5, font: bold, color: GREEN });
    if (cfg.signTitle) para(cfg.signTitle, { size: 9, color: SOFT });
  }

  if (cfg.showCompany) {
    const lines = (cfg.company || [site.name, site.address, site.phoneDisplay, site.emailGeneral].filter(Boolean).join('\n')).split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 6);
    if (lines.length) {
      ensure(20 + lines.length * 13);
      y -= 18;
      lines.forEach((l, i) => para(l, { size: i === 0 ? 10 : 8.5, font: i === 0 ? bold : reg, color: i === 0 ? GREEN : SOFT }));
    }
  }

  // footer on every page: a light green band with the company line and the website
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawRectangle({ x: 0, y: 0, width: W, height: FOOT, color: MINT });
    p.drawRectangle({ x: 0, y: FOOT, width: W, height: 1, color: LINE });
    flines.forEach((l, k) => p.drawText(l, { x: (W - reg.widthOfTextAtSize(l, 7.5)) / 2, y: FOOT - 15 - k * 11, size: 7.5, font: reg, color: SOFT }));
    p.drawText(host, { x: (W - bold.widthOfTextAtSize(host, 7.5)) / 2, y: 10, size: 7.5, font: bold, color: GREEN });
    if (pages.length > 1 && cfg.pageNumbers !== false) {
      const n = `Page ${i + 1} of ${pages.length}`;
      p.drawText(n, { x: W - M - reg.widthOfTextAtSize(n, 7.5), y: 10, size: 7.5, font: reg, color: SOFT });
    }
  });
  return doc.save();
}
