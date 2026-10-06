"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { THEME_COLOR, THEME_COOKIE, type Theme } from "@/lib/theme";
import { cx } from "./ui";

/**
 * Cambia entre modo claro y oscuro.
 *
 * - Sin elección previa arranca en el tema del dispositivo.
 * - Se aplica al instante (atributo `data-theme` en <html>) y se recuerda en
 *   una cookie por un año: el servidor pinta el tema correcto la próxima vez.
 * - El ícono y el texto para lectores de pantalla salen del tema activo vía
 *   CSS (variante `dark:`), así el HTML del servidor y el del navegador
 *   coinciden siempre.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const root = document.documentElement;
    const current: Theme =
      root.dataset.theme === "light" || root.dataset.theme === "dark"
        ? root.dataset.theme
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    const next: Theme = current === "dark" ? "light" : "dark";

    root.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute("content", THEME_COLOR[next]);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cx(
        "grid size-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      <IconMoon aria-hidden size={20} className="dark:hidden" />
      <IconSun aria-hidden size={20} className="hidden dark:block" />
      <span className="sr-only dark:hidden">Cambiar a modo oscuro</span>
      <span className="sr-only hidden dark:inline">Cambiar a modo claro</span>
    </button>
  );
}
