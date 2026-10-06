import type { Business, Professional, Service, ServiceDef } from "@/domain/types";

/**
 * Configuración del local. En producción vive en la tabla `business` y el
 * admin la edita desde "Ajustes"; acá queda fija para el MVP.
 */
export const BUSINESS: Business = {
  name: "Filo",
  tagline: "peluquería · barbería",
  address: "Av. San Martín 2140",
  neighborhood: "Villa del Parque",
  phone: "+54 11 4502-2140",
  timeZone: "America/Argentina/Buenos_Aires",
  hours: {
    0: null,
    1: { open: 540, close: 1200 },
    2: { open: 540, close: 1200 },
    3: { open: 540, close: 1200 },
    4: { open: 540, close: 1200 },
    5: { open: 540, close: 1200 },
    6: { open: 540, close: 840 },
  },
  slotMin: 30,
  depositRate: 0.2,
  freeCancellationHours: 24,
  bookingWindowDays: 14,
};

/** El equipo agenda con más anticipación que los clientes (turnos de color, eventos). */
export const STAFF_BOOKING_WINDOW_DAYS = 45;

export const SERVICE_DEFS: ServiceDef[] = [
  { id: "corte", name: "Corte", description: "Con lavado", durationMin: 30, priceArs: 12000, icon: "scissors" },
  {
    id: "corte-barba",
    name: "Corte + barba",
    description: "Perfilado a navaja",
    durationMin: 60,
    priceArs: 16000,
    icon: "razor-electric",
  },
  { id: "barba", name: "Barba", description: "Toalla caliente", durationMin: 30, priceArs: 7000, icon: "razor" },
  { id: "tintura", name: "Tintura", description: "Color completo", durationMin: 90, priceArs: 28000, icon: "droplet" },
  {
    id: "mechas",
    name: "Mechas / reflejos",
    description: "Incluye matizador",
    durationMin: 120,
    priceArs: 45000,
    icon: "sparkles",
  },
  { id: "alisado", name: "Alisado", description: "Sin formol", durationMin: 150, priceArs: 55000, icon: "brush" },
  {
    id: "lavado",
    name: "Lavado + peinado",
    description: "Brushing o planchita",
    durationMin: 30,
    priceArs: 10000,
    icon: "spray",
  },
];

/**
 * "Otro": para lo que no está en la lista (retoque, consulta, novia…). Solo lo
 * agenda el equipo, elige la duración y opcionalmente anota el motivo.
 */
export const OTHER_SERVICE_ID = "otro";
export const OTHER_SERVICE: ServiceDef = {
  id: OTHER_SERVICE_ID,
  name: "Otro",
  description: "Duración y motivo a elección",
  durationMin: 30,
  priceArs: 0,
  variablePrice: true,
  staffOnly: true,
  icon: "dots",
};
export const OTHER_DURATIONS = [30, 60, 90, 120, 180] as const;

/** Equipo inicial (en producción: tabla `professionals`, editable por el admin). */
export const SEED_PROFESSIONALS: Professional[] = [
  {
    id: "romi",
    name: "Romina",
    role: "Dueña · colorista",
    colorToken: "pro-1",
    serviceIds: ["corte", "tintura", "mechas", "alisado", "lavado", OTHER_SERVICE_ID],
    active: true,
  },
  {
    id: "lucas",
    name: "Lucas",
    role: "Barbero",
    colorToken: "pro-2",
    serviceIds: ["corte", "corte-barba", "barba", OTHER_SERVICE_ID],
    active: true,
  },
  {
    id: "sofi",
    name: "Sofía",
    role: "Corte y peinado",
    colorToken: "pro-3",
    serviceIds: ["corte", "tintura", "lavado", OTHER_SERVICE_ID],
    active: true,
  },
];

/** Servicios con su equipo calculado a partir de quién está activo y qué hace. */
export function buildServices(defs: readonly ServiceDef[], team: readonly Professional[]): Service[] {
  return defs.map((def) => ({
    ...def,
    professionalIds: team.filter((p) => p.active && p.serviceIds.includes(def.id)).map((p) => p.id),
  }));
}

/** Catálogo con el equipo inicial: lo usan el seed y los tests. */
export const SEED_SERVICE_BY_ID: ReadonlyMap<string, Service> = new Map(
  buildServices([...SERVICE_DEFS, OTHER_SERVICE], SEED_PROFESSIONALS).map((s) => [s.id, s]),
);

/** Cliente de ejemplo con historial (ingresa con su celular). */
export const SEED_CLIENT = { id: "client-martin", name: "Martín Díaz", phone: "+5491155238841" };
