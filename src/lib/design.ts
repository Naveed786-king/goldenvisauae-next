// Design system: global look (fonts, glass, buttons, header, footer) and per-section styles.
// Everything here is edited in Admin → Design and Admin → Pages → section → "Design" tab,
// and turned into safe, scoped CSS on the server.

export type FontChoice = { name: string; family: string; google?: string; arabic?: boolean };

/** Fonts admins can pick. Bundled ones load instantly; others load from Google Fonts. */
export const FONTS: FontChoice[] = [
  { name: 'Apple system (SF Pro) — recommended', family: 'system' },
  { name: 'Inter (clear modern sans)', family: 'Inter Variable' },
  { name: 'Playfair Display', family: 'Playfair Display', google: 'Playfair+Display:wght@400;500;600;700;800' },
  { name: 'Cinzel (classic capitals)', family: 'Cinzel', google: 'Cinzel:wght@400;500;600;700' },
  { name: 'Marcellus', family: 'Marcellus', google: 'Marcellus' },
  { name: 'Bodoni Moda', family: 'Bodoni Moda', google: 'Bodoni+Moda:wght@400;500;600;700' },
  { name: 'Lora', family: 'Lora', google: 'Lora:wght@400;500;600;700' },
  { name: 'Poppins', family: 'Poppins', google: 'Poppins:wght@300;400;500;600;700;800' },
  { name: 'Montserrat', family: 'Montserrat', google: 'Montserrat:wght@300;400;500;600;700;800' },
  { name: 'Inter', family: 'Inter', google: 'Inter:wght@300;400;500;600;700;800' },
  { name: 'Outfit', family: 'Outfit', google: 'Outfit:wght@300;400;500;600;700;800' },
  { name: 'Plus Jakarta Sans', family: 'Plus Jakarta Sans', google: 'Plus+Jakarta+Sans:wght@300;400;500;600;700;800' },
  { name: 'Lato', family: 'Lato', google: 'Lato:wght@300;400;700;900' },
  { name: 'Noto Kufi Arabic', family: 'Noto Kufi Arabic', arabic: true },
  { name: 'Tajawal (Arabic)', family: 'Tajawal', google: 'Tajawal:wght@300;400;500;700;800', arabic: true },
  { name: 'Cairo (Arabic)', family: 'Cairo', google: 'Cairo:wght@300;400;500;600;700;800', arabic: true },
  { name: 'Almarai (Arabic)', family: 'Almarai', google: 'Almarai:wght@300;400;700;800', arabic: true },
  { name: 'IBM Plex Sans Arabic', family: 'IBM Plex Sans Arabic', google: 'IBM+Plex+Sans+Arabic:wght@300;400;500;600;700', arabic: true },
];
const FONT_BY_FAMILY = new Map(FONTS.map((f) => [f.family, f]));

export type DesignSettings = {
  fonts: { heading: string; body: string; arabic: string; headingWeight: number; baseSize: number };
  radius: { card: number; button: number };
  buttons: { style: 'gradient' | 'solid' | 'outline' | 'glass'; uppercase: boolean };
  glass: { enabled: boolean; blur: number; opacity: number; border: number; orbs: boolean };
  animation: { enabled: boolean; style: string; duration: number };
  header: {
    style: 'glass' | 'solid' | 'transparent';
    bg: string;
    opacity: number;
    blur: number;
    text: string;
    height: number;
    logoHeight: number;
    sticky: boolean;
    shrink: boolean;
    glow: boolean;
    topbarBg: string;
    topbarText: string;
    menuSize: number;
    menuUppercase: boolean;
  };
  footer: { style: 'dark' | 'glass' | 'light'; bg: string; text: string; heading: string; bgImage: string; logoHeight: number; watermark: boolean };
  customCss: string;
};

export const defaultDesign: DesignSettings = {
  fonts: { heading: 'system', body: 'system', arabic: 'Noto Kufi Arabic', headingWeight: 600, baseSize: 16 },
  radius: { card: 26, button: 999 },
  buttons: { style: 'gradient', uppercase: false },
  glass: { enabled: true, blur: 18, opacity: 10, border: 18, orbs: true },
  animation: { enabled: true, style: 'none', duration: 800 },
  header: {
    style: 'glass',
    bg: '#FFFFFF',
    opacity: 72,
    blur: 22,
    text: '#1D1D1F',
    height: 64,
    logoHeight: 36,
    sticky: true,
    shrink: true,
    glow: true,
    topbarBg: '#FFFFFF',
    topbarText: '#3A3A3C',
    menuSize: 14.5,
    menuUppercase: false,
  },
  footer: { style: 'light', bg: '#FAFAFA', text: '', heading: '', bgImage: '', logoHeight: 40, watermark: false },
  customCss: '',
};

/* ------------------------------------------------------------------ sanitizers */
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/deg]+\)|[a-z]{3,20})$/i;
export const col = (v: any) => (typeof v === 'string' && COLOR.test(v.trim()) ? v.trim() : '');
const num = (v: any, min: number, max: number) => {
  const n = Number(v);
  return v === '' || v === null || v === undefined || Number.isNaN(n) ? null : Math.min(max, Math.max(min, n));
};
const url = (v: any) => (typeof v === 'string' && v ? v.replace(/["'()\\\s<>]/g, (c) => encodeURIComponent(c)) : '');
const fam = (v: any) => {
  const f = FONT_BY_FAMILY.get(String(v || ''));
  if (!f) return '';
  return f.family === 'system' ? 'var(--font-sf)' : `'${f.family}'`;
};
const cssText = (v: any) => String(v || '').replace(/<\/?style/gi, '');

/** rgba() from #hex + opacity percentage */
export function alpha(hex: string, pct: number) {
  const h = col(hex);
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h);
  if (!m) return h || 'transparent';
  let x = m[1];
  if (x.length === 3) x = x.split('').map((c) => c + c).join('');
  const n = parseInt(x, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(100, pct)) / 100})`;
}

/** Google Fonts stylesheet URL for the fonts in use ('' if none needed) */
export function googleFontsUrl(families: (string | undefined)[]) {
  const specs = Array.from(new Set(families.filter(Boolean) as string[]))
    .map((f) => FONT_BY_FAMILY.get(f)?.google)
    .filter(Boolean);
  return specs.length ? `https://fonts.googleapis.com/css2?${specs.map((s) => 'family=' + s).join('&')}&display=swap` : '';
}

/* ------------------------------------------------------------------ global css */
export function designCss(d: DesignSettings) {
  const h = d.header;
  const f = d.footer;
  const out: string[] = [];
  const root: string[] = [];
  if (fam(d.fonts.heading)) root.push(`--font-cormorant:${fam(d.fonts.heading)}`);
  if (fam(d.fonts.body)) root.push(`--font-manrope:${fam(d.fonts.body)}`);
  if (fam(d.fonts.arabic)) root.push(`--font-kufi:${fam(d.fonts.arabic)}`);
  root.push(`--radius-card:${num(d.radius.card, 0, 48) ?? 28}px`, `--radius-btn:${num(d.radius.button, 0, 999) ?? 999}px`);
  root.push(`--glass-blur:${num(d.glass.blur, 0, 40) ?? 18}px`, `--glass-o:${(num(d.glass.opacity, 0, 60) ?? 10) / 100}`, `--glass-b:${(num(d.glass.border, 0, 60) ?? 18) / 100}`);
  root.push(`--anim-dur:${num(d.animation.duration, 150, 3000) ?? 800}ms`);
  root.push(`--hdr-bg:${h.style === 'solid' ? col(h.bg) || '#FFFFFF' : alpha(h.bg || '#FFFFFF', num(h.opacity, 0, 100) ?? 72)}`);
  // Glass header: frosted but never see-through, whatever opacity is saved (floor 86%)
  root.push(`--hdr-glass:${h.style === 'solid' ? col(h.bg) || '#FFFFFF' : alpha(h.bg || '#FFFFFF', Math.max(55, num(h.opacity, 0, 100) ?? 72))}`);
  root.push(`--hdr-bg-solid:${col(h.bg) || '#FFFFFF'}`, `--hdr-blur:${num(h.blur, 0, 40) ?? 20}px`, `--hdr-text:${col(h.text) || '#1D1D1F'}`);
  root.push(`--hdr-h:${num(h.height, 52, 140) ?? 64}px`, `--logo-h:${num(h.logoHeight, 20, 120) ?? 40}px`);
  root.push(`--top-bg:${col(h.topbarBg) || '#FFFFFF'}`, `--top-text:${col(h.topbarText) || '#3A3A3C'}`, `--menu-size:${num(h.menuSize, 11, 22) ?? 14.5}px`);
  root.push(`--ftr-bg:${col(f.bg) || '#FAFAFA'}`, `--ftr-text:${col(f.text) || '#48484A'}`, `--ftr-head:${col(f.heading) || 'var(--brand-gold)'}`, `--ftr-logo-h:${num(f.logoHeight, 20, 140) ?? 48}px`);
  out.push(`:root{${root.join(';')}}`);
  const bs = num(d.fonts.baseSize, 13, 20);
  if (bs && bs !== 16) out.push(`html{font-size:${bs}px}`);
  const hw = num(d.fonts.headingWeight, 300, 900);
  if (hw) out.push(`.font-display,h1.font-display,h2.font-display{font-weight:${hw}}`);
  if (h.menuUppercase) out.push(`.site-nav a{text-transform:uppercase;letter-spacing:.06em}`);
  if (d.buttons.uppercase) out.push(`.btn{text-transform:uppercase;letter-spacing:.08em}`);
  if (d.customCss) out.push(cssText(d.customCss));
  return out.join('\n');
}

/** Classes for <body> that switch global design modes */
export function designBodyClass(d: DesignSettings) {
  return [
    d.glass.enabled ? 'glass-ui' : '',
    d.glass.enabled && d.glass.orbs ? 'glass-orbs' : '',
    `bs-${d.buttons.style || 'gradient'}`,
    d.animation.enabled ? `anim-${d.animation.style || 'fade-up'}` : 'anim-off',
    `hdr-${d.header.style || 'glass'}`,
    d.header.sticky === false ? 'hdr-static' : '',
    d.header.shrink === false ? 'hdr-noshrink' : '',
    d.header.glow ? 'hdr-glow' : '',
    `ftr-${d.footer.style || 'dark'}`,
    d.footer.watermark ? 'ftr-mark' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/* ------------------------------------------------------------------ section css */
export type BlockStyle = Record<string, any>;

/** CSS for one page section. `id` = block id. Returns '' when nothing is customised. */
export function blockCss(id: string, s: BlockStyle | undefined) {
  if (!s || typeof s !== 'object') return '';
  const sel = `#b-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const root = `${sel}>:first-child`;
  const r: string[] = [];
  const rootDecl: string[] = [];

  // background
  const c1 = col(s.bgColor);
  const c2 = col(s.bgColor2);
  const ov = num(s.overlay, 0, 95);
  const ovc = col(s.overlayColor) || '#0B0B0C';
  if (s.bgType === 'color' && c1) rootDecl.push(`background:${c1} !important`);
  if (s.bgType === 'gradient' && c1) rootDecl.push(`background:linear-gradient(${num(s.bgAngle, 0, 360) ?? 135}deg,${c1},${c2 || c1}) !important`);
  if (s.bgType === 'image' && s.bgImage) {
    const layer = ov ? `linear-gradient(${alpha(ovc, ov)},${alpha(ovc, ov)}),` : '';
    rootDecl.push(`background:${layer}url("${url(s.bgImage)}") center/cover no-repeat ${s.parallax ? 'fixed' : 'scroll'} !important`);
  }
  // text
  const tc = col(s.textColor);
  if (tc) {
    rootDecl.push(`color:${tc}`);
    r.push(`${root} :is(p,li,td,th,.rte,label,small){color:${tc} !important}`);
  }
  const hc = col(s.headingColor);
  if (hc) r.push(`${root} :is(h1,h2,h3,h4){color:${hc} !important}`);
  const ac = col(s.accentColor);
  if (ac) r.push(`${sel}{--brand-gold:${ac};--brand-gold-light:color-mix(in oklab,${ac} 55%,white)}`);
  if (fam(s.headingFont)) r.push(`${root} :is(h1,h2,h3,h4,.font-display){font-family:${fam(s.headingFont)},serif !important}`);
  if (fam(s.bodyFont)) rootDecl.push(`font-family:${fam(s.bodyFont)},sans-serif`);
  const hs = num(s.headingSize, 20, 110);
  if (hs) r.push(`${root} :is(h1,h2){font-size:clamp(${Math.min(hs, 30)}px,${(hs / 14).toFixed(2)}vw + 12px,${hs}px) !important}`);
  const ts = num(s.textSize, 11, 26);
  if (ts) r.push(`${root} :is(p,li){font-size:${ts}px}`);
  if (['left', 'center', 'right'].includes(s.align)) r.push(`${root} .container-x{text-align:${s.align}}`);
  // spacing
  const pt = num(s.paddingTop, 0, 320);
  const pb = num(s.paddingBottom, 0, 320);
  if (pt !== null) rootDecl.push(`padding-top:${pt}px !important`);
  if (pb !== null) rootDecl.push(`padding-bottom:${pb}px !important`);
  if (pt !== null || pb !== null)
    r.push(`@media (max-width:767px){${root}{${pt !== null ? `padding-top:${Math.round(pt * 0.65)}px !important;` : ''}${pb !== null ? `padding-bottom:${Math.round(pb * 0.65)}px !important` : ''}}}`);
  const mt = num(s.marginTop, -200, 300);
  const mb = num(s.marginBottom, -200, 300);
  if (mt !== null || mb !== null) r.push(`${sel}{${mt !== null ? `margin-top:${mt}px;` : ''}${mb !== null ? `margin-bottom:${mb}px;` : ''}position:relative}`);
  const mw = num(s.maxWidth, 480, 1800);
  if (mw) r.push(`${root} .container-x{max-width:${mw}px}`);
  // section frame
  const sr = num(s.sectionRadius, 0, 80);
  if (sr) {
    rootDecl.push(`border-radius:${sr}px;overflow:hidden`);
    r.push(`${sel}{padding-inline:clamp(8px,2vw,24px)}`);
  }
  if (s.goldLine) r.push(`${root}{border-top:1px solid color-mix(in oklab,var(--brand-gold) 55%,transparent)}`);
  if (s.panel === 'glass' || s.panel === 'card') {
    r.push(
      `${root}>.container-x{padding:clamp(24px,4vw,56px);border-radius:var(--radius-card,28px);${
        s.panel === 'glass'
          ? 'background:rgba(255,255,255,.6);backdrop-filter:blur(var(--glass-blur,18px)) saturate(160%);-webkit-backdrop-filter:blur(var(--glass-blur,18px)) saturate(160%);border:1px solid rgba(255,255,255,.7);box-shadow:0 30px 80px -40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.8)'
          : 'background:#fff;color:#1d1d1f;box-shadow:0 30px 80px -40px rgba(0,0,0,.3)'
      }}`
    );
  }
  // boxes / cards
  const box = `${root} :is(.box,.card,.card-lift)`;
  const bd: string[] = [];
  const after: string[] = [];
  const blur = num(s.glassBlur, 0, 40);
  switch (s.boxStyle) {
    case 'glass':
      bd.push(
        `background:rgba(255,255,255,.55) !important`,
        `backdrop-filter:blur(${blur ?? 18}px) saturate(170%)`,
        `-webkit-backdrop-filter:blur(${blur ?? 18}px) saturate(170%)`,
        `border:1px solid rgba(255,255,255,.35) !important`,
        `box-shadow:0 20px 50px -25px rgba(10,18,34,.45),inset 0 1px 0 rgba(255,255,255,.45) !important`
      );
      after.push(`${sel} .theme-dark :is(.box,.card-lift){background:rgba(255,255,255,.07) !important;border-color:rgba(255,255,255,.16) !important}`);
      break;
    case 'glass-dark':
      bd.push(`background:rgba(10,18,34,.55) !important`, `color:#fff`, `backdrop-filter:blur(${blur ?? 18}px)`, `-webkit-backdrop-filter:blur(${blur ?? 18}px)`, `border:1px solid rgba(255,255,255,.14) !important`);
      r.push(`${box} :is(h3,h4,p,li,span){color:inherit}`);
      break;
    case 'solid':
      bd.push(`background:${col(s.boxBg) || '#fff'} !important`, `box-shadow:none !important`, `border:0 !important`);
      break;
    case 'outline':
      bd.push(`background:transparent !important`, `box-shadow:none !important`, `border:1.5px solid ${col(s.boxBorder) || 'color-mix(in oklab,var(--brand-gold) 60%,transparent)'} !important`);
      break;
    case 'elevated':
      bd.push(`box-shadow:0 40px 80px -35px rgba(10,18,34,.55) !important`, `border:0 !important`);
      break;
    case 'gradient-border':
      bd.push(
        `border:1.5px solid transparent !important`,
        `background:linear-gradient(${col(s.boxBg) || '#fff'},${col(s.boxBg) || '#fff'}) padding-box,linear-gradient(135deg,var(--brand-gold-light),var(--brand-gold),transparent 70%) border-box !important`
      );
      break;
    case 'flat':
      bd.push(`background:transparent !important`, `box-shadow:none !important`, `border:0 !important`, `padding-inline:0 !important`);
      break;
  }
  if (s.boxStyle !== 'solid' && s.boxStyle !== 'gradient-border' && col(s.boxBg)) bd.push(`background:${col(s.boxBg)} !important`);
  if (s.boxStyle !== 'outline' && col(s.boxBorder)) bd.push(`border:1px solid ${col(s.boxBorder)} !important`);
  const br = num(s.boxRadius, 0, 60);
  if (br !== null) bd.push(`border-radius:${br}px !important`);
  if (bd.length) r.push(`${box}{${bd.join(';')}}`);
  r.push(...after);
  switch (s.hover) {
    case 'lift':
      r.push(`${box}:hover{transform:translateY(-8px)}`);
      break;
    case 'glow':
      r.push(`${box}:hover{box-shadow:0 0 0 1px var(--brand-gold),0 25px 60px -20px color-mix(in oklab,var(--brand-gold) 70%,transparent) !important}`);
      break;
    case 'scale':
      r.push(`${box}:hover{transform:scale(1.03)}`);
      break;
    case 'tilt':
      r.push(`${box}:hover{transform:perspective(900px) rotateX(4deg) rotateY(-4deg) translateY(-4px)}`);
      break;
    case 'none':
      r.push(`${box}:hover{transform:none}`);
      break;
  }
  // animation timing
  const ad = num(s.animDuration, 100, 4000);
  const dl = num(s.animDelay, 0, 3000);
  if (ad !== null || dl !== null) r.push(`${sel}{${ad !== null ? `--anim-dur:${ad}ms;` : ''}${dl !== null ? `--anim-delay:${dl}ms` : ''}}`);
  // visibility
  if (s.hideMobile) r.push(`@media (max-width:767px){${sel}{display:none}}`);
  if (s.hideDesktop) r.push(`@media (min-width:768px){${sel}{display:none}}`);
  if (s.customCss) r.push(cssText(s.customCss).replace(/&/g, sel));

  if (rootDecl.length) r.unshift(`${root}{${rootDecl.join(';')}}`);
  return r.join('\n');
}

/** Fonts used by section styles (to load from Google) */
export function blockFonts(blocks: { data?: any }[]) {
  const out: string[] = [];
  for (const b of blocks) {
    const s = b?.data?.style;
    if (s?.headingFont) out.push(s.headingFont);
    if (s?.bodyFont) out.push(s.bodyFont);
  }
  return out;
}
