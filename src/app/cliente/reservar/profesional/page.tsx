import { redirect } from "next/navigation";
import { IconUsers } from "@tabler/icons-react";
import { formatDuration, formatRelativeDay, formatTime } from "@/domain/time";
import { getProfessionalOptions, serviceOrNull } from "@/server/bookings";
import { Avatar, ChoiceCard, H1, Screen, TopBar } from "@/components/ui";
import { flowHref, readFlowParams } from "../params";

export const metadata = { title: "Elegí con quién" };

/** Paso 2 de 4: profesional (o "cualquiera disponible"). */
export default async function PickProfessional({ searchParams }: PageProps<"/cliente/reservar/profesional">) {
  const params = await readFlowParams(searchParams);
  const service = serviceOrNull(params.servicio);
  if (!service) redirect("/cliente/reservar");

  const { options, now } = await getProfessionalOptions(service);

  return (
    <Screen>
      <TopBar
        backHref={flowHref("/cliente/reservar", { servicio: service.id })}
        backLabel="Volver a servicios"
        progress={{ step: 2, total: 4, label: "Paso 2 de 4" }}
      />
      <main className="flex-1 pb-8 md:pb-12">
        <H1 sub={`${service.name} · ${formatDuration(service.durationMin)}`}>¿Con quién?</H1>
        <ul className="grid gap-2.5 px-4 md:grid-cols-2 md:gap-3">
          {options.map(({ choice, professional, next }) => (
            <li key={choice}>
              <ChoiceCard
                href={flowHref("/cliente/reservar/horario", {
                  servicio: service.id,
                  profesional: choice,
                  fecha: next?.date,
                })}
                selected={params.profesional === choice}
              >
                {professional ? (
                  <Avatar pro={professional} />
                ) : (
                  <span aria-hidden className="grid size-11 place-items-center rounded-full bg-surface-2">
                    <IconUsers size={20} stroke={1.6} />
                  </span>
                )}
                <span className="flex-1">
                  <span className="block font-bold">{professional?.name ?? "Cualquiera disponible"}</span>
                  <span className="block text-sm text-muted">{professional?.role ?? "El primer turno libre"}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-on-accent-soft">
                    {next
                      ? `Próximo libre: ${formatRelativeDay(next.date, now.date)} ${formatTime(next.start)}`
                      : "Sin turnos libres en 2 semanas"}
                  </span>
                </span>
              </ChoiceCard>
            </li>
          ))}
        </ul>
      </main>
    </Screen>
  );
}
