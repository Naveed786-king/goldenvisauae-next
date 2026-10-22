import { ok, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { sendMail, notifyEmails, parseEmails, lastMailError } from '@/lib/mail';

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return fail('Admins only', 403);
  const { to } = await req.json().catch(() => ({}));
  // no address typed: send to everyone who gets the website notifications
  const list = parseEmails(to);
  const recipients = list.length ? list : (await notifyEmails()).length ? await notifyEmails() : [s.email];
  const sent = await sendMail({ to: recipients, subject: 'Test email from your website', html: '<p>✅ Your SMTP settings work. Website notifications will be delivered to:</p><p><b>' + recipients.join('<br/>') + '</b></p>' });
  return sent ? ok({ to: recipients }) : fail('Could not send: ' + (lastMailError || 'check the SMTP host, port, username and password.'));
}
