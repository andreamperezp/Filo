# Filo · turnos para peluquería y barbería

**Filo** es una app web de turnos online para una peluquería/barbería de barrio
(Av. San Martín 2140, Villa del Parque). Tiene dos caras:

| Rol             | Quién                               | Para qué la usa                                                                                                       |
| --------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Cliente**     | Martín, que se corta cada 3 semanas | Reservar en menos de un minuto, ver su próximo turno, cambiarlo o cancelarlo sin llamar.                              |
| **Superadmin**  | Romina, dueña y colorista           | Gestión centralizada: agenda de todo el equipo, alta y baja de peluqueros con su propio acceso, turnos de cualquiera. |
| **Peluquero/a** | Lucas, Sofía y quien se sume        | Su propia agenda: ver sus turnos, marcar cuándo no atiende y agendar turnos rápidos para sí.                          |

> El problema que resuelve: hoy los turnos se piden por WhatsApp e Instagram y
> se anotan en un cuaderno. La dueña pierde tiempo respondiendo mensajes con las
> manos ocupadas, y los huecos por cancelaciones de último momento no se vuelven
> a llenar.

El diseño parte del prototipo hecho en Claude Design (pantallas y textos) con la
identidad de marca actual:

| Rol en la UI            | Color           | Hex       |
| ----------------------- | --------------- | --------- |
| Fondo                   | **Merino**      | `#F5EEDD` |
| Acento / logo           | **Rock Blue**   | `#84B3CE` |
| Primario / texto fuerte | **Venice Blue** | `#16587B` |

**Logo:** isotipo "filo" con el corte de tijera atravesando "lo", vectorizado del
original (`src/components/logo.tsx`). Usa el color del texto que lo rodea, así
funciona en Venice sobre Merino, en Merino sobre Venice y en modo oscuro. El
favicon (`src/app/icon.svg`) es el mismo isotipo.

**Tema claro / oscuro:** por defecto sigue al dispositivo; el botón ☀️/🌙 de la cabecera lo fija y se recuerda (cookie), sin parpadeo al cargar. Los colores se definen una sola vez con `light-dark()` en `globals.css`.

Tipografías: **Fraunces** (títulos, peso 800 con ejes `SOFT` y `WONK` para el aire
setentoso de la referencia) y **Outfit** (texto e interfaz).

---

## Funcionalidades

### Ingreso

- **Clientes (`/`)**: entran con su **celular** y un **código de 6 números** (sin contraseña ni registro previo). La primera vez solo se les pide el nombre.
- **Equipo (`/equipo`)**: cada persona entra con **su propio email y contraseña** (hash scrypt), con bloqueo temporal tras 5 intentos fallidos.
  - Las cuentas las crea el superadmin con una **contraseña temporal** que se muestra una sola vez; en el primer ingreso cada uno elige la suya.
- Sesión en cookie firmada (HMAC) y `httpOnly`: 30 días para clientes, 12 h para el equipo. Si el admin desactiva una cuenta, la sesión deja de valer al instante.

### App de clientes (`/cliente`)

- **Inicio**: saludo, tarjeta con el próximo turno, botón "Reservar turno", lista de servicios con duración y precio, dirección y horarios.
- **Reserva en 4 pasos**: servicio → profesional (o "cualquiera disponible") → día y hora → revisión y pago.
  - Cada profesional muestra su _próximo horario libre_.
  - Los días muestran cuántos horarios quedan ("6 libres", "Completo", "Cerrado").
  - Los horarios ocupados se ven tachados (no se esconden) para entender la disponibilidad real.
  - Pago en el local o **seña online del 20 %**.
- **Mis turnos**: próximos (cambiar / cancelar con confirmación) y anteriores (con "Repetir" en un toque).
- **Política de cancelación**: gratis hasta 24 h antes; después, link directo a WhatsApp.

### Panel del equipo (`/panel`)

|                                              | Superadmin                                       | Peluquero/a                              |
| -------------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| Agenda                                       | Todo el equipo, filtro por profesional, columnas | Solo la suya                             |
| Marcar disponibilidad                        | Cualquier profesional o todo el equipo           | Solo la suya                             |
| Turno rápido                                 | Para cualquiera (o "cualquiera disponible")      | Solo en su agenda                        |
| Detalle y cancelación de turnos              | Todos                                            | Solo los suyos                           |
| Actividad                                    | De todo el local                                 | De sus turnos (con su propio "sin leer") |
| **Equipo** (alta, baja, blanqueo, servicios) | Sí                                               | No                                       |

Los permisos se verifican **en el servidor**, no solo en la pantalla: un peluquero no puede ver ni tocar turnos ajenos aunque modifique la URL o el formulario.

- **Agenda**: selector de 14 días con cantidad de turnos por día y filtro por profesional.
  - Vista "Todos": lista cronológica en celular; **una columna por profesional** en tablet y escritorio.
  - Vista por profesional: grilla completa con cada hueco **Libre → Agendar / Bloquear** y **No disponible → Liberar**.
- **Marcar disponibilidad**: no disponible / disponible para el **día completo, la mañana, la tarde o un rango** (un profesional o todo el equipo). Los horarios que ya tienen turno no se tocan y se informa cuántos son.
- **Turno rápido** (botón fijo en la cabecera): para la clienta que está en el local o llama. Una sola pantalla con nombre, celular opcional, servicio, profesional, **calendario** y hora, con el **primer horario libre ya elegido**. Si se carga el celular, el turno aparece en su cuenta cuando entre a Filo.
  - **Calendario** mensual de 45 días: cada día muestra cuántos horarios libres tiene, con color (mucho / poco lugar) y navegación por teclado.
  - Servicio **"Otro"** (solo equipo): duración a elegir (30 min a 3 h) y motivo opcional ("prueba de peinado"). Precio a convenir.
- **Finalizar y cobrar**: al terminar un turno se carga **cuánto se cobró** (casi siempre en el local, en efectivo o por fuera de la app), **cómo** (efectivo, transferencia, débito/crédito, Mercado Pago u otro), **propina** opcional y **cuánto duró**. Todo viene precargado (precio de lista menos la seña; duración medida si se tocó **"Empezar turno"**, o la agendada). En la agenda cada turno muestra **En curso**, **Por cobrar** o **Cobrado $X**.
- **Caja** (pestaña propia; cada peluquero ve lo suyo, el admin todo el local): ingresos, turnos finalizados, ticket promedio, **tiempo invertido**, **valor por hora**, propinas, ingresos por día, por medio de pago, por servicio (duración real vs agendada) y por profesional. Períodos: hoy, esta semana, este mes. Avisa los turnos que terminaron sin cerrar.
- **Equipo** (solo superadmin): sumar personas (peluquero/a o superadmin, especialidad, servicios que hace), blanquear contraseña, desactivar/reactivar y editar servicios. Quien se suma aparece automáticamente en la reserva de clientes.
  - Los turnos nuevos que todavía no vio se resaltan con "Nuevo".
- **Detalle del turno**: estado, datos del cliente, botones de WhatsApp (con mensaje precargado) y Llamar, seña pagada y saldo, "Marcar como atendido" y "Cancelar turno".
- **Actividad**: reservas, cambios y cancelaciones con badge de no leídos.
- **Avisos en vivo**: la agenda se refresca sola y aparece un toast cuando entra una reserva.

### Responsive: web, tablet y celular

Filo se usa desde un **link compartido** (no es una app de tienda), así que cada pantalla está diseñada para los tres tamaños:

|                   | Celular (< 768 px)                                        | Tablet (768–1023 px)                  | Escritorio (≥ 1024 px)         |
| ----------------- | --------------------------------------------------------- | ------------------------------------- | ------------------------------ |
| Navegación        | Barra inferior (zona del pulgar)                          | Cabecera con logo y pestañas          | Igual que tablet               |
| Inicio cliente    | Una columna                                               | Dos columnas: lo personal / servicios | Igual, más aire                |
| Elegir horario    | Días deslizables, 4 horarios por fila, resumen fijo abajo | 14 días a la vista, 8 por fila        | Resumen en tarjeta lateral     |
| Agenda del equipo | Lista cronológica                                         | Columna por profesional               | 14 días en una fila + columnas |
| Flujos enfocados  | Sin cabecera ni pestañas, con "Volver"                    | Con cabecera                          | Con cabecera                   |

---

## Stack tecnológico

| Capa                             | Tecnología                                                           | Por qué                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Framework                        | **Next.js 16** (App Router, React Server Components, Server Actions) | Un solo proyecto para front y back, render en el servidor (rápido en celulares de gama media), formularios que funcionan sin JS. |
| UI                               | **React 19.2** + **TypeScript** (modo estricto)                      | Tipos de punta a punta, del dominio a la pantalla.                                                                               |
| Estilos                          | **Tailwind CSS v4** con design tokens en CSS                         | Tokens semánticos (`bg-surface`, `text-muted`) con tema claro y oscuro.                                                          |
| Íconos                           | **Tabler Icons**                                                     | Los mismos del prototipo.                                                                                                        |
| Validación                       | **Zod 4**                                                            | Toda entrada a una Server Action se valida en el servidor.                                                                       |
| Tests                            | **Vitest**                                                           | Tests unitarios del dominio (disponibilidad, señas, políticas).                                                                  |
| Calidad                          | ESLint (config de Next) · Prettier · `tsc --noEmit`                  | Corren en CI en cada PR.                                                                                                         |
| CI                               | **GitHub Actions**                                                   | lint → typecheck → test → build.                                                                                                 |
| Base de datos _(siguiente fase)_ | **Supabase** (Postgres + Auth + Realtime + RLS)                      | Migración lista en [`supabase/migrations`](supabase/migrations).                                                                 |
| Pagos _(siguiente fase)_         | **Mercado Pago** Checkout Pro + webhooks                             | Medio de pago dominante en Argentina para la seña.                                                                               |
| Mensajería _(siguiente fase)_    | **WhatsApp Cloud API**                                               | Recordatorios 24 h antes y avisos de cancelación.                                                                                |
| Deploy                           | **Vercel**                                                           | Previews por PR y deploy continuo desde `main`.                                                                                  |

Más detalle y decisiones de arquitectura en [`docs/arquitectura.md`](docs/arquitectura.md).

---

## Documentación

| Documento                                      | Contenido                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`docs/user-flows.md`](docs/user-flows.md)     | Flujos de usuario de clientes, peluqueros y superadmin (diagramas Mermaid) y casos borde. |
| [`docs/ux-por-rol.md`](docs/ux-por-rol.md)     | Buenas prácticas de UX aplicadas a cada rol y dónde están en el código.                   |
| [`docs/arquitectura.md`](docs/arquitectura.md) | Capas, estructura de carpetas, modelo de datos, seguridad, decisiones (ADR) y roadmap.    |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)           | Convenciones de código, ramas, commits y checklist de PR.                                 |

---

## Cómo correrlo

Requisitos: **Node.js ≥ 20.9** (recomendado 24, ver `.nvmrc`).

```bash
npm install
npm run dev
```

Abrí <http://localhost:3000>:

- **Cliente**: ingresá un celular. En modo demo no se envían mensajes y el código aparece en pantalla. Con `11 5523-8841` entrás como Martín (tiene turnos); con cualquier otro número ves el alta de un cliente nuevo.
- **Equipo**: andá a `/equipo` (link al pie del login). En modo demo elegís **“Probar como”**
  (dueña o peluquero) y entrás con **cualquier email y contraseña**, incluso vacíos.
  - Si ponés los datos de una cuenta real de la demo, entrás con esa: superadmin (`ADMIN_EMAIL`),
    `lucas@filo.test` y `sofia@filo.test` (con `DEV_STAFF_PASSWORD`), o una creada desde **Equipo**
    (así probás el primer ingreso con la contraseña temporal).
  - Fuera del modo demo, el ingreso exige usuario y contraseña reales.
- **Guía de la demo**: cada pantalla abre sola, la primera vez, una guía paso a paso
  ([driver.js](https://driverjs.com)) que explica quién la usa, para qué sirve y qué cambia en la
  versión real. Se repite con el botón **Guía** del costado. Los textos están en
  `src/components/demo-guide/tours.ts`; fuera del modo demo no se carga.

Para ver la interacción entre roles, abrí cada uno en una ventana distinta (una en
modo incógnito): lo que reserva el cliente aparece en la agenda del equipo.

> `.env.development` tiene **solo valores de prueba** para desarrollo local. En
> producción hay que definir `SESSION_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`
> (ver `.env.example`); si faltan, el ingreso falla en vez de usar valores inseguros.

> **Demo:** los datos viven en memoria y se generan relativos a la fecha de hoy.
> Al reiniciar el servidor vuelven al estado inicial.

### Scripts

| Comando                       | Qué hace                                              |
| ----------------------------- | ----------------------------------------------------- |
| `npm run dev`                 | Servidor de desarrollo.                               |
| `npm run build` / `npm start` | Build y servidor de producción.                       |
| `npm run lint`                | ESLint.                                               |
| `npm run typecheck`           | Chequeo de tipos de TypeScript.                       |
| `npm test`                    | Tests unitarios (Vitest).                             |
| `npm run check`               | lint + typecheck + test (lo mismo que CI, sin build). |
| `npm run format`              | Formatea con Prettier.                                |

---

## Estructura

```
src/
├── domain/        Reglas de negocio puras (sin React ni DB) + tests
├── data/          Catálogo, seed, repositorio (interfaz + implementación en memoria)
├── server/        Capa de aplicación: sesión, casos de uso y Server Actions
├── components/    UI compartida (botones, tarjetas, diálogo, tab bar)
└── app/
    ├── (ingreso)/         Login: celular + código (/, /ingresar/*) y equipo (/equipo)
    ├── cliente/           App de clientes
    │   ├── reservar/      Flujo de reserva (servicio → profesional → horario → confirmar → listo)
    │   └── turnos/        Mis turnos
    └── panel/             Panel del equipo (agenda, nuevo = turno rápido, turnos/[id], actividad, equipo)
supabase/migrations/       Esquema Postgres con RLS para la fase 2
docs/                      User flows, UX por rol y arquitectura
```

---

## Roadmap

- [x] **Fase 1 · MVP navegable**: flujos completos de cliente y equipo, roles y permisos, reglas de negocio testeadas.
- [ ] **Fase 2 · Datos reales**: `SupabaseRepository`, Supabase Auth (cliente con OTP por WhatsApp/SMS, equipo con email), Realtime en la agenda.
- [ ] **Fase 3 · Pagos y avisos**: seña con Mercado Pago, recordatorios por WhatsApp, devolución automática de seña.
- [ ] **Fase 4 · Gestión**: ABM de servicios, profesionales y horarios; métricas de ocupación; lista de espera para huecos liberados.

---

## Licencia

Proyecto privado. Todos los derechos reservados.
