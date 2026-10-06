import "server-only";

import { getMemoryRepository } from "@/data/memory-repository";
import type { StaffUser } from "@/domain/types";
import { hashPassword, verifyPassword } from "@/lib/password";

/**
 * Login del equipo (superadmin y peluqueros) con email y contraseña.
 *
 * - Contraseñas con scrypt + sal (ver `lib/password.ts`).
 * - El mismo error para email inexistente, contraseña incorrecta o cuenta
 *   desactivada: no revela qué cuentas existen.
 * - Bloqueo de 15 min después de 5 intentos fallidos por email.
 * - Si el email no existe igual se calcula un hash, para que el tiempo de
 *   respuesta no delate si la cuenta existe.
 */
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;
let decoyHash: string | undefined;

const fails = ((
  globalThis as unknown as { filoStaffFails?: Map<string, { count: number; until: number }> }
).filoStaffFails ??= new Map());

export type StaffLoginResult =
  { ok: true; user: StaffUser } | { ok: false; reason: "invalid" | "locked"; minutes?: number };

export async function checkStaffCredentials(email: string, password: string): Promise<StaffLoginResult> {
  const key = email.trim().toLowerCase();
  const record = fails.get(key);
  if (record && record.until > Date.now()) {
    return { ok: false, reason: "locked", minutes: Math.ceil((record.until - Date.now()) / 60_000) };
  }

  const user = await getMemoryRepository().findStaffByEmail(key);
  decoyHash ??= hashPassword("decoy-password-for-timing");
  const passwordOk = verifyPassword(password, user?.passwordHash ?? decoyHash);
  if (user && user.active && passwordOk) {
    fails.delete(key);
    return { ok: true, user };
  }

  const lockExpired = !!record && record.until > 0 && record.until <= Date.now();
  const count = (lockExpired ? 0 : (record?.count ?? 0)) + 1;
  fails.set(key, { count, until: count >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
  return count >= MAX_FAILS ? { ok: false, reason: "locked", minutes: 15 } : { ok: false, reason: "invalid" };
}
