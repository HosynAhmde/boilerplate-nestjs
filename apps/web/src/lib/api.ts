/**
 * Small fetch wrapper for the API. The access token lives in memory only;
 * the refresh token is an httpOnly cookie the browser sends to /api/v1/auth.
 * On a 401 the request is retried once after a silent refresh.
 */
/** The API's standard error body (see AllExceptionsFilter on the server). */
export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export class ApiError extends Error {
  /** Machine-readable error code, e.g. NOT_FOUND, DUPLICATE, ORDER_LOCKED. */
  readonly code: string;
  /** Matches the server log line; show it to users so they can report problems. */
  readonly requestId?: string;

  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    const b = (body && typeof body === 'object' ? body : {}) as Partial<ApiErrorBody>;
    this.code = typeof b.code === 'string' ? b.code : status === 0 ? 'NETWORK_ERROR' : 'ERROR';
    this.requestId = typeof b.requestId === 'string' ? b.requestId : undefined;
  }
}

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export function refreshAccessToken(): Promise<boolean> {
  refreshing ??= fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    .then(async (res) => {
      if (!res.ok) return false;
      setAccessToken(((await res.json()) as { accessToken: string }).accessToken);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function parse(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return text;
  }
}

function messageOf(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join('، ');
  }
  return status >= 500 ? 'خطای سرور؛ دوباره تلاش کنید' : 'درخواست نامعتبر است';
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, { ...init, headers, credentials: 'same-origin' });
  } catch {
    // offline or the connection dropped: give callers an ApiError like any other failure
    throw new ApiError(0, 'اتصال به اینترنت برقرار نیست');
  }

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshAccessToken()) return api<T>(path, init, false);
    setAccessToken(null);
    onSessionExpired?.();
  }

  const body = await parse(res);
  if (!res.ok) throw new ApiError(res.status, messageOf(body, res.status), body);
  return body as T;
}

export const apiPost = <T>(path: string, data?: unknown) =>
  api<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) });
