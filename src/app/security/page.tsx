import type { Metadata } from "next";
import {
  Bug,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Security design, workspace protection and responsible vulnerability reporting for ITR Compass.",
};

const securityContact =
  process.env.NEXT_PUBLIC_SECURITY_CONTACT ||
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT ||
  process.env.NEXT_PUBLIC_LEGAL_CONTACT ||
  "noorali99304@gmail.com";

const securityFeatures = [
  {
    icon: LockKeyhole,
    title: "Encrypted workspace",
    text:
      "When optional cloud recovery is enabled, the structured workspace is encrypted in the browser using AES-GCM before it is sent to the configured database. The database receives encrypted content rather than the readable workspace.",
  },
  {
    icon: KeyRound,
    title: "Separate access controls",
    text:
      "Workspace recovery, updating and deletion use separate secrets. A recovery key decrypts the workspace, while separate owner tokens control updates and deletion.",
  },
  {
    icon: ShieldCheck,
    title: "Untrusted-input controls",
    text:
      "File-size limits, structured validation, restricted output schemas and prompt-data boundaries are used to reduce risks from malformed documents, oversized payloads and untrusted model output.",
  },
];

const securityPractices = [
  "Supported document processing begins in the browser so unnecessary external transfer can be avoided.",
  "Raw uploaded tax documents are not stored by default by the ITR Compass web application.",
  "Optional cloud workspaces are encrypted before leaving the browser.",
  "Workspace imports are checked against the supported schema and safety limits before being accepted.",
  "AI and external parser services are used only for enabled features and are described in the privacy notice.",
  "Recovery links, owner links, API keys and PDF-backup passwords are treated as confidential secrets.",
];

const workspaceSafetySteps = [
  "Use a strong and unique password for restorable PDF backups.",
  "Keep recovery links and private owner links separate from public documents or messages.",
  "Do not share Groq, Neon, Render, Vercel or other service credentials.",
  "Use the immediate-delete control when an encrypted cloud workspace is no longer required.",
  "Report suspected security problems privately before publishing technical details.",
];

export default function SecurityPage() {
  return (
    <>
      <section
        className="border-b py-14 sm:py-20"
        style={{
          borderColor: "var(--line)",
          background: "var(--page-alt)",
        }}
      >
        <div className="container-page max-w-[920px]">
          <p className="eyebrow">
            <span className="trace-tick" />
            SECURITY
          </p>

          <h1
            className="mt-5 font-display text-[clamp(2.5rem,6vw,4.8rem)] font-semibold leading-[1.02] tracking-[-0.04em]"
            style={{ color: "var(--heading)" }}
          >
            Security built around data minimisation.
          </h1>

          <p
            className="mt-6 max-w-[76ch] text-[1rem] leading-relaxed"
            style={{ color: "var(--text-soft)" }}
          >
            ITR Compass is designed to reduce unnecessary exposure of
            taxpayer information by processing supported files locally,
            encrypting optional cloud workspaces before transfer and keeping
            recovery, update and deletion controls separate.
          </p>

          <p
            className="mt-3 max-w-[76ch] text-[0.86rem] leading-relaxed"
            style={{ color: "var(--text-faint)" }}
          >
            No website can guarantee complete security. Users should also
            protect their devices, passwords, recovery links and source
            documents.
          </p>
        </div>
      </section>

      <section className="section-py-sm">
        <div className="container-page max-w-[980px] space-y-7">
          <div className="grid gap-5 md:grid-cols-3">
            {securityFeatures.map((feature) => {
              const FeatureIcon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="card p-6"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-sm"
                    style={{
                      color: "var(--accent)",
                      background: "var(--accent-soft)",
                    }}
                  >
                    <FeatureIcon
                      size={22}
                      aria-hidden="true"
                    />
                  </span>

                  <h2
                    className="mt-5 font-display text-2xl font-semibold"
                    style={{ color: "var(--heading)" }}
                  >
                    {feature.title}
                  </h2>

                  <p
                    className="mt-3 text-[0.84rem] leading-relaxed"
                    style={{ color: "var(--text-soft)" }}
                  >
                    {feature.text}
                  </p>
                </article>
              );
            })}
          </div>

          <article className="card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Bug
                size={21}
                style={{ color: "var(--warning)" }}
                aria-hidden="true"
              />

              <h2
                className="font-display text-3xl font-semibold"
                style={{ color: "var(--heading)" }}
              >
                Report a vulnerability
              </h2>
            </div>

            <p
              className="mt-4 text-[0.86rem] leading-relaxed"
              style={{ color: "var(--text-soft)" }}
            >
              Send a concise description, the affected route or component,
              reproduction steps and the potential impact to{" "}
              <a
                href={`mailto:${securityContact}`}
                className="font-semibold underline decoration-[var(--accent)]/40 underline-offset-4 transition hover:text-[var(--accent)]"
                style={{ color: "var(--heading)" }}
              >
                {securityContact}
              </a>
              .
            </p>

            <p
              className="mt-3 text-[0.86rem] leading-relaxed"
              style={{ color: "var(--text-soft)" }}
            >
              Do not access taxpayer records without authorisation, retain
              personal information, disrupt service availability, upload
              harmful material or disclose recovery links, owner tokens,
              API keys or other active secrets.
            </p>

            <div className="callout callout-info mt-5">
              <Mail
                size={18}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />

              <p>
                Please report suspected vulnerabilities privately so they can
                be investigated before technical details are shared publicly.
              </p>
            </div>
          </article>

          <article className="card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <ShieldCheck
                size={21}
                style={{ color: "var(--accent)" }}
                aria-hidden="true"
              />

              <h2
                className="font-display text-3xl font-semibold"
                style={{ color: "var(--heading)" }}
              >
                Security practices
              </h2>
            </div>

            <ul
              className="mt-5 space-y-3 text-[0.86rem] leading-relaxed"
              style={{ color: "var(--text-soft)" }}
            >
              {securityPractices.map((practice) => (
                <li
                  key={practice}
                  className="flex items-start gap-3"
                >
                  <span
                    className="mt-[0.42rem] h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: "var(--accent)" }}
                    aria-hidden="true"
                  />

                  <span>{practice}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <KeyRound
                size={21}
                style={{ color: "var(--success)" }}
                aria-hidden="true"
              />

              <h2
                className="font-display text-3xl font-semibold"
                style={{ color: "var(--heading)" }}
              >
                Protect your workspace
              </h2>
            </div>

            <ul
              className="mt-5 space-y-3 text-[0.86rem] leading-relaxed"
              style={{ color: "var(--text-soft)" }}
            >
              {workspaceSafetySteps.map((step) => (
                <li
                  key={step}
                  className="flex items-start gap-3"
                >
                  <span
                    className="mt-[0.42rem] h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: "var(--success)" }}
                    aria-hidden="true"
                  />

                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </article>

          <div
            className="rounded-md border p-5 text-[0.82rem] leading-relaxed"
            style={{
              borderColor: "var(--line)",
              background: "var(--surface)",
              color: "var(--text-faint)",
            }}
          >
            <p>
              <strong style={{ color: "var(--heading)" }}>
                Independent service:
              </strong>{" "}
              {siteConfig.name} is not affiliated with or endorsed by the
              Income Tax Department. Security information on this page
              describes the application design and does not represent a
              government certification or independent security audit.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}