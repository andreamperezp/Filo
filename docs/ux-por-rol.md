# Buenas prácticas de UX por rol

Clientas, peluqueros y superadmin usan la app en contextos muy distintos, así que cada
interfaz está pensada para su situación. Este documento explica qué
práctica se aplicó, por qué y dónde está en el código.

---

## Responsive: un link, tres pantallas

La app se comparte como URL y se abre en celular, tablet (mostrador) o
computadora. Principios aplicados:

- **Mobile-first**: se diseña primero para 375 px y se agrega espacio, no al revés.
- **Navegación según el dispositivo**: abajo en celular (pulgar), arriba en tablet/escritorio (convención web). Mismas pestañas y nombres en todos los tamaños.
- **Ancho de lectura**: el contenido se limita (≈ 1024–1280 px) para no tener líneas ni grillas gigantes en monitores anchos.
- **Más contexto en pantallas grandes**: 14 días visibles, columnas por profesional, resumen lateral fijo al elegir horario.
- **Flujos enfocados en celular**: en reservar, detalle y turno rápido se ocultan cabecera y pestañas para priorizar la tarea.
- **Objetivos táctiles de 44 px o más en todos los tamaños**: una tablet también se usa con el dedo.
- **Sin scroll horizontal accidental**: las tiras que deslizan en celular pasan a grilla en tablet.

→ `components/tab-bar.tsx` (`AppShell`), `components/ui.tsx` (`Screen`, `WithSidebar`, `BottomAction`).

---

## Principios compartidos

| Práctica                           | Aplicación                                                                                                                                                                                                                                                               | Dónde                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Mobile-first y zona del pulgar** | Columna única, acción principal fija abajo, navegación inferior con 2 destinos. Objetivos táctiles de **≥ 44 px** (WCAG 2.5.8 / Apple HIG).                                                                                                                              | `components/ui.tsx` (`BottomAction`, `min-h-11/12`), `components/tab-bar.tsx` |
| **Lenguaje del usuario**           | Español rioplatense con voseo ("Elegí", "¿Con quién?"), sin jerga ("turno", no "booking"). Precios en `$ 12.000`, fechas como "Mañana" o "Jue 8 oct".                                                                                                                    | `domain/time.ts`, `domain/money.ts`                                           |
| **Accesibilidad (WCAG 2.2 AA)**    | HTML semántico (`nav`, `main`, `dl`, `time`), `aria-current` en día/pestaña/opción elegida, `role="progressbar"` en los pasos, `aria-live` para cambios, texto para lectores de pantalla en íconos y horarios ocupados, foco visible, diálogo nativo con trampa de foco. | En todas las pantallas. Ver `globals.css` (`:focus-visible`)                  |
| **Tema claro/oscuro**              | Respeta `prefers-color-scheme` por defecto y suma un botón en la cabecera para elegir claro u oscuro (se recuerda; el servidor pinta el tema elegido desde el primer render, sin parpadeo). El botón anuncia la acción ("Cambiar a modo claro"). Contraste AA en ambos.  | `app/globals.css`, `components/theme-toggle.tsx`, `app/layout.tsx`            |
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

## Equipo (dueña y peluqueros) · "entre cliente y cliente, con las manos ocupadas"

> Todo lo de esta sección aplica a ambos roles del equipo; más abajo se detalla qué cambia para cada uno.

**Contexto:** usa la app todos los días, en mostrador, en el celular, en
ratos de 10 segundos entre un corte y otro. Necesita **leer rápido**
y actuar sobre excepciones (nuevas reservas, cancelaciones, huecos).
**Métrica clave:** tiempo para responder "¿qué sigue?" y llamadas/mensajes evitados.

### 1. Lo importante primero: la agenda de hoy

La pantalla inicial es **hoy**, en orden cronológico, con hora de inicio y
fin, cliente, servicio, profesional y estado de pago. No hay dashboards
intermedios. → `app/panel/page.tsx`.

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
  → `app/panel/live-updates.tsx`, `layout.tsx`, `actividad/page.tsx`.

### 5. Acción directa sobre el cliente

En el detalle del turno, **WhatsApp** (con mensaje precargado con nombre, día y
hora) y **Llamar** están arriba, a un toque: es el canal real del negocio.
→ `app/panel/turnos/[id]/page.tsx`.

### 6. Acciones seguras

- "Marcar como atendido" solo aparece cuando el turno ya empezó.
- "Cancelar turno" es secundario visualmente (texto rojo, sin relleno) y pide confirmación explicando que **se avisa al cliente** y si **se devuelve la seña**.
- Bloquear un horario que tiene turno se rechaza en el servidor.

### 7. Disponibilidad en un paso

"No disponible" para el día, la mañana, la tarde o un rango, para una persona o
todo el equipo, en vez de bloquear horario por horario. Se protege lo existente:
los horarios con turno no se tocan y el mensaje dice cuántos son, para decidir si
avisar a esas clientas. → `app/panel/availability-panel.tsx`, `domain/availability.ts` (`planBlockRange`).

### 8. Turno rápido: velocidad en el mostrador

- Siempre a mano: botón fijo en la cabecera y "Agendar" en cada hueco libre.
- **Valores por defecto inteligentes**: primer horario libre elegido; si se llega desde un hueco, ya trae profesional, día y hora.
- Casi todo con toques (radios con forma de tarjeta, accesibles por teclado); el único texto obligatorio es el nombre.
- Si una combinación no tiene lugar, se ofrece el próximo día disponible en un toque.
- El celular es opcional, pero si se carga el turno queda en la cuenta de la clienta.
  → `app/panel/nuevo/*`.

### 9. Densidad adecuada

En pantallas anchas el panel usa más ancho (`max-w-2xl`), pensado para una
tablet en el mostrador, sin perder la usabilidad en celular.

---

## Peluquero/a · "lo mío, sin ruido"

**Contexto:** usa su celular personal o la tablet del local; le importa _su_
día, no el de los demás. **Métrica clave:** turnos gestionados sin pedirle nada a la dueña.

- **Solo lo suyo**: la agenda abre directo en su grilla ("Buen día, Lucas · tu agenda"), sin filtros de otros profesionales ni pestaña "Equipo". Menos opciones, menos errores (_ley de Hick_).
- **Autonomía**: marca sus francos y horarios no disponibles, y agenda turnos rápidos para sí, sin depender de la dueña.
- **Actividad propia**: ve solo reservas y cancelaciones de sus turnos, con su propio "sin leer" (que la dueña lea algo no lo marca como leído para él).
- **Primer ingreso guiado**: entra con la contraseña temporal y la app lo lleva a elegir la suya antes de nada, con reglas claras ("al menos 10 caracteres; mejor una frase") y botón "Mostrar".
- **Seguridad sin fricción**: si intenta abrir un turno ajeno por URL ve "no encontrado" (no se filtran datos de clientas de otros).

→ `server/session.ts` (`staffScope`), `server/bookings.ts`, `app/(ingreso)/equipo/clave`.

## Superadmin · "el local completo y el equipo"

- **Vista central**: la agenda de todo el equipo en columnas, filtros por profesional y "Marcar disponibilidad" para todo el equipo de una vez (feriados, cierre por evento).
- **Alta en un paso**: nombre, email, rol, especialidad y servicios en un solo formulario. Al crearla, la persona aparece en la reserva de clientes con su color.
- **Credenciales una sola vez**: la contraseña temporal se muestra con botón "Copiar" y el aviso de que no se vuelve a ver (no se guarda en texto).
- **Bajas reversibles y seguras**: "Desactivar" pide confirmación, explica qué pasa (no entra, no recibe turnos nuevos, sus turnos siguen) y cuántos turnos próximos tiene. "Reactivar" en un toque. No puede desactivarse a sí misma.
- **Estados visibles**: insignias "Superadmin", "Desactivada", "Falta su primer ingreso".

→ `app/panel/equipo/*`, `server/team.ts`.

## Turno rápido: calendario y "Otro"

- **Calendario mensual** en vez de una tira de días: se ve la semana completa y hasta 45 días, con **cuántos horarios libres** tiene cada día y un punto de color (mucho / poco lugar). Días cerrados, completos o fuera del período, deshabilitados.
- **Accesible**: cada día anuncia "Jueves 8 de octubre: 12 horarios libres"; se navega con flechas (días y semanas) y un solo día recibe el foco a la vez.
- **Los horarios se piden al elegir el día** (y quedan en memoria): la página carga rápido aunque abarque 45 días.
- **"Otro"** para lo que no está en la lista: chips de duración (30 min a 3 h) y motivo opcional, que después se ve en la agenda y en el detalle ("Otro · Prueba de peinado"). Precio "a convenir".

→ `components/day-calendar.tsx`, `app/panel/nuevo/*`.

---

## Cierre de turno y Caja · "cuánto hice hoy y cuánto me lleva cada clienta"

- **Cero tipeo en el caso típico**: el monto viene en el precio de lista (menos la seña ya paga) y la duración, del reloj o de lo agendado. Revisar y tocar "Finalizar · $X".
- **El botón dice lo que va a pasar** ("Finalizar · $ 14.500") y el resumen se actualiza mientras se edita.
- **Montos como se escriben en Argentina**: acepta "14500", "14.500" o "$ 14.500" y lo muestra con separador de miles.
- **"Empezar turno" es opcional**: si no se usa, nada se bloquea; solo mejora la precisión del tiempo.
- **Estados en la agenda** (En curso / Por cobrar / Cobrado $X) y un aviso en Caja de los turnos sin cerrar: la caja nunca queda incompleta sin que nadie lo note.
- **Caja con jerarquía**: primero los números que importan (ingresos y valor por hora), después el detalle. Un solo color en el gráfico (una sola serie), tooltip accesible por teclado y tabla equivalente para lectores de pantalla.
- **Privacidad entre colegas**: cada peluquero ve solo su caja; la comparación entre profesionales es solo del superadmin.

→ `app/panel/turnos/[id]/cerrar/*`, `app/panel/caja/*`, `domain/earnings.ts`.

---

## Cómo validar (próximos pasos)

| Qué medir                 | Cómo                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Tiempo a turno confirmado | Evento de analítica en cada paso del flujo (embudo).                                                                |
| Abandono por paso         | Mismo embudo: dónde se van.                                                                                         |
| Ausencias                 | % de turnos sin "atendido" antes y después de los recordatorios.                                                    |
| Huecos recuperados        | Turnos reservados en horarios liberados por cancelaciones.                                                          |
| Usabilidad                | 5 tests de guerrilla con clientes reales en el local + una sesión observando a la dueña y a un peluquero un sábado. |
| Accesibilidad             | axe DevTools + prueba con VoiceOver/TalkBack en cada release.                                                       |
