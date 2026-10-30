import { prisma } from '@/lib/db';
import { ok, fail, rateLimit, clientIp } from '@/lib/api';
import { checkPassword, startSession, isStaff } from '@/lib/auth';
import { useBackupCode, verifyCode } from '@/lib/totp';

export async function POST(req: Request) {
  if (!rateLimit('login:' + clientIp(req), 10, 5 * 60_000)) return fail('Too many attempts. Please wait a few minutes.', 429);
  const { email, password, admin, code } = await req.json().catch(() => ({}));
  if (!email || !password) return fail('Email and password are required');
  // also per account: stops guessing one password from many addresses
  if (!rateLimit('login-acct:' + String(email).toLowerCase().trim(), 20, 15 * 60_000)) return fail('Too many attempts. Please wait a few minutes.', 429);
  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user || !(await checkPassword(String(password), user.passwordHash))) return fail('Invalid email or password', 401);
  if (!user.active) return fail('This account is disabled. Please contact support.', 403);
  if (admin && !isStaff(user.role)) return fail('This account does not have admin access', 403);
  // two-step login: the password alone is not enough when the account has an authenticator app
  if (user.totpEnabled && user.totpSecret && process.env.ADMIN_2FA_OFF !== '1') {
    if (!code) return ok({ ok: false, needCode: true });
    if (!rateLimit('login-code:' + user.id, 8, 15 * 60_000)) return fail('Too many wrong codes. Please wait a few minutes.', 429);
    const step = verifyCode(user.totpSecret, String(code), user.totpStep);
    if (step !== null) await prisma.user.update({ where: { id: user.id }, data: { totpStep: step } });
    else {
      const left = useBackupCode(user.totpBackup, String(code));
      if (!left) return fail('Wrong code. Use the 6-digit code from your authenticator app (or one of your backup codes).', 401);
      await prisma.user.update({ where: { id: user.id }, data: { totpBackup: JSON.stringify(left) } });
    }
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession(user);
  return ok({ ok: true, role: user.role, redirect: isStaff(user.role) ? '/admin' : '/account' });
}
