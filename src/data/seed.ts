import { dayGrid } from "@/domain/availability";
import { addDays, formatRelativeDay, formatTime, minutesUntil } from "@/domain/time";
import type { ActivityEvent, Booking, IsoDate, MinuteOfDay } from "@/domain/types";
import { BUSINESS, DEMO_CLIENT, PROFESSIONALS, SERVICES } from "./catalog";

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

function fakePhone(seed: number): string {
  return `+54 11 ${4000 + ((seed * 731) % 5000)}-${1000 + ((seed * 37) % 9000)}`;
}

/** Agenda de ejemplo para los próximos 14 días, relativa a "hoy". */
export function buildSeed(
  today: IsoDate,
  nowMinute: MinuteOfDay,
): {
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
    professionalId: "lucas",
    status,
    clientId: DEMO_CLIENT.id,
    clientName: DEMO_CLIENT.name,
    clientPhone: DEMO_CLIENT.phone,
    payment: "in_store",
    unseenByOwner: false,
    createdAt,
  });

  const bookings: Booking[] = [
    martin("b-martin-next", addDays(today, 3), 18 * 60, "corte-barba", "confirmed"),
    martin("b-martin-sep", addDays(today, -23), 11 * 60, "corte-barba", "attended"),
    martin("b-martin-ago", addDays(today, -44), 17 * 60, "barba", "attended"),
  ];
  const taken = (date: IsoDate, pro: string, start: number, dur: number) =>
    bookings.some((b) => {
      const d = SERVICES.find((s) => s.id === b.serviceId)!.durationMin;
      return b.date === date && b.professionalId === pro && start < b.start + d && b.start < start + dur;
    });

  let n = 0;
  for (let i = 0; i < BUSINESS.bookingWindowDays; i++) {
    const date = addDays(today, i);
    const grid = dayGrid(BUSINESS, date);
    PROFESSIONALS.forEach((pro, pi) => {
      const options = SERVICES.filter((s) => s.professionalIds.includes(pro.id));
      for (let k = 0; k < grid.length;) {
        if (rnd(i + 1, pi + 1, k + 1) < (i < 3 ? 0.3 : 0.22)) {
          const svc = options[Math.floor(rnd(k + 2, i + 3, pi + 7) * options.length)];
          const steps = svc.durationMin / BUSINESS.slotMin;
          if (k + steps <= grid.length && !taken(date, pro.id, grid[k], svc.durationMin)) {
            const seed = n++;
            const clientName = CLIENTS[Math.floor(rnd(pi + 4, k + 5, i + 3) * CLIENTS.length)];
            const past = minutesUntil(now, { date, start: grid[k] + svc.durationMin }) <= 0;
            bookings.push({
              id: `b-seed-${seed}`,
              date,
              start: grid[k],
              serviceId: svc.id,
              professionalId: pro.id,
              clientId: `client-seed-${clientName}`,
              clientName,
              clientPhone: fakePhone(seed + clientName.length),
              payment: rnd(k + 1, pi + 2, i + 9) < 0.4 ? "deposit" : "in_store",
              status: past ? "attended" : "confirmed",
              unseenByOwner: false,
              createdAt,
            });
            k += steps;
            continue;
          }
        }
        k++;
      }
    });
  }

  // Actividad de ejemplo coherente con la agenda: sale de turnos reales del seed.
  const upcoming = bookings.filter((b) => b.id.startsWith("b-seed") && b.status === "confirmed");
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
          read: i > 0,
        };
      })
    : [];

  return { bookings, activity };
}
