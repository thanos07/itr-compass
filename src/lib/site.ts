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
      "https://portfolio-rosy-psi-74.vercel.app/",
  },
};

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
