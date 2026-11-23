export const dynamic = 'force-dynamic';
/** Quote PDF of the file. Relative address: the server's own internal address (localhost) must never reach the browser. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return new Response(null, { status: 303, headers: { Location: `/api/portal/${encodeURIComponent(token)}/quote` } });
}
