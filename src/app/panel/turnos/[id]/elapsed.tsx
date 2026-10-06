"use client";

import { useEffect, useState } from "react";

/** Minutos transcurridos desde que se empezó a atender (se actualiza solo). */
export function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  const minutes = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000));
  const label = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return (
    <span role="timer" className="tabular-nums">
      {label}
    </span>
  );
}
