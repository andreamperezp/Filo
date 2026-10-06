import { AppShell } from "@/components/tab-bar";
import { getActivity } from "@/server/bookings";
import { requireOwner } from "@/server/session";
import { LiveUpdates } from "./live-updates";

export default async function OwnerLayout({ children }: LayoutProps<"/duena">) {
  const owner = await requireOwner();
  const activity = await getActivity();
  const unread = activity.filter((a) => !a.read);
  const latest = unread[0] ?? null;

  return (
    <AppShell
      navLabel="Navegación del panel"
      homeHref="/duena"
      focusRoutes={["/duena/turnos/", "/duena/nuevo"]}
      user={{ name: owner.firstName }}
      action={{ href: "/duena/nuevo", label: "Turno rápido" }}
      tabs={[
        { href: "/duena", label: "Agenda", icon: "agenda", match: ["/duena/turnos", "/duena/nuevo"] },
        { href: "/duena/actividad", label: "Actividad", icon: "activity", badge: unread.length },
      ]}
    >
      <LiveUpdates latest={latest && { id: latest.id, title: latest.title, detail: latest.detail }} />
      {children}
    </AppShell>
  );
}
