import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { env, isDemo } from "./env";

/**
 * Códigos de un solo uso para ingresar con el celular (sin contraseña).
 *
 * Sin estado en el servidor: el código viaja como HMAC (no en texto) dentro
 * de la cookie firmada del login en curso. Así funciona en Vercel, donde cada
 * pedido puede caer en una instancia distinta y la memoria no se comparte.
 *
 * - 6 dígitos aleatorios criptográficamente seguros.
 * - Se guarda HMAC(secreto, celular + código): sin el secreto del servidor no
 *   se puede adivinar el código leyendo la cookie.
 * - Vence a los 5 minutos y admite 5 intentos; reenvío cada 30 segundos.
 *
 * Límite conocido: el contador de intentos vive en la cookie, así que alguien
 * que reutilice una cookie vieja podría reintentar. Con la base de datos
 * (fase 2) el contador pasa al servidor.
 */
const CODE_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
export const RESEND_AFTER_S = 30;

export interface CodeState {
  hash: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
  /** Solo en modo demo, para mostrarlo en pantalla (no hay proveedor de SMS). */
  demoCode?: string;
}

const digest = (phone: string, code: string) =>
  createHmac("sha256", env().SESSION_SECRET).update(`${phone}:${code}`).digest("base64url");

export type IssueResult = { ok: true; state: CodeState } | { ok: false; retryInSeconds: number };

export function issueCode(phone: string, previous?: CodeState): IssueResult {
  const wait = secondsUntilResend(previous);
  if (wait > 0) return { ok: false, retryInSeconds: wait };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // TODO(fase 3): enviar por WhatsApp Cloud API con la plantilla "codigo_ingreso".
  return {
    ok: true,
    state: {
      hash: digest(phone, code),
      expiresAt: Date.now() + CODE_TTL_MS,
      sentAt: Date.now(),
      attempts: 0,
      demoCode: isDemo ? code : undefined,
    },
  };
}

export type VerifyResult = "ok" | "invalid" | "expired" | "locked";

/** Devuelve el resultado y el estado actualizado (con el intento sumado). */
export function verifyCode(
  phone: string,
  code: string,
  state: CodeState | undefined,
): { result: VerifyResult; state?: CodeState } {
  if (!state || state.expiresAt < Date.now()) return { result: "expired" };
  if (state.attempts >= MAX_ATTEMPTS) return { result: "locked", state };

  const next = { ...state, attempts: state.attempts + 1 };
  const expected = Buffer.from(state.hash);
  const actual = Buffer.from(digest(phone, code));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { result: next.attempts >= MAX_ATTEMPTS ? "locked" : "invalid", state: next };
  }
  return { result: "ok" };
}

export function secondsUntilResend(state: CodeState | undefined): number {
  return state ? Math.max(0, Math.ceil((state.sentAt + RESEND_AFTER_S * 1000 - Date.now()) / 1000)) : 0;
}

/** Código visible en modo demo. Siempre `undefined` fuera de demo. */
export function demoCodeOf(state: CodeState | undefined): string | undefined {
  return isDemo ? state?.demoCode : undefined;
}
