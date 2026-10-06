import { DemoGuide } from "@/components/demo-guide";
import { AppShell } from "@/components/tab-bar";
import { requireClient } from "@/server/session";

export default async function ClientLayout({ children }: LayoutProps<"/cliente">) {
  const client = await requireClient();
  return (
    <AppShell
      navLabel="Navegación principal"
      homeHref="/cliente"
      focusRoutes={["/cliente/reservar"]}
      user={{ name: client.firstName }}
      tabs={[
        { href: "/cliente", label: "Inicio", icon: "home" },
        { href: "/cliente/turnos", label: "Mis turnos", icon: "bookings", match: ["/cliente/turnos"] },
      ]}
    >
      {children}
      <DemoGuide audience="client" />
    </AppShell>
  );
}
