import { notFound, redirect } from "next/navigation";
import { BUSINESS } from "@/data/catalog";
import { formatMoney } from "@/domain/money";
import { formatDuration, formatTime } from "@/domain/time";
import { getCheckoutDraft } from "@/server/bookings";
import { requireStaff } from "@/server/session";
import { Screen, TopBar } from "@/components/ui";
import { CloseForm } from "./close-form";

export const metadata = { title: "Finalizar y cobrar" };

/**
 * Cierre del turno: cuánto se cobró (casi siempre en el local, por fuera de
 * la app), cómo, la propina y cuánto duró de verdad. Todo precargado para que
 * en el caso típico sea revisar y tocar un botón.
 */
export default async function CloseBooking({ params }: PageProps<"/panel/turnos/[id]/cerrar">) {
  const user = await requireStaff();
  const { id } = await params;
  const draft = await getCheckoutDraft(user, id);
  if (!draft) notFound();
  if (!draft.canClose) redirect(`/panel/turnos/${id}`);

  const { booking: b, service } = draft;
  const label = b.note ? `${service.name} · ${b.note}` : service.name;

  return (
    <Screen>
      <TopBar backHref={`/panel/turnos/${id}`} backLabel="Volver al turno" title="Finalizar y cobrar" />
      <CloseForm
        bookingId={b.id}
        heading={b.clientName}
        subheading={`${label} · ${formatTime(b.start)} · agendado ${formatDuration(b.durationMin)}${
          b.startedAt
            ? ` · empezó ${new Date(b.startedAt).toLocaleTimeString("es-AR", { hour: "numeric", minute: "2-digit", timeZone: BUSINESS.timeZone })}`
            : ""
        }`}
        listPrice={draft.listPrice}
        depositArs={draft.depositArs}
        depositNote={
          draft.depositArs ? `Ya pagó una seña online de ${formatMoney(draft.depositArs)}: cobrá el resto.` : null
        }
        suggestedCharge={draft.suggestedChargeArs}
        suggestedDuration={draft.suggestedDurationMin}
        scheduledDuration={b.durationMin}
        measured={!!b.startedAt}
      />
    </Screen>
  );
}
