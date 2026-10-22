// next-intl request configuration (https://next-intl.dev).
// The language is chosen by our middleware from the URL (/ar, /ru …) and passed in the x-locale header.
import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/server';
import { toMessages } from '@/lib/i18n/messages';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale: string = (await requestLocale) || '';
  if (!isLocale(locale)) {
    const h = await headers();
    locale = h.get('x-locale') || DEFAULT_LOCALE;
  }
  if (!isLocale(locale)) locale = DEFAULT_LOCALE;
  const dict = locale === DEFAULT_LOCALE ? {} : await getDictionary(locale);
  return {
    locale,
    messages: toMessages(dict),
    timeZone: 'Asia/Dubai',
    // Missing texts simply show the English original
    onError: () => {},
    getMessageFallback: ({ key }) => key,
  };
});
