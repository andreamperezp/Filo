"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeArMobile } from "@/domain/phone";
import { isIsoDate } from "@/domain/time";
import { ANY_PROFESSIONAL } from "@/domain/types";
import * as bookings from "./bookings";
import { getCatalog } from "./catalog";
import { requireClient, requireStaff, staffScope } from "./session";

/**
 * Server Actions = endpoints públicos (cualquiera puede hacerles POST).
 * Por eso cada una: 1) verifica la sesión y el rol, 2) valida la entrada con
 * Zod y 3) delega en la capa de aplicación, que vuelve a chequear permisos
 * (un peluquero solo toca su agenda). Nunca confiar en el formulario.
 */

export type FormState = { error: string | null };

const isoDate = z.string().refine(isIsoDate, "Fecha inválida");
const minute = z.coerce.number().int().min(0).max(1439);
const id = z.string().min(1).max(80);
const professionalChoice = id;

const parse = <T extends z.ZodType>(schema: T, form: FormData) => schema.safeParse(Object.fromEntries(form.entries()));

/* ───────────── Cliente ───────────── */

const createSchema = z.object({
  serviceId: id,
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

const rescheduleSchema = z.object({ bookingId: id, professional: professionalChoice, date: isoDate, start: minute });

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
  const bookingId = id.safeParse(form.get("bookingId"));
  if (!bookingId.success) return { error: "Turno inválido." };

  const result = await bookings.cancelByClient(client.id, bookingId.data);
  if (!result.ok) return { error: result.error };

  revalidatePath("/", "layout");
  return { error: null };
}

/* ───────────── Equipo ───────────── */

export async function staffCancelBooking(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireStaff();
  const bookingId = id.safeParse(form.get("bookingId"));
  if (!bookingId.success) return { error: "Turno inválido." };

  const result = await bookings.cancelByStaff(user, bookingId.data);
  if (!result.ok) return { error: result.error };

  revalidatePath("/", "layout");
  redirect("/panel");
}

export async function staffStartBooking(form: FormData) {
  const user = await requireStaff();
  await bookings.startBooking(user, id.parse(form.get("bookingId")));
  revalidatePath("/", "layout");
}

/** Montos escritos como "12.000", "$ 12000" o "12000": solo cuentan los dígitos. */
const pesos = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\D/g, "") || "0" : v),
    z.coerce.number().int().min(0).max(max, "Revisá el monto."),
  );

const closeSchema = z.object({
  bookingId: id,
  chargedArs: pesos(10_000_000),
  tipArs: pesos(1_000_000),
  channel: z.enum(["cash", "transfer", "card", "mercadopago", "other"], "Elegí cómo pagó."),
  actualDurationMin: z.coerce.number().int().min(5, "La duración mínima es 5 min.").max(600, "Revisá la duración."),
  note: z.string().trim().max(120, "La nota es demasiado larga.").optional(),
});

export type CloseState = { error: string | null; values?: Record<string, string> };

/** "Finalizar y cobrar": registra el cobro (casi siempre por fuera de la app) y la duración real. */
export async function staffCloseBooking(_prev: CloseState, form: FormData): Promise<CloseState> {
  const user = await requireStaff();
  const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const input = parse(closeSchema, form);
  if (!input.success) return { error: input.error.issues[0].message ?? "Revisá los datos.", values };

  const result = await bookings.closeBooking(user, input.data);
  if (!result.ok) return { error: result.error, values };

  revalidatePath("/", "layout");
  redirect(`/panel/turnos/${result.value.id}?cerrado=1`);
}

export async function staffMarkSeen(bookingId: string) {
  const user = await requireStaff();
  await bookings.markSeen(user, id.parse(bookingId));
  revalidatePath("/panel");
}

const blockSchema = z.object({ date: isoDate, professionalId: id, start: minute });

export async function staffToggleBlock(form: FormData) {
  const user = await requireStaff();
  const input = parse(blockSchema, form);
  if (!input.success) return;
  await bookings.toggleBlockedSlot(user, input.data);
  revalidatePath("/", "layout");
}

export async function staffMarkActivityRead() {
  const user = await requireStaff();
  await bookings.markActivityReadFor(user);
  revalidatePath("/panel", "layout");
}

const ALL_PROFESSIONALS = "todos";

const rangeSchema = z.object({
  date: isoDate,
  professionalId: id,
  from: minute,
  to: z.coerce.number().int().min(1).max(1440),
  mode: z.enum(["block", "unblock"]),
});

export type RangeState = { error: string | null; message?: string };

/** Marcar no disponible / disponible un rango o el día completo. */
export async function staffSetRange(_prev: RangeState, form: FormData): Promise<RangeState> {
  const user = await requireStaff();
  const input = parse(rangeSchema, form);
  if (!input.success) return { error: "Revisá el día y las horas." };

  const { date, professionalId, from, to, mode } = input.data;
  const scope = staffScope(user);
  const team = (await getCatalog()).professionals.map((p) => p.id);
  // "Todo el equipo" solo para el admin; un peluquero siempre actúa sobre sí mismo.
  const professionalIds = scope ? [scope] : professionalId === ALL_PROFESSIONALS ? team : [professionalId];
  const result = await bookings.setRangeBlocked(user, { date, professionalIds, from, to, blocked: mode === "block" });
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

/** Horarios libres de un día para el turno rápido (lectura liviana, se pide al tocar el calendario). */
export async function staffQuickSlots(input: {
  serviceId: string;
  durationMin: number;
  professional: string;
  date: string;
}) {
  const user = await requireStaff();
  const parsed = z
    .object({ serviceId: id, durationMin: z.number().int().min(15).max(600), professional: id, date: isoDate })
    .safeParse(input);
  if (!parsed.success) return [];
  return bookings.getQuickSlots(user, parsed.data);
}

const walkInSchema = z.object({
  clientName: z.string().trim().min(2, "Escribí el nombre de la clienta.").max(60),
  phone: z.string().trim().max(30).optional(),
  serviceId: id,
  durationMin: z.coerce.number().int().optional(),
  note: z.string().trim().max(80, "El motivo es demasiado largo.").optional(),
  professional: professionalChoice,
  date: isoDate,
  start: minute,
});

export type WalkInState = { error: string | null; values?: Record<string, string> };

export async function staffQuickBooking(_prev: WalkInState, form: FormData): Promise<WalkInState> {
  const user = await requireStaff();
  const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  if (!form.get("start")) return { error: "Elegí un horario disponible.", values };
  const input = parse(walkInSchema, form);
  if (!input.success) return { error: input.error.issues[0].message ?? "Revisá los datos.", values };

  const rawPhone = input.data.phone ?? "";
  const phone = rawPhone ? normalizeArMobile(rawPhone) : null;
  if (rawPhone && !phone) return { error: "Revisá el celular: código de área + número (ej. 11 5523-8841).", values };
  if (input.data.professional === ANY_PROFESSIONAL && staffScope(user)) {
    return { error: "Elegí con quién.", values };
  }

  const result = await bookings.createWalkInBooking(user, { ...input.data, phone });
  if (!result.ok) return { error: result.error, values };

  revalidatePath("/", "layout");
  redirect(`/panel/turnos/${result.value.id}?nuevo=1`);
}
