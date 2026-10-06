import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { isDemo } from "@/server/env";
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
      <StaffForm demo={isDemo} />
      {isDemo && (
        <p className="mt-5 rounded-xl border border-dashed border-merino/40 p-3 text-sm text-merino/85">
          Demo: elegí qué rol querés probar y entrá con cualquier email y contraseña. En el local real, cada persona
          tiene su propio usuario, creado por la dueña.
        </p>
      )}
    </AuthShell>
  );
}
