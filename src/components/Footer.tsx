import Link from "next/link";
import { ExternalLink } from "lucide-react";

import CompassMark from "@/components/CompassMark";
import { siteConfig } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-navy text-mist-soft">
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr_1.25fr]">
        <div>
          <Link
            href="/"
            className="group inline-flex items-center gap-3 text-white"
            aria-label={`${siteConfig.name} home`}
          >
            <CompassMark
              size={36}
              className="transition-transform duration-300 group-hover:rotate-6"
            />

            <span className="font-display text-xl font-semibold">
              ITR{" "}
              <span className="text-royal-light">
                Compass
              </span>
            </span>
          </Link>

          <p className="mt-4 max-w-[42ch] text-[0.9rem] leading-relaxed">
            {siteConfig.tagline}
          </p>

          <p className="mt-4 max-w-[46ch] text-[0.78rem] leading-relaxed text-mist-soft/65">
            A privacy-first workpaper for
            organising evidence, comparing
            regimes and reviewing an Indian
            income-tax return before using the
            official portal.
          </p>
        </div>

        <div>
          <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-royal-light">
            Product
          </p>

          <div className="mt-4 grid gap-2.5 text-[0.9rem]">
            <Link
              href="/prepare"
              className="transition hover:text-white"
            >
              Prepare return
            </Link>

            <Link
              href="/legal"
              className="transition hover:text-white"
            >
              Legal basis
            </Link>

            <Link
              href="/privacy"
              className="transition hover:text-white"
            >
              Privacy notice
            </Link>

            <Link
              href="/terms"
              className="transition hover:text-white"
            >
              Terms of use
            </Link>

            <Link
              href="/security"
              className="transition hover:text-white"
            >
              Security
            </Link>
          </div>
        </div>

        <div>
          <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-royal-light">
            Important
          </p>

          <p className="mt-4 text-[0.88rem] leading-relaxed">
            Independent preparation software.
            Not affiliated with or endorsed by
            the Income Tax Department. Final
            filing, payment and e-verification
            happen on the official portal.
          </p>

          <a
            href="https://www.incometax.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[0.86rem] text-white transition hover:text-royal-light"
          >
            Official e-filing portal
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-5 text-[0.76rem] text-mist-soft/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()}{" "}
            {siteConfig.name}. Designed and
            developed by{" "}
            <a
              href={siteConfig.creator.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline decoration-royal-light/50 underline-offset-4 transition hover:text-royal-light"
            >
              {siteConfig.creator.name}
            </a>
            .
          </p>

          <p>
            Next.js · Neon · Render · Groq
          </p>
        </div>
      </div>
    </footer>
  );
}
