import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.resetModules();
  (globalThis as { filoOwnerFails?: unknown }).filoOwnerFails = undefined;
  vi.stubEnv("SESSION_SECRET", "x".repeat(32));
  vi.stubEnv("OWNER_EMAIL", "duena@filo.test");
  vi.stubEnv("OWNER_PASSWORD", "clave-de-prueba");
});

describe("checkOwnerCredentials", () => {
  it("acepta las credenciales correctas sin importar mayúsculas ni espacios en el email", async () => {
    const { checkOwnerCredentials } = await import("./owner-auth");
    expect(checkOwnerCredentials("Duena@Filo.test ", "clave-de-prueba")).toEqual({ ok: true });
  });

  it("da el mismo error si falla el email o la contraseña", async () => {
    const { checkOwnerCredentials } = await import("./owner-auth");
    expect(checkOwnerCredentials("otra@filo.test", "clave-de-prueba")).toEqual({ ok: false, reason: "invalid" });
    expect(checkOwnerCredentials("duena@filo.test", "mal")).toEqual({ ok: false, reason: "invalid" });
  });

  it("bloquea después de 5 intentos fallidos, aun con la contraseña correcta", async () => {
    const { checkOwnerCredentials } = await import("./owner-auth");
    for (let i = 0; i < 4; i++) checkOwnerCredentials("duena@filo.test", "mal");
    expect(checkOwnerCredentials("duena@filo.test", "mal")).toMatchObject({ ok: false, reason: "locked" });
    expect(checkOwnerCredentials("duena@filo.test", "clave-de-prueba")).toMatchObject({ reason: "locked" });
  });
});
