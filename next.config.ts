import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad para todas las páginas:
 * - nadie puede mostrar la app dentro de otro sitio (evita engaños tipo "clickjacking");
 * - el navegador no adivina tipos de archivo;
 * - los links a otros sitios no les pasan la URL completa;
 * - la app no pide cámara, micrófono ni ubicación.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
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
