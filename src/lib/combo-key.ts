/**
 * Clave de una combinación de turno rápido (servicio + duración + profesional).
 * La comparten el servidor (que calcula la disponibilidad) y el formulario.
 */
export const comboKey = (serviceId: string, durationMin: number, professional: string) =>
  `${serviceId}@${durationMin}|${professional}`;
