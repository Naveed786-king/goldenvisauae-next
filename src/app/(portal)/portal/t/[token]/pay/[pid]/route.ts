import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
/** "Pay now": the card payment page of the active provider ("order" = the whole open quote). */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; pid: string }> }) {
  const { token, pid } = await params;
  const u = new URL(req.url);
  return NextResponse.redirect(new URL(`/api/portal/${encodeURIComponent(token)}/pay/${encodeURIComponent(pid)}${u.search}`, req.url), 303);
}
