import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconArrowRight,
  IconBrandWhatsapp,
  IconBuildingStore,
  IconCalendarCheck,
  IconCash,
  IconCheck,
  IconClockHour4,
  IconDeviceMobile,
  IconLock,
  IconPalette,
  IconUsersGroup,
} from "@tabler/icons-react";
import { LogoMark } from "@/components/logo";
import { cx } from "@/components/ui";
import { BrandStudio } from "./brand-studio";
import { AgendaScreen, BookingScreen, CashScreen, ClientScreen, FILO_THEME, Phone, themeVars } from "./mockups";
import barbero from "./fotos/barbero-peine.jpg";
import clienta from "./fotos/clienta-corte.jpg";
import brushing from "./fotos/estilista-brushing.jpg";
import salon from "./fotos/salon-lamparas.jpg";

const WHATSAPP = `https://wa.me/5492213512482?text=${encodeURIComponent(
  "¡Hola! Vi Filo System y me interesa para mi peluquería/barbería. ¿Me contás más?",
)}`;
/** La demo es la app de ejemplo "Filo" en este mismo sitio. */
const DEMO = "/";

export const metadata: Metadata = {
  title: { absolute: "Filo System · Turnos online para peluquerías y barberías" },
  description:
    "Tu peluquería con su propia app de turnos: tus clientas reservan solas desde un link con tu logo y tus colores, y vos ves la agenda del equipo y la caja.",
  openGraph: {
    title: "Filo System · Tu peluquería con su propia app de turnos",
    description: "Reservas online con tu marca, agenda por profesional y caja con valor por hora.",
    images: [{ url: salon.src, width: salon.width, height: salon.height }],
    locale: "es_AR",
    type: "website",
  },
};

/**
 * Landing de Filo System para dueños de peluquerías y barberías.
 * Promete solo lo que el sistema ya hace; lo que falta va en "Próximamente".
 */
export default function SystemLanding() {
  return (
    <div className="bg-merino text-venice-deep" data-surface="light">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-xl bg-venice px-4 py-2 text-merino focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido">
        <Hero />
        <Benefits />
        <Roles />
        <BrandSection />
        <Steps />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* ───────────────────────── Bloques ───────────────────────── */

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={cx("flex items-end gap-2", light ? "text-merino" : "text-venice")}>
      <LogoMark className="w-16" title="Filo" />
      <span className="pb-0.5 text-xs font-bold tracking-[0.3em] uppercase">System</span>
    </span>
  );
}

function CtaButtons({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <a
        href={WHATSAPP}
        target="_blank"
        rel="noreferrer"
        className={cx(
          "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-6 text-base font-bold transition active:scale-[0.98]",
          dark ? "bg-merino text-venice-deep hover:bg-rock" : "bg-venice text-merino hover:bg-venice-deep",
        )}
      >
        <IconBrandWhatsapp aria-hidden size={22} /> Quiero mi app
      </a>
      <Link
        href={DEMO}
        className={cx(
          "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 px-6 text-base font-bold transition",
          dark
            ? "border-merino/40 text-merino hover:border-merino"
            : "border-venice/25 text-venice hover:border-venice",
        )}
      >
        Probar la demo <IconArrowRight aria-hidden size={20} />
      </Link>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-venice/10 bg-merino/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-8">
        <Link href="/sistema" aria-label="Filo System, inicio">
          <Wordmark />
        </Link>
        <nav aria-label="Secciones" className="ml-auto hidden md:block">
          <ul className="flex gap-6 text-sm font-semibold text-venice-deep/80">
            <li>
              <a href="#funciones" className="hover:text-venice">
                Funciones
              </a>
            </li>
            <li>
              <a href="#tu-marca" className="hover:text-venice">
                Tu marca
              </a>
            </li>
            <li>
              <a href="#empezar" className="hover:text-venice">
                Cómo empezar
              </a>
            </li>
            <li>
              <a href="#preguntas" className="hover:text-venice">
                Preguntas
              </a>
            </li>
          </ul>
        </nav>
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-venice px-4 text-sm font-bold text-merino md:ml-0"
        >
          <IconBrandWhatsapp aria-hidden size={18} /> Hablemos
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-10 pb-16 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-16 lg:pb-24">
      <div>
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-rock/35 px-3 py-1 text-sm font-semibold">
          <IconCalendarCheck aria-hidden size={16} /> Turnos online para peluquerías y barberías
        </p>
        <h1 className="font-display text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.2rem]">
          Tu peluquería, con su propia app de turnos.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-venice-deep/80">
          Tus clientas reservan solas, las 24 horas, desde un link con <strong>tu logo y tus colores</strong>. Vos y tu
          equipo ven la agenda, cobran y saben cuánto rinde cada hora de trabajo.
        </p>
        <div className="mt-8">
          <CtaButtons />
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-venice-deep/75">
          {["Sin descargar nada", "Celular, tablet y compu", "Con tu marca"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <IconCheck aria-hidden size={16} className="text-venice" /> {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative" style={themeVars(FILO_THEME)}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] sm:aspect-[5/4] lg:aspect-[4/5]">
          <Image
            src={salon}
            alt="Interior de una barbería con sillones y lámparas colgantes"
            fill
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-venice-deep/60 via-transparent" />
        </div>
        <div className="absolute -bottom-8 left-4 origin-bottom-left scale-[0.8] sm:left-8 sm:scale-90 lg:-left-10">
          <Phone label="Pantalla de inicio de la app de turnos, con el próximo turno y la lista de servicios">
            <ClientScreen theme={FILO_THEME} />
          </Phone>
        </div>
        {/* Aviso que recibe el equipo cuando entra una reserva. */}
        <div className="absolute top-6 right-6 hidden max-w-[15rem] rounded-2xl bg-venice-deep/95 p-3 text-merino shadow-xl sm:block">
          <p className="text-xs font-bold">Nuevo turno · Tintura</p>
          <p className="text-xs text-merino/80">Camila Sosa · Mañana 15:00 · Sofía</p>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items: Array<{ Icon: typeof IconCheck; title: string; text: string }> = [
    {
      Icon: IconDeviceMobile,
      title: "Reservas solas, 24/7",
      text: "Servicio, profesional, día y hora en 4 pasos. Sin responder mensajes a la noche ni anotar en el cuaderno.",
    },
    {
      Icon: IconCalendarCheck,
      title: "Agenda que se ordena sola",
      text: "Cada profesional con su agenda, horarios bloqueados para francos y trámites, y avisos al instante de cada reserva.",
    },
    {
      Icon: IconCash,
      title: "Caja clara",
      text: "Al terminar cada turno cargás cuánto cobraste. Ves ingresos, tiempo invertido y valor por hora, por día, semana o mes.",
    },
    {
      Icon: IconPalette,
      title: "Con tu identidad",
      text: "Tu logo, tus colores, tus servicios y precios. Tus clientas ven tu peluquería, no una app genérica.",
    },
  ];
  return (
    <section id="funciones" aria-labelledby="funciones-titulo" className="bg-merino py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <h2 id="funciones-titulo" className="max-w-2xl font-display text-4xl leading-tight lg:text-5xl">
          Menos WhatsApp, más tijera.
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-venice-deep/75">
          Todo lo que hoy resolvés con mensajes, llamadas y anotaciones, en un solo lugar.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ Icon, title, text }) => (
            <li key={title} className="rounded-3xl bg-[#fcf8ef] p-6 ring-1 ring-venice/10">
              <span className="grid size-12 place-items-center rounded-2xl bg-rock/40 text-venice">
                <Icon aria-hidden size={24} />
              </span>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-1.5 leading-relaxed text-venice-deep/75">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RoleRow({
  eyebrow,
  title,
  points,
  photo,
  photoAlt,
  screen,
  screenLabel,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  points: string[];
  photo: typeof salon;
  photoAlt: string;
  screen: ReactNode;
  screenLabel: string;
  reverse?: boolean;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
      <div className={cx(reverse && "lg:order-2")}>
        <p className="text-sm font-bold tracking-[0.2em] text-venice uppercase">{eyebrow}</p>
        <h3 className="mt-2 font-display text-3xl leading-tight lg:text-4xl">{title}</h3>
        <ul className="mt-6 flex flex-col gap-3">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-lg leading-snug">
              <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-venice text-merino">
                <IconCheck aria-hidden size={14} stroke={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      {/* Alto mínimo = alto del celular escalado, para que nunca suba sobre el texto. */}
      <div
        className={cx("relative min-h-[24rem] pb-10 sm:min-h-[27rem] lg:min-h-0", reverse && "lg:order-1")}
        style={themeVars(FILO_THEME)}
      >
        <div className="relative ml-auto aspect-[4/3] w-[88%] overflow-hidden rounded-[2rem]">
          <Image
            src={photo}
            alt={photoAlt}
            fill
            placeholder="blur"
            sizes="(min-width: 1024px) 40vw, 90vw"
            className="object-cover"
          />
        </div>
        <div className="absolute bottom-0 left-0 origin-bottom-left scale-[0.72] sm:scale-80">
          <Phone label={screenLabel}>{screen}</Phone>
        </div>
      </div>
    </div>
  );
}

function Roles() {
  return (
    <section aria-label="Para quién" className="bg-[#efe6d2] py-16 lg:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-4 md:px-8 lg:gap-28">
        <RoleRow
          eyebrow="Para tus clientas"
          title="Reservan en un minuto, desde el celular."
          points={[
            "Entran con su número de celular: sin contraseñas ni descargas.",
            "Ven los horarios libres de verdad de cada profesional.",
            "Cambian o cancelan solas hasta 24 h antes, y el horario se libera.",
            "“Repetir” su servicio de siempre en dos toques.",
          ]}
          photo={clienta}
          photoAlt="Una estilista lava el pelo de una clienta en el lavacabezas"
          screen={<BookingScreen theme={FILO_THEME} />}
          screenLabel="Pantalla para elegir día y hora, con los horarios libres y ocupados"
        />
        <RoleRow
          reverse
          eyebrow="Para tu equipo"
          title="Cada uno con su agenda y su acceso."
          points={[
            "Cada peluquero entra con su usuario y ve solo su agenda.",
            "Marca sus francos, almuerzos o días libres en un paso.",
            "“Turno rápido” para la clienta que llega o llama: el primer horario libre ya elegido.",
            "Al terminar, “Finalizar y cobrar”: monto, medio de pago y cuánto duró.",
          ]}
          photo={barbero}
          photoAlt="Un barbero con guantes corta el pelo de un cliente con peine y máquina"
          screen={<AgendaScreen theme={FILO_THEME} />}
          screenLabel="Agenda del día de un peluquero, con turnos cobrados, en curso y horarios libres"
        />
        <RoleRow
          eyebrow="Para vos, dueña o dueño"
          title="El local completo, a la vista."
          points={[
            "La agenda de todo el equipo, en columnas, en la compu o la tablet del mostrador.",
            "Caja con ingresos, ticket promedio, tiempo invertido y valor por hora.",
            "Comparás profesionales y servicios: cuál rinde más y cuál se demora.",
            "Sumás o das de baja peluqueros con su propio acceso, sin compartir contraseñas.",
          ]}
          photo={brushing}
          photoAlt="Una estilista hace un brushing con secador y cepillo redondo"
          screen={<CashScreen theme={FILO_THEME} />}
          screenLabel="Caja de la semana con ingresos, tiempo invertido, valor por hora y gráfico por día"
        />
      </div>
    </section>
  );
}

function BrandSection() {
  return (
    <section
      id="tu-marca"
      aria-labelledby="marca-titulo"
      className="bg-venice py-16 text-merino lg:py-24"
      data-surface="dark"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <h2 id="marca-titulo" className="max-w-3xl font-display text-4xl leading-tight lg:text-5xl">
          Filo es solo un ejemplo. La app lleva <span className="text-rock">tu marca</span>.
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-merino/80">
          Adaptamos el logo, los colores, los servicios y los precios de tu local. Probalo acá: elegí un estilo o subí
          tu logo y tu color.
        </p>
        <div className="mt-10">
          <BrandStudio />
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const steps = [
    {
      Icon: IconBuildingStore,
      title: "Nos contás de tu local",
      text: "Servicios, precios, horarios y quiénes atienden. Por WhatsApp, en una charla.",
    },
    {
      Icon: IconPalette,
      title: "Armamos tu app",
      text: "Con tu logo y tus colores. Cada peluquero recibe su acceso y elige su contraseña.",
    },
    {
      Icon: IconUsersGroup,
      title: "Compartís tu link",
      text: "En Instagram, en tu WhatsApp y en el local. Tus clientas empiezan a reservar solas.",
    },
  ];
  return (
    <section id="empezar" aria-labelledby="empezar-titulo" className="py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <h2 id="empezar-titulo" className="font-display text-4xl leading-tight lg:text-5xl">
          Empezar es simple.
        </h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map(({ Icon, title, text }, i) => (
            <li key={title} className="relative rounded-3xl bg-[#fcf8ef] p-6 ring-1 ring-venice/10">
              <span className="font-display text-5xl text-rock" aria-hidden>
                {i + 1}
              </span>
              <span className="sr-only">Paso {i + 1}: </span>
              <Icon aria-hidden size={24} className="absolute top-6 right-6 text-venice" />
              <h3 className="mt-2 text-lg font-bold">{title}</h3>
              <p className="mt-1.5 leading-relaxed text-venice-deep/75">{text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 rounded-3xl border-2 border-dashed border-venice/20 p-6">
          <h3 className="flex items-center gap-2 font-bold">
            <IconClockHour4 aria-hidden size={20} className="text-venice" /> Próximamente
          </h3>
          <ul className="mt-3 grid gap-2 text-venice-deep/80 sm:grid-cols-2">
            <li>• Recordatorios automáticos por WhatsApp el día anterior.</li>
            <li>• Seña online con Mercado Pago al reservar.</li>
            <li>• Código de ingreso por WhatsApp para tus clientas.</li>
            <li>• Lista de espera para llenar los turnos que se liberan.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const faqs = [
    {
      q: "¿Mis clientas tienen que descargar una app?",
      a: "No. Entran desde un link (lo podés poner en tu Instagram o mandarlo por WhatsApp) y funciona en cualquier celular, tablet o computadora.",
    },
    {
      q: "¿Cómo entran mis clientas? ¿Necesitan contraseña?",
      a: "No: ingresan con su número de celular y un código de 6 números. La primera vez solo les pedimos el nombre.",
    },
    {
      q: "¿Cada peluquero ve la plata de los demás?",
      a: "No. Cada uno ve su agenda y su propia caja. La vista del local completo y la comparación entre profesionales es solo para vos.",
    },
    {
      q: "¿Puedo agendar a alguien que llama o viene al local?",
      a: "Sí, con “Turno rápido”: en una sola pantalla, con el primer horario libre ya elegido. Si dejás su celular, después ve el turno en su cuenta.",
    },
    {
      q: "¿Y si un día no atiendo o cierro antes?",
      a: "Marcás “no disponible” el día completo, la mañana, la tarde o un rango de horas, para vos o para todo el equipo. Los turnos que ya estaban no se tocan.",
    },
    {
      q: "¿Cuánto cuesta?",
      a: "Depende del tamaño de tu equipo. Escribime por WhatsApp y te paso una propuesta para tu local.",
    },
  ];
  return (
    <section id="preguntas" aria-labelledby="preguntas-titulo" className="bg-[#efe6d2] py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <h2 id="preguntas-titulo" className="font-display text-4xl leading-tight lg:text-5xl">
          Preguntas frecuentes
        </h2>
        <div className="mt-8 divide-y divide-venice/15 rounded-3xl bg-[#fcf8ef] ring-1 ring-venice/10">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group px-6">
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 py-4 text-lg font-bold [&::-webkit-details-marker]:hidden">
                <span className="flex-1">{q}</span>
                <span aria-hidden className="text-2xl text-venice transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-5 leading-relaxed text-venice-deep/80">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section
      aria-labelledby="cta-titulo"
      className="relative isolate overflow-hidden py-20 text-merino lg:py-28"
      data-surface="dark"
    >
      <Image src={brushing} alt="" fill placeholder="blur" sizes="100vw" className="-z-10 object-cover" />
      <div className="absolute inset-0 -z-10 bg-venice-deep/85" />
      <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
        <h2 id="cta-titulo" className="font-display text-4xl leading-tight lg:text-6xl">
          ¿Lo querés para tu peluquería?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-merino/85">
          Escribime por WhatsApp y te muestro cómo quedaría con tu marca. O recorré la demo como si fueras una clienta.
        </p>
        <div className="mt-8 flex justify-center">
          <CtaButtons dark />
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-merino/70">
          <IconLock aria-hidden size={16} /> En la demo, el código de ingreso aparece en pantalla: probá con cualquier
          celular.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-venice-deep py-10 text-merino/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 text-sm md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <Wordmark light />
          <p className="mt-3">Turnos online para peluquerías y barberías.</p>
        </div>
        <p className="max-w-md text-xs text-merino/60">
          Fotos de Unsplash: Jason Leung, Lindsay Cash, John Rodriguez y Adam Winger. “Filo” es una peluquería de
          ejemplo.
        </p>
      </div>
    </footer>
  );
}
