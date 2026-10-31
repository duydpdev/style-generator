import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "style-generator · Next.js + Tailwind v4 Example",
  description:
    "Token-driven design system demo for @duydpdev/style-generator on Next.js App Router with Tailwind CSS v4.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // No `data-theme` / `data-palette`: the base variants need no attribute. The
  // client-only `ThemeSwitch` adds them on `<html>` once the user picks one.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
