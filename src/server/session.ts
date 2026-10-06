import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OWNER } from "@/data/catalog";
import { getMemoryRepository } from "@/data/memory-repository";
import { isProduction } from "./env";
import { seal, unseal } from "./signed-cookie";

export type Role = "client" | "owner";

const SESSION_COOKIE = "filo_session";
const LOGIN_COOKIE = "filo_login";

/** El cliente queda logueado 30 días (entra pocas veces al mes); la dueña, 12 h (dispositivo compartido en el local). */
const SESSION_TTL: Record<Role, number> = { client: 60 * 60 * 24 * 30, owner: 60 * 60 * 12 };
const LOGIN_TTL = 60 * 15;

interface SessionPayload {
  role: Role;
  sub: string;
}

export interface ClientUser {
  id: string;
  name: string;
  firstName: string;
  phone: string;
}

export type Session = { role: "client"; user: ClientUser } | { role: "owner"; user: typeof OWNER };

const cookieOptions = (maxAge: number) =>
  ({ httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", maxAge }) as const;

/**
 * Única fuente de verdad sobre quién está usando la app. Al migrar a Supabase
 * Auth solo cambia este archivo: el resto pide `requireClient()` o `requireOwner()`.
 */
export async function getSession(): Promise<Session | null> {
  const payload = unseal<SessionPayload>((await cookies()).get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  if (payload.role === "owner") return payload.sub === OWNER.id ? { role: "owner", user: OWNER } : null;

  const client = await getMemoryRepository().getClient(payload.sub);
  if (!client) return null;
  return {
    role: "client",
    user: { id: client.id, name: client.name, firstName: client.name.split(" ")[0], phone: client.phone },
  };
}

export async function startSession(role: Role, userId: string) {
  const jar = await cookies();
  jar.set(
    SESSION_COOKIE,
    seal<SessionPayload>({ role, sub: userId }, SESSION_TTL[role]),
    cookieOptions(SESSION_TTL[role]),
  );
  jar.delete(LOGIN_COOKIE);
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function requireClient(): Promise<ClientUser> {
  const session = await getSession();
  if (session?.role !== "client") redirect("/");
  return session.user;
}

export async function requireOwner() {
  const session = await getSession();
  if (session?.role !== "owner") redirect("/equipo");
  return session.user;
}

/* ───────── Login en curso del cliente (entre pedir el código y terminar) ───────── */

/**
 * El teléfono que se está verificando viaja en una cookie firmada y no en la
 * URL: los datos personales no deben quedar en el historial ni en logs.
 */
export interface PendingLogin {
  phone: string;
  /** `code`: falta ingresar el código · `profile`: código ok, falta el nombre (cliente nuevo). */
  step: "code" | "profile";
}

export async function getPendingLogin(): Promise<PendingLogin | null> {
  return unseal<PendingLogin>((await cookies()).get(LOGIN_COOKIE)?.value);
}

export async function setPendingLogin(login: PendingLogin) {
  (await cookies()).set(LOGIN_COOKIE, seal(login, LOGIN_TTL), cookieOptions(LOGIN_TTL));
}

export async function clearPendingLogin() {
  (await cookies()).delete(LOGIN_COOKIE);
}
