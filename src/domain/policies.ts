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

/** La dueña puede marcar como atendido solo un turno confirmado que ya empezó. */
export function ownerCanMarkAttended(booking: Booking, now: Now): boolean {
  return booking.status === "confirmed" && minutesUntil(now, booking) <= 0;
}
