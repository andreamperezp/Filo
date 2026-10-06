import { describe, expect, it } from "vitest";
import { BUSINESS, SERVICE_BY_ID } from "@/data/catalog";
import { firstAvailable, isBusy, planBlockRange, slotsForDay, type AgendaSnapshot } from "./availability";
import { ANY_PROFESSIONAL, type Booking } from "./types";

// 2026-10-05 es lunes; 2026-10-10 sábado; 2026-10-11 domingo.
const MONDAY = "2026-10-05";
const SATURDAY = "2026-10-10";
const SUNDAY = "2026-10-11";
const EARLY = { date: MONDAY, minute: 8 * 60 };

const corte = SERVICE_BY_ID.get("corte")!;
const barba = SERVICE_BY_ID.get("barba")!;
const alisado = SERVICE_BY_ID.get("alisado")!;

function booking(partial: Partial<Booking>): Booking {
  return {
    id: "b1",
    date: MONDAY,
    start: 600,
    serviceId: "barba",
    professionalId: "lucas",
    clientId: "c1",
    clientName: "Test",
    clientPhone: "",
    payment: "in_store",
    status: "confirmed",
    unseenByOwner: false,
    createdAt: "",
    ...partial,
  };
}

const empty: AgendaSnapshot = { bookings: [], blocked: [] };
const query = (agenda: AgendaSnapshot, overrides: Partial<Parameters<typeof slotsForDay>[0]> = {}) =>
  slotsForDay({
    business: BUSINESS,
    services: SERVICE_BY_ID,
    agenda,
    now: EARLY,
    service: corte,
    professional: "lucas",
    date: MONDAY,
    ...overrides,
  });

describe("slotsForDay", () => {
  it("genera la grilla de 9 a 20 h cada 30 min un día de semana", () => {
    const slots = query(empty);
    expect(slots[0].start).toBe(540);
    expect(slots.at(-1)!.start).toBe(1170);
    expect(slots).toHaveLength(22);
  });

  it("no ofrece horarios los domingos", () => {
    expect(query(empty, { date: SUNDAY })).toEqual([]);
  });

  it("los sábados cierra a las 14 h y el servicio tiene que terminar antes", () => {
    const slots = query(empty, { date: SATURDAY, service: alisado, professional: "romi" });
    expect(slots.at(-1)!.start).toBe(840 - alisado.durationMin);
  });

  it("descarta horarios que ya pasaron hoy", () => {
    const slots = query(empty, { now: { date: MONDAY, minute: 11 * 60 + 20 } });
    expect(slots[0].start).toBe(11 * 60 + 30);
  });

  it("marca ocupados los horarios que se superponen con otro turno", () => {
    const agenda = { bookings: [booking({ start: 600 })], blocked: [] };
    const at = (m: number) => query(agenda).find((s) => s.start === m)!;
    expect(at(570).assignTo).toBe("lucas");
    expect(at(600).assignTo).toBeNull();
    expect(at(630).assignTo).toBe("lucas");
  });

  it("ignora los turnos cancelados", () => {
    const agenda = { bookings: [booking({ status: "cancelled" })], blocked: [] };
    expect(query(agenda).find((s) => s.start === 600)!.assignTo).toBe("lucas");
  });

  it("respeta los horarios bloqueados por la dueña", () => {
    const agenda = { bookings: [], blocked: [{ date: MONDAY, professionalId: "lucas", start: 600 }] };
    expect(query(agenda).find((s) => s.start === 600)!.assignTo).toBeNull();
  });

  it("con 'cualquiera' asigna al primer profesional libre", () => {
    const agenda = { bookings: [booking({ start: 600, professionalId: "lucas" })], blocked: [] };
    const slot = query(agenda, { professional: ANY_PROFESSIONAL }).find((s) => s.start === 600)!;
    expect(slot.assignTo).toBe("sofi");
  });

  it("al reprogramar, el turno no choca consigo mismo", () => {
    const agenda = { bookings: [booking({ id: "mine", start: 600 })], blocked: [] };
    const slot = query(agenda, { ignoreBookingId: "mine" }).find((s) => s.start === 600)!;
    expect(slot.assignTo).toBe("lucas");
  });
});

describe("isBusy", () => {
  it("detecta superposición parcial con un servicio largo", () => {
    const agenda = { bookings: [booking({ serviceId: "alisado", professionalId: "romi", start: 600 })], blocked: [] };
    expect(isBusy(agenda, SERVICE_BY_ID, BUSINESS, "romi", MONDAY, 720, barba.durationMin)).toBe(true);
    expect(isBusy(agenda, SERVICE_BY_ID, BUSINESS, "romi", MONDAY, 750, barba.durationMin)).toBe(false);
  });
});

describe("firstAvailable", () => {
  it("salta al día siguiente si hoy ya no queda lugar", () => {
    const late = { date: MONDAY, minute: 19 * 60 + 45 };
    const next = firstAvailable({
      business: BUSINESS,
      services: SERVICE_BY_ID,
      agenda: empty,
      now: late,
      service: corte,
      professional: "lucas",
    });
    expect(next).toEqual({ date: "2026-10-06", start: 540, assignTo: "lucas" });
  });
});

describe("planBlockRange", () => {
  it("bloquea el rango pedido y deja afuera los horarios con turno", () => {
    const agenda = { bookings: [booking({ start: 600, professionalId: "lucas" })], blocked: [] };
    const plan = planBlockRange(agenda, SERVICE_BY_ID, BUSINESS, {
      date: MONDAY,
      professionalIds: ["lucas"],
      from: 540,
      to: 660,
    });
    expect(plan.slots.map((s) => s.start)).toEqual([540, 570, 630]);
    expect(plan.busy.map((s) => s.start)).toEqual([600]);
  });

  it("el día completo para varios profesionales usa el horario del local", () => {
    const plan = planBlockRange(empty, SERVICE_BY_ID, BUSINESS, {
      date: SATURDAY,
      professionalIds: ["lucas", "sofi"],
      from: 0,
      to: 1440,
    });
    expect(plan.slots).toHaveLength(2 * 10); // sábado de 9 a 14 h = 10 horarios de 30 min
  });

  it("no hay nada que bloquear un domingo", () => {
    expect(
      planBlockRange(empty, SERVICE_BY_ID, BUSINESS, { date: SUNDAY, professionalIds: ["lucas"], from: 0, to: 1440 })
        .slots,
    ).toEqual([]);
  });
});
