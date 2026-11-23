import { fail } from '@/lib/api';
import { requireStaff } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { makePdf } from '@/lib/portal/pdf';
import { emailHtml, fillTpl } from '@/lib/portal/notify';

export const dynamic = 'force-dynamic';

/** Sample quote, receipt or email with the saved settings (Admin > Emails & PDFs > Preview). */
export async function GET(req: Request) {
  if (!(await requireStaff())) return fail('Unauthorized', 401);
  const kind = new URL(req.url).searchParams.get('kind') || 'quote';
  if (kind === 'email') {
    const cfg = await getSetting('clientMail');
    const v = { name: 'Sara', ref: 'GV-0001', service: 'UAE Golden Visa', total: 'AED 12,500.00', link: '#' };
    const html = emailHtml(fillTpl(cfg.events.quote.body, v), cfg.signOff, 'View my quotation');
    return new Response(`<p style="font:13px system-ui;color:#666;margin:12px">Subject: <b>${fillTpl(cfg.events.quote.subject, v)}</b></p>${html}`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  const quote = kind !== 'receipt';
  const pdf = await makePdf(
    quote
      ? { kind: 'quote', name: 'Sara Ahmed', ref: 'GV-0001', desc: 'UAE Golden Visa (10 years) · 1 person, inside the UAE', lines: [['Main applicant: Golden Visa issuance, Emirates ID, medical', 'AED 9,978.00'], ['Our service fee', 'AED 2,500.00'], ['VAT 5% on the service fee', 'AED 125.00']], totalLabel: 'Quote total', total: 'AED 12,603.00' }
      : { kind: 'receipt', name: 'Sara Ahmed', ref: 'GV-0001', facts: [['Receipt no.', 'GV-0001-R1'], ['Paid on', new Date().toLocaleDateString('en-GB')], ['Method', 'Card']], lines: [['UAE Golden Visa · full payment', 'AED 12,603.00']], totalLabel: 'Amount paid', total: 'AED 12,603.00' },
  );
  return new Response(Buffer.from(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="sample-${quote ? 'quote' : 'receipt'}.pdf"` } });
}
