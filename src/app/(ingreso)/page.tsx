import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { isDemo } from "@/server/env";
import { AuthShell } from "./auth-shell";
import { DemoEntry } from "./demo-entry";
import { PhoneForm } from "./forms";

export const metadata = { title: "Ingresar" };

/**
 * Demo pública: se elige el rol y se entra (sin usuarios ni códigos).
 * Local real: la clienta entra solo con su celular; el equipo, desde /equipo.
 */
export default async function SignIn() {
  const session = await getSession();
  if (session) redirect(session.role === "client" ? "/cliente" : "/panel");

  if (isDemo) return <DemoEntry />;

  return (
    <AuthShell
      title="Tu turno, en un minuto."
      subtitle="Ingresá con tu celular para reservar, cambiar o cancelar."
      footer={
        <p className="text-merino/85">
          ¿Trabajás en Filo?{" "}
          <Link href="/equipo" className="font-semibold text-merino underline underline-offset-4">
            Ingresá al panel del equipo
          </Link>
        </p>
      }
    >
      <PhoneForm />
    </AuthShell>
  );
}
