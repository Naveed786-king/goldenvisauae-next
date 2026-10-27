import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { SESSION_COOKIE, signSession, verifySession, sessionCookieOptions, SessionPayload } from './jwt';

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function checkPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

/** Short fingerprint of the stored password hash (not reversible, changes with every new password) */
export function passwordVersion(passwordHash: string): string {
  return createHash('sha256').update(`pv:${passwordHash}`).digest('base64url').slice(0, 16);
}

/**
 * The signed-in user's session, checked against the database on every use: a deleted or disabled
 * account, a changed role, or a changed password ends the session at once (not after 7 days).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const s = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const user = await prisma.user.findUnique({ where: { id: s.sub }, select: { active: true, role: true, passwordHash: true } });
  if (!user || !user.active || user.role !== s.role || s.pv !== passwordVersion(user.passwordHash)) return null;
  return s;
}

export async function getCurrentUser() {
  const s = await getSession();
  if (!s) return null;
  const user = await prisma.user.findUnique({ where: { id: s.sub } });
  if (!user || !user.active) return null;
  return user;
}

export async function startSession(user: { id: string; role: string; name: string; email: string; passwordHash: string }) {
  const token = await signSession({
    sub: user.id,
    role: user.role as SessionPayload['role'],
    name: user.name,
    email: user.email,
    pv: passwordVersion(user.passwordHash),
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function endSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
}

export function isStaff(role?: string | null) {
  return role === 'ADMIN' || role === 'EDITOR';
}

/** Returns the staff session or null */
export async function requireStaff() {
  const s = await getSession();
  if (!s || !isStaff(s.role)) return null;
  return s;
}

export async function requireAdmin() {
  const s = await getSession();
  if (!s || s.role !== 'ADMIN') return null;
  return s;
}
