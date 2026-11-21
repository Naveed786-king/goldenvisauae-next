import { byToken, quoteOf } from '@/lib/portal/files';
import { quotePdf } from '@/lib/portal/documents';
import { rateLimit, clientIp } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Quotation PDF of a file (secret link: in the dashboard, emails and WhatsApp) */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit('pdf:' + clientIp(req), 60, 60_000)) return new Response('Too many requests', { status: 429 });
  const { token } = await params;
  const a = await byToken(token);
  if (!a || !quoteOf(a).sentAt) return new Response('Not found', { status: 404 });
  const pdf = await quotePdf(a);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Quotation ${a.refNo}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
