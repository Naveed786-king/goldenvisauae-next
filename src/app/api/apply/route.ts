import { prisma } from '@/lib/db';
import { ok, fail, rateLimit, clientIp, isEmail } from '@/lib/api';
import { getSession, hashPassword, startSession, checkPassword } from '@/lib/auth';
import { savePrivateFile } from '@/lib/upload';
import { makeRef } from '@/lib/utils';
import { notifyAdmin, rowsTable, sendMail, escapeHtml } from '@/lib/mail';

export async function POST(req: Request) {
  if (!rateLimit('apply:' + clientIp(req), 5, 10 * 60_000)) return fail('Too many submissions. Please try again later.', 429);
  const fd = await req.formData();
  const g = (k: string) => String(fd.get(k) || '').trim();
  const service = g('service');
  const fullName = g('fullName');
  const email = g('email').toLowerCase();
  const phone = g('phone');
  if (!service) return fail('Please choose a service');
  if (!fullName || !phone) return fail('Please enter your name and phone');

  let session = await getSession();
  let userId = session?.sub;

  if (!userId) {
    if (!isEmail(email)) return fail('Please enter a valid email');
    const password = g('password');
    if (password.length < 8) return fail('Password must be at least 8 characters');
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      // returning client: the right password signs them in and the application goes to their account
      if (!exists.active || !(await checkPassword(password, exists.passwordHash))) {
        return fail('An account with this email already exists. Enter its password, or sign in first.');
      }
      await startSession(exists);
      userId = exists.id;
    } else {
      const user = await prisma.user.create({
        data: { name: fullName, email, phone, nationality: g('nationality') || null, passwordHash: await hashPassword(password), role: 'CUSTOMER' },
      });
      await startSession(user);
      userId = user.id;
      notifyAdmin(`New client account: ${fullName}`, rowsTable([['Name', fullName], ['Email', email], ['Phone', phone]]), email, 'accounts');
    }
  }

  let refNo = makeRef();
  for (let i = 0; i < 3; i++) {
    const clash = await prisma.application.findUnique({ where: { refNo } });
    if (!clash) break;
    refNo = makeRef();
  }

  const app = await prisma.application.create({
    data: {
      refNo,
      userId: userId!,
      service,
      fullName,
      email: email || session?.email || null,
      phone,
      nationality: g('nationality') || null,
      passportNo: g('passportNo') || null,
      dateOfBirth: g('dateOfBirth') || null,
      propertyValue: g('propertyValue') || null,
      familyMembers: Number(g('familyMembers')) || 0,
      notes: g('notes') || null,
      status: 'submitted',
      progress: 10,
    },
  });

  const files = fd.getAll('files').filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f && (f as File).size > 0);
  for (const file of files.slice(0, 10)) {
    try {
      const saved = await savePrivateFile(file, app.id);
      await prisma.document.create({ data: { applicationId: app.id, name: file.name, path: saved.path, mime: saved.mime, size: saved.size, uploadedBy: 'customer' } });
    } catch (e) {
      console.error('upload failed', (e as Error).message);
    }
  }

  notifyAdmin(
    `New application ${refNo}: ${fullName} — ${service}`,
    `<h2 style="margin-top:0">New online application</h2>${rowsTable([
      ['Reference', refNo],
      ['Service', service],
      ['Name', fullName],
      ['Email', app.email],
      ['Phone', phone],
      ['Nationality', app.nationality],
      ['Property value', app.propertyValue],
      ['Family members', String(app.familyMembers)],
      ['Documents', String(files.length)],
      ['Notes', app.notes],
    ])}`,
    app.email || undefined,
    'applications'
  );
  if (app.email) {
    sendMail({
      to: app.email,
      subject: `Application received — ${refNo}`,
      html: `<p>Dear ${escapeHtml(fullName)},</p><p>Thank you! We have received your application for <b>${escapeHtml(service)}</b>.</p><p>Your reference number is <b style="font-size:18px">${refNo}</b>.</p><p>You can track your application, upload documents and message your consultant from your account at any time.</p>`,
    });
  }

  return ok({ ok: true, id: app.id, refNo });
}
