// Branded cover banners: the AI makes only the photo; the title, info cards, icons, feature bar,
// logo and colours are drawn here with the site's own fonts and theme, so every word is spelled
// right and every cover looks like the brand (layout after the admin's reference designs).
import path from 'path';
// Icon drawings from lucide (raw SVG nodes: react-dom/server may not be used inside the app)
import sharp, { type OverlayOptions } from 'sharp';
import { __iconNode as i_award } from 'lucide-react/dist/esm/icons/award.js';
import { __iconNode as i_badge } from 'lucide-react/dist/esm/icons/badge-check.js';
import { __iconNode as i_baby } from 'lucide-react/dist/esm/icons/baby.js';
import { __iconNode as i_money } from 'lucide-react/dist/esm/icons/banknote.js';
import { __iconNode as i_book } from 'lucide-react/dist/esm/icons/book-open.js';
import { __iconNode as i_briefcase } from 'lucide-react/dist/esm/icons/briefcase.js';
import { __iconNode as i_building } from 'lucide-react/dist/esm/icons/building-2.js';
import { __iconNode as i_calculator } from 'lucide-react/dist/esm/icons/calculator.js';
import { __iconNode as i_calendar } from 'lucide-react/dist/esm/icons/calendar-days.js';
import { __iconNode as i_check } from 'lucide-react/dist/esm/icons/circle-check.js';
import { __iconNode as i_checklist } from 'lucide-react/dist/esm/icons/clipboard-check.js';
import { __iconNode as i_clock } from 'lucide-react/dist/esm/icons/clock.js';
import { __iconNode as i_file_check } from 'lucide-react/dist/esm/icons/file-check.js';
import { __iconNode as i_document } from 'lucide-react/dist/esm/icons/file-text.js';
import { __iconNode as i_fingerprint } from 'lucide-react/dist/esm/icons/fingerprint.js';
import { __iconNode as i_gem } from 'lucide-react/dist/esm/icons/gem.js';
import { __iconNode as i_globe } from 'lucide-react/dist/esm/icons/globe.js';
import { __iconNode as i_graduation } from 'lucide-react/dist/esm/icons/graduation-cap.js';
import { __iconNode as i_investment } from 'lucide-react/dist/esm/icons/hand-coins.js';
import { __iconNode as i_handshake } from 'lucide-react/dist/esm/icons/handshake.js';
import { __iconNode as i_support } from 'lucide-react/dist/esm/icons/headset.js';
import { __iconNode as i_care } from 'lucide-react/dist/esm/icons/heart-handshake.js';
import { __iconNode as i_hourglass } from 'lucide-react/dist/esm/icons/hourglass.js';
import { __iconNode as i_home } from 'lucide-react/dist/esm/icons/house.js';
import { __iconNode as i_id_card } from 'lucide-react/dist/esm/icons/id-card.js';
import { __iconNode as i_key } from 'lucide-react/dist/esm/icons/key-round.js';
import { __iconNode as i_government } from 'lucide-react/dist/esm/icons/landmark.js';
import { __iconNode as i_idea } from 'lucide-react/dist/esm/icons/lightbulb.js';
import { __iconNode as i_luggage } from 'lucide-react/dist/esm/icons/luggage.js';
import { __iconNode as i_location } from 'lucide-react/dist/esm/icons/map-pin.js';
import { __iconNode as i_research } from 'lucide-react/dist/esm/icons/microscope.js';
import { __iconNode as i_plane } from 'lucide-react/dist/esm/icons/plane.js';
import { __iconNode as i_legal } from 'lucide-react/dist/esm/icons/scale.js';
import { __iconNode as i_school } from 'lucide-react/dist/esm/icons/school.js';
import { __iconNode as i_rules } from 'lucide-react/dist/esm/icons/scroll-text.js';
import { __iconNode as i_search } from 'lucide-react/dist/esm/icons/search.js';
import { __iconNode as i_shield } from 'lucide-react/dist/esm/icons/shield-check.js';
import { __iconNode as i_stamp } from 'lucide-react/dist/esm/icons/stamp.js';
import { __iconNode as i_talent } from 'lucide-react/dist/esm/icons/star.js';
import { __iconNode as i_medical } from 'lucide-react/dist/esm/icons/stethoscope.js';
import { __iconNode as i_sun } from 'lucide-react/dist/esm/icons/sun.js';
import { __iconNode as i_retire } from 'lucide-react/dist/esm/icons/tree-palm.js';
import { __iconNode as i_growth } from 'lucide-react/dist/esm/icons/trending-up.js';
import { __iconNode as i_verified } from 'lucide-react/dist/esm/icons/user-check.js';
import { __iconNode as i_family } from 'lucide-react/dist/esm/icons/users.js';

type IconNode = [string, Record<string, string>][];

/** Icons the cover writer may choose from (name → drawing) */
export const COVER_ICONS = {
  'award': i_award,
  'badge': i_badge,
  'baby': i_baby,
  'money': i_money,
  'book': i_book,
  'briefcase': i_briefcase,
  'building': i_building,
  'calculator': i_calculator,
  'calendar': i_calendar,
  'check': i_check,
  'checklist': i_checklist,
  'clock': i_clock,
  'file-check': i_file_check,
  'document': i_document,
  'fingerprint': i_fingerprint,
  'gem': i_gem,
  'globe': i_globe,
  'graduation': i_graduation,
  'investment': i_investment,
  'handshake': i_handshake,
  'support': i_support,
  'care': i_care,
  'hourglass': i_hourglass,
  'home': i_home,
  'id-card': i_id_card,
  'key': i_key,
  'government': i_government,
  'idea': i_idea,
  'luggage': i_luggage,
  'location': i_location,
  'research': i_research,
  'plane': i_plane,
  'legal': i_legal,
  'school': i_school,
  'rules': i_rules,
  'search': i_search,
  'shield': i_shield,
  'stamp': i_stamp,
  'talent': i_talent,
  'medical': i_medical,
  'sun': i_sun,
  'retire': i_retire,
  'growth': i_growth,
  'verified': i_verified,
  'family': i_family,
} as const;
export type CoverIcon = keyof typeof COVER_ICONS;
export const COVER_ICON_NAMES = Object.keys(COVER_ICONS) as CoverIcon[];

export type CoverText = {
  line1: string; // gold title line
  line2: string; // dark title line
  subtitle: string;
  cards: { label: string; icon: string }[]; // up to 4
  features: { label: string; icon: string }[]; // up to 4, bottom bar
};

export type CoverBrand = {
  colors: { gold: string; goldLight: string; ink: string; sand: string };
  logo?: Buffer | null; // full logo for the light area (top left)
  emblem?: Buffer | null; // round emblem for the ribbon
  ribbon: string; // e.g. GoldenVisaUAE.ai
};

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts');
const FONT = {
  display: { file: path.join(FONT_DIR, 'CormorantGaramond-Bold.ttf'), name: 'Cormorant Garamond Bold' },
  sans: { file: path.join(FONT_DIR, 'Inter-SemiBold.ttf'), name: 'Inter SemiBold' },
  sansMedium: { file: path.join(FONT_DIR, 'Inter-Medium.ttf'), name: 'Inter Medium' },
};

const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Mixes a hex colour with black (amount < 0) or white (amount > 0) */
export function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0xc9a24a;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount));
  return `#${ch.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`;
}

/** One line of text as a transparent PNG, shrunk until it fits maxWidth */
async function textImage(text: string, font: { file: string; name: string }, size: number, color: string, maxWidth: number, opts: { align?: 'left' | 'centre'; minSize?: number; spacing?: number; wrap?: boolean } = {}) {
  let s = size;
  const min = opts.minSize ?? Math.round(size * 0.55);
  for (;;) {
    const spacing = opts.spacing ? ` letter_spacing="${Math.round(opts.spacing * s * 1024)}"` : '';
    const buf = await sharp({
      text: {
        text: `<span foreground="${color}"${spacing}>${esc(text)}</span>`,
        font: `${font.name} ${s}`,
        fontfile: font.file,
        rgba: true,
        dpi: 72,
        align: opts.align === 'centre' ? 'centre' : 'left',
        ...(opts.wrap ? { width: Math.round(maxWidth), wrap: 'word' } : {}),
      },
    })
      .png()
      .toBuffer();
    const meta = await sharp(buf).metadata();
    if ((meta.width || 0) <= maxWidth || s <= min) {
      if ((meta.width || 0) > maxWidth) return { buf: await sharp(buf).resize({ width: Math.round(maxWidth) }).png().toBuffer(), width: Math.round(maxWidth), height: Math.round((meta.height || 0) * (maxWidth / (meta.width || 1))) };
      return { buf, width: meta.width || 0, height: meta.height || 0 };
    }
    s = Math.max(min, Math.round(s * 0.92));
  }
}

/** One icon as SVG markup (same drawing and stroke style as the website's lucide icons) */
export function iconSvg(name: string, size: number, color: string, stroke = 1.5): string {
  const node = (COVER_ICONS[(name as CoverIcon) in COVER_ICONS ? (name as CoverIcon) : 'check'] as unknown) as IconNode;
  const attr = (a: Record<string, string>) => Object.entries(a).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${esc(String(v))}"`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${node.map(([tag, a]) => `<${tag} ${attr(a)}/>`).join('')}</svg>`;
}

async function iconImage(name: string, size: number, color: string, stroke = 1.5): Promise<Buffer> {
  return sharp(Buffer.from(iconSvg(name, size, color, stroke)), { density: 300 }).resize(size, size).png().toBuffer();
}

const rr = (x: number, y: number, w: number, h: number, r: number) => `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${w - 2 * r}a${r},${r} 0 0 1 -${r},-${r}v-${h - 2 * r}a${r},${r} 0 0 1 ${r},-${r}z`;

/**
 * Composes a banner like the reference covers. Width/height in pixels (cover 1600×900, Open Graph 1200×630).
 * The photo fills the right side and fades into the light text area.
 */
export async function composeCover(photo: Buffer, text: CoverText, brand: CoverBrand, W = 1600, H = 900): Promise<Buffer> {
  const k = W / 1600;
  const px = (n: number) => Math.round(n * k);
  const { gold, ink, sand } = brand.colors;
  const goldDeep = shade(gold, -0.18);
  const barH = Math.round(H * 0.155);
  const bodyH = H - barH;
  const leftW = Math.round(W * 0.54);
  const pad = px(64);

  // background: sand, photo on the right half fading into the sand
  const photoW = Math.round(W * 0.58);
  const photoImg = await sharp(photo).resize(photoW, bodyH, { fit: 'cover', position: 'attention' }).toBuffer();
  const fade = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${photoW}" height="${bodyH}"><defs><linearGradient id="f" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${sand}" stop-opacity="1"/><stop offset=".26" stop-color="${sand}" stop-opacity=".85"/><stop offset=".5" stop-color="${sand}" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#f)"/></svg>`,
  );
  const layers: OverlayOptions[] = [
    { input: photoImg, left: W - photoW, top: 0 },
    { input: fade, left: W - photoW, top: 0 },
  ];

  // logo (top left)
  let y = px(44);
  if (brand.logo) {
    const logo = await sharp(brand.logo).resize({ height: px(54), fit: 'inside' }).png().toBuffer();
    layers.push({ input: logo, left: pad, top: y });
    y += px(54) + px(26);
  } else y += px(16);

  // title: gold line + dark line, divider with a diamond, subtitle
  const titleMax = leftW - pad - px(20);
  const l1 = await textImage(text.line1, FONT.display, px(112), goldDeep, titleMax, { minSize: px(60) });
  layers.push({ input: l1.buf, left: pad, top: y });
  y += Math.round(l1.height * 1.02);
  if (text.line2) {
    const l2 = await textImage(text.line2, FONT.display, px(112), ink, titleMax, { minSize: px(60) });
    layers.push({ input: l2.buf, left: pad, top: y });
    y += Math.round(l2.height * 1.0);
  }
  y += px(14);
  const lineW = Math.min(titleMax, px(600));
  layers.push({
    input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lineW}" height="${px(14)}"><rect x="0" y="${px(6)}" width="${lineW}" height="${Math.max(1, px(2))}" fill="${gold}"/><rect x="${lineW / 2 - px(6)}" y="${px(1)}" width="${px(12)}" height="${px(12)}" fill="${sand}" stroke="${gold}" stroke-width="${Math.max(1, px(2))}" transform="rotate(45 ${lineW / 2} ${px(7)})"/></svg>`),
    left: pad,
    top: y,
  });
  y += px(30);
  if (text.subtitle) {
    const st = await textImage(text.subtitle, FONT.sansMedium, px(36), shade(ink, 0.25), titleMax, { minSize: px(24) });
    layers.push({ input: st.buf, left: pad, top: y });
    y += st.height + px(26);
  }

  // info cards
  const cards = text.cards.slice(0, 4);
  if (cards.length) {
    const gap = px(18);
    const cardsTop = Math.max(y, Math.round(bodyH * 0.5));
    const cardH = Math.max(px(150), bodyH - cardsTop - px(36));
    const cardW = Math.round((leftW - pad - gap * (cards.length - 1)) / cards.length);
    const stripH = Math.round(cardH * 0.3);
    for (let i = 0; i < cards.length; i++) {
      const x = pad + i * (cardW + gap);
      const stripColor = i % 2 ? gold : ink;
      const r = px(16);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cardW + px(24)}" height="${cardH + px(30)}"><defs><filter id="s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="${px(8)}" stdDeviation="${px(9)}" flood-color="#000" flood-opacity=".14"/></filter><clipPath id="c"><path d="${rr(px(12), px(6), cardW, cardH, r)}"/></clipPath></defs><path d="${rr(px(12), px(6), cardW, cardH, r)}" fill="#fff" filter="url(#s)"/><rect x="${px(12)}" y="${px(6) + cardH - stripH}" width="${cardW}" height="${stripH}" fill="${stripColor}" clip-path="url(#c)"/><path d="${rr(px(12), px(6), cardW, cardH, r)}" fill="none" stroke="${shade(gold, 0.55)}" stroke-width="${Math.max(1, px(1.5))}"/><circle cx="${px(12) + cardW / 2}" cy="${px(6) + cardH - stripH / 2}" r="${stripH * 0.3}" fill="none" stroke="${i % 2 ? ink : gold}" stroke-width="${Math.max(1, px(2))}"/></svg>`;
      layers.push({ input: Buffer.from(svg), left: x - px(12), top: cardsTop - px(6) });
      // icon + label centred together in the white part of the card
      const iconSize = Math.round(Math.min(cardW * 0.42, (cardH - stripH) * 0.42));
      const ic = await iconImage(cards[i].icon, iconSize, goldDeep, 1.4);
      const lab = await textImage(cards[i].label, FONT.sans, px(25), ink, cardW - px(18), { align: 'centre', minSize: px(16) });
      const blockH = iconSize + px(12) + lab.height;
      const blockTop = cardsTop + Math.max(px(10), Math.round((cardH - stripH - blockH) / 2));
      layers.push({ input: ic, left: Math.round(x + cardW / 2 - iconSize / 2), top: blockTop });
      layers.push({ input: lab.buf, left: Math.round(x + cardW / 2 - lab.width / 2), top: blockTop + iconSize + px(12) });
      const small = await iconImage(cards[i].icon, Math.round(stripH * 0.32), i % 2 ? ink : gold, 1.8);
      layers.push({ input: small, left: Math.round(x + cardW / 2 - stripH * 0.16), top: cardsTop + cardH - stripH + Math.round(stripH * 0.34) });
    }
  }

  // bottom bar: features + gold ribbon with emblem and address
  const ribbonW = Math.round(W * 0.27);
  layers.push({
    input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${barH}"><rect width="${W}" height="${barH}" fill="${ink}"/><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${shade(gold, 0.18)}"/><stop offset="1" stop-color="${goldDeep}"/></linearGradient></defs><path d="M${W - ribbonW},0 H${W} V${barH} H${W - ribbonW} L${W - ribbonW + px(34)},${barH / 2} Z" fill="url(#g)"/></svg>`),
    left: 0,
    top: bodyH,
  });
  const feats = text.features.slice(0, 4);
  if (feats.length) {
    const areaW = W - ribbonW - pad;
    const slot = Math.round(areaW / feats.length);
    for (let i = 0; i < feats.length; i++) {
      const x = pad + i * slot;
      const iconSize = Math.round(barH * 0.38);
      const ic = await iconImage(feats[i].icon, iconSize, gold, 1.6);
      layers.push({ input: ic, left: x, top: bodyH + Math.round((barH - iconSize) / 2) });
      const lab = await textImage(feats[i].label.toUpperCase(), FONT.sansMedium, px(22), '#FFFFFF', slot - iconSize - px(46), { minSize: px(14), wrap: true, spacing: 0.04 });
      layers.push({ input: lab.buf, left: x + iconSize + px(16), top: bodyH + Math.round((barH - lab.height) / 2) });
      if (i > 0) layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2" height="${Math.round(barH * 0.5)}"><rect width="2" height="100%" fill="${gold}" opacity=".45"/></svg>`), left: x - px(20), top: bodyH + Math.round(barH * 0.25) });
    }
  }
  let rx = W - ribbonW + px(58);
  if (brand.emblem) {
    const em = await sharp(brand.emblem).resize({ height: Math.round(barH * 0.62), fit: 'inside' }).png().toBuffer();
    const emMeta = await sharp(em).metadata();
    layers.push({ input: em, left: rx, top: bodyH + Math.round(barH * 0.19) });
    rx += (emMeta.width || 0) + px(14);
  }
  if (brand.ribbon) {
    const rb = await textImage(brand.ribbon, FONT.display, px(44), ink, W - rx - px(24), { minSize: px(22) });
    layers.push({ input: rb.buf, left: rx, top: bodyH + Math.round((barH - rb.height) / 2) });
  }

  return sharp({ create: { width: W, height: H, channels: 3, background: sand } }).composite(layers).webp({ quality: 86 }).toBuffer();
}

/** Small logo in the corner of a photo (used when the cover style is "photo" and for inline pictures) */
export async function watermark(photo: Buffer, emblem: Buffer, opts: { size?: number } = {}): Promise<Buffer> {
  const meta = await sharp(photo).metadata();
  const w = meta.width || 1600;
  const size = opts.size || Math.round(w * 0.06);
  const em = await sharp(emblem).resize(size, size, { fit: 'inside' }).ensureAlpha(0.9).png().toBuffer();
  return sharp(photo).composite([{ input: em, left: w - size - Math.round(w * 0.025), top: (meta.height || 900) - size - Math.round(w * 0.025) }]).toBuffer();
}
