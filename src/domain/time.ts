import type { IsoDate, MinuteOfDay } from "./types";

const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTH_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTH_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Fecha y minuto actuales en la zona horaria del local. */
export function nowIn(timeZone: string, at: Date = new Date()): { date: IsoDate; minute: MinuteOfDay } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minute: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function toUtc(date: IsoDate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const dt = toUtc(date);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

export function weekday(date: IsoDate): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return toUtc(date).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function dayOfMonth(date: IsoDate): number {
  return toUtc(date).getUTCDate();
}

export function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toUtc(value).getTime());
}

/** 570 → "9:30" */
export function formatTime(minute: MinuteOfDay): string {
  return `${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")}`;
}

/** 90 → "1 h 30 min" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function dayShortName(date: IsoDate): string {
  return DAY_SHORT[weekday(date)];
}

/** Etiqueta relativa: "Hoy", "Mañana" o "Mié 7 oct". */
export function formatRelativeDay(date: IsoDate, today: IsoDate): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  const dt = toUtc(date);
  return `${DAY_SHORT[dt.getUTCDay()]} ${dt.getUTCDate()} ${MONTH_SHORT[dt.getUTCMonth()]}`;
}

/** "Miércoles 7 de octubre" */
export function formatLongDay(date: IsoDate): string {
  const dt = toUtc(date);
  const day = DAY_LONG[dt.getUTCDay()];
  return `${day[0].toUpperCase()}${day.slice(1)} ${dt.getUTCDate()} de ${MONTH_LONG[dt.getUTCMonth()]}`;
}

/** Minutos que faltan desde `now` hasta el inicio de un turno. */
export function minutesUntil(
  now: { date: IsoDate; minute: MinuteOfDay },
  target: { date: IsoDate; start: MinuteOfDay },
): number {
  return daysBetween(now.date, target.date) * 1440 + target.start - now.minute;
}
