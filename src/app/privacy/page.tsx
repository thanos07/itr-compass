import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cloud, FileLock2, HardDrive, KeyRound, Mail, ScanSearch, ServerOff, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How ITR File processes tax documents, optional external transfers and encrypted cloud workspaces.",
};

const privacyContact = process.env.NEXT_PUBLIC_PRIVACY_CONTACT || "privacy contact not configured — deployment owner must set NEXT_PUBLIC_PRIVACY_CONTACT";

export default function PrivacyPage() {
  return (
    <>
      <section className="border-b py-14 sm:py-20" style={{ borderColor: "var(--line)", background: "var(--page-alt)" }}>
        <div className="container-page max-w-[920px]">
          <p className="eyebrow"><span className="trace-tick" />PRIVACY NOTICE</p>
          <h1 className="mt-5 font-display text-[clamp(2.5rem,6vw,4.8rem)] font-semibold leading-[1.02] tracking-[-0.04em]" style={{ color: "var(--heading)" }}>Local by default. External processing only after a clear choice.</h1>
          <p className="mt-6 max-w-[76ch] text-[1rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>ITR File is designed around data minimisation and in-browser control. This notice explains the information processed, its purpose, retention, optional transfers and the controls available to the user. It is written in preparation for India&apos;s staged Digital Personal Data Protection framework; the deployment owner remains responsible for confirming the provisions in force on the deployment date.</p>
        </div>
      </section>

      <section className="section-py-sm">
        <div className="container-page max-w-[1000px] space-y-8">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              [HardDrive, "Browser-first workspace", "Structured tax inputs, accepted claims and notes stay in this browser’s localStorage unless you export or choose encrypted cloud save. Local storage is not encrypted by this app, so avoid shared devices."],
              [FileLock2, "No raw-file database", "Uploaded files are parsed in memory. This application does not write raw PDFs, spreadsheets or ZIPs to Neon."],
              [KeyRound, "Client-side encrypted sync", "The browser encrypts the structured workspace with AES-GCM. Neon receives ciphertext and technical metadata, not the recovery key."],
            ].map(([Icon, title, text]) => {
              const ItemIcon = Icon as typeof HardDrive;
              return <article key={String(title)} className="card p-6"><ItemIcon size={22} style={{ color: "var(--accent)" }} /><h2 className="mt-5 font-display text-2xl font-semibold" style={{ color: "var(--heading)" }}>{String(title)}</h2><p className="mt-3 text-[0.86rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>{String(text)}</p></article>;
            })}
          </div>

          <div className="card p-6 sm:p-8">
            <h2 className="font-display text-3xl font-semibold" style={{ color: "var(--heading)" }}>Data categories, purposes and retention</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-[0.83rem]">
                <thead><tr style={{ borderBottom: "1px solid var(--line)" }}><th className="pb-3 pr-5 field-label">Category</th><th className="pb-3 pr-5 field-label">Purpose</th><th className="pb-3 field-label">Retention</th></tr></thead>
                <tbody style={{ color: "var(--text-soft)" }}>
                  {[
                    ["Tax profile and financial figures", "Form screening, evidence reconciliation and deterministic tax estimates.", "Local browser storage until reset; optional encrypted cloud record for up to 90 days."],
                    ["Raw uploaded files", "Temporary text or table extraction.", "Processed in memory; not intentionally persisted by the included app or parser worker."],
                    ["Redacted text previews", "Optional Groq extraction and four-agent review.", "Sent only for the individual request after consent; this app does not place the preview in Neon."],
                    ["Encrypted cloud payload and owner-token hashes", "Optional recovery, authorised update and immediate deletion.", "Up to 90 days, extended on an authorised update, or deleted earlier by the owner."],
                    ["Operational metadata", "Rate limiting, request handling and security monitoring by hosting providers.", "Controlled by the configured provider and deployment settings."],
                  ].map(([category, purpose, retention]) => <tr key={category} style={{ borderBottom: "1px solid var(--line)" }}><td className="py-4 pr-5 font-semibold" style={{ color: "var(--heading)" }}>{category}</td><td className="py-4 pr-5">{purpose}</td><td className="py-4">{retention}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
              <div className="p-7 sm:p-9" style={{ background: "var(--nav-bg)", color: "white" }}><Cloud size={26} className="text-royal-light" /><h2 className="mt-5 font-display text-3xl font-semibold">Optional service transfers</h2><p className="mt-4 text-[0.9rem] leading-relaxed text-mist-soft">The interface asks separately before using Render, Groq or encrypted Neon storage. Clearing a checkbox withdraws consent for future requests.</p></div>
              <div className="divide-y" style={{ borderColor: "var(--line)" }}>
                {[
                  ["Vercel", "Serves the Next.js application and API routes. Requests may be processed in the deployment regions selected by the account owner."],
                  ["Neon", "Receives encrypted workspace ciphertext, IV, salt, token hashes, schema version and expiry only after the user enables cloud storage."],
                  ["Render parser", "Receives the selected raw file only when the browser parser cannot handle it and the user has enabled the Render transfer. The included worker processes in memory and returns retained: false."],
                  ["Groq", "Receives a shortened, pattern-redacted text preview and compact deterministic facts only when the user enables Groq and runs extraction or an agent. Depending on the provider infrastructure and account configuration, processing may occur outside India."],
                ].map(([name, text]) => <div key={name} className="p-6" style={{ borderColor: "var(--line)" }}><p className="font-semibold" style={{ color: "var(--heading)" }}>{name}</p><p className="mt-2 text-[0.84rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>{text}</p></div>)}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="card p-6">
              <div className="flex items-center gap-3"><ScanSearch size={20} style={{ color: "var(--accent)" }} /><h2 className="font-display text-2xl font-semibold" style={{ color: "var(--heading)" }}>Redaction limits</h2></div>
              <p className="mt-4 text-[0.86rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>The app masks common PAN, Aadhaar, IFSC, email, phone and long-number patterns before optional Groq requests. This is defence in depth, not a guarantee that every identifier or narrative detail is removed. Review the preview and avoid sending unnecessary documents.</p>
            </article>
            <article className="card p-6">
              <div className="flex items-center gap-3"><ServerOff size={20} style={{ color: "var(--danger)" }} /><h2 className="font-display text-2xl font-semibold" style={{ color: "var(--heading)" }}>No hidden tracking</h2></div>
              <p className="mt-4 text-[0.86rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>The starter includes no advertising SDK, behavioural analytics package or tax-portal credential collection. Hosting providers may still produce infrastructure logs under their own configurations and terms.</p>
            </article>
          </div>

          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-3"><Trash2 size={21} style={{ color: "var(--danger)" }} /><h2 className="font-display text-3xl font-semibold" style={{ color: "var(--heading)" }}>Your controls</h2></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 text-[0.85rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>
              {[
                "Access your local structured data by downloading an .itrwork JSON backup.",
                "Correct entered values or accepted claims directly in the workpaper.",
                "Erase local workspace data with Reset workspace and clear site data in the browser when needed.",
                "Delete an encrypted cloud workspace immediately with the private deletion token in the owner link.",
                "Withdraw future Render, Groq or Neon consent by clearing the relevant checkbox.",
                "Raise an access, correction, erasure, consent or grievance request through the contact below.",
              ].map((item) => <p key={item} className="rounded-sm border p-3" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>• {item}</p>)}
            </div>
          </div>

          <div className="callout callout-warning"><KeyRound size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Owner and recovery links are secrets</p><p className="mt-1 text-[0.83rem]">A read-only recovery link can decrypt the workspace. The private owner link also authorises update and deletion. Do not publish either link; the server cannot recreate lost keys or owner tokens.</p></div></div>

          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-3"><Mail size={21} style={{ color: "var(--accent)" }} /><h2 className="font-display text-3xl font-semibold" style={{ color: "var(--heading)" }}>Privacy and grievance contact</h2></div>
            <p className="mt-4 text-[0.86rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>Deployment contact: <strong style={{ color: "var(--heading)" }}>{privacyContact}</strong></p>
            <p className="mt-2 text-[0.8rem] leading-relaxed" style={{ color: "var(--text-faint)" }}>A public deployment must replace the placeholder with a monitored contact and document its response process before inviting real taxpayers.</p>
          </div>

          <div className="flex flex-wrap justify-end gap-3"><Link href="/terms" className="btn btn-secondary">Read terms</Link><Link href="/prepare" className="btn btn-primary">Use local mode <ArrowRight size={16} /></Link></div>
        </div>
      </section>
    </>
  );
}
