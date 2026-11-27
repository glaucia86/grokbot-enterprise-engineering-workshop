import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./styles.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Procurement Hub — Enterprise Financial Controls",
  description: "Multi-tenant corporate procurement and cost-center budget governance lab",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f17" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`} data-scroll-behavior="smooth">
      <body suppressHydrationWarning>
        <a
          className="sr-only z-[100] rounded-lg bg-accent-solid px-4 py-2.5 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
          href="#main-content"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
