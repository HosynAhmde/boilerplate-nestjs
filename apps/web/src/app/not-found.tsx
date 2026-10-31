'use client';

import { Button, Center, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Center mih="60vh" p="md">
      <Stack align="center" gap="sm" ta="center">
        <Title order={3}>صفحه پیدا نشد</Title>
        <Text c="dimmed">آدرسی که وارد کرده‌اید وجود ندارد.</Text>
        <Button component={Link} href="/">
          بازگشت به داشبورد
        </Button>
      </Stack>
    </Center>
  );
}
