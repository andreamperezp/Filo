"use client";

import { useActionState, useRef, useState } from "react";
import { IconCheck, IconCopy, IconKey, IconUserOff, IconUserCheck } from "@tabler/icons-react";
import {
  addTeamMember,
  resetTeamPassword,
  saveMemberServices,
  toggleTeamMember,
  type TeamState,
} from "@/server/team-actions";
import { FormError, SubmitButton } from "@/components/forms";
import { buttonVariants, cx } from "@/components/ui";

interface ServiceOption {
  id: string;
  name: string;
}

const initial: TeamState = { error: null };
const inputClass =
  "min-h-12 w-full rounded-xl border border-line bg-bg px-3 text-base font-normal focus:border-primary focus:outline-none";

/**
 * Contraseña temporal recién creada. Se muestra UNA vez (no se guarda en
 * texto): se copia y se comparte por un canal privado.
 */
export function CredentialsNotice({ credentials }: { credentials: NonNullable<TeamState["credentials"]> }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="rounded-2xl border-2 border-primary bg-accent-soft p-4 text-on-accent-soft">
      <p className="font-bold">Acceso listo para {credentials.name}</p>
      <dl className="mt-2 grid gap-1 text-sm">
        <div className="flex flex-wrap gap-x-2">
          <dt>Email:</dt>
          <dd className="font-semibold">{credentials.email}</dd>
        </div>
        <div className="flex flex-wrap items-center gap-x-2">
          <dt>Contraseña temporal:</dt>
          <dd className="font-mono text-base font-bold tracking-wide">{credentials.password}</dd>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(credentials.password);
              setCopied(true);
            }}
            className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-semibold hover:bg-surface"
          >
            {copied ? <IconCheck aria-hidden size={16} /> : <IconCopy aria-hidden size={16} />}
            {copied ? "Copiada" : "Copiar"}
          </button>
        </div>
      </dl>
      <p className="mt-2 text-sm">
        Pasásela en persona o por un mensaje privado. Al entrar en <strong>/equipo</strong> va a tener que elegir su
        propia contraseña. <strong>Esta es la única vez que se muestra.</strong>
      </p>
    </div>
  );
}

export function AddMemberForm({ services }: { services: ServiceOption[] }) {
  const [state, action] = useActionState(addTeamMember, initial);
  const [role, setRole] = useState<"professional" | "admin">("professional");
  const [attends, setAttends] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const showServices = role === "professional" || attends;

  return (
    <div className="flex flex-col gap-4">
      {state.credentials && <CredentialsNotice credentials={state.credentials} />}
      <form ref={formRef} action={action} className="grid gap-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Nombre y apellido
            <input name="name" required autoComplete="off" defaultValue={state.values?.name} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Email (para entrar)
            <input
              name="email"
              type="email"
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={state.values?.email}
              className={inputClass}
            />
          </label>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Rol</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { value: "professional", title: "Peluquero/a", sub: "Ve y gestiona solo su agenda." },
              { value: "admin", title: "Superadmin", sub: "Ve todos los turnos y administra el equipo." },
            ].map((r) => (
              <label
                key={r.value}
                className={cx(
                  "cursor-pointer rounded-2xl border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary",
                  role === r.value ? "border-primary bg-accent-soft" : "border-line bg-bg",
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={r.value}
                  checked={role === r.value}
                  onChange={() => setRole(r.value as typeof role)}
                  className="sr-only"
                />
                <span className="block font-bold">{r.title}</span>
                <span className="block text-sm text-muted">{r.sub}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {role === "admin" && (
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              name="attends"
              checked={attends}
              onChange={(e) => setAttends(e.target.checked)}
              className="size-5 accent-[var(--primary)]"
            />
            También atiende clientas (tiene agenda propia)
          </label>
        )}

        {showServices && (
          <>
            <label className="flex flex-col gap-1.5 text-sm font-semibold sm:max-w-sm">
              Especialidad (se muestra a las clientas)
              <input name="roleLabel" placeholder="Ej. Barbero, Colorista" maxLength={40} className={inputClass} />
            </label>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">Servicios que hace</legend>
              <div className="flex flex-wrap gap-2">
                {services.map((s) => (
                  <label
                    key={s.id}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-bg px-4 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary"
                  >
                    <input type="checkbox" name="serviceIds" value={s.id} defaultChecked className="sr-only" />
                    {s.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <FormError message={state.error} />
        <div>
          <SubmitButton pendingLabel="Creando…">Crear acceso</SubmitButton>
        </div>
      </form>
    </div>
  );
}

export function ServicesForm({
  professionalId,
  services,
  selected,
}: {
  professionalId: string;
  services: ServiceOption[];
  selected: string[];
}) {
  const [state, action] = useActionState(saveMemberServices, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="professionalId" value={professionalId} />
      <div className="flex flex-wrap gap-2">
        {services.map((s) => (
          <label
            key={s.id}
            className="flex min-h-10 cursor-pointer items-center rounded-full border border-line bg-bg px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary"
          >
            <input
              type="checkbox"
              name="serviceIds"
              value={s.id}
              defaultChecked={selected.includes(s.id)}
              className="sr-only"
            />
            {s.name}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton variant="secondary" pendingLabel="Guardando…" className="min-h-10 text-sm">
          Guardar servicios
        </SubmitButton>
        <p aria-live="polite" className={cx("text-sm", state.error ? "font-semibold text-danger" : "text-muted")}>
          {state.error ?? state.message}
        </p>
      </div>
    </form>
  );
}

/** Blanquear contraseña y activar/desactivar, con confirmación para lo que afecta el acceso. */
export function MemberActions({
  staffId,
  name,
  email,
  active,
}: {
  staffId: string;
  name: string;
  email: string;
  active: boolean;
}) {
  const [resetState, resetAction] = useActionState(resetTeamPassword, initial);
  const [toggleState, toggleAction] = useActionState(toggleTeamMember, initial);
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <div className="flex flex-col gap-3">
      {resetState.credentials && <CredentialsNotice credentials={resetState.credentials} />}
      <div className="flex flex-wrap gap-2">
        <form action={resetAction}>
          <input type="hidden" name="staffId" value={staffId} />
          <input type="hidden" name="email" value={email} />
          <SubmitButton variant="secondary" pendingLabel="Generando…" className="min-h-10 text-sm">
            <IconKey aria-hidden size={16} /> Blanquear contraseña
          </SubmitButton>
        </form>
        {active ? (
          <button
            type="button"
            onClick={() => dialog.current?.showModal()}
            className={cx(buttonVariants.ghost, "min-h-10 text-sm text-danger")}
          >
            <IconUserOff aria-hidden size={16} /> Desactivar
          </button>
        ) : (
          <form action={toggleAction}>
            <input type="hidden" name="staffId" value={staffId} />
            <input type="hidden" name="active" value="true" />
            <SubmitButton variant="secondary" pendingLabel="Reactivando…" className="min-h-10 text-sm">
              <IconUserCheck aria-hidden size={16} /> Reactivar
            </SubmitButton>
          </form>
        )}
      </div>
      <p
        aria-live="polite"
        className={cx("text-sm", (resetState.error ?? toggleState.error) ? "font-semibold text-danger" : "text-muted")}
      >
        {resetState.error ?? toggleState.error ?? toggleState.message}
      </p>

      <dialog
        ref={dialog}
        aria-labelledby={`deactivate-${staffId}`}
        className="animate-slide-up m-0 mt-auto w-full max-w-none rounded-t-3xl bg-surface p-0 text-ink sm:m-auto sm:max-w-md sm:rounded-3xl"
      >
        <form action={toggleAction} onSubmit={() => dialog.current?.close()} className="flex flex-col gap-3 p-5">
          <input type="hidden" name="staffId" value={staffId} />
          <input type="hidden" name="active" value="false" />
          <h2 id={`deactivate-${staffId}`} className="font-display text-3xl">
            ¿Desactivar a {name}?
          </h2>
          <p className="text-muted">
            No va a poder entrar al panel y dejará de ofrecerse para turnos nuevos. Sus turnos ya agendados siguen en la
            agenda. Podés reactivarla cuando quieras.
          </p>
          <SubmitButton variant="danger" pendingLabel="Desactivando…">
            Sí, desactivar
          </SubmitButton>
          <button type="button" onClick={() => dialog.current?.close()} className={buttonVariants.ghost} autoFocus>
            Cancelar
          </button>
        </form>
      </dialog>
    </div>
  );
}
