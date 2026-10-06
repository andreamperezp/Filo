import "server-only";

import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Contraseñas del equipo con scrypt (función lenta a propósito, resistente a
 * fuerza bruta con GPU) y sal aleatoria por usuario. Se guarda `sal:hash`;
 * la contraseña en texto nunca se persiste ni se loguea.
 */
const KEY_LENGTH = 64;
const COST = { N: 16384, r: 8, p: 1 };

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, KEY_LENGTH, COST).toString("base64url");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, salt, KEY_LENGTH, COST);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Contraseña temporal legible para dictar o mandar por WhatsApp: sin
 * caracteres ambiguos (0/O, 1/l/I). 12 caracteres ≈ 70 bits de entropía.
 */
export function temporaryPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const chars = Array.from({ length: 12 }, () => alphabet[randomInt(alphabet.length)]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8).join("")}`;
}

/** Reglas mínimas (NIST 800-63B): largo antes que símbolos raros. */
export function passwordProblem(password: string, context: { email: string; name: string }): string | null {
  if (password.length < 10) return "Usá al menos 10 caracteres.";
  if (password.length > 128) return "Es demasiado larga.";
  const lower = password.toLowerCase();
  if (lower.includes(context.email.split("@")[0].toLowerCase()) || lower.includes(context.name.toLowerCase())) {
    return "No uses tu nombre ni tu email en la contraseña.";
  }
  if (/^(.)\1+$/.test(password) || /^(0123456789|1234567890|qwertyuiop)/.test(lower)) {
    return "Es demasiado fácil de adivinar.";
  }
  return null;
}
