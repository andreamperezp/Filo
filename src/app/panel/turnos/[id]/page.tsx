import { notFound } from "next/navigation";
import { IconBrandWhatsapp, IconCash, IconCircleCheck, IconPhone, IconPlayerPlay } from "@tabler/icons-react";
import { BUSINESS } from "@/data/catalog";
import { formatMoney } from "@/domain/money";
import { formatArMobile } from "@/domain/phone";
import { depositAmount } from "@/domain/policies";
import { formatDuration, formatLongDay, formatRelativeDay, formatTime } from "@/domain/time";
import { PAYMENT_CHANNEL_LABEL } from "@/domain/types";
import { staffCancelBooking, staffStartBooking } from "@/server/actions";
import { getBookingDetail } from "@/server/bookings";
import { requireStaff } from "@/server/session";
import { ConfirmDialog, SubmitButton } from "@/components/forms";
import { Badge, ButtonLink, KeyValueList, Screen, TopBar, buttonVariants } from "@/components/ui";
import { Elapsed } from "./elapsed";
import { MarkSeen } from "./mark-seen";

export const metadata = { title: "Detalle del turno" };

const STATUS = {
  confirmed: { label: "Confirmado", tone: "ok" },
  attended: { label: "Finalizado", tone: "muted" },
  cancelled: { label: "Cancelado", tone: "danger" },
} as const;

export default async function BookingDetail({ params, searchParams }: PageProps<"/panel/turnos/[id]">) {
  const user = await requireStaff();
  const { id } = await params;
  const query = await searchParams;
  const justCreated = query.nuevo === "1";
  const justClosed = query.cerrado === "1";
  // Un peluquero que abre un turno ajeno (por URL) ve "no encontrado", sin filtrar datos.
  const detail = await getBookingDetail(user, id);
  if (!detail) notFound();

  const { booking: b, now, catalog, canStart, canClose } = detail;
  const checkout = b.checkout;
  const s = catalog.serviceById.get(b.serviceId)!;
  const deposit = depositAmount(BUSINESS, s);
  const phoneDigits = b.clientPhone.replace(/\D/g, "");
  const status = STATUS[b.status];
  const message = encodeURIComponent(
    `Hola ${b.clientName.split(" ")[0]}, te escribimos de ${BUSINESS.name} por tu turno del ${formatRelativeDay(b.date, now.date).toLowerCase()} a las ${formatTime(b.start)}.`,
  );

  return (
    <Screen>
      {b.unseenByOwner && <MarkSeen id={b.id} />}
      <TopBar backHref={`/panel?dia=${b.date}`} backLabel="Volver a la agenda" title="Turno" />
      {justCreated && (
        <p
          role="status"
          className="mx-4 mb-2 flex items-center gap-2 rounded-2xl bg-ok-soft p-3 font-semibold text-on-ok"
        >
          <IconCircleCheck aria-hidden size={20} /> Turno agendado. Ya figura en la agenda.
        </p>
      )}
      {justClosed && (
        <p
          role="status"
          className="mx-4 mb-2 flex items-center gap-2 rounded-2xl bg-ok-soft p-3 font-semibold text-on-ok"
        >
          <IconCircleCheck aria-hidden size={20} /> Turno finalizado y cobrado. Ya suma en la Caja.
        </p>
      )}
      <main className="flex-1 pb-8 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start md:gap-6 md:pt-2">
        <div className="px-4 pt-2 pb-5 md:mx-4 md:mr-0 md:rounded-3xl md:border md:border-line md:bg-surface md:p-6">
          <div className="flex flex-wrap gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {b.status === "confirmed" && b.startedAt && (
              <Badge tone="accent">
                En curso · <Elapsed since={b.startedAt} />
              </Badge>
            )}
          </div>
          <h1 className="mt-2 font-display text-4xl">{b.clientName}</h1>
          <p className="text-muted">{b.clientPhone ? formatArMobile(b.clientPhone) : "Sin celular registrado"}</p>
          {/* Contacto en un toque: el canal real de una peluquería es WhatsApp. */}
          {b.clientPhone && (
            <div className="mt-4 grid grid-cols-2 gap-2" data-tour="contact">
              <a
                href={`https://wa.me/${phoneDigits}?text=${message}`}
                className={buttonVariants.secondary}
                target="_blank"
                rel="noreferrer"
              >
                <IconBrandWhatsapp aria-hidden size={20} /> WhatsApp
              </a>
              <a href={`tel:+${phoneDigits}`} className={buttonVariants.secondary}>
                <IconPhone aria-hidden size={20} /> Llamar
              </a>
            </div>
          )}
        </div>

        <div>
          {checkout && (
            <section aria-labelledby="cobro" className="mx-4 mb-4 rounded-3xl bg-ok-soft p-5 text-on-ok">
              <h2 id="cobro" className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                <IconCash aria-hidden size={18} /> Cobro
              </h2>
              <p className="mt-1 font-display text-4xl tabular-nums">
                {formatMoney(checkout.chargedArs + checkout.depositArs)}
              </p>
              <p className="text-sm">
                {PAYMENT_CHANNEL_LABEL[checkout.channel]}
                {checkout.depositArs > 0 && ` · incluye seña de ${formatMoney(checkout.depositArs)}`}
                {checkout.tipArs > 0 && ` · propina ${formatMoney(checkout.tipArs)}`}
              </p>
              <p className="mt-2 text-sm">
                Duró <strong>{formatDuration(checkout.actualDurationMin)}</strong>
                {checkout.actualDurationMin !== b.durationMin && ` (agendado: ${formatDuration(b.durationMin)})`}
              </p>
              {checkout.note && <p className="mt-2 text-sm italic">“{checkout.note}”</p>}
            </section>
          )}
          <KeyValueList
            rows={[
              ["Servicio", s.name],
              ...(b.note ? [["Motivo", b.note] as [string, string]] : []),
              ["Profesional", catalog.professionalById.get(b.professionalId)?.name ?? ""],
              ["Fecha", formatLongDay(b.date)],
              ["Horario", `${formatTime(b.start)} a ${formatTime(b.start + b.durationMin)}`],
              ["Precio", s.variablePrice ? "A convenir" : formatMoney(s.priceArs)],
              [
                "Pago",
                b.payment === "deposit"
                  ? `Seña ${formatMoney(deposit)} pagada · resta ${formatMoney(s.priceArs - deposit)}`
                  : "Paga en el local",
              ],
            ]}
          />

          {b.status === "confirmed" && (
            <div className="flex flex-col gap-2 px-4 pt-6" data-tour="booking-actions">
              {canClose && (
                <ButtonLink href={`/panel/turnos/${b.id}/cerrar`} className="w-full">
                  <IconCash aria-hidden size={20} /> Finalizar y cobrar
                </ButtonLink>
              )}
              {canStart && (
                // Opcional: arranca el reloj para saber cuánto llevó de verdad.
                <form action={staffStartBooking}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <SubmitButton variant="secondary" className="w-full" pendingLabel="Empezando…">
                    <IconPlayerPlay aria-hidden size={18} /> Empezar turno
                  </SubmitButton>
                </form>
              )}
              <ConfirmDialog
                trigger={{ label: "Cancelar turno", variant: "ghost", className: "text-danger" }}
                title="¿Cancelar este turno?"
                body={
                  <>
                    {b.clientPhone
                      ? `Le avisamos a ${b.clientName} por WhatsApp y el horario queda libre.`
                      : `El horario queda libre. ${b.clientName} no tiene celular registrado: avisale vos.`}
                    {b.payment === "deposit" && ` Se le devuelve la seña de ${formatMoney(deposit)}.`}
                  </>
                }
                confirmLabel="Sí, cancelar turno"
                action={staffCancelBooking}
                hidden={{ bookingId: b.id }}
              />
            </div>
          )}
        </div>
      </main>
    </Screen>
  );
}
