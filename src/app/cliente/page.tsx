import Link from "next/link";
import { IconArrowRight, IconChevronRight, IconClock, IconMapPin } from "@tabler/icons-react";
import { BUSINESS } from "@/data/catalog";
import { formatMoney } from "@/domain/money";
import { formatDuration } from "@/domain/time";
import { describeWhen, getClientBookings } from "@/server/bookings";
import { requireClient } from "@/server/session";
import { ButtonLink, Screen, SectionTitle, ServiceIcon } from "@/components/ui";
import { getCatalog } from "@/server/catalog";

export const metadata = { title: "Inicio" };

/**
 * Celular: una columna (saludo → próximo turno → reservar → servicios).
 * Tablet/escritorio: a la izquierda lo personal y la acción principal, a la
 * derecha el catálogo de servicios, todo visible sin scroll.
 */
export default async function ClientHome() {
  const catalog = await getCatalog();
  const client = await requireClient();
  const { upcoming, now } = await getClientBookings(client.id);
  const next = upcoming[0];

  return (
    <Screen>
      <main className="flex-1 pb-8 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-8 md:pt-6 lg:gap-12">
        <div>
          <section className="px-4 pt-6 md:pt-4">
            <h1 className="font-display text-[2.4rem] leading-[1.05] md:text-5xl lg:text-6xl">
              Hola, {client.firstName}
              <span className="block text-muted">¿Qué te hacemos hoy?</span>
            </h1>
          </section>

          {next && (
            <section aria-labelledby="next-title" className="px-4 pt-6">
              <Link
                href="/cliente/turnos"
                className="flex items-center gap-3 rounded-2xl bg-accent-soft p-4 text-on-accent-soft transition hover:brightness-[0.98] md:p-5"
              >
                <div className="flex-1">
                  <p id="next-title" className="text-xs font-bold tracking-wider uppercase opacity-80">
                    Tu próximo turno
                  </p>
                  <p className="mt-1 text-lg font-bold md:text-xl">{describeWhen(next, now.date)}</p>
                  <p className="text-sm">
                    {catalog.serviceById.get(next.serviceId)?.name} con{" "}
                    {catalog.professionalById.get(next.professionalId)?.name}
                  </p>
                </div>
                <IconChevronRight aria-hidden size={20} />
              </Link>
            </section>
          )}

          <div className="px-4 pt-4">
            <ButtonLink href="/cliente/reservar" className="w-full md:min-h-14 md:text-base">
              Reservar turno <IconArrowRight aria-hidden size={18} />
            </ButtonLink>
          </div>

          <SectionTitle>El local</SectionTitle>
          <div className="mx-4 space-y-2 rounded-2xl border border-line bg-surface p-4 text-sm">
            <p className="flex items-center gap-2">
              <IconMapPin aria-hidden size={18} className="shrink-0 text-muted" />
              {BUSINESS.address} · {BUSINESS.neighborhood}
            </p>
            <p className="flex items-center gap-2">
              <IconClock aria-hidden size={18} className="shrink-0 text-muted" />
              Lun a Vie 9 a 20 h · Sáb 9 a 14 h
            </p>
          </div>
        </div>

        <div className="md:pt-4">
          <SectionTitle id="services-title">Servicios</SectionTitle>
          <ul
            aria-labelledby="services-title"
            className="mx-4 divide-y divide-line rounded-2xl border border-line bg-surface"
          >
            {catalog.publicServices.map((s) => (
              <li key={s.id}>
                {/* Atajo: tocar un servicio saltea el paso 1 del flujo. */}
                <Link
                  href={`/cliente/reservar/profesional?servicio=${s.id}`}
                  className="flex min-h-14 items-center gap-3 px-4 py-3 transition hover:bg-surface-2/60 md:min-h-16"
                >
                  <ServiceIcon name={s.icon} className="text-muted" />
                  <span className="flex-1">
                    <span className="block font-semibold">{s.name}</span>
                    <span className="hidden text-sm text-muted md:block">{s.description}</span>
                  </span>
                  <span className="text-sm text-muted">{formatDuration(s.durationMin)}</span>
                  <span className="w-20 text-right text-sm font-bold tabular-nums">{formatMoney(s.priceArs)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </Screen>
  );
}
