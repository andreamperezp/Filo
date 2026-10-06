"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { addDays, dayOfMonth, formatLongDay, weekday } from "@/domain/time";
import { cx } from "./ui";

export interface CalendarDay {
  date: string;
  /** Horarios libres para la combinación elegida. */
  free: number;
  closed: boolean;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
/** A partir de cuántos horarios libres un día se considera "con mucho lugar". */
const PLENTY = 8;

/**
 * Calendario mensual con la disponibilidad de cada día:
 * - número de horarios libres y color (mucho lugar / poco lugar / completo),
 * - días fuera del período, cerrados o completos, deshabilitados,
 * - teclado: flechas para moverse por días y semanas, Enter para elegir
 *   (un solo día enfocable a la vez: "roving tabindex").
 */
export function DayCalendar({
  days,
  selected,
  today,
  onSelect,
}: {
  days: CalendarDay[];
  selected: string | undefined;
  today: string;
  onSelect: (date: string) => void;
}) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const months = useMemo(() => [...new Set(days.map((d) => d.date.slice(0, 7)))], [days]);
  const [month, setMonth] = useState(() => (selected ?? days[0]?.date ?? today).slice(0, 7));
  const [focused, setFocused] = useState(selected ?? today);
  const gridRef = useRef<HTMLDivElement>(null);

  const monthIndex = months.indexOf(month);
  const [year, monthNumber] = month.split("-").map(Number);
  const first = `${month}-01`;
  // Semana empieza el lunes (Argentina): cuántos huecos antes del día 1.
  const lead = (weekday(first) + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  const selectable = (date: string) => {
    const d = byDate.get(date);
    return !!d && !d.closed && d.free > 0;
  };

  const moveFocus = (date: string) => {
    if (!byDate.has(date)) return;
    setFocused(date);
    setMonth(date.slice(0, 7));
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)?.focus());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) {
      e.preventDefault();
      moveFocus(addDays(date, step));
    }
  };

  return (
    <div className="rounded-3xl border border-line bg-surface p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(months[monthIndex - 1])}
          disabled={monthIndex <= 0}
          aria-label="Mes anterior"
          className="grid size-11 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-30"
        >
          <IconChevronLeft aria-hidden size={20} />
        </button>
        <p aria-live="polite" className="font-display text-xl">
          {MONTHS[monthNumber - 1]} {year}
        </p>
        <button
          type="button"
          onClick={() => setMonth(months[monthIndex + 1])}
          disabled={monthIndex >= months.length - 1}
          aria-label="Mes siguiente"
          className="grid size-11 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-30"
        >
          <IconChevronRight aria-hidden size={20} />
        </button>
      </div>

      <div ref={gridRef} role="group" aria-label={`Días de ${MONTHS[monthNumber - 1]} ${year}`}>
        {/* Cada día ya anuncia su nombre completo: la cabecera es solo visual. */}
        <div aria-hidden className="grid grid-cols-7 pb-1 text-center text-xs font-semibold text-muted">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <span key={`lead-${i}`} aria-hidden />;
            const info = byDate.get(date);
            const enabled = selectable(date);
            const on = date === selected;
            const label = !info
              ? "fuera del período"
              : info.closed
                ? "cerrado"
                : info.free
                  ? `${info.free} horarios libres`
                  : "completo";
            return (
              <button
                key={date}
                type="button"
                data-date={date}
                tabIndex={date === focused ? 0 : -1}
                aria-pressed={on}
                aria-disabled={!enabled}
                aria-label={`${formatLongDay(date)}${date === today ? " (hoy)" : ""}: ${label}`}
                onClick={() => enabled && onSelect(date)}
                onFocus={() => setFocused(date)}
                onKeyDown={(e) => onKeyDown(e, date)}
                className={cx(
                  "relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl text-sm transition sm:aspect-auto sm:h-14",
                  on && "bg-primary text-on-primary",
                  !on && enabled && "hover:bg-surface-2",
                  !enabled && "cursor-default opacity-35",
                  date === today && !on && "ring-1 ring-primary",
                )}
              >
                <span className="font-bold tabular-nums">{dayOfMonth(date)}</span>
                {info && !info.closed && (
                  <span
                    className={cx(
                      "text-[10px] leading-none font-semibold",
                      on
                        ? "text-on-primary"
                        : info.free >= PLENTY
                          ? "text-on-ok"
                          : info.free
                            ? "text-on-accent-soft"
                            : "line-through",
                    )}
                  >
                    {info.free || "—"}
                  </span>
                )}
                {info && !info.closed && info.free > 0 && !on && (
                  <span
                    aria-hidden
                    className={cx(
                      "absolute top-1.5 right-1.5 size-1.5 rounded-full",
                      info.free >= PLENTY ? "bg-[#3f8f5c]" : "bg-[#d08a2c]",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-[#3f8f5c]" /> Mucho lugar
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-[#d08a2c]" /> Poco lugar
        </span>
        <span>El número es la cantidad de horarios libres</span>
      </p>
    </div>
  );
}

/** Primer día con lugar desde `from` (para preseleccionar). */
export function firstDayWithRoom(days: CalendarDay[], from?: string): string | undefined {
  return days.find((d) => (!from || d.date >= from) && !d.closed && d.free > 0)?.date;
}
