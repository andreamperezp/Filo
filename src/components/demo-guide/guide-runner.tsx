"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { IconHelpCircle } from "@tabler/icons-react";
import { findTour, type Audience, type Tour } from "./tours";

const SEEN_KEY = "filo-guia-vista:";

// localStorage puede fallar (modo privado, datos bloqueados): la guía sigue
// funcionando, solo que se muestra de nuevo.
function wasSeen(id: string) {
  try {
    return localStorage.getItem(SEEN_KEY + id) === "1";
  } catch {
    return false;
  }
}
function markSeen(id: string) {
  try {
    localStorage.setItem(SEEN_KEY + id, "1");
  } catch {}
}

/** Primer elemento visible que coincide (hay menús duplicados para celular y escritorio). */
function firstVisible(selector: string) {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    if (el.getClientRects().length > 0) return el;
  }
  return null;
}

function buildSteps(tour: Tour, audience: Audience): DriveStep[] {
  return tour.steps
    .filter((s) => !s.roles || s.roles.includes(audience))
    .flatMap((s): DriveStep[] => {
      const element = s.element ? firstVisible(s.element) : undefined;
      // Paso atado a algo que no está en esta pantalla (otro estado, otro tamaño): se omite.
      if (element === null) return [];
      return [
        {
          element: element ?? undefined,
          popover: {
            title: s.title,
            description: `<span class="filo-guide-who">¿Quién la usa? ${tour.who}</span>${s.body}`,
          },
        },
      ];
    });
}

/**
 * Guía paso a paso de la demo (driver.js). Se abre sola la primera vez que
 * alguien visita cada pantalla y se puede repetir con el botón "Guía".
 */
export function GuideRunner({ audience }: { audience: Audience }) {
  const pathname = usePathname();
  const tour = findTour(pathname, audience);
  const active = useRef<Driver | null>(null);

  const start = useCallback(() => {
    if (!tour) return;
    active.current?.destroy();
    const steps = buildSteps(tour, audience);
    if (!steps.length) return;
    markSeen(`${tour.id}:${audience}`);
    const d = driver({
      steps,
      showProgress: steps.length > 1,
      showButtons: steps.length > 1 ? ["next", "previous", "close"] : ["next", "close"],
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Entendido",
      popoverClass: "filo-guide",
      overlayColor: "#0b2233",
      overlayOpacity: 0.6,
      stagePadding: 6,
      stageRadius: 18,
      smoothScroll: true,
      onDestroyed: () => {
        if (active.current === d) active.current = null;
      },
    });
    active.current = d;
    d.drive();
  }, [tour, audience]);

  useEffect(() => {
    if (!tour || wasSeen(`${tour.id}:${audience}`)) return;
    // Espera a que la pantalla termine de acomodarse (fuentes, animaciones).
    const timer = setTimeout(start, 700);
    return () => clearTimeout(timer);
  }, [tour, audience, start]);

  // Al cambiar de pantalla, la guía anterior ya no aplica.
  useEffect(() => () => active.current?.destroy(), [pathname]);

  if (!tour) return null;
  return (
    <button
      type="button"
      onClick={start}
      className="fixed top-1/2 right-0 z-40 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-2xl bg-rock px-1.5 py-3 text-xs font-bold text-venice-deep shadow-lg ring-1 ring-venice-deep/15 transition hover:pr-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-venice"
      aria-label="Ver la guía de esta pantalla"
    >
      <IconHelpCircle aria-hidden size={20} />
      <span aria-hidden className="[writing-mode:vertical-rl]">
        Guía
      </span>
    </button>
  );
}
