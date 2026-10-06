import { BUSINESS, OTHER_DURATIONS } from "@/data/catalog";
import { isClosed } from "@/domain/availability";
import { getQuickBookingOptions } from "@/server/bookings";
import { requireStaff } from "@/server/session";
import { Screen, TopBar } from "@/components/ui";
import { QuickBookingForm } from "./quick-booking-form";

export const metadata = { title: "Turno rápido" };

/**
 * Turno rápido: la clienta está en el mostrador o llamando por teléfono.
 * Una sola pantalla, todo con toques, con el primer horario libre ya elegido.
 * Acepta `?pro=&dia=&hora=` para llegar desde un hueco "Libre" de la agenda.
 * Un peluquero solo agenda en su propia agenda.
 */
export default async function QuickBooking({ searchParams }: PageProps<"/panel/nuevo">) {
  const user = await requireStaff();
  const params = await searchParams;
  const { now, days, team, services, counts, canChooseAny } = await getQuickBookingOptions(user);
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);

  return (
    <Screen>
      <TopBar backHref="/panel" backLabel="Volver a la agenda" title="Turno rápido" />
      <QuickBookingForm
        today={now.date}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.durationMin,
          priceArs: s.priceArs,
          variablePrice: !!s.variablePrice,
          professionalIds: s.professionalIds,
        }))}
        professionals={team.map((p) => ({ id: p.id, name: p.name, colorToken: p.colorToken }))}
        canChooseAny={canChooseAny}
        days={days.map((date) => ({ date, closed: isClosed(BUSINESS, date) }))}
        counts={counts}
        otherDurations={[...OTHER_DURATIONS]}
        initial={{ pro: str(params.pro), date: str(params.dia), start: Number(str(params.hora)) || undefined }}
      />
    </Screen>
  );
}
