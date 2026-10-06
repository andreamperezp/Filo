"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireStaff } from "./session";
import * as team from "./team";

/**
 * Acciones de gestión del equipo. Todas exigen superadmin (salvo cambiar la
 * propia contraseña). Las contraseñas temporales se devuelven UNA vez para
 * mostrarlas en pantalla: no se guardan en texto ni se pueden volver a ver.
 */

export type TeamState = {
  error: string | null;
  /** Contraseña temporal recién generada, para mostrarla una sola vez. */
  credentials?: { name: string; email: string; password: string };
  message?: string;
  values?: Record<string, string>;
};

const memberSchema = z.object({
  name: z.string().trim().min(2, "Escribí el nombre.").max(60),
  email: z.email("Revisá el email.").trim().max(120),
  role: z.enum(["admin", "professional"]),
  roleLabel: z.string().trim().max(40).optional(),
  attends: z.enum(["on"]).optional(),
});

export async function addTeamMember(_prev: TeamState, form: FormData): Promise<TeamState> {
  const admin = await requireAdmin();
  const values = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") };
  const input = memberSchema.safeParse(Object.fromEntries(form.entries()));
  if (!input.success) return { error: input.error.issues[0].message, values };

  const result = await team.createTeamMember(admin, {
    ...input.data,
    roleLabel: input.data.roleLabel ?? "",
    attends: input.data.role === "professional" || input.data.attends === "on",
    serviceIds: form.getAll("serviceIds").map(String),
  });
  if (!result.ok) return { error: result.error, values };

  revalidatePath("/", "layout");
  const { user, temporaryPassword } = result.value;
  return { error: null, credentials: { name: user.name, email: user.email, password: temporaryPassword } };
}

const staffId = z.string().min(1).max(80);

export async function toggleTeamMember(_prev: TeamState, form: FormData): Promise<TeamState> {
  const admin = await requireAdmin();
  const target = staffId.safeParse(form.get("staffId"));
  if (!target.success) return { error: "Cuenta inválida." };
  const active = form.get("active") === "true";

  const result = await team.setMemberActive(admin, target.data, active);
  if (!result.ok) return { error: result.error };

  revalidatePath("/", "layout");
  const pending = result.value.upcomingBookings;
  return {
    error: null,
    message: active
      ? "Cuenta reactivada."
      : `Cuenta desactivada.${pending ? ` Tiene ${pending} turnos próximos en la agenda: reasignalos o avisá a las clientas.` : ""}`,
  };
}

export async function resetTeamPassword(_prev: TeamState, form: FormData): Promise<TeamState> {
  const admin = await requireAdmin();
  const target = staffId.safeParse(form.get("staffId"));
  if (!target.success) return { error: "Cuenta inválida." };

  const result = await team.resetMemberPassword(admin, target.data);
  if (!result.ok) return { error: result.error };
  return {
    error: null,
    credentials: {
      name: result.value.name,
      email: String(form.get("email") ?? ""),
      password: result.value.temporaryPassword,
    },
  };
}

export async function saveMemberServices(_prev: TeamState, form: FormData): Promise<TeamState> {
  const admin = await requireAdmin();
  const professionalId = staffId.safeParse(form.get("professionalId"));
  if (!professionalId.success) return { error: "Profesional inválido." };

  const result = await team.updateMemberServices(admin, professionalId.data, form.getAll("serviceIds").map(String));
  if (!result.ok) return { error: result.error };

  revalidatePath("/", "layout");
  return { error: null, message: "Servicios actualizados." };
}

export async function changeMyPassword(_prev: TeamState, form: FormData): Promise<TeamState> {
  const user = await requireStaff({ allowPasswordChange: true });
  const result = await team.changeOwnPassword(user, {
    current: String(form.get("current") ?? ""),
    next: String(form.get("next") ?? ""),
    confirm: String(form.get("confirm") ?? ""),
  });
  if (!result.ok) return { error: result.error };
  redirect("/panel");
}
