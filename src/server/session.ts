import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMemoryRepository } from "@/data/memory-repository";
import type { StaffRole } from "@/domain/types";
import { isProduction } from "./env";
import { seal, unseal } from "./signed-cookie";

export type Role = "client" | "staff";

const SESSION_COOKIE = "filo_session";
const LOGIN_COOKIE = "filo_login";

/** Clientes: 30 días (entran pocas veces al mes). Equipo: 12 h (dispositivos compartidos en el local). */
const SESSION_TTL: Record<Role, number> = { client: 60 * 60 * 24 * 30, staff: 60 * 60 * 12 };
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

export interface StaffSessionUser {
  id: string;
  name: string;
  firstName: string;
  email: string;
  role: StaffRole;
  /** Profesional que atiende (para filtrar su agenda). */
  professionalId: string | null;
  mustChangePassword: boolean;
}

export type Session = { role: "client"; user: ClientUser } | { role: "staff"; user: StaffSessionUser };

const cookieOptions = (maxAge: number) =>
  ({ httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", maxAge }) as const;

/**
 * Única fuente de verdad sobre quién está usando la app. Se relee el usuario
 * en cada pedido: si el admin desactiva una cuenta, la sesión deja de valer
 * al instante. Al migrar a Supabase Auth solo cambia este archivo.
 */
export async function getSession(): Promise<Session | null> {
  const payload = unseal<SessionPayload>((await cookies()).get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const repo = getMemoryRepository();

  if (payload.role === "staff") {
    const staff = await repo.getStaff(payload.sub);
    if (!staff?.active) return null;
    return {
      role: "staff",
      user: {
        id: staff.id,
        name: staff.name,
        firstName: staff.name.split(" ")[0],
        email: staff.email,
        role: staff.role,
        professionalId: staff.professionalId,
        mustChangePassword: staff.mustChangePassword,
      },
    };
  }

  const client = await repo.getClient(payload.sub);
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

/**
 * Cualquier persona del equipo. Si tiene contraseña temporal, la manda a
 * cambiarla antes de dejarla usar el panel.
 */
export async function requireStaff(options: { allowPasswordChange?: boolean } = {}): Promise<StaffSessionUser> {
  const session = await getSession();
  if (session?.role !== "staff") redirect("/equipo");
  if (session.user.mustChangePassword && !options.allowPasswordChange) redirect("/equipo/clave");
  return session.user;
}

/** Solo superadmin. */
export async function requireAdmin(): Promise<StaffSessionUser> {
  const user = await requireStaff();
  if (user.role !== "admin") redirect("/panel");
  return user;
}

/**
 * Qué profesional puede ver/gestionar esta persona: `null` = todos (admin),
 * o el id de su propio profesional (peluquero).
 */
export function staffScope(user: StaffSessionUser): string | null {
  return user.role === "admin" ? null : (user.professionalId ?? "__none__");
}

export function canManageProfessional(user: StaffSessionUser, professionalId: string): boolean {
  const scope = staffScope(user);
  return scope === null || scope === professionalId;
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
