import "server-only";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { isProduction } from "./env";

/**
 * Códigos de un solo uso para ingresar con el celular (sin contraseña).
 *
 * - 6 dígitos aleatorios criptográficamente seguros.
 * - Se guarda solo el hash, nunca el código.
 * - Vencen a los 5 minutos y admiten 5 intentos.
 * - Reenvío limitado a uno cada 30 segundos.
 *
 * En memoria para la demo; en producción va en la base (o lo resuelve
 * Supabase Auth con OTP por SMS/WhatsApp).
 */
const CODE_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
export const RESEND_AFTER_S = 30;

interface Entry {
  hash: Buffer;
  expiresAt: number;
  sentAt: number;
  attempts: number;
  /** Solo en desarrollo, para mostrarlo en pantalla (no hay proveedor de SMS). */
  devCode?: string;
}

const store = ((globalThis as unknown as { filoCodes?: Map<string, Entry> }).filoCodes ??= new Map());

const hash = (code: string) => createHash("sha256").update(code).digest();

export type IssueResult = { ok: true } | { ok: false; retryInSeconds: number };

export function issueCode(phone: string): IssueResult {
  const prev = store.get(phone);
  const wait = prev ? Math.ceil((prev.sentAt + RESEND_AFTER_S * 1000 - Date.now()) / 1000) : 0;
  if (wait > 0) return { ok: false, retryInSeconds: wait };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  store.set(phone, {
    hash: hash(code),
    expiresAt: Date.now() + CODE_TTL_MS,
    sentAt: Date.now(),
    attempts: 0,
    devCode: isProduction ? undefined : code,
  });
  // TODO(fase 3): enviar por WhatsApp Cloud API con la plantilla "codigo_ingreso".
  return { ok: true };
}

export type VerifyResult = "ok" | "invalid" | "expired" | "locked";

export function verifyCode(phone: string, code: string): VerifyResult {
  const entry = store.get(phone);
  if (!entry || entry.expiresAt < Date.now()) return "expired";
  if (entry.attempts >= MAX_ATTEMPTS) return "locked";

  entry.attempts++;
  if (!timingSafeEqual(entry.hash, hash(code))) return entry.attempts >= MAX_ATTEMPTS ? "locked" : "invalid";

  store.delete(phone);
  return "ok";
}

export function secondsUntilResend(phone: string): number {
  const entry = store.get(phone);
  return entry ? Math.max(0, Math.ceil((entry.sentAt + RESEND_AFTER_S * 1000 - Date.now()) / 1000)) : 0;
}

/** Código visible en modo demo. Siempre `undefined` en producción. */
export function devCodeFor(phone: string): string | undefined {
  return isProduction ? undefined : store.get(phone)?.devCode;
}
