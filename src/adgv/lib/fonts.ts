import { Instrument_Serif, Manrope, Noto_Naskh_Arabic } from 'next/font/google';

export const display = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-display', display: 'swap' });
export const body = Manrope({ subsets: ['latin', 'latin-ext', 'cyrillic'], variable: '--font-body', display: 'swap' });
export const arabic = Noto_Naskh_Arabic({ subsets: ['arabic'], variable: '--font-arabic', display: 'swap' });
export const fontVars = `${display.variable} ${body.variable} ${arabic.variable}`;
