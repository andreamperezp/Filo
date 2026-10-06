"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  IconActivity,
  IconCalendarCheck,
  IconCalendarEvent,
  IconHome,
  IconUsersGroup,
  IconLogout,
  IconPlus,
} from "@tabler/icons-react";
import { signOut } from "@/server/auth-actions";
import { LogoMark } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { cx } from "./ui";

// Los íconos se resuelven acá: un Server Component no puede pasar funciones a un Client Component.
const ICONS = {
  home: IconHome,
  bookings: IconCalendarCheck,
  agenda: IconCalendarEvent,
  activity: IconActivity,
  team: IconUsersGroup,
};

export interface Tab {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: number;
  /** Prefijos de ruta que también marcan la pestaña como activa. */
  match?: string[];
}

const isActive = (pathname: string, tab: Tab) =>
  pathname === tab.href || !!tab.match?.some((prefix) => pathname.startsWith(prefix));

/**
 * Estructura común de las apps (cliente y dueña), adaptada a cada pantalla:
 *
 * - **Celular**: cabecera compacta arriba y navegación inferior (zona del pulgar).
 * - **Tablet y escritorio**: la navegación sube a la cabecera junto al logo;
 *   no hay barra inferior (con mouse o en tablet apoyada, arriba es lo esperable).
 * - **Flujos enfocados** (reservar, detalle, turno rápido): en celular se ocultan
 *   cabecera y pestañas para dejar todo el espacio a la tarea; tienen su propio "Volver".
 */
export function AppShell({
  tabs,
  navLabel,
  homeHref,
  focusRoutes,
  user,
  action,
  children,
}: {
  tabs: Tab[];
  navLabel: string;
  homeHref: string;
  focusRoutes: string[];
  user: { name: string };
  action?: { href: string; label: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const focused = focusRoutes.some((prefix) => pathname.startsWith(prefix));

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-xl bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>

      <header
        className={cx("sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur", focused && "hidden md:block")}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:gap-8 md:px-8">
          <Link href={homeHref} aria-label="Filo, ir al inicio" className="shrink-0 text-primary">
            <LogoMark className="w-16 md:w-[4.5rem]" title="Filo" />
          </Link>

          <nav aria-label={navLabel} className="hidden md:block">
            <ul className="flex gap-1">
              {tabs.map((tab) => {
                const active = isActive(pathname, tab);
                const Icon = ICONS[tab.icon];
                return (
                  <li key={tab.href}>
                    <Link
                      href={tab.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition",
                        active ? "bg-primary text-on-primary" : "text-muted hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      <Icon aria-hidden size={18} />
                      {tab.label}
                      {!!tab.badge && <Badge count={tab.badge} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1 md:gap-2">
            <ThemeToggle />
            {action && (
              <Link
                href={action.href}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-on-primary transition active:scale-[0.98]"
              >
                <IconPlus aria-hidden size={18} stroke={2.4} />
                {action.label}
              </Link>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="flex min-h-11 items-center gap-2 rounded-full pr-1 pl-1 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-ink md:pr-4"
              >
                <span
                  aria-hidden
                  className="grid size-9 place-items-center rounded-full bg-surface-2 font-bold text-ink"
                >
                  {user.name[0]}
                </span>
                <span className="sr-only md:not-sr-only">
                  <span className="hidden lg:inline">{user.name} · </span>Salir
                </span>
                <IconLogout aria-hidden size={18} className="hidden md:block" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <div id="contenido" className="flex flex-1 flex-col">
        {children}
      </div>

      {!focused && (
        <nav
          aria-label={navLabel}
          className="sticky bottom-0 z-20 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          {tabs.map((tab) => {
            const active = isActive(pathname, tab);
            const Icon = ICONS[tab.icon];
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold",
                  active ? "text-ink" : "text-muted",
                )}
              >
                <Icon aria-hidden size={22} stroke={active ? 2.2 : 1.6} />
                {tab.label}
                {!!tab.badge && (
                  <span className="absolute top-1.5 left-1/2 ml-2">
                    <Badge count={tab.badge} />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-on-danger">
      {count}
      <span className="sr-only"> sin leer</span>
    </span>
  );
}
