"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconBell, IconX } from "@tabler/icons-react";

interface Latest {
  id: string;
  title: string;
  detail: string;
}

const POLL_MS = 15_000;

/**
 * Mantiene la agenda al día sin que la dueña recargue: refresca los Server
 * Components cada 15 s (y al volver a la pestaña) y avisa con un toast cuando
 * entra una novedad. En producción se reemplaza por Supabase Realtime.
 */
export function LiveUpdates({ latest }: { latest: Latest | null }) {
  const router = useRouter();
  const seen = useRef(latest?.id ?? null);
  const [toast, setToast] = useState<Latest | null>(null);

  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && router.refresh();
    const timer = setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  useEffect(() => {
    if (!latest || latest.id === seen.current) return;
    seen.current = latest.id;
    setToast(latest);
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [latest]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4"
    >
      {toast && (
        <div className="animate-slide-up pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink p-3 pr-2 text-bg shadow-lg">
          <IconBell aria-hidden size={20} />
          <Link href="/panel/actividad" onClick={() => setToast(null)} className="flex-1">
            <span className="block text-sm font-bold">{toast.title}</span>
            <span className="block text-xs opacity-80">{toast.detail}</span>
          </Link>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => setToast(null)}
            className="grid size-10 place-items-center rounded-full"
          >
            <IconX aria-hidden size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
