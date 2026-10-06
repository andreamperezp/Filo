import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffSessionUser } from "./session";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));

const lucas: StaffSessionUser = {
  id: "staff-lucas",
  name: "Lucas",
  firstName: "Lucas",
  email: "lucas@filo.test",
  role: "professional",
  professionalId: "lucas",
  mustChangePassword: false,
};
const admin: StaffSessionUser = {
  ...lucas,
  id: "staff-romina",
  name: "Romina",
  firstName: "Romina",
  role: "admin",
  professionalId: "romi",
};

async function setup() {
  const bookings = await import("./bookings");
  const { getMemoryRepository } = await import("@/data/memory-repository");
  const { nowIn, addDays } = await import("@/domain/time");
  const repo = getMemoryRepository();
  const today = nowIn("America/Argentina/Buenos_Aires").date;
  const range = { from: today, to: addDays(today, 14) };
  const all = await repo.listBookings(range);
  const future = (pro: string) =>
    all.find((b) => b.professionalId === pro && b.status === "confirmed" && b.date > today)!;
  return { bookings, repo, today, addDays, future };
}

beforeEach(() => {
  vi.resetModules();
  const g = globalThis as { filoState?: unknown; filoRepo?: unknown };
  g.filoState = g.filoRepo = undefined;
  vi.stubEnv("SESSION_SECRET", "x".repeat(32));
  vi.stubEnv("ADMIN_EMAIL", "duena@filo.test");
  vi.stubEnv("ADMIN_PASSWORD", "clave-de-prueba");
  vi.stubEnv("DEV_STAFF_PASSWORD", "clave-peluqueros");
});

describe("permisos del equipo", () => {
  it("un peluquero no puede cancelar ni ver turnos de otra agenda", async () => {
    const { bookings, future } = await setup();
    const sofiBooking = future("sofi");
    expect(await bookings.cancelByStaff(lucas, sofiBooking.id)).toMatchObject({ ok: false });
    expect(await bookings.getBookingDetail(lucas, sofiBooking.id)).toBeNull();
    expect(await bookings.cancelByStaff(admin, sofiBooking.id)).toEqual({ ok: true, value: undefined });
  });

  it("un peluquero no puede bloquear horarios de otra persona", async () => {
    const { bookings, today, addDays } = await setup();
    const date = addDays(today, 1);
    const result = await bookings.setRangeBlocked(lucas, {
      date,
      professionalIds: ["sofi"],
      from: 540,
      to: 600,
      blocked: true,
    });
    expect(result).toMatchObject({ ok: false });
  });

  it("un peluquero solo agenda turnos rápidos en su propia agenda", async () => {
    const { bookings, today, addDays } = await setup();
    const result = await bookings.createWalkInBooking(lucas, {
      clientName: "Clienta",
      phone: null,
      serviceId: "corte",
      professional: "sofi",
      date: addDays(today, 2),
      start: 540,
    });
    expect(result).toMatchObject({ ok: false });
  });

  it("solo ve su propia agenda aunque pida otra", async () => {
    const { bookings, today } = await setup();
    const day = await bookings.getStaffDay(lucas, today, "sofi");
    expect(day.professionalId).toBe("lucas");
    expect(day.team.map((p) => p.id)).toEqual(["lucas"]);
  });
});

describe("reglas de reserva", () => {
  it("una clienta no puede reservar el servicio 'Otro' (solo equipo)", async () => {
    const { bookings, today, addDays } = await setup();
    const result = await bookings.createBooking({
      client: { id: "c", name: "C", phone: "" },
      serviceId: "otro",
      durationMin: 60,
      professional: "lucas",
      date: addDays(today, 2),
      start: 540,
      payment: "in_store",
    });
    expect(result).toMatchObject({ ok: false });
  });

  it("no se puede reservar fuera del período habilitado", async () => {
    const { bookings, today, addDays } = await setup();
    const result = await bookings.createBooking({
      client: { id: "c", name: "C", phone: "" },
      serviceId: "corte",
      professional: "any",
      date: addDays(today, 40),
      start: 540,
      payment: "in_store",
    });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("fuera del período") });
  });

  it("el 'Otro' del equipo guarda su duración y motivo", async () => {
    const { bookings, today, addDays } = await setup();
    // Buscamos un día hábil con la primera hora libre para Lucas.
    for (let i = 1; i < 10; i++) {
      const date = addDays(today, i);
      const result = await bookings.createWalkInBooking(lucas, {
        clientName: "Clienta",
        phone: null,
        serviceId: "otro",
        durationMin: 90,
        note: "Retoque",
        professional: "lucas",
        date,
        start: 540,
      });
      if (result.ok) {
        expect(result.value).toMatchObject({ durationMin: 90, note: "Retoque", professionalId: "lucas" });
        return;
      }
    }
    throw new Error("No se encontró un día libre para la prueba");
  });
});

describe("finalizar y cobrar", () => {
  async function pendingOf(pro: string) {
    const { bookings, repo } = await setup();
    const { nowIn, addDays } = await import("@/domain/time");
    const today = nowIn("America/Argentina/Buenos_Aires").date;
    // Turno de ayer sin cerrar (lo creamos para no depender del horario en que corre el test).
    const booking = {
      id: `pending-${pro}`,
      date: addDays(today, -1),
      start: 600,
      serviceId: "corte",
      durationMin: 30,
      professionalId: pro,
      clientId: "c",
      clientName: "Clienta",
      clientPhone: "",
      payment: "in_store" as const,
      status: "confirmed" as const,
      unseenByOwner: false,
      createdAt: "",
    };
    await repo.insertBooking(booking);
    return { bookings, repo, booking };
  }

  const input = { chargedArs: 12000, tipArs: 500, channel: "cash" as const, actualDurationMin: 40 };

  it("un peluquero no puede cobrar un turno ajeno", async () => {
    const { bookings, booking } = await pendingOf("sofi");
    expect(await bookings.closeBooking(lucas, { ...input, bookingId: booking.id })).toMatchObject({ ok: false });
  });

  it("cerrar guarda lo cobrado y la duración real, una sola vez", async () => {
    const { bookings, booking } = await pendingOf("lucas");
    const result = await bookings.closeBooking(lucas, { ...input, bookingId: booking.id });
    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "attended",
        checkout: { chargedArs: 12000, tipArs: 500, actualDurationMin: 40, closedBy: lucas.id },
      },
    });
    expect(await bookings.closeBooking(lucas, { ...input, bookingId: booking.id })).toMatchObject({ ok: false });
  });
});
