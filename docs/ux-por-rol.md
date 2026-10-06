# Buenas prácticas de UX por rol

Cliente y dueña usan la app en contextos muy distintos, así que cada
interfaz está pensada para su situación. Este documento explica qué
práctica se aplicó, por qué y dónde está en el código.

---

## Principios compartidos

| Práctica                           | Aplicación                                                                                                                                                                                                                                                               | Dónde                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Mobile-first y zona del pulgar** | Columna única, acción principal fija abajo, navegación inferior con 2 destinos. Objetivos táctiles de **≥ 44 px** (WCAG 2.5.8 / Apple HIG).                                                                                                                              | `components/ui.tsx` (`BottomAction`, `min-h-11/12`), `components/tab-bar.tsx` |
| **Lenguaje del usuario**           | Español rioplatense con voseo ("Elegí", "¿Con quién?"), sin jerga ("turno", no "booking"). Precios en `$ 12.000`, fechas como "Mañana" o "Jue 8 oct".                                                                                                                    | `domain/time.ts`, `domain/money.ts`                                           |
| **Accesibilidad (WCAG 2.2 AA)**    | HTML semántico (`nav`, `main`, `dl`, `time`), `aria-current` en día/pestaña/opción elegida, `role="progressbar"` en los pasos, `aria-live` para cambios, texto para lectores de pantalla en íconos y horarios ocupados, foco visible, diálogo nativo con trampa de foco. | En todas las pantallas. Ver `globals.css` (`:focus-visible`)                  |
| **Tema claro/oscuro**              | Respeta `prefers-color-scheme` con tokens semánticos y contraste AA en ambos.                                                                                                                                                                                            | `app/globals.css`                                                             |
| **Movimiento reducido**            | Animaciones desactivadas con `prefers-reduced-motion`.                                                                                                                                                                                                                   | `app/globals.css`                                                             |
| **Feedback inmediato**             | Botones con estado "Confirmando…" y deshabilitados mientras envían, para evitar dobles reservas.                                                                                                                                                                         | `components/forms.tsx` (`SubmitButton`)                                       |
| **Mejora progresiva**              | Formularios con Server Actions y selección por links: el flujo funciona aunque el JS no haya cargado (conexiones 3G).                                                                                                                                                    | Flujo `app/cliente/reservar/*`                                                |
| **Prevención de errores**          | Validación en servidor con mensajes que dicen qué hacer ("Elegí otro"), no códigos.                                                                                                                                                                                      | `server/actions.ts`, `server/bookings.ts`                                     |

---

## Ingreso (login)

| Práctica                   | Cliente                                                                                                                                                   | Dueña                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Método adecuado al uso** | Celular + código: sin contraseñas que recordar, un dato que ya conoce.                                                                                    | Email + contraseña: cuenta con datos personales de clientes, uso diario.        |
| **Pedir lo mínimo**        | Un campo por pantalla. El nombre se pide solo la primera vez.                                                                                             | Dos campos.                                                                     |
| **Teclado correcto**       | `type="tel"` + `inputMode` numérico; el código usa `autocomplete="one-time-code"` para que el celular lo sugiera desde el SMS.                            | `type="email"`, sin autocorrector ni mayúscula inicial.                         |
| **Tolerancia al formato**  | Acepta 11 5523-8841, 011 15…, +54 9…: se normaliza en el servidor (`domain/phone.ts`).                                                                    | Ignora mayúsculas y espacios en el email.                                       |
| **Menos pasos**            | El código se envía solo al completar los 6 dígitos (o al pegarlo).                                                                                        | Botón "Mostrar contraseña" para evitar errores de tipeo en el celular.          |
| **Errores útiles**         | Junto al campo, con ejemplo; lo escrito no se borra.                                                                                                      | Mensaje único "Email o contraseña incorrectos" (no revela si la cuenta existe). |
| **Reenvío transparente**   | Cuenta regresiva visible ("Podés pedir otro código en 28 s") y "Usar otro número".                                                                        | Bloqueo explicado ("Probá en 15 min").                                          |
| **Sesión**                 | 30 días: no vuelve a loguearse cada vez.                                                                                                                  | 12 h: el dispositivo del local es compartido.                                   |
| **Accesibilidad**          | Labels visibles (nunca solo placeholder), errores con `role="alert"` y `aria-describedby`, foco visible en Merino sobre fondo Venice, objetivos de 56 px. | Igual.                                                                          |
| **Privacidad**             | El teléfono viaja en cookie firmada, nunca en la URL.                                                                                                     | —                                                                               |

Diseño: afiche de tres bandas (Merino → Rock Blue → Venice Blue) tomado de la
referencia de marca. Todo el texto chico cumple contraste AA sobre su banda.
→ `app/(ingreso)/*`, `server/auth-actions.ts`, `server/session.ts`.

---

## Cliente · "quiero mi turno ya, desde el celular"

**Contexto:** usa la app pocas veces al mes, con una mano, muchas veces
en el colectivo o en la calle. No quiere crear una cuenta ni llamar.
**Métrica clave:** tiempo hasta un turno confirmado (objetivo < 60 s).

### 1. Divulgación progresiva: una decisión por pantalla

El flujo se divide en **4 pasos** (servicio → profesional → horario → pago),
con una barra de progreso "Paso N de 4". Así cada pantalla pide poco esfuerzo
y la persona sabe cuánto falta (_ley de Hick_, _efecto de gradiente de meta_).
→ `app/cliente/reservar/*`, `TopBar` con `progress`.

### 2. Atajos para el usuario frecuente

- Tocar un servicio en Inicio **saltea el paso 1**.
- **"Repetir"** en turnos anteriores lleva directo al horario con el mismo servicio y profesional.
- La opción **"Cualquiera disponible"** va primera para quien no tiene preferencia.
- Al elegir profesional se preselecciona **el primer día con lugar**.
  → `app/cliente/page.tsx`, `app/cliente/turnos/page.tsx`, `profesional/page.tsx`.

### 3. Información en el momento de decidir

- Cada profesional muestra **"Próximo libre: Mañana 9:00"**: se decide por disponibilidad sin probar uno por uno.
- Cada día muestra **"6 libres" / "Completo" / "Cerrado"** antes de tocarlo.
- Los horarios ocupados se ven **tachados** (no se ocultan): la grilla es predecible y se entiende por qué no está "las 10".
- Se agrupan en **Mañana / Tarde** para escanear rápido.
  → `profesional/page.tsx`, `horario/page.tsx`.

### 4. Reconocer antes que recordar

La pantalla de confirmación repite **todo** (servicio, con quién, día largo,
hora de inicio y fin, precio) y el resumen del turno está fijo abajo durante
la elección de horario ("Tu turno: Mañana · 15:00").
→ `confirmar/page.tsx`, `BottomAction` en `horario/page.tsx`.

### 5. Transparencia de costos y políticas

- Precio visible desde Inicio. Sin sorpresas al final.
- En el pago se aclara **qué se paga ahora y qué en el local**.
- La política **"cancelás gratis hasta 24 h antes"** se muestra antes de confirmar, no después.
  → `confirmar/page.tsx`, `domain/policies.ts`.

### 6. Control y libertad

- **Cambiar** y **Cancelar** a un toque en "Mis turnos", sin llamar.
- Volver atrás funciona siempre (botón y gesto del navegador), porque el estado vive en la URL.
- Cancelar es **destructivo**: se confirma en una hoja inferior que explica la consecuencia ("el horario se libera para otra persona", "te devolvemos la seña"), con "No, mantener" como opción con foco por defecto.
  → `components/forms.tsx` (`ConfirmDialog`), `reservar/params.ts`.

### 7. Cierre con confianza

La pantalla de éxito confirma con lenguaje humano ("¡Listo, te esperamos!"),
recuerda dirección y avisa del **recordatorio del día anterior** para reducir ausencias.
→ `reservar/listo/page.tsx`.

### 8. Estados vacíos útiles

"No tenés turnos reservados" incluye el botón para reservar; "No quedan
horarios este día. Probá otro." guía al siguiente paso.

---

## Dueña · "entre cliente y cliente, con las manos ocupadas"

**Contexto:** usa la app todos los días, en mostrador, en el celular, en
ratos de 10 segundos entre un corte y otro. Necesita **leer rápido**
y actuar sobre excepciones (nuevas reservas, cancelaciones, huecos).
**Métrica clave:** tiempo para responder "¿qué sigue?" y llamadas/mensajes evitados.

### 1. Lo importante primero: la agenda de hoy

La pantalla inicial es **hoy**, en orden cronológico, con hora de inicio y
fin, cliente, servicio, profesional y estado de pago. No hay dashboards
intermedios. → `app/duena/page.tsx`.

### 2. Escaneo visual rápido

- **Color por profesional** (punto de color) consistente en chips y turnos.
- **Badges de pago**: "Seña $ 3.200" (verde) vs "Paga en local" (ámbar) → sabe a quién cobrar todo.
- Turnos **atendidos atenuados** y turnos **nuevos resaltados** con borde y "Nuevo".
- La tira de días muestra la **cantidad de turnos** de cada día: ve la semana de un vistazo.
  → `ProDot`, `Badge`, `getOwnerDay`.

### 3. Dos vistas para dos preguntas

- **"Todos"** responde _¿qué pasa hoy en el local?_
- **Por profesional** responde _¿dónde tengo huecos?_: muestra la grilla completa con "Libre" y permite **bloquear/liberar** en un toque (almuerzo, trámite, día corto).

### 4. Conciencia de lo que pasa (_awareness_)

- **Actividad** reúne reservas, cambios y cancelaciones con ícono por tipo y tiempo relativo ("hace 12 minutos").
- **Badge** con cantidad sin leer en la pestaña.
- **Toast en vivo** cuando entra una reserva, sin recargar; tocarlo lleva a Actividad.
- La agenda se refresca sola cada 15 s y al volver a la pestaña.
  → `app/duena/live-updates.tsx`, `owner-tabs.tsx`, `actividad/page.tsx`.

### 5. Acción directa sobre el cliente

En el detalle del turno, **WhatsApp** (con mensaje precargado con nombre, día y
hora) y **Llamar** están arriba, a un toque: es el canal real del negocio.
→ `app/duena/turnos/[id]/page.tsx`.

### 6. Acciones seguras

- "Marcar como atendido" solo aparece cuando el turno ya empezó.
- "Cancelar turno" es secundario visualmente (texto rojo, sin relleno) y pide confirmación explicando que **se avisa al cliente** y si **se devuelve la seña**.
- Bloquear un horario que tiene turno se rechaza en el servidor.

### 7. Densidad adecuada

En pantallas anchas el panel usa más ancho (`max-w-2xl`), pensado para una
tablet en el mostrador, sin perder la usabilidad en celular.

---

## Cómo validar (próximos pasos)

| Qué medir                 | Cómo                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Tiempo a turno confirmado | Evento de analítica en cada paso del flujo (embudo).                                               |
| Abandono por paso         | Mismo embudo: dónde se van.                                                                        |
| Ausencias                 | % de turnos sin "atendido" antes y después de los recordatorios.                                   |
| Huecos recuperados        | Turnos reservados en horarios liberados por cancelaciones.                                         |
| Usabilidad                | 5 tests de guerrilla con clientes reales en el local + una sesión observando a la dueña un sábado. |
| Accesibilidad             | axe DevTools + prueba con VoiceOver/TalkBack en cada release.                                      |
