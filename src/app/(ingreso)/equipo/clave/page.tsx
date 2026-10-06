import { requireStaff } from "@/server/session";
import { AuthShell } from "../../auth-shell";
import { ChangePasswordForm } from "../../forms";

export const metadata = { title: "Elegí tu contraseña" };

/**
 * Primer ingreso de un peluquero (o después de un blanqueo): reemplaza la
 * contraseña temporal por una propia antes de usar el panel.
 */
export default async function ChangePassword() {
  const user = await requireStaff({ allowPasswordChange: true });
  return (
    <AuthShell
      title={user.mustChangePassword ? `Hola, ${user.firstName}.` : "Cambiar contraseña."}
      subtitle={
        user.mustChangePassword
          ? "Antes de empezar, elegí tu propia contraseña. La temporal deja de funcionar."
          : "Elegí una contraseña nueva para entrar al panel."
      }
    >
      <ChangePasswordForm />
    </AuthShell>
  );
}
