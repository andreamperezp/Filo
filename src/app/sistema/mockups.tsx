import type { CSSProperties, ReactNode } from "react";
import { IconCalendarEvent, IconCash, IconChevronRight, IconHome, IconScissors } from "@tabler/icons-react";
import { cx } from "@/components/ui";

/**
 * Pantallas de la app en miniatura para la landing (réplicas fieles de la UI
 * real). Usan variables `--m-*`, así el estudio de marca puede recolorearlas
 * en vivo con el logo y los colores de cada peluquería.
 */

export interface BrandTheme {
  name: string;
  /** Logo subido (URL local) o, si no hay, se muestra el nombre. */
  logoUrl?: string | null;
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  primary: string;
  onPrimary: string;
  soft: string;
}

export const FILO_THEME: BrandTheme = {
  name: "Filo",
  bg: "#f5eedd",
  surface: "#fcf8ef",
  ink: "#0d3b55",
  muted: "#4e6878",
  primary: "#16587b",
  onPrimary: "#f5eedd",
  soft: "#dce9f0",
};

export function themeVars(t: BrandTheme): CSSProperties {
  return {
    "--m-bg": t.bg,
    "--m-surface": t.surface,
    "--m-ink": t.ink,
    "--m-muted": t.muted,
    "--m-primary": t.primary,
    "--m-on-primary": t.onPrimary,
    "--m-soft": t.soft,
  } as CSSProperties;
}

/** Celular con marco, en escala chica. Decorativo: el contenido real se describe en el texto. */
export function Phone({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cx(
        "relative w-[15.5rem] shrink-0 rounded-[2.4rem] border-[7px] border-[#0b1c26] bg-[#0b1c26] shadow-2xl shadow-black/25",
        className,
      )}
    >
      <div className="absolute top-1.5 left-1/2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-[#0b1c26]" />
      <div aria-hidden className="h-[31rem] overflow-hidden rounded-[1.9rem] bg-[var(--m-bg)] text-[var(--m-ink)]">
        {children}
      </div>
    </div>
  );
}

function Brand({ theme }: { theme: BrandTheme }) {
  return theme.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- logo local elegido por la persona (blob:), no optimizable
    <img src={theme.logoUrl} alt="" className="h-6 max-w-24 object-contain" />
  ) : (
    <span className="font-display text-lg leading-none">{theme.name}</span>
  );
}

function TabBar({ active }: { active: "home" | "agenda" | "caja" }) {
  const tabs = [
    { id: "home", Icon: IconHome, label: "Inicio" },
    { id: "agenda", Icon: IconCalendarEvent, label: "Agenda" },
    { id: "caja", Icon: IconCash, label: "Caja" },
  ] as const;
  return (
    <div className="absolute inset-x-0 bottom-0 flex border-t border-black/5 bg-[var(--m-surface)] pt-1.5 pb-3">
      {tabs.map(({ id, Icon, label }) => (
        <span
          key={id}
          className={cx(
            "flex flex-1 flex-col items-center gap-0.5 text-[9px] font-semibold",
            id === active ? "text-[var(--m-ink)]" : "text-[var(--m-muted)]",
          )}
        >
          <Icon size={15} stroke={id === active ? 2.2 : 1.6} />
          {label}
        </span>
      ))}
    </div>
  );
}

/** Inicio de la clienta: próximo turno, reservar y servicios. */
export function ClientScreen({ theme }: { theme: BrandTheme }) {
  return (
    <div className="relative h-full px-4 pt-8">
      <Brand theme={theme} />
      <p className="mt-5 font-display text-[1.45rem] leading-[1.05]">
        Hola, Martín
        <span className="block text-[var(--m-muted)]">¿Qué te hacemos hoy?</span>
      </p>
      <div className="mt-4 flex items-center rounded-xl bg-[var(--m-soft)] p-3">
        <div className="flex-1">
          <p className="text-[8px] font-bold tracking-wider uppercase opacity-70">Tu próximo turno</p>
          <p className="text-[13px] font-bold">Jue 8 oct · 18:00</p>
          <p className="text-[10px]">Corte + barba con Lucas</p>
        </div>
        <IconChevronRight size={14} />
      </div>
      <div className="mt-3 rounded-xl bg-[var(--m-primary)] py-2.5 text-center text-[12px] font-bold text-[var(--m-on-primary)]">
        Reservar turno →
      </div>
      <p className="mt-4 mb-1.5 text-[8px] font-bold tracking-wider text-[var(--m-muted)] uppercase">Servicios</p>
      <div className="divide-y divide-black/5 rounded-xl bg-[var(--m-surface)] text-[11px]">
        {[
          ["Corte", "30 min", "$ 12.000"],
          ["Corte + barba", "1 h", "$ 16.000"],
          ["Tintura", "1 h 30", "$ 28.000"],
          ["Lavado + peinado", "30 min", "$ 10.000"],
        ].map(([n, d, p]) => (
          <div key={n} className="flex items-center gap-2 px-3 py-2">
            <IconScissors size={12} className="text-[var(--m-muted)]" />
            <span className="flex-1 font-semibold">{n}</span>
            <span className="text-[var(--m-muted)]">{d}</span>
            <span className="w-14 text-right font-bold">{p}</span>
          </div>
        ))}
      </div>
      <TabBar active="home" />
    </div>
  );
}

/** Elegir día y hora: horarios libres reales, ocupados tachados. */
export function BookingScreen({ theme }: { theme: BrandTheme }) {
  const days = [
    ["Hoy", "6", "Completo"],
    ["Mié", "7", "9 libres"],
    ["Jue", "8", "12 libres"],
    ["Vie", "9", "6 libres"],
  ];
  const slots = [
    "9:00",
    "9:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
  ];
  const taken = new Set(["9:30", "11:00", "15:30", "17:00"]);
  return (
    <div className="relative h-full px-4 pt-8">
      <div className="mb-3">
        <Brand theme={theme} />
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cx("h-1 flex-1 rounded-full", i < 3 ? "bg-[var(--m-primary)]" : "bg-black/10")} />
        ))}
      </div>
      <p className="mt-4 font-display text-[1.35rem] leading-tight">Elegí día y hora</p>
      <p className="text-[10px] text-[var(--m-muted)]">Tintura · 1 h 30 min · Sofía</p>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {days.map(([d, n, s], i) => (
          <div
            key={d}
            className={cx(
              "flex flex-col items-center rounded-lg py-1.5",
              i === 2 ? "bg-[var(--m-primary)] text-[var(--m-on-primary)]" : "bg-[var(--m-surface)]",
              i === 0 && "opacity-45",
            )}
          >
            <span className="text-[8px] font-semibold">{d}</span>
            <span className="text-[13px] font-bold">{n}</span>
            <span className="text-[6.5px] font-semibold">{s}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 mb-1.5 text-[8px] font-bold tracking-wider text-[var(--m-muted)] uppercase">Horarios</p>
      <div className="grid grid-cols-4 gap-1.5">
        {slots.map((s) => (
          <span
            key={s}
            className={cx(
              "rounded-lg py-1.5 text-center text-[10px] font-bold tabular-nums",
              taken.has(s) ? "text-[var(--m-muted)] line-through" : "bg-[var(--m-surface)]",
              s === "16:00" && "bg-[var(--m-primary)] text-[var(--m-on-primary)]",
            )}
          >
            {s}
          </span>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-[var(--m-bg)] px-4 pt-2 pb-4">
        <div className="mb-1.5 flex justify-between text-[10px]">
          <span className="text-[var(--m-muted)]">Tu turno</span>
          <span className="font-bold">Jue 8 oct · 16:00</span>
        </div>
        <div className="rounded-xl bg-[var(--m-primary)] py-2.5 text-center text-[12px] font-bold text-[var(--m-on-primary)]">
          Continuar
        </div>
      </div>
    </div>
  );
}

/** Agenda del peluquero con estados del día. */
export function AgendaScreen({ theme }: { theme: BrandTheme }) {
  const rows = [
    ["9:00", "Julieta Romero", "Corte + barba", "Cobrado $ 16.000", "ok"],
    ["10:00", "Santiago Vera", "Corte", "En curso", "soft"],
    ["11:30", "Tomás Gil", "Barba", "Seña $ 1.400", "ok"],
    ["15:00", "Florencia Arias", "Corte", "Paga en local", "soft"],
  ] as const;
  return (
    <div className="relative h-full px-4 pt-8">
      <div className="flex items-center justify-between">
        <Brand theme={theme} />
        <span className="rounded-full bg-[var(--m-primary)] px-2 py-1 text-[8px] font-bold text-[var(--m-on-primary)]">
          + Turno rápido
        </span>
      </div>
      <p className="mt-4 text-[9px] text-[var(--m-muted)]">Buen día, Lucas · tu agenda</p>
      <p className="font-display text-[1.3rem] leading-tight">Martes 6 de octubre</p>
      <div className="mt-3 flex flex-col gap-1.5">
        {rows.map(([t, n, s, b, tone]) => (
          <div key={t} className="flex gap-2 rounded-xl bg-[var(--m-surface)] p-2">
            <span className="w-8 text-right text-[10px] font-bold tabular-nums">{t}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold">{n}</p>
              <p className="text-[9px] text-[var(--m-muted)]">{s}</p>
              <span
                className={cx(
                  "mt-1 inline-block rounded-full px-1.5 py-0.5 text-[8px] font-bold",
                  tone === "ok" ? "bg-[#dce8dd] text-[#2a4a33]" : "bg-[var(--m-soft)]",
                )}
              >
                {b}
              </span>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-black/15 p-2 text-[10px] text-[var(--m-muted)]">
          <span className="w-8 text-right font-semibold">16:30</span>
          <span className="flex-1">Libre</span>
          <span className="font-bold text-[var(--m-primary)]">+ Agendar</span>
        </div>
      </div>
      <TabBar active="agenda" />
    </div>
  );
}

/** Caja del día: ingresos, tiempo y valor por hora. */
export function CashScreen({ theme }: { theme: BrandTheme }) {
  const bars = [38, 62, 45, 80, 55, 92, 70];
  return (
    <div className="relative h-full px-4 pt-8">
      <Brand theme={theme} />
      <p className="mt-4 font-display text-[1.45rem] leading-tight">Caja</p>
      <p className="text-[9px] text-[var(--m-muted)]">Esta semana</p>
      <div className="mt-3 rounded-xl bg-[var(--m-soft)] p-3">
        <p className="text-[8px] font-semibold opacity-80">Ingresos</p>
        <p className="font-display text-[1.6rem] leading-none tabular-nums">$ 412.500</p>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {[
          ["Tiempo invertido", "21 h 40 min"],
          ["Valor por hora", "$ 19.040"],
          ["Turnos", "27"],
          ["Ticket promedio", "$ 15.280"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-[var(--m-surface)] p-2">
            <p className="text-[7.5px] font-semibold text-[var(--m-muted)]">{k}</p>
            <p className="font-display text-[0.95rem] tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-xl bg-[var(--m-surface)] p-2.5">
        <p className="mb-1.5 text-[8px] font-semibold">Ingresos por día</p>
        <div className="flex h-16 items-end gap-1">
          {bars.map((h, i) => (
            <span key={i} className="flex-1 rounded-t-[3px] bg-[var(--m-primary)]" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <TabBar active="caja" />
    </div>
  );
}
