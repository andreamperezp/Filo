"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  completeProfile,
  confirmCode,
  ownerSignIn,
  requestCode,
  resendCode,
  type AuthState,
} from "@/server/auth-actions";
import { ErrorText, Field, PasswordInput, PrimaryButton, inputClass } from "./fields";
import { cx } from "@/components/ui";

const initial: AuthState = { error: null };

/* ───────────── Cliente · paso 1: celular ───────────── */

export function PhoneForm() {
  const [state, action] = useActionState(requestCode, initial);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Field
        label="Tu celular"
        prefix="+54"
        error={state.error}
        hint="Te mandamos un código por WhatsApp para entrar. Sin contraseñas."
      >
        {(a11y) => (
          <input
            {...a11y}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="11 5523-8841"
            defaultValue={state.values?.phone}
            required
            autoFocus
            className={cx(inputClass, "pl-14")}
          />
        )}
      </Field>
      <PrimaryButton pendingLabel="Enviando código…">Continuar</PrimaryButton>
    </form>
  );
}

/* ───────────── Cliente · paso 2: código ───────────── */

export function CodeForm({ resendIn }: { resendIn: number }) {
  const [state, action] = useActionState(confirmCode, initial);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-5">
      <form ref={formRef} action={action} className="flex flex-col gap-5" noValidate>
        <Field label="Código de 6 números" error={state.error}>
          {(a11y) => (
            <input
              {...a11y}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              defaultValue={state.values?.code}
              required
              autoFocus
              // Al completar los 6 dígitos (o pegarlos / autocompletarlos desde el SMS) se envía solo.
              onChange={(e) => {
                e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 6);
                if (e.currentTarget.value.length === 6) formRef.current?.requestSubmit();
              }}
              className={cx(inputClass, "text-center font-mono text-3xl tracking-[0.5em]")}
            />
          )}
        </Field>
        <PrimaryButton pendingLabel="Verificando…">Entrar</PrimaryButton>
      </form>
      <ResendCode initialSeconds={resendIn} />
    </div>
  );
}

/** Reenviar con cuenta regresiva visible: evita el spam y explica por qué el botón espera. */
function ResendCode({ initialSeconds }: { initialSeconds: number }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <div className="text-center text-sm" aria-live="polite">
      {seconds > 0 ? (
        <p className="text-merino/85">Podés pedir otro código en {seconds} s</p>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await resendCode();
              setMessage(result.error ?? "Te mandamos un código nuevo.");
              setSeconds(30);
            })
          }
          className="min-h-11 rounded-xl px-3 font-semibold underline underline-offset-4"
        >
          {pending ? "Enviando…" : "No me llegó, enviar otro"}
        </button>
      )}
      {message && <p className="mt-1 text-merino/85">{message}</p>}
    </div>
  );
}

/* ───────────── Cliente · paso 3 (solo la primera vez): nombre ───────────── */

export function ProfileForm() {
  const [state, action] = useActionState(completeProfile, initial);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Field label="Nombre y apellido" error={state.error} hint="Así te reconocemos cuando llegás al local.">
        {(a11y) => (
          <input
            {...a11y}
            name="name"
            autoComplete="name"
            autoCapitalize="words"
            placeholder="Martín Díaz"
            defaultValue={state.values?.name}
            required
            autoFocus
            className={inputClass}
          />
        )}
      </Field>
      <PrimaryButton pendingLabel="Guardando…">Empezar a reservar</PrimaryButton>
    </form>
  );
}

/* ───────────── Dueña: email + contraseña ───────────── */

export function OwnerForm() {
  const [state, action] = useActionState(ownerSignIn, initial);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.error && <ErrorText>{state.error}</ErrorText>}
      <Field label="Email">
        {(a11y) => (
          <input
            {...a11y}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.values?.email}
            required
            autoFocus
            className={inputClass}
          />
        )}
      </Field>
      <Field label="Contraseña">
        {(a11y) => <PasswordInput {...a11y} name="password" autoComplete="current-password" required />}
      </Field>
      <PrimaryButton pendingLabel="Ingresando…">Ingresar</PrimaryButton>
    </form>
  );
}
