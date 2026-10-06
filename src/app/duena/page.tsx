import Link from "next/link";
import type { ReactNode } from "react";
import { IconLock, IconLockOpen, IconPlus } from "@tabler/icons-react";
import { BUSINESS, PROFESSIONALS, PROFESSIONAL_BY_ID, SERVICE_BY_ID } from "@/data/catalog";
import { dayGrid } from "@/domain/availability";
import { formatMoney } from "@/domain/money";
import { depositAmount } from "@/domain/policies";
import { dayOfMonth, dayShortName, formatDuration, formatLongDay, formatTime, isIsoDate, weekday } from "@/domain/time";
import type { Booking } from "@/domain/types";
import { ownerToggleBlock } from "@/server/actions";
import { getOwnerDay } from "@/server/bookings";
import { requireOwner } from "@/server/session";
import { Badge, ProDot, Screen, cx } from "@/components/ui";
import { AvailabilityPanel } from "./availability-panel";

export const metadata = { title: "Agenda" };

const NOON = 13 * 60;

function agendaHref(dia: string, pro: string | null) {
  const qs = new URLSearchParams({ dia });
  if (pro) qs.set("pro", pro);
  return `/duena?${qs}`;
}

/**
 * Agenda de la dueña.
 * - Celular: lista cronológica, días en tira deslizable.
 * - Tablet/escritorio: los 14 días a la vista y, en "Todos", una columna por
 *   profesional (como la planilla de papel que usan en el local).
 * - Vista por profesional: grilla completa con huecos libres para agendar o bloquear.
 */
export default async function OwnerAgenda({ searchParams }: PageProps<"/duena">) {
  const owner = await requireOwner();
  const { dia, pro } = await searchParams;
  const proId = typeof pro === "string" && PROFESSIONAL_BY_ID.has(pro) ? pro : null;
  const agenda = await getOwnerDay(typeof dia === "string" && isIsoDate(dia) ? dia : "", proId);
  const freeCount = agenda.rows.filter((r) => r.kind === "free").length;
  const bookings = agenda.rows.flatMap((r) => (r.kind === "booking" ? [r.booking] : []));

  const grid = dayGrid(BUSINESS, agenda.date);
  const closeAt = BUSINESS.hours[weekday(agenda.date)]?.close ?? 0;
  const startOptions = grid.map((m) => ({ value: m, label: formatTime(m) }));
  const endOptions = [...grid.slice(1), closeAt].map((m) => ({ value: m, label: formatTime(m) }));

  return (
    <Screen width="wide">
      <main className="flex-1 pb-10">
        <header className="px-4 pt-5 md:pt-8">
          <p className="text-sm text-muted">Buen día, {owner.firstName}</p>
          <h1 className="font-display text-[2.1rem] leading-tight md:text-5xl">{formatLongDay(agenda.date)}</h1>
        </header>

        {/* Días: cada uno muestra cuántos turnos tiene (densidad de un vistazo). */}
        <nav aria-label="Días" className="[scrollbar-width:none] overflow-x-auto px-4 pt-4 pb-1 md:overflow-visible">
          <ul className="flex gap-2 md:grid md:grid-cols-7 lg:grid-cols-14">
            {agenda.days.map((d) => {
              const on = d.date === agenda.date;
              return (
                <li key={d.date}>
                  <Link
                    href={agendaHref(d.date, proId)}
                    replace
                    scroll={false}
                    aria-current={on ? "date" : undefined}
                    aria-label={`${formatLongDay(d.date)}: ${d.closed ? "cerrado" : `${d.count} turnos`}`}
                    className={cx(
                      "flex w-14 flex-col items-center rounded-2xl border py-2 transition md:w-full",
                      on ? "border-primary bg-primary text-on-primary" : "border-line bg-surface hover:border-primary",
                    )}
                  >
                    <span className="text-xs font-semibold">
                      {d.date === agenda.now.date ? "Hoy" : dayShortName(d.date)}
                    </span>
                    <span className="text-lg font-bold">{dayOfMonth(d.date)}</span>
                    <span className="text-[11px] font-semibold opacity-80">{d.closed ? "—" : d.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex flex-col gap-3 pt-3 lg:flex-row lg:items-center">
          {/* Filtro por profesional */}
          <nav aria-label="Profesional" className="[scrollbar-width:none] overflow-x-auto px-4">
            <ul className="flex gap-2">
              {[{ id: null, name: "Todos" }, ...PROFESSIONALS].map((p) => {
                const on = p.id === proId;
                return (
                  <li key={p.id ?? "todos"}>
                    <Link
                      href={agendaHref(agenda.date, p.id)}
                      replace
                      scroll={false}
                      aria-current={on ? "true" : undefined}
                      className={cx(
                        "flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap",
                        on ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-ink",
                      )}
                    >
                      {p.id && <ProDot pro={PROFESSIONAL_BY_ID.get(p.id)!} />}
                      {p.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <p className="px-4 text-sm font-semibold text-muted lg:ml-auto" aria-live="polite">
            {agenda.closed
              ? "Domingo · cerrado"
              : `${agenda.bookingCount} ${agenda.bookingCount === 1 ? "turno" : "turnos"}${proId ? ` · ${freeCount} horarios libres` : ""}`}
          </p>
        </div>

        {!agenda.closed && (
          <div className="pt-4">
            <AvailabilityPanel
              key={`${agenda.date}-${proId}`}
              date={agenda.date}
              dayLabel={formatLongDay(agenda.date)}
              professionals={PROFESSIONALS.map((p) => ({ id: p.id, name: p.name }))}
              defaultProfessional={proId}
              starts={startOptions}
              ends={endOptions}
              noon={NOON}
            />
          </div>
        )}

        <div className="pt-4">
          {agenda.closed ? (
            <Empty>El local está cerrado.</Empty>
          ) : proId ? (
            <ProfessionalDay date={agenda.date} proId={proId} rows={agenda.rows} />
          ) : bookings.length === 0 ? (
            <Empty>No hay turnos este día.</Empty>
          ) : (
            <>
              {/* Celular: una lista cronológica. */}
              <ol className="flex flex-col gap-2 px-4 md:hidden">
                {bookings.map((b) => (
                  <li key={b.id}>
                    <BookingCard booking={b} showPro />
                  </li>
                ))}
              </ol>
              {/* Tablet/escritorio: una columna por profesional. */}
              <div className="hidden gap-4 px-4 md:grid md:grid-cols-3">
                {PROFESSIONALS.map((p) => {
                  const own = bookings.filter((b) => b.professionalId === p.id);
                  return (
                    <section key={p.id} aria-labelledby={`col-${p.id}`} className="rounded-3xl bg-surface-2/50 p-3">
                      <h2 id={`col-${p.id}`} className="flex items-center gap-2 px-1 pb-3 font-semibold">
                        <ProDot pro={p} />
                        <Link href={agendaHref(agenda.date, p.id)} className="hover:underline">
                          {p.name}
                        </Link>
                        <span className="ml-auto text-sm font-normal text-muted">{own.length}</span>
                      </h2>
                      {own.length ? (
                        <ol className="flex flex-col gap-2">
                          {own.map((b) => (
                            <li key={b.id}>
                              <BookingCard booking={b} compact />
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="px-1 pb-2 text-sm text-muted">Sin turnos.</p>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </Screen>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="mx-4 rounded-2xl bg-surface-2 p-6 text-center text-muted">{children}</p>;
}

function BookingCard({
  booking: b,
  showPro = false,
  compact = false,
}: {
  booking: Booking;
  showPro?: boolean;
  /** Para columnas angostas (tablet): hora arriba y nombre completo debajo, sin recortar. */
  compact?: boolean;
}) {
  const s = SERVICE_BY_ID.get(b.serviceId)!;
  const p = PROFESSIONAL_BY_ID.get(b.professionalId)!;
  const done = b.status === "attended";
  const payment = (
    <Badge tone={done ? "muted" : b.payment === "deposit" ? "ok" : "accent"}>
      {done
        ? "Atendido"
        : b.payment === "deposit"
          ? `Seña ${formatMoney(depositAmount(BUSINESS, s))}`
          : "Paga en local"}
    </Badge>
  );

  if (compact) {
    return (
      <Link
        href={`/duena/turnos/${b.id}`}
        className={cx(
          "block rounded-2xl border bg-surface p-3 transition hover:border-primary",
          b.unseenByOwner ? "border-primary" : "border-line",
          done && "opacity-60",
        )}
      >
        <p className="flex items-center justify-between gap-2 text-sm tabular-nums">
          <span>
            <strong>{formatTime(b.start)}</strong>
            <span className="text-muted"> – {formatTime(b.start + s.durationMin)}</span>
          </span>
          {b.unseenByOwner && <Badge tone="accent">Nuevo</Badge>}
        </p>
        <p className="mt-1 leading-snug font-bold break-words">{b.clientName}</p>
        <p className="text-sm text-muted">{s.name}</p>
        <p className="mt-2 text-xs">{payment}</p>
      </Link>
    );
  }

  return (
    <Link
      href={`/duena/turnos/${b.id}`}
      className={cx(
        "flex gap-3 rounded-2xl border bg-surface p-3.5 transition hover:border-primary",
        b.unseenByOwner ? "border-primary" : "border-line",
        done && "opacity-60",
      )}
    >
      <div className="w-12 shrink-0 text-right tabular-nums">
        <p className="font-bold">{formatTime(b.start)}</p>
        <p className="text-xs text-muted">{formatTime(b.start + s.durationMin)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-bold">
          <span className="truncate">{b.clientName}</span>
          {b.unseenByOwner && <Badge tone="accent">Nuevo</Badge>}
        </p>
        <p className="text-sm text-muted">
          {s.name} · {formatDuration(s.durationMin)}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          {showPro && (
            <span className="flex items-center gap-1.5 font-semibold">
              <ProDot pro={p} />
              {p.name}
            </span>
          )}
          {payment}
        </p>
      </div>
    </Link>
  );
}

/** Grilla completa de un profesional: turnos, huecos libres (agendar / bloquear) y no disponibles. */
function ProfessionalDay({
  date,
  proId,
  rows,
}: {
  date: string;
  proId: string;
  rows: Awaited<ReturnType<typeof getOwnerDay>>["rows"];
}) {
  if (!rows.length) return <Empty>No quedan horarios este día.</Empty>;
  return (
    <ol className="grid gap-2 px-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        if (row.kind === "booking") {
          return (
            <li key={row.booking.id}>
              <BookingCard booking={row.booking} />
            </li>
          );
        }
        const blocked = row.kind === "blocked";
        return (
          <li key={row.start}>
            <div
              className={cx(
                "flex min-h-14 items-center gap-1 rounded-2xl border border-dashed border-line pr-1.5 pl-3.5",
                blocked && "bg-surface-2",
              )}
            >
              <span className="w-12 text-right font-semibold text-muted tabular-nums">{formatTime(row.start)}</span>
              <span className="flex-1 pl-2 text-sm text-muted">{blocked ? "No disponible" : "Libre"}</span>
              {!blocked && (
                <Link
                  href={`/duena/nuevo?pro=${proId}&dia=${date}&hora=${row.start}`}
                  aria-label={`Agendar a las ${formatTime(row.start)}`}
                  className="flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-bold text-primary hover:bg-surface-2"
                >
                  <IconPlus aria-hidden size={16} stroke={2.4} />
                  Agendar
                </Link>
              )}
              <form action={ownerToggleBlock}>
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="professionalId" value={proId} />
                <input type="hidden" name="start" value={row.start} />
                <button
                  type="submit"
                  className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold hover:bg-surface-2"
                  aria-label={`${blocked ? "Liberar" : "Bloquear"} ${formatTime(row.start)}`}
                >
                  {blocked ? <IconLockOpen aria-hidden size={16} /> : <IconLock aria-hidden size={16} />}
                  <span className="hidden sm:inline">{blocked ? "Liberar" : "Bloquear"}</span>
                </button>
              </form>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
