import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Calculator,
  Database,
  FileCheck2,
  FileLock2,
  FileSearch,
  Landmark,
  Scale,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";

const workflow = [
  { icon: UploadCloud, title: "Collect", text: "Add Form 16, AIS/TIS, 26AS, prefill JSON, bank and broker files." },
  { icon: FileSearch, title: "Extract", text: "Parse locally first, keep source locators, and send only residual text to AI with consent." },
  { icon: BadgeCheck, title: "Reconcile", text: "Review every claim, resolve duplicates and compare source totals before calculation." },
  { icon: Calculator, title: "Compute", text: "Run deterministic AY 2026-27 old/new regime estimates with explicit limitations." },
  { icon: Bot, title: "Agent review", text: "Run four Groq agents for intake, reconciliation, cited legal retrieval and final review." },
  { icon: FileCheck2, title: "File", text: "Use the final workpaper to complete and validate the return on the official portal." },
];

const architecture = [
  { icon: ShieldCheck, label: "Vercel", text: "Next.js interface and guarded API routes" },
  { icon: Database, label: "Neon", text: "Optional client-encrypted workspace sync" },
  { icon: FileLock2, label: "Render", text: "Stateless parsing fallback; no raw-file persistence" },
  { icon: Sparkles, label: "Groq", text: "Four controlled agents plus optional extraction" },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--line)" }}>
        <div className="hero-orb -right-40 -top-40" />
        <div className="container-page relative grid gap-12 py-20 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <p className="eyebrow"><span className="trace-tick" />ITR COMPASS · AY 2026–27 · INDIA</p>
            <h1 className="mt-5 max-w-[16ch] font-display text-[clamp(2.7rem,6vw,5.1rem)] font-semibold leading-[1.01] tracking-[-0.035em]" style={{ color: "var(--heading)" }}>
              Your tax return, <span style={{ color: "var(--accent)" }}>tied to evidence.</span>
            </h1>
            <p className="mt-6 max-w-[58ch] text-[1.08rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>
              ITR Compass is a privacy-first Indian ITR preparation workspace that reads common tax files, keeps claim-level source references, compares tax regimes and stops before payment, submission and e-verification.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/prepare" className="btn btn-primary">Start a return <ArrowRight size={16} /></Link>
              <Link href="/legal" className="btn btn-secondary"><Scale size={16} /> See legal basis</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[0.8rem]" style={{ color: "var(--text-faint)" }}>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> Raw files are not stored by default</span>
              <span className="inline-flex items-center gap-1.5"><Landmark size={14} /> Final filing remains on the government portal</span>
            </div>
          </div>

          <div className="card relative overflow-hidden p-4 sm:p-6">
            <div className="absolute inset-0 soft-grid opacity-70" />
            <div className="relative card-solid overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--line)" }}>
                <div>
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em]" style={{ color: "var(--text-faint)" }}>Return workspace</p>
                  <p className="mt-1 font-semibold" style={{ color: "var(--heading)" }}>AY 2026–27 · Draft</p>
                </div>
                <span className="badge badge-success">Local first</span>
              </div>
              <div className="grid grid-cols-3 border-b" style={{ borderColor: "var(--line)" }}>
                <div className="metric"><p className="metric-value text-2xl">06</p><p className="metric-label">Sources received</p></div>
                <div className="metric"><p className="metric-value text-2xl">14</p><p className="metric-label">Claims reconciled</p></div>
                <div className="metric"><p className="metric-value text-2xl">02</p><p className="metric-label">Items unresolved</p></div>
              </div>
              <div className="space-y-3 p-5">
                {[
                  ["Form 16", "Salary + TDS", "Matched", "success"],
                  ["AIS / TIS", "Interest + securities", "Review", "warning"],
                  ["Form 26AS", "Tax credits", "Matched", "success"],
                  ["Broker statement", "Capital gains", "Needs mapping", "blue"],
                ].map(([name, detail, status, tone]) => (
                  <div key={name} className="flex items-center justify-between gap-4 rounded-sm border px-3.5 py-3" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
                    <div className="min-w-0"><p className="truncate text-[0.9rem] font-semibold" style={{ color: "var(--heading)" }}>{name}</p><p className="mt-0.5 text-[0.75rem]" style={{ color: "var(--text-faint)" }}>{detail}</p></div>
                    <span className={`badge badge-${tone}`}>{status}</span>
                  </div>
                ))}
              </div>
              <div className="border-t p-5" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-end justify-between"><div><p className="text-[0.72rem] uppercase tracking-[0.09em]" style={{ color: "var(--text-faint)" }}>Estimated better regime</p><p className="mt-1 font-display text-2xl font-semibold" style={{ color: "var(--heading)" }}>New regime</p></div><p className="font-mono text-sm font-semibold" style={{ color: "var(--accent)" }}>₹18,720 lower</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-py">
        <div className="container-page">
          <p className="eyebrow"><span className="trace-tick" />WORKFLOW</p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <h2 className="font-display text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-tight tracking-[-0.025em]" style={{ color: "var(--heading)" }}>From scattered documents to a defensible workpaper.</h2>
            <p className="max-w-[65ch] text-[1rem] leading-relaxed lg:justify-self-end" style={{ color: "var(--text-soft)" }}>The workflow is evidence-first: imported values remain reviewable, section 44ADA is never inferred from an occupation label, missing figures are not invented, and AIS remains reconciliation evidence rather than conclusive law.</p>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {workflow.map((item, index) => (
              <div key={item.title} className="card card-hover relative p-5">
                <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-sm" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}><item.icon size={19} /></span><span className="font-mono text-[0.68rem]" style={{ color: "var(--text-faint)" }}>0{index + 1}</span></div>
                <h3 className="mt-5 font-display text-xl font-semibold" style={{ color: "var(--heading)" }}>{item.title}</h3>
                <p className="mt-2 text-[0.86rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-py" style={{ background: "var(--page-alt)" }}>
        <div className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="eyebrow"><span className="trace-tick" />LEGAL GUARDRAILS</p>
            <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.3rem)] font-semibold leading-tight tracking-[-0.025em]" style={{ color: "var(--heading)" }}>AI extracts. Rules calculate. You decide.</h2>
            <p className="mt-5 max-w-[57ch] leading-relaxed" style={{ color: "var(--text-soft)" }}>The model is never allowed to invent a tax position or replace the notified ITR utility. Calculations are versioned by assessment year, source links are visible and unsupported cases fail with a warning instead of a confident guess.</p>
            <Link href="/legal" className="btn btn-secondary mt-7">Read methodology <ArrowRight size={15} /></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["No direct filing", "The product prepares and reconciles; it does not enter portal credentials, pay tax, submit or e-verify."],
              ["No invented figures", "Missing cash, basis, dates, classifications or deduction proofs stay unresolved."],
              ["Current-year rules", "AY 2026-27 slabs and form restrictions are separated from future tax-year logic."],
              ["Explicit boundaries", "Surcharge, complex loss set-off, DTAA and disputed classifications are routed for professional review."],
            ].map(([title, text]) => (
              <div key={title} className="card p-5"><FileCheck2 size={19} style={{ color: "var(--accent)" }} /><h3 className="mt-4 font-semibold" style={{ color: "var(--heading)" }}>{title}</h3><p className="mt-2 text-[0.86rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>{text}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-py">
        <div className="container-page">
          <div className="card overflow-hidden">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="p-7 sm:p-10 lg:p-12" style={{ background: "var(--nav-bg)", color: "white" }}>
                <p className="eyebrow !text-royal-light"><span className="trace-tick !bg-royal-light" />FREE-TIER ARCHITECTURE</p>
                <h2 className="mt-5 font-display text-3xl font-semibold leading-tight sm:text-4xl">Deployable without storing raw tax files.</h2>
                <p className="mt-4 max-w-[48ch] text-[0.95rem] leading-relaxed text-mist-soft">A Vercel web app, optional Neon encrypted sync, stateless Render parser and Groq-powered controlled agents. Each integration can be disabled independently.</p>
              </div>
              <div className="grid gap-px sm:grid-cols-2" style={{ background: "var(--line)" }}>
                {architecture.map((item) => (
                  <div key={item.label} className="p-6 sm:p-7" style={{ background: "var(--surface-solid)" }}><item.icon size={21} style={{ color: "var(--accent)" }} /><p className="mt-4 font-display text-xl font-semibold" style={{ color: "var(--heading)" }}>{item.label}</p><p className="mt-2 text-[0.85rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>{item.text}</p></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-24">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-lg bg-royal px-6 py-10 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-12">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/15" />
            <div className="relative"><p className="font-mono text-[0.7rem] uppercase tracking-[0.13em] text-royal-light">BEGIN LOCALLY</p><h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Prepare the workpaper before opening the portal.</h2><p className="mt-3 max-w-[60ch] text-white/75">No account is required for local mode. Your browser keeps the structured workspace until you export, reset or enable encrypted cloud save.</p></div>
            <Link href="/prepare" className="btn mt-7 bg-white text-navy hover:bg-cream lg:mt-0">Start now <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
