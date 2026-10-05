import Link from "next/link";
import { IconLock, IconLockOpen } from "@tabler/icons-react";
import { BUSINESS, PROFESSIONALS, PROFESSIONAL_BY_ID, SERVICE_BY_ID } from "@/data/catalog";
import { formatMoney } from "@/domain/money";
import { depositAmount } from "@/domain/policies";
import { dayOfMonth, dayShortName, formatDuration, formatLongDay, formatTime, isIsoDate } from "@/domain/time";
import { ownerToggleBlock, signOut } from "@/server/actions";
import { getOwnerDay } from "@/server/bookings";
import { requireOwner } from "@/server/session";
import { Badge, ProDot, Screen, cx } from "@/components/ui";
import { OwnerTabs } from "./owner-tabs";

export const metadata = { title: "Agenda" };

function agendaHref(dia: string, pro: string | null) {
  const qs = new URLSearchParams({ dia });
  if (pro) qs.set("pro", pro);
  return `/duena?${qs}`;
}

export default async function OwnerAgenda({ searchParams }: PageProps<"/duena">) {
  const owner = await requireOwner();
  const { dia, pro } = await searchParams;
  const proId = typeof pro === "string" && PROFESSIONAL_BY_ID.has(pro) ? pro : null;
  const agenda = await getOwnerDay(typeof dia === "string" && isIsoDate(dia) ? dia : "", proId);
  const freeCount = agenda.rows.filter((r) => r.kind === "free").length;

  return (
    <Screen wide>
      <main className="flex-1 pb-6">
        <header className="flex items-start justify-between px-4 pt-5">
          <div>
            <p className="text-sm text-muted">Buen día, {owner.firstName}</p>
            <h1 className="font-display text-[2.1rem] leading-tight">{formatLongDay(agenda.date)}</h1>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Salir de la demo"
              className="grid size-11 place-items-center rounded-full bg-primary font-bold text-on-primary"
            >
              {owner.firstName[0]}
            </button>
          </form>
        </header>

        {/* Selector de día: cada día muestra cuántos turnos tiene (densidad de un vistazo). */}
        <nav aria-label="Días" className="[scrollbar-width:none] overflow-x-auto px-4 pt-4 pb-1">
          <ul className="flex gap-2">
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
                      "flex w-14 flex-col items-center rounded-2xl border py-2",
                      on ? "border-primary bg-primary text-on-primary" : "border-line bg-surface",
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

        {/* Filtro por profesional */}
        <nav aria-label="Profesional" className="[scrollbar-width:none] overflow-x-auto px-4 pt-3">
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
                      "flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap",
                      on ? "border-ink bg-ink text-bg" : "border-line bg-surface",
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

        <p className="px-4 pt-4 pb-2 text-sm font-semibold text-muted" aria-live="polite">
          {agenda.closed
            ? "Domingo · cerrado"
            : `${agenda.bookingCount} ${agenda.bookingCount === 1 ? "turno" : "turnos"}${proId ? ` · ${freeCount} horarios libres` : ""}`}
        </p>

        {agenda.rows.length === 0 ? (
          <p className="mx-4 rounded-2xl bg-surface-2 p-6 text-center text-muted">
            {agenda.closed ? "El local está cerrado." : "No hay turnos este día."}
          </p>
        ) : (
          <ol className="flex flex-col gap-2 px-4">
            {agenda.rows.map((row) => {
              if (row.kind === "booking") {
                const b = row.booking;
                const s = SERVICE_BY_ID.get(b.serviceId)!;
                const p = PROFESSIONAL_BY_ID.get(b.professionalId)!;
                const done = b.status === "attended";
                return (
                  <li key={b.id}>
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
                          <span className="flex items-center gap-1.5 font-semibold">
                            <ProDot pro={p} />
                            {p.name}
                          </span>
                          <Badge tone={done ? "muted" : b.payment === "deposit" ? "ok" : "accent"}>
                            {done
                              ? "Atendido"
                              : b.payment === "deposit"
                                ? `Seña ${formatMoney(depositAmount(BUSINESS, s))}`
                                : "Paga en local"}
                          </Badge>
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              }
              const blocked = row.kind === "blocked";
              return (
                <li key={row.start}>
                  <form
                    action={ownerToggleBlock}
                    className={cx(
                      "flex min-h-12 items-center gap-3 rounded-2xl border border-dashed px-3.5",
                      blocked ? "border-line bg-surface-2" : "border-line",
                    )}
                  >
                    <input type="hidden" name="date" value={agenda.date} />
                    <input type="hidden" name="professionalId" value={proId!} />
                    <input type="hidden" name="start" value={row.start} />
                    <span className="w-12 text-right font-semibold text-muted tabular-nums">
                      {formatTime(row.start)}
                    </span>
                    <span className="flex-1 text-sm text-muted">{blocked ? "Bloqueado" : "Libre"}</span>
                    <button
                      type="submit"
                      className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold hover:bg-surface-2"
                      aria-label={`${blocked ? "Liberar" : "Bloquear"} ${formatTime(row.start)}`}
                    >
                      {blocked ? <IconLockOpen aria-hidden size={16} /> : <IconLock aria-hidden size={16} />}
                      {blocked ? "Liberar" : "Bloquear"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ol>
        )}
      </main>
      <OwnerTabs />
    </Screen>
  );
}
