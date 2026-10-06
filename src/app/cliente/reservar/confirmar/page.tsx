import Link from "next/link";
import { redirect } from "next/navigation";
import { BUSINESS } from "@/data/catalog";
import { formatMoney } from "@/domain/money";
import { amountDueNow, depositAmount } from "@/domain/policies";
import { formatLongDay, formatTime } from "@/domain/time";
import { ANY_PROFESSIONAL, type PaymentMethod } from "@/domain/types";
import { confirmBooking, confirmReschedule } from "@/server/actions";
import { getAvailability, getClientBookings, getPublicService } from "@/server/bookings";
import { requireClient } from "@/server/session";
import { ActionForm, SubmitButton } from "@/components/forms";
import { BottomAction, H1, KeyValueList, Screen, TopBar, WithSidebar, cx } from "@/components/ui";
import { flowHref, readFlowParams } from "../params";
import { getCatalog } from "@/server/catalog";

export const metadata = { title: "Revisá tu turno" };

/** Paso 4 de 4: resumen, medio de pago y confirmación. */
export default async function Confirm({ searchParams }: PageProps<"/cliente/reservar/confirmar">) {
  const catalog = await getCatalog();
  const client = await requireClient();
  const params = await readFlowParams(searchParams);
  const service = await getPublicService(params.servicio);
  if (!service) redirect("/cliente/reservar");
  const professional = params.profesional ?? ANY_PROFESSIONAL;
  const backToTime = flowHref("/cliente/reservar/horario", { ...params, pago: undefined });
  if (!params.fecha || params.hora === undefined) redirect(backToTime);

  const rescheduling = params.turno
    ? (await getClientBookings(client.id)).upcoming.find((b) => b.id === params.turno && b.canModify)
    : undefined;
  if (params.turno && !rescheduling) redirect("/cliente/turnos");

  // Revalidamos: el horario pudo ocuparse mientras el cliente decidía.
  const { slots } = await getAvailability({
    service,
    professional,
    date: params.fecha,
    ignoreBookingId: rescheduling?.id,
  });
  const slot = slots.find((s) => s.start === params.hora);
  if (!slot?.assignTo) redirect(backToTime);

  const payment: PaymentMethod = params.pago ?? "in_store";
  const deposit = depositAmount(BUSINESS, service);
  const assigned = catalog.professionalById.get(slot.assignTo)!;
  const payOptions = [
    { id: "in_store", title: "Pago en el local", sub: "Efectivo, débito o transferencia" },
    {
      id: "deposit",
      title: `Seña online del ${BUSINESS.depositRate * 100}%`,
      sub: `${formatMoney(deposit)} ahora con tarjeta o billetera virtual`,
    },
  ] as const;

  return (
    <Screen>
      <TopBar
        backHref={backToTime}
        backLabel="Volver a elegir horario"
        progress={rescheduling ? undefined : { step: 4, total: 4, label: "Paso 4 de 4" }}
        title={rescheduling ? "Cambiar turno" : undefined}
      />
      <WithSidebar>
        <main className="pb-4">
          <H1>Revisá tu turno</H1>
          <KeyValueList
            rows={[
              ["Servicio", service.name],
              ["Con", assigned.name],
              ["Día", formatLongDay(params.fecha)],
              ["Hora", `${formatTime(params.hora)} a ${formatTime(params.hora + service.durationMin)}`],
              ["Precio", formatMoney(service.priceArs)],
            ]}
          />

          {!rescheduling && (
            <section className="px-4 pt-6">
              <h2 id="pay-title" className="pb-2 text-xs font-bold tracking-wider text-muted uppercase">
                ¿Cómo pagás?
              </h2>
              <div role="radiogroup" aria-labelledby="pay-title" className="flex flex-col gap-2.5">
                {payOptions.map((p) => {
                  const on = payment === p.id;
                  return (
                    <Link
                      key={p.id}
                      href={flowHref("/cliente/reservar/confirmar", { ...params, pago: p.id })}
                      replace
                      scroll={false}
                      role="radio"
                      aria-checked={on}
                      className={cx(
                        "flex items-center gap-3 rounded-2xl border p-4",
                        on ? "border-primary bg-accent-soft" : "border-line bg-surface",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cx(
                          "grid size-5 place-items-center rounded-full border-2",
                          on ? "border-primary" : "border-line",
                        )}
                      >
                        {on && <span className="size-2.5 rounded-full bg-primary" />}
                      </span>
                      <span>
                        <span className="block font-bold">{p.title}</span>
                        <span className="block text-sm text-muted">{p.sub}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <p className="mx-4 mt-5 text-sm leading-relaxed text-muted">
            Podés cancelar o cambiar el turno gratis hasta {BUSINESS.freeCancellationHours} h antes desde “Mis turnos”.
          </p>
        </main>
        <BottomAction title="Resumen">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-muted">
              {rescheduling
                ? "Nuevo horario"
                : payment === "deposit"
                  ? "Pagás ahora · resto en el local"
                  : "Total a pagar en el local"}
            </span>
            <span className="text-lg font-bold tabular-nums">
              {rescheduling
                ? `${formatTime(params.hora)}`
                : formatMoney(payment === "deposit" ? amountDueNow(BUSINESS, service, payment) : service.priceArs)}
            </span>
          </div>
          {rescheduling ? (
            <ActionForm
              action={confirmReschedule}
              hidden={{ bookingId: rescheduling.id, professional, date: params.fecha, start: params.hora }}
              className="flex flex-col gap-2"
            >
              <SubmitButton pendingLabel="Cambiando…" className="w-full">
                Confirmar cambio
              </SubmitButton>
            </ActionForm>
          ) : (
            <ActionForm
              action={confirmBooking}
              hidden={{ serviceId: service.id, professional, date: params.fecha, start: params.hora, payment }}
              className="flex flex-col gap-2"
            >
              <SubmitButton pendingLabel="Confirmando…" className="w-full">
                {payment === "deposit" ? "Pagar seña y confirmar" : "Confirmar turno"}
              </SubmitButton>
            </ActionForm>
          )}
        </BottomAction>
      </WithSidebar>
    </Screen>
  );
}
