import type { Metadata } from "next";
import { Outfit, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AZURECASER // Next-Gen CS2 Cryo Case & Upgrade Simulator",
  description:
    "Уникальный симулятор открытия крио-кейсов, реакторного апгрейда и коллекционирования скинов CS2.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      className={`${outfit.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="font-sans antialiased selection:bg-cyan-400 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
