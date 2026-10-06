import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { isDemo } from "@/server/env";
import { AuthShell } from "./auth-shell";
import { PhoneForm } from "./forms";

export const metadata = { title: "Ingresar" };

/** Ingreso del cliente: solo el celular. Sin registro previo ni contraseña. */
export default async function SignIn() {
  const session = await getSession();
  if (session) redirect(session.role === "client" ? "/cliente" : "/panel");

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
      {isDemo && (
        <p className="mt-5 rounded-xl border border-dashed border-merino/40 p-3 text-sm text-merino/85">
          Demo: probá con <strong className="text-merino">11 5523-8841</strong> para ver un cliente con turnos, o con
          cualquier otro celular para ver el alta de un cliente nuevo.
        </p>
      )}
    </AuthShell>
  );
}
