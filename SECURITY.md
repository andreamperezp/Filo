# Seguridad

## Esto es una demo

Filo System se publica como **demo abierta**: los datos son de ejemplo, viven en
memoria y se borran solos cada vez que el servidor se reinicia. En la demo
cualquiera puede entrar eligiendo un rol (cliente, peluquero o dueño), sin
usuario ni contraseña, a propósito, para probarla.

No cargues datos reales de clientas en la demo pública.

## Qué protege el código

- **Las claves reales no están en el repositorio.** `.env.development` tiene solo
  valores de prueba para correrlo en tu compu. Producción usa otras claves,
  guardadas fuera del código.
- **Falla cerrada.** Sin `SESSION_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`
  configurados, el ingreso del equipo no funciona (no usa valores por defecto).
- **El ingreso libre existe solo en modo demo** (`DEMO_MODE=true` o desarrollo).
  Sin ese modo, el equipo entra con usuario y contraseña reales, con bloqueo
  tras varios intentos fallidos.
- Sesiones en cookies firmadas, contraseñas guardadas con `scrypt`, todos los
  formularios validados con límites de largo, permisos revisados en el servidor
  en cada acción, y cabeceras de seguridad en todas las páginas.

## Si querés usarlo con un local real

1. Generá tus propias claves (ver `.env.example`) y no actives `DEMO_MODE`.
2. Conectá una base de datos real (ver "Roadmap" en el README): la versión en
   memoria es solo para la demo.
3. Configurá el envío real del código por WhatsApp o SMS.

## Reportar un problema

Si encontrás una falla de seguridad, no la publiques en un issue: escribime por
privado desde mi perfil de GitHub ([@andreamperezp](https://github.com/andreamperezp)).
