"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { IconLoader2 } from "@tabler/icons-react";
import type { FormState } from "@/server/actions";
import { buttonVariants, cx } from "./ui";

type Variant = keyof typeof buttonVariants;

/** Botón de envío con estado de carga: evita dobles envíos y da feedback inmediato. */
export function SubmitButton({
  children,
  pendingLabel = "Un momento…",
  variant = "primary",
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: Variant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={cx(buttonVariants[variant], className)}>
      {pending && <IconLoader2 aria-hidden size={18} className="animate-spin" />}
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  return (
    <p role="alert" aria-live="assertive" className={cx("text-sm font-semibold text-danger", !message && "sr-only")}>
      {message}
    </p>
  );
}

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

/** Formulario conectado a una Server Action que muestra el error devuelto. */
export function ActionForm({
  action,
  hidden,
  children,
  className,
}: {
  action: Action;
  hidden: Record<string, string | number>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, { error: null });
  return (
    <form action={formAction} className={className}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <FormError message={state.error} />
      {children}
    </form>
  );
}

/**
 * Confirmación para acciones destructivas (cancelar un turno). Usa <dialog>
 * nativo: trampa de foco, Escape para cerrar y rol accesible gratis.
 */
export function ConfirmDialog({
  trigger,
  title,
  body,
  confirmLabel,
  cancelLabel = "No, mantener",
  action,
  hidden,
}: {
  trigger: { label: string; variant?: Variant; className?: string };
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  action: Action;
  hidden: Record<string, string>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(
    async (prev: FormState, form: FormData) => {
      const next = await action(prev, form);
      if (!next.error) ref.current?.close();
      return next;
    },
    { error: null },
  );

  useEffect(() => {
    const dialog = ref.current;
    const onClick = (e: MouseEvent) => e.target === dialog && dialog?.close();
    dialog?.addEventListener("click", onClick);
    return () => dialog?.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className={cx(buttonVariants[trigger.variant ?? "secondary"], trigger.className)}
      >
        {trigger.label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby="confirm-title"
        className="animate-slide-up m-0 mt-auto w-full max-w-none rounded-t-3xl bg-surface p-0 text-ink sm:m-auto sm:max-w-md sm:rounded-3xl"
      >
        <form action={formAction} className="flex flex-col gap-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <h2 id="confirm-title" className="font-display text-3xl">
            {title}
          </h2>
          <div className="text-[15px] leading-relaxed text-muted">{body}</div>
          <FormError message={state.error} />
          <SubmitButton variant="danger" pendingLabel="Cancelando…">
            {confirmLabel}
          </SubmitButton>
          <button type="button" onClick={() => ref.current?.close()} className={buttonVariants.ghost} autoFocus>
            {cancelLabel}
          </button>
        </form>
      </dialog>
    </>
  );
}
