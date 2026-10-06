"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getMemoryRepository } from "@/data/memory-repository";
import { normalizeArMobile } from "@/domain/phone";
import { issueCode, verifyCode } from "./one-time-code";
import { checkStaffCredentials } from "./staff-auth";
import { clearPendingLogin, endSession, getPendingLogin, setPendingLogin, startSession } from "./session";

/**
 * Estado que devuelven los formularios de ingreso. `values` repone lo que la
 * persona escribió cuando hay un error (React limpia el form al enviarlo):
 * nunca hacer que alguien vuelva a tipear todo.
 */
export type AuthState = { error: string | null; values?: Record<string, string> };

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/* ───────────── Cliente: celular + código ───────────── */

export async function requestCode(_prev: AuthState, form: FormData): Promise<AuthState> {
  const raw = field(form, "phone");
  const phone = normalizeArMobile(raw);
  if (!phone) {
    return { error: "Revisá el número: código de área + número, por ejemplo 11 5523-8841.", values: { phone: raw } };
  }

  // Si ya hay un código vigente (pidió hace < 30 s), no se reenvía: se sigue con ese.
  issueCode(phone);
  await setPendingLogin({ phone, step: "code" });
  redirect("/ingresar/codigo");
}

export async function resendCode(): Promise<AuthState> {
  const pending = await getPendingLogin();
  if (!pending) redirect("/");
  const issued = issueCode(pending.phone);
  return issued.ok ? { error: null } : { error: `Esperá ${issued.retryInSeconds} s para pedir otro código.` };
}

const codeSchema = z.string().regex(/^\d{6}$/);

export async function confirmCode(_prev: AuthState, form: FormData): Promise<AuthState> {
  const pending = await getPendingLogin();
  if (!pending) redirect("/");

  const code = field(form, "code").replace(/\D/g, "");
  if (!codeSchema.safeParse(code).success) return { error: "El código tiene 6 números.", values: { code } };

  const result = verifyCode(pending.phone, code);
  if (result === "expired") return { error: "El código venció. Pedí uno nuevo." };
  if (result === "locked") return { error: "Demasiados intentos. Pedí un código nuevo." };
  if (result === "invalid")
    return { error: "El código no es correcto. Revisalo e intentá de nuevo.", values: { code } };

  const client = await getMemoryRepository().findClientByPhone(pending.phone);
  if (client) {
    await startSession("client", client.id);
    redirect("/cliente");
  }
  // Primera vez: falta saber cómo se llama.
  await setPendingLogin({ phone: pending.phone, step: "profile" });
  redirect("/ingresar/datos");
}

const nameSchema = z
  .string()
  .min(2, "Escribí tu nombre y apellido.")
  .max(60, "El nombre es demasiado largo.")
  .regex(/^[\p{L}' .-]+$/u, "Usá solo letras.");

export async function completeProfile(_prev: AuthState, form: FormData): Promise<AuthState> {
  const pending = await getPendingLogin();
  if (pending?.step !== "profile") redirect("/");

  const raw = field(form, "name").replace(/\s+/g, " ");
  const parsed = nameSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: { name: raw } };

  const repo = getMemoryRepository();
  const existing = await repo.findClientByPhone(pending.phone);
  const id = existing?.id ?? crypto.randomUUID();
  if (!existing) {
    await repo.insertClient({ id, name: parsed.data, phone: pending.phone, createdAt: new Date().toISOString() });
  }
  await startSession("client", id);
  redirect("/cliente");
}

export async function changePhone() {
  await clearPendingLogin();
  redirect("/");
}

/* ───────────── Equipo (superadmin y peluqueros): email + contraseña ───────────── */

export async function staffSignIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = field(form, "email");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Completá email y contraseña.", values: { email } };

  const result = await checkStaffCredentials(email, password);
  if (!result.ok) {
    return {
      error:
        result.reason === "locked"
          ? `Por seguridad bloqueamos el ingreso por ${result.minutes} min. Probá más tarde.`
          : "Email o contraseña incorrectos.",
      values: { email },
    };
  }
  await startSession("staff", result.user.id);
  redirect(result.user.mustChangePassword ? "/equipo/clave" : "/panel");
}

/* ───────────── Ambos ───────────── */

export async function signOut() {
  await endSession();
  redirect("/");
}
