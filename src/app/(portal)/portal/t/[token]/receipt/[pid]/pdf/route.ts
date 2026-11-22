import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
/** Payment receipt PDF. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; pid: string }> }) {
  const { token, pid } = await params;
  return NextResponse.redirect(new URL(`/api/portal/${encodeURIComponent(token)}/receipt/${encodeURIComponent(pid)}`, req.url), 303);
}
