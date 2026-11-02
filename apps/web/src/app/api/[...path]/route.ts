import type { NextRequest } from 'next/server';

/**
 * Same-origin proxy: the browser calls /api/v1/*, this forwards to the NestJS
 * API. Keeps the refresh cookie first-party (SameSite=Strict) and avoids CORS.
 * API_INTERNAL_URL is read at request time, so one image works everywhere.
 */
const HOP_BY_HOP = ['connection', 'keep-alive', 'transfer-encoding', 'host', 'content-length'];
/** Statuses that must not carry a body; `new Response(body, ...)` throws on them. */
const NULL_BODY = new Set([101, 103, 204, 205, 304]);
const UPSTREAM_TIMEOUT_MS = 30_000;

function proxyError(req: NextRequest, status: number, code: string, message: string): Response {
  return Response.json(
    {
      statusCode: status,
      code,
      message,
      requestId: req.headers.get('x-request-id') ?? undefined,
      path: req.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

async function proxy(req: NextRequest): Promise<Response> {
  const base = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
  const target = new URL(req.nextUrl.pathname + req.nextUrl.search, base);

  const headers = new Headers(req.headers);
  HOP_BY_HOP.forEach((h) => headers.delete(h));
  // Caddy sets X-Forwarded-For to the real client; pass it on (never an empty value).
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);
  else headers.delete('x-forwarded-for');
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
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
    console.error(
      JSON.stringify({
        level: 'error',
        service: 'web',
        msg: 'API proxy request failed',
        method: req.method,
        path: req.nextUrl.pathname,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return timedOut
      ? proxyError(req, 504, 'GATEWAY_TIMEOUT', 'پاسخ سرور طول کشید؛ دوباره تلاش کنید')
      : proxyError(req, 502, 'BAD_GATEWAY', 'سرور در دسترس نیست');
  }

  const out = new Headers(upstream.headers);
  // fetch already decoded the body
  ['content-encoding', 'content-length', 'transfer-encoding'].forEach((h) => out.delete(h));
  out.delete('set-cookie');
  for (const cookie of upstream.headers.getSetCookie()) out.append('set-cookie', cookie);

  const body = NULL_BODY.has(upstream.status) || req.method === 'HEAD' ? null : upstream.body;
  return new Response(body, { status: upstream.status, headers: out });
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
