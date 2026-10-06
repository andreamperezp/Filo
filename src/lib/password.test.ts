import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { hashPassword, passwordProblem, temporaryPassword, verifyPassword } = await import("./password");

describe("contraseñas", () => {
  it("verifica la contraseña correcta y rechaza otra", () => {
    const stored = hashPassword("una-clave-larga");
    expect(stored).not.toContain("una-clave-larga");
    expect(verifyPassword("una-clave-larga", stored)).toBe(true);
    expect(verifyPassword("otra-clave-larga", stored)).toBe(false);
  });

  it("usa sal distinta cada vez", () => {
    expect(hashPassword("misma-clave-123")).not.toBe(hashPassword("misma-clave-123"));
  });

  it("genera temporales legibles y distintas", () => {
    const a = temporaryPassword();
    expect(a).toMatch(/^[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}$/);
    expect(a).not.toMatch(/[01lIO]/);
    expect(temporaryPassword()).not.toBe(a);
  });

  it("pide largo mínimo y que no contenga datos personales", () => {
    const ctx = { email: "lucas@filo.test", name: "Lucas" };
    expect(passwordProblem("corta", ctx)).toMatch(/10 caracteres/);
    expect(passwordProblem("lucas-2026-clave", ctx)).toMatch(/nombre/);
    expect(passwordProblem("tijera-azul-de-mar", ctx)).toBeNull();
  });
});
