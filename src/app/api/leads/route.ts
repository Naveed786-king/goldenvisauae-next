import { prisma } from '@/lib/db';
import { ok, fail, rateLimit, clientIp, isEmail } from '@/lib/api';
import { notifyAdmin, rowsTable, sendMail, escapeHtml } from '@/lib/mail';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  if (!rateLimit('lead:' + clientIp(req), 6, 60_000)) return fail('Too many requests, please try again in a minute.', 429);
  const b = await req.json().catch(() => ({}));
  if (b.website) return ok(); // honeypot
  const name = String(b.name || '').trim().slice(0, 120);
  const phone = String(b.phone || '').trim().slice(0, 40);
  const email = String(b.email || '').trim().slice(0, 160);
  if (!name) return fail('Please enter your name');
  // the visa validity checker continues on WhatsApp, so it may come without phone/email
  const noContactOk = b.allowNoContact === true && String(b.service || '') === 'Visa validity check';
  if (!phone && !email && !noContactOk) return fail('Please enter a phone number or email');
  if (email && !isEmail(email)) return fail('Please enter a valid email');
  const session = await getSession();
  const lead = await prisma.lead.create({
    data: {
      name,
      phone,
      email: email || null,
      nationality: String(b.nationality || '').slice(0, 80) || null,
      service: String(b.service || '').slice(0, 120) || null,
      message: String(b.message || '').slice(0, 4000) || null,
      source: String(b.source || '').slice(0, 200) || null,
      userId: session?.sub || null,
    },
  });
  notifyAdmin(
    `New enquiry: ${name}${lead.service ? ' — ' + lead.service : ''}`,
    `<h2 style="margin-top:0">New website enquiry</h2>${rowsTable([
      ['Name', name],
      ['Phone', phone],
      ['Email', email],
      ['Nationality', lead.nationality],
      ['Service', lead.service],
      ['Page', lead.source],
      ['Message', lead.message],
    ])}`,
    email || undefined,
    'leads'
  );
  if (email) {
    sendMail({
      to: email,
      subject: 'We received your enquiry',
      html: `<p>Dear ${escapeHtml(name)},</p><p>Thank you for contacting us. One of our Golden Visa consultants will get back to you within 24 hours.</p><p>Kind regards,<br/>The Golden Visa UAE team</p>`,
    });
  }
  return ok({ ok: true, id: lead.id });
}
