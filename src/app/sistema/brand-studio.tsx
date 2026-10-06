"use client";

import { useEffect, useState } from "react";
import { IconPhoto, IconUpload } from "@tabler/icons-react";
import { cx } from "@/components/ui";
import { BookingScreen, ClientScreen, FILO_THEME, Phone, themeVars, type BrandTheme } from "./mockups";

/** Estilos de ejemplo para que el dueño vea su app con otra identidad. */
const PRESETS: BrandTheme[] = [
  FILO_THEME,
  {
    name: "Navaja",
    bg: "#1b1410",
    surface: "#27201b",
    ink: "#f3e9df",
    muted: "#b9a99a",
    primary: "#e0a84f",
    onPrimary: "#1b1410",
    soft: "#3a2c20",
  },
  {
    name: "Bloom",
    bg: "#fbf1f1",
    surface: "#ffffff",
    ink: "#4a1f33",
    muted: "#85606f",
    primary: "#b43c6e",
    onPrimary: "#ffffff",
    soft: "#f5dbe5",
  },
  {
    name: "Verde Studio",
    bg: "#eef3ee",
    surface: "#f9fbf8",
    ink: "#1f3a2c",
    muted: "#587062",
    primary: "#2f6b4f",
    onPrimary: "#f4faf6",
    soft: "#d6e8dc",
  },
];

/** Luminancia relativa (WCAG) para elegir texto claro u oscuro sobre el color de la marca. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Mezcla un color con blanco (0 = color, 1 = blanco). */
function tint(hex: string, amount: number) {
  const mix = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(c + (255 - c) * amount)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${mix.join("")}`;
}

/** Mezcla un color con negro (0 = color, 1 = negro). */
function shade(hex: string, amount: number) {
  const mix = [1, 3, 5].map((i) =>
    Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount))
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${mix.join("")}`;
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Tema armado a partir de un solo color de marca (para "Tu color").
 * Si el color es muy claro (amarillo pastel, blanco…), botones y selecciones
 * usan una versión más oscura del mismo tono hasta tener contraste 3:1 con el
 * fondo (mínimo WCAG para controles); el color original queda de acento.
 */
function themeFromColor(name: string, color: string): BrandTheme {
  let primary = color;
  for (let step = 0.1; contrast(primary, "#ffffff") < 3 && step <= 0.9; step += 0.1) {
    primary = shade(color, step);
  }
  const onPrimary = contrast(primary, "#ffffff") >= 4.5 ? "#ffffff" : "#16181b";
  return {
    name,
    bg: tint(primary, 0.93),
    surface: "#ffffff",
    ink: "#1f2328",
    muted: "#5d6670",
    primary,
    onPrimary,
    soft: tint(primary, 0.84),
  };
}

export function BrandStudio() {
  const [preset, setPreset] = useState(0);
  const [custom, setCustom] = useState<{ name: string; color: string } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Libera la URL temporal del logo al cambiarlo o al salir.
  useEffect(() => () => void (logoUrl && URL.revokeObjectURL(logoUrl)), [logoUrl]);

  const base = custom ? themeFromColor(custom.name || "Tu local", custom.color) : PRESETS[preset];
  const theme: BrandTheme = { ...base, logoUrl };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)] lg:items-center lg:gap-12">
      <div className="flex flex-col gap-6">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-merino/85">Probá un estilo</legend>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, i) => {
              const on = !custom && preset === i;
              return (
                <button
                  key={p.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setCustom(null);
                    setPreset(i);
                  }}
                  className={cx(
                    "flex min-h-12 items-center gap-2 rounded-full border-2 py-1.5 pr-4 pl-1.5 text-sm font-semibold transition",
                    on
                      ? "border-merino bg-merino text-venice-deep"
                      : "border-merino/30 text-merino hover:border-merino",
                  )}
                >
                  <span aria-hidden className="flex size-8 overflow-hidden rounded-full ring-1 ring-black/10">
                    <span className="flex-1" style={{ background: p.primary }} />
                    <span className="flex-1" style={{ background: p.bg }} />
                  </span>
                  {p.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="rounded-3xl border border-merino/25 p-5">
          <legend className="px-2 text-sm font-semibold text-merino/85">O armá el tuyo</legend>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-merino">
              Nombre de tu local
              <input
                value={custom?.name ?? ""}
                placeholder="Ej. Barbería Don Pepe"
                maxLength={24}
                onChange={(e) => setCustom({ name: e.target.value, color: custom?.color ?? PRESETS[preset].primary })}
                className="min-h-12 rounded-xl border-2 border-transparent bg-merino px-3 text-base font-normal text-venice-deep placeholder:text-venice-deep/50 focus:border-rock focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-merino">
              Tu color
              <input
                type="color"
                value={custom?.color ?? PRESETS[preset].primary}
                onChange={(e) => setCustom({ name: custom?.name ?? "", color: e.target.value })}
                className="h-12 w-full cursor-pointer rounded-xl border-2 border-transparent bg-merino p-1.5 focus:border-rock focus:outline-none sm:w-20"
              />
            </label>
          </div>
          <label className="mt-4 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-merino/40 px-4 text-sm font-semibold text-merino hover:border-merino has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-merino">
            {logoUrl ? <IconPhoto aria-hidden size={18} /> : <IconUpload aria-hidden size={18} />}
            {logoUrl ? "Cambiar logo" : "Subí tu logo (PNG o SVG)"}
            <input
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setLogoUrl(URL.createObjectURL(file));
              }}
            />
          </label>
          <p className="mt-2 text-xs text-merino/70">
            Tu logo se muestra solo en tu pantalla: no se sube a ningún lado.
          </p>
        </fieldset>
      </div>

      <div style={themeVars(theme)} className="flex justify-center gap-4" aria-live="polite">
        <Phone label={`App de ${theme.name}: inicio de la clienta`}>
          <ClientScreen theme={theme} />
        </Phone>
        <Phone label={`App de ${theme.name}: elegir día y hora`} className="hidden sm:block">
          <BookingScreen theme={theme} />
        </Phone>
      </div>
    </div>
  );
}
