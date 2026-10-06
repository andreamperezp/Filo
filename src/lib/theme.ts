/**
 * Preferencia de tema (claro / oscuro). Sin elección, se sigue la del
 * dispositivo. Se guarda en una cookie (no es un dato sensible) para que el
 * servidor pinte el tema correcto desde el primer render, sin parpadeo.
 */
export const THEME_COOKIE = "filo_theme";
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme);

/** Color de la barra del navegador en celulares, por tema. */
export const THEME_COLOR: Record<Theme, string> = { light: "#f5eedd", dark: "#0b2638" };
