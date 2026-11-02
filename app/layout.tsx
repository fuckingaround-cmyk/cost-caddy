import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono, Inter_Tight } from "next/font/google";
import "./globals.css";

// App UI surface — Cost Caddy brand: Space Grotesk for display/headings/nav/
// buttons, IBM Plex Mono for body/labels/metadata (DESIGN.md Part A).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-ui-title",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const plexMonoUI = IBM_Plex_Mono({
  variable: "--font-ui-body",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Report surface — a separate type system, never mixed with App UI
const interTight = Inter_Tight({
  variable: "--font-report-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-report-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cost Caddy",
  description: "F&B audit platform — auditor and client portals",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plexMonoUI.variable} ${interTight.variable} ${plexMono.variable}`}
    >
      <head>
        {/* Report-surface icons only — never mix with App UI's inline stroked SVGs.
            Not a next/font export; loaded as a stylesheet per Google's own snippet
            (DESIGN-SYSTEM.md §2). The no-page-custom-font rule is a Pages Router
            check — this is the App Router root layout, so it applies globally. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
