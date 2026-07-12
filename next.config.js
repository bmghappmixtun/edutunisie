/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // SECURITY: restrict remotePatterns to trusted image hosts only
    // Was: { protocol: 'https', hostname: '**' } (allowed ANY HTTPS host = SSRF risk)
    remotePatterns: [
      { protocol: 'https', hostname: 'examanet.com' },
      { protocol: 'https', hostname: '*.examanet.com' },
      { protocol: 'https', hostname: 'blob.examanet.com' },
      { protocol: 'https', hostname: 'pub-*.r2.dev' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google avatars
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' }, // Facebook avatars
    ],
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
  experimental: {
    serverActions: { bodySizeLimit: '50mb' },
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  async headers() {
    return [
      // Cache static assets aggressively
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/uploads/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // SECURITY: API routes - no cache + nosniff
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      // SECURITY: Global security headers (applied to all routes)
      {
        source: '/:path*',
        headers: [
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Force HTTPS (only in production)
          ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }] : []),
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser features
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // XSS protection (legacy, but still useful)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Content Security Policy - allow our resources
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://*.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https:",
              "media-src 'self' https: blob:",
              "frame-src 'self' https://*.youtube.com https://*.vimeo.com",
              "connect-src 'self' https://*.examanet.com https://*.r2.dev https://*.amazonaws.com https://*.google-analytics.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join('; ')
          },
        ],
      },
    ];
  },
  compress: true,
  poweredByHeader: false,
  // SECURITY: Disable powered-by header (already done above)
  // SECURITY: Block source maps from being served in production
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
