import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from './lib/jwt';
import { splitLocale, DEFAULT_LOCALE, isLocale } from './lib/i18n/config';

const bare = (h: string) => h.toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');
function sameSite(origin: string, req: NextRequest): boolean {
  let o = '';
  try {
    o = bare(new URL(origin).host);
  } catch {
    return false; // "null" or garbage
  }
  const own = [req.headers.get('x-forwarded-host'), req.headers.get('host'), req.nextUrl.host, process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : '']
    .flatMap((h) => String(h || '').split(','))
    .map((h) => bare(h.trim()))
    .filter(Boolean);
  // behind a proxy that hides the real site name (only localhost visible) we cannot compare: allow,
  // rather than lock the admin out; the session cookie (SameSite) still protects
  if (!own.some((h) => !/^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(h))) return true;
  return own.includes(o);
}
// endpoints other systems call (they never send a browser Origin anyway)
const foreignOriginAllowed = (p: string) => p.startsWith('/api/cron/');

export async function middleware(req: NextRequest) {
  // 1) Language prefix: /ar/about-us -> render /about-us in Arabic
  // Next 15.5 runs middleware a second time on the rewritten URL (/ar/x -> /x); keep the
  // language picked on the first pass instead of falling back to English.
  const split = splitLocale(req.nextUrl.pathname);
  const prev = req.headers.get('x-locale');
  const locale = split.locale === DEFAULT_LOCALE && req.headers.get('x-locale-rewrite') === '1' && isLocale(prev) ? prev : split.locale;
  const path = split.path;
  const pathname = path;

  // Requests that change something must come from this website itself (stops other sites from
  // sending forms or scripts to our API with a visitor's login). Requests without an Origin (server
  // tools, cron) are left to the API's own checks.
  if (pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !foreignOriginAllowed(pathname)) {
    const origin = req.headers.get('origin');
    if (origin && !sameSite(origin, req)) return NextResponse.json({ error: 'Cross-site request blocked' }, { status: 403 });
  }

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
