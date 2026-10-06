/**
 * Modelo de dominio de Filo.
 *
 * Todo lo que vive en `src/domain` es TypeScript puro: sin React, sin Next.js
 * y sin base de datos. Así las reglas de negocio se testean en milisegundos
 * y se pueden reutilizar en el backend, en una app nativa o en un cron.
 */

/** Fecha de calendario en la zona horaria del local, formato `YYYY-MM-DD`. */
export type IsoDate = string;

/** Minutos desde la medianoche (ej. 9:30 → 570). */
export type MinuteOfDay = number;

export type ServiceId = string;
export type ProfessionalId = string;
export type BookingId = string;

export interface Service {
  id: ServiceId;
  name: string;
  description: string;
  durationMin: number;
  /** Precio en pesos argentinos, sin decimales. */
  priceArs: number;
  /** Precio a convenir (no se muestra monto ni se ofrece seña). */
  variablePrice?: boolean;
  /** Solo lo puede agendar el equipo (no aparece en la app de clientes). */
  staffOnly?: boolean;
  icon: ServiceIcon;
  /**
   * Profesionales habilitados para hacer este servicio. Se calcula a partir
   * del equipo activo (`Professional.serviceIds`), no se edita a mano.
   */
  professionalIds: ProfessionalId[];
}

/** Definición de un servicio, sin el equipo asignado. */
export type ServiceDef = Omit<Service, "professionalIds">;

export type ServiceIcon = "scissors" | "razor-electric" | "razor" | "droplet" | "sparkles" | "brush" | "spray" | "dots";

export interface Professional {
  id: ProfessionalId;
  name: string;
  role: string;
  /** Token de color (ver `globals.css`) para identificarlo en la agenda. */
  colorToken: ProColor;
  /** Servicios que hace. */
  serviceIds: ServiceId[];
  /** Inactivo: no recibe turnos nuevos, pero conserva su historial. */
  active: boolean;
}

export const PRO_COLORS = ["pro-1", "pro-2", "pro-3", "pro-4", "pro-5", "pro-6"] as const;
export type ProColor = (typeof PRO_COLORS)[number];

/**
 * Persona del equipo con acceso al panel.
 * - `admin` (superadmin): ve y gestiona todos los turnos y administra el equipo.
 * - `professional`: ve y gestiona solo su propia agenda.
 */
export type StaffRole = "admin" | "professional";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  /** Profesional que atiende esta persona (`null` si es admin y no atiende). */
  professionalId: ProfessionalId | null;
  /** Hash scrypt (`salt:hash`). Nunca la contraseña en texto. */
  passwordHash: string;
  /** Contraseña temporal: tiene que cambiarla al ingresar. */
  mustChangePassword: boolean;
  active: boolean;
  createdAt: string;
}

/** Horario de apertura por día de la semana (0 = domingo). `null` = cerrado. */
export type OpeningHours = Record<0 | 1 | 2 | 3 | 4 | 5 | 6, { open: MinuteOfDay; close: MinuteOfDay } | null>;

export interface Business {
  name: string;
  tagline: string;
  address: string;
  neighborhood: string;
  phone: string;
  timeZone: string;
  hours: OpeningHours;
  /** Granularidad de la agenda en minutos. */
  slotMin: number;
  /** Porcentaje de seña online, entre 0 y 1. */
  depositRate: number;
  /** Horas de anticipación mínimas para cancelar o cambiar sin costo. */
  freeCancellationHours: number;
  /** Días hacia adelante que se pueden reservar. */
  bookingWindowDays: number;
}

export type PaymentMethod = "in_store" | "deposit";

export type BookingStatus = "confirmed" | "attended" | "cancelled";

export interface Booking {
  id: BookingId;
  date: IsoDate;
  start: MinuteOfDay;
  serviceId: ServiceId;
  /** Duración real del turno (normalmente la del servicio; en "Otro" la elige el equipo). */
  durationMin: number;
  /** Nota interna del equipo (ej. el motivo de un servicio "Otro"). */
  note?: string;
  professionalId: ProfessionalId;
  clientId: string;
  clientName: string;
  clientPhone: string;
  payment: PaymentMethod;
  status: BookingStatus;
  /** El equipo todavía no lo vio (se resalta como "Nuevo" en la agenda). */
  unseenByOwner: boolean;
  createdAt: string;
}

export interface BlockedSlot {
  date: IsoDate;
  professionalId: ProfessionalId;
  start: MinuteOfDay;
}

export interface Client {
  id: string;
  name: string;
  /** Celular en formato E.164 (ver `domain/phone.ts`). Es su identificador para ingresar. */
  phone: string;
  createdAt: string;
}

export type ActivityKind = "created" | "cancelled" | "rescheduled";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  bookingId: BookingId | null;
  title: string;
  detail: string;
  at: string;
  /** Personas del equipo que ya lo vieron (cada una tiene su propio "sin leer"). */
  readBy: string[];
}

/** Opción especial: "cualquier profesional disponible". */
export const ANY_PROFESSIONAL = "any" as const;
export type ProfessionalChoice = ProfessionalId | typeof ANY_PROFESSIONAL;
