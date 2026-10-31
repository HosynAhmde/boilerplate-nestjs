/**
 * The one shape every error response has. The web app reads `message`
 * (always a user-facing Persian string) and may branch on `code`.
 *
 * {
 *   "statusCode": 409,
 *   "code": "CONFLICT",
 *   "message": "این رکورد قبلاً ثبت شده است",
 *   "details": [...],            // optional: validation errors, retry info
 *   "requestId": "4f1c...",      // same value as the x-request-id header and the log line
 *   "path": "/api/v1/...",
 *   "timestamp": "2026-10-31T17:00:00.000Z"
 * }
 */
export interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  path: string;
  timestamp: string;
}

/** Persian text for statuses when the thrower gave no message of its own. */
export const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'درخواست نامعتبر است',
  401: 'لطفاً دوباره وارد شوید',
  403: 'دسترسی به این بخش ندارید',
  404: 'موردی یافت نشد',
  405: 'این عملیات مجاز نیست',
  409: 'این رکورد با داده‌های موجود تداخل دارد',
  413: 'حجم درخواست بیش از حد مجاز است',
  415: 'نوع محتوای درخواست پشتیبانی نمی‌شود',
  422: 'داده‌های ارسالی قابل پردازش نیست',
  429: 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید',
  500: 'خطای داخلی سرور؛ دوباره تلاش کنید',
  502: 'سرویس وابسته در دسترس نیست',
  503: 'سرویس موقتاً در دسترس نیست',
  504: 'پاسخ سرویس وابسته طول کشید',
};

export function defaultMessage(status: number): string {
  return DEFAULT_MESSAGES[status] ?? (status >= 500 ? DEFAULT_MESSAGES[500]! : 'خطا در درخواست');
}

/** BAD_REQUEST, NOT_FOUND, ... from the status code. */
export function statusCode(status: number): string {
  const names: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    409: 'CONFLICT',
    413: 'PAYLOAD_TOO_LARGE',
    415: 'UNSUPPORTED_MEDIA_TYPE',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT',
  };
  return names[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'ERROR');
}
