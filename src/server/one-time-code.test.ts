import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const PHONE = "+5491155238841";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("SESSION_SECRET", "x".repeat(32));
  vi.stubEnv("ADMIN_EMAIL", "duena@filo.test");
  vi.stubEnv("ADMIN_PASSWORD", "clave-de-prueba");
});

async function issued() {
  const otp = await import("./one-time-code");
  const result = otp.issueCode(PHONE);
  if (!result.ok) throw new Error("debería emitir");
  return { otp, state: result.state, code: otp.demoCodeOf(result.state)! };
}

describe("códigos de un solo uso (sin estado en el servidor)", () => {
  it("valida el código correcto", async () => {
    const { otp, state, code } = await issued();
    expect(code).toMatch(/^\d{6}$/);
    expect(otp.verifyCode(PHONE, code, state).result).toBe("ok");
  });

  it("el estado guarda un HMAC, nunca el código, salvo el campo de demo", async () => {
    const { state, code } = await issued();
    expect(state.hash).not.toContain(code);
  });

  it("el código no sirve para otro celular", async () => {
    const { otp, state, code } = await issued();
    expect(otp.verifyCode("+5491100000000", code, state).result).toBe("invalid");
  });

  it("no permite reenviar antes de 30 s", async () => {
    const { otp, state } = await issued();
    expect(otp.issueCode(PHONE, state)).toMatchObject({ ok: false });
  });

  it("se bloquea al quinto intento fallido", async () => {
    const issuedCode = await issued();
    const { otp, code } = issuedCode;
    let { state } = issuedCode;
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 4; i++) {
      const r = otp.verifyCode(PHONE, wrong, state);
      expect(r.result).toBe("invalid");
      state = r.state!;
    }
    expect(otp.verifyCode(PHONE, wrong, state).result).toBe("locked");
  });

  it("vence a los 5 minutos", async () => {
    const { otp, state, code } = await issued();
    expect(otp.verifyCode(PHONE, code, { ...state, expiresAt: Date.now() - 1 }).result).toBe("expired");
  });

  it("fuera del modo demo no expone el código", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "false");
    vi.resetModules();
    const otp = await import("./one-time-code");
    const result = otp.issueCode(PHONE);
    expect(result.ok && result.state.demoCode).toBeUndefined();
  });
});
