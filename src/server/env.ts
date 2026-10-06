import "server-only";

import { z } from "zod";

/**
 * Variables de entorno validadas al arrancar. En desarrollo los valores salen
 * de `.env.development` (versionado, solo datos de prueba); en producción
 * tienen que estar configurados: si faltan, el login falla en vez de usar
 * valores inseguros (falla cerrada). Se leen recién al usarse, para que el
 * build no necesite secretos.
 */
const schema = z.object({
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET debe tener al menos 32 caracteres"),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(10, "ADMIN_PASSWORD debe tener al menos 10 caracteres"),
  /** Solo desarrollo: crea cuentas de prueba para Lucas y Sofía. */
  DEV_STAFF_PASSWORD: z.string().min(10).optional(),
});

let cached: z.infer<typeof schema> | undefined;

export function env() {
  cached ??= schema.parse({
    SESSION_SECRET: process.env.SESSION_SECRET,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    DEV_STAFF_PASSWORD: isDemo ? process.env.DEV_STAFF_PASSWORD : undefined,
  });
  return cached;
}

export const isProduction = process.env.NODE_ENV === "production";

/**
 * Modo demo: muestra el código de ingreso en pantalla (no hay proveedor de
 * SMS/WhatsApp todavía), crea cuentas de prueba y muestra avisos de demo.
 * Activo siempre en desarrollo; en producción solo si se pide EXPLÍCITAMENTE
 * con `DEMO_MODE=true` (link público de prueba con datos de ejemplo).
 * Nunca activarlo en un deploy con clientas reales.
 */
export const isDemo = !isProduction || process.env.DEMO_MODE === "true";
