import { TabBar } from "@/components/tab-bar";
import { getUnreadActivityCount } from "@/server/bookings";

export async function OwnerTabs() {
  const unread = await getUnreadActivityCount();
  return (
    <TabBar
      label="Navegación de la dueña"
      tabs={[
        { href: "/duena", label: "Agenda", icon: "agenda" },
        { href: "/duena/actividad", label: "Actividad", icon: "activity", badge: unread },
      ]}
    />
  );
}
