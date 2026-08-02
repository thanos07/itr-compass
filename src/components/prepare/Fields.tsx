"use client";

import type { ReactNode } from "react";

export function CurrencyField({ label, value, onChange, help, disabled = false, min = 0 }: { label: string; value: number; onChange: (value: number) => void; help?: string; disabled?: boolean; min?: number }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <span className="currency-input block">
        <input
          className="input"
          type="number"
          min={min}
          step="1"
          value={value || ""}
          placeholder="0"
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
        />
      </span>
      {help ? <span className="field-help block">{help}</span> : null}
    </label>
  );
}

export function NumberField({ label, value, onChange, min = 0, max, help }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; help?: string }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input className="input" type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
      {help ? <span className="field-help block">{help}</span> : null}
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder, help }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; help?: string }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {help ? <span className="field-help block">{help}</span> : null}
    </label>
  );
}

export function SelectField({ label, value, onChange, children, help }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; help?: string }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
      {help ? <span className="field-help block">{help}</span> : null}
    </label>
  );
}

export function BooleanCard({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-sm border p-3.5 transition-colors" style={{ borderColor: checked ? "var(--accent)" : "var(--line)", background: checked ? "var(--accent-soft)" : "var(--surface)" }}>
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span><span className="block text-[0.9rem] font-semibold" style={{ color: "var(--heading)" }}>{label}</span>{description ? <span className="mt-1 block text-[0.78rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>{description}</span> : null}</span>
    </label>
  );
}
