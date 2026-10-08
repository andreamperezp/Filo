/**
 * Guías de la demo: qué es cada pantalla y qué cambia en la versión real.
 * Cortas a propósito: una o dos frases por paso. Solo la primera pantalla de
 * cada recorrido se abre sola (`autoStart`); el resto, con el botón "Guía".
 * Los textos son HTML propio (nunca datos de usuarios).
 *
 * - `element`: selector CSS; se usa el primer elemento visible. Si no hay
 *   ninguno visible (otra pantalla, otro tamaño), el paso se omite.
 * - Sin `element`, el paso es un cartel centrado.
 */

/** Quién está mirando: visita sin sesión, clienta o alguien del equipo. */
export type Audience = "guest" | "client" | "admin" | "professional";

export interface GuideStep {
  element?: string;
  title: string;
  body: string;
  /** Solo para estos roles (por defecto, todos los del tour). */
  roles?: Audience[];
}

export interface Tour {
  id: string;
  matches: (pathname: string) => boolean;
  audiences: Audience[];
  /** Se abre sola la primera vez (solo la entrada de cada recorrido). */
  autoStart?: boolean;
  steps: GuideStep[];
}

const is = (path: string) => (pathname: string) => pathname === path;
const STAFF: Audience[] = ["admin", "professional"];

export const TOURS: Tour[] = [
  /* ───────────── App de la clienta ───────────── */
  {
    id: "cliente-inicio",
    matches: is("/cliente"),
    audiences: ["client"],
    autoStart: true,
    steps: [
      {
        title: "La app de tu clienta",
        body: `<p>Ve su próximo turno y reserva en 4 pasos. En tu versión, con tu logo y colores.</p>`,
        element: 'main a[href="/cliente/reservar"]',
      },
    ],
  },
  {
    id: "reservar-profesional",
    matches: is("/cliente/reservar/profesional"),
    audiences: ["client"],
    steps: [
      {
        title: "¿Con quién?",
        body: `<p>“Cualquiera” asigna al primero con lugar.</p>`,
        element: "main ul",
      },
    ],
  },
  {
    id: "reservar-horario",
    matches: is("/cliente/reservar/horario"),
    audiences: ["client"],
    steps: [
      {
        title: "Solo horarios libres",
        body: `<p>Nunca hay dos turnos en el mismo horario.</p>`,
        element: "main section",
      },
    ],
  },
  {
    id: "reservar-confirmar",
    matches: is("/cliente/reservar/confirmar"),
    audiences: ["client"],
    steps: [
      {
        title: "Seña opcional",
        body: `<p>En la versión real se cobra con Mercado Pago. Acá no se cobra nada.</p>`,
        element: '[role="radiogroup"]',
      },
    ],
  },
  {
    id: "cliente-turnos",
    matches: is("/cliente/turnos"),
    audiences: ["client"],
    steps: [
      {
        title: "Mis turnos",
        body: `<p>Cambia o cancela sola, hasta 24 h antes.</p>`,
        element: "main ul",
      },
    ],
  },

  /* ───────────── Panel del equipo ───────────── */
  {
    id: "panel-agenda",
    matches: is("/panel"),
    audiences: STAFF,
    autoStart: true,
    steps: [
      {
        title: "La agenda del día",
        body: `<p>Los turnos de todo el equipo. Tocá uno para ver el detalle y cobrarlo.</p>`,
        element: "main ol, main section[aria-labelledby^='col-']",
        roles: ["admin"],
      },
      {
        title: "Tu agenda del día",
        body: `<p>Solo tus turnos. Tocá uno para ver el detalle y cobrarlo.</p>`,
        element: "main ol, main section[aria-labelledby^='col-']",
        roles: ["professional"],
      },
      {
        title: "Turno rápido",
        body: `<p>Para la clienta que llama o entra al local.</p>`,
        element: '[data-tour="quick-action"]',
      },
    ],
  },
  {
    id: "panel-turno",
    matches: (p) => /^\/panel\/turnos\/[^/]+$/.test(p),
    audiences: STAFF,
    steps: [
      {
        title: "Cobrar el turno",
        body: `<p>Anotás lo que te pagó, aunque sea en efectivo. Así la Caja está al día.</p>`,
        element: '[data-tour="booking-actions"]',
      },
    ],
  },
  {
    id: "panel-caja",
    matches: is("/panel/caja"),
    audiences: STAFF,
    steps: [
      {
        title: "La caja",
        body: `<p>Lo cobrado, el tiempo trabajado y cuánto rinde cada hora.</p>`,
        element: 'section[aria-label="Resumen"]',
      },
    ],
  },
  {
    id: "panel-equipo",
    matches: is("/panel/equipo"),
    audiences: ["admin"],
    steps: [
      {
        title: "Tu equipo",
        body: `<p>Creás el usuario de cada peluquero y elegís qué servicios hace.</p>`,
        element: "main details",
      },
    ],
  },
];

export function findTour(pathname: string, audience: Audience): Tour | undefined {
  return TOURS.find((t) => t.audiences.includes(audience) && t.matches(pathname));
}
