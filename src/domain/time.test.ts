import { describe, expect, it } from "vitest";
import { addDays, formatDuration, formatLongDay, formatRelativeDay, formatTime, minutesUntil, nowIn } from "./time";

describe("time", () => {
  it("formatea horas y duraciones", () => {
    expect(formatTime(570)).toBe("9:30");
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(120)).toBe("2 h");
  });

  it("suma días cruzando meses", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
  });

  it("usa etiquetas relativas legibles", () => {
    expect(formatRelativeDay("2026-10-05", "2026-10-05")).toBe("Hoy");
    expect(formatRelativeDay("2026-10-06", "2026-10-05")).toBe("Mañana");
    expect(formatRelativeDay("2026-10-08", "2026-10-05")).toBe("Jue 8 oct");
    expect(formatLongDay("2026-10-08")).toBe("Jueves 8 de octubre");
  });

  it("calcula la hora local de Buenos Aires (UTC-3)", () => {
    expect(nowIn("America/Argentina/Buenos_Aires", new Date("2026-10-06T02:30:00Z"))).toEqual({
      date: "2026-10-05",
      minute: 23 * 60 + 30,
    });
  });

  it("cuenta minutos entre días", () => {
    expect(minutesUntil({ date: "2026-10-05", minute: 600 }, { date: "2026-10-06", start: 540 })).toBe(1380);
  });
});
