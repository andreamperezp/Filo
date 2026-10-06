import { describe, expect, it } from "vitest";
import { BUSINESS, SEED_SERVICE_BY_ID as SERVICE_BY_ID } from "@/data/catalog";
import { amountDueInStore, clientCanModify, depositAmount } from "./policies";
import type { Booking } from "./types";

const booking = (partial: Partial<Booking> = {}): Booking => ({
  id: "b1",
  date: "2026-10-08",
  start: 18 * 60,
  serviceId: "corte-barba",
  durationMin: 60,
  professionalId: "lucas",
  clientId: "c1",
  clientName: "Martín",
  clientPhone: "",
  payment: "deposit",
  status: "confirmed",
  unseenByOwner: false,
  createdAt: "",
  ...partial,
});

describe("seña", () => {
  it("es el 20% redondeado a $100", () => {
    expect(depositAmount(BUSINESS, SERVICE_BY_ID.get("corte-barba")!)).toBe(3200);
    expect(depositAmount(BUSINESS, SERVICE_BY_ID.get("barba")!)).toBe(1400);
  });

  it("descuenta la seña de lo que se paga en el local", () => {
    const s = SERVICE_BY_ID.get("corte")!;
    expect(amountDueInStore(BUSINESS, s, "deposit")).toBe(12000 - 2400);
    expect(amountDueInStore(BUSINESS, s, "in_store")).toBe(12000);
  });
});

describe("política de cancelación", () => {
  it("permite cambiar hasta 24 h antes", () => {
    expect(clientCanModify(BUSINESS, booking(), { date: "2026-10-07", minute: 18 * 60 })).toBe(true);
    expect(clientCanModify(BUSINESS, booking(), { date: "2026-10-07", minute: 18 * 60 + 1 })).toBe(false);
  });

  it("no permite modificar turnos cancelados o atendidos", () => {
    const early = { date: "2026-10-01", minute: 0 };
    expect(clientCanModify(BUSINESS, booking({ status: "cancelled" }), early)).toBe(false);
    expect(clientCanModify(BUSINESS, booking({ status: "attended" }), early)).toBe(false);
  });
});
