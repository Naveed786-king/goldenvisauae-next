import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from './lib/jwt';
import { splitLocale, DEFAULT_LOCALE, isLocale } from './lib/i18n/config';

export async function middleware(req: NextRequest) {
  // 1) Language prefix: /ar/about-us -> render /about-us in Arabic
  // Next 15.5 runs middleware a second time on the rewritten URL (/ar/x -> /x); keep the
  // language picked on the first pass instead of falling back to English.
  const split = splitLocale(req.nextUrl.pathname);
  const prev = req.headers.get('x-locale');
  const locale = split.locale === DEFAULT_LOCALE && req.headers.get('x-locale-rewrite') === '1' && isLocale(prev) ? prev : split.locale;
  const path = split.path;
  const pathname = path;

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const staff = session && (session.role === 'ADMIN' || session.role === 'EDITOR');

  // Admin area (never translated)
  if (pathname.startsWith('/admin')) {
    if (locale !== DEFAULT_LOCALE) return NextResponse.redirect(new URL(pathname, req.url));
    if (pathname === '/admin/login') {
      // ?relogin=1: the saved login points to an account that no longer exists (e.g. after a
      // backup restore or a deleted user) — forget it and show the sign-in form (no redirect loop)
      if (req.nextUrl.searchParams.has('relogin')) {
        const res = NextResponse.next();
        res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
        return res;
      }
      if (staff) return NextResponse.redirect(new URL('/admin', req.url));
      return NextResponse.next();
    }
    if (!staff) {
      const url = new URL('/admin/login', req.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Admin API
  if (pathname.startsWith('/api/admin') && !staff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Customer portal
  if (pathname.startsWith('/account') && !session) {
    const url = new URL(locale === DEFAULT_LOCALE ? '/login' : `/${locale}/login`, req.url);
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/api/account') && !session) {
    return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  }

  const headers = new Headers(req.headers);
  headers.set('x-locale', locale);
  headers.set('x-pathname', pathname);

  if (locale !== DEFAULT_LOCALE) {
    const url = req.nextUrl.clone();
    url.pathname = pathname;
    headers.set('x-locale-rewrite', '1');
    if (req.headers.get('x-locale-rewrite') === '1' && splitLocale(req.nextUrl.pathname).locale === DEFAULT_LOCALE) return NextResponse.next({ request: { headers } });
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Run on everything except static files
  matcher: ['/((?!api/admin/backup|_next/static|_next/image|uploads/|icon.svg|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)$).*)'],
};
