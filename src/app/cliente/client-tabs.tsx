import { TabBar } from "@/components/tab-bar";

export function ClientTabs() {
  return (
    <TabBar
      label="Navegación principal"
      tabs={[
        { href: "/cliente", label: "Inicio", icon: "home" },
        { href: "/cliente/turnos", label: "Mis turnos", icon: "bookings" },
      ]}
    />
  );
}
