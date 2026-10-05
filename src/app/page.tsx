import { redirect } from "next/navigation";
import { IconCalendarEvent, IconScissors } from "@tabler/icons-react";
import { BUSINESS } from "@/data/catalog";
import { enterAs } from "@/server/actions";
import { getSession } from "@/server/session";
import { Screen } from "@/components/ui";

/**
 * Entrada de la demo: elegir rol. En producción, el cliente entra por el link
 * público del local y la dueña por /duena con su cuenta.
 */
export default async function Home() {
  const session = await getSession();
  if (session) redirect(session.role === "client" ? "/cliente" : "/duena");

  const roles = [
    { role: "client", title: "Soy cliente", sub: "Reservo, cambio o cancelo mi turno", Icon: IconScissors },
    { role: "owner", title: "Soy la dueña", sub: "Veo la agenda del día y la actividad", Icon: IconCalendarEvent },
  ] as const;

  return (
    <Screen>
      <main className="flex flex-1 flex-col justify-center gap-10 px-6 py-12">
        <div>
          <p className="font-display text-6xl leading-none">{BUSINESS.name}</p>
          <p className="mt-2 text-muted">{BUSINESS.tagline}</p>
        </div>
        <div className="flex flex-col gap-3">
          {roles.map(({ role, title, sub, Icon }) => (
            <form key={role} action={enterAs}>
              <input type="hidden" name="role" value={role} />
              <button
                type="submit"
                className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-primary active:scale-[0.99]"
              >
                <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-on-accent-soft">
                  <Icon aria-hidden size={24} stroke={1.6} />
                </span>
                <span>
                  <span className="block text-base font-bold">{title}</span>
                  <span className="block text-sm text-muted">{sub}</span>
                </span>
              </button>
            </form>
          ))}
        </div>
        <p className="text-xs text-muted">Demo con datos de ejemplo: se reinician al reiniciar el servidor.</p>
      </main>
    </Screen>
  );
}
