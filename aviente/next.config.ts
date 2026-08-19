import type { NextConfig } from 'next';

/**
 * Response headers. There was no vercel.json and no headers() here, yet
 * `components/StripSecret.tsx` is written as though a referrer policy protects share
 * links — it strips ?k= from the address bar so the secret does not sit in history,
 * which is only half the problem if the browser then sends that URL to every image
 * host the page touches.
 */
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          /* The one that actually matters here. A share link carries its secret in
             the URL (/m/<id>?k=<secret>), and the default policy leaks the full URL
             in the Referer of every outbound request. no-referrer sends none. */
          { key: 'Referrer-Policy', value: 'no-referrer' },

          /* A private family cookbook has no business in a frame, and no business
             being sniffed into a different content type. */
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          /* No camera, microphone or location is used anywhere — the photo field is
             a file input, not getUserMedia. Saying so costs nothing and closes the
             door on anything added later without thought. */
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },

          /* Baseline CSP, deliberately not `unsafe-none` everywhere.
             Notes on the loose parts, because each is a real constraint rather than
             laziness:
               script 'unsafe-inline' — Next's App Router inlines its bootstrap and
                 flight data; removing it needs nonces threaded through the whole
                 render and is a project of its own.
               style 'unsafe-inline'  — the app sets CSS custom properties inline for
                 per-day kids colours and the theme.
               img/font/connect       — Supabase Storage serves signed photo URLs, and
                 next/font self-hosts but Google's CSS is still fetched at build. */
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
