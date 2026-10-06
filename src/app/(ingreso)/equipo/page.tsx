import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { isProduction } from "@/server/env";
import { AuthShell } from "../auth-shell";
import { StaffForm } from "../forms";

export const metadata = { title: "Panel del equipo" };

/** Ingreso del equipo (superadmin y peluqueros): email + contraseña. */
export default async function TeamSignIn() {
  const session = await getSession();
  if (session?.role === "staff") redirect("/panel");

  return (
    <AuthShell
      title="Panel del equipo."
      subtitle="La agenda del día, las reservas nuevas y la actividad del local."
      footer={
        <p className="text-merino/85">
          ¿Querés sacar un turno?{" "}
          <Link href="/" className="font-semibold text-merino underline underline-offset-4">
            Ingresá con tu celular
          </Link>
        </p>
      }
    >
      <StaffForm />
      {!isProduction && (
        <p className="mt-5 rounded-xl border border-dashed border-merino/40 p-3 text-sm text-merino/85">
          Demo: los datos de prueba están en <code className="font-mono text-merino">.env.development</code>.
        </p>
      )}
    </AuthShell>
  );
}
