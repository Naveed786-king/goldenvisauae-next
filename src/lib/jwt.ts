// Edge-safe JWT helpers (used by middleware and server code)
import { SignJWT, jwtVerify } from 'jose';

export type SessionPayload = {
  sub: string;
  role: 'ADMIN' | 'EDITOR' | 'CUSTOMER';
  name: string;
  email: string;
  /** fingerprint of the password at sign-in: a password change ends every older login */
  pv?: string;
};

export const SESSION_COOKIE = 'rgv_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

let warned = false;
function secret() {
  // Without JWT_SECRET, key material that only the server knows is used: the database address (it holds
  // the DB password on MySQL/Postgres) or the admin password from the server settings. The fixed
  // development key below is public (it is in the code), so it is only used when nothing else exists.
  const db = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || '';
  const fallback = /^(postgres|mysql)/.test(db) ? 'rgv-session:' + db : process.env.ADMIN_PASSWORD ? `rgv-session:${process.env.ADMIN_PASSWORD}:${db}` : '';
  const s = process.env.JWT_SECRET || fallback || 'dev-secret-change-me-please-32-characters!!';
  if (!process.env.JWT_SECRET && !fallback && process.env.NODE_ENV === 'production' && !warned) {
    warned = true;
    console.error('[security] JWT_SECRET is not set — logins use a public development key. Set JWT_SECRET to a long random value.');
  }
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production' && (!!process.env.VERCEL || (process.env.NEXT_PUBLIC_SITE_URL || '').startsWith('https')),
  path: '/',
  maxAge: MAX_AGE,
};
