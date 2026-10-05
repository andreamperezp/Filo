# Filo · turnos para peluquería y barbería

**Filo** es una app web de turnos online para una peluquería/barbería de barrio
(Av. San Martín 2140, Villa del Parque). Tiene dos caras:

| Rol         | Quién                               | Para qué la usa                                                                                                                                |
| ----------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cliente** | Martín, que se corta cada 3 semanas | Reservar en menos de un minuto, ver su próximo turno, cambiarlo o cancelarlo sin llamar.                                                       |
| **Dueña**   | Romina, dueña y colorista           | Ver la agenda del día entre cliente y cliente, saber al instante quién reservó o canceló, bloquear horarios y contactar clientes por WhatsApp. |

> El problema que resuelve: hoy los turnos se piden por WhatsApp e Instagram y
> se anotan en un cuaderno. La dueña pierde tiempo respondiendo mensajes con las
> manos ocupadas, y los huecos por cancelaciones de último momento no se vuelven
> a llenar.

El diseño parte del prototipo hecho en Claude Design (tema "crema", tipografías
Instrument Serif + Manrope) y se implementó respetando sus pantallas y textos.

---

## Funcionalidades

### App de clientes (`/cliente`)

- **Inicio**: saludo, tarjeta con el próximo turno, botón "Reservar turno", lista de servicios con duración y precio, dirección y horarios.
- **Reserva en 4 pasos**: servicio → profesional (o "cualquiera disponible") → día y hora → revisión y pago.
  - Cada profesional muestra su _próximo horario libre_.
  - Los días muestran cuántos horarios quedan ("6 libres", "Completo", "Cerrado").
  - Los horarios ocupados se ven tachados (no se esconden) para entender la disponibilidad real.
  - Pago en el local o **seña online del 20 %**.
- **Mis turnos**: próximos (cambiar / cancelar con confirmación) y anteriores (con "Repetir" en un toque).
- **Política de cancelación**: gratis hasta 24 h antes; después, link directo a WhatsApp.

### Panel de la dueña (`/duena`)

- **Agenda**: selector de 14 días con cantidad de turnos por día y filtro por profesional.
  - Vista "Todos": lista cronológica de turnos.
  - Vista por profesional: grilla completa con huecos **Libre → Bloquear / Bloqueado → Liberar**.
  - Los turnos nuevos que todavía no vio se resaltan con "Nuevo".
- **Detalle del turno**: estado, datos del cliente, botones de WhatsApp (con mensaje precargado) y Llamar, seña pagada y saldo, "Marcar como atendido" y "Cancelar turno".
- **Actividad**: reservas, cambios y cancelaciones con badge de no leídos.
- **Avisos en vivo**: la agenda se refresca sola y aparece un toast cuando entra una reserva.

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

| Documento                                      | Contenido                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`docs/user-flows.md`](docs/user-flows.md)     | Flujos de usuario de cliente y dueña (diagramas Mermaid) y casos borde.                |
| [`docs/ux-por-rol.md`](docs/ux-por-rol.md)     | Buenas prácticas de UX aplicadas a cada rol y dónde están en el código.                |
| [`docs/arquitectura.md`](docs/arquitectura.md) | Capas, estructura de carpetas, modelo de datos, seguridad, decisiones (ADR) y roadmap. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)           | Convenciones de código, ramas, commits y checklist de PR.                              |

---

## Cómo correrlo

Requisitos: **Node.js ≥ 20.9** (recomendado 24, ver `.nvmrc`).

```bash
npm install
npm run dev
```

Abrí <http://localhost:3000> y elegí **Soy cliente** o **Soy la dueña**. Para
ver la interacción entre roles, abrí cada uno en una ventana distinta (una en
modo incógnito): lo que reserva el cliente aparece en la agenda de la dueña.

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
    ├── page.tsx           Entrada de la demo (elegir rol)
    ├── cliente/           App de clientes
    │   ├── reservar/      Flujo de reserva (servicio → profesional → horario → confirmar → listo)
    │   └── turnos/        Mis turnos
    └── duena/             Panel de la dueña (agenda, turnos/[id], actividad)
supabase/migrations/       Esquema Postgres con RLS para la fase 2
docs/                      User flows, UX por rol y arquitectura
```

---

## Roadmap

- [x] **Fase 1 · MVP navegable**: flujos completos de cliente y dueña, reglas de negocio testeadas.
- [ ] **Fase 2 · Datos reales**: `SupabaseRepository`, Supabase Auth (cliente con OTP por WhatsApp/SMS, dueña con email), Realtime en la agenda.
- [ ] **Fase 3 · Pagos y avisos**: seña con Mercado Pago, recordatorios por WhatsApp, devolución automática de seña.
- [ ] **Fase 4 · Gestión**: ABM de servicios, profesionales y horarios; métricas de ocupación; lista de espera para huecos liberados.

---

## Licencia

Proyecto privado. Todos los derechos reservados.
