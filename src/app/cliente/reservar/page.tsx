import { formatMoney } from "@/domain/money";
import { formatDuration } from "@/domain/time";
import { ChoiceCard, H1, Screen, ServiceIcon, TopBar } from "@/components/ui";
import { flowHref, readFlowParams } from "./params";
import { getCatalog } from "@/server/catalog";

export const metadata = { title: "Elegí el servicio" };

/** Paso 1 de 4: servicio. */
export default async function PickService({ searchParams }: PageProps<"/cliente/reservar">) {
  const catalog = await getCatalog();
  const params = await readFlowParams(searchParams);

  return (
    <Screen>
      <TopBar backHref="/cliente" backLabel="Volver al inicio" progress={{ step: 1, total: 4, label: "Paso 1 de 4" }} />
      <main className="flex-1 pb-8 md:pb-12">
        <H1>¿Qué servicio querés?</H1>
        <ul className="grid gap-2.5 px-4 md:grid-cols-2 md:gap-3">
          {catalog.publicServices.map((s) => (
            <li key={s.id}>
              <ChoiceCard
                href={flowHref("/cliente/reservar/profesional", { servicio: s.id })}
                selected={params.servicio === s.id}
              >
                <span className="grid size-11 place-items-center rounded-xl bg-surface-2">
                  <ServiceIcon name={s.icon} />
                </span>
                <span className="flex-1">
                  <span className="block font-bold">{s.name}</span>
                  <span className="block text-sm text-muted">
                    {s.description} · {formatDuration(s.durationMin)}
                  </span>
                </span>
                <span className="font-bold tabular-nums">{formatMoney(s.priceArs)}</span>
              </ChoiceCard>
            </li>
          ))}
        </ul>
      </main>
    </Screen>
  );
}
