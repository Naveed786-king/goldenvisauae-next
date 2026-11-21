import { byToken } from '@/lib/portal/files';
import { receiptPdf } from '@/lib/portal/documents';
import { rateLimit, clientIp } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Payment receipt PDF (secret link: dashboard, emails and the WhatsApp message with the PDF) */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; pid: string }> }) {
  if (!rateLimit('pdf:' + clientIp(req), 60, 60_000)) return new Response('Too many requests', { status: 429 });
  const { token, pid } = await params;
  const a = await byToken(token);
  const p = a?.payments.find((x) => x.id === pid);
  if (!a || !p || p.status !== 'paid') return new Response('Not found', { status: 404 });
  const pdf = await receiptPdf(a, p);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Receipt ${p.receiptNo}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
