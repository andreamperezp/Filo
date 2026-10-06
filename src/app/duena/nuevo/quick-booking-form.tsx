"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
import { formatMoney } from "@/domain/money";
import { formatDuration, formatTime } from "@/domain/time";
import { ANY_PROFESSIONAL } from "@/domain/types";
import { ownerQuickBooking, type WalkInState } from "@/server/actions";
import { FormError, SubmitButton } from "@/components/forms";
import { BottomAction, H1, WithSidebar, cx } from "@/components/ui";

interface ServiceOption {
  id: string;
  name: string;
  durationMin: number;
  priceArs: number;
  professionalIds: string[];
}
interface ProOption {
  id: string;
  name: string;
  colorToken: "pro-1" | "pro-2" | "pro-3";
}

const PRO_BG = { "pro-1": "bg-pro-1", "pro-2": "bg-pro-2", "pro-3": "bg-pro-3" } as const;
const key = (svc: string, pro: string, date: string) => `${svc}|${pro}|${date}`;

export function QuickBookingForm({
  services,
  professionals,
  days,
  free,
  initial,
}: {
  services: ServiceOption[];
  professionals: ProOption[];
  days: Array<{ date: string; label: string }>;
  free: Record<string, Array<[number, string]>>;
  initial: { pro?: string; date?: string; start?: number };
}) {
  const [state, action] = useActionState<WalkInState, FormData>(ownerQuickBooking, { error: null });

  // Si llega desde un hueco de la agenda, arranca con ese profesional, día y hora.
  const initialPro = professionals.some((p) => p.id === initial.pro) ? initial.pro! : ANY_PROFESSIONAL;
  const initialService =
    services.find((s) => initialPro === ANY_PROFESSIONAL || s.professionalIds.includes(initialPro)) ?? services[0];

  const [serviceId, setServiceId] = useState(initialService.id);
  const [pro, setPro] = useState(initialPro);
  const [date, setDate] = useState(days.some((d) => d.date === initial.date) ? initial.date! : days[0]?.date);
  const [start, setStart] = useState<number | undefined>(initial.start);

  const service = services.find((s) => s.id === serviceId)!;
  const proChoices = [ANY_PROFESSIONAL, ...service.professionalIds];
  const slots = useMemo(() => (date ? (free[key(serviceId, pro, date)] ?? []) : []), [free, serviceId, pro, date]);
  // Si el horario elegido deja de servir al cambiar algo, se toma el primero libre.
  const selected = slots.find(([m]) => m === start) ?? slots[0];
  const assigned = professionals.find((p) => p.id === selected?.[1]);
  const nextDayWithSlots = days.find((d) => d.date > (date ?? "") && free[key(serviceId, pro, d.date)]?.length);

  const pickService = (id: string) => {
    const next = services.find((s) => s.id === id)!;
    setServiceId(id);
    if (pro !== ANY_PROFESSIONAL && !next.professionalIds.includes(pro)) setPro(ANY_PROFESSIONAL);
  };

  return (
    <form action={action} className="contents">
      <WithSidebar>
        <main className="flex flex-col gap-6 pb-6">
          <H1 sub="Para la clienta que está en el local o te llama.">Turno rápido</H1>

          <Section title="Clienta">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Nombre"
                name="clientName"
                autoComplete="off"
                defaultValue={state.values?.clientName}
                required
                autoFocus
              />
              <TextField
                label="Celular (opcional)"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="11 5523-8841"
                defaultValue={state.values?.phone}
                hint="Para mandarle el recordatorio por WhatsApp."
              />
            </div>
          </Section>

          <Section title="Servicio">
            <RadioGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {services.map((s) => (
                <Radio
                  key={s.id}
                  name="serviceId"
                  value={s.id}
                  checked={s.id === serviceId}
                  onChange={() => pickService(s.id)}
                >
                  <span className="block font-bold">{s.name}</span>
                  <span className="block text-xs text-muted">
                    {formatDuration(s.durationMin)} · {formatMoney(s.priceArs)}
                  </span>
                </Radio>
              ))}
            </RadioGrid>
          </Section>

          <Section title="Con quién">
            <RadioGrid className="grid-cols-2 sm:grid-cols-4">
              {proChoices.map((id) => {
                const p = professionals.find((x) => x.id === id);
                return (
                  <Radio key={id} name="professional" value={id} checked={id === pro} onChange={() => setPro(id)}>
                    <span className="flex items-center gap-2 font-bold">
                      {p && <span aria-hidden className={cx("size-2.5 rounded-full", PRO_BG[p.colorToken])} />}
                      {p?.name ?? "Cualquiera"}
                    </span>
                  </Radio>
                );
              })}
            </RadioGrid>
          </Section>

          <Section title="Día">
            <div className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
              <RadioGrid className="flex md:grid md:grid-cols-6 lg:grid-cols-7">
                {days.map((d) => {
                  const count = free[key(serviceId, pro, d.date)]?.length ?? 0;
                  return (
                    <Radio
                      key={d.date}
                      name="date"
                      value={d.date}
                      checked={d.date === date}
                      onChange={() => setDate(d.date)}
                      className="min-w-24 text-center"
                    >
                      <span className="block font-bold whitespace-nowrap">{d.label}</span>
                      <span className="block text-xs text-muted">{count ? `${count} libres` : "Completo"}</span>
                    </Radio>
                  );
                })}
              </RadioGrid>
            </div>
          </Section>

          <Section title="Hora">
            {slots.length ? (
              <RadioGrid className="grid-cols-4 sm:grid-cols-6 lg:grid-cols-8">
                {slots.map(([m]) => (
                  <Radio
                    key={m}
                    name="start"
                    value={String(m)}
                    checked={m === selected?.[0]}
                    onChange={() => setStart(m)}
                    className="text-center font-bold tabular-nums"
                  >
                    {formatTime(m)}
                  </Radio>
                ))}
              </RadioGrid>
            ) : (
              <div className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
                No quedan horarios este día para esta combinación.
                {nextDayWithSlots && (
                  <button
                    type="button"
                    onClick={() => setDate(nextDayWithSlots.date)}
                    className="ml-1 font-semibold text-ink underline underline-offset-4"
                  >
                    Ver {nextDayWithSlots.label.toLowerCase()}
                  </button>
                )}
              </div>
            )}
          </Section>
        </main>

        <BottomAction title="Resumen">
          <p className="mb-2 text-sm text-muted lg:mb-4" aria-live="polite">
            {selected ? (
              <>
                <strong className="text-ink">
                  {days.find((d) => d.date === date)?.label} · {formatTime(selected[0])}
                </strong>{" "}
                · {service.name} con {assigned?.name}
              </>
            ) : (
              "Elegí un horario disponible."
            )}
          </p>
          <div className="flex flex-col gap-2">
            <FormError message={state.error} />
            <SubmitButton pendingLabel="Agendando…" className="w-full">
              Agendar turno
            </SubmitButton>
            <p className="hidden text-xs text-muted lg:block">Paga en el local. Sin seña.</p>
          </div>
        </BottomAction>
      </WithSidebar>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 px-4">
      <legend className="float-left mb-2 w-full text-xs font-bold tracking-wider text-muted uppercase">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function RadioGrid({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("grid gap-2", className)}>{children}</div>;
}

/** Radio nativo (teclado y lectores de pantalla gratis) con apariencia de tarjeta. */
function Radio({
  name,
  value,
  checked,
  onChange,
  className,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cx(
        "relative block min-h-12 cursor-pointer rounded-2xl border px-3 py-2.5 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary",
        checked ? "border-primary bg-accent-soft" : "border-line bg-surface hover:border-primary",
        className,
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

function TextField({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <input
        {...props}
        className="min-h-12 rounded-xl border border-line bg-surface px-3 text-base font-normal focus:border-primary focus:outline-none"
      />
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}
