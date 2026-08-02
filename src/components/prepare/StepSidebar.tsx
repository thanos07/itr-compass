"use client";

import { Check } from "lucide-react";

export type Step = { id: string; label: string; short: string };

export default function StepSidebar({ steps, current, onSelect }: { steps: Step[]; current: number; onSelect: (index: number) => void }) {
  return (
    <aside className="card h-fit p-3 lg:sticky lg:top-24">
      <div className="mb-2 px-3 pt-2"><p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-faint)" }}>Return workflow</p></div>
      <ol className="space-y-1">
        {steps.map((step, index) => {
          const complete = index < current;
          const active = index === current;
          return (
            <li key={step.id}>
              <button type="button" onClick={() => onSelect(index)} className="flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left transition-colors hover:bg-[var(--accent-soft)]" aria-current={active ? "step" : undefined}>
                <span className={`step-number ${active ? "step-number-active" : complete ? "step-number-complete" : ""}`}>{complete ? <Check size={14} /> : index + 1}</span>
                <span className="min-w-0"><span className="block truncate text-[0.87rem] font-semibold" style={{ color: active ? "var(--heading)" : "var(--text-soft)" }}>{step.label}</span><span className="mt-0.5 block text-[0.7rem]" style={{ color: "var(--text-faint)" }}>{step.short}</span></span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
