import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Fraunces, Outfit } from "next/font/google";
import { THEME_COLOR, THEME_COOKIE, isTheme } from "@/lib/theme";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "WONK", "opsz"] });

export const metadata: Metadata = {
  title: { default: "Filo · peluquería y barbería", template: "%s · Filo" },
  description: "Reservá tu turno en Filo en menos de un minuto.",
  applicationName: "Filo",
};

async function chosenTheme() {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : null;
}

export async function generateViewport(): Promise<Viewport> {
  const theme = await chosenTheme();
  return {
    // Con tema elegido, un solo color; si no, el del dispositivo.
    themeColor: theme
      ? THEME_COLOR[theme]
      : [
          { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
          { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
        ],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await chosenTheme();
  return (
    <html
      lang="es-AR"
      data-theme={theme ?? undefined}
      className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
