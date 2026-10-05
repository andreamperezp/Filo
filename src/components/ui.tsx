import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  IconBrush,
  IconChevronLeft,
  IconChevronRight,
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
} satisfies Record<ServiceIconName, unknown>;

export function ServiceIcon({ name, className }: { name: ServiceIconName; className?: string }) {
  const Icon = SERVICE_ICONS[name];
  return <Icon aria-hidden className={className} size={20} stroke={1.6} />;
}

const PRO_BG = { "pro-1": "bg-pro-1", "pro-2": "bg-pro-2", "pro-3": "bg-pro-3" } as const;

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

/** Contenedor de pantalla mobile-first: columna centrada, cómoda con el pulgar. */
export function Screen({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={cx("mx-auto flex min-h-dvh w-full flex-col", wide ? "max-w-2xl" : "max-w-md")}>{children}</div>
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
    <header className="sticky top-0 z-10 bg-bg/95 px-4 pt-3 pb-2 backdrop-blur">
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
      <h1 className="font-display text-[2.1rem] leading-[1.05] tracking-tight">{children}</h1>
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

/** Barra fija inferior para la acción principal (zona del pulgar). */
export function BottomAction({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-auto border-t border-line bg-bg/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
      {children}
    </div>
  );
}
