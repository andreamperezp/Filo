import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

/**
 * Pantallas de ingreso con la estética de la referencia: tres bandas de color
 * (Merino → Rock Blue → Venice Blue), cada una con su tipografía en el tono de
 * la paleta. En celular se apilan; en pantallas anchas el afiche va a la
 * izquierda y el formulario a la derecha.
 *
 * Contraste: el logo y el texto chico de cada banda usan Venice o Merino
 * (≥ 5:1 sobre su fondo).
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col md:grid md:grid-cols-2">
      <div className="flex flex-col md:min-h-dvh">
        <header className="bg-merino px-6 pt-10 pb-6 md:flex md:flex-1 md:flex-col md:justify-end md:px-12">
          <Logo size="lg" className="text-venice" />
        </header>
        <section className="bg-rock px-6 py-7 text-venice-deep md:flex md:flex-1 md:flex-col md:justify-center md:px-12">
          <h1 className="font-display text-[2.1rem] leading-[1.05] md:text-5xl">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] leading-relaxed md:text-lg">{subtitle}</p>}
        </section>
      </div>

      <main
        data-surface="dark"
        className="flex flex-1 flex-col bg-venice px-6 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-merino md:justify-center md:px-12"
      >
        <div className="w-full md:mx-auto md:max-w-sm">
          {children}
          {footer && <div className="mt-8 border-t border-merino/20 pt-5 text-sm">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
