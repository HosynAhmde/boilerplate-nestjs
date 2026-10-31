import '@fontsource-variable/vazirmatn';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-datatable/styles.css';
import './globals.css';

import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'گالری پاشا',
  description: 'سامانه مدیریت گالری نقره پاشا',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fa" dir="rtl" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
