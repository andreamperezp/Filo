# Cómo contribuir

## Flujo de trabajo

1. Crear una rama desde `main`: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
2. Commits chicos con [Conventional Commits](https://www.conventionalcommits.org/es/):
   `feat(cliente): agregar lista de espera`, `fix(agenda): respetar cierre del sábado`.
3. Antes de abrir el PR: `npm run check` y `npm run build`.
4. Abrir PR contra `main` con la plantilla completa. CI tiene que pasar.
5. Merge con _squash_. `main` siempre deployable (Vercel despliega solo).

## Convenciones de código

- **TypeScript estricto**, sin `any`. Tipos de dominio en `src/domain/types.ts`.
- **Las reglas de negocio van en `src/domain`** como funciones puras con test. Si una pantalla necesita un `if` de negocio, probablemente es una función de dominio.
- **Server Components por defecto.** `"use client"` solo para interacción (estado local, efectos, eventos), en el componente más chico posible.
- **Mutaciones solo por Server Actions** en `src/server/actions.ts`: sesión + rol + Zod + caso de uso. Nunca confiar en datos del formulario.
- **Nada de colores sueltos**: usar los tokens (`bg-surface`, `text-muted`, `bg-primary`…). Si falta uno, agregarlo en `globals.css` para ambos temas.
- **Accesibilidad no es opcional**: elementos semánticos, `aria-*` cuando corresponde, objetivos táctiles ≥ 44 px, foco visible, textos alternativos para íconos con significado.
- **Textos de UI** en español rioplatense con voseo, cortos y orientados a la acción ("Elegí otro horario", no "Error 409").
- Nombres de código en inglés; textos visibles y comentarios en español.
- Comentarios para explicar **por qué**, no qué.

## Tests

- Toda regla nueva en `src/domain` lleva su test (`*.test.ts` al lado del archivo).
- Usar fechas fijas en los tests (nunca `new Date()` sin argumentos).
- `npm run test:watch` durante el desarrollo.

## Checklist de PR

- [ ] `npm run check` pasa (lint, typecheck, tests).
- [ ] Probado en un viewport de celular (375 px) y en modo oscuro.
- [ ] Navegable con teclado; foco visible.
- [ ] Estados vacíos, de carga y de error contemplados.
- [ ] Si cambia un flujo, actualizado `docs/user-flows.md`.
- [ ] Sin secretos ni datos personales en el código o los logs.
