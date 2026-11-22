import { ok, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { createMetaTemplates, metaTemplates, syncMetaTemplates } from '@/lib/portal/wa-templates';

export const dynamic = 'force-dynamic';

/** WhatsApp templates: list (GET), send for approval (POST create) or read the approval (POST sync). */
export async function GET() {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  return ok({ templates: metaTemplates().map((t) => ({ event: t.event, name: t.name, text: t.text, pdf: t.header === 'DOCUMENT' })) });
}
export async function POST(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const { action } = await req.json().catch(() => ({}));
  const r = action === 'create' ? await createMetaTemplates() : await syncMetaTemplates();
  return ok({ result: r });
}
