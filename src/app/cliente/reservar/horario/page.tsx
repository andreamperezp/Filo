import Link from "next/link";
import { redirect } from "next/navigation";
import { ANY_PROFESSIONAL } from "@/domain/types";
import { dayOfMonth, dayShortName, formatDuration, formatRelativeDay, formatTime } from "@/domain/time";
import { getAvailability, professionalName, serviceOrNull } from "@/server/bookings";
import { requireClient } from "@/server/session";
import { getClientBookings } from "@/server/bookings";
import { BottomAction, ButtonLink, H1, Screen, TopBar, WithSidebar, cx } from "@/components/ui";
import { flowHref, readFlowParams } from "../params";

export const metadata = { title: "Elegí día y hora" };

const NOON = 13 * 60;

/** Paso 3 de 4: día y hora. También se usa para reprogramar (`?turno=`). */
export default async function PickTime({ searchParams }: PageProps<"/cliente/reservar/horario">) {
  const client = await requireClient();
  const params = await readFlowParams(searchParams);
  const service = serviceOrNull(params.servicio);
  if (!service) redirect("/cliente/reservar");
  const professional = params.profesional ?? ANY_PROFESSIONAL;

  const rescheduling = params.turno
    ? (await getClientBookings(client.id)).upcoming.find((b) => b.id === params.turno && b.canModify)
    : undefined;
  if (params.turno && !rescheduling) redirect("/cliente/turnos");

  const { now, date, days, slots } = await getAvailability({
    service,
    professional,
    date: params.fecha,
    ignoreBookingId: rescheduling?.id,
  });
  const base = { servicio: service.id, profesional: professional, turno: rescheduling?.id };
  const selected = slots.find((s) => s.start === params.hora && params.fecha === date && s.assignTo);
  const groups = [
    { label: "Mañana", slots: slots.filter((s) => s.start < NOON) },
    { label: "Tarde", slots: slots.filter((s) => s.start >= NOON) },
  ].filter((g) => g.slots.length);
  const anyFree = slots.some((s) => s.assignTo);
  const closedDay = days.find((d) => d.date === date)?.closed;

  return (
    <Screen>
      <TopBar
        backHref={
          rescheduling
            ? "/cliente/turnos"
            : flowHref("/cliente/reservar/profesional", { servicio: service.id, profesional: professional })
        }
        backLabel="Volver"
        progress={rescheduling ? undefined : { step: 3, total: 4, label: "Paso 3 de 4" }}
        title={rescheduling ? "Cambiar turno" : undefined}
      />
      <WithSidebar>
        <main className="pb-4">
          <H1 sub={`${service.name} · ${formatDuration(service.durationMin)} · ${professionalName(professional)}`}>
            Elegí día y hora
          </H1>

          <nav
            aria-label="Días disponibles"
            className="[scrollbar-width:none] overflow-x-auto px-4 pb-2 md:overflow-visible"
          >
            <ul className="flex gap-2 md:grid md:grid-cols-7">
              {days.map((d) => {
                const on = d.date === date;
                const disabled = d.closed || d.free === 0;
                return (
                  <li key={d.date}>
                    <Link
                      href={flowHref("/cliente/reservar/horario", { ...base, fecha: d.date })}
                      replace
                      scroll={false}
                      aria-current={on ? "date" : undefined}
                      aria-label={`${formatRelativeDay(d.date, now.date)}: ${d.closed ? "cerrado" : d.free === 0 ? "completo" : `${d.free} horarios libres`}`}
                      className={cx(
                        "flex w-16 flex-col items-center rounded-2xl border py-2.5 transition hover:border-primary md:w-full",
                        on ? "border-primary bg-primary text-on-primary" : "border-line bg-surface",
                        disabled && !on && "opacity-45",
                      )}
                    >
                      <span className="text-xs font-semibold">
                        {d.date === now.date ? "Hoy" : dayShortName(d.date)}
                      </span>
                      <span className="text-xl font-bold">{dayOfMonth(d.date)}</span>
                      <span className="text-[10px] font-semibold">
                        {d.closed ? "Cerrado" : d.free === 0 ? "Completo" : `${d.free} libres`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {!anyFree ? (
            <p className="mx-4 mt-4 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
              {closedDay ? "Los domingos está cerrado." : "No quedan horarios este día. Probá otro."}
            </p>
          ) : (
            groups.map((g) => (
              <section key={g.label} aria-label={g.label} className="px-4 pt-4">
                <h2 className="pb-2 text-xs font-bold tracking-wider text-muted uppercase">{g.label}</h2>
                <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-6 xl:grid-cols-8">
                  {g.slots.map((s) => {
                    const on = selected?.start === s.start;
                    return (
                      <li key={s.start}>
                        {s.assignTo ? (
                          <Link
                            href={flowHref("/cliente/reservar/horario", { ...base, fecha: date, hora: s.start })}
                            replace
                            scroll={false}
                            aria-pressed={on}
                            className={cx(
                              "grid min-h-11 place-items-center rounded-xl border text-[15px] font-bold tabular-nums",
                              on ? "border-primary bg-primary text-on-primary" : "border-line bg-surface",
                            )}
                          >
                            {formatTime(s.start)}
                          </Link>
                        ) : (
                          <span className="grid min-h-11 place-items-center text-[15px] text-muted line-through">
                            <span className="sr-only">Ocupado: </span>
                            {formatTime(s.start)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </main>
        <BottomAction title="Tu turno">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-muted">{rescheduling ? "Nuevo horario" : "Tu turno"}</span>
            <span className="font-bold" aria-live="polite">
              {selected ? `${formatRelativeDay(date, now.date)} · ${formatTime(selected.start)}` : "Elegí un horario"}
            </span>
          </div>
          {selected ? (
            <ButtonLink
              href={flowHref("/cliente/reservar/confirmar", { ...base, fecha: date, hora: selected.start })}
              className="w-full"
            >
              Continuar
            </ButtonLink>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary font-bold text-on-primary opacity-40"
            >
              Continuar
            </button>
          )}
        </BottomAction>
      </WithSidebar>
    </Screen>
  );
}
