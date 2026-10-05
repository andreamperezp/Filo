import { z } from "zod";
import { isIsoDate } from "@/domain/time";
import { ANY_PROFESSIONAL, type ProfessionalChoice } from "@/domain/types";
import { PROFESSIONAL_BY_ID, SERVICE_BY_ID } from "@/data/catalog";

/**
 * El estado del flujo de reserva vive en la URL (`?servicio=…&profesional=…`).
 * Ventajas: el botón "atrás" del navegador funciona, se puede compartir o
 * recargar sin perder nada y las pantallas son Server Components sin estado.
 */
const schema = z.object({
  servicio: z
    .string()
    .refine((v) => SERVICE_BY_ID.has(v))
    .optional()
    .catch(undefined),
  profesional: z
    .string()
    .refine((v) => v === ANY_PROFESSIONAL || PROFESSIONAL_BY_ID.has(v))
    .optional()
    .catch(undefined),
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
