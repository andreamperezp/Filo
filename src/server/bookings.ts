import "server-only";

import { connection } from "next/server";
import {
  bookingWindow,
  dayGrid,
  firstAvailable,
  freeSlotCount,
  isBusy,
  isClosed,
  planBlockRange,
  slotsForDay,
  type AgendaSnapshot,
  type Now,
} from "@/domain/availability";
import { periodRange, summarizeEarnings, type Period } from "@/domain/earnings";
import { formatMoney } from "@/domain/money";
import {
  canClose,
  canStart,
  clientCanModify,
  depositAmount,
  suggestedCharge,
  suggestedDuration,
} from "@/domain/policies";
import { addDays, formatRelativeDay, formatTime, minutesUntil, nowIn } from "@/domain/time";
import {
  ANY_PROFESSIONAL,
  type ActivityEvent,
  type Booking,
  type IsoDate,
  type MinuteOfDay,
  type PaymentChannel,
  type PaymentMethod,
  type ProfessionalChoice,
  type Service,
} from "@/domain/types";
import { BUSINESS, OTHER_DURATIONS, STAFF_BOOKING_WINDOW_DAYS } from "@/data/catalog";
import { getMemoryRepository } from "@/data/memory-repository";
import type { Repository } from "@/data/repository";
import { comboKey } from "@/lib/combo-key";
import { getCatalog, type Catalog } from "./catalog";
import { canManageProfessional, staffScope, type StaffSessionUser } from "./session";

/**
 * Capa de aplicación: orquesta repositorio + reglas de dominio. Las pantallas
 * (Server Components) leen con las funciones `get*` y las Server Actions
 * mutan con los comandos de abajo. Ningún componente toca el repositorio.
 *
 * Los permisos del equipo se verifican ACÁ (no solo en la pantalla): un
 * peluquero solo puede ver y modificar turnos de su propia agenda.
 */

const repo: () => Repository = getMemoryRepository;

export async function currentNow(): Promise<Now> {
  await connection(); // fuerza render dinámico: la agenda cambia todo el tiempo
  return nowIn(BUSINESS.timeZone);
}

async function agendaFor(today: IsoDate, days = STAFF_BOOKING_WINDOW_DAYS): Promise<AgendaSnapshot> {
  const range = { from: today, to: addDays(today, days) };
  const [bookings, blocked] = await Promise.all([repo().listBookings(range), repo().listBlocked(range)]);
  return { bookings, blocked };
}

const staffBusiness = { ...BUSINESS, bookingWindowDays: STAFF_BOOKING_WINDOW_DAYS };

/** Servicio para la clienta (nunca devuelve los "solo equipo"). */
export async function getPublicService(id: string | undefined): Promise<Service | null> {
  const service = id ? (await getCatalog()).serviceById.get(id) : undefined;
  return service && !service.staffOnly && service.professionalIds.length ? service : null;
}

export function professionalName(catalog: Catalog, choice: ProfessionalChoice): string {
  return choice === ANY_PROFESSIONAL ? "Cualquiera disponible" : (catalog.professionalById.get(choice)?.name ?? "");
}

export function describeWhen(b: Pick<Booking, "date" | "start">, today: IsoDate): string {
  return `${formatRelativeDay(b.date, today)} · ${formatTime(b.start)}`;
}

/** Nombre a mostrar del servicio de un turno ("Otro · Retoque de raíz"). */
export function bookingServiceLabel(catalog: Catalog, b: Booking): string {
  const name = catalog.serviceById.get(b.serviceId)?.name ?? "Servicio";
  return b.note ? `${name} · ${b.note}` : name;
}

/** Variante del servicio con otra duración (para "Otro"). */
function withDuration(service: Service, durationMin?: number): Service {
  return service.variablePrice && durationMin ? { ...service, durationMin } : service;
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
  const [now, catalog] = await Promise.all([currentNow(), getCatalog()]);
  const agenda = await agendaFor(now.date, BUSINESS.bookingWindowDays);
  const base = { business: BUSINESS, agenda, now, service };
  const choices: ProfessionalChoice[] = [ANY_PROFESSIONAL, ...service.professionalIds];
  return {
    now,
    options: choices.map((choice) => ({
      choice,
      professional: choice === ANY_PROFESSIONAL ? null : catalog.professionalById.get(choice)!,
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
  const agenda = await agendaFor(now.date, BUSINESS.bookingWindowDays);
  const base = {
    business: BUSINESS,
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

/* ───────────────────────────── Equipo: lectura ───────────────────────────── */

export type AgendaRow =
  | { kind: "booking"; booking: Booking }
  | { kind: "free"; start: MinuteOfDay }
  | { kind: "blocked"; start: MinuteOfDay };

/**
 * Agenda de un día. El admin puede ver todo el equipo o filtrar; un
 * peluquero siempre ve solo la suya (aunque pida otra por URL).
 */
export async function getStaffDay(user: StaffSessionUser, date: IsoDate, requestedPro: string | null) {
  const [now, catalog] = await Promise.all([currentNow(), getCatalog()]);
  const scope = staffScope(user);
  const professionalId = scope ?? requestedPro;
  const window = bookingWindow(BUSINESS, now.date);
  const day = window.includes(date) ? date : now.date;
  const agenda = await agendaFor(now.date, BUSINESS.bookingWindowDays);
  const inScope = (b: Booking) => !scope || b.professionalId === scope;
  const active = agenda.bookings.filter((b) => b.date === day && b.status !== "cancelled" && inScope(b));
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
        skipUntil = start + booking.durationMin;
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
    catalog,
    date: day,
    professionalId,
    /** Profesionales que esta persona puede ver/filtrar. */
    team: catalog.professionals.filter((p) => !scope || p.id === scope),
    closed: isClosed(BUSINESS, day),
    rows,
    bookingCount: visible.length,
    days: window.map((d) => ({
      date: d,
      closed: isClosed(BUSINESS, d),
      count: agenda.bookings.filter((b) => b.date === d && b.status !== "cancelled" && inScope(b)).length,
    })),
  };
}

export async function getBookingDetail(user: StaffSessionUser, id: string) {
  const [now, catalog] = await Promise.all([currentNow(), getCatalog()]);
  const booking = await repo().getBooking(id);
  if (!booking || !canManageProfessional(user, booking.professionalId)) return null;
  return { now, catalog, booking, canStart: canStart(booking, now), canClose: canClose(booking, now) };
}

export type ActivityView = Omit<ActivityEvent, "readBy"> & { read: boolean };

/** Actividad visible para esta persona: todo (admin) o solo de sus turnos, con su propio "leído". */
export async function getActivityFor(user: StaffSessionUser): Promise<ActivityView[]> {
  await connection();
  const scope = staffScope(user);
  const events = await repo().listActivity();
  const visible: ActivityView[] = [];
  for (const { readBy, ...event } of events) {
    if (scope) {
      const booking = event.bookingId ? await repo().getBooking(event.bookingId) : null;
      if (booking?.professionalId !== scope) continue;
    }
    visible.push({ ...event, read: readBy.includes(user.id) });
  }
  return visible;
}

export async function markActivityReadFor(user: StaffSessionUser) {
  const events = await getActivityFor(user);
  await repo().markActivityRead(
    user.id,
    events.filter((e) => !e.read).map((e) => e.id),
  );
}

/* ───────────────────────────── Comandos ───────────────────────────── */

export type CommandResult<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false, error }) as const;
const NOT_YOURS = "Ese turno no es de tu agenda.";

async function logActivity(
  kind: ActivityEvent["kind"],
  booking: Booking,
  title: string,
  now: Now,
  options: { readBy?: string[]; detail?: string } = {},
) {
  const catalog = await getCatalog();
  await repo().insertActivity({
    id: crypto.randomUUID(),
    kind,
    bookingId: booking.id,
    title,
    detail:
      options.detail ??
      `${describeWhen(booking, now.date)} · ${catalog.professionalById.get(booking.professionalId)?.name}`,
    at: new Date().toISOString(),
    readBy: options.readBy ?? [],
  });
}

/**
 * Elige profesional y revalida disponibilidad *dentro* de la transacción:
 * entre que se vio el horario y se confirmó, otra persona pudo tomarlo.
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
  /** Duración elegida (solo servicios de duración variable, como "Otro"). */
  durationMin?: number;
  note?: string;
  /** Si lo carga alguien del equipo: no aparece como "Nuevo" para esa persona. */
  staff?: StaffSessionUser;
}): Promise<CommandResult<Booking>> {
  const catalog = await getCatalog();
  const base = catalog.serviceById.get(input.serviceId);
  if (!base || (base.staffOnly && !input.staff)) return fail("El servicio no existe.");
  if (base.variablePrice && !OTHER_DURATIONS.includes(input.durationMin as (typeof OTHER_DURATIONS)[number])) {
    return fail("Elegí cuánto dura el turno.");
  }
  const service = withDuration(base, input.durationMin);
  if (input.professional !== ANY_PROFESSIONAL && !service.professionalIds.includes(input.professional)) {
    return fail("Ese profesional no hace este servicio.");
  }

  return repo().transaction(async () => {
    const now = nowIn(BUSINESS.timeZone);
    const window = bookingWindow(input.staff ? staffBusiness : BUSINESS, now.date);
    if (!window.includes(input.date)) return fail("Esa fecha está fuera del período de reservas.");

    const agenda = await agendaFor(now.date);
    const assignTo = resolveProfessional(agenda, service, input.professional, input.date, input.start, now);
    if (!assignTo) return fail("Ese horario se acaba de ocupar. Elegí otro, por favor.");
    if (input.staff && !canManageProfessional(input.staff, assignTo)) return fail(NOT_YOURS);

    const booking: Booking = {
      id: crypto.randomUUID(),
      date: input.date,
      start: input.start,
      serviceId: service.id,
      durationMin: service.durationMin,
      note: input.note || undefined,
      professionalId: assignTo,
      clientId: input.client.id,
      clientName: input.client.name,
      clientPhone: input.client.phone,
      payment: input.payment,
      status: "confirmed",
      // Lo cargó el equipo: igual se marca "Nuevo" si quedó en la agenda de otra persona.
      unseenByOwner: !input.staff || input.staff.professionalId !== assignTo,
      createdAt: new Date().toISOString(),
    };
    await repo().insertBooking(booking);
    if (input.staff) {
      await logActivity(
        "created",
        booking,
        `${input.staff.firstName} agendó a ${booking.clientName} · ${bookingServiceLabel(catalog, booking)}`,
        now,
        { readBy: [input.staff.id] },
      );
    } else {
      await logActivity("created", booking, `${booking.clientName} reservó ${service.name}`, now);
    }
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
  const catalog = await getCatalog();
  return repo().transaction(async () => {
    const now = nowIn(BUSINESS.timeZone);
    const booking = await repo().getBooking(input.bookingId);
    if (!booking || booking.clientId !== input.clientId) return fail("No encontramos ese turno.");
    if (!clientCanModify(BUSINESS, booking, now)) {
      return fail(`Faltan menos de ${BUSINESS.freeCancellationHours} h. Escribinos por WhatsApp para cambiarlo.`);
    }
    if (!bookingWindow(BUSINESS, now.date).includes(input.date)) {
      return fail("Esa fecha está fuera del período de reservas.");
    }
    const base = catalog.serviceById.get(booking.serviceId);
    if (!base) return fail("Ese servicio ya no está disponible. Escribinos por WhatsApp.");
    const service = { ...base, durationMin: booking.durationMin };
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
  const catalog = await getCatalog();
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
      `${booking.clientName} canceló ${bookingServiceLabel(catalog, booking)}`,
      now,
    );
    return { ok: true, value: undefined } as const;
  });
}

export async function cancelByStaff(user: StaffSessionUser, bookingId: string): Promise<CommandResult> {
  const now = nowIn(BUSINESS.timeZone);
  const booking = await repo().getBooking(bookingId);
  if (!booking || !canManageProfessional(user, booking.professionalId)) return fail(NOT_YOURS);
  if (booking.status !== "confirmed") return fail("El turno ya no está activo.");
  await repo().updateBooking(bookingId, { status: "cancelled", unseenByOwner: false });
  await logActivity("cancelled", booking, `${user.firstName} canceló el turno de ${booking.clientName}`, now, {
    readBy: [user.id],
    detail: `${describeWhen(booking, now.date)} · ${booking.clientPhone ? "se le avisó por WhatsApp" : "sin celular para avisarle"}`,
  });
  return { ok: true, value: undefined };
}

/* ───────────── Cierre del turno: empezar, cobrar y finalizar ───────────── */

/** "Empezar": arranca el reloj para medir cuánto lleva de verdad atender. */
export async function startBooking(user: StaffSessionUser, bookingId: string): Promise<CommandResult> {
  const now = nowIn(BUSINESS.timeZone);
  const booking = await repo().getBooking(bookingId);
  if (!booking || !canManageProfessional(user, booking.professionalId)) return fail(NOT_YOURS);
  if (!canStart(booking, now)) return fail("Este turno todavía no se puede empezar.");
  await repo().updateBooking(bookingId, { startedAt: new Date().toISOString(), unseenByOwner: false });
  return { ok: true, value: undefined };
}

/** Lo que se precarga en la pantalla de cierre. */
export async function getCheckoutDraft(user: StaffSessionUser, bookingId: string) {
  const detail = await getBookingDetail(user, bookingId);
  if (!detail) return null;
  const { booking, catalog } = detail;
  const service = catalog.serviceById.get(booking.serviceId)!;
  return {
    ...detail,
    service,
    listPrice: service.variablePrice ? null : service.priceArs,
    depositArs: booking.payment === "deposit" && !service.variablePrice ? depositAmount(BUSINESS, service) : 0,
    suggestedChargeArs: suggestedCharge(BUSINESS, service, booking),
    suggestedDurationMin: suggestedDuration(booking, Date.now()),
  };
}

/**
 * "Finalizar y cobrar": registra lo cobrado (casi siempre en el local, en
 * efectivo o transferencia), la propina y la duración real, y da el turno
 * por terminado. Es lo que alimenta el panel de Caja.
 */
export async function closeBooking(
  user: StaffSessionUser,
  input: {
    bookingId: string;
    chargedArs: number;
    tipArs: number;
    channel: PaymentChannel;
    actualDurationMin: number;
    note?: string;
  },
): Promise<CommandResult<Booking>> {
  return repo().transaction(async () => {
    const now = nowIn(BUSINESS.timeZone);
    const booking = await repo().getBooking(input.bookingId);
    if (!booking || !canManageProfessional(user, booking.professionalId)) return fail(NOT_YOURS);
    if (booking.status === "attended") return fail("Este turno ya está cerrado.");
    if (!canClose(booking, now)) return fail("Este turno todavía no se puede cerrar.");

    const catalog = await getCatalog();
    const service = catalog.serviceById.get(booking.serviceId);
    const depositArs =
      booking.payment === "deposit" && service && !service.variablePrice ? depositAmount(BUSINESS, service) : 0;
    const updated = (await repo().updateBooking(booking.id, {
      status: "attended",
      unseenByOwner: false,
      checkout: {
        chargedArs: input.chargedArs,
        depositArs,
        tipArs: input.tipArs,
        channel: input.channel,
        actualDurationMin: input.actualDurationMin,
        closedAt: new Date().toISOString(),
        closedBy: user.id,
        note: input.note || undefined,
      },
    }))!;
    await logActivity("closed", updated, `${user.firstName} cerró el turno de ${updated.clientName}`, now, {
      readBy: [user.id],
      detail: `Cobrado ${formatMoney(input.chargedArs + depositArs)} · ${input.actualDurationMin} min`,
    });
    return { ok: true, value: updated } as const;
  });
}

/* ───────────── Caja: ingresos y tiempo invertido ───────────── */

/**
 * Resumen del período. Un peluquero ve solo lo suyo; el admin, todo el local
 * (o un profesional si filtra).
 */
export async function getEarnings(user: StaffSessionUser, period: Period, requestedPro: string | null) {
  const [now, catalog] = await Promise.all([currentNow(), getCatalog()]);
  const scope = staffScope(user);
  const professionalId = scope ?? requestedPro;
  const range = periodRange(period, now.date);
  const all = await repo().listBookings(range);
  const visible = professionalId ? all.filter((b) => b.professionalId === professionalId) : all;
  const closed = visible
    .filter((b) => b.status === "attended" && b.checkout)
    .sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start);
  return {
    now,
    catalog,
    range,
    professionalId,
    team: catalog.professionals.filter((p) => !scope || p.id === scope),
    summary: summarizeEarnings(visible, range, now),
    closed,
  };
}

export async function markSeen(user: StaffSessionUser, bookingId: string) {
  const booking = await repo().getBooking(bookingId);
  if (booking && canManageProfessional(user, booking.professionalId)) {
    await repo().updateBooking(bookingId, { unseenByOwner: false });
  }
}

export async function toggleBlockedSlot(
  user: StaffSessionUser,
  slot: { date: IsoDate; professionalId: string; start: MinuteOfDay },
): Promise<CommandResult> {
  if (!canManageProfessional(user, slot.professionalId)) return fail("Solo podés cambiar tu propia agenda.");
  const now = nowIn(BUSINESS.timeZone);
  const agenda = await agendaFor(now.date);
  if (isBusy({ ...agenda, blocked: [] }, BUSINESS, slot.professionalId, slot.date, slot.start, BUSINESS.slotMin)) {
    return fail("Ese horario ya tiene un turno.");
  }
  await repo().toggleBlocked(slot);
  return { ok: true, value: undefined };
}

/* ───────────── Equipo: disponibilidad y turno rápido ───────────── */

export async function setRangeBlocked(
  user: StaffSessionUser,
  input: { date: IsoDate; professionalIds: string[]; from: MinuteOfDay; to: MinuteOfDay; blocked: boolean },
): Promise<CommandResult<{ changed: number; busy: number }>> {
  if (input.from >= input.to) return fail("La hora de fin tiene que ser posterior a la de inicio.");
  if (!input.professionalIds.every((id) => canManageProfessional(user, id))) {
    return fail("Solo podés cambiar tu propia disponibilidad.");
  }
  return repo().transaction(async () => {
    if (!input.blocked) {
      const changed = await repo().unblockRange(input);
      return { ok: true, value: { changed, busy: 0 } } as const;
    }
    const now = nowIn(BUSINESS.timeZone);
    const plan = planBlockRange(await agendaFor(now.date), BUSINESS, input);
    await repo().blockSlots(plan.slots);
    return { ok: true, value: { changed: plan.slots.length, busy: plan.busy.length } } as const;
  });
}

/**
 * Datos para "Turno rápido": servicios y equipo que esta persona puede
 * agendar, y para cada combinación cuántos horarios libres hay por día
 * (para pintar el calendario). Los horarios de un día puntual se piden
 * aparte con `getQuickSlots`, así la página pesa poco aunque muestre 45 días.
 */
export async function getQuickBookingOptions(user: StaffSessionUser) {
  const [now, catalog] = await Promise.all([currentNow(), getCatalog()]);
  const scope = staffScope(user);
  const agenda = await agendaFor(now.date);
  const days = bookingWindow(staffBusiness, now.date);
  const team = catalog.professionals.filter((p) => !scope || p.id === scope);
  const services = catalog.allServices.filter((s) => s.professionalIds.some((id) => team.some((p) => p.id === id)));

  const counts: Record<string, number[]> = {};
  for (const base of services) {
    const durations = base.variablePrice ? OTHER_DURATIONS : [base.durationMin];
    const choices = [
      ...(scope ? [] : [ANY_PROFESSIONAL]),
      ...base.professionalIds.filter((id) => !scope || id === scope),
    ];
    for (const durationMin of durations) {
      const service = withDuration(base, durationMin);
      for (const professional of choices) {
        counts[comboKey(base.id, durationMin, professional)] = days.map((date) =>
          isClosed(BUSINESS, date)
            ? 0
            : freeSlotCount({ business: BUSINESS, agenda, now, service, professional, date }),
        );
      }
    }
  }
  return { now, catalog, days, team, services, counts, canChooseAny: !scope };
}

export async function getQuickSlots(
  user: StaffSessionUser,
  input: { serviceId: string; durationMin: number; professional: ProfessionalChoice; date: IsoDate },
): Promise<Array<[MinuteOfDay, string]>> {
  const scope = staffScope(user);
  if (scope && input.professional !== scope) return [];
  const [now, catalog] = await Promise.all([currentNow(), getCatalog()]);
  const base = catalog.serviceById.get(input.serviceId);
  if (!base || !bookingWindow(staffBusiness, now.date).includes(input.date)) return [];
  const service = withDuration(base, input.durationMin);
  const agenda = await agendaFor(now.date);
  return slotsForDay({ business: BUSINESS, agenda, now, service, professional: input.professional, date: input.date })
    .filter((s) => s.assignTo)
    .map((s) => [s.start, s.assignTo!]);
}

/** Turno cargado por el equipo (clienta en el local o por teléfono). */
export async function createWalkInBooking(
  user: StaffSessionUser,
  input: {
    clientName: string;
    phone: string | null;
    serviceId: string;
    durationMin?: number;
    note?: string;
    professional: ProfessionalChoice;
    date: IsoDate;
    start: MinuteOfDay;
  },
): Promise<CommandResult<Booking>> {
  const scope = staffScope(user);
  if (scope && input.professional !== scope) return fail("Solo podés agendar en tu propia agenda.");

  // Con celular, el turno queda asociado a su cuenta: si después entra a Filo, lo ve en "Mis turnos".
  let client = { id: `walk-in-${crypto.randomUUID()}`, name: input.clientName, phone: "" };
  if (input.phone) {
    const existing = await repo().findClientByPhone(input.phone);
    if (existing) {
      client = { id: existing.id, name: existing.name, phone: existing.phone };
    } else {
      client = { id: crypto.randomUUID(), name: input.clientName, phone: input.phone };
      await repo().insertClient({ ...client, createdAt: new Date().toISOString() });
    }
  }
  return createBooking({ ...input, client, payment: "in_store", staff: user });
}
