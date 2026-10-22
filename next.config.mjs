import createNextIntlPlugin from 'next-intl/plugin';

// next-intl (https://next-intl.dev) handles languages, UI texts and formatting
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
// On Vercel the public address is known automatically
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
if (!process.env.NEXT_PUBLIC_SITE_URL && vercelUrl) process.env.NEXT_PUBLIC_SITE_URL = `https://${vercelUrl}`;

const nextConfig = {
  env: process.env.NEXT_PUBLIC_SITE_URL ? { NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL } : {},
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Allow images from any https host (admins can paste external image URLs)
  images: {
    unoptimized: true,
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  // Let's Encrypt SSL check files (free https certificate on xCloud / VPS)
  async rewrites() {
    return { beforeFiles: [{ source: '/.well-known/acme-challenge/:token', destination: '/api/acme-challenge/:token' }] };
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'nodemailer'],
  experimental: {
    serverActions: { bodySizeLimit: '20mb' },
  },
};

export default withNextIntl(nextConfig);
