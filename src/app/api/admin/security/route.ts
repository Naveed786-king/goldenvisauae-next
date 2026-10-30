import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { ok, fail, rateLimit } from '@/lib/api';
import { checkPassword, requireStaff, startSession } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { newBackupCodes, newSecret, otpauthUri, verifyCode } from '@/lib/totp';

export const dynamic = 'force-dynamic';

/** Two-step login status of the signed-in staff member */
export async function GET() {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const u = await prisma.user.findUnique({ where: { id: s.sub }, select: { totpEnabled: true, totpBackup: true } });
  let left = 0;
  try {
    left = JSON.parse(u?.totpBackup || '[]').length;
  } catch {}
  return ok({ enabled: !!u?.totpEnabled, backupLeft: left, overridden: process.env.ADMIN_2FA_OFF === '1' });
}

/**
 * start   → new secret + QR code (not active until a code from the app is confirmed)
 * enable  → confirms the first code, turns it on, returns 8 backup codes (shown once)
 * disable → needs the password and a current code
 */
export async function POST(req: Request) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  if (!rateLimit('2fa:' + s.sub, 15, 15 * 60_000)) return fail('Too many attempts. Please wait a few minutes.', 429);
  const b = await req.json().catch(() => ({}));
  const user = await prisma.user.findUnique({ where: { id: s.sub } });
  if (!user) return fail('Not found', 404);

  if (b.action === 'start') {
    if (user.totpEnabled) return fail('Two-step login is already on.');
    const secret = newSecret();
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret, totpStep: 0 } });
    const site: any = await getSetting('site').catch(() => ({}));
    const uri = otpauthUri(secret, user.email, String(site?.name || 'Golden Visa UAE') + ' Admin');
    const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
    return ok({ secret, qr });
  }

  if (b.action === 'enable') {
    if (user.totpEnabled) return fail('Two-step login is already on.');
    if (!user.totpSecret) return fail('Start the setup first.');
    const step = verifyCode(user.totpSecret, String(b.code || ''));
    if (step === null) return fail('That code is not right. Check the time on your phone and use the newest code.');
    const { codes, hashes } = newBackupCodes();
    const u = await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true, totpStep: step, totpBackup: JSON.stringify(hashes) } });
    // every other session (other browsers, a stolen cookie) ends now; this browser stays signed in
    await startSession(u);
    return ok({ codes });
  }

  if (b.action === 'disable') {
    if (!user.totpEnabled || !user.totpSecret) return fail('Two-step login is already off.');
    if (!(await checkPassword(String(b.password || ''), user.passwordHash))) return fail('Password is incorrect');
    if (verifyCode(user.totpSecret, String(b.code || ''), user.totpStep) === null) return fail('That code is not right.');
    const u = await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null, totpStep: 0, totpBackup: null } });
    await startSession(u);
    return ok();
  }
  return fail('Unknown action');
}
