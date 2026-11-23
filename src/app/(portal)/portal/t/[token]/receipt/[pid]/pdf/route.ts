export const dynamic = 'force-dynamic';
/** Receipt PDF of a payment (relative address, see the quote route). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; pid: string }> }) {
  const { token, pid } = await params;
  return new Response(null, { status: 303, headers: { Location: `/api/portal/${encodeURIComponent(token)}/receipt/${encodeURIComponent(pid)}` } });
}
