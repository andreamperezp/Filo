"use client";

import { useEffect } from "react";
import { staffMarkSeen } from "@/server/actions";

/**
 * Marca el turno como visto al abrir el detalle. Va en un efecto (POST) y no
 * en el render del Server Component: un GET nunca debería tener efectos.
 */
export function MarkSeen({ id }: { id: string }) {
  useEffect(() => {
    void staffMarkSeen(id);
  }, [id]);
  return null;
}
