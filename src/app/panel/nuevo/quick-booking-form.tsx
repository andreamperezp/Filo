"use client";

import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { formatMoney } from "@/domain/money";
import { formatDuration, formatLongDay, formatTime, isIsoDate } from "@/domain/time";
import { ANY_PROFESSIONAL, type ProColor } from "@/domain/types";
import { comboKey } from "@/lib/combo-key";
import { staffQuickBooking, staffQuickSlots, type WalkInState } from "@/server/actions";
import { DayCalendar, firstDayWithRoom, type CalendarDay } from "@/components/day-calendar";
import { FormError, SubmitButton } from "@/components/forms";
import { BottomAction, H1, PRO_BG, WithSidebar, cx } from "@/components/ui";

interface ServiceOption {
  id: string;
  name: string;
  durationMin: number;
  priceArs: number;
  variablePrice: boolean;
  professionalIds: string[];
}
interface ProOption {
  id: string;
  name: string;
  colorToken: ProColor;
}

const NOON = 13 * 60;

export function QuickBookingForm({
  today,
  services,
  professionals,
  canChooseAny,
  days,
  counts,
  otherDurations,
  initial,
}: {
  today: string;
  services: ServiceOption[];
  professionals: ProOption[];
  /** Admin: puede elegir "Cualquiera" y a cualquier profesional. Peluquero: solo a sí mismo. */
  canChooseAny: boolean;
  days: Array<{ date: string; closed: boolean }>;
  counts: Record<string, number[]>;
  otherDurations: number[];
  initial: { pro?: string; date?: string; start?: number };
}) {
  const [state, action] = useActionState<WalkInState, FormData>(staffQuickBooking, { error: null });
  const defaultPro = canChooseAny ? ANY_PROFESSIONAL : professionals[0]?.id;

  // Si llega desde un hueco de la agenda, arranca con ese profesional, día y hora.
  const initialPro = professionals.some((p) => p.id === initial.pro) ? initial.pro! : defaultPro;
  const initialService =
    services.find(
      (s) => !s.variablePrice && (initialPro === ANY_PROFESSIONAL || s.professionalIds.includes(initialPro)),
    ) ?? services[0];

  const [serviceId, setServiceId] = useState(initialService.id);
  const [otherDuration, setOtherDuration] = useState(60);
  const [pro, setPro] = useState(initialPro);
  const service = services.find((s) => s.id === serviceId)!;
  const durationMin = service.variablePrice ? otherDuration : service.durationMin;

  // (React Compiler memoiza solo: no hace falta useMemo.)
  const freeByDay = counts[comboKey(serviceId, durationMin, pro)] ?? [];
  const calendarDays: CalendarDay[] = days.map((d, i) => ({ ...d, free: freeByDay[i] ?? 0 }));

  const [date, setDate] = useState<string | undefined>(() =>
    initial.date && isIsoDate(initial.date) && days.some((d) => d.date === initial.date)
      ? initial.date
      : firstDayWithRoom(calendarDays),
  );
  const [start, setStart] = useState<number | undefined>(initial.start);
  // Horarios ya consultados, por combinación + día (vuelve a uno anterior sin esperar).
  const [slotsByKey, setSlotsByKey] = useState<Record<string, Array<[number, string]>>>({});
  const [loading, startLoading] = useTransition();

  // Si la combinación cambia y el día ya no tiene lugar, saltar al próximo con lugar.
  const dayInfo = calendarDays.find((d) => d.date === date);
  const effectiveDate =
    dayInfo && dayInfo.free > 0 ? date : (firstDayWithRoom(calendarDays, date) ?? firstDayWithRoom(calendarDays));

  const slotsKey = effectiveDate ? `${comboKey(serviceId, durationMin, pro)}|${effectiveDate}` : null;
  const slots = slotsKey ? (slotsByKey[slotsKey] ?? null) : [];
  const missing = !!slotsKey && !slotsByKey[slotsKey];

  // Horarios del día elegido: se piden al servidor solo si no los tenemos.
  useEffect(() => {
    if (!missing || !slotsKey || !effectiveDate) return;
    let current = true;
    startLoading(async () => {
      const result = await staffQuickSlots({ serviceId, durationMin, professional: pro, date: effectiveDate });
      if (current) setSlotsByKey((prev) => ({ ...prev, [slotsKey]: result }));
    });
    return () => {
      current = false;
    };
  }, [missing, slotsKey, serviceId, durationMin, pro, effectiveDate]);

  const selected = slots?.find(([m]) => m === start) ?? slots?.[0];
  const assigned = professionals.find((p) => p.id === selected?.[1]);
  const proChoices = [
    ...(canChooseAny ? [ANY_PROFESSIONAL] : []),
    ...service.professionalIds.filter((id) => professionals.some((p) => p.id === id)),
  ];

  const pickService = (id: string) => {
    const next = services.find((s) => s.id === id)!;
    setServiceId(id);
    if (pro !== ANY_PROFESSIONAL && !next.professionalIds.includes(pro)) setPro(defaultPro);
  };

  return (
    <form action={action} className="contents">
      <input type="hidden" name="date" value={effectiveDate ?? ""} />
      <input type="hidden" name="professional" value={pro} />
      {service.variablePrice && <input type="hidden" name="durationMin" value={otherDuration} />}
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
                    {s.variablePrice
                      ? "Duración a elegir"
                      : `${formatDuration(s.durationMin)} · ${formatMoney(s.priceArs)}`}
                  </span>
                </Radio>
              ))}
            </RadioGrid>
            {service.variablePrice && (
              <div className="mt-3 grid gap-3 rounded-2xl bg-surface-2/60 p-3 sm:grid-cols-[auto_1fr] sm:items-end">
                <fieldset>
                  <legend className="mb-1.5 text-sm font-semibold">¿Cuánto dura?</legend>
                  <div className="flex flex-wrap gap-2">
                    {otherDurations.map((d) => (
                      <label
                        key={d}
                        className={cx(
                          "flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary",
                          d === otherDuration ? "border-primary bg-accent-soft" : "border-line bg-surface",
                        )}
                      >
                        <input
                          type="radio"
                          name="otherDuration"
                          value={d}
                          checked={d === otherDuration}
                          onChange={() => setOtherDuration(d)}
                          className="sr-only"
                        />
                        {formatDuration(d)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <TextField
                  label="Motivo (opcional)"
                  name="note"
                  maxLength={80}
                  placeholder="Ej. retoque de raíz, prueba de peinado"
                  defaultValue={state.values?.note}
                />
              </div>
            )}
          </Section>

          {canChooseAny ? (
            <Section title="Con quién">
              <RadioGrid className="grid-cols-2 sm:grid-cols-4">
                {proChoices.map((id) => {
                  const p = professionals.find((x) => x.id === id);
                  return (
                    <Radio key={id} name="proChoice" value={id} checked={id === pro} onChange={() => setPro(id)}>
                      <span className="flex items-center gap-2 font-bold">
                        {p && <span aria-hidden className={cx("size-2.5 rounded-full", PRO_BG[p.colorToken])} />}
                        {p?.name ?? "Cualquiera"}
                      </span>
                    </Radio>
                  );
                })}
              </RadioGrid>
            </Section>
          ) : (
            <p className="px-4 text-sm text-muted">
              Se agenda en <strong className="text-ink">tu agenda</strong>.
            </p>
          )}

          <Section title="Día">
            <DayCalendar
              days={calendarDays}
              selected={effectiveDate}
              today={today}
              onSelect={(d) => {
                setDate(d);
                setStart(undefined);
              }}
            />
          </Section>

          <Section title={effectiveDate ? `Hora · ${formatLongDay(effectiveDate)}` : "Hora"}>
            {slots === null || loading ? (
              <p className="flex items-center gap-2 rounded-2xl bg-surface-2 p-4 text-sm text-muted" aria-live="polite">
                <IconLoader2 aria-hidden size={18} className="animate-spin" /> Buscando horarios libres…
              </p>
            ) : slots.length ? (
              <div className="flex flex-col gap-3">
                {[
                  { label: "Mañana", list: slots.filter(([m]) => m < NOON) },
                  { label: "Tarde", list: slots.filter(([m]) => m >= NOON) },
                ]
                  .filter((g) => g.list.length)
                  .map((g) => (
                    <div key={g.label}>
                      <p className="mb-1.5 text-xs font-semibold text-muted">{g.label}</p>
                      <RadioGrid className="grid-cols-4 sm:grid-cols-6 lg:grid-cols-8">
                        {g.list.map(([m]) => (
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
                    </div>
                  ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
                No hay horarios libres para esta combinación en las próximas semanas.
              </p>
            )}
          </Section>
        </main>

        <BottomAction title="Resumen">
          <p className="mb-2 text-sm text-muted lg:mb-4" aria-live="polite">
            {selected && effectiveDate ? (
              <>
                <strong className="text-ink">
                  {formatLongDay(effectiveDate)} · {formatTime(selected[0])}
                </strong>{" "}
                · {service.name} ({formatDuration(durationMin)}) con {assigned?.name}
              </>
            ) : (
              "Elegí un día y un horario."
            )}
          </p>
          <div className="flex flex-col gap-2">
            <FormError message={state.error} />
            <SubmitButton pendingLabel="Agendando…" className="w-full">
              Agendar turno
            </SubmitButton>
            <p className="hidden text-xs text-muted lg:block">
              {service.variablePrice ? "Precio a convenir en el local." : "Paga en el local. Sin seña."}
            </p>
          </div>
        </BottomAction>
      </WithSidebar>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 px-4" aria-label={title}>
      <h2 className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">{title}</h2>
      {children}
    </section>
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
        "relative block min-h-12 min-w-0 cursor-pointer rounded-2xl border px-3 py-2.5 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary",
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
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
      {label}
      <input
        {...props}
        className="min-h-12 rounded-xl border border-line bg-surface px-3 text-base font-normal focus:border-primary focus:outline-none"
      />
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}
