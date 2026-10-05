import { addDays, minutesUntil, weekday } from "./time";
import {
  ANY_PROFESSIONAL,
  type BlockedSlot,
  type Booking,
  type BookingId,
  type Business,
  type IsoDate,
  type MinuteOfDay,
  type ProfessionalChoice,
  type ProfessionalId,
  type Service,
} from "./types";

export interface AgendaSnapshot {
  bookings: readonly Booking[];
  blocked: readonly BlockedSlot[];
}

export interface Now {
  date: IsoDate;
  minute: MinuteOfDay;
}

export interface Slot {
  start: MinuteOfDay;
  /** Profesional que tomaría el turno, o `null` si el horario está ocupado. */
  assignTo: ProfessionalId | null;
}

/** Todos los inicios de grilla de un día según el horario del local. */
export function dayGrid(business: Business, date: IsoDate): MinuteOfDay[] {
  const hours = business.hours[weekday(date)];
  if (!hours) return [];
  const grid: MinuteOfDay[] = [];
  for (let m = hours.open; m < hours.close; m += business.slotMin) grid.push(m);
  return grid;
}

export function isClosed(business: Business, date: IsoDate): boolean {
  return business.hours[weekday(date)] === null;
}

function overlaps(aStart: number, aDur: number, bStart: number, bDur: number): boolean {
  return aStart < bStart + bDur && bStart < aStart + aDur;
}

/**
 * ¿El profesional está ocupado en ese rango? Considera turnos activos y
 * horarios bloqueados por la dueña. `ignoreBookingId` permite reprogramar un
 * turno sin que choque consigo mismo.
 */
export function isBusy(
  agenda: AgendaSnapshot,
  services: ReadonlyMap<string, Service>,
  business: Business,
  professionalId: ProfessionalId,
  date: IsoDate,
  start: MinuteOfDay,
  durationMin: number,
  ignoreBookingId?: BookingId,
): boolean {
  const clash = agenda.bookings.some((b) => {
    if (b.id === ignoreBookingId || b.status === "cancelled") return false;
    if (b.date !== date || b.professionalId !== professionalId) return false;
    const dur = services.get(b.serviceId)?.durationMin ?? business.slotMin;
    return overlaps(start, durationMin, b.start, dur);
  });
  if (clash) return true;
  return agenda.blocked.some(
    (s) =>
      s.date === date && s.professionalId === professionalId && overlaps(start, durationMin, s.start, business.slotMin),
  );
}

export interface AvailabilityQuery {
  business: Business;
  services: ReadonlyMap<string, Service>;
  agenda: AgendaSnapshot;
  now: Now;
  service: Service;
  professional: ProfessionalChoice;
  date: IsoDate;
  ignoreBookingId?: BookingId;
}

/**
 * Horarios de un día para un servicio. Devuelve también los ocupados
 * (`assignTo: null`) para poder mostrarlos tachados: ver qué está lleno
 * ayuda a entender la disponibilidad real.
 */
export function slotsForDay(q: AvailabilityQuery): Slot[] {
  const hours = q.business.hours[weekday(q.date)];
  if (!hours) return [];
  const candidates = q.professional === ANY_PROFESSIONAL ? q.service.professionalIds : [q.professional];

  return dayGrid(q.business, q.date)
    .filter((m) => m + q.service.durationMin <= hours.close)
    .filter((m) => minutesUntil(q.now, { date: q.date, start: m }) > 0)
    .map((start) => ({
      start,
      assignTo:
        candidates.find(
          (p) => !isBusy(q.agenda, q.services, q.business, p, q.date, start, q.service.durationMin, q.ignoreBookingId),
        ) ?? null,
    }));
}

export function freeSlotCount(q: AvailabilityQuery): number {
  return slotsForDay(q).filter((s) => s.assignTo).length;
}

/** Primer horario libre desde `fromDate`, dentro de la ventana de reservas. */
export function firstAvailable(
  q: Omit<AvailabilityQuery, "date">,
  fromDate: IsoDate = q.now.date,
): { date: IsoDate; start: MinuteOfDay; assignTo: ProfessionalId } | null {
  for (let i = 0; i < q.business.bookingWindowDays; i++) {
    const date = addDays(fromDate, i);
    const slot = slotsForDay({ ...q, date }).find((s) => s.assignTo);
    if (slot?.assignTo) return { date, start: slot.start, assignTo: slot.assignTo };
  }
  return null;
}

/** Días reservables: hoy + `bookingWindowDays - 1`. */
export function bookingWindow(business: Business, today: IsoDate): IsoDate[] {
  return Array.from({ length: business.bookingWindowDays }, (_, i) => addDays(today, i));
}
