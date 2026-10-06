import { IconCash, IconPlus, IconRefresh, IconX } from "@tabler/icons-react";
import type { ActivityKind } from "@/domain/types";
import { staffMarkActivityRead } from "@/server/actions";
import { getActivityFor } from "@/server/bookings";
import { requireStaff } from "@/server/session";
import { SubmitButton } from "@/components/forms";
import { H1, Screen, cx } from "@/components/ui";

export const metadata = { title: "Actividad" };

const KIND: Record<ActivityKind, { Icon: typeof IconPlus; className: string; label: string }> = {
  created: { Icon: IconPlus, className: "bg-primary text-on-primary", label: "Nueva reserva" },
  cancelled: { Icon: IconX, className: "bg-danger-soft text-danger", label: "Cancelación" },
  rescheduled: { Icon: IconRefresh, className: "bg-surface-2 text-ink", label: "Cambio de horario" },
  closed: { Icon: IconCash, className: "bg-ok-soft text-on-ok", label: "Turno cerrado" },
};

const rtf = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });

function ago(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "recién";
  if (min < 60) return rtf.format(-min, "minute");
  if (min < 1440) return rtf.format(-Math.round(min / 60), "hour");
  return rtf.format(-Math.round(min / 1440), "day");
}

export default async function Activity() {
  const user = await requireStaff();
  const events = await getActivityFor(user);
  const unread = events.some((e) => !e.read);

  return (
    <Screen width="narrow">
      <main className="flex-1 pb-6">
        <div className="flex items-end justify-between pt-6 pr-4">
          <H1
            sub={
              user.role === "admin"
                ? "Reservas, cambios y cancelaciones de todo el equipo"
                : "Reservas, cambios y cancelaciones de tu agenda"
            }
          >
            Actividad
          </H1>
          {unread && (
            <form action={staffMarkActivityRead} className="pb-4">
              <SubmitButton variant="ghost" className="min-h-10 px-3 text-sm" pendingLabel="…">
                Marcar todo leído
              </SubmitButton>
            </form>
          )}
        </div>
        <ul className="flex flex-col gap-1 px-2">
          {events.map((e) => {
            const k = KIND[e.kind];
            return (
              <li key={e.id} className={cx("flex items-start gap-3 rounded-2xl p-3", !e.read && "bg-surface")}>
                <span className={cx("grid size-9 shrink-0 place-items-center rounded-full", k.className)}>
                  <k.Icon aria-hidden size={18} />
                  <span className="sr-only">{k.label}</span>
                </span>
                <div className="flex-1">
                  <p className={cx("text-[15px]", !e.read && "font-bold")}>{e.title}</p>
                  <p className="text-sm text-muted">{e.detail}</p>
                </div>
                <time dateTime={e.at} className="shrink-0 text-xs text-muted">
                  {ago(e.at)}
                </time>
              </li>
            );
          })}
        </ul>
      </main>
    </Screen>
  );
}
