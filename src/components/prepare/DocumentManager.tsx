"use client";

import { AlertTriangle, Bot, CheckCircle2, FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { parseDocumentInBrowser, parseDocumentWithWorker } from "@/lib/document-parser";
import { dedupeCandidateClaims, findAcceptedClaimConflict } from "@/lib/claim-safety";
import { formatInr } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace-store";
import type { ParsedDocument, SourceClaim, TaxWorkspace } from "@/lib/workspace-types";

function applyField(workspace: TaxWorkspace, field: string, value: number) {
  const [section, key] = field.split(".") as ["income" | "deductions" | "taxesPaid", string];
  if (!section || !key || !(section in workspace)) return workspace;
  const record = workspace[section] as unknown as Record<string, number>;
  if (!(key in record)) return workspace;
  record[key] = value;
  return workspace;
}

export default function DocumentManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { workspace, update } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [groqConsent, setGroqConsent] = useState(false);
  const [renderConsent, setRenderConsent] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate browser-only transfer consent after SSR. */
  useEffect(() => {
    setGroqConsent(sessionStorage.getItem("itr-file-consent-groq-v1") === "yes");
    setRenderConsent(sessionStorage.getItem("itr-file-consent-render-v1") === "yes");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const changeConsent = (provider: "groq" | "render", value: boolean) => {
    sessionStorage.setItem(`itr-file-consent-${provider}-v1`, value ? "yes" : "no");
    if (provider === "groq") setGroqConsent(value); else setRenderConsent(value);
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setMessage(null);
    const parsed: ParsedDocument[] = [];
    for (const file of Array.from(files)) {
      try {
        parsed.push(await parseDocumentInBrowser(file));
      } catch (browserError) {
        try {
          if (!renderConsent) throw new Error("Browser parsing failed. Enable the optional Render transfer notice below before sending the file to the parser service.");
          parsed.push(await parseDocumentWithWorker(file));
        } catch (workerError) {
          const browserMessage = browserError instanceof Error ? browserError.message : "Browser parser failed.";
          const workerMessage = workerError instanceof Error ? workerError.message : "Worker parser failed.";
          setMessage(`${file.name}: ${browserMessage} ${workerMessage}`);
        }
      }
    }
    if (parsed.length) {
      const existingHashes = new Set(workspace.documents.map((document) => document.sha256).filter(Boolean));
      const unique: ParsedDocument[] = [];
      for (const document of parsed) {
        if (document.sha256 && (existingHashes.has(document.sha256) || unique.some((item) => item.sha256 === document.sha256))) continue;
        unique.push(document);
      }
      if (unique.length) update((draft) => { draft.documents.push(...unique); return draft; });
      if (unique.length !== parsed.length) setMessage(`${parsed.length - unique.length} duplicate file${parsed.length - unique.length === 1 ? " was" : "s were"} skipped by SHA-256 hash.`);
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (id: string) => update((draft) => { draft.documents = draft.documents.filter((doc) => doc.id !== id); return draft; });

  const accept = (documentId: string, claimId: string) => {
    const sourceDocument = workspace.documents.find((doc) => doc.id === documentId);
    const sourceCandidate = sourceDocument?.claims.find((item) => item.id === claimId);
    if (!sourceCandidate || typeof sourceCandidate.value !== "number") return;

    const conflictingAccepted = findAcceptedClaimConflict(
      workspace.documents.flatMap((doc) => doc.claims),
      sourceCandidate,
    );

    if (conflictingAccepted && typeof conflictingAccepted.value === "number") {
      setMessage(
        `Conflict detected for ${sourceCandidate.field}: ${formatInr(conflictingAccepted.value)} is already accepted, while ${sourceCandidate.label} proposes ${formatInr(sourceCandidate.value)}. Review the source evidence before replacing the accepted value.`,
      );
      return;
    }

    update((draft) => {
      const document = draft.documents.find((doc) => doc.id === documentId);
      const candidate = document?.claims.find((item) => item.id === claimId);
      if (!candidate || typeof candidate.value !== "number") return draft;
      candidate.accepted = true;
      return applyField(draft, candidate.field, candidate.value);
    });
    setMessage(null);
  };

  const aiExtract = async (document: ParsedDocument) => {
    if (!groqConsent) { setMessage("Enable the Groq transfer notice before using AI extraction."); return; }
    setAiBusy(document.id);
    setMessage(null);
    try {
      const response = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ processingConsent: true, documentType: document.kind, text: document.preview }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI extraction failed.");
      const claims: SourceClaim[] = data.claims.map((item: { label: string; field: string; value: number; evidence: string; confidence: number }) => ({
        id: crypto.randomUUID(), documentId: document.id, label: item.label, field: item.field, value: item.value, locator: `AI evidence: ${item.evidence}`, confidence: item.confidence, accepted: false,
      }));

      const { uniqueClaims, skipped } = dedupeCandidateClaims(
        document.claims,
        claims,
      );

      update((draft) => {
        const target = draft.documents.find((doc) => doc.id === document.id);
        if (target) target.claims.push(...uniqueClaims);
        return draft;
      });

      setMessage(
        `${uniqueClaims.length} new AI candidate${uniqueClaims.length === 1 ? "" : "s"} added.${skipped ? ` ${skipped} duplicate candidate${skipped === 1 ? " was" : "s were"} skipped.` : ""} Review before accepting.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI extraction failed.");
    } finally {
      setAiBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div
        className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-5 py-8 text-center transition-colors hover:bg-[var(--accent-soft)]"
        style={{ borderColor: "var(--line-strong)", background: "var(--surface)" }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); void addFiles(e.dataTransfer.files); }}
      >
        {busy ? <Loader2 className="animate-spin" size={28} style={{ color: "var(--accent)" }} /> : <UploadCloud size={28} style={{ color: "var(--accent)" }} />}
        <p className="mt-3 font-semibold" style={{ color: "var(--heading)" }}>{busy ? "Reading files…" : "Drop tax files here"}</p>
        <p className="mt-1 max-w-[56ch] text-[0.8rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>PDF, JSON, CSV, XLSX, DOCX, text and ZIP. Browser parsing is attempted first. Raw files are not added to browser storage or Neon.</p>
        <input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.json,.csv,.tsv,.xlsx,.xls,.xlsm,.docx,.txt,.md,.xml,.html,.zip" onChange={(e) => void addFiles(e.target.files)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="flex items-start gap-3 rounded-sm border p-3.5 text-[0.78rem] leading-relaxed" style={{ borderColor: renderConsent ? "var(--accent)" : "var(--line)", background: renderConsent ? "var(--accent-soft)" : "var(--surface)", color: "var(--text-soft)" }}><input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={renderConsent} onChange={(event) => changeConsent("render", event.target.checked)} /><span><strong style={{ color: "var(--heading)" }}>Optional Render parser transfer.</strong> When browser parsing fails, the selected raw file is sent to the configured Render service for in-memory parsing. Hosting region and provider processing terms may involve processing outside India. Clear this box to withdraw consent for later uploads.</span></label>
        <label className="flex items-start gap-3 rounded-sm border p-3.5 text-[0.78rem] leading-relaxed" style={{ borderColor: groqConsent ? "var(--accent)" : "var(--line)", background: groqConsent ? "var(--accent-soft)" : "var(--surface)", color: "var(--text-soft)" }}><input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={groqConsent} onChange={(event) => changeConsent("groq", event.target.checked)} /><span><strong style={{ color: "var(--heading)" }}>Optional Groq AI transfer.</strong> AI extraction sends a shortened, pattern-redacted text preview—not the raw file—to Groq. Redaction reduces risk but is not guaranteed. Clear this box to withdraw consent for later requests.</span></label>
      </div>

      {message ? <div className="callout callout-info"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><p>{message}</p></div> : null}

      {workspace.documents.length === 0 ? (
        <div className="card-solid p-5 text-[0.86rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>
          Recommended starting set: AIS, TIS, Form 16, Form 26AS and the portal prefill JSON. Add bank, broker, rental, foreign-tax or business records only when applicable.
        </div>
      ) : (
        <div className="space-y-4">
          {workspace.documents.map((document) => (
            <article key={document.id} className="card overflow-hidden">
              <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--line)" }}>
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><FileText size={19} /></span>
                  <div className="min-w-0"><p className="truncate font-semibold" style={{ color: "var(--heading)" }}>{document.name}</p><div className="mt-1 flex flex-wrap gap-2"><span className="badge badge-blue">{document.kind}</span><span className="text-[0.73rem]" style={{ color: "var(--text-faint)" }}>{document.parser} parser · {document.pagesOrRows} units</span></div></div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void aiExtract(document)} disabled={aiBusy === document.id || !groqConsent} className="btn btn-secondary !px-3 !py-2 text-[0.78rem]">{aiBusy === document.id ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />} AI fallback</button>
                  <button type="button" onClick={() => remove(document.id)} className="btn btn-ghost !px-2 !py-2" aria-label={`Remove ${document.name}`}><Trash2 size={15} /></button>
                </div>
              </div>

              {document.warnings.length ? <div className="border-b px-4 py-3" style={{ borderColor: "var(--line)", background: "var(--warning-mist)" }}>{document.warnings.map((warning) => <p key={warning} className="text-[0.78rem] text-warning">{warning}</p>)}</div> : null}

              <div className="p-4">
                <div className="flex items-center justify-between"><p className="field-label !mb-0">Extracted candidates</p><span className="text-[0.72rem]" style={{ color: "var(--text-faint)" }}>{document.claims.length} found</span></div>
                {document.claims.length === 0 ? <p className="mt-3 text-[0.82rem]" style={{ color: "var(--text-soft)" }}>No safe candidate matched automatically. Enter values manually or use the optional AI fallback.</p> : (
                  <div className="mt-3 space-y-2">
                    {document.claims.map((candidate) => (
                      <div key={candidate.id} className="flex flex-col gap-3 rounded-sm border p-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: candidate.accepted ? "color-mix(in srgb, var(--success) 35%, var(--line))" : "var(--line)", background: candidate.accepted ? "var(--success-mist)" : "var(--surface)" }}>
                        <div><p className="text-[0.84rem] font-semibold" style={{ color: "var(--heading)" }}>{candidate.label}: {typeof candidate.value === "number" ? formatInr(candidate.value) : candidate.value}</p><p className="mt-1 text-[0.72rem]" style={{ color: "var(--text-faint)" }}>{candidate.field} · {Math.round(candidate.confidence * 100)}% · {candidate.locator}</p></div>
                        <button type="button" disabled={candidate.accepted} onClick={() => accept(document.id, candidate.id)} className={`btn !px-3 !py-2 text-[0.78rem] ${candidate.accepted ? "btn-secondary" : "btn-primary"}`}>{candidate.accepted ? <><CheckCircle2 size={14} /> Applied</> : "Accept value"}</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
