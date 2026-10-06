import { dayGrid } from "@/domain/availability";
import { addDays, formatRelativeDay, formatTime, minutesUntil } from "@/domain/time";
import { amountDueInStore, depositAmount } from "@/domain/policies";
import type {
  ActivityEvent,
  Booking,
  BookingCheckout,
  Client,
  IsoDate,
  MinuteOfDay,
  PaymentChannel,
  Professional,
} from "@/domain/types";
import { BUSINESS, SEED_CLIENT, SEED_PROFESSIONALS, SEED_SERVICE_BY_ID } from "./catalog";

const SERVICES = [...SEED_SERVICE_BY_ID.values()].filter((s) => !s.staffOnly);
const PROFESSIONALS = SEED_PROFESSIONALS;

const CLIENTS = [
  "Valentina Ríos",
  "Joaquín Paz",
  "Camila Sosa",
  "Tomás Gil",
  "Lucía Medina",
  "Mateo Ferreyra",
  "Florencia Arias",
  "Nicolás Benítez",
  "Agustina López",
  "Bruno Díaz",
  "Julieta Romero",
  "Santiago Vera",
];

const serviceName = (b: Booking) => SERVICES.find((s) => s.id === b.serviceId)?.name ?? "";

/** Pseudoaleatorio determinístico: misma semilla → misma agenda en cada arranque. */
function rnd(a: number, b: number, c: number): number {
  const x = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return x - Math.floor(x);
}

/** Días de historial (turnos ya cerrados) para que la Caja tenga datos en la demo. */
const HISTORY_DAYS = 35;
const STAFF_OF: Record<string, string> = { romi: "staff-romina", lucas: "staff-lucas", sofi: "staff-sofia" };
const CHANNELS: PaymentChannel[] = ["cash", "cash", "cash", "transfer", "transfer", "mercadopago", "card"];

/** Cierre verosímil de un turno pasado: duración real con desvío, medio de pago y alguna propina. */
function seedCheckout(b: Booking, seed: number, closedAt: string): BookingCheckout {
  const service = SEED_SERVICE_BY_ID.get(b.serviceId)!;
  const drift = [-10, -5, 0, 0, 5, 10, 15][Math.floor(rnd(seed, 3, 5) * 7)];
  const tip = rnd(seed, 7, 11) < 0.25 ? [500, 1000, 2000][Math.floor(rnd(seed, 2, 9) * 3)] : 0;
  return {
    chargedArs: amountDueInStore(BUSINESS, service, b.payment),
    depositArs: b.payment === "deposit" ? depositAmount(BUSINESS, service) : 0,
    tipArs: tip,
    channel: CHANNELS[Math.floor(rnd(seed, 13, 17) * CHANNELS.length)],
    actualDurationMin: Math.max(10, b.durationMin + drift),
    closedAt,
    closedBy: STAFF_OF[b.professionalId] ?? "staff-romina",
  };
}

function fakePhone(seed: number): string {
  return `+54911${4000 + ((seed * 731) % 5000)}${1000 + ((seed * 37) % 9000)}`;
}

/**
 * Agenda de ejemplo para los próximos 14 días, relativa a "hoy".
 * `ownerId` es la persona del equipo que "ya vio" la actividad vieja.
 */
export function buildSeed(
  today: IsoDate,
  nowMinute: MinuteOfDay,
  ownerId: string,
): {
  professionals: Professional[];
  clients: Client[];
  bookings: Booking[];
  activity: ActivityEvent[];
} {
  const now = { date: today, minute: nowMinute };
  const createdAt = new Date().toISOString();
  const martin = (id: string, date: IsoDate, start: number, serviceId: string, status: Booking["status"]): Booking => ({
    id,
    date,
    start,
    serviceId,
    durationMin: SEED_SERVICE_BY_ID.get(serviceId)!.durationMin,
    professionalId: "lucas",
    status,
    clientId: SEED_CLIENT.id,
    clientName: SEED_CLIENT.name,
    clientPhone: SEED_CLIENT.phone,
    payment: "in_store",
    unseenByOwner: false,
    createdAt,
  });

  const bookings: Booking[] = [
    martin("b-martin-next", addDays(today, 3), 18 * 60, "corte-barba", "confirmed"),
    martin("b-martin-sep", addDays(today, -23), 11 * 60, "corte-barba", "attended"),
    martin("b-martin-ago", addDays(today, -44), 17 * 60, "barba", "attended"),
  ];
  for (const [i, b] of bookings.entries()) {
    if (b.status === "attended") b.checkout = seedCheckout(b, 900 + i, createdAt);
  }
  const taken = (date: IsoDate, pro: string, start: number, dur: number) =>
    bookings.some(
      (b) => b.date === date && b.professionalId === pro && start < b.start + b.durationMin && b.start < start + dur,
    );

  let n = 0;
  for (let i = -HISTORY_DAYS; i < BUSINESS.bookingWindowDays; i++) {
    const date = addDays(today, i);
    const grid = dayGrid(BUSINESS, date);
    PROFESSIONALS.forEach((pro, pi) => {
      const options = SERVICES.filter((s) => s.professionalIds.includes(pro.id));
      for (let k = 0; k < grid.length;) {
        if (rnd(i + 1, pi + 1, k + 1) < (i < 3 ? 0.3 : 0.22) && (i >= 0 || rnd(i, pi, k) < 0.75)) {
          const svc = options[Math.floor(rnd(k + 2, i + 3, pi + 7) * options.length)];
          const steps = svc.durationMin / BUSINESS.slotMin;
          if (k + steps <= grid.length && !taken(date, pro.id, grid[k], svc.durationMin)) {
            const seed = n++;
            const clientName = CLIENTS[Math.floor(rnd(pi + 4, k + 5, i + 3) * CLIENTS.length)];
            const past = minutesUntil(now, { date, start: grid[k] + svc.durationMin }) <= 0;
            // De hoy, algunos quedan sin cerrar para mostrar "Por cobrar".
            const closed = past && (i < 0 || rnd(seed, 1, 1) < 0.6);
            const booking: Booking = {
              id: `b-seed-${seed}`,
              date,
              start: grid[k],
              serviceId: svc.id,
              durationMin: svc.durationMin,
              professionalId: pro.id,
              clientId: `client-seed-${clientName}`,
              clientName,
              clientPhone: fakePhone(seed + clientName.length),
              payment: rnd(k + 1, pi + 2, i + 9) < 0.4 ? "deposit" : "in_store",
              status: closed ? "attended" : "confirmed",
              unseenByOwner: false,
              createdAt,
            };
            if (closed) booking.checkout = seedCheckout(booking, seed, createdAt);
            bookings.push(booking);
            k += steps;
            continue;
          }
        }
        k++;
      }
    });
  }

  // Actividad de ejemplo coherente con la agenda: sale de turnos reales del seed.
  const upcoming = bookings.filter(
    (b) => b.id.startsWith("b-seed") && b.status === "confirmed" && minutesUntil(now, b) > 0,
  );
  const pick = (i: number) => upcoming[Math.min(i, upcoming.length - 1)];
  const kinds: Array<[ActivityEvent["kind"], number, (b: Booking) => string]> = [
    ["created", 12, (b) => `${b.clientName} reservó ${serviceName(b)}`],
    ["rescheduled", 180, (b) => `${b.clientName} cambió su turno`],
    ["created", 1500, (b) => `${b.clientName} reservó ${serviceName(b)}`],
  ];
  const activity: ActivityEvent[] = upcoming.length
    ? kinds.map(([kind, minAgo, title], i) => {
        const b = pick(i * 7);
        if (i === 0) b.unseenByOwner = true;
        return {
          id: `a-seed-${i}`,
          kind,
          bookingId: b.id,
          title: title(b),
          detail: `${formatRelativeDay(b.date, today)} · ${formatTime(b.start)} · ${PROFESSIONALS.find((p) => p.id === b.professionalId)?.name}`,
          at: new Date(Date.now() - minAgo * 60_000).toISOString(),
          readBy: i > 0 ? [ownerId] : [],
        };
      })
    : [];

  const clients: Client[] = [{ ...SEED_CLIENT, createdAt }];

  return { professionals: structuredClone(SEED_PROFESSIONALS), clients, bookings, activity };
}
