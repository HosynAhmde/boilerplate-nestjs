'use client';

import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'mantine-datatable';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatJalaliDateTime } from '@/lib/format';

interface Health {
  status: string;
  details: Record<string, { status: string }>;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
}

const SERVICE_LABEL: Record<string, string> = {
  database: 'پایگاه داده',
  redis: 'صف و کش',
  storage: 'ذخیره فایل',
};

export default function DashboardPage() {
  const { user, can } = useAuth();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api<Health>('/health'),
    refetchInterval: 30_000,
  });
  const roles = useQuery({
    queryKey: ['iam', 'roles'],
    queryFn: () => api<Role[]>('/iam/roles'),
    enabled: can('USERS_ROLES'),
  });

  return (
    <Stack>
      <Title order={3}>سلام {user?.fullName}</Title>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {Object.entries(SERVICE_LABEL).map(([key, label]) => {
          const s = health.data?.details[key]?.status;
          return (
            <Card withBorder key={key}>
              <Group justify="space-between">
                <Text>{label}</Text>
                <Badge color={s === 'up' ? 'green' : health.isLoading ? 'gray' : 'red'}>
                  {s === 'up' ? 'فعال' : health.isLoading ? '...' : 'قطع'}
                </Badge>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>

      {can('USERS_ROLES') && (
        <Card withBorder>
          <Title order={5} mb="sm">
            نقش‌ها
          </Title>
          <DataTable<Role>
            minHeight={120}
            fetching={roles.isLoading}
            records={roles.data ?? []}
            noRecordsText="نقشی ثبت نشده"
            columns={[
              { accessor: 'name', title: 'نام' },
              { accessor: 'description', title: 'توضیح' },
              {
                accessor: 'isSystem',
                title: 'نوع',
                render: (r) => (r.isSystem ? <Badge variant="light">سیستمی</Badge> : 'عادی'),
              },
              {
                accessor: 'createdAt',
                title: 'تاریخ ایجاد',
                render: (r) => <span className="ltr">{formatJalaliDateTime(r.createdAt)}</span>,
              },
            ]}
          />
        </Card>
      )}
    </Stack>
  );
}
