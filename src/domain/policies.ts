import { minutesUntil } from "./time";
import type { Booking, Business, PaymentMethod, Service } from "./types";
import type { Now } from "./availability";

/** Seña redondeada a múltiplos de $100 (más fácil de leer y de cobrar). */
export function depositAmount(business: Business, service: Service): number {
  return Math.round((service.priceArs * business.depositRate) / 100) * 100;
}

export function amountDueNow(business: Business, service: Service, payment: PaymentMethod): number {
  return payment === "deposit" ? depositAmount(business, service) : 0;
}

export function amountDueInStore(business: Business, service: Service, payment: PaymentMethod): number {
  return service.priceArs - amountDueNow(business, service, payment);
}

/**
 * El cliente puede cancelar o cambiar sin costo hasta
 * `freeCancellationHours` antes del turno. Después tiene que hablar con el local
 * (evita huecos de último momento en la agenda).
 */
export function clientCanModify(business: Business, booking: Booking, now: Now): boolean {
  if (booking.status !== "confirmed") return false;
  return minutesUntil(now, booking) >= business.freeCancellationHours * 60;
}

/** Se puede empezar a atender hasta 15 min antes del horario (si la clienta llegó temprano). */
export const EARLY_START_MIN = 15;

/** "Empezar" tiene sentido desde 15 min antes hasta el fin del horario (después, se cierra directo). */
export function canStart(booking: Booking, now: Now): boolean {
  return (
    booking.status === "confirmed" &&
    !booking.startedAt &&
    minutesUntil(now, booking) <= EARLY_START_MIN &&
    !isPendingCheckout(booking, now)
  );
}

/** Se puede finalizar y cobrar un turno confirmado desde que empezó (o desde su horario). */
export function canClose(booking: Booking, now: Now): boolean {
  return booking.status === "confirmed" && (!!booking.startedAt || minutesUntil(now, booking) <= EARLY_START_MIN);
}

/** Turno que ya debería haber terminado y nadie cerró: aparece como "Por cobrar". */
export function isPendingCheckout(booking: Booking, now: Now): boolean {
  return (
    booking.status === "confirmed" &&
    minutesUntil(now, { date: booking.date, start: booking.start + booking.durationMin }) <= 0
  );
}

/**
 * Duración real sugerida al cerrar: lo que pasó desde "Empezar" (redondeado a
 * 5 min) o, si no se usó, lo agendado. Siempre se puede corregir a mano.
 */
export function suggestedDuration(booking: Booking, nowMs: number): number {
  if (!booking.startedAt) return booking.durationMin;
  const minutes = (nowMs - new Date(booking.startedAt).getTime()) / 60_000;
  return Math.min(600, Math.max(5, Math.round(minutes / 5) * 5));
}

/** Monto sugerido a cobrar en el local: precio de lista menos la seña ya paga. */
export function suggestedCharge(business: Business, service: Service, booking: Booking): number {
  if (service.variablePrice) return 0;
  return amountDueInStore(business, service, booking.payment);
}
