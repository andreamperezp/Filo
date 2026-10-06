import { PROFESSIONALS, SERVICES } from "@/data/catalog";
import { formatRelativeDay } from "@/domain/time";
import { getQuickBookingOptions } from "@/server/bookings";
import { requireOwner } from "@/server/session";
import { Screen, TopBar } from "@/components/ui";
import { QuickBookingForm } from "./quick-booking-form";

export const metadata = { title: "Turno rápido" };

/**
 * Turno rápido: la clienta está en el mostrador o llamando por teléfono.
 * Una sola pantalla, todo con toques, con el primer horario libre ya elegido.
 * Acepta `?pro=&dia=&hora=` para llegar desde un hueco "Libre" de la agenda.
 */
export default async function QuickBooking({ searchParams }: PageProps<"/duena/nuevo">) {
  await requireOwner();
  const params = await searchParams;
  const { now, days, free } = await getQuickBookingOptions();
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);

  return (
    <Screen>
      <TopBar backHref="/duena" backLabel="Volver a la agenda" title="Turno rápido" />
      <QuickBookingForm
        services={SERVICES.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.durationMin,
          priceArs: s.priceArs,
          professionalIds: s.professionalIds,
        }))}
        professionals={PROFESSIONALS.map((p) => ({ id: p.id, name: p.name, colorToken: p.colorToken }))}
        days={days.map((d) => ({ date: d, label: formatRelativeDay(d, now.date) }))}
        free={free}
        initial={{ pro: str(params.pro), date: str(params.dia), start: Number(str(params.hora)) || undefined }}
      />
    </Screen>
  );
}
