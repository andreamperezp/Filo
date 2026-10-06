import type {
  ActivityEvent,
  BlockedSlot,
  Booking,
  BookingId,
  Client,
  IsoDate,
  Professional,
  StaffUser,
} from "@/domain/types";

/**
 * Puerto de persistencia. La app solo conoce esta interfaz; hoy la implementa
 * un store en memoria (`memory-repository.ts`) y mañana Supabase, sin tocar
 * pantallas ni reglas de negocio.
 */
export interface Repository {
  listProfessionals(): Promise<Professional[]>;
  insertProfessional(professional: Professional): Promise<void>;
  updateProfessional(id: string, patch: Partial<Omit<Professional, "id">>): Promise<void>;

  listStaff(): Promise<StaffUser[]>;
  getStaff(id: string): Promise<StaffUser | null>;
  findStaffByEmail(email: string): Promise<StaffUser | null>;
  insertStaff(user: StaffUser): Promise<void>;
  updateStaff(id: string, patch: Partial<Omit<StaffUser, "id">>): Promise<StaffUser | null>;

  getClient(id: string): Promise<Client | null>;
  findClientByPhone(phone: string): Promise<Client | null>;
  insertClient(client: Client): Promise<void>;

  listBookings(range: { from: IsoDate; to: IsoDate }): Promise<Booking[]>;
  listClientBookings(clientId: string): Promise<Booking[]>;
  getBooking(id: BookingId): Promise<Booking | null>;
  insertBooking(booking: Booking): Promise<void>;
  updateBooking(id: BookingId, patch: Partial<Omit<Booking, "id">>): Promise<Booking | null>;

  listBlocked(range: { from: IsoDate; to: IsoDate }): Promise<BlockedSlot[]>;
  /** Bloquea o libera un horario. Devuelve `true` si quedó bloqueado. */
  toggleBlocked(slot: BlockedSlot): Promise<boolean>;
  /** Bloquea varios horarios (idempotente). */
  blockSlots(slots: BlockedSlot[]): Promise<void>;
  /** Libera todos los horarios bloqueados de esos profesionales en `[from, to)` de un día. */
  unblockRange(range: { date: IsoDate; professionalIds: string[]; from: number; to: number }): Promise<number>;

  listActivity(limit?: number): Promise<ActivityEvent[]>;
  insertActivity(event: ActivityEvent): Promise<void>;
  /** Marca como leídos esos eventos para una persona del equipo. */
  markActivityRead(staffId: string, eventIds: string[]): Promise<void>;

  /**
   * Ejecuta `fn` en exclusión mutua. En memoria es un lock; en Postgres lo
   * garantiza la restricción `EXCLUDE` sobre la tabla `bookings`, que impide
   * dos turnos superpuestos para el mismo profesional.
   */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}
