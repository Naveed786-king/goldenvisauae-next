import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { ok, fail, isEmail } from '@/lib/api';
import { hashPassword, isStaff, requireStaff } from '@/lib/auth';
import { makeRef } from '@/lib/utils';
import { ensureToken, setStage, stepsFor } from '@/lib/portal/files';
import { notifyClient } from '@/lib/portal/notify';

export const dynamic = 'force-dynamic';

/** The team opens a client file (Admin > Applications > New application). */
export async function POST(req: Request) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const b = await req.json().catch(() => ({}));
  const str = (v: unknown, n = 200) => String(v ?? '').trim().slice(0, n);
  const fullName = str(b.name, 120);
  const phone = str(b.phone, 40);
  const email = str(b.email, 160).toLowerCase();
  const service = str(b.service);
  if (!fullName || !phone) return fail('Enter the client name and WhatsApp number');
  if (!service) return fail('Choose the route / service');
  if (email && !isEmail(email)) return fail('The email is not valid');
  let refNo = makeRef();
  for (let i = 0; i < 3 && (await prisma.application.findUnique({ where: { refNo } })); i++) refNo = makeRef();
  // the file belongs to the client's account: their existing one, or a new one they can open later with "Forgot password"
  const login = email || `client-${refNo.toLowerCase()}@files.local`;
  let user = await prisma.user.findUnique({ where: { email: login } });
  if (user && isStaff(user.role)) return fail('This email belongs to a team member. Use the client’s own email.');
  if (!user) user = await prisma.user.create({ data: { name: fullName, email: login, phone, nationality: str(b.nationality, 80) || null, passwordHash: await hashPassword(randomBytes(24).toString('hex')), role: 'CUSTOMER' } });
  const count = (v: unknown) => Math.min(10, Math.max(0, Math.round(Number(v) || 0)));
  const adults = count(b.adults);
  const kids = count(b.kids);
  const app = await prisma.application.create({
    data: {
      refNo,
      userId: user.id,
      service,
      fullName,
      email: email || null,
      phone,
      nationality: str(b.nationality, 80) || null,
      familyMembers: adults + kids,
      language: str(b.language, 20) || 'en',
      status: 'submitted',
      progress: 10,
      seen: true,
      meta: JSON.stringify({ location: b.location === 'out' ? 'out' : 'in', adults, kids, privateNotes: str(b.notes, 5000) || undefined }),
    },
  });
  await ensureToken(app);
  const steps = await stepsFor(service);
  if (steps[0]) await setStage(app.id, steps[0].id);
  if (b.notify) void notifyClient(app, 'welcome');
  return ok({ id: app.id, refNo });
}
