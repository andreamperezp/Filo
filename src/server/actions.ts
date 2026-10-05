"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isIsoDate } from "@/domain/time";
import { ANY_PROFESSIONAL } from "@/domain/types";
import { PROFESSIONAL_BY_ID, SERVICE_BY_ID } from "@/data/catalog";
import * as bookings from "./bookings";
import { ROLE_COOKIE, requireClient, requireOwner } from "./session";

/**
 * Server Actions = endpoints públicos (cualquiera puede hacerles POST).
 * Por eso cada una: 1) verifica la sesión y el rol, 2) valida la entrada con
 * Zod y 3) delega en la capa de aplicación. Nunca confiar en el formulario.
 */

export type FormState = { error: string | null };

const isoDate = z.string().refine(isIsoDate, "Fecha inválida");
const minute = z.coerce.number().int().min(0).max(1439);
const professionalChoice = z
  .string()
  .refine((v) => v === ANY_PROFESSIONAL || PROFESSIONAL_BY_ID.has(v), "Profesional inválido");
const bookingId = z.string().min(1).max(64);

const parse = <T extends z.ZodType>(schema: T, form: FormData) => schema.safeParse(Object.fromEntries(form.entries()));

/* ───────────── Demo: elegir rol ───────────── */

export async function enterAs(form: FormData) {
  const role = z.enum(["client", "owner"]).parse(form.get("role"));
  (await cookies()).set(ROLE_COOKIE, role, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(role === "client" ? "/cliente" : "/duena");
}

export async function signOut() {
  (await cookies()).delete(ROLE_COOKIE);
  redirect("/");
}

/* ───────────── Cliente ───────────── */

const createSchema = z.object({
  serviceId: z.string().refine((v) => SERVICE_BY_ID.has(v), "Servicio inválido"),
  professional: professionalChoice,
  date: isoDate,
  start: minute,
  payment: z.enum(["in_store", "deposit"]),
});

export async function confirmBooking(_prev: FormState, form: FormData): Promise<FormState> {
  const client = await requireClient();
  const input = parse(createSchema, form);
  if (!input.success) return { error: "Revisá los datos del turno." };

  // TODO(pagos): si payment === "deposit", crear preferencia de Mercado Pago y
  // confirmar el turno recién en el webhook `payment.approved`.
  const result = await bookings.createBooking({ ...input.data, client });
  if (!result.ok) return { error: result.error };

  revalidatePath("/", "layout");
  redirect(`/cliente/reservar/listo?turno=${result.value.id}`);
}

const rescheduleSchema = z.object({
  bookingId,
  professional: professionalChoice,
  date: isoDate,
  start: minute,
});

export async function confirmReschedule(_prev: FormState, form: FormData): Promise<FormState> {
  const client = await requireClient();
  const input = parse(rescheduleSchema, form);
  if (!input.success) return { error: "Revisá los datos del turno." };

  const result = await bookings.rescheduleBooking({ ...input.data, clientId: client.id });
  if (!result.ok) return { error: result.error };

  revalidatePath("/", "layout");
  redirect(`/cliente/reservar/listo?turno=${result.value.id}&cambio=1`);
}

export async function cancelMyBooking(_prev: FormState, form: FormData): Promise<FormState> {
  const client = await requireClient();
  const id = bookingId.safeParse(form.get("bookingId"));
  if (!id.success) return { error: "Turno inválido." };

  const result = await bookings.cancelByClient(client.id, id.data);
  if (!result.ok) return { error: result.error };

  revalidatePath("/", "layout");
  return { error: null };
}

/* ───────────── Dueña ───────────── */

export async function ownerCancelBooking(_prev: FormState, form: FormData): Promise<FormState> {
  await requireOwner();
  const id = bookingId.safeParse(form.get("bookingId"));
  if (!id.success) return { error: "Turno inválido." };

  const result = await bookings.cancelByOwner(id.data);
  if (!result.ok) return { error: result.error };

  revalidatePath("/", "layout");
  redirect("/duena");
}

export async function ownerMarkAttended(form: FormData) {
  await requireOwner();
  const id = bookingId.parse(form.get("bookingId"));
  await bookings.markAttended(id);
  revalidatePath("/", "layout");
}

export async function ownerMarkSeen(id: string) {
  await requireOwner();
  await bookings.markSeen(bookingId.parse(id));
  revalidatePath("/duena");
}

const blockSchema = z.object({ date: isoDate, professionalId: z.string(), start: minute });

export async function ownerToggleBlock(form: FormData) {
  await requireOwner();
  const input = parse(blockSchema, form);
  if (!input.success || !PROFESSIONAL_BY_ID.has(input.data.professionalId)) return;
  await bookings.toggleBlockedSlot(input.data);
  revalidatePath("/", "layout");
}

export async function ownerMarkActivityRead() {
  await requireOwner();
  await bookings.markActivityRead();
  revalidatePath("/duena", "layout");
}
