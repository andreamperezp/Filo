import { AppShell, type Tab } from "@/components/tab-bar";
import { getActivityFor } from "@/server/bookings";
import { requireStaff } from "@/server/session";
import { LiveUpdates } from "./live-updates";

/**
 * Panel del equipo. Mismo diseño para todos; lo que cambia según el rol:
 * - Superadmin: agenda de todo el equipo + pestaña "Equipo" para gestionar cuentas.
 * - Peluquero: solo su agenda, su actividad y su turno rápido.
 */
export default async function StaffLayout({ children }: LayoutProps<"/panel">) {
  const user = await requireStaff();
  const unread = (await getActivityFor(user)).filter((a) => !a.read);
  const latest = unread[0] ?? null;

  const tabs: Tab[] = [
    { href: "/panel", label: "Agenda", icon: "agenda", match: ["/panel/turnos", "/panel/nuevo"] },
    { href: "/panel/actividad", label: "Actividad", icon: "activity", badge: unread.length },
  ];
  if (user.role === "admin")
    tabs.push({ href: "/panel/equipo", label: "Equipo", icon: "team", match: ["/panel/equipo"] });

  return (
    <AppShell
      navLabel="Navegación del panel"
      homeHref="/panel"
      focusRoutes={["/panel/turnos/", "/panel/nuevo"]}
      user={{ name: user.firstName }}
      action={{ href: "/panel/nuevo", label: "Turno rápido" }}
      tabs={tabs}
    >
      <LiveUpdates latest={latest && { id: latest.id, title: latest.title, detail: latest.detail }} />
      {children}
    </AppShell>
  );
}
