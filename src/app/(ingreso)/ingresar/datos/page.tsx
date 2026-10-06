import { redirect } from "next/navigation";
import { getPendingLogin } from "@/server/session";
import { AuthShell } from "../../auth-shell";
import { ProfileForm } from "../../forms";

export const metadata = { title: "Contanos tu nombre" };

/** Solo para clientes nuevos: un único dato y adentro. */
export default async function Profile() {
  const pending = await getPendingLogin();
  if (pending?.step !== "profile") redirect("/");

  return (
    <AuthShell title="¡Bienvenido a Filo!" subtitle="Es tu primera vez. Solo nos falta saber cómo te llamás.">
      <ProfileForm />
    </AuthShell>
  );
}
