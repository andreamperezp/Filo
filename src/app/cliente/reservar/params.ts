import { z } from "zod";
import { isIsoDate } from "@/domain/time";
import type { ProfessionalChoice } from "@/domain/types";

/**
 * El estado del flujo de reserva vive en la URL (`?servicio=…&profesional=…`).
 * Ventajas: el botón "atrás" del navegador funciona, se puede compartir o
 * recargar sin perder nada y las pantallas son Server Components sin estado.
 */
const schema = z.object({
  // Forma básica acá; que el servicio/profesional exista lo valida cada página contra el catálogo vigente.
  servicio: z.string().max(40).optional().catch(undefined),
  profesional: z.string().max(40).optional().catch(undefined),
  fecha: z.string().refine(isIsoDate).optional().catch(undefined),
  hora: z.coerce.number().int().min(0).max(1439).optional().catch(undefined),
  pago: z.enum(["in_store", "deposit"]).optional().catch(undefined),
  /** Id del turno que se está reprogramando. */
  turno: z.string().max(64).optional().catch(undefined),
});

export type FlowParams = {
  servicio?: string;
  profesional?: ProfessionalChoice;
  fecha?: string;
  hora?: number;
  pago?: "in_store" | "deposit";
  turno?: string;
};

export async function readFlowParams(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  return schema.parse(flat) as FlowParams;
}

export function flowHref(path: string, params: FlowParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) qs.set(k, String(v));
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}
