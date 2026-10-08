"use client";

import { useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { IconBuildingStore, IconScissors, IconUser } from "@tabler/icons-react";
import { Logo } from "@/components/logo";
import { cx } from "@/components/ui";
import { enterDemo, type DemoRole } from "@/server/auth-actions";
import { PrimaryButton } from "./fields";
import barbero from "../sistema/fotos/barbero-peine.jpg";
import clienta from "../sistema/fotos/clienta-corte.jpg";
import salon from "../sistema/fotos/salon-lamparas.jpg";

const ROLES: {
  id: DemoRole;
  label: string;
  hint: string;
  Icon: typeof IconUser;
  photo: StaticImageData;
  alt: string;
  title: string;
  message: string;
  cta: string;
}[] = [
  {
    id: "client",
    label: "Cliente",
    hint: "Reservá un turno como lo haría tu clienta.",
    Icon: IconUser,
    photo: clienta,
    alt: "Clienta en pleno corte de pelo",
    title: "Tu turno, en un minuto.",
    message: "Reservás desde el celular, sin llamar ni esperar a que te contesten.",
    cta: "Entrar como cliente",
  },
  {
    id: "professional",
    label: "Peluquero",
    hint: "Mirá la agenda del día y cobrá un turno.",
    Icon: IconScissors,
    photo: barbero,
    alt: "Barbero peinando a un cliente",
    title: "Tu día, de un vistazo.",
    message: "Tus turnos, tus clientas y cobrar en dos toques, sin cuadernos.",
    cta: "Entrar como peluquero",
  },
  {
    id: "admin",
    label: "Dueño de peluquería",
    hint: "Todo el local: equipo, turnos y caja.",
    Icon: IconBuildingStore,
    photo: salon,
    alt: "Interior de una barbería con sillones y lámparas colgantes",
    title: "Todo tu local, en un lugar.",
    message: "El equipo, la agenda de todos y la caja con números claros.",
    cta: "Entrar como dueño",
  },
];

/**
 * Entrada de la demo pública: no hay usuarios ni códigos. Quien la prueba
 * elige cómo entrar y, al cambiar de rol, la foto y el mensaje de la izquierda
 * le cuentan qué va a ver.
 */
export function DemoEntry() {
  const [role, setRole] = useState<DemoRole>("client");
  const current = ROLES.find((r) => r.id === role)!;

  return (
    <div className="flex min-h-dvh flex-col md:grid md:grid-cols-2">
      <div className="flex flex-col md:min-h-dvh">
        {/* En celular todo compacto: los roles y el botón tienen que verse sin scroll. */}
        <header className="bg-merino px-5 py-3 md:px-12 md:pt-12 md:pb-6">
          <div className="md:hidden">
            <Logo size="sm" className="text-venice" />
          </div>
          <div className="hidden md:block">
            <Logo size="lg" className="text-venice" />
          </div>
        </header>
        <section
          aria-live="polite"
          className="relative h-[clamp(8rem,22dvh,12rem)] flex-none overflow-hidden bg-venice-deep text-merino md:h-auto md:min-h-72 md:flex-1"
        >
          {ROLES.map((r) => (
            <Image
              key={r.id}
              src={r.photo}
              alt={r.id === role ? r.alt : ""}
              fill
              priority={r.id === "client"}
              sizes="(min-width: 768px) 50vw, 100vw"
              className={cx(
                "object-cover transition-opacity duration-500 motion-reduce:transition-none",
                r.id === role ? "opacity-100" : "opacity-0",
              )}
            />
          ))}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-venice-deep via-venice-deep/55 to-transparent"
          />
          <div className="relative flex h-full flex-col justify-end px-5 pb-3 md:min-h-72 md:px-12 md:pt-24 md:pb-12">
            <h1 className="font-display text-2xl leading-[1.05] md:text-5xl">{current.title}</h1>
            <p className="mt-1 max-w-md text-sm leading-snug text-merino/90 md:mt-2 md:text-lg md:leading-relaxed">
              {current.message}
            </p>
          </div>
        </section>
      </div>

      <main
        data-surface="dark"
        className="flex flex-1 flex-col bg-venice px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-merino md:justify-center md:px-12 md:pt-8"
      >
        <div className="w-full md:mx-auto md:max-w-sm">
          <form action={enterDemo} className="flex flex-col gap-4 md:gap-5">
            <fieldset className="flex flex-col gap-2 md:gap-2.5" data-tour="demo-roles">
              <legend className="mb-0.5 font-display text-xl md:mb-1 md:text-2xl">¿Cómo querés probarla?</legend>
              <p className="mb-1 text-xs text-merino/80 md:mb-2 md:text-sm">
                Es una demo con datos inventados: tocá todo lo que quieras.
              </p>
              {ROLES.map((r) => (
                <label
                  key={r.id}
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 border-merino/25 p-2.5 transition hover:border-merino/60 has-[:checked]:border-merino has-[:checked]:bg-merino/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-merino md:min-h-16 md:gap-3.5 md:p-3.5"
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.id}
                    checked={role === r.id}
                    onChange={() => setRole(r.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cx(
                      "grid size-9 shrink-0 place-items-center rounded-xl transition md:size-11",
                      role === r.id ? "bg-merino text-venice-deep" : "bg-merino/10 text-merino",
                    )}
                  >
                    <r.Icon size={22} />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-semibold">{r.label}</span>
                    <span className="hidden text-sm text-merino/80 md:block">{r.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <PrimaryButton pendingLabel="Entrando…">{current.cta}</PrimaryButton>
          </form>

          <p className="mt-5 border-t border-merino/20 pt-4 text-sm text-merino/85 md:mt-8 md:pt-5">
            ¿Tenés una peluquería?{" "}
            <Link href="/sistema" className="font-semibold text-merino underline underline-offset-4">
              Conocé Filo System
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
