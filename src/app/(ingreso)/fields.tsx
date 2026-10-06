"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { IconAlertCircle, IconEye, IconEyeOff, IconLoader2 } from "@tabler/icons-react";
import { cx } from "@/components/ui";

/** Estilos de controles sobre la banda Venice. */
export const inputClass =
  "block min-h-14 w-full rounded-2xl border-2 border-transparent bg-merino px-4 text-lg text-venice-deep placeholder:text-venice-deep/55 focus:border-rock focus:outline-none aria-[invalid=true]:border-[#f4b4a6]";

/**
 * Campo accesible: label visible (nunca solo placeholder), ayuda y error
 * conectados con `aria-describedby`, y `aria-invalid` cuando falla.
 */
export function Field({
  label,
  hint,
  error,
  prefix,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  prefix?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg font-semibold text-venice-deep/70"
          >
            {prefix}
          </span>
        )}
        {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      </div>
      {error && <ErrorText id={errorId!}>{error}</ErrorText>}
      {hint && (
        <p id={hintId} className="text-sm leading-relaxed text-merino/85">
          {hint}
        </p>
      )}
    </div>
  );
}

export function ErrorText({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-[#fbe3dc] px-3 py-2 text-sm font-semibold text-[#8a2a1e]"
    >
      <IconAlertCircle aria-hidden size={18} className="mt-px shrink-0" />
      {children}
    </p>
  );
}

export function PrimaryButton({ children, pendingLabel }: { children: ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-merino px-5 text-base font-bold text-venice-deep transition hover:bg-rock active:scale-[0.98] disabled:opacity-70"
    >
      {pending && <IconLoader2 aria-hidden size={20} className="animate-spin" />}
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Contraseña con "Mostrar": reduce errores de tipeo en el celular sin perder privacidad por defecto. */
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <input {...props} type={visible ? "text" : "password"} className={cx(inputClass, "pr-14")} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute inset-y-0 right-1 my-auto grid size-12 place-items-center rounded-xl text-venice-deep hover:bg-venice-deep/10"
      >
        {visible ? <IconEyeOff aria-hidden size={22} /> : <IconEye aria-hidden size={22} />}
      </button>
    </>
  );
}
