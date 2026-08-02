"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import CompassMark from "@/components/CompassMark";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { primaryNav, siteConfig } from "@/lib/site";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const active = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname.startsWith(href);

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/10 shadow-[0_14px_36px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
      style={{ background: "var(--nav-bg)" }}
    >
      <div className="container-page flex h-[4.5rem] items-center justify-between">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="group flex min-w-0 items-center gap-3 text-white"
          aria-label={`${siteConfig.name} home`}
        >
          <CompassMark
            size={38}
            className="shrink-0 transition-transform duration-300 group-hover:rotate-6"
          />

          <span className="min-w-0">
            <span className="block truncate font-display text-[1.32rem] font-semibold leading-none tracking-[-0.02em]">
              ITR{" "}
              <span className="text-royal-light">
                Compass
              </span>
            </span>

            <span className="mt-1 hidden truncate font-mono text-[0.58rem] uppercase tracking-[0.12em] text-mist-soft/70 sm:block">
              Income-tax workpaper
            </span>
          </span>

          <span className="ml-1 hidden rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 font-mono text-[0.58rem] font-medium tracking-[0.08em] text-mist-soft xl:inline-flex">
            AY 2026-27
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary"
        >
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${
                active(item.href)
                  ? "nav-link-active"
                  : ""
              }`}
            >
              {item.label}
            </Link>
          ))}

          <div className="ml-3">
            <ThemeSwitcher />
          </div>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white transition hover:bg-white/10 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={
            open
              ? "Close navigation"
              : "Open navigation"
          }
        >
          {open ? (
            <X size={21} />
          ) : (
            <Menu size={21} />
          )}
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-navigation"
          className="border-t border-white/10 px-5 py-4 md:hidden"
          style={{
            background: "var(--nav-bg)",
          }}
          aria-label="Mobile"
        >
          <div className="container-page !px-0">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-mist-soft/65">
                Navigation
              </p>

              <ThemeSwitcher />
            </div>

            <ul className="grid gap-1.5">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-md border px-3.5 py-3 text-[0.95rem] font-medium transition ${
                      active(item.href)
                        ? "border-white/10 bg-white/10 text-white"
                        : "border-transparent text-mist-soft hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
