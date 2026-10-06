import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  IconBrush,
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconDropletHalf2,
  IconRazor,
  IconRazorElectric,
  IconScissors,
  IconSparkles,
  IconSpray,
} from "@tabler/icons-react";
import type { Professional, ServiceIcon as ServiceIconName } from "@/domain/types";

/** Combina clases condicionales sin dependencias extra. */
export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const SERVICE_ICONS = {
  scissors: IconScissors,
  "razor-electric": IconRazorElectric,
  razor: IconRazor,
  droplet: IconDropletHalf2,
  sparkles: IconSparkles,
  brush: IconBrush,
  spray: IconSpray,
  dots: IconDots,
} satisfies Record<ServiceIconName, unknown>;

export function ServiceIcon({ name, className }: { name: ServiceIconName; className?: string }) {
  const Icon = SERVICE_ICONS[name];
  return <Icon aria-hidden className={className} size={20} stroke={1.6} />;
}

/** Clases completas (Tailwind necesita verlas literales para generarlas). */
export const PRO_BG = {
  "pro-1": "bg-pro-1",
  "pro-2": "bg-pro-2",
  "pro-3": "bg-pro-3",
  "pro-4": "bg-pro-4",
  "pro-5": "bg-pro-5",
  "pro-6": "bg-pro-6",
} as const;

export function Avatar({ pro, size = "md" }: { pro: Professional | null; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={cx(
        "grid shrink-0 place-items-center rounded-full font-semibold",
        size === "md" ? "size-11 text-base" : "size-8 text-sm",
        pro ? `${PRO_BG[pro.colorToken]} text-av-ink` : "bg-surface-2 text-ink",
      )}
    >
      {pro ? pro.name[0] : "★"}
    </span>
  );
}

export function ProDot({ pro }: { pro: Professional }) {
  return <span aria-hidden className={cx("inline-block size-2 rounded-full", PRO_BG[pro.colorToken])} />;
}

const SCREEN_WIDTH = {
  /** Flujos enfocados (confirmación, éxito): una columna cómoda de leer. */
  narrow: "max-w-2xl",
  /** Pantallas con columna principal + lateral. */
  default: "max-w-5xl",
  /** Agenda de la dueña: aprovecha todo el ancho en escritorio. */
  wide: "max-w-7xl",
};

/**
 * Contenedor de página. Mobile-first: en celular ocupa todo el ancho; en
 * tablet y escritorio se centra con un ancho máximo legible (las líneas
 * demasiado largas cansan) y gana margen lateral.
 */
export function Screen({ children, width = "default" }: { children: ReactNode; width?: keyof typeof SCREEN_WIDTH }) {
  return (
    <div className={cx("mx-auto flex w-full flex-1 flex-col md:px-4 lg:px-6", SCREEN_WIDTH[width])}>{children}</div>
  );
}

export function TopBar({
  backHref,
  backLabel = "Volver",
  title,
  progress,
}: {
  backHref?: string;
  backLabel?: string;
  title?: ReactNode;
  progress?: { step: number; total: number; label: string };
}) {
  return (
    <header
      data-tour="topbar"
      className="sticky top-0 z-10 bg-bg/95 px-4 pt-3 pb-2 backdrop-blur md:static md:bg-transparent md:pt-6 md:backdrop-blur-none"
    >
      <div className="flex min-h-11 items-center gap-2">
        {backHref && (
          <Link
            href={backHref}
            aria-label={backLabel}
            className="-ml-2 grid size-11 place-items-center rounded-full text-ink hover:bg-surface-2"
          >
            <IconChevronLeft aria-hidden size={24} />
          </Link>
        )}
        <div className="flex-1 text-sm font-semibold text-muted">{progress?.label ?? title}</div>
      </div>
      {progress && (
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={progress.total}
          aria-valuenow={progress.step}
          aria-label={progress.label}
          className="mt-1 flex gap-1.5"
        >
          {Array.from({ length: progress.total }, (_, i) => (
            <span key={i} className={cx("h-1 flex-1 rounded-full", i < progress.step ? "bg-primary" : "bg-line")} />
          ))}
        </div>
      )}
    </header>
  );
}

export function H1({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="px-4 pt-2 pb-4">
      <h1 className="font-display text-[2.1rem] leading-[1.05] tracking-tight md:text-5xl">{children}</h1>
      {sub && <p className="mt-1.5 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="px-4 pt-6 pb-2 text-xs font-bold tracking-wider text-muted uppercase">
      {children}
    </h2>
  );
}

const buttonBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100";

export const buttonVariants = {
  primary: `${buttonBase} bg-primary text-on-primary`,
  secondary: `${buttonBase} border border-line bg-surface text-ink`,
  danger: `${buttonBase} bg-danger text-on-danger`,
  ghost: `${buttonBase} text-ink hover:bg-surface-2`,
};

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonVariants }) {
  return <Link {...props} className={cx(buttonVariants[variant], className)} />;
}

/** Tarjeta-opción seleccionable (servicio, profesional, medio de pago). */
export function ChoiceCard({
  href,
  selected = false,
  children,
}: {
  href: string;
  selected?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cx(
        "flex min-h-16 items-center gap-3 rounded-2xl border p-3.5 transition hover:border-primary",
        selected ? "border-primary bg-accent-soft" : "border-line bg-surface",
      )}
    >
      {children}
      <IconChevronRight aria-hidden size={18} className="ml-auto shrink-0 text-muted" />
    </Link>
  );
}

export function Badge({ tone, children }: { tone: "ok" | "accent" | "muted" | "danger"; children: ReactNode }) {
  const tones = {
    ok: "bg-ok-soft text-on-ok",
    accent: "bg-accent-soft text-on-accent-soft",
    muted: "bg-surface-2 text-muted",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", tones[tone])}>
      {children}
    </span>
  );
}

export function KeyValueList({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="mx-4 divide-y divide-line rounded-2xl border border-line bg-surface">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted">{k}</dt>
          <dd className="text-right text-[15px] font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Acción principal. En celular es una barra fija abajo (zona del pulgar); en
 * escritorio pasa a ser una tarjeta lateral fija con el resumen, al lado del
 * contenido (ver `WithSidebar`).
 */
export function BottomAction({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <aside
      aria-label={title ?? "Resumen"}
      className="sticky bottom-0 z-10 mt-auto lg:top-24 lg:bottom-auto lg:mt-2 lg:self-start"
    >
      <div className="border-t border-line bg-bg/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur lg:rounded-3xl lg:border lg:bg-surface lg:p-5 lg:backdrop-blur-none">
        {title && <p className="mb-3 hidden font-display text-2xl lg:block">{title}</p>}
        {children}
      </div>
    </aside>
  );
}

/** Contenido + columna lateral de resumen en escritorio; apilados en celular y tablet. */
export function WithSidebar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:flex-none lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8 lg:pb-10">
      {children}
    </div>
  );
}
