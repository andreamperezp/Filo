import type { NextConfig } from "next";

/**
 * La demo pública se puede mostrar dentro del portfolio y de Claude; un local
 * real (sin `DEMO_MODE`) no se deja mostrar dentro de ningún otro sitio.
 */
const isDemo = process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";

const DEMO_EMBEDDERS = [
  "'self'",
  "https://andreaperez.dev",
  "https://*.andreaperez.dev",
  "https://claude.ai",
  "https://*.claude.ai",
  "https://*.claudeusercontent.com",
];

/**
 * Cabeceras de seguridad para todas las páginas:
 * - solo los sitios permitidos pueden mostrar la app adentro (evita engaños tipo "clickjacking");
 * - el navegador no adivina tipos de archivo;
 * - los links a otros sitios no les pasan la URL completa;
 * - la app no pide cámara, micrófono ni ubicación.
 */
const securityHeaders = [
  ...(isDemo
    ? [{ key: "Content-Security-Policy", value: `frame-ancestors ${DEMO_EMBEDDERS.join(" ")}` }]
    : [
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Frame-Options", value: "DENY" },
      ]),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
