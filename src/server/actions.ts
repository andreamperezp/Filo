"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeArMobile } from "@/domain/phone";
import { isIsoDate } from "@/domain/time";
import { ANY_PROFESSIONAL } from "@/domain/types";
import { PROFESSIONAL_BY_ID, SERVICE_BY_ID } from "@/data/catalog";
import * as bookings from "./bookings";
import { requireClient, requireOwner } from "./session";

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

const ALL_PROFESSIONALS = "todos";

const rangeSchema = z.object({
  date: isoDate,
  professionalId: z
    .string()
    .refine((v) => v === ALL_PROFESSIONALS || PROFESSIONAL_BY_ID.has(v), "Profesional inválido"),
  from: minute,
  to: z.coerce.number().int().min(1).max(1440),
  mode: z.enum(["block", "unblock"]),
});

export type RangeState = { error: string | null; message?: string };

/** Marcar no disponible / disponible un rango o el día completo (uno o todos los profesionales). */
export async function ownerSetRange(_prev: RangeState, form: FormData): Promise<RangeState> {
  await requireOwner();
  const input = parse(rangeSchema, form);
  if (!input.success) return { error: "Revisá el día y las horas." };

  const { date, professionalId, from, to, mode } = input.data;
  const professionalIds = professionalId === ALL_PROFESSIONALS ? [...PROFESSIONAL_BY_ID.keys()] : [professionalId];
  const result = await bookings.setRangeBlocked({ date, professionalIds, from, to, blocked: mode === "block" });
  if (!result.ok) return { error: result.error };

  revalidatePath("/", "layout");
  const { changed, busy } = result.value;
  if (mode === "unblock") {
    return {
      error: null,
      message: changed
        ? `Listo: ${changed} horarios vuelven a estar disponibles.`
        : "No había horarios bloqueados en ese rango.",
    };
  }
  const busyNote = busy ? ` ${busy} estaban ocupados por turnos y quedaron como estaban.` : "";
  return { error: null, message: `Listo: ${changed} horarios marcados como no disponibles.${busyNote}` };
}

const walkInSchema = z.object({
  clientName: z.string().trim().min(2, "Escribí el nombre de la clienta.").max(60),
  phone: z.string().trim().max(30).optional(),
  serviceId: z.string().refine((v) => SERVICE_BY_ID.has(v), "Elegí un servicio."),
  professional: professionalChoice,
  date: isoDate,
  start: minute,
});

export type WalkInState = { error: string | null; values?: Record<string, string> };

export async function ownerQuickBooking(_prev: WalkInState, form: FormData): Promise<WalkInState> {
  await requireOwner();
  const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  if (!form.get("start")) return { error: "Elegí un horario disponible.", values };
  const input = parse(walkInSchema, form);
  if (!input.success) return { error: input.error.issues[0].message ?? "Revisá los datos.", values };

  const rawPhone = input.data.phone ?? "";
  const phone = rawPhone ? normalizeArMobile(rawPhone) : null;
  if (rawPhone && !phone) return { error: "Revisá el celular: código de área + número (ej. 11 5523-8841).", values };

  const result = await bookings.createWalkInBooking({ ...input.data, phone });
  if (!result.ok) return { error: result.error, values };

  revalidatePath("/", "layout");
  redirect(`/duena/turnos/${result.value.id}?nuevo=1`);
}
