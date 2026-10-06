import { isPendingCheckout } from "./policies";
import { addDays, weekday } from "./time";
import type { Now } from "./availability";
import type { Booking, IsoDate, PaymentChannel } from "./types";

/**
 * Caja: lo cobrado y el tiempo invertido, a partir de los turnos cerrados.
 *
 * - Ingreso de un turno = lo cobrado en el local + la seña online (si hubo).
 * - Las propinas se informan aparte (son del profesional, no del servicio).
 * - Valor por hora = ingresos / horas reales trabajadas (sin propinas).
 */
export type Period = "hoy" | "semana" | "mes";

export const PERIOD_LABEL: Record<Period, string> = { hoy: "Hoy", semana: "Esta semana", mes: "Este mes" };

/** Rango de fechas (inclusive). La semana arranca el lunes, como en Argentina. */
export function periodRange(period: Period, today: IsoDate): { from: IsoDate; to: IsoDate } {
  if (period === "hoy") return { from: today, to: today };
  if (period === "semana") return { from: addDays(today, -((weekday(today) + 6) % 7)), to: today };
  return { from: `${today.slice(0, 8)}01`, to: today };
}

export const bookingRevenue = (b: Booking) => (b.checkout ? b.checkout.chargedArs + b.checkout.depositArs : 0);

export interface EarningsSummary {
  closedCount: number;
  revenueArs: number;
  tipsArs: number;
  minutes: number;
  /** `null` si todavía no hay minutos registrados. */
  valuePerHour: number | null;
  avgTicket: number | null;
  avgMinutes: number | null;
  /** Turnos que ya terminaron y nadie cerró ni cobró. */
  pendingCount: number;
  byChannel: Array<{ channel: PaymentChannel; amountArs: number; count: number }>;
  byService: Array<{
    serviceId: string;
    count: number;
    revenueArs: number;
    avgActualMin: number;
    avgScheduledMin: number;
  }>;
  byProfessional: Array<{
    professionalId: string;
    count: number;
    revenueArs: number;
    tipsArs: number;
    minutes: number;
    valuePerHour: number | null;
  }>;
  /** Ingreso por día del período, para el gráfico. */
  daily: Array<{ date: IsoDate; revenueArs: number }>;
}

const perHour = (amount: number, minutes: number) => (minutes > 0 ? Math.round((amount / minutes) * 60) : null);

export function summarizeEarnings(
  bookings: readonly Booking[],
  range: { from: IsoDate; to: IsoDate },
  now: Now,
): EarningsSummary {
  const inRange = bookings.filter((b) => b.date >= range.from && b.date <= range.to);
  const closed = inRange.filter((b) => b.status === "attended" && b.checkout);
  const revenue = closed.reduce((sum, b) => sum + bookingRevenue(b), 0);
  const tips = closed.reduce((sum, b) => sum + b.checkout!.tipArs, 0);
  const minutes = closed.reduce((sum, b) => sum + b.checkout!.actualDurationMin, 0);

  const group = <K extends string>(key: (b: Booking) => K) => {
    const map = new Map<K, Booking[]>();
    for (const b of closed) map.set(key(b), [...(map.get(key(b)) ?? []), b]);
    return [...map.entries()];
  };

  const days: IsoDate[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) days.push(d);

  return {
    closedCount: closed.length,
    revenueArs: revenue,
    tipsArs: tips,
    minutes,
    valuePerHour: perHour(revenue, minutes),
    avgTicket: closed.length ? Math.round(revenue / closed.length) : null,
    avgMinutes: closed.length ? Math.round(minutes / closed.length) : null,
    pendingCount: inRange.filter((b) => isPendingCheckout(b, now)).length,
    byChannel: group((b) => b.checkout!.channel)
      .map(([channel, list]) => ({
        channel,
        count: list.length,
        // Lo que entró por ese medio en el local (la seña online va por su lado).
        amountArs: list.reduce((s, b) => s + b.checkout!.chargedArs + b.checkout!.tipArs, 0),
      }))
      .sort((a, b) => b.amountArs - a.amountArs),
    byService: group((b) => b.serviceId)
      .map(([serviceId, list]) => ({
        serviceId,
        count: list.length,
        revenueArs: list.reduce((s, b) => s + bookingRevenue(b), 0),
        avgActualMin: Math.round(list.reduce((s, b) => s + b.checkout!.actualDurationMin, 0) / list.length),
        avgScheduledMin: Math.round(list.reduce((s, b) => s + b.durationMin, 0) / list.length),
      }))
      .sort((a, b) => b.revenueArs - a.revenueArs),
    byProfessional: group((b) => b.professionalId)
      .map(([professionalId, list]) => {
        const rev = list.reduce((s, b) => s + bookingRevenue(b), 0);
        const mins = list.reduce((s, b) => s + b.checkout!.actualDurationMin, 0);
        return {
          professionalId,
          count: list.length,
          revenueArs: rev,
          tipsArs: list.reduce((s, b) => s + b.checkout!.tipArs, 0),
          minutes: mins,
          valuePerHour: perHour(rev, mins),
        };
      })
      .sort((a, b) => b.revenueArs - a.revenueArs),
    daily: days.map((date) => ({
      date,
      revenueArs: closed.filter((b) => b.date === date).reduce((s, b) => s + bookingRevenue(b), 0),
    })),
  };
}
