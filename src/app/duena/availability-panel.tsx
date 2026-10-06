"use client";

import { useActionState, useState } from "react";
import { IconCalendarOff } from "@tabler/icons-react";
import { ownerSetRange, type RangeState } from "@/server/actions";
import { SubmitButton } from "@/components/forms";
import { cx } from "@/components/ui";

interface Option {
  value: number;
  label: string;
}

/**
 * "Marcar disponibilidad": la dueña indica cuándo NO atiende (franco, trámite,
 * almuerzo, vacaciones de un profesional) en un solo paso, sin tocar horario por
 * horario. Los atajos cubren los casos comunes; el rango libre, el resto.
 */
export function AvailabilityPanel({
  date,
  dayLabel,
  professionals,
  defaultProfessional,
  starts,
  ends,
  noon,
}: {
  date: string;
  dayLabel: string;
  professionals: Array<{ id: string; name: string }>;
  defaultProfessional: string | null;
  starts: Option[];
  ends: Option[];
  noon: number;
}) {
  const [state, action] = useActionState<RangeState, FormData>(ownerSetRange, { error: null });
  const first = starts[0]?.value ?? 0;
  const last = ends.at(-1)?.value ?? 1440;
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(last);

  const presets = [
    { label: "Todo el día", from: first, to: last },
    { label: "Mañana", from: first, to: noon },
    { label: "Tarde", from: noon, to: last },
  ].filter((p) => p.from < p.to);

  if (!starts.length) return null;

  return (
    <details className="group mx-4 rounded-2xl border border-line bg-surface open:pb-4">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-semibold [&::-webkit-details-marker]:hidden">
        <IconCalendarOff aria-hidden size={20} className="text-muted" />
        Marcar disponibilidad<span className="hidden font-normal text-muted sm:inline"> · {dayLabel}</span>
        <span aria-hidden className="ml-auto text-muted transition group-open:rotate-180">
          ▾
        </span>
      </summary>

      <form action={action} className="grid gap-4 px-4 pt-2 md:grid-cols-[1fr_auto] md:items-end">
        <input type="hidden" name="date" value={date} />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Profesional
            <select name="professionalId" defaultValue={defaultProfessional ?? "todos"} className={selectClass}>
              <option value="todos">Todo el equipo</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Desde
            <select name="from" value={from} onChange={(e) => setFrom(Number(e.target.value))} className={selectClass}>
              {starts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Hasta
            <select name="to" value={to} onChange={(e) => setTo(Number(e.target.value))} className={selectClass}>
              {ends.map((o) => (
                <option key={o.value} value={o.value} disabled={o.value <= from}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-3" role="group" aria-label="Atajos de horario">
            {presets.map((p) => {
              const on = p.from === from && p.to === to;
              return (
                <button
                  key={p.label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setFrom(p.from);
                    setTo(p.to);
                  }}
                  className={cx(
                    "min-h-10 rounded-full border px-4 text-sm font-semibold",
                    on ? "border-ink bg-ink text-bg" : "border-line bg-bg",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
          <SubmitButton name="mode" value="block" pendingLabel="Guardando…" className="px-4">
            No disponible
          </SubmitButton>
          <SubmitButton name="mode" value="unblock" variant="secondary" pendingLabel="Guardando…" className="px-4">
            Disponible
          </SubmitButton>
        </div>

        <p
          aria-live="polite"
          className={cx("text-sm md:col-span-2", state.error ? "font-semibold text-danger" : "text-muted")}
        >
          {state.error ?? state.message}
        </p>
      </form>
    </details>
  );
}

const selectClass = "min-h-12 rounded-xl border border-line bg-bg px-3 text-base font-normal";
