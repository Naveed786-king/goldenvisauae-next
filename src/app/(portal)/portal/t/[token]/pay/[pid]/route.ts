export const dynamic = 'force-dynamic';
/** "Pay now": the card payment page of the active provider ("order" = the whole open quote). Relative address, see the quote route. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; pid: string }> }) {
  const { token, pid } = await params;
  const search = new URL(req.url).search;
  return new Response(null, { status: 303, headers: { Location: `/api/portal/${encodeURIComponent(token)}/pay/${encodeURIComponent(pid)}${search}` } });
}
