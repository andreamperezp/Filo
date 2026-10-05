import type { Business, Professional, Service } from "@/domain/types";

/**
 * Configuración del local. En producción vive en la tabla `business` y la
 * dueña la edita desde "Ajustes"; acá queda fija para el MVP.
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

export const PROFESSIONALS: Professional[] = [
  { id: "romi", name: "Romina", role: "Dueña · colorista", colorToken: "pro-1" },
  { id: "lucas", name: "Lucas", role: "Barbero", colorToken: "pro-2" },
  { id: "sofi", name: "Sofía", role: "Corte y peinado", colorToken: "pro-3" },
];

export const SERVICES: Service[] = [
  {
    id: "corte",
    name: "Corte",
    description: "Con lavado",
    durationMin: 30,
    priceArs: 12000,
    icon: "scissors",
    professionalIds: ["lucas", "sofi", "romi"],
  },
  {
    id: "corte-barba",
    name: "Corte + barba",
    description: "Perfilado a navaja",
    durationMin: 60,
    priceArs: 16000,
    icon: "razor-electric",
    professionalIds: ["lucas"],
  },
  {
    id: "barba",
    name: "Barba",
    description: "Toalla caliente",
    durationMin: 30,
    priceArs: 7000,
    icon: "razor",
    professionalIds: ["lucas"],
  },
  {
    id: "tintura",
    name: "Tintura",
    description: "Color completo",
    durationMin: 90,
    priceArs: 28000,
    icon: "droplet",
    professionalIds: ["romi", "sofi"],
  },
  {
    id: "mechas",
    name: "Mechas / reflejos",
    description: "Incluye matizador",
    durationMin: 120,
    priceArs: 45000,
    icon: "sparkles",
    professionalIds: ["romi"],
  },
  {
    id: "alisado",
    name: "Alisado",
    description: "Sin formol",
    durationMin: 150,
    priceArs: 55000,
    icon: "brush",
    professionalIds: ["romi"],
  },
  {
    id: "lavado",
    name: "Lavado + peinado",
    description: "Brushing o planchita",
    durationMin: 30,
    priceArs: 10000,
    icon: "spray",
    professionalIds: ["sofi", "romi"],
  },
];

export const SERVICE_BY_ID: ReadonlyMap<string, Service> = new Map(SERVICES.map((s) => [s.id, s]));
export const PROFESSIONAL_BY_ID: ReadonlyMap<string, Professional> = new Map(PROFESSIONALS.map((p) => [p.id, p]));

/** Usuarios de demo hasta conectar Supabase Auth. */
export const DEMO_CLIENT = { id: "client-martin", name: "Martín Díaz", firstName: "Martín", phone: "+54 11 5523-8841" };
export const DEMO_OWNER = { id: "owner-romina", name: "Romina", firstName: "Romina" };
