import { SITE } from '@/adgv/lib/site';
const PATHS: Record<string, string> = {
  home: 'M4 21V9l8-6 8 6v12M9 21v-6h6v6',
  briefcase: 'M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18',
  rocket: 'M12 3c3 2 5 5 5 9l-2 4H9l-2-4c0-4 2-7 5-9zM9 16l-2 4M15 16l2 4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
  family: 'M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 20c0-3.5 2.7-6 6-6s6 2.5 6 6M14 20c0-2.6 1.6-4.5 3.5-4.5S21 17.4 21 20',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6zM9 12l2 2 4-4',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18',
  verify: 'M9 3h6v3H9zM7 4.5H5V21h14V4.5h-2M8.5 12.5l2 2 4-4M8.5 17.5h7',
  gift: 'M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8C10.5 4.5 8.6 3.4 7.4 4.2 6 5.1 7 8 12 8zM12 8c1.5-3.5 3.4-4.6 4.6-3.8C18 5.1 17 8 12 8z',
  cash: 'M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5.5 9v6M18.5 9v6',
  coins: 'M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM15 21a6 6 0 1 0 0-12',
  calc: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01',
  check: 'M5 12l5 5L19 7',
  doc: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 14l2 2 4-4',
  // Chat on WhatsApp: a clean message bubble (our own icon, matching the site's line icons).
  wa: 'M5 4h14a2.5 2.5 0 0 1 2.5 2.5v8.5a2.5 2.5 0 0 1-2.5 2.5h-6.5L8 21v-3.5H5A2.5 2.5 0 0 1 2.5 15V6.5A2.5 2.5 0 0 1 5 4zM8 10.75h.01M12 10.75h.01M16 10.75h.01',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  chev: 'M6 9l6 6 6-6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  plane: 'M2.5 13.5l19-7.5-4.5 13-5.5-4.5-4 3v-5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v5M16 3v5',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  baby: 'M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM7 21c1-3 3-4.5 5-4.5s4 1.5 5 4.5',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 10v6M9 13h6',
  stetho: 'M6 3v6a4 4 0 0 0 8 0V3M10 13v3a4 4 0 0 0 8 0v-2M18 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  layout: 'M3 4h18v16H3zM3 9h18M9 9v11',
  question: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01',
  quote: 'M7 7h4v6H5V9a2 2 0 0 1 2-2zM15 7h4v6h-6V9a2 2 0 0 1 2-2zM11 13c0 2-1 4-4 4M19 13c0 2-1 4-4 4',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9.5a1.5 1.5 0 1 0 0-.01',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M16 3.5a4 4 0 0 1 0 7.5M18 15c2.5.5 4 2.5 4 6',
  palette: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-1.4 1-2.4 2.4-2.4H18a3 3 0 0 0 3-3c0-6-4-11-9-11zM7.5 11h.01M10 7h.01M15 7h.01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.1 15H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 20.9 10H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  seo: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5M8 12l2 2 4-4',
  plus: 'M12 5v14M5 12h14',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V8a4 4 0 0 1 8 0v3M12 15v2',
  eyeoff: 'M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.8M6.3 7.6A17 17 0 0 0 2 12s4 6 10 6a9.6 9.6 0 0 0 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3',
  text: 'M5 6h14M5 12h14M5 18h9',
  car: 'M3 13l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 8l2 5v5h-3v-2H6v2H3zM3 13h18M7 13.5h.01M17 13.5h.01',
  train: 'M6 3h12a1 1 0 0 1 1 1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1zM5 10h14M9 14h.01M15 14h.01M8 18l-2 3M16 18l2 3',
  building: 'M4 21V5l8-2v18M12 21V8l8 2v11M2 21h20M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2',
  scale: 'M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z',
  passport: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9 17h6',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
};

// WhatsApp icon from Font Awesome Free 7.1.0 (brands/whatsapp), https://fontawesome.com, licence CC BY 4.0.
const WA_D = 'M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157m-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1s56.2 81.2 56.1 130.5c0 101.8-84.9 184.6-186.6 184.6m101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8s-14.3 18-17.6 21.8c-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7s-12.5-30.1-17.1-41.2c-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2s-9.7 1.4-14.8 6.9c-5.1 5.6-19.4 19-19.4 46.3s19.9 53.7 22.6 57.4c2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4s4.6-24.1 3.2-26.4c-1.3-2.5-5-3.9-10.5-6.6';

export function Icon({ name, size = 22, className }: { name: string; size?: number; className?: string }) {
  // WhatsApp buttons use the official icon uploaded in Admin > Logo & brand, when there is one.
  const wa = name === 'wa' ? SITE.brand?.waIcon : undefined;
  if (wa) return <img className={`si si-wa si-img${className ? ` ${className}` : ''}`} data-i="wa" src={wa} width={size} height={size} alt="" aria-hidden="true" decoding="async" />;
  if (name === 'wa') return (
    <svg className={`si si-wa si-brand${className ? ` ${className}` : ''}`} data-i="wa" width={size} height={size} viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d={WA_D} />
    </svg>
  );
  return (
    <svg className={`si si-${name}${className ? ` ${className}` : ''}`} data-i={name} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.star} />
    </svg>
  );
}
