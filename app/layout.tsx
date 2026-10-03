import type { Metadata } from "next";
// Self-hosted via Fontsource (npm-bundled, zero build-time network).
// next/font/google was removed: it fetches from fonts.googleapis.com during
// `next build` and breaks CI/Docker builds (Turbopack:
// "Can't resolve '@vercel/turbopack-next/internal/font/google/font'").
// Nexbet studied-DNA: Inter body + Inter Tight display (explicit user override
// of Hallmark gate 1, which bans Inter as a display face).
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/inter-tight/700.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll";

export const metadata: Metadata = {
  title: "ShipSprint — No-Code Landing Page Builder for Indie Mobile Apps",
  description:
    "Launch sleek, high-converting Apple-inspired landing pages for your iOS and Android apps in under 3 minutes.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flexhttps://nexbit-temlis.webflow.io/ flex-col bg-white text-zinc-900 dark:bg-black dark:text-zinc-50">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
