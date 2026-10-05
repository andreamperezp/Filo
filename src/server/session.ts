import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_CLIENT, DEMO_OWNER } from "@/data/catalog";

export type Role = "client" | "owner";

export const ROLE_COOKIE = "filo_role";

export type Session = { role: "client"; user: typeof DEMO_CLIENT } | { role: "owner"; user: typeof DEMO_OWNER };

/**
 * Sesión de demo basada en una cookie. Al conectar Supabase Auth, esta es la
 * única función que cambia: el resto de la app solo pide `requireClient()` o
 * `requireOwner()`.
 */
export async function getSession(): Promise<Session | null> {
  const role = (await cookies()).get(ROLE_COOKIE)?.value;
  if (role === "client") return { role, user: DEMO_CLIENT };
  if (role === "owner") return { role, user: DEMO_OWNER };
  return null;
}

export async function requireClient() {
  const session = await getSession();
  if (session?.role !== "client") redirect("/");
  return session.user;
}

export async function requireOwner() {
  const session = await getSession();
  if (session?.role !== "owner") redirect("/");
  return session.user;
}
