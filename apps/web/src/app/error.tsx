'use client';

import { Button, Center, Code, Stack, Text, Title } from '@mantine/core';
import { useEffect } from 'react';
import { ApiError } from '@/lib/api';

/** Shown when a page throws while rendering. The rest of the app keeps working. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // A reference the user can send to support: the API request id or Next's digest.
  const ref = error instanceof ApiError ? error.requestId : error.digest;

  return (
    <Center mih="60vh" p="md">
      <Stack align="center" gap="sm" maw={420} ta="center">
        <Title order={3}>مشکلی پیش آمد</Title>
        <Text c="dimmed">
          {error instanceof ApiError ? error.message : 'نمایش این صفحه با خطا مواجه شد.'}
        </Text>
        {ref && (
          <Text size="xs" c="dimmed">
            کد پیگیری: <Code>{ref}</Code>
          </Text>
        )}
        <Button onClick={reset}>تلاش دوباره</Button>
      </Stack>
    </Center>
  );
}
