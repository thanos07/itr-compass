import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Cloud,
  FileLock2,
  HardDrive,
  KeyRound,
  Mail,
  ScanSearch,
  ServerOff,
  Trash2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "How ITR Compass processes tax documents, optional external transfers and encrypted cloud workspaces.",
};

const privacyContact =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT ||
  "privacy contact not configured — deployment owner must set NEXT_PUBLIC_PRIVACY_CONTACT";

const privacyLastReviewed = "24 August 2026";

export default function PrivacyPage() {
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
            PRIVACY NOTICE
          </p>

          <h1
            className="mt-5 font-display text-[clamp(2.5rem,6vw,4.8rem)] font-semibold leading-[1.02] tracking-[-0.04em]"
            style={{ color: "var(--heading)" }}
          >
            Local by default. External processing only after a clear choice.
          </h1>

          <p
            className="mt-6 max-w-[76ch] text-[1rem] leading-relaxed"
            style={{ color: "var(--text-soft)" }}
          >
            ITR Compass is designed around data minimisation and in-browser
            control. This notice describes the information processed, its
            purposes, retention, optional external transfers and the controls
            available to users.
          </p>

          <p
            className="mt-3 max-w-[76ch] text-[0.86rem] leading-relaxed"
            style={{ color: "var(--text-faint)" }}
          >
            This notice is maintained with reference to India&apos;s Digital
            Personal Data Protection Act, 2023 and Digital Personal Data
            Protection Rules, 2025, including their phased commencement. The
            deployment operator remains responsible for confirming which
            provisions are in force and applicable on the deployment date and
            for maintaining an appropriate rights and grievance process.
          </p>

          <p
            className="mt-3 text-[0.76rem]"
            style={{ color: "var(--text-faint)" }}
          >
            Last reviewed: {privacyLastReviewed}
          </p>
        </div>
      </section>

      <section className="section-py-sm">
        <div className="container-page max-w-[1000px] space-y-8">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              [
                HardDrive,
                "Browser-first workspace",
                "Structured tax inputs, accepted claims and notes stay in this browser’s localStorage unless you export them or choose encrypted cloud save. Local storage is not encrypted by this application, so avoid shared or untrusted devices.",
              ],
              [
                FileLock2,
                "No raw-file application database",
                "Uploaded files are parsed in memory by the included application and parser worker. ITR Compass does not intentionally write raw PDFs, spreadsheets or ZIP files to its Neon workspace database.",
              ],
              [
                KeyRound,
                "Client-side encrypted sync",
                "When optional cloud recovery is enabled, the browser encrypts the structured workspace with AES-GCM before transfer. Neon receives ciphertext and technical metadata rather than the recovery key needed to decrypt the workspace.",
              ],
            ].map(([Icon, title, text]) => {
              const ItemIcon = Icon as typeof HardDrive;

              return (
                <article
                  key={String(title)}
                  className="card p-6"
                >
                  <ItemIcon
                    size={22}
                    style={{ color: "var(--accent)" }}
                  />

                  <h2
                    className="mt-5 font-display text-2xl font-semibold"
                    style={{ color: "var(--heading)" }}
                  >
                    {String(title)}
                  </h2>

                  <p
                    className="mt-3 text-[0.86rem] leading-relaxed"
                    style={{ color: "var(--text-soft)" }}
                  >
                    {String(text)}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="card p-6 sm:p-8">
            <h2
              className="font-display text-3xl font-semibold"
              style={{ color: "var(--heading)" }}
            >
              Data categories, purposes and retention
            </h2>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-[0.83rem]">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <th className="pb-3 pr-5 field-label">
                      Category
                    </th>

                    <th className="pb-3 pr-5 field-label">
                      Purpose
                    </th>

                    <th className="pb-3 field-label">
                      Application retention
                    </th>
                  </tr>
                </thead>

                <tbody style={{ color: "var(--text-soft)" }}>
                  {[
                    [
                      "Tax profile and financial figures",
                      "Form screening, evidence reconciliation and deterministic tax estimates.",
                      "Stored in this browser until reset. If encrypted cloud recovery is enabled, the active application record may be retained for up to 90 days, subject to earlier owner-authorised deletion.",
                    ],
                    [
                      "Raw uploaded files",
                      "Temporary document, text or table extraction.",
                      "Processed in memory by the included application or parser worker and not intentionally persisted by ITR Compass as raw-file storage.",
                    ],
                    [
                      "Redacted text previews",
                      "Optional Groq extraction and agent review.",
                      "Sent only for the requested external-processing operation after the applicable consent is enabled. ITR Compass does not store the submitted preview in Neon.",
                    ],
                    [
                      "Encrypted cloud payload and token hashes",
                      "Optional recovery, authorised update and immediate active-record deletion.",
                      "The active application record may remain for up to 90 days, may be extended following an authorised update, or may be deleted earlier using the owner controls.",
                    ],
                    [
                      "Operational metadata",
                      "Request handling, rate limiting, reliability and security operations.",
                      "May be processed or retained by configured infrastructure providers under their own service settings, contracts and privacy policies.",
                    ],
                  ].map(([category, purpose, retention]) => (
                    <tr
                      key={category}
                      style={{
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <td
                        className="py-4 pr-5 font-semibold"
                        style={{ color: "var(--heading)" }}
                      >
                        {category}
                      </td>

                      <td className="py-4 pr-5">
                        {purpose}
                      </td>

                      <td className="py-4">
                        {retention}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p
              className="mt-5 text-[0.78rem] leading-relaxed"
              style={{ color: "var(--text-faint)" }}
            >
              Application-level deletion does not necessarily mean every
              infrastructure backup disappears immediately. Infrastructure
              providers may maintain backups, point-in-time recovery data,
              security logs or other limited copies according to their current
              retention policies and applicable legal obligations.
            </p>
          </div>

          <div className="card overflow-hidden">
            <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
              <div
                className="p-7 sm:p-9"
                style={{
                  background: "var(--nav-bg)",
                  color: "white",
                }}
              >
                <Cloud
                  size={26}
                  className="text-royal-light"
                />

                <h2 className="mt-5 font-display text-3xl font-semibold">
                  Optional service transfers
                </h2>

                <p className="mt-4 text-[0.9rem] leading-relaxed text-mist-soft">
                  The interface asks separately before using the external
                  parser, Groq or encrypted Neon storage. Clearing the relevant
                  option withdraws consent for future optional requests from
                  ITR Compass; it does not retroactively erase processing
                  already completed by an external provider.
                </p>
              </div>

              <div
                className="divide-y"
                style={{ borderColor: "var(--line)" }}
              >
                {[
                  [
                    "Vercel",
                    "Serves the Next.js application, static assets and API routes. Vercel operates global infrastructure and states that information may be stored, processed or transmitted in the United States and other jurisdictions in which Vercel or its subprocessors operate. Actual processing depends on the deployment configuration and services used.",
                  ],
                  [
                    "Neon",
                    "Receives the encrypted workspace ciphertext, IV, salt, capability-token hashes, schema version and expiry when encrypted cloud recovery is enabled. The recovery key is not intentionally sent to Neon. Deleting the active application record does not necessarily remove provider-level backups immediately; Neon documents separate backup and retention controls.",
                  ],
                  [
                    "Render parser",
                    "Receives the selected raw file only when the external parser is used and the user has enabled that transfer. The included parser worker processes the file in memory and returns retained: false rather than intentionally storing the raw upload. Render may separately process technical, operational or service data according to its configured region and current provider policies.",
                  ],
                  [
                    "Groq",
                    "Receives a shortened, pattern-redacted text preview and compact deterministic facts only when Groq processing is enabled and the user runs extraction or an agent. Groq states that ordinary inference customer data is not retained by default, but inputs and outputs may be retained for up to 30 days when needed for system reliability or abuse monitoring unless applicable Zero Data Retention controls are enabled. Groq states that customer data which is retained is stored in Google Cloud Platform buckets in the United States.",
                  ],
                ].map(([name, text]) => (
                  <div
                    key={name}
                    className="p-6"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <p
                      className="font-semibold"
                      style={{ color: "var(--heading)" }}
                    >
                      {name}
                    </p>

                    <p
                      className="mt-2 text-[0.84rem] leading-relaxed"
                      style={{ color: "var(--text-soft)" }}
                    >
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="card p-6">
              <div className="flex items-center gap-3">
                <ScanSearch
                  size={20}
                  style={{ color: "var(--accent)" }}
                />

                <h2
                  className="font-display text-2xl font-semibold"
                  style={{ color: "var(--heading)" }}
                >
                  Redaction limits
                </h2>
              </div>

              <p
                className="mt-4 text-[0.86rem] leading-relaxed"
                style={{ color: "var(--text-soft)" }}
              >
                The app masks common PAN, Aadhaar, IFSC, email, phone and
                long-number patterns before optional Groq requests. This is a
                defence-in-depth control, not a guarantee that every identifier
                or identifying narrative detail is removed. Review the
                information being processed and avoid sending unnecessary
                documents or data.
              </p>
            </article>

            <article className="card p-6">
              <div className="flex items-center gap-3">
                <ServerOff
                  size={20}
                  style={{ color: "var(--danger)" }}
                />

                <h2
                  className="font-display text-2xl font-semibold"
                  style={{ color: "var(--heading)" }}
                >
                  No application advertising or behavioural analytics
                </h2>
              </div>

              <p
                className="mt-4 text-[0.86rem] leading-relaxed"
                style={{ color: "var(--text-soft)" }}
              >
                ITR Compass includes no advertising SDK, behavioural analytics
                package or tax-portal credential collection in its application
                code. Hosting and infrastructure providers may still generate
                request, security, performance or operational logs according to
                their own configurations and policies.
              </p>
            </article>
          </div>

          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Trash2
                size={21}
                style={{ color: "var(--danger)" }}
              />

              <h2
                className="font-display text-3xl font-semibold"
                style={{ color: "var(--heading)" }}
              >
                Your controls
              </h2>
            </div>

            <div
              className="mt-5 grid gap-3 text-[0.85rem] leading-relaxed sm:grid-cols-2"
              style={{ color: "var(--text-soft)" }}
            >
              {[
                "Access your local structured data by downloading an .itrwork JSON backup.",
                "Correct entered values or accepted claims directly in the workpaper.",
                "Erase local workspace data with Reset workspace and clear the site’s browser storage when needed.",
                "Delete the active encrypted cloud workspace using the private deletion capability in the owner link.",
                "Withdraw future optional Render, Groq or Neon processing by clearing the relevant consent control.",
                "Raise an access, correction, erasure, consent or grievance request through the monitored deployment contact below.",
                "Where applicable DPDP provisions are in force, request the exercise of applicable Data Principal rights through the deployment contact.",
                "Where applicable law provides a nomination right, contact the deployment operator for the process used to record and handle such a request.",
              ].map((item) => (
                <p
                  key={item}
                  className="rounded-sm border p-3"
                  style={{
                    borderColor: "var(--line)",
                    background: "var(--surface)",
                  }}
                >
                  • {item}
                </p>
              ))}
            </div>

            <p
              className="mt-5 text-[0.78rem] leading-relaxed"
              style={{ color: "var(--text-faint)" }}
            >
              Statutory rights depend on the law and provisions applicable and
              in force at the time of a request. Product controls described
              above do not replace rights available under applicable law.
            </p>
          </div>

          <div className="callout callout-warning">
            <KeyRound
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Owner and recovery links are secrets
              </p>

              <p className="mt-1 text-[0.83rem]">
                A read-only recovery link can decrypt the workspace. The
                private owner link also authorises update and deletion. Do not
                publish either link; the server cannot recreate lost recovery
                keys or owner capability tokens.
              </p>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Mail
                size={21}
                style={{ color: "var(--accent)" }}
              />

              <h2
                className="font-display text-3xl font-semibold"
                style={{ color: "var(--heading)" }}
              >
                Privacy and grievance contact
              </h2>
            </div>

            <p
              className="mt-4 text-[0.86rem] leading-relaxed"
              style={{ color: "var(--text-soft)" }}
            >
              Deployment contact:{" "}
              <strong style={{ color: "var(--heading)" }}>
                {privacyContact}
              </strong>
            </p>

            <p
              className="mt-2 text-[0.8rem] leading-relaxed"
              style={{ color: "var(--text-faint)" }}
            >
              Use this contact for privacy questions and applicable access,
              correction, erasure, consent, nomination or grievance requests.
              The deployment operator should maintain a documented process for
              handling requests and any response periods required by law.
            </p>
          </div>

          <div
            className="rounded-md border p-5 text-[0.8rem] leading-relaxed"
            style={{
              borderColor: "var(--line)",
              background: "var(--surface)",
              color: "var(--text-faint)",
            }}
          >
            <p>
              <strong style={{ color: "var(--heading)" }}>
                Provider practices can change:
              </strong>{" "}
              retention periods, processing locations, subprocessors and data
              controls described by Vercel, Neon, Render and Groq may change
              after this notice is reviewed. The deployment operator should
              periodically compare this notice with the providers&apos; current
              documentation and account configuration.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/terms"
              className="btn btn-secondary"
            >
              Read terms
            </Link>

            <Link
              href="/prepare"
              className="btn btn-primary"
            >
              Use local mode
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
