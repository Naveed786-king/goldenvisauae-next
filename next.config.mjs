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
  // Basic browser protection on every page: no framing by other sites (clickjacking), no MIME sniffing,
  // HTTPS remembered by the browser, no camera/microphone/location access.
  async headers() {
    const https = (process.env.NEXT_PUBLIC_SITE_URL || '').startsWith('https') || !!process.env.VERCEL;
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          ...(https ? [{ key: 'Strict-Transport-Security', value: 'max-age=15552000' }] : []),
        ],
      },
    ];
  },
  async rewrites() {
    return { beforeFiles: [{ source: '/.well-known/acme-challenge/:token', destination: '/api/acme-challenge/:token' }] };
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'nodemailer', 'sharp'],
  experimental: {
    serverActions: { bodySizeLimit: '20mb' },
    // pages already opened or loaded on hover are reused for a while: back/forward and repeat visits are instant
    staleTimes: { dynamic: 45, static: 300 },
    optimizePackageImports: ['lucide-react'],
  },
};

export default withNextIntl(nextConfig);
