// Quotation and payment receipt PDFs (A4), in the site's gold style. Texts come from Admin → Client messages & PDFs.
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
  const GOLD = /^#[0-9a-f]{6}$/i.test(cfg.accent) ? hexRgb(cfg.accent) : rgb(0.72, 0.56, 0.12);
  const INK = rgb(0.06, 0.07, 0.1);
  const SOFT = rgb(0.4, 0.36, 0.26);
  const LINE = rgb(0.9, 0.85, 0.7);
  const CREAM = rgb(0.99, 0.97, 0.93);
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

  const footer = t(cfg.footer.trim() || [site.name, site.address, site.phoneDisplay, site.emailGeneral].filter(Boolean).join('  |  '), 400);
  const flines = wrap(footer, reg, 7.5, CW).slice(0, 4);
  const FOOT = 30 + flines.length * 11;
  const BOTTOM = FOOT + 18;

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const ensure = (need: number) => {
    if (y - need < BOTTOM) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
  };
  const para = (s: string, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; after?: number; bullet?: boolean } = {}) => {
    const size = o.size ?? 10;
    const font = o.font ?? reg;
    const lh = size * 1.5;
    const indent = o.bullet ? 12 : 0;
    wrap(t(s, 1200), font, size, CW - indent).forEach((l, i) => {
      ensure(lh);
      if (i === 0 && o.bullet) page.drawText('-', { x: M, y: y - size, size, font: bold, color: GOLD });
      page.drawText(l, { x: M + indent, y: y - size, size, font, color: o.color ?? INK });
      y -= lh;
    });
    y -= o.after ?? 0;
  };

  // header: logo left, document label right
  const png = cfg.showLogo === false ? null : await logoPng(site.logo);
  let logoH = 0;
  if (png) {
    const img = await doc.embedPng(png);
    logoH = 42;
    page.drawImage(img, { x: M, y: y - logoH, width: (img.width / img.height) * logoH, height: logoH });
  } else {
    page.drawText(t(site.name), { x: M, y: y - 20, size: 16, font: bold, color: INK });
  }
  const label = t((d.kind === 'quote' ? cfg.quoteLabel : cfg.receiptLabel) || (d.kind === 'quote' ? 'QUOTATION' : 'PAYMENT RECEIPT'), 40).toUpperCase();
  const lw = bold.widthOfTextAtSize(label, 9.5) + 24;
  page.drawRectangle({ x: W - M - lw, y: y - 22, width: lw, height: 22, color: INK });
  page.drawText(label, { x: W - M - lw + 12, y: y - 15, size: 9.5, font: bold, color: rgb(0.95, 0.84, 0.48) });
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  if (cfg.showDate !== false) page.drawText(date, { x: W - M - reg.widthOfTextAtSize(date, 9), y: y - 38, size: 9, font: reg, color: SOFT });
  y -= Math.max(logoH, 44) + 14;
  page.drawRectangle({ x: M, y, width: CW, height: 1.6, color: GOLD });
  y -= 26;

  para(title, { size: 22, font: serif, after: 8 });

  // client box
  const facts: [string, string][] = [['Prepared for', d.name], ['Reference', d.ref], ...(d.facts || [])];
  const rowH = 30;
  const boxH = 16 + Math.ceil(facts.length / 2) * rowH;
  ensure(boxH + 10);
  page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: CREAM, borderColor: LINE, borderWidth: 0.8 });
  facts.forEach(([k, v], i) => {
    const cx = M + 14 + (i % 2) * (CW / 2);
    const cy = y - 12 - Math.floor(i / 2) * rowH;
    page.drawText(t(k.toUpperCase()), { x: cx, y: cy - 8, size: 7.5, font: bold, color: SOFT });
    page.drawText(wrap(t(v), bold, 10.5, CW / 2 - 24)[0] ?? '', { x: cx, y: cy - 22, size: 10.5, font: bold, color: INK });
  });
  y -= boxH + 14;
  if (d.desc) para(d.desc, { color: SOFT, after: 4 });
  if (d.kind === 'quote' && cfg.intro) cfg.intro.split('\n').forEach((l) => l.trim() && para(l, { after: 2 }));
  y -= 8;

  // table
  const head = () => {
    ensure(54);
    page.drawRectangle({ x: M, y: y - 24, width: CW, height: 24, color: INK });
    page.drawText(d.kind === 'receipt' ? 'DETAILS' : 'ITEM', { x: M + 12, y: y - 16, size: 8.5, font: bold, color: WHITE });
    page.drawText('AMOUNT', { x: W - M - 12 - bold.widthOfTextAtSize('AMOUNT', 8.5), y: y - 16, size: 8.5, font: bold, color: rgb(0.95, 0.84, 0.48) });
    y -= 24;
  };
  head();
  d.lines.slice(0, 80).forEach(([label, amount], i) => {
    const ls = wrap(t(label), reg, 10, CW - 150);
    const rh = 12 + ls.length * 14;
    if (y - rh < BOTTOM) {
      page = doc.addPage([W, H]);
      y = H - M;
      head();
    }
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - rh, width: CW, height: rh, color: CREAM });
    ls.forEach((l, k) => page.drawText(l, { x: M + 12, y: y - 16 - k * 14, size: 10, font: reg, color: INK }));
    const a = t(amount, 40);
    page.drawText(a, { x: W - M - 12 - reg.widthOfTextAtSize(a, 10), y: y - 16, size: 10, font: reg, color: INK });
    y -= rh;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: LINE });
  });

  // total
  ensure(64);
  y -= 12;
  page.drawRectangle({ x: M, y: y - 44, width: CW, height: 44, color: rgb(0.98, 0.95, 0.87), borderColor: GOLD, borderWidth: 1 });
  page.drawText(t(d.totalLabel), { x: M + 14, y: y - 27, size: 11.5, font: bold, color: INK });
  const tt = t(d.total);
  page.drawText(tt, { x: W - M - 14 - bold.widthOfTextAtSize(tt, 16), y: y - 28, size: 16, font: bold, color: INK });
  y -= 60;

  const notes = [...(d.notes || []), ...(d.kind === 'quote' && cfg.notes ? cfg.notes.split('\n') : [])].map((s) => s.trim()).filter(Boolean);
  if (notes.length) {
    ensure(40);
    page.drawRectangle({ x: M, y: y - 13, width: 3, height: 14, color: GOLD });
    page.drawText('Notes', { x: M + 10, y: y - 12, size: 12, font: bold, color: INK });
    y -= 24;
    notes.forEach((n) => para(n, { size: 9, color: SOFT, bullet: true, after: 1 }));
  }
  if (cfg.signName || cfg.signTitle) {
    ensure(80);
    y -= 40;
    page.drawLine({ start: { x: M, y }, end: { x: M + 190, y }, thickness: 0.7, color: INK });
    y -= 6;
    if (cfg.signName) para(cfg.signName, { size: 10.5, font: bold });
    if (cfg.signTitle) para(cfg.signTitle, { size: 9, color: SOFT });
  }

  if (cfg.showCompany) {
    const lines = (cfg.company || [site.name, site.address, site.phoneDisplay, site.emailGeneral].filter(Boolean).join('\n')).split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 6);
    if (lines.length) {
      ensure(20 + lines.length * 13);
      y -= 18;
      lines.forEach((l, i) => para(l, { size: i === 0 ? 10 : 8.5, font: i === 0 ? bold : reg, color: i === 0 ? INK : SOFT }));
    }
  }

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const top = FOOT - 6;
    p.drawLine({ start: { x: M, y: top }, end: { x: W - M, y: top }, thickness: 0.6, color: LINE });
    flines.forEach((l, k) => p.drawText(l, { x: (W - reg.widthOfTextAtSize(l, 7.5)) / 2, y: top - 14 - k * 11, size: 7.5, font: reg, color: SOFT }));
    if (pages.length > 1 && cfg.pageNumbers !== false) {
      const n = `Page ${i + 1} of ${pages.length}`;
      p.drawText(n, { x: W - M - reg.widthOfTextAtSize(n, 7.5), y: top + 6, size: 7.5, font: reg, color: SOFT });
    }
  });
  return doc.save();
}
