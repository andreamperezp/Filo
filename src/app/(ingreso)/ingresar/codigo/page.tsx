import { redirect } from "next/navigation";
import { formatArMobile } from "@/domain/phone";
import { changePhone } from "@/server/auth-actions";
import { demoCodeOf, secondsUntilResend } from "@/server/one-time-code";
import { getPendingLogin } from "@/server/session";
import { AuthShell } from "../../auth-shell";
import { CodeForm } from "../../forms";

export const metadata = { title: "Ingresá el código" };

export default async function EnterCode() {
  const pending = await getPendingLogin();
  if (pending?.step !== "code") redirect("/");

  const devCode = demoCodeOf(pending.otp);

  return (
    <AuthShell
      title="Revisá tu WhatsApp."
      subtitle={
        <>
          Te mandamos un código al <strong className="whitespace-nowrap">{formatArMobile(pending.phone)}</strong>.
        </>
      }
      footer={
        <form action={changePhone}>
          <button type="submit" className="min-h-11 font-semibold text-merino underline underline-offset-4">
            Usar otro número
          </button>
        </form>
      }
    >
      {devCode && (
        <p className="mb-5 rounded-xl border border-dashed border-merino/40 p-3 text-sm text-merino/85">
          Demo: no se envían mensajes. Tu código es{" "}
          <strong className="font-mono text-base tracking-widest text-merino">{devCode}</strong>
        </p>
      )}
      <CodeForm resendIn={secondsUntilResend(pending.otp)} />
    </AuthShell>
  );
}
