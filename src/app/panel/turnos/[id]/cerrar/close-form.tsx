"use client";

import { useActionState, useState, type ReactNode } from "react";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { formatMoney } from "@/domain/money";
import { formatDuration } from "@/domain/time";
import { PAYMENT_CHANNEL_LABEL, type PaymentChannel } from "@/domain/types";
import { staffCloseBooking, type CloseState } from "@/server/actions";
import { FormError, SubmitButton } from "@/components/forms";
import { BottomAction, H1, WithSidebar, cx } from "@/components/ui";

const CHANNELS = Object.keys(PAYMENT_CHANNEL_LABEL) as PaymentChannel[];
const TIPS = [0, 500, 1000, 2000];

/** "12.000" → 12000 (lo que escriba: puntos, signo $, espacios). */
const digits = (value: string) => Number(value.replace(/\D/g, "") || 0);
const grouped = (n: number) => (n ? n.toLocaleString("es-AR") : "");

export function CloseForm({
  bookingId,
  heading,
  subheading,
  listPrice,
  depositArs,
  depositNote,
  suggestedCharge,
  suggestedDuration,
  scheduledDuration,
  measured,
}: {
  bookingId: string;
  heading: string;
  subheading: string;
  listPrice: number | null;
  depositArs: number;
  depositNote: string | null;
  suggestedCharge: number;
  suggestedDuration: number;
  scheduledDuration: number;
  /** La duración sugerida sale del reloj ("Empezar") y no de lo agendado. */
  measured: boolean;
}) {
  const [state, action] = useActionState<CloseState, FormData>(staffCloseBooking, { error: null });
  const [charged, setCharged] = useState(state.values?.chargedArs ?? grouped(suggestedCharge));
  const [channel, setChannel] = useState<PaymentChannel>((state.values?.channel as PaymentChannel) ?? "cash");
  const [tip, setTip] = useState(digits(state.values?.tipArs ?? "0"));
  const [duration, setDuration] = useState(Number(state.values?.actualDurationMin ?? suggestedDuration));

  const chargedArs = digits(charged);
  const total = chargedArs + depositArs;
  const step = (delta: number) => setDuration((d) => Math.min(600, Math.max(5, d + delta)));

  return (
    <form action={action} className="contents">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="channel" value={channel} />
      <input type="hidden" name="tipArs" value={tip} />
      <input type="hidden" name="actualDurationMin" value={duration} />
      <WithSidebar>
        <main className="flex flex-col gap-6 pb-6">
          <H1 sub={subheading}>{heading}</H1>

          <Section title="¿Cuánto le cobraste?" htmlFor="charged">
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-display text-3xl text-muted"
              >
                $
              </span>
              <input
                id="charged"
                name="chargedArs"
                inputMode="numeric"
                autoComplete="off"
                value={charged}
                onChange={(e) => setCharged(grouped(digits(e.target.value)))}
                onFocus={(e) => e.currentTarget.select()}
                aria-describedby="charged-hint"
                className="min-h-16 w-full rounded-2xl border-2 border-line bg-surface pr-4 pl-11 font-display text-4xl tabular-nums focus:border-primary focus:outline-none"
              />
            </div>
            <p id="charged-hint" className="mt-2 text-sm text-muted">
              {depositNote ?? "Lo que pagó en el local, en efectivo, transferencia o como haya sido."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {listPrice !== null && (
                <Chip onClick={() => setCharged(grouped(suggestedCharge))} active={chargedArs === suggestedCharge}>
                  Precio de lista {formatMoney(suggestedCharge)}
                </Chip>
              )}
              <Chip onClick={() => setCharged("")} active={chargedArs === 0}>
                Sin cargo
              </Chip>
            </div>
          </Section>

          <Section title="¿Cómo pagó?">
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
              role="radiogroup"
              aria-label="Medio de pago"
            >
              {CHANNELS.map((c) => (
                <label
                  key={c}
                  className={cx(
                    "flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border px-3 text-center text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary",
                    c === channel ? "border-primary bg-accent-soft" : "border-line bg-surface hover:border-primary",
                  )}
                >
                  <input
                    type="radio"
                    name="channelChoice"
                    value={c}
                    checked={c === channel}
                    onChange={() => setChannel(c)}
                    className="sr-only"
                  />
                  {PAYMENT_CHANNEL_LABEL[c]}
                </label>
              ))}
            </div>
          </Section>

          <Section title="Propina (opcional)">
            <div className="flex flex-wrap gap-2">
              {TIPS.map((t) => (
                <Chip key={t} onClick={() => setTip(t)} active={tip === t}>
                  {t ? formatMoney(t) : "Sin propina"}
                </Chip>
              ))}
              <label className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface pr-1 pl-4 text-sm">
                Otra:
                <input
                  inputMode="numeric"
                  aria-label="Otro monto de propina"
                  value={TIPS.includes(tip) ? "" : grouped(tip)}
                  onChange={(e) => setTip(digits(e.target.value))}
                  placeholder="$"
                  className="h-9 w-24 rounded-full bg-transparent px-2 tabular-nums focus:outline-none"
                />
              </label>
            </div>
          </Section>

          <Section title="¿Cuánto duró?">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => step(-5)}
                aria-label="Restar 5 minutos"
                className="grid size-12 place-items-center rounded-full border border-line bg-surface hover:border-primary"
              >
                <IconMinus aria-hidden size={20} />
              </button>
              <p className="min-w-32 text-center font-display text-3xl tabular-nums" aria-live="polite">
                {formatDuration(duration)}
              </p>
              <button
                type="button"
                onClick={() => step(5)}
                aria-label="Sumar 5 minutos"
                className="grid size-12 place-items-center rounded-full border border-line bg-surface hover:border-primary"
              >
                <IconPlus aria-hidden size={20} />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted">
              {measured ? "Medido desde que tocaste “Empezar turno”." : "Precargado con lo agendado."} Agendado:{" "}
              {formatDuration(scheduledDuration)}
              {duration !== scheduledDuration && (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => setDuration(scheduledDuration)}
                    className="font-semibold underline"
                  >
                    usar lo agendado
                  </button>
                </>
              )}
            </p>
          </Section>

          <Section title="Nota (opcional)" htmlFor="note">
            <input
              id="note"
              name="note"
              maxLength={120}
              defaultValue={state.values?.note}
              placeholder="Ej. le hice un descuento por ser su cumpleaños"
              className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-base focus:border-primary focus:outline-none"
            />
          </Section>
        </main>

        <BottomAction title="Resumen">
          <dl className="mb-3 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-muted">Cobrado en el local</dt>
            <dd className="text-right font-semibold tabular-nums">{formatMoney(chargedArs)}</dd>
            {depositArs > 0 && (
              <>
                <dt className="text-muted">Seña online</dt>
                <dd className="text-right tabular-nums">{formatMoney(depositArs)}</dd>
              </>
            )}
            {tip > 0 && (
              <>
                <dt className="text-muted">Propina</dt>
                <dd className="text-right tabular-nums">{formatMoney(tip)}</dd>
              </>
            )}
            <dt className="text-muted">Duración</dt>
            <dd className="text-right tabular-nums">{formatDuration(duration)}</dd>
          </dl>
          <div className="flex flex-col gap-2">
            <FormError message={state.error} />
            <SubmitButton pendingLabel="Cerrando…" className="w-full">
              Finalizar · {formatMoney(total)}
            </SubmitButton>
          </div>
        </BottomAction>
      </WithSidebar>
    </form>
  );
}

function Section({ title, htmlFor, children }: { title: string; htmlFor?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 px-4" aria-label={title}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="mb-2 block text-xs font-bold tracking-wider text-muted uppercase">
          {title}
        </label>
      ) : (
        <h2 className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">{title}</h2>
      )}
      {children}
    </section>
  );
}

function Chip({ onClick, active, children }: { onClick: () => void; active: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "min-h-11 rounded-full border px-4 text-sm font-semibold",
        active ? "border-primary bg-accent-soft" : "border-line bg-surface hover:border-primary",
      )}
    >
      {children}
    </button>
  );
}
