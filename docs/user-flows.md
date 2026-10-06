# User flows

Flujos de cada rol tal como están implementados. Los nombres de pantalla
coinciden con las rutas de `src/app`.

## Mapa de pantallas

```mermaid
flowchart LR
  Entrada["/ · Ingresar con celular"]
  Equipo["/equipo · Ingreso de la dueña"]
  subgraph Cliente["App de clientes"]
    CI["/cliente · Inicio"]
    R1["/reservar · Servicio"]
    R2["/reservar/profesional"]
    R3["/reservar/horario"]
    R4["/reservar/confirmar"]
    R5["/reservar/listo"]
    MT["/cliente/turnos · Mis turnos"]
  end
  subgraph Duena["Panel de la dueña"]
    AG["/duena · Agenda"]
    DT["/duena/turnos/[id] · Detalle"]
    AC["/duena/actividad"]
  end
  Entrada --> CI
  Equipo --> AG
  CI --> R1 --> R2 --> R3 --> R4 --> R5
  CI -- "atajo: tocar un servicio" --> R2
  R5 --> MT & CI
  CI <--> MT
  MT -- "Cambiar" --> R3
  MT -- "Repetir" --> R3
  AG --> DT
  AG <--> AC
```

---

## Ingreso

### Cliente: celular + código (sin contraseña)

**Por qué así:** el cliente entra pocas veces al mes; una contraseña más es
fricción y se olvida. El celular ya es su identidad para el local (WhatsApp).

```mermaid
flowchart TD
  A([Abre Filo]) --> B{¿Sesión activa?<br/>dura 30 días}
  B -- Sí --> Z([Inicio del cliente])
  B -- No --> C[Ingresa su celular<br/>acepta 11 5523-8841, 011 15…, +54 9…]
  C --> D{¿Número válido?}
  D -- No --> E[Error junto al campo con un ejemplo] --> C
  D -- Sí --> F[Código de 6 números por WhatsApp<br/>vence en 5 min]
  F --> G[Ingresa el código<br/>se envía solo al completar 6 dígitos]
  G --> H{¿Correcto?}
  H -- No --> I[Error · conserva lo escrito<br/>5 intentos máx.] --> G
  H -- Venció --> J[No me llegó, enviar otro<br/>disponible a los 30 s] --> G
  H -- Sí --> K{¿Cliente conocido?}
  K -- Sí --> Z
  K -- No --> L[Única pregunta: nombre y apellido] --> Z
  F -. Usar otro número .-> C
```

### Dueña: email + contraseña

```mermaid
flowchart TD
  A([/equipo]) --> B[Email + contraseña<br/>botón Mostrar contraseña]
  B --> C{¿Correctos?}
  C -- No --> D[Email o contraseña incorrectos<br/>mismo mensaje para ambos] --> B
  C -- 5 fallos --> E[Bloqueado 15 min]
  C -- Sí --> F([Agenda de hoy · sesión de 12 h])
```

---

## Cliente

### 1. Reservar un turno (camino feliz)

**Objetivo:** turno confirmado en menos de 60 segundos y 4 decisiones.

```mermaid
flowchart TD
  A([Abre Filo]) --> B[Inicio: ve su próximo turno y los servicios]
  B -->|Reservar turno| C[Paso 1 · Elige servicio]
  B -->|Toca un servicio| D
  C --> D[Paso 2 · Elige profesional<br/>o 'Cualquiera disponible'<br/>cada opción muestra su próximo libre]
  D --> E[Paso 3 · Elige día<br/>cada día muestra 'N libres' / Completo / Cerrado]
  E --> F{¿Hay horarios?}
  F -- No --> G[Mensaje: 'No quedan horarios este día. Probá otro.'] --> E
  F -- Sí --> H[Elige hora<br/>ocupados aparecen tachados]
  H --> I[Continuar]
  I --> J[Paso 4 · Revisa resumen<br/>servicio, con quién, día, hora, precio]
  J --> K{¿Cómo paga?}
  K -- En el local --> L[Confirmar turno]
  K -- Seña 20% --> M[Pagar seña y confirmar]
  L & M --> N{El servidor revalida el horario}
  N -- Sigue libre --> O([¡Listo, te esperamos!<br/>recordatorio el día anterior])
  N -- Se ocupó --> P[Error: 'Ese horario se acaba de ocupar. Elegí otro'] --> E
```

### 2. Cambiar un turno

```mermaid
flowchart TD
  A[Mis turnos] --> B{¿Faltan ≥ 24 h?}
  B -- Sí --> C[Cambiar] --> D[Elegir día y hora<br/>mismo servicio y profesional<br/>su propio horario no cuenta como ocupado]
  D --> E[Revisar · Confirmar cambio] --> F([Turno cambiado])
  B -- No --> G[Texto: 'Faltan menos de 24 h' + link a WhatsApp]
```

### 3. Cancelar un turno

```mermaid
flowchart TD
  A[Mis turnos] --> B{¿Faltan ≥ 24 h?}
  B -- No --> W[Link a WhatsApp del local]
  B -- Sí --> C[Cancelar] --> D[Hoja de confirmación<br/>'¿Cancelar el turno?' + consecuencias<br/>'El horario se libera para otra persona'<br/>'Te devolvemos la seña' si pagó]
  D -- No, mantener --> A
  D -- Sí, cancelar --> E[Turno pasa a 'Anteriores · Cancelado'<br/>la dueña recibe el evento en Actividad]
```

### 4. Repetir un servicio

Desde **Mis turnos → Anteriores → Repetir**, el cliente salta directo al paso 3
con el mismo servicio y profesional: reservar lo de siempre lleva 2 toques.

---

## Dueña

### 1. Revisar el día

```mermaid
flowchart TD
  A([Abre /duena entre cliente y cliente]) --> B[Agenda de hoy<br/>'Buen día, Romina' + fecha larga]
  B --> C{¿Qué necesita?}
  C -- Otro día --> D[Tira de 14 días con cantidad de turnos] --> B
  C -- Un profesional --> E[Chip: Romina / Lucas / Sofía<br/>vista de grilla con huecos libres]
  C -- Un turno --> F[Detalle del turno]
  E -->|Libre → Bloquear| G[Horario bloqueado<br/>deja de ofrecerse a clientes]
  G -->|Liberar| E
```

### 2. Gestionar un turno

```mermaid
flowchart TD
  A[Detalle del turno] --> B[WhatsApp con mensaje precargado / Llamar]
  A --> C{Estado}
  C -- Confirmado y ya empezó --> D[Marcar como atendido]
  C -- Confirmado --> E[Cancelar turno] --> F[Confirmación<br/>'Le avisamos por WhatsApp y el horario queda libre'<br/>+ devolución de seña si corresponde]
  F --> G([Vuelve a la agenda · evento en Actividad])
```

### 3. Marcar disponibilidad (franco, trámite, almuerzo)

```mermaid
flowchart TD
  A[Agenda · día elegido] --> B[Marcar disponibilidad]
  B --> C[Profesional o todo el equipo]
  C --> D[Atajo: Todo el día / Mañana / Tarde<br/>o rango Desde–Hasta]
  D --> E{¿No disponible o disponible?}
  E -- No disponible --> F[Se bloquean los horarios libres del rango<br/>los que tienen turno no se tocan y se informan]
  E -- Disponible --> G[Se liberan los bloqueados del rango]
  F & G --> H([Mensaje: 'Listo: N horarios…'<br/>las clientas ya no ven / vuelven a ver esos horarios])
```

También se puede bloquear o liberar **un horario suelto** desde la vista por profesional.

### 4. Turno rápido (clienta en el local o por teléfono)

```mermaid
flowchart TD
  A{¿Desde dónde?} -- Botón 'Turno rápido' --> B[Formulario con el primer horario libre ya elegido]
  A -- Hueco 'Libre' → Agendar --> C[Formulario con profesional, día y hora de ese hueco]
  B & C --> D[Nombre · celular opcional · servicio · con quién · día · hora<br/>todo con toques, sin teclado salvo el nombre]
  D --> E{¿Cambió algo y el horario ya no sirve?}
  E -- Sí --> F[Se elige solo el primer libre<br/>o se sugiere el próximo día con lugar] --> D
  E -- No --> G[Agendar turno]
  G --> H{El servidor revalida}
  H -- Ocupado --> I[Error claro, los datos se conservan] --> D
  H -- OK --> J([Detalle del turno · 'Turno agendado'<br/>si dejó celular: aparece en su cuenta])
```

### 5. Enterarse de novedades

```mermaid
sequenceDiagram
  actor C as Cliente
  participant S as Servidor
  actor D as Dueña (agenda abierta)
  C->>S: Confirma turno (Server Action)
  S->>S: Revalida disponibilidad + guarda + registra actividad
  loop cada 15 s y al volver a la pestaña
    D->>S: refresh de la agenda
  end
  S-->>D: Agenda actualizada + badge de Actividad
  S-->>D: Toast "Martín Díaz reservó Corte · Mañana · 16:00 · Sofía"
  D->>D: Toca el toast → Actividad (se marca leído)
```

---

## Casos borde contemplados

| Caso                                      | Comportamiento                                                                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dos clientes eligen el mismo horario      | La confirmación revalida dentro de una transacción; el segundo recibe un error claro y vuelve a elegir. En Postgres lo garantiza una restricción `EXCLUDE`. |
| Domingo                                   | Día deshabilitado: "Cerrado".                                                                                                                               |
| Servicio largo al final del día           | Solo se ofrecen horarios que terminan antes del cierre (sábado 14 h).                                                                                       |
| Horarios de hoy que ya pasaron            | No se ofrecen.                                                                                                                                              |
| "Cualquiera disponible"                   | Se asigna el primer profesional habilitado y libre; el resumen muestra a quién.                                                                             |
| Reprogramar                               | El turno propio no bloquea su mismo horario.                                                                                                                |
| Cancelar/cambiar con < 24 h               | No se permite online; se ofrece WhatsApp. Validado también en el servidor.                                                                                  |
| URL manipulada (servicio/fecha inválidos) | Los parámetros se validan con Zod y se redirige al paso correcto.                                                                                           |
| Bloquear un horario con turno             | El servidor lo rechaza.                                                                                                                                     |
