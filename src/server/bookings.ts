import "server-only";

import { connection } from "next/server";
import {
  bookingWindow,
  firstAvailable,
  freeSlotCount,
  isBusy,
  isClosed,
  dayGrid,
  slotsForDay,
  type AgendaSnapshot,
  type Now,
} from "@/domain/availability";
import { clientCanModify, ownerCanMarkAttended } from "@/domain/policies";
import { addDays, formatRelativeDay, formatTime, minutesUntil, nowIn } from "@/domain/time";
import {
  ANY_PROFESSIONAL,
  type Booking,
  type IsoDate,
  type MinuteOfDay,
  type PaymentMethod,
  type ProfessionalChoice,
  type Service,
} from "@/domain/types";
import { BUSINESS, PROFESSIONAL_BY_ID, SERVICE_BY_ID } from "@/data/catalog";
import { getMemoryRepository } from "@/data/memory-repository";
import type { Repository } from "@/data/repository";

/**
 * Capa de aplicación: orquesta repositorio + reglas de dominio. Las pantallas
 * (Server Components) leen con las funciones `get*` y las Server Actions
 * mutan con los comandos de abajo. Ningún componente toca el repositorio.
 */

const repo: () => Repository = getMemoryRepository;

export async function currentNow(): Promise<Now> {
  await connection(); // fuerza render dinámico: la agenda cambia todo el tiempo
  return nowIn(BUSINESS.timeZone);
}

async function agendaFor(today: IsoDate): Promise<AgendaSnapshot> {
  const range = { from: today, to: addDays(today, BUSINESS.bookingWindowDays) };
  const [bookings, blocked] = await Promise.all([repo().listBookings(range), repo().listBlocked(range)]);
  return { bookings, blocked };
}

export function serviceOrNull(id: string | undefined): Service | null {
  return (id && SERVICE_BY_ID.get(id)) || null;
}

export function professionalName(choice: ProfessionalChoice): string {
  return choice === ANY_PROFESSIONAL ? "Cualquiera disponible" : (PROFESSIONAL_BY_ID.get(choice)?.name ?? "");
}

export function describeWhen(b: Pick<Booking, "date" | "start">, today: IsoDate): string {
  return `${formatRelativeDay(b.date, today)} · ${formatTime(b.start)}`;
}

/* ───────────────────────────── Cliente ───────────────────────────── */

export async function getClientBookings(clientId: string) {
  const now = await currentNow();
  const mine = await repo().listClientBookings(clientId);
  const isUpcoming = (b: Booking) => b.status === "confirmed" && minutesUntil(now, b) > 0;
  const byDate = (a: Booking, b: Booking) => a.date.localeCompare(b.date) || a.start - b.start;
  return {
    now,
    upcoming: mine
      .filter(isUpcoming)
      .sort(byDate)
      .map((b) => ({ ...b, canModify: clientCanModify(BUSINESS, b, now) })),
    past: mine.filter((b) => !isUpcoming(b)).sort((a, b) => byDate(b, a)),
  };
}

export async function getProfessionalOptions(service: Service) {
  const now = await currentNow();
  const agenda = await agendaFor(now.date);
  const base = { business: BUSINESS, services: SERVICE_BY_ID, agenda, now, service };
  const choices: ProfessionalChoice[] = [ANY_PROFESSIONAL, ...service.professionalIds];
  return {
    now,
    options: choices.map((choice) => ({
      choice,
      professional: choice === ANY_PROFESSIONAL ? null : PROFESSIONAL_BY_ID.get(choice)!,
      next: firstAvailable({ ...base, professional: choice }),
    })),
  };
}

export async function getAvailability(input: {
  service: Service;
  professional: ProfessionalChoice;
  date?: IsoDate;
  ignoreBookingId?: string;
}) {
  const now = await currentNow();
  const agenda = await agendaFor(now.date);
  const base = {
    business: BUSINESS,
    services: SERVICE_BY_ID,
    agenda,
    now,
    service: input.service,
    professional: input.professional,
    ignoreBookingId: input.ignoreBookingId,
  };
  const window = bookingWindow(BUSINESS, now.date);
  const date = input.date && window.includes(input.date) ? input.date : (firstAvailable(base)?.date ?? now.date);

  return {
    now,
    date,
    days: window.map((d) => ({
      date: d,
      closed: isClosed(BUSINESS, d),
      free: isClosed(BUSINESS, d) ? 0 : freeSlotCount({ ...base, date: d }),
    })),
    slots: slotsForDay({ ...base, date }),
  };
}

/* ───────────────────────────── Dueña ───────────────────────────── */

export type AgendaRow =
  | { kind: "booking"; booking: Booking }
  | { kind: "free"; start: MinuteOfDay }
  | { kind: "blocked"; start: MinuteOfDay };

export async function getOwnerDay(date: IsoDate, professionalId: string | null) {
  const now = await currentNow();
  const window = bookingWindow(BUSINESS, now.date);
  const day = window.includes(date) ? date : now.date;
  const agenda = await agendaFor(now.date);
  const active = agenda.bookings.filter((b) => b.date === day && b.status !== "cancelled");
  const visible = professionalId ? active.filter((b) => b.professionalId === professionalId) : active;

  let rows: AgendaRow[];
  if (!professionalId) {
    rows = visible
      .sort((a, b) => a.start - b.start || a.professionalId.localeCompare(b.professionalId))
      .map((booking) => ({ kind: "booking", booking }));
  } else {
    // Vista por profesional: grilla completa con huecos libres y bloqueados.
    rows = [];
    let skipUntil = 0;
    for (const start of dayGrid(BUSINESS, day)) {
      if (start < skipUntil) continue;
      const booking = visible.find((b) => b.start === start);
      if (booking) {
        rows.push({ kind: "booking", booking });
        skipUntil = start + (SERVICE_BY_ID.get(booking.serviceId)?.durationMin ?? BUSINESS.slotMin);
        continue;
      }
      if (minutesUntil(now, { date: day, start }) <= 0) continue;
      const blocked = agenda.blocked.some(
        (s) => s.date === day && s.professionalId === professionalId && s.start === start,
      );
      rows.push({ kind: blocked ? "blocked" : "free", start });
    }
  }

  return {
    now,
    date: day,
    closed: isClosed(BUSINESS, day),
    rows,
    bookingCount: visible.length,
    days: window.map((d) => ({
      date: d,
      closed: isClosed(BUSINESS, d),
      count: agenda.bookings.filter((b) => b.date === d && b.status !== "cancelled").length,
    })),
  };
}

export async function getBookingDetail(id: string) {
  const now = await currentNow();
  const booking = await repo().getBooking(id);
  if (!booking) return null;
  return { now, booking, canMarkAttended: ownerCanMarkAttended(booking, now) };
}

export async function getActivity() {
  await connection();
  return repo().listActivity();
}

export async function getUnreadActivityCount(): Promise<number> {
  await connection();
  return (await repo().listActivity()).filter((a) => !a.read).length;
}

/* ───────────────────────────── Comandos ───────────────────────────── */

export type CommandResult<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false, error }) as const;

async function logActivity(kind: "created" | "cancelled" | "rescheduled", booking: Booking, title: string, now: Now) {
  await repo().insertActivity({
    id: crypto.randomUUID(),
    kind,
    bookingId: booking.id,
    title,
    detail: `${describeWhen(booking, now.date)} · ${PROFESSIONAL_BY_ID.get(booking.professionalId)?.name}`,
    at: new Date().toISOString(),
    read: false,
  });
}

/**
 * Elige profesional y revalida disponibilidad *dentro* de la transacción:
 * entre que el cliente vio el horario y confirmó, otra persona pudo tomarlo.
 */
function resolveProfessional(
  agenda: AgendaSnapshot,
  service: Service,
  choice: ProfessionalChoice,
  date: IsoDate,
  start: MinuteOfDay,
  now: Now,
  ignoreBookingId?: string,
) {
  const slot = slotsForDay({
    business: BUSINESS,
    services: SERVICE_BY_ID,
    agenda,
    now,
    service,
    professional: choice,
    date,
    ignoreBookingId,
  }).find((s) => s.start === start);
  return slot?.assignTo ?? null;
}

export async function createBooking(input: {
  client: { id: string; name: string; phone: string };
  serviceId: string;
  professional: ProfessionalChoice;
  date: IsoDate;
  start: MinuteOfDay;
  payment: PaymentMethod;
}): Promise<CommandResult<Booking>> {
  const service = serviceOrNull(input.serviceId);
  if (!service) return fail("El servicio no existe.");
  if (input.professional !== ANY_PROFESSIONAL && !service.professionalIds.includes(input.professional)) {
    return fail("Ese profesional no hace este servicio.");
  }

  return repo().transaction(async () => {
    const now = nowIn(BUSINESS.timeZone);
    const agenda = await agendaFor(now.date);
    const assignTo = resolveProfessional(agenda, service, input.professional, input.date, input.start, now);
    if (!assignTo) return fail("Ese horario se acaba de ocupar. Elegí otro, por favor.");

    const booking: Booking = {
      id: crypto.randomUUID(),
      date: input.date,
      start: input.start,
      serviceId: service.id,
      professionalId: assignTo,
      clientId: input.client.id,
      clientName: input.client.name,
      clientPhone: input.client.phone,
      payment: input.payment,
      status: "confirmed",
      unseenByOwner: true,
      createdAt: new Date().toISOString(),
    };
    await repo().insertBooking(booking);
    await logActivity("created", booking, `${booking.clientName} reservó ${service.name}`, now);
    return { ok: true, value: booking } as const;
  });
}

export async function rescheduleBooking(input: {
  clientId: string;
  bookingId: string;
  professional: ProfessionalChoice;
  date: IsoDate;
  start: MinuteOfDay;
}): Promise<CommandResult<Booking>> {
  return repo().transaction(async () => {
    const now = nowIn(BUSINESS.timeZone);
    const booking = await repo().getBooking(input.bookingId);
    if (!booking || booking.clientId !== input.clientId) return fail("No encontramos ese turno.");
    if (!clientCanModify(BUSINESS, booking, now)) {
      return fail(`Faltan menos de ${BUSINESS.freeCancellationHours} h. Escribinos por WhatsApp para cambiarlo.`);
    }
    const service = serviceOrNull(booking.serviceId)!;
    const agenda = await agendaFor(now.date);
    const assignTo = resolveProfessional(agenda, service, input.professional, input.date, input.start, now, booking.id);
    if (!assignTo) return fail("Ese horario se acaba de ocupar. Elegí otro, por favor.");

    const updated = (await repo().updateBooking(booking.id, {
      date: input.date,
      start: input.start,
      professionalId: assignTo,
      unseenByOwner: true,
    }))!;
    await logActivity("rescheduled", updated, `${updated.clientName} cambió su turno`, now);
    return { ok: true, value: updated } as const;
  });
}

export async function cancelByClient(clientId: string, bookingId: string): Promise<CommandResult> {
  return repo().transaction(async () => {
    const now = nowIn(BUSINESS.timeZone);
    const booking = await repo().getBooking(bookingId);
    if (!booking || booking.clientId !== clientId) return fail("No encontramos ese turno.");
    if (!clientCanModify(BUSINESS, booking, now)) {
      return fail(`Faltan menos de ${BUSINESS.freeCancellationHours} h. Escribinos por WhatsApp para cancelarlo.`);
    }
    await repo().updateBooking(bookingId, { status: "cancelled" });
    await logActivity(
      "cancelled",
      booking,
      `${booking.clientName} canceló ${serviceOrNull(booking.serviceId)?.name}`,
      now,
    );
    return { ok: true, value: undefined } as const;
  });
}

export async function cancelByOwner(bookingId: string): Promise<CommandResult> {
  const now = nowIn(BUSINESS.timeZone);
  const booking = await repo().getBooking(bookingId);
  if (!booking || booking.status !== "confirmed") return fail("El turno ya no está activo.");
  await repo().updateBooking(bookingId, { status: "cancelled", unseenByOwner: false });
  await repo().insertActivity({
    id: crypto.randomUUID(),
    kind: "cancelled",
    bookingId,
    title: `Cancelaste el turno de ${booking.clientName}`,
    detail: `${describeWhen(booking, now.date)} · se le avisó por WhatsApp`,
    at: new Date().toISOString(),
    read: true,
  });
  return { ok: true, value: undefined };
}

export async function markAttended(bookingId: string): Promise<CommandResult> {
  const now = nowIn(BUSINESS.timeZone);
  const booking = await repo().getBooking(bookingId);
  if (!booking || !ownerCanMarkAttended(booking, now)) return fail("Todavía no se puede marcar como atendido.");
  await repo().updateBooking(bookingId, { status: "attended" });
  return { ok: true, value: undefined };
}

export async function markSeen(bookingId: string) {
  await repo().updateBooking(bookingId, { unseenByOwner: false });
}

export async function toggleBlockedSlot(slot: { date: IsoDate; professionalId: string; start: MinuteOfDay }) {
  const now = nowIn(BUSINESS.timeZone);
  const agenda = await agendaFor(now.date);
  if (
    isBusy(
      { ...agenda, blocked: [] },
      SERVICE_BY_ID,
      BUSINESS,
      slot.professionalId,
      slot.date,
      slot.start,
      BUSINESS.slotMin,
    )
  ) {
    return fail("Ese horario ya tiene un turno.");
  }
  await repo().toggleBlocked(slot);
  return { ok: true, value: undefined } as const;
}

export async function markActivityRead() {
  await repo().markAllActivityRead();
}
