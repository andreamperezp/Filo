import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const PHONE = "+5491155238841";

beforeEach(() => {
  vi.resetModules();
  (globalThis as { filoCodes?: unknown }).filoCodes = undefined;
});

describe("códigos de un solo uso", () => {
  it("valida el código correcto una sola vez", async () => {
    const otp = await import("./one-time-code");
    otp.issueCode(PHONE);
    const code = otp.devCodeFor(PHONE)!;
    expect(code).toMatch(/^\d{6}$/);
    expect(otp.verifyCode(PHONE, code)).toBe("ok");
    expect(otp.verifyCode(PHONE, code)).toBe("expired");
  });

  it("no permite reenviar antes de 30 s", async () => {
    const otp = await import("./one-time-code");
    expect(otp.issueCode(PHONE)).toEqual({ ok: true });
    expect(otp.issueCode(PHONE)).toMatchObject({ ok: false });
  });

  it("se bloquea al quinto intento fallido", async () => {
    const otp = await import("./one-time-code");
    otp.issueCode(PHONE);
    const real = otp.devCodeFor(PHONE)!;
    const wrong = real === "000000" ? "111111" : "000000";
    for (let i = 0; i < 4; i++) expect(otp.verifyCode(PHONE, wrong)).toBe("invalid");
    expect(otp.verifyCode(PHONE, wrong)).toBe("locked");
    expect(otp.verifyCode(PHONE, real)).toBe("locked");
  });
});
