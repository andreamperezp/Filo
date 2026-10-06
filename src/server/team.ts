import "server-only";

import { OTHER_SERVICE_ID } from "@/data/catalog";
import { getMemoryRepository } from "@/data/memory-repository";
import { nowIn } from "@/domain/time";
import { PRO_COLORS, type Professional, type StaffRole, type StaffUser } from "@/domain/types";
import { hashPassword, passwordProblem, temporaryPassword, verifyPassword } from "@/lib/password";
import { BUSINESS } from "@/data/catalog";
import type { CommandResult } from "./bookings";
import type { StaffSessionUser } from "./session";

/**
 * Gestión del equipo (solo superadmin): alta de peluqueros con su propio
 * acceso, baja/alta y blanqueo de contraseña. Cada alta crea:
 * - el **profesional** (aparece en la agenda y en la reserva de clientes), y
 * - la **cuenta** para entrar al panel, con contraseña temporal.
 */

const repo = getMemoryRepository;
const fail = (error: string) => ({ ok: false, error }) as const;

/** Lo que puede salir hacia las pantallas: nunca el hash de la contraseña. */
export type PublicStaffUser = Omit<StaffUser, "passwordHash">;

function publicUser(u: StaffUser): PublicStaffUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    professionalId: u.professionalId,
    mustChangePassword: u.mustChangePassword,
    active: u.active,
    createdAt: u.createdAt,
  };
}

export interface TeamMember {
  user: PublicStaffUser;
  professional: Professional | null;
  upcomingBookings: number;
}

export async function listTeam(): Promise<TeamMember[]> {
  const [staff, professionals] = await Promise.all([repo().listStaff(), repo().listProfessionals()]);
  const today = nowIn(BUSINESS.timeZone).date;
  const upcoming = (await repo().listBookings({ from: today, to: "9999-12-31" })).filter(
    (b) => b.status === "confirmed",
  );
  return staff.map((u) => ({
    user: publicUser(u),
    professional: professionals.find((p) => p.id === u.professionalId) ?? null,
    upcomingBookings: upcoming.filter((b) => b.professionalId === u.professionalId).length,
  }));
}

function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "pro"
  );
}

export async function createTeamMember(
  admin: StaffSessionUser,
  input: { name: string; email: string; role: StaffRole; roleLabel: string; attends: boolean; serviceIds: string[] },
): Promise<CommandResult<{ temporaryPassword: string; user: StaffUser }>> {
  if (admin.role !== "admin") return fail("Solo el superadmin puede sumar personas al equipo.");
  const email = input.email.trim().toLowerCase();
  if (await repo().findStaffByEmail(email)) return fail("Ya hay una cuenta con ese email.");
  if (input.attends && input.serviceIds.length === 0) return fail("Elegí al menos un servicio que haga.");

  let professionalId: string | null = null;
  if (input.attends) {
    const team = await repo().listProfessionals();
    const base = slugify(input.name);
    let id = base;
    for (let n = 2; team.some((p) => p.id === id); n++) id = `${base}-${n}`;
    // Color: el primero libre de la paleta; si están todos usados, se reparte en ronda.
    const used = new Set(team.filter((p) => p.active).map((p) => p.colorToken));
    const colorToken = PRO_COLORS.find((c) => !used.has(c)) ?? PRO_COLORS[team.length % PRO_COLORS.length];
    await repo().insertProfessional({
      id,
      name: input.name,
      role: input.roleLabel || (input.role === "admin" ? "Administración" : "Peluquería"),
      colorToken,
      serviceIds: [...new Set([...input.serviceIds, OTHER_SERVICE_ID])],
      active: true,
    });
    professionalId = id;
  }

  const password = temporaryPassword();
  const user: StaffUser = {
    id: `staff-${crypto.randomUUID()}`,
    name: input.name,
    email,
    role: input.role,
    professionalId,
    passwordHash: hashPassword(password),
    mustChangePassword: true,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await repo().insertStaff(user);
  return { ok: true, value: { temporaryPassword: password, user } };
}

/**
 * Baja/alta. La baja no borra nada: la persona deja de poder entrar y, si
 * atiende, deja de ofrecerse para turnos nuevos. Sus turnos ya agendados
 * siguen en la agenda para que el admin los reasigne o avise.
 */
export async function setMemberActive(
  admin: StaffSessionUser,
  staffId: string,
  active: boolean,
): Promise<CommandResult<{ upcomingBookings: number }>> {
  if (admin.role !== "admin") return fail("Solo el superadmin puede hacer esto.");
  if (staffId === admin.id) return fail("No podés desactivar tu propia cuenta.");
  const user = await repo().updateStaff(staffId, { active });
  if (!user) return fail("No encontramos esa cuenta.");
  if (user.professionalId) await repo().updateProfessional(user.professionalId, { active });
  const member = (await listTeam()).find((m) => m.user.id === staffId);
  return { ok: true, value: { upcomingBookings: member?.upcomingBookings ?? 0 } };
}

export async function resetMemberPassword(
  admin: StaffSessionUser,
  staffId: string,
): Promise<CommandResult<{ temporaryPassword: string; name: string }>> {
  if (admin.role !== "admin") return fail("Solo el superadmin puede hacer esto.");
  const password = temporaryPassword();
  const user = await repo().updateStaff(staffId, { passwordHash: hashPassword(password), mustChangePassword: true });
  if (!user) return fail("No encontramos esa cuenta.");
  return { ok: true, value: { temporaryPassword: password, name: user.name } };
}

export async function updateMemberServices(
  admin: StaffSessionUser,
  professionalId: string,
  serviceIds: string[],
): Promise<CommandResult> {
  if (admin.role !== "admin") return fail("Solo el superadmin puede hacer esto.");
  if (serviceIds.length === 0) return fail("Tiene que hacer al menos un servicio.");
  await repo().updateProfessional(professionalId, { serviceIds: [...new Set([...serviceIds, OTHER_SERVICE_ID])] });
  return { ok: true, value: undefined };
}

/** Cambio de la propia contraseña (obligatorio después de una temporal). */
export async function changeOwnPassword(
  user: StaffSessionUser,
  input: { current: string; next: string; confirm: string },
): Promise<CommandResult> {
  const stored = await repo().getStaff(user.id);
  if (!stored) return fail("No encontramos tu cuenta.");
  if (!verifyPassword(input.current, stored.passwordHash)) return fail("La contraseña actual no es correcta.");
  if (input.next !== input.confirm) return fail("Las dos contraseñas nuevas no coinciden.");
  if (input.next === input.current) return fail("La nueva tiene que ser distinta de la actual.");
  const problem = passwordProblem(input.next, { email: stored.email, name: stored.name });
  if (problem) return fail(problem);
  await repo().updateStaff(user.id, { passwordHash: hashPassword(input.next), mustChangePassword: false });
  return { ok: true, value: undefined };
}
