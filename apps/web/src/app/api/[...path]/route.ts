import type { NextRequest } from 'next/server';

/**
 * Same-origin proxy: the browser calls /api/v1/*, this forwards to the NestJS
 * API. Keeps the refresh cookie first-party (SameSite=Strict) and avoids CORS.
 * API_INTERNAL_URL is read at request time, so one image works everywhere.
 */
const HOP_BY_HOP = ['connection', 'keep-alive', 'transfer-encoding', 'host', 'content-length'];

async function proxy(req: NextRequest): Promise<Response> {
  const base = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
  const target = new URL(req.nextUrl.pathname + req.nextUrl.search, base);

  const headers = new Headers(req.headers);
  HOP_BY_HOP.forEach((h) => headers.delete(h));
  headers.set('x-forwarded-for', req.headers.get('x-forwarded-for') ?? '');
  headers.set('x-forwarded-proto', req.nextUrl.protocol.replace(':', ''));

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    return Response.json({ message: 'سرور در دسترس نیست' }, { status: 502 });
  }

  const out = new Headers(upstream.headers);
  // fetch already decoded the body
  ['content-encoding', 'content-length', 'transfer-encoding'].forEach((h) => out.delete(h));
  out.delete('set-cookie');
  for (const cookie of upstream.headers.getSetCookie()) out.append('set-cookie', cookie);

  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
