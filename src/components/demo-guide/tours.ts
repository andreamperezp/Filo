/**
 * Guías de la demo: qué es cada pantalla, quién la usa y qué cambia en la
 * versión real. Los textos son HTML propio (nunca datos de usuarios).
 *
 * - `element`: selector CSS; se usa el primer elemento visible. Si no hay
 *   ninguno visible (otra pantalla, otro tamaño), el paso se omite.
 * - Sin `element`, el paso es un cartel centrado (para el contexto general).
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
  /** Etiqueta corta de quién usa la pantalla en el local real. */
  who: string;
  matches: (pathname: string) => boolean;
  audiences: Audience[];
  steps: GuideStep[];
}

const is = (path: string) => (pathname: string) => pathname === path;
const STAFF: Audience[] = ["admin", "professional"];

export const TOURS: Tour[] = [
  /* ───────────── Ingreso de la clienta ───────────── */
  {
    id: "ingreso",
    who: "Tu clienta",
    matches: is("/"),
    audiences: ["guest"],
    steps: [
      {
        title: "Bienvenida a la demo de Filo System",
        body: `<p>Estás viendo un local de ejemplo, <strong>Filo</strong>, con datos inventados. Podés tocar todo: no se envían mensajes ni se cobra nada.</p>
<p>El sistema tiene <strong>dos caras</strong>:</p>
<ul><li><strong>La app de tus clientas</strong>: reservan, cambian o cancelan su turno desde el celular.</li>
<li><strong>El panel del equipo</strong>: la dueña y cada peluquero ven su agenda, cobran y ordenan el día.</li></ul>
<p>Te vamos guiando en cada pantalla. Si cerrás la guía, la volvés a abrir con el botón <strong>Guía</strong> del costado.</p>`,
      },
      {
        title: "Así entra tu clienta",
        body: `<p>Tu clienta llega desde un link que compartís en tu WhatsApp, Instagram o Google (por ejemplo <em>tulocal.filo.app</em>). <strong>No descarga ninguna app</strong> y funciona en celular, tablet o compu.</p>
<p>Para entrar solo pone su <strong>número de celular</strong>. Sin contraseñas que olvidar, sin registrarse con email: menos pasos, más reservas.</p>`,
        element: "main form",
      },
      {
        title: "Probalo como clienta",
        body: `<p>Con <strong>11 5523-8841</strong> entrás como Martín, un cliente que ya tiene turnos.</p>
<p>Con <strong>cualquier otro celular</strong> ves lo que le pasa a alguien que reserva por primera vez.</p>`,
        element: "main p.border-dashed",
      },
      {
        title: "La otra cara: tu equipo",
        body: `<p>Desde acá entran la dueña y los peluqueros a su panel. En la demo podés entrar con cualquier email y contraseña y elegir qué rol probar.</p>`,
        element: 'main a[href="/equipo"]',
      },
      {
        title: "Tu local, tu marca",
        body: `<p>Filo es solo un ejemplo: la app lleva <strong>el nombre, logo y colores de tu peluquería o barbería</strong>. En la presentación de Filo System podés probarlo con los tuyos.</p>`,
        element: 'main a[href="/sistema"]',
      },
    ],
  },
  {
    id: "codigo",
    who: "Tu clienta",
    matches: is("/ingresar/codigo"),
    audiences: ["guest"],
    steps: [
      {
        title: "El código de WhatsApp",
        body: `<p>En la versión real, tu clienta recibe al instante un <strong>código de 6 números por WhatsApp</strong>, enviado desde el número de tu local.</p>
<p>Así confirmamos que el celular es suyo, sin pedirle contraseña. El código vence a los 10 minutos y se bloquea si alguien prueba muchas veces.</p>`,
      },
      {
        title: "En la demo, el código está acá",
        body: `<p>Como es una prueba, <strong>no mandamos mensajes</strong>: te mostramos el código en pantalla para que sigas.</p>`,
        element: "main p.border-dashed",
      },
      {
        title: "Lo escribe y entra",
        body: `<p>En muchos celulares el código se completa solo al llegar el mensaje.</p>
<p>La sesión dura <strong>30 días</strong>: la próxima vez que reserve, entra directo sin código.</p>`,
        element: "main form",
      },
    ],
  },
  {
    id: "datos",
    who: "Tu clienta (primera vez)",
    matches: is("/ingresar/datos"),
    audiences: ["guest"],
    steps: [
      {
        title: "Solo la primera vez",
        body: `<p>Es una clienta nueva, así que le pedimos <strong>un único dato: su nombre</strong>. El celular ya lo tenemos y está verificado.</p>
<p>Nada de email, DNI ni formularios largos. Con este nombre aparece en la agenda del peluquero.</p>`,
        element: "main form",
      },
    ],
  },

  /* ───────────── App de la clienta ───────────── */
  {
    id: "cliente-inicio",
    who: "Tu clienta",
    matches: is("/cliente"),
    audiences: ["client"],
    steps: [
      {
        title: "La app de tu clienta",
        body: `<p>Esto es lo que ve tu clienta después de entrar. Está pensado para resolver todo <strong>con una mano y en menos de un minuto</strong>.</p>
<p>En tu versión, arriba va tu logo y todo usa los colores de tu local.</p>`,
      },
      {
        title: "Su próximo turno, siempre a la vista",
        body: `<p>Lo primero que ve es cuándo le toca. Tocándolo puede <strong>cambiar el horario o cancelar</strong> sin escribirte: te ahorra mensajes y llamadas.</p>`,
        element: 'section[aria-labelledby="next-title"]',
      },
      {
        title: "Reservar: la acción principal",
        body: `<p>Un botón grande y visible. Reservar son <strong>4 pasos</strong>: servicio, profesional, día y hora, y confirmar.</p>`,
        element: 'main a[href="/cliente/reservar"]',
      },
      {
        title: "Tus servicios y precios",
        body: `<p>Tu lista de servicios con lo que dura cada uno y su precio. Tocar uno saltea el primer paso de la reserva.</p>
<p>Vos decidís qué servicios se pueden reservar online y cuáles solo agenda tu equipo (por ejemplo, trabajos largos de color).</p>`,
        element: 'ul[aria-labelledby="services-title"]',
      },
      {
        title: "Navegación simple",
        body: `<p>Solo dos secciones: <strong>Inicio</strong> y <strong>Mis turnos</strong>. Nada que aprender.</p>`,
        element: '[data-tour="tabs"]',
      },
      {
        title: "Claro u oscuro",
        body: `<p>Cada persona elige cómo verla. Se acuerda de su elección.</p>`,
        element: '[data-tour="theme"]',
      },
      {
        title: "Probá reservar",
        body: `<p>Tocá <strong>Reservar turno</strong> y seguí el recorrido. Después, entrá al panel del equipo y vas a ver ese turno nuevo en la agenda.</p>`,
      },
    ],
  },
  {
    id: "reservar-servicio",
    who: "Tu clienta",
    matches: is("/cliente/reservar"),
    audiences: ["client"],
    steps: [
      {
        title: "Paso 1 de 4: el servicio",
        body: `<p>Arriba siempre ve en qué paso está y cuánto falta, y puede volver atrás sin perder nada.</p>`,
        element: '[data-tour="topbar"]',
      },
      {
        title: "¿Qué se hace?",
        body: `<p>Cada servicio muestra duración y precio. La duración importa: el sistema reserva <strong>el tiempo justo</strong> en la agenda del peluquero, así no se pisan los turnos.</p>`,
        element: "main ul",
      },
    ],
  },
  {
    id: "reservar-profesional",
    who: "Tu clienta",
    matches: is("/cliente/reservar/profesional"),
    audiences: ["client"],
    steps: [
      {
        title: "Paso 2 de 4: ¿con quién?",
        body: `<p>Solo aparecen los profesionales que <strong>hacen ese servicio</strong> (lo define la dueña en Equipo).</p>
<p>Con <strong>“Cualquiera”</strong> el sistema le asigna a quien tenga lugar primero: ideal para llenar huecos de la agenda.</p>`,
        element: "main ul",
      },
    ],
  },
  {
    id: "reservar-horario",
    who: "Tu clienta",
    matches: is("/cliente/reservar/horario"),
    audiences: ["client"],
    steps: [
      {
        title: "Paso 3 de 4: el día",
        body: `<p>Puede reservar hasta <strong>14 días</strong> adelante (vos elegís cuántos). Los días que el local cierra no se pueden elegir.</p>`,
        element: "main nav",
      },
      {
        title: "Solo horarios realmente libres",
        body: `<p>El sistema ya descontó los turnos tomados, los horarios que bloqueó el peluquero (almuerzo, trámites, vacaciones) y la duración del servicio.</p>
<p>Resultado: <strong>nunca hay dos turnos en el mismo horario</strong> y no tenés que confirmar nada a mano.</p>`,
        element: "main section",
      },
      {
        title: "Resumen y seguir",
        body: `<p>Abajo (o al costado en compu) ve lo que eligió y sigue al último paso.</p>`,
        element: "aside",
      },
    ],
  },
  {
    id: "reservar-confirmar",
    who: "Tu clienta",
    matches: is("/cliente/reservar/confirmar"),
    audiences: ["client"],
    steps: [
      {
        title: "Paso 4 de 4: revisar",
        body: `<p>Todo el turno en un vistazo antes de confirmar: servicio, profesional, día, hora y precio.</p>`,
        element: "main dl",
      },
      {
        title: "Pagar en el local o dejar seña",
        body: `<p>Puede pagar todo en el local o dejar una <strong>seña del 20%</strong>. La seña reduce muchísimo los faltazos.</p>
<p>En la versión real la seña se cobra con <strong>Mercado Pago</strong> y te llega directo a tu cuenta. En la demo no se cobra nada.</p>`,
        element: '[role="radiogroup"]',
      },
      {
        title: "Confirmar",
        body: `<p>Al confirmar, el turno aparece <strong>al instante</strong> en el panel del peluquero, marcado como “Nuevo”, y suma un aviso en Actividad.</p>`,
        element: "aside",
      },
    ],
  },
  {
    id: "reservar-listo",
    who: "Tu clienta",
    matches: is("/cliente/reservar/listo"),
    audiences: ["client"],
    steps: [
      {
        title: "¡Turno reservado!",
        body: `<p>En la versión real, tu clienta recibe la confirmación por <strong>WhatsApp</strong> y un <strong>recordatorio el día anterior</strong>.</p>
<p>Ahora probá el otro lado: salí y entrá al <strong>panel del equipo</strong> para ver este turno en la agenda.</p>`,
      },
    ],
  },
  {
    id: "cliente-turnos",
    who: "Tu clienta",
    matches: is("/cliente/turnos"),
    audiences: ["client"],
    steps: [
      {
        title: "Mis turnos",
        body: `<p>Sus turnos próximos, con opciones para <strong>cambiar o cancelar</strong>.</p>
<p>Puede hacerlo gratis hasta <strong>24 h antes</strong>. Después, la app le pide que hable con el local. Ese plazo lo definís vos.</p>`,
        element: "main ul",
      },
      {
        title: "Repetir en un toque",
        body: `<p>En los turnos anteriores puede tocar <strong>Repetir</strong>: va directo a elegir horario con el mismo servicio y profesional. Ideal para clientas fijas.</p>`,
        element: 'ul[aria-labelledby="past"]',
      },
    ],
  },

  /* ───────────── Ingreso del equipo ───────────── */
  {
    id: "equipo-ingreso",
    who: "Tu equipo",
    matches: is("/equipo"),
    audiences: ["guest"],
    steps: [
      {
        title: "El panel del equipo",
        body: `<p>Esta es la otra cara de Filo System: lo que usan <strong>la dueña y cada peluquero</strong>, desde su celular o la compu del local.</p>`,
      },
      {
        title: "Elegí qué rol probar",
        body: `<p><strong>Dueña del local</strong> (superadmin): ve la agenda de todos, la caja completa y crea los usuarios del equipo.</p>
<p><strong>Peluquero</strong>: ve solo sus turnos y lo que cobró él. No ve la plata de los demás.</p>`,
        element: '[data-tour="staff-role"]',
      },
      {
        title: "Usuario y contraseña",
        body: `<p>En tu local, cada persona tiene <strong>su propio usuario</strong>, que crea la dueña. La primera vez entra con una clave temporal y elige la suya.</p>
<p>En la demo vale <strong>cualquier email y contraseña</strong>, incluso vacíos.</p>`,
        element: 'main button[type="submit"]',
      },
    ],
  },

  /* ───────────── Panel del equipo ───────────── */
  {
    id: "panel-agenda",
    who: "Dueña y peluqueros",
    matches: is("/panel"),
    audiences: STAFF,
    steps: [
      {
        title: "La agenda del día",
        body: `<p>Es la pantalla que más se usa: <strong>quién viene hoy, a qué hora y para qué</strong>.</p>
<p>Como <strong>dueña</strong> ves los turnos de todo el equipo, cada profesional con su color.</p>`,
        roles: ["admin"],
      },
      {
        title: "Tu agenda del día",
        body: `<p>Es la pantalla que más vas a usar: <strong>quién viene hoy, a qué hora y para qué</strong>.</p>
<p>Como <strong>peluquero</strong> ves solo tus turnos. La dueña ve los de todos.</p>`,
        roles: ["professional"],
      },
      {
        title: "Elegir el día",
        body: `<p>Hoy y los próximos días, con cuántos turnos hay en cada uno. Así planificás la semana de un vistazo.</p>`,
        element: 'nav[aria-label="Días"]',
      },
      {
        title: "Filtrar por profesional",
        body: `<p>Elegí a alguien para ver <strong>su día hora por hora</strong>: turnos y huecos libres. Desde cada hueco podés agendar o bloquear.</p>`,
        element: 'nav[aria-label="Profesional"]',
      },
      {
        title: "Marcar cuándo no estás",
        body: `<p>Bloqueá rangos (almuerzo, un trámite, vacaciones) o liberalos. Esos horarios <strong>desaparecen al instante</strong> de la app de las clientas.</p>`,
        element: "main details",
      },
      {
        title: "Los turnos",
        body: `<p>Cada turno muestra la clienta, el servicio y su estado: <strong>Nuevo</strong> (reservó online y no lo viste), <strong>En curso</strong>, <strong>Por cobrar</strong> y <strong>Cobrado</strong>.</p>
<p>Tocá uno para ver el detalle, escribirle por WhatsApp o cobrarlo.</p>`,
        element: "main ol, main section[aria-labelledby^='col-']",
      },
      {
        title: "Turno rápido",
        body: `<p>Para la clienta que <strong>te llama o entra al local</strong>: la agendás en segundos sin que tenga que usar la app.</p>`,
        element: '[data-tour="quick-action"]',
      },
      {
        title: "Las secciones del panel",
        body: `<p><strong>Caja</strong>: lo cobrado y el tiempo trabajado. <strong>Actividad</strong>: reservas, cambios y cancelaciones que hicieron las clientas. <strong>Equipo</strong>: usuarios y servicios de cada profesional.</p>`,
        element: '[data-tour="tabs"]',
        roles: ["admin"],
      },
      {
        title: "Las secciones del panel",
        body: `<p><strong>Caja</strong>: lo que cobraste vos y cuánto tiempo trabajaste. <strong>Actividad</strong>: reservas, cambios y cancelaciones de tus clientas.</p>`,
        element: '[data-tour="tabs"]',
        roles: ["professional"],
      },
    ],
  },
  {
    id: "panel-nuevo",
    who: "Dueña y peluqueros",
    matches: is("/panel/nuevo"),
    audiences: STAFF,
    steps: [
      {
        title: "Turno rápido",
        body: `<p>La clienta está en el local o te llama. En vez de anotarlo en un cuaderno, lo cargás acá y <strong>bloquea el horario para todos</strong>: nadie más puede reservarlo online.</p>`,
      },
      {
        title: "La clienta",
        body: `<p>Nombre y, si querés, su celular. Con el celular, la próxima vez que entre a la app ya ve este turno.</p>`,
        element: 'section[aria-label="Clienta"]',
      },
      {
        title: "El servicio",
        body: `<p>Además de los servicios del local, está <strong>“Otro”</strong>: para algo fuera de la lista, eligiendo cuánto dura y con un motivo opcional.</p>`,
        element: 'section[aria-label="Servicio"]',
      },
      {
        title: "Un calendario con lugar real",
        body: `<p>Los días marcados tienen lugar para ese servicio. El equipo puede agendar más lejos que las clientas (hasta 45 días).</p>`,
        element: 'section[aria-label="Día"]',
      },
      {
        title: "La hora",
        body: `<p>Solo ves horarios donde entra el servicio completo, sin pisar otro turno ni un bloqueo.</p>`,
        element: 'section[aria-label^="Hora"]',
      },
    ],
  },
  {
    id: "panel-turno",
    who: "Dueña y peluqueros",
    matches: (p) => /^\/panel\/turnos\/[^/]+$/.test(p),
    audiences: STAFF,
    steps: [
      {
        title: "El detalle del turno",
        body: `<p>Todo lo de esta clienta en un lugar: servicio, horario, si dejó seña y cuánto resta cobrar.</p>`,
        element: "main dl",
      },
      {
        title: "Contacto en un toque",
        body: `<p>Escribile por <strong>WhatsApp</strong> con un mensaje ya armado, o llamala. Sin buscar su número en el celular.</p>`,
        element: '[data-tour="contact"]',
      },
      {
        title: "Empezar, cobrar o cancelar",
        body: `<p><strong>Empezar turno</strong> arranca un reloj (opcional): así sabés cuánto te lleva de verdad cada servicio.</p>
<p><strong>Finalizar y cobrar</strong> registra lo que te pagó, aunque sea en efectivo o por fuera de la app: así la Caja siempre está al día.</p>
<p>Si cancelás, se le avisa a la clienta y el horario queda libre.</p>`,
        element: '[data-tour="booking-actions"]',
      },
    ],
  },
  {
    id: "panel-cerrar",
    who: "Dueña y peluqueros",
    matches: (p) => /^\/panel\/turnos\/[^/]+\/cerrar$/.test(p),
    audiences: STAFF,
    steps: [
      {
        title: "Cerrar y cobrar el turno",
        body: `<p>Muchas veces el pago es en efectivo o por transferencia, <strong>fuera de la app</strong>. Acá lo anotás en segundos para tener los números claros.</p>`,
      },
      {
        title: "¿Cuánto le cobraste?",
        body: `<p>Viene sugerido con el precio del servicio (menos la seña, si dejó). Si cobraste otro monto, lo cambiás.</p>`,
        element: 'section[aria-label="¿Cuánto le cobraste?"]',
      },
      {
        title: "Medio de pago",
        body: `<p>Efectivo, transferencia, tarjeta o Mercado Pago: después ves en la Caja cuánto entró por cada medio.</p>`,
        element: 'section[aria-label="¿Cómo pagó?"]',
      },
      {
        title: "Propina",
        body: `<p>Opcional, se registra aparte para que no se mezcle con el precio del servicio.</p>`,
        element: 'section[aria-label="Propina (opcional)"]',
      },
      {
        title: "¿Cuánto duró?",
        body: `<p>Si empezaste el turno, el tiempo ya viene medido. Si no, ajustalo de a 5 minutos. Con esto ves <strong>cuánto tiempo invertís y cuánto te deja cada servicio</strong>.</p>`,
        element: 'section[aria-label="¿Cuánto duró?"]',
      },
    ],
  },
  {
    id: "panel-caja",
    who: "Dueña y peluqueros",
    matches: is("/panel/caja"),
    audiences: STAFF,
    steps: [
      {
        title: "La caja",
        body: `<p>Todo lo cobrado al cerrar cada turno, sumado solo. <strong>Sin planillas ni cuadernos.</strong></p>`,
        roles: ["admin"],
      },
      {
        title: "Tu caja",
        body: `<p>Lo que cobraste <strong>vos</strong> al cerrar cada turno. No ves la plata del resto del equipo: eso solo lo ve la dueña.</p>`,
        roles: ["professional"],
      },
      {
        title: "Elegí el período",
        body: `<p>Hoy, la semana o el mes.</p>`,
        element: 'nav[aria-label="Período"]',
      },
      {
        title: "Por profesional",
        body: `<p>Como dueña podés ver el total del local o lo de cada peluquero, por ejemplo para calcular comisiones.</p>`,
        element: 'nav[aria-label="Profesional"]',
        roles: ["admin"],
      },
      {
        title: "Los números importantes",
        body: `<p>Total cobrado, cantidad de turnos, ticket promedio, propinas, horas trabajadas y <strong>cuánto rinde cada hora</strong>.</p>`,
        element: 'section[aria-label="Resumen"]',
      },
      {
        title: "El detalle",
        body: `<p>Más abajo: cuánto entró por cada medio de pago, qué servicios dejan más y la lista de turnos cerrados.</p>`,
        element: 'section[aria-labelledby="by-channel"]',
      },
    ],
  },
  {
    id: "panel-actividad",
    who: "Dueña y peluqueros",
    matches: is("/panel/actividad"),
    audiences: STAFF,
    steps: [
      {
        title: "Actividad",
        body: `<p>Todo lo que hicieron las clientas desde la app: <strong>reservas nuevas, cambios de horario y cancelaciones</strong>, en orden.</p>
<p>Lo no leído aparece resaltado y con un número en la pestaña. Así no te enterás tarde de una cancelación.</p>`,
        element: "main ul",
      },
    ],
  },
  {
    id: "panel-equipo",
    who: "Solo la dueña",
    matches: is("/panel/equipo"),
    audiences: ["admin"],
    steps: [
      {
        title: "Tu equipo",
        body: `<p>Solo la dueña ve esta sección. Acá se maneja <strong>quién entra al panel</strong> y qué hace cada uno.</p>`,
      },
      {
        title: "Sumar a alguien",
        body: `<p>Cargás nombre y email y el sistema genera una <strong>clave temporal</strong> para pasarle. La primera vez que entra, elige la suya.</p>`,
        element: "main details",
      },
      {
        title: "Cada persona",
        body: `<p>Para cada uno podés elegir <strong>qué servicios hace</strong> (las clientas solo lo ven para esos), resetear su clave o desactivarlo si deja el local. Sus turnos quedan guardados.</p>`,
        element: "main ul",
      },
    ],
  },
];

export function findTour(pathname: string, audience: Audience): Tour | undefined {
  return TOURS.find((t) => t.audiences.includes(audience) && t.matches(pathname));
}
