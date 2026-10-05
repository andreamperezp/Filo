import Link from "next/link";
import { IconArrowRight, IconChevronRight, IconClock, IconMapPin } from "@tabler/icons-react";
import { BUSINESS, PROFESSIONAL_BY_ID, SERVICES, SERVICE_BY_ID } from "@/data/catalog";
import { formatMoney } from "@/domain/money";
import { formatDuration } from "@/domain/time";
import { describeWhen, getClientBookings } from "@/server/bookings";
import { requireClient } from "@/server/session";
import { signOut } from "@/server/actions";
import { ButtonLink, Screen, SectionTitle, ServiceIcon } from "@/components/ui";
import { ClientTabs } from "./client-tabs";

export const metadata = { title: "Inicio" };

export default async function ClientHome() {
  const client = await requireClient();
  const { upcoming, now } = await getClientBookings(client.id);
  const next = upcoming[0];

  return (
    <Screen>
      <main className="flex-1 pb-6">
        <header className="flex items-center justify-between px-4 pt-5">
          <div>
            <p className="font-display text-3xl leading-none">{BUSINESS.name}</p>
            <p className="text-xs text-muted">{BUSINESS.tagline}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              aria-label={`${client.name}: salir de la demo`}
              className="grid size-11 place-items-center rounded-full bg-primary font-bold text-on-primary"
            >
              {client.firstName[0]}
            </button>
          </form>
        </header>

        <section className="px-4 pt-8">
          <h1 className="font-display text-[2.4rem] leading-[1.05]">
            Hola, {client.firstName}
            <span className="block text-muted">¿Qué te hacemos hoy?</span>
          </h1>
        </section>

        {next && (
          <section aria-labelledby="next-title" className="px-4 pt-6">
            <Link
              href="/cliente/turnos"
              className="flex items-center gap-3 rounded-2xl bg-accent-soft p-4 text-on-accent-soft"
            >
              <div className="flex-1">
                <p id="next-title" className="text-xs font-bold tracking-wider uppercase opacity-80">
                  Tu próximo turno
                </p>
                <p className="mt-1 text-lg font-bold">{describeWhen(next, now.date)}</p>
                <p className="text-sm">
                  {SERVICE_BY_ID.get(next.serviceId)?.name} con {PROFESSIONAL_BY_ID.get(next.professionalId)?.name}
                </p>
              </div>
              <IconChevronRight aria-hidden size={20} />
            </Link>
          </section>
        )}

        <div className="px-4 pt-4">
          <ButtonLink href="/cliente/reservar" className="w-full">
            Reservar turno <IconArrowRight aria-hidden size={18} />
          </ButtonLink>
        </div>

        <SectionTitle id="services-title">Servicios</SectionTitle>
        <ul
          aria-labelledby="services-title"
          className="mx-4 divide-y divide-line rounded-2xl border border-line bg-surface"
        >
          {SERVICES.map((s) => (
            <li key={s.id}>
              {/* Atajo: tocar un servicio saltea el paso 1 del flujo. */}
              <Link
                href={`/cliente/reservar/profesional?servicio=${s.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface-2/50"
              >
                <ServiceIcon name={s.icon} className="text-muted" />
                <span className="flex-1 font-semibold">{s.name}</span>
                <span className="text-sm text-muted">{formatDuration(s.durationMin)}</span>
                <span className="w-20 text-right text-sm font-bold tabular-nums">{formatMoney(s.priceArs)}</span>
              </Link>
            </li>
          ))}
        </ul>

        <SectionTitle>El local</SectionTitle>
        <div className="mx-4 space-y-2 rounded-2xl border border-line bg-surface p-4 text-sm">
          <p className="flex items-center gap-2">
            <IconMapPin aria-hidden size={18} className="text-muted" />
            {BUSINESS.address} · {BUSINESS.neighborhood}
          </p>
          <p className="flex items-center gap-2">
            <IconClock aria-hidden size={18} className="text-muted" />
            Lun a Vie 9 a 20 h · Sáb 9 a 14 h
          </p>
        </div>
      </main>
      <ClientTabs />
    </Screen>
  );
}
