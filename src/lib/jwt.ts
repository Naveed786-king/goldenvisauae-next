// Edge-safe JWT helpers (used by middleware and server code)
import { SignJWT, jwtVerify } from 'jose';

export type SessionPayload = {
  sub: string;
  role: 'ADMIN' | 'EDITOR' | 'CUSTOMER';
  name: string;
  email: string;
};

export const SESSION_COOKIE = 'rgv_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  // Without JWT_SECRET, the (secret) database address is used as key material so sessions stay secure on Vercel.
  const db = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || '';
  const s = process.env.JWT_SECRET || (/^(postgres|mysql)/.test(db) ? 'rgv-session:' + db : 'dev-secret-change-me-please-32-characters!!');
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
