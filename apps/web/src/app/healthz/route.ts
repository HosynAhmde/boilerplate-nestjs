/** Liveness for Docker/monitoring: the Next.js server is up. Does not call the API. */
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
}
