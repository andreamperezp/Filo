import { isDemo } from "@/server/env";
import { GuideRunner } from "./guide-runner";
import type { Audience } from "./tours";

/** Guía de la demo. Fuera del modo demo no se renderiza nada (ni se carga driver.js). */
export function DemoGuide({ audience }: { audience: Audience }) {
  return isDemo ? <GuideRunner audience={audience} /> : null;
}
