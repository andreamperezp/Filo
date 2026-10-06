import Link from "next/link";
import type { ReactNode } from "react";
import { IconAlertTriangle, IconChevronRight } from "@tabler/icons-react";
import { PERIOD_LABEL, bookingRevenue, type Period } from "@/domain/earnings";
import { formatMoney } from "@/domain/money";
import { formatDuration, formatLongDay, formatRelativeDay, formatTime } from "@/domain/time";
import { PAYMENT_CHANNEL_LABEL } from "@/domain/types";
import { getEarnings } from "@/server/bookings";
import { requireStaff } from "@/server/session";
import { H1, ProDot, Screen, SectionTitle, cx } from "@/components/ui";
import { DailyRevenueChart } from "./daily-chart";

export const metadata = { title: "Caja" };

const PERIODS = Object.keys(PERIOD_LABEL) as Period[];

function href(period: Period, pro: string | null) {
  const qs = new URLSearchParams({ periodo: period });
  if (pro) qs.set("pro", pro);
  return `/panel/caja?${qs}`;
}

/**
 * Caja: cuánto se cobró, cuánto tiempo llevó y cuánto vale la hora de trabajo.
 * Sale de los turnos finalizados ("Finalizar y cobrar"). Un peluquero ve lo
 * suyo; el admin ve el local completo, con filtro y comparación por profesional.
 */
export default async function Cashbox({ searchParams }: PageProps<"/panel/caja">) {
  const user = await requireStaff();
  const query = await searchParams;
  const period: Period = PERIODS.includes(query.periodo as Period) ? (query.periodo as Period) : "hoy";
  const requestedPro = typeof query.pro === "string" ? query.pro : null;
  const {
    now,
    catalog,
    range,
    professionalId,
    team,
    summary: s,
    closed,
  } = await getEarnings(user, period, requestedPro);
  const isAdmin = user.role === "admin";
  const proFilter = isAdmin ? professionalId : null;

  return (
    <Screen width="wide">
      <main className="flex-1 pb-10">
        <div className="pt-6">
          <H1
            sub={
              range.from === range.to
                ? formatLongDay(range.from)
                : `${formatLongDay(range.from)} al ${formatLongDay(range.to).toLowerCase()}`
            }
          >
            {isAdmin ? "Caja" : "Tu caja"}
          </H1>
        </div>

        <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Período" className="flex gap-1 self-start rounded-full bg-surface-2 p-1">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={href(p, proFilter)}
                replace
                scroll={false}
                aria-current={p === period ? "page" : undefined}
                className={cx(
                  "flex min-h-10 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap",
                  p === period ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                {PERIOD_LABEL[p]}
              </Link>
            ))}
          </nav>
          {isAdmin && (
            <nav aria-label="Profesional" className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4 lg:mx-0 lg:px-0">
              <ul className="flex gap-2">
                {[{ id: null, name: "Todo el local" }, ...team].map((p) => {
                  const on = p.id === proFilter;
                  return (
                    <li key={p.id ?? "todos"}>
                      <Link
                        href={href(period, p.id)}
                        replace
                        scroll={false}
                        aria-current={on ? "true" : undefined}
                        className={cx(
                          "flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap",
                          on ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-ink",
                        )}
                      >
                        {p.id && <ProDot pro={catalog.professionalById.get(p.id)!} />}
                        {p.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>

        {s.pendingCount > 0 && (
          <Link href="/panel" className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-danger-soft p-4 text-danger">
            <IconAlertTriangle aria-hidden size={22} className="shrink-0" />
            <span className="flex-1 text-sm font-semibold">
              {s.pendingCount === 1 ? "1 turno terminó" : `${s.pendingCount} turnos terminaron`} sin cerrar. Finalizalos
              y cargá lo cobrado para que la caja dé bien.
            </span>
            <IconChevronRight aria-hidden size={20} />
          </Link>
        )}

        {/* Números clave: lo primero que se lee. */}
        <section aria-label="Resumen" className="grid grid-cols-2 gap-3 px-4 pt-4 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="Ingresos" value={formatMoney(s.revenueArs)} hero className="col-span-2 md:col-span-1" />
          <Stat label="Turnos finalizados" value={String(s.closedCount)} />
          <Stat label="Ticket promedio" value={s.avgTicket === null ? "—" : formatMoney(s.avgTicket)} />
          <Stat
            label="Tiempo invertido"
            value={s.minutes ? formatDuration(s.minutes) : "—"}
            hint={s.avgMinutes ? `${formatDuration(s.avgMinutes)} por clienta` : undefined}
          />
          <Stat
            label="Valor por hora"
            value={s.valuePerHour === null ? "—" : formatMoney(s.valuePerHour)}
            hint="Ingresos ÷ horas reales"
          />
          {s.tipsArs > 0 && <Stat label="Propinas" value={formatMoney(s.tipsArs)} hint="Aparte de los ingresos" />}
        </section>

        {s.closedCount === 0 ? (
          <p className="mx-4 mt-6 rounded-2xl bg-surface-2 p-6 text-center text-muted">
            Todavía no hay turnos finalizados {period === "hoy" ? "hoy" : "en este período"}. Al terminar un turno, tocá
            “Finalizar y cobrar” en su detalle.
          </p>
        ) : (
          <>
            {period !== "hoy" && (
              <div className="px-4 pt-6">
                <DailyRevenueChart days={s.daily} />
              </div>
            )}

            <div className="grid gap-6 px-4 pt-2 lg:grid-cols-2">
              <section aria-labelledby="by-channel">
                <SectionTitle id="by-channel">Por medio de pago</SectionTitle>
                <ul className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
                  {s.byChannel.map((c) => {
                    const max = s.byChannel[0].amountArs || 1;
                    return (
                      <li key={c.channel}>
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="font-semibold">{PAYMENT_CHANNEL_LABEL[c.channel]}</span>
                          <span className="tabular-nums">
                            {formatMoney(c.amountArs)} <span className="text-muted">· {c.count}</span>
                          </span>
                        </div>
                        <div aria-hidden className="mt-1.5 h-2 rounded-full bg-surface-2">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${(c.amountArs / max) * 100}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                  <li className="text-xs text-muted">
                    Lo cobrado en el local, con propinas. Las señas online van aparte.
                  </li>
                </ul>
              </section>

              <section aria-labelledby="by-service">
                <SectionTitle id="by-service">Por servicio</SectionTitle>
                <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">
                          Servicio
                        </th>
                        <th scope="col" className="px-2 py-3 text-right font-semibold">
                          Turnos
                        </th>
                        <th scope="col" className="px-2 py-3 text-right font-semibold">
                          Ingresos
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">
                          Duración real
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {s.byService.map((row) => {
                        const diff = row.avgActualMin - row.avgScheduledMin;
                        return (
                          <tr key={row.serviceId}>
                            <th scope="row" className="px-4 py-3 text-left font-semibold">
                              {catalog.serviceById.get(row.serviceId)?.name ?? row.serviceId}
                            </th>
                            <td className="px-2 py-3 text-right tabular-nums">{row.count}</td>
                            <td className="px-2 py-3 text-right tabular-nums">{formatMoney(row.revenueArs)}</td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatDuration(row.avgActualMin)}
                              {diff !== 0 && (
                                <span className={cx("block text-xs", diff > 0 ? "text-danger" : "text-muted")}>
                                  {diff > 0 ? `+${diff}` : diff} min vs agendado
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {isAdmin && !proFilter && s.byProfessional.length > 1 && (
              <section aria-labelledby="by-pro" className="px-4 pt-2">
                <SectionTitle id="by-pro">Por profesional</SectionTitle>
                <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
                  <table className="w-full min-w-[34rem] text-sm">
                    <thead className="text-left text-xs text-muted">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">
                          Profesional
                        </th>
                        <th scope="col" className="px-2 py-3 text-right font-semibold">
                          Turnos
                        </th>
                        <th scope="col" className="px-2 py-3 text-right font-semibold">
                          Ingresos
                        </th>
                        <th scope="col" className="px-2 py-3 text-right font-semibold">
                          Tiempo
                        </th>
                        <th scope="col" className="px-2 py-3 text-right font-semibold">
                          Valor / hora
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">
                          Propinas
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {s.byProfessional.map((row) => {
                        const pro = catalog.professionalById.get(row.professionalId);
                        return (
                          <tr key={row.professionalId}>
                            <th scope="row" className="px-4 py-3 text-left">
                              <Link
                                href={href(period, row.professionalId)}
                                className="flex items-center gap-2 font-semibold hover:underline"
                              >
                                {pro && <ProDot pro={pro} />}
                                {pro?.name ?? row.professionalId}
                              </Link>
                            </th>
                            <td className="px-2 py-3 text-right tabular-nums">{row.count}</td>
                            <td className="px-2 py-3 text-right tabular-nums">{formatMoney(row.revenueArs)}</td>
                            <td className="px-2 py-3 text-right tabular-nums">{formatDuration(row.minutes)}</td>
                            <td className="px-2 py-3 text-right tabular-nums">
                              {row.valuePerHour === null ? "—" : formatMoney(row.valuePerHour)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">{formatMoney(row.tipsArs)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section aria-labelledby="closed-list" className="px-4 pt-2">
              <SectionTitle id="closed-list">Turnos finalizados</SectionTitle>
              <ol className="divide-y divide-line rounded-3xl border border-line bg-surface">
                {closed.slice(0, 40).map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/panel/turnos/${b.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50"
                    >
                      <div className="w-20 shrink-0 text-sm tabular-nums">
                        <p className="font-semibold">{formatTime(b.start)}</p>
                        <p className="text-xs text-muted">{formatRelativeDay(b.date, now.date)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{b.clientName}</p>
                        <p className="truncate text-sm text-muted">
                          {catalog.serviceById.get(b.serviceId)?.name}
                          {isAdmin && !proFilter && ` · ${catalog.professionalById.get(b.professionalId)?.name}`} ·{" "}
                          {formatDuration(b.checkout!.actualDurationMin)} · {PAYMENT_CHANNEL_LABEL[b.checkout!.channel]}
                        </p>
                      </div>
                      <p className="font-semibold tabular-nums">{formatMoney(bookingRevenue(b))}</p>
                    </Link>
                  </li>
                ))}
              </ol>
              {closed.length > 40 && (
                <p className="mt-2 px-1 text-xs text-muted">Se muestran los últimos 40 de {closed.length}.</p>
              )}
            </section>
          </>
        )}
      </main>
    </Screen>
  );
}

function Stat({
  label,
  value,
  hint,
  hero = false,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  hero?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-line bg-surface p-4",
        hero && "bg-accent-soft text-on-accent-soft",
        className,
      )}
    >
      <p className={cx("text-xs font-semibold", hero ? "opacity-80" : "text-muted")}>{label}</p>
      <p className={cx("mt-1 font-display tabular-nums", hero ? "text-4xl" : "text-2xl")}>{value}</p>
      {hint && <p className={cx("mt-0.5 text-xs", hero ? "opacity-80" : "text-muted")}>{hint}</p>}
    </div>
  );
}
