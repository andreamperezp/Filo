import type { ActivityEvent, BlockedSlot, Booking, BookingId, IsoDate } from "@/domain/types";

/**
 * Puerto de persistencia. La app solo conoce esta interfaz; hoy la implementa
 * un store en memoria (`memory-repository.ts`) y mañana Supabase, sin tocar
 * pantallas ni reglas de negocio.
 */
export interface Repository {
  listBookings(range: { from: IsoDate; to: IsoDate }): Promise<Booking[]>;
  listClientBookings(clientId: string): Promise<Booking[]>;
  getBooking(id: BookingId): Promise<Booking | null>;
  insertBooking(booking: Booking): Promise<void>;
  updateBooking(id: BookingId, patch: Partial<Omit<Booking, "id">>): Promise<Booking | null>;

  listBlocked(range: { from: IsoDate; to: IsoDate }): Promise<BlockedSlot[]>;
  /** Bloquea o libera un horario. Devuelve `true` si quedó bloqueado. */
  toggleBlocked(slot: BlockedSlot): Promise<boolean>;

  listActivity(limit?: number): Promise<ActivityEvent[]>;
  insertActivity(event: ActivityEvent): Promise<void>;
  markAllActivityRead(): Promise<void>;

  /**
   * Ejecuta `fn` en exclusión mutua. En memoria es un lock; en Postgres lo
   * garantiza la restricción `EXCLUDE` sobre la tabla `bookings`, que impide
   * dos turnos superpuestos para el mismo profesional.
   */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}
