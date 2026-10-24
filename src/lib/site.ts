export const siteConfig = {
  name: "ITR Compass",
  shortName: "ITR Compass",
  title:
    "ITR Compass — Prepare, compare and review your income-tax workpaper",
  description:
    "A privacy-first, evidence-backed workspace for preparing, comparing and reviewing Indian individual income-tax returns for AY 2026-27.",
  tagline:
    "Prepare, compare, and review your income-tax workpaper.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000",
  creator: {
    name: "Md Noor",
    url:
      "https://mdnoorportfolio.vercel.app/",
  },
};

/** Keep old deployments current without overriding a custom operator website. */
export function resolveOperatorUrl(configuredUrl?: string): string {
  if (!configuredUrl) return siteConfig.creator.url;

  try {
    const url = new URL(configuredUrl);
    // Existing deployments may still have the retired portfolio in their env.
    if (url.hostname === "portfolio-rosy-psi-74.vercel.app") {
      return siteConfig.creator.url;
    }
    return configuredUrl;
  } catch {
    return siteConfig.creator.url;
  }
}

export const primaryNav = [
  { href: "/", label: "Overview" },
  {
    href: "/prepare",
    label: "Prepare return",
  },
  {
    href: "/legal",
    label: "Legal basis",
  },
  { href: "/privacy", label: "Privacy" },
];
