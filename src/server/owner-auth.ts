import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Login de la dueña con email y contraseña.
 *
 * - Comparación en tiempo constante (no filtra cuántos caracteres coinciden).
 * - El mismo error para email o contraseña incorrectos (no revela si la cuenta existe).
 * - Bloqueo de 15 min después de 5 intentos fallidos.
 *
 * Fase 2: lo reemplaza Supabase Auth (contraseña con bcrypt + recuperación por email).
 */
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;

const fails = ((
  globalThis as unknown as { filoOwnerFails?: Map<string, { count: number; until: number }> }
).filoOwnerFails ??= new Map());

const digest = (value: string) => createHash("sha256").update(value).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

export type OwnerLoginResult = { ok: true } | { ok: false; reason: "invalid" | "locked"; minutes?: number };

export function checkOwnerCredentials(email: string, password: string): OwnerLoginResult {
  const key = email.trim().toLowerCase();
  const record = fails.get(key);
  if (record && record.until > Date.now()) {
    return { ok: false, reason: "locked", minutes: Math.ceil((record.until - Date.now()) / 60_000) };
  }

  const emailOk = same(key, env().OWNER_EMAIL.toLowerCase());
  const passwordOk = same(password, env().OWNER_PASSWORD);
  if (emailOk && passwordOk) {
    fails.delete(key);
    return { ok: true };
  }

  const lockExpired = !!record && record.until > 0 && record.until <= Date.now();
  const count = (lockExpired ? 0 : (record?.count ?? 0)) + 1;
  fails.set(key, { count, until: count >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
  return count >= MAX_FAILS ? { ok: false, reason: "locked", minutes: 15 } : { ok: false, reason: "invalid" };
}
