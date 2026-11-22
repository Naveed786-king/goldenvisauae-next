import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
/** Quotation PDF of the file (the same PDF the team sends). */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.redirect(new URL(`/api/portal/${encodeURIComponent(token)}/quote`, req.url), 303);
}
