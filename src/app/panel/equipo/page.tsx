import { IconUserPlus } from "@tabler/icons-react";
import { SERVICE_DEFS } from "@/data/catalog";
import { listTeam } from "@/server/team";
import { requireAdmin } from "@/server/session";
import { Badge, H1, PRO_BG, Screen, cx } from "@/components/ui";
import { AddMemberForm, MemberActions, ServicesForm } from "./team-forms";

export const metadata = { title: "Equipo" };

/**
 * Gestión del equipo (solo superadmin). Cada persona tiene su propio acceso:
 * así se sabe quién hizo qué, y un peluquero ve solo su agenda.
 */
export default async function Team() {
  const admin = await requireAdmin();
  const members = await listTeam();
  const services = SERVICE_DEFS.map((s) => ({ id: s.id, name: s.name }));

  return (
    <Screen>
      <main className="flex-1 pb-10">
        <div className="pt-6">
          <H1 sub="Accesos al panel y profesionales que atienden. Cada persona entra con su propio usuario.">Equipo</H1>
        </div>

        <details className="group mx-4 rounded-3xl border border-line bg-surface open:pb-5">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-5 font-semibold [&::-webkit-details-marker]:hidden">
            <IconUserPlus aria-hidden size={20} className="text-primary" />
            Sumar a alguien al equipo
            <span aria-hidden className="ml-auto text-muted transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="px-5 pt-2">
            <AddMemberForm services={services} />
          </div>
        </details>

        <ul className="mt-6 grid gap-3 px-4 lg:grid-cols-2">
          {members.map(({ user, professional, upcomingBookings }) => {
            const isMe = user.id === admin.id;
            return (
              <li
                key={user.id}
                className={cx("rounded-3xl border border-line bg-surface p-5", !user.active && "opacity-70")}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={cx(
                      "grid size-11 shrink-0 place-items-center rounded-full font-bold",
                      professional ? `${PRO_BG[professional.colorToken]} text-av-ink` : "bg-surface-2",
                    )}
                  >
                    {user.name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {user.name} {isMe && <span className="font-normal text-muted">(vos)</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={user.role === "admin" ? "accent" : "muted"}>
                        {user.role === "admin" ? "Superadmin" : "Peluquero/a"}
                      </Badge>
                      {professional && <Badge tone="muted">{professional.role}</Badge>}
                      {!user.active && <Badge tone="danger">Desactivada</Badge>}
                      {user.active && user.mustChangePassword && <Badge tone="accent">Falta su primer ingreso</Badge>}
                    </div>
                    {professional && (
                      <p className="mt-2 text-sm text-muted">
                        {upcomingBookings} {upcomingBookings === 1 ? "turno próximo" : "turnos próximos"}
                      </p>
                    )}
                  </div>
                </div>

                {professional && (
                  <details className="mt-4 rounded-2xl bg-bg/60 px-4 py-2">
                    <summary className="min-h-10 cursor-pointer text-sm leading-10 font-semibold">
                      Servicios que hace
                    </summary>
                    <div className="pt-1 pb-3">
                      <ServicesForm
                        professionalId={professional.id}
                        services={services}
                        selected={professional.serviceIds}
                      />
                    </div>
                  </details>
                )}

                {!isMe && (
                  <div className="mt-4 border-t border-line pt-4">
                    <MemberActions staffId={user.id} name={user.name} email={user.email} active={user.active} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </Screen>
  );
}
