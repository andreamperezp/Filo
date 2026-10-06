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
  OWNER_EMAIL: z.email(),
  OWNER_PASSWORD: z.string().min(10, "OWNER_PASSWORD debe tener al menos 10 caracteres"),
});

let cached: z.infer<typeof schema> | undefined;

export function env() {
  cached ??= schema.parse({
    SESSION_SECRET: process.env.SESSION_SECRET,
    OWNER_EMAIL: process.env.OWNER_EMAIL,
    OWNER_PASSWORD: process.env.OWNER_PASSWORD,
  });
  return cached;
}

export const isProduction = process.env.NODE_ENV === "production";
