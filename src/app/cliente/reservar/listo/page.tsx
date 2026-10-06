import { redirect } from "next/navigation";
import { IconCheck } from "@tabler/icons-react";
import { BUSINESS } from "@/data/catalog";
import { formatLongDay, formatTime } from "@/domain/time";
import { getClientBookings } from "@/server/bookings";
import { requireClient } from "@/server/session";
import { ButtonLink, Screen } from "@/components/ui";
import { getCatalog } from "@/server/catalog";

export const metadata = { title: "Turno confirmado" };

export default async function Done({ searchParams }: PageProps<"/cliente/reservar/listo">) {
  const catalog = await getCatalog();
  const client = await requireClient();
  const { turno, cambio } = await searchParams;
  const { upcoming } = await getClientBookings(client.id);
  const booking = upcoming.find((b) => b.id === turno);
  if (!booking) redirect("/cliente/turnos");

  return (
    <Screen width="narrow">
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="animate-slide-up grid size-20 place-items-center rounded-full bg-primary text-on-primary">
          <IconCheck aria-hidden size={40} stroke={2.4} />
        </span>
        <h1 className="mt-6 font-display text-4xl" tabIndex={-1}>
          {cambio ? "Turno cambiado" : "¡Listo, te esperamos!"}
        </h1>
        <p className="mt-2 text-muted">Te mandamos un recordatorio el día anterior.</p>
        <div className="mt-8 w-full rounded-2xl border border-line bg-surface p-5 text-left">
          <p className="text-lg font-bold">
            {formatLongDay(booking.date)} · {formatTime(booking.start)}
          </p>
          <p className="mt-1">
            {catalog.serviceById.get(booking.serviceId)?.name} con{" "}
            {catalog.professionalById.get(booking.professionalId)?.name}
          </p>
          <p className="mt-1 text-sm text-muted">{BUSINESS.address}</p>
        </div>
      </main>
      <div className="flex flex-col gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <ButtonLink href="/cliente/turnos">Ver mis turnos</ButtonLink>
        <ButtonLink href="/cliente" variant="ghost">
          Volver al inicio
        </ButtonLink>
      </div>
    </Screen>
  );
}
