'use client';

import {
  AppShell,
  Burger,
  Center,
  Group,
  Loader,
  Menu,
  NavLink,
  ScrollArea,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconLogout } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { NAV_ITEMS } from '@/components/nav';
import { useAuth } from '@/lib/auth';
import { formatJalali } from '@/lib/format';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { status, user, can, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [opened, { toggle, close }] = useDisclosure();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated' || !user) {
    return (
      <Center mih="100vh">
        <Loader />
      </Center>
    );
  }

  const items = NAV_ITEMS.filter((i) => !i.section || can(i.section));

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={800}>گالری پاشا</Text>
            <Text c="dimmed" size="sm" visibleFrom="sm">
              {formatJalali(new Date(), 'EEEE d MMMM yyyy')}
            </Text>
          </Group>
          <Menu position="bottom-end">
            <Menu.Target>
              <UnstyledButton>
                <Group gap={4}>
                  <Text size="sm">{user.fullName}</Text>
                  <IconChevronDown size={14} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                color="red"
                leftSection={<IconLogout size={16} />}
                onClick={() => void signOut().then(() => router.replace('/login'))}
              >
                خروج
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <ScrollArea>
          {items.map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              leftSection={<item.icon size={18} stroke={1.6} />}
              active={item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)}
              onClick={close}
            />
          ))}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
