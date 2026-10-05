"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconActivity, IconCalendarCheck, IconCalendarEvent, IconHome } from "@tabler/icons-react";
import { cx } from "./ui";

// Los íconos se resuelven acá: un Server Component no puede pasar funciones a un Client Component.
const ICONS = {
  home: IconHome,
  bookings: IconCalendarCheck,
  agenda: IconCalendarEvent,
  activity: IconActivity,
};

export interface Tab {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: number;
  /** Rutas hijas que también marcan la pestaña como activa. */
  match?: string;
}

/** Navegación inferior: 2 destinos por rol, siempre visibles y al alcance del pulgar. */
export function TabBar({ tabs, label }: { tabs: Tab[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className="sticky bottom-0 z-10 mt-auto flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      {tabs.map(({ href, label, icon, badge, match }) => {
        const Icon = ICONS[icon];
        const active = pathname === href || (!!match && pathname.startsWith(match));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold",
              active ? "text-ink" : "text-muted",
            )}
          >
            <Icon aria-hidden size={22} stroke={active ? 2.2 : 1.6} />
            {label}
            {!!badge && (
              <span className="absolute top-1.5 left-1/2 ml-2 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-on-danger">
                {badge}
                <span className="sr-only"> sin leer</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
