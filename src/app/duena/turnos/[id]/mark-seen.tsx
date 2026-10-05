"use client";

import { useEffect } from "react";
import { ownerMarkSeen } from "@/server/actions";

/**
 * Marca el turno como visto al abrir el detalle. Va en un efecto (POST) y no
 * en el render del Server Component: un GET nunca debería tener efectos.
 */
export function MarkSeen({ id }: { id: string }) {
  useEffect(() => {
    void ownerMarkSeen(id);
  }, [id]);
  return null;
}
