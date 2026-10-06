import { describe, expect, it } from "vitest";
import { BUSINESS, SEED_SERVICE_BY_ID } from "@/data/catalog";
import { periodRange, summarizeEarnings } from "./earnings";
import { canClose, canStart, isPendingCheckout, suggestedCharge, suggestedDuration } from "./policies";
import type { Booking, BookingCheckout } from "./types";

// 2026-10-07 es miércoles.
const TODAY = "2026-10-07";
const NOW = { date: TODAY, minute: 18 * 60 };

function booking(partial: Partial<Booking> = {}, checkout?: Partial<BookingCheckout>): Booking {
  return {
    id: Math.random().toString(36),
    date: TODAY,
    start: 600,
    serviceId: "corte",
    durationMin: 30,
    professionalId: "lucas",
    clientId: "c",
    clientName: "C",
    clientPhone: "",
    payment: "in_store",
    status: checkout ? "attended" : "confirmed",
    unseenByOwner: false,
    createdAt: "",
    checkout: checkout && {
      chargedArs: 12000,
      depositArs: 0,
      tipArs: 0,
      channel: "cash",
      actualDurationMin: 30,
      closedAt: "",
      closedBy: "staff",
      ...checkout,
    },
    ...partial,
  };
}

describe("períodos", () => {
  it("la semana empieza el lunes y el mes el día 1", () => {
    expect(periodRange("hoy", TODAY)).toEqual({ from: TODAY, to: TODAY });
    expect(periodRange("semana", TODAY)).toEqual({ from: "2026-10-05", to: TODAY });
    expect(periodRange("mes", TODAY)).toEqual({ from: "2026-10-01", to: TODAY });
  });
});

describe("summarizeEarnings", () => {
  const list = [
    booking({}, { chargedArs: 12000, actualDurationMin: 40, channel: "cash", tipArs: 1000 }),
    booking(
      { serviceId: "tintura", professionalId: "romi", payment: "deposit", durationMin: 90 },
      {
        chargedArs: 22400,
        depositArs: 5600,
        actualDurationMin: 80,
        channel: "transfer",
      },
    ),
    booking({ date: "2026-09-30" }, { chargedArs: 99999 }), // fuera del período
    booking({ start: 9 * 60 }), // terminó y nadie lo cerró
    booking({ start: 19 * 60 }), // todavía no empezó
    booking({ status: "cancelled", start: 11 * 60 }),
  ];
  const s = summarizeEarnings(list, periodRange("semana", TODAY), NOW);

  it("suma ingresos (cobro en el local + seña) y deja las propinas aparte", () => {
    expect(s.closedCount).toBe(2);
    expect(s.revenueArs).toBe(12000 + 22400 + 5600);
    expect(s.tipsArs).toBe(1000);
  });

  it("calcula tiempo invertido, ticket promedio y valor por hora", () => {
    expect(s.minutes).toBe(120);
    expect(s.avgTicket).toBe(20000);
    expect(s.valuePerHour).toBe(20000); // $40.000 en 2 h
  });

  it("cuenta los turnos que terminaron sin cerrar", () => {
    expect(s.pendingCount).toBe(1);
  });

  it("separa por medio de pago, servicio y profesional", () => {
    expect(s.byChannel).toEqual([
      { channel: "transfer", amountArs: 22400, count: 1 },
      { channel: "cash", amountArs: 13000, count: 1 },
    ]);
    expect(s.byService.find((x) => x.serviceId === "tintura")).toMatchObject({ avgActualMin: 80, avgScheduledMin: 90 });
    expect(s.byProfessional.map((p) => p.professionalId)).toEqual(["romi", "lucas"]);
  });

  it("sin turnos cerrados no inventa promedios", () => {
    const empty = summarizeEarnings([], periodRange("hoy", TODAY), NOW);
    expect(empty).toMatchObject({ revenueArs: 0, valuePerHour: null, avgTicket: null });
  });
});

describe("cierre del turno", () => {
  it("se puede empezar desde 15 min antes y cerrar una vez empezado", () => {
    const b = booking({ start: 18 * 60 + 20 });
    expect(canStart(b, NOW)).toBe(false);
    expect(canStart(booking({ start: 18 * 60 + 15 }), NOW)).toBe(true);
    expect(canStart(booking({ start: 17 * 60 }), NOW)).toBe(false); // ya terminó: se cierra directo
    expect(canClose({ ...b, startedAt: new Date().toISOString() }, NOW)).toBe(true);
    expect(canClose({ ...b, status: "cancelled" }, NOW)).toBe(false);
  });

  it("'Por cobrar' recién cuando terminó el horario", () => {
    expect(isPendingCheckout(booking({ start: 17 * 60 + 30 }), NOW)).toBe(true);
    expect(isPendingCheckout(booking({ start: 17 * 60 + 45 }), NOW)).toBe(false);
  });

  it("sugiere la duración desde 'Empezar' (redondeada a 5 min) o la agendada", () => {
    const started = new Date("2026-10-07T20:00:00Z");
    expect(suggestedDuration(booking({ startedAt: started.toISOString() }), started.getTime() + 47 * 60_000)).toBe(45);
    expect(suggestedDuration(booking({ durationMin: 60 }), Date.now())).toBe(60);
  });

  it("sugiere cobrar el precio menos la seña ya paga", () => {
    const tintura = SEED_SERVICE_BY_ID.get("tintura")!;
    expect(suggestedCharge(BUSINESS, tintura, booking({ payment: "deposit" }))).toBe(28000 - 5600);
    expect(suggestedCharge(BUSINESS, SEED_SERVICE_BY_ID.get("otro")!, booking())).toBe(0);
  });
});
