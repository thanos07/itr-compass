"use client";

import { AlertTriangle, CheckCircle2, FileCheck2, Scale, ShieldAlert } from "lucide-react";
import WorkspaceTools from "@/components/prepare/WorkspaceTools";
import { formatInr } from "@/lib/format";
import { compareRegimes } from "@/lib/tax/engine";
import { selectItrForm } from "@/lib/tax/form-selector";
import { useWorkspace } from "@/lib/workspace-store";

function TaxCard({ title, result, recommended }: { title: string; result: ReturnType<typeof compareRegimes>["newRegime"]; recommended: boolean }) {
  return (
    <div className="card overflow-hidden" style={{ borderColor: recommended ? "var(--accent)" : result.supported ? "var(--line)" : "var(--danger)" }}>
      <div className="flex items-center justify-between border-b p-5" style={{ borderColor: "var(--line)", background: recommended ? "var(--accent-soft)" : "var(--surface)" }}>
        <div><p className="font-display text-2xl font-semibold" style={{ color: "var(--heading)" }}>{title}</p><p className="mt-1 text-[0.76rem]" style={{ color: "var(--text-faint)" }}>{result.supported ? "Estimated AY 2026–27" : "Calculation blocked"}</p></div>
        {recommended ? <span className="badge badge-blue">Lower estimate</span> : !result.supported ? <span className="badge badge-danger">unsupported</span> : null}
      </div>
      <dl className="divide-y" style={{ borderColor: "var(--line)" }}>
        {[
          ["Taxable salary", result.taxableSalary],
          ["Normal taxable income", result.normalTaxableIncome],
          ["Special-rate income", result.specialIncome],
          ["Deductions applied", result.deductions],
          ["Slab tax", result.slabTax],
          ["Special-rate tax", result.specialTax],
          ["Rebate / marginal relief", result.rebate + result.rebateMarginalRelief],
          ["Cess", result.cess],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex items-center justify-between px-5 py-3 text-[0.82rem]"><dt style={{ color: "var(--text-soft)" }}>{label}</dt><dd className="font-mono font-semibold" style={{ color: "var(--heading)" }}>{formatInr(Number(value))}</dd></div>
        ))}
      </dl>
      <div className="border-t p-5" style={{ borderColor: "var(--line)" }}>
        {result.supported ? <div className="flex items-end justify-between"><div><p className="field-label !mb-1">Estimated tax</p><p className="font-display text-3xl font-semibold" style={{ color: "var(--heading)" }}>{formatInr(result.totalTax)}</p></div><div className="text-right"><p className="text-[0.72rem]" style={{ color: "var(--text-faint)" }}>{result.payable ? "Balance payable" : "Potential refund"}</p><p className="mt-1 font-mono text-sm font-semibold" style={{ color: result.payable ? "var(--danger)" : "var(--success)" }}>{formatInr(result.payable || result.refund)}</p></div></div> : <div><p className="font-semibold" style={{ color: "var(--danger)" }}>No final estimate shown</p><ul className="mt-2 space-y-1.5 text-[0.78rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>{result.blockingIssues.map((issue) => <li key={issue}>• {issue}</li>)}</ul></div>}
      </div>
    </div>
  );
}

export default function ReviewPanel() {
  const { workspace } = useWorkspace();
  const comparison = compareRegimes(workspace);
  const form = selectItrForm(workspace);
  const acceptedClaims = workspace.documents.flatMap((doc) => doc.claims).filter((claim) => claim.accepted).length;
  const allWarnings = [...comparison.oldRegime.warnings, ...comparison.newRegime.warnings];
  const allBlockers = [...comparison.oldRegime.blockingIssues, ...comparison.newRegime.blockingIssues];
  const completedAgents = ["intake", "reconciliation", "legal", "review"].filter((key) => workspace.agentRuns[key as keyof typeof workspace.agentRuns]).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5"><p className="field-label">Documents</p><p className="font-display text-3xl font-semibold" style={{ color: "var(--heading)" }}>{workspace.documents.length}</p><p className="mt-1 text-[0.76rem]" style={{ color: "var(--text-faint)" }}>source files registered</p></div>
        <div className="card p-5"><p className="field-label">Accepted claims</p><p className="font-display text-3xl font-semibold" style={{ color: "var(--heading)" }}>{acceptedClaims}</p><p className="mt-1 text-[0.76rem]" style={{ color: "var(--text-faint)" }}>copied to the workpaper</p></div>
        <div className="card p-5"><p className="field-label">Regime comparison</p><p className="font-display text-3xl font-semibold" style={{ color: comparison.difference === null ? "var(--warning)" : "var(--accent)" }}>{comparison.difference === null ? "Blocked" : formatInr(comparison.difference)}</p><p className="mt-1 text-[0.76rem]" style={{ color: "var(--text-faint)" }}>{comparison.recommended ? `${comparison.recommended} regime currently lower` : "resolve calculation boundaries first"}</p></div>
        <div className="card p-5"><p className="field-label">Agent checks</p><p className="font-display text-3xl font-semibold" style={{ color: completedAgents === 4 ? "var(--success)" : "var(--warning)" }}>{completedAgents}/4</p><p className="mt-1 text-[0.76rem]" style={{ color: "var(--text-faint)" }}>controlled Groq workflow completed</p></div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="eyebrow"><span className="trace-tick" />FORM SCREENING</p><h3 className="mt-3 font-display text-3xl font-semibold" style={{ color: "var(--heading)" }}>{form.title}</h3></div>
          <span className={`badge ${form.status === "candidate" ? "badge-blue" : "badge-warning"} text-[0.8rem]`}>{form.form}</span>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div><p className="field-label">Why</p><ul className="space-y-2">{form.reasons.map((reason) => <li key={reason} className="flex gap-2 text-[0.84rem] leading-relaxed" style={{ color: "var(--text-soft)" }}><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" />{reason}</li>)}</ul></div>
          <div><p className="field-label">Blocks simplified form</p>{form.blockers.length ? <ul className="space-y-2">{form.blockers.map((blocker) => <li key={blocker} className="flex gap-2 text-[0.84rem] leading-relaxed" style={{ color: "var(--text-soft)" }}><ShieldAlert size={15} className="mt-0.5 shrink-0 text-danger" />{blocker}</li>)}</ul> : <p className="text-[0.84rem]" style={{ color: "var(--text-soft)" }}>No collected blocker was found.</p>}</div>
          <div><p className="field-label">Confirm before filing</p><ul className="space-y-2">{form.cautions.map((caution) => <li key={caution} className="flex gap-2 text-[0.84rem] leading-relaxed" style={{ color: "var(--text-soft)" }}><AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" />{caution}</li>)}</ul></div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <TaxCard title="New regime" result={comparison.newRegime} recommended={comparison.recommended === "new"} />
        <TaxCard title="Old regime" result={comparison.oldRegime} recommended={comparison.recommended === "old"} />
      </div>

      {allBlockers.length ? <div className="callout callout-danger"><ShieldAlert size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Final tax output intentionally blocked</p><ul className="mt-2 space-y-1.5 text-[0.82rem]">{Array.from(new Set(allBlockers)).map((issue) => <li key={issue}>• {issue}</li>)}</ul></div></div> : null}
      {allWarnings.length ? <div className="callout callout-warning"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Calculation boundaries</p><ul className="mt-2 space-y-1.5 text-[0.82rem]">{Array.from(new Set(allWarnings)).map((warning) => <li key={warning}>• {warning}</li>)}</ul></div></div> : null}

      {completedAgents < 4 ? <div className="callout callout-warning"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><p>The four-agent review is optional but incomplete. Open the Agent desk before relying on this handoff summary.</p></div> : null}

      <div className="callout callout-danger"><Scale size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Not a filing confirmation</p><p className="mt-1 text-[0.83rem]">Use the notified AY 2026-27 ITR form and official validation utility. This workspace does not prove legal eligibility, submit the return, pay tax or e-verify.</p></div></div>

      <div className="card p-5 sm:p-6"><div className="flex items-center gap-3"><FileCheck2 size={20} style={{ color: "var(--accent)" }} /><div><p className="font-semibold" style={{ color: "var(--heading)" }}>Workspace and handoff</p><p className="mt-1 text-[0.78rem]" style={{ color: "var(--text-soft)" }}>Export locally or enable optional client-encrypted Neon sync.</p></div></div><div className="mt-5"><WorkspaceTools /></div></div>
    </div>
  );
}
