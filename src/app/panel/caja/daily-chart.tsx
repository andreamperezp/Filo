import { formatMoney } from "@/domain/money";
import { dayOfMonth, dayShortName, formatLongDay } from "@/domain/time";
import { cx } from "@/components/ui";

/**
 * Ingresos por día (una sola serie → un solo color, sin leyenda: el título la
 * nombra). Barras finas con borde superior redondeado ancladas a la base, 2px
 * de separación, grilla tenue. Cada barra es enfocable y muestra su valor al
 * pasar el mouse o con teclado; además hay una tabla equivalente para lectores
 * de pantalla. Sin JS: tooltip por CSS.
 */
export function DailyRevenueChart({ days }: { days: Array<{ date: string; revenueArs: number }> }) {
  const max = Math.max(...days.map((d) => d.revenueArs), 1);
  const best = days.reduce((a, b) => (b.revenueArs > a.revenueArs ? b : a), days[0]);
  const labelEvery = days.length > 14 ? 5 : 1;

  return (
    <figure className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
      <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">Ingresos por día</span>
        {best.revenueArs > 0 && (
          <span className="text-xs text-muted">
            Mejor día: {formatLongDay(best.date)} · {formatMoney(best.revenueArs)}
          </span>
        )}
      </figcaption>

      <div aria-hidden className="relative h-44">
        {/* Grilla recesiva: base, mitad y máximo. */}
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-line/70" style={{ bottom: `${f * 100}%` }} />
        ))}
        <div className="absolute inset-0 flex items-end gap-0.5">
          {days.map((d) => (
            <div
              key={d.date}
              tabIndex={0}
              className="group relative flex h-full flex-1 items-end justify-center outline-none focus-visible:outline-2 focus-visible:outline-primary"
            >
              <div
                className={cx(
                  "w-full max-w-10 rounded-t-[4px] transition-colors",
                  d.revenueArs ? "bg-primary group-hover:bg-ink" : "",
                )}
                style={{ height: `${(d.revenueArs / max) * 100}%` }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-xs whitespace-nowrap text-bg shadow group-hover:block group-focus-visible:block">
                {dayShortName(d.date)} {dayOfMonth(d.date)} · {formatMoney(d.revenueArs)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="mt-1 flex gap-0.5 text-center text-[10px] text-muted">
        {days.map((d, i) => (
          <span key={d.date} className="flex-1 tabular-nums">
            {i % labelEvery === 0 || i === days.length - 1 ? dayOfMonth(d.date) : ""}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Ingresos por día</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Ingresos</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{formatLongDay(d.date)}</th>
              <td>{formatMoney(d.revenueArs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
