import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Valores de cookie firmados con HMAC-SHA256: el navegador los guarda pero no
 * puede modificarlos sin que lo detectemos. Incluyen vencimiento propio, así
 * una cookie robada no sirve para siempre.
 */
export function seal<T extends object>(payload: T, ttlSeconds: number): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlSeconds * 1000 })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function unseal<T>(value: string | undefined): T | null {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp: number };
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function sign(body: string): string {
  return createHmac("sha256", env().SESSION_SECRET).update(body).digest("base64url");
}
