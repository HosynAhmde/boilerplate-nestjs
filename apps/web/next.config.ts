import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image.
  output: 'standalone',
  outputFileTracingRoot: join(here, '../..'),
  poweredByHeader: false,
  experimental: {
    // Tree-shakes Mantine and icon imports.
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', '@tabler/icons-react'],
  },
};

export default nextConfig;
