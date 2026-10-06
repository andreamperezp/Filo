import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.resetModules();
  const g = globalThis as { filoStaffFails?: unknown; filoState?: unknown; filoRepo?: unknown };
  g.filoStaffFails = g.filoState = g.filoRepo = undefined;
  vi.stubEnv("SESSION_SECRET", "x".repeat(32));
  vi.stubEnv("ADMIN_EMAIL", "duena@filo.test");
  vi.stubEnv("ADMIN_PASSWORD", "clave-de-prueba");
  vi.stubEnv("DEV_STAFF_PASSWORD", "clave-peluqueros");
});

describe("checkStaffCredentials", () => {
  it("deja entrar al superadmin sin importar mayúsculas ni espacios en el email", async () => {
    const { checkStaffCredentials } = await import("./staff-auth");
    const result = await checkStaffCredentials("Duena@Filo.test ", "clave-de-prueba");
    expect(result).toMatchObject({ ok: true, user: { role: "admin" } });
  });

  it("cada peluquero entra con su propia cuenta", async () => {
    const { checkStaffCredentials } = await import("./staff-auth");
    const result = await checkStaffCredentials("lucas@filo.test", "clave-peluqueros");
    expect(result).toMatchObject({ ok: true, user: { role: "professional", professionalId: "lucas" } });
  });

  it("da el mismo error si no existe el email o falla la contraseña", async () => {
    const { checkStaffCredentials } = await import("./staff-auth");
    expect(await checkStaffCredentials("nadie@filo.test", "clave-de-prueba")).toEqual({ ok: false, reason: "invalid" });
    expect(await checkStaffCredentials("duena@filo.test", "mal")).toEqual({ ok: false, reason: "invalid" });
  });

  it("no deja entrar a una cuenta desactivada", async () => {
    const { checkStaffCredentials } = await import("./staff-auth");
    const { getMemoryRepository } = await import("@/data/memory-repository");
    await getMemoryRepository().updateStaff("staff-lucas", { active: false });
    expect(await checkStaffCredentials("lucas@filo.test", "clave-peluqueros")).toMatchObject({ ok: false });
  });

  it("bloquea después de 5 intentos fallidos, aun con la contraseña correcta", async () => {
    const { checkStaffCredentials } = await import("./staff-auth");
    for (let i = 0; i < 4; i++) await checkStaffCredentials("duena@filo.test", "mal");
    expect(await checkStaffCredentials("duena@filo.test", "mal")).toMatchObject({ reason: "locked" });
    expect(await checkStaffCredentials("duena@filo.test", "clave-de-prueba")).toMatchObject({ reason: "locked" });
  });
});
