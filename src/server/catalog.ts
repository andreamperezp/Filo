import "server-only";

import { OTHER_SERVICE, SERVICE_DEFS, buildServices } from "@/data/catalog";
import { getMemoryRepository } from "@/data/memory-repository";
import type { Professional, Service } from "@/domain/types";

export interface Catalog {
  /** Servicios que ven las clientas (con al menos un profesional activo). */
  publicServices: Service[];
  /** Todos, incluido "Otro" (solo equipo). */
  allServices: Service[];
  serviceById: ReadonlyMap<string, Service>;
  /** Equipo activo, en el orden en que se muestra. */
  professionals: Professional[];
  /** Incluye inactivos: para mostrar el historial de turnos viejos. */
  professionalById: ReadonlyMap<string, Professional>;
}

/**
 * Catálogo vigente: servicios + equipo, tal como está en la base ahora. Como
 * el admin puede sumar o dar de baja profesionales, nunca se lee de constantes.
 */
export async function getCatalog(): Promise<Catalog> {
  const team = await getMemoryRepository().listProfessionals();
  const allServices = buildServices([...SERVICE_DEFS, OTHER_SERVICE], team);
  return {
    publicServices: allServices.filter((s) => !s.staffOnly && s.professionalIds.length > 0),
    allServices,
    serviceById: new Map(allServices.map((s) => [s.id, s])),
    professionals: team.filter((p) => p.active),
    professionalById: new Map(team.map((p) => [p.id, p])),
  };
}
