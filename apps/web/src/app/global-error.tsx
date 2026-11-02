'use client';

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * whole document, so it cannot rely on Mantine or the app's providers.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}
      >
        <h2>خطای غیرمنتظره</h2>
        <p>برنامه با مشکل روبه‌رو شد. صفحه را دوباره بارگذاری کنید.</p>
        {error.digest && (
          <p style={{ fontSize: 12, color: '#666' }}>
            کد پیگیری: <code>{error.digest}</code>
          </p>
        )}
        <button type="button" onClick={reset} style={{ padding: '0.5rem 1.5rem' }}>
          تلاش دوباره
        </button>
      </body>
    </html>
  );
}
