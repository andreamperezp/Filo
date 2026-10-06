import { notFound } from "next/navigation";
import { IconBrandWhatsapp, IconCircleCheck, IconPhone } from "@tabler/icons-react";
import { BUSINESS, PROFESSIONAL_BY_ID, SERVICE_BY_ID } from "@/data/catalog";
import { formatMoney } from "@/domain/money";
import { formatArMobile } from "@/domain/phone";
import { depositAmount } from "@/domain/policies";
import { formatLongDay, formatRelativeDay, formatTime } from "@/domain/time";
import { ownerCancelBooking, ownerMarkAttended } from "@/server/actions";
import { getBookingDetail } from "@/server/bookings";
import { requireOwner } from "@/server/session";
import { ConfirmDialog, SubmitButton } from "@/components/forms";
import { Badge, KeyValueList, Screen, TopBar, buttonVariants } from "@/components/ui";
import { MarkSeen } from "./mark-seen";

export const metadata = { title: "Detalle del turno" };

const STATUS = {
  confirmed: { label: "Confirmado", tone: "ok" },
  attended: { label: "Atendido", tone: "muted" },
  cancelled: { label: "Cancelado", tone: "danger" },
} as const;

export default async function BookingDetail({ params, searchParams }: PageProps<"/duena/turnos/[id]">) {
  await requireOwner();
  const { id } = await params;
  const justCreated = (await searchParams).nuevo === "1";
  const detail = await getBookingDetail(id);
  if (!detail) notFound();

  const { booking: b, now, canMarkAttended } = detail;
  const s = SERVICE_BY_ID.get(b.serviceId)!;
  const deposit = depositAmount(BUSINESS, s);
  const phoneDigits = b.clientPhone.replace(/\D/g, "");
  const status = STATUS[b.status];
  const message = encodeURIComponent(
    `Hola ${b.clientName.split(" ")[0]}, te escribimos de ${BUSINESS.name} por tu turno del ${formatRelativeDay(b.date, now.date).toLowerCase()} a las ${formatTime(b.start)}.`,
  );

  return (
    <Screen>
      {b.unseenByOwner && <MarkSeen id={b.id} />}
      <TopBar backHref={`/duena?dia=${b.date}`} backLabel="Volver a la agenda" title="Turno" />
      {justCreated && (
        <p
          role="status"
          className="mx-4 mb-2 flex items-center gap-2 rounded-2xl bg-ok-soft p-3 font-semibold text-on-ok"
        >
          <IconCircleCheck aria-hidden size={20} /> Turno agendado. Ya figura en la agenda.
        </p>
      )}
      <main className="flex-1 pb-8 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start md:gap-6 md:pt-2">
        <div className="px-4 pt-2 pb-5 md:mx-4 md:mr-0 md:rounded-3xl md:border md:border-line md:bg-surface md:p-6">
          <Badge tone={status.tone}>{status.label}</Badge>
          <h1 className="mt-2 font-display text-4xl">{b.clientName}</h1>
          <p className="text-muted">{b.clientPhone ? formatArMobile(b.clientPhone) : "Sin celular registrado"}</p>
          {/* Contacto en un toque: el canal real de una peluquería es WhatsApp. */}
          {b.clientPhone && (
            <div className="mt-4 grid grid-cols-2 gap-2">
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
          <KeyValueList
            rows={[
              ["Servicio", s.name],
              ["Profesional", PROFESSIONAL_BY_ID.get(b.professionalId)?.name ?? ""],
              ["Fecha", formatLongDay(b.date)],
              ["Horario", `${formatTime(b.start)} a ${formatTime(b.start + s.durationMin)}`],
              ["Precio", formatMoney(s.priceArs)],
              [
                "Pago",
                b.payment === "deposit"
                  ? `Seña ${formatMoney(deposit)} pagada · resta ${formatMoney(s.priceArs - deposit)}`
                  : "Paga en el local",
              ],
            ]}
          />

          {b.status === "confirmed" && (
            <div className="flex flex-col gap-2 px-4 pt-6">
              {canMarkAttended && (
                <form action={ownerMarkAttended}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <SubmitButton className="w-full" pendingLabel="Guardando…">
                    Marcar como atendido
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
                action={ownerCancelBooking}
                hidden={{ bookingId: b.id }}
              />
            </div>
          )}
        </div>
      </main>
    </Screen>
  );
}
