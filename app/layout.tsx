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
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll";
import { appOrigin } from "@/lib/redirect";

const SITE_URL = appOrigin();
const SITE_NAME = "ShipSprint";
const SITE_TITLE = "ShipSprint — No-Code Landing Page Builder for Indie Mobile Apps";
const SITE_DESCRIPTION =
  "Launch sleek, high-converting Apple-inspired landing pages for your iOS and Android apps in under 3 minutes.";
const OG_IMAGE_URL = `${SITE_URL}/og-image.jpg`;

export const metadata: Metadata = {
  // metadataBase is required for Next.js to resolve relative og/twitter image
  // URLs to absolute URLs. Without it the og:image tag would emit a relative
  // path which crawlers silently ignore.
  metadataBase: new URL(SITE_URL),

  title: SITE_TITLE,
  description: SITE_DESCRIPTION,

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },

  // Open Graph — used by Facebook, LinkedIn, Slack, WhatsApp, iMessage, etc.
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1024,
        height: 682,
        alt: "ShipSprint — Build and Launch your App Landing Page in 60 Seconds",
        type: "image/jpeg",
      },
    ],
    locale: "en_US",
  },

  // Twitter / X — summary_large_image renders the full-width banner card
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_URL],
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
      <body className="min-h-full flex flex-col bg-white text-zinc-900 dark:bg-black dark:text-zinc-50">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
