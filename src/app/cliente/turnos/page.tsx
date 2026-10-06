import { BUSINESS } from "@/data/catalog";
import { formatRelativeDay, formatTime } from "@/domain/time";
import { cancelMyBooking } from "@/server/actions";
import { describeWhen, getClientBookings } from "@/server/bookings";
import { requireClient } from "@/server/session";
import { ConfirmDialog } from "@/components/forms";
import { Badge, ButtonLink, H1, Screen, SectionTitle } from "@/components/ui";
import { flowHref } from "../reservar/params";
import { getCatalog } from "@/server/catalog";

export const metadata = { title: "Mis turnos" };

export default async function MyBookings() {
  const catalog = await getCatalog();
  const client = await requireClient();
  const { upcoming, past, now } = await getClientBookings(client.id);
  const whatsapp = `https://wa.me/${BUSINESS.phone.replace(/\D/g, "")}`;

  return (
    <Screen>
      <main className="flex-1 pb-6">
        <div className="pt-6">
          <H1>Mis turnos</H1>
        </div>

        <SectionTitle id="upcoming">Próximos</SectionTitle>
        {upcoming.length === 0 ? (
          <div className="mx-4 rounded-2xl border border-dashed border-line p-6 text-center md:max-w-md md:p-10">
            <p className="text-muted">No tenés turnos reservados.</p>
            <ButtonLink href="/cliente/reservar" className="mt-4">
              Reservar turno
            </ButtonLink>
          </div>
        ) : (
          <ul aria-labelledby="upcoming" className="grid gap-3 px-4 md:grid-cols-2">
            {upcoming.map((b) => {
              const service = catalog.serviceById.get(b.serviceId)!;
              const pro = catalog.professionalById.get(b.professionalId)!;
              return (
                <li key={b.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">{describeWhen(b, now.date)}</p>
                      <p>
                        {service.name} con {pro.name}
                      </p>
                    </div>
                    <Badge tone={b.payment === "deposit" ? "ok" : "accent"}>
                      {b.payment === "deposit" ? "Seña pagada" : "Paga en local"}
                    </Badge>
                  </div>
                  {b.canModify && !service.staffOnly ? (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <ButtonLink
                        variant="secondary"
                        href={flowHref("/cliente/reservar/horario", {
                          servicio: b.serviceId,
                          profesional: b.professionalId,
                          fecha: b.date,
                          turno: b.id,
                        })}
                      >
                        Cambiar
                      </ButtonLink>
                      <ConfirmDialog
                        trigger={{ label: "Cancelar", variant: "secondary", className: "text-danger" }}
                        title="¿Cancelar el turno?"
                        body={
                          <>
                            {service.name} con {pro.name}, {formatRelativeDay(b.date, now.date).toLowerCase()} a las{" "}
                            {formatTime(b.start)}. El horario se libera para otra persona.
                            {b.payment === "deposit" && " Te devolvemos la seña."}
                          </>
                        }
                        confirmLabel="Sí, cancelar"
                        action={cancelMyBooking}
                        hidden={{ bookingId: b.id }}
                      />
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted">
                      {service.staffOnly
                        ? "Este turno lo agendó el local."
                        : `Faltan menos de ${BUSINESS.freeCancellationHours} h.`}{" "}
                      <a href={whatsapp} className="font-semibold text-ink underline">
                        Escribinos por WhatsApp
                      </a>{" "}
                      si necesitás cambiarlo.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {past.length > 0 && (
          <>
            <SectionTitle id="past">Anteriores</SectionTitle>
            <ul
              aria-labelledby="past"
              className="mx-4 divide-y divide-line rounded-2xl border border-line bg-surface md:max-w-2xl"
            >
              {past.map((b) => {
                const service = catalog.serviceById.get(b.serviceId)!;
                const pro = catalog.professionalById.get(b.professionalId)!;
                return (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <p className="font-semibold">
                        {service.name} · {pro.name}
                      </p>
                      <p className="text-sm text-muted">
                        {formatRelativeDay(b.date, now.date)} · {b.status === "cancelled" ? "Cancelado" : "Atendido"}
                      </p>
                    </div>
                    {b.status === "attended" && !service.staffOnly && (
                      // "Repetir": lleva directo al paso de horario con el mismo servicio y profesional.
                      <ButtonLink
                        variant="secondary"
                        className="min-h-10 px-4 text-sm"
                        href={flowHref("/cliente/reservar/horario", {
                          servicio: b.serviceId,
                          profesional: b.professionalId,
                        })}
                      >
                        Repetir
                      </ButtonLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </Screen>
  );
}
