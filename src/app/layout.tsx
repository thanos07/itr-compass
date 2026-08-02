import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import "@fontsource/fraunces/600.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { siteConfig } from "@/lib/site";
import { WorkspaceProvider } from "@/lib/workspace-store";

import "./globals.css";

// A nonce must be generated per request, so the root layout is intentionally dynamic.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),

  title: {
    default: siteConfig.title,
    template: `%s — ${siteConfig.name}`,
  },

  description: siteConfig.description,

  applicationName: siteConfig.name,

  authors: [
    {
      name: siteConfig.creator.name,
      url: siteConfig.creator.url,
    },
  ],

  creator: siteConfig.creator.name,
  publisher: siteConfig.name,

  keywords: [
    "ITR Compass",
    "ITR",
    "income tax India",
    "AY 2026-27",
    "Form 16",
    "AIS",
    "26AS",
    "tax calculator",
    "tax workpaper",
  ],

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },

  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },

  robots: {
    index: true,
    follow: true,
  },
};

const themeScript = `
try {
  const t = localStorage.getItem('itr-theme') || 'cream';
  document.documentElement.dataset.theme = t;
} catch (_) {
  document.documentElement.dataset.theme = 'cream';
}
`;

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const nonce =
    (await headers()).get("x-nonce") ??
    undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
      </head>

      <body className="flex min-h-screen flex-col antialiased">
        <WorkspaceProvider>
          <Navbar />

          <main className="flex-1">
            {children}
          </main>

          <Footer />
        </WorkspaceProvider>
      </body>
    </html>
  );
}
