"use client";

import {
  CloudDownload,
  CloudUpload,
  Copy,
  Download,
  FileText,
  FileUp,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  decryptWorkspace,
  encryptWorkspace,
  generateCloudOwnerToken,
} from "@/lib/cloud-crypto";
import {
  createRestorablePdf,
  importWorkspaceFromRestorablePdf,
  RESTORABLE_PDF_MIN_PASSWORD_LENGTH,
  restorablePdfFileName,
} from "@/lib/pdf-workspace-report";
import { useWorkspace } from "@/lib/workspace-store";
import type { TaxWorkspace } from "@/lib/workspace-types";

type PdfMode = "download" | "import" | null;

// Prevent the same cloud workspace from being restored again whenever
// Step 7 unmounts and remounts during navigation between workpaper steps.
// This resets on a real browser page reload.
const autoLoadedCloudIds = new Set<string>();

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function WorkspaceTools() {
  const { workspace, importWorkspace, reset } = useWorkspace();

  const inputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [pdfMode, setPdfMode] = useState<PdfMode>(null);
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState("");
  const [pdfPasswordConfirm, setPdfPasswordConfirm] = useState("");

  const [cloudId, setCloudId] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [writeToken, setWriteToken] = useState("");
  const [deleteToken, setDeleteToken] = useState("");
  const [recoveryLink, setRecoveryLink] = useState("");
  const [ownerLink, setOwnerLink] = useState("");
  const [cloudConsent, setCloudConsent] = useState(false);

  const closePdfPanel = () => {
    setPdfMode(null);
    setPendingPdf(null);
    setPdfPassword("");
    setPdfPasswordConfirm("");
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], {
      type: "application/json",
    });

    downloadBlob(
      blob,
      `itr-file-${workspace.assessmentYear}-${workspace.id.slice(0, 8)}.itrwork.json`,
    );

    setMessage("Portable workspace backup downloaded.");
  };

  const beginPdfDownload = () => {
    setMessage(null);
    setPendingPdf(null);
    setPdfPassword("");
    setPdfPasswordConfirm("");
    setPdfMode("download");
  };

  const downloadPdf = async () => {
    if (pdfPassword.length < RESTORABLE_PDF_MIN_PASSWORD_LENGTH) {
      setMessage(
        `Use a PDF backup password of at least ${RESTORABLE_PDF_MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    if (pdfPassword !== pdfPasswordConfirm) {
      setMessage("The two PDF backup passwords do not match.");
      return;
    }

    setPdfBusy(true);
    setMessage(null);

    try {
      const bytes = await createRestorablePdf(workspace, pdfPassword);
      const arrayBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });

      downloadBlob(blob, restorablePdfFileName(workspace));
      closePdfPanel();

      setMessage(
        "Restorable PDF downloaded. Keep its password separately; it cannot be recovered. The visible report is readable without the password, while the embedded workspace is encrypted.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not create the PDF report.",
      );
    } finally {
      setPdfBusy(false);
    }
  };

  const importJson = async (file: File) => {
    if (file.size > 2_000_000) {
      setMessage("Workspace backup exceeds the 2 MB JSON import limit.");
      return;
    }

    const parsed = JSON.parse(await file.text()) as TaxWorkspace;
    importWorkspace(parsed);
    setMessage("Workspace imported into this browser.");
  };

  const importFile = async (file?: File) => {
    if (!file) return;

    setMessage(null);

    const lower = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");

    if (isPdf) {
      if (file.size > 10_000_000) {
        setMessage("The PDF exceeds the 10 MB import limit.");
        return;
      }

      setPendingPdf(file);
      setPdfPassword("");
      setPdfPasswordConfirm("");
      setPdfMode("import");
      return;
    }

    try {
      await importJson(file);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not import workspace.",
      );
    }
  };

  const importPdf = async () => {
    if (!pendingPdf) {
      setMessage("Select an app-generated PDF report.");
      return;
    }

    if (pdfPassword.length < RESTORABLE_PDF_MIN_PASSWORD_LENGTH) {
      setMessage(
        `Enter the PDF backup password of at least ${RESTORABLE_PDF_MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    setPdfBusy(true);
    setMessage(null);

    try {
      const restored = await importWorkspaceFromRestorablePdf(
        pendingPdf,
        pdfPassword,
      );

      importWorkspace(restored);
      closePdfPanel();

      setMessage(
        "The encrypted workspace embedded in the PDF was restored into this browser.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not restore the PDF workspace.",
      );
    } finally {
      setPdfBusy(false);
    }
  };

  const saveCloud = async () => {
    if (!cloudConsent) {
      setMessage(
        "Confirm the optional encrypted Neon storage notice before saving.",
      );
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const isUpdate = Boolean(cloudId && writeToken);
      const nextWriteToken = isUpdate ? writeToken : generateCloudOwnerToken();
      const nextDeleteToken = isUpdate ? deleteToken : generateCloudOwnerToken();
      const encrypted = await encryptWorkspace(workspace, recoveryKey || undefined);

      const response = await fetch("/api/cloud", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isUpdate
            ? {
                action: "update",
                id: cloudId,
                writeToken: nextWriteToken,
                ciphertext: encrypted.ciphertext,
                iv: encrypted.iv,
                salt: encrypted.salt,
                schemaVersion: 2,
              }
            : {
                action: "create",
                writeToken: nextWriteToken,
                deleteToken: nextDeleteToken,
                ciphertext: encrypted.ciphertext,
                iv: encrypted.iv,
                salt: encrypted.salt,
                schemaVersion: 2,
              },
        ),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cloud save failed.");

      const readLink = `${window.location.origin}/prepare?cloud=${encodeURIComponent(
        data.id,
      )}#key=${encodeURIComponent(encrypted.recoveryKey)}`;
      const manageLink = `${readLink}&write=${encodeURIComponent(
        nextWriteToken,
      )}&delete=${encodeURIComponent(nextDeleteToken)}`;

      setCloudId(data.id);
      setRecoveryKey(encrypted.recoveryKey);
      setWriteToken(nextWriteToken);
      setDeleteToken(nextDeleteToken);
      setRecoveryLink(readLink);
      setOwnerLink(manageLink);
      setMessage(
        isUpdate
          ? "Encrypted workspace updated and expiry extended to 90 days."
          : "Encrypted workspace created for 90 days. Save the owner link securely; the server stores only token hashes.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cloud save failed.");
    } finally {
      setBusy(false);
    }
  };

  const loadCloud = async (id = cloudId, key = recoveryKey) => {
    if (!id || !key) {
      setMessage("Enter both workspace ID and recovery key.");
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/cloud", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "load", id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cloud load failed.");

      const decrypted = await decryptWorkspace(data, key);
      importWorkspace(decrypted);
      setMessage("Encrypted workspace restored into this browser.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Cloud load failed. Check the ID and recovery key.",
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteCloud = async () => {
    if (!cloudId || !deleteToken) {
      setMessage(
        "Open the private owner link or enter the workspace ID and deletion token.",
      );
      return;
    }

    if (!confirm("Permanently delete this encrypted cloud workspace? This cannot be undone.")) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/cloud", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete", id: cloudId, deleteToken }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cloud deletion failed.");

      setCloudId("");
      setRecoveryKey("");
      setWriteToken("");
      setDeleteToken("");
      setRecoveryLink("");
      setOwnerLink("");
      setMessage("Encrypted cloud workspace deleted immediately.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cloud deletion failed.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("cloud");

    const hash = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );

    const key = hash.get("key");
    const write = hash.get("write");
    const del = hash.get("delete");

    if (id) setCloudId(id);
    if (key) setRecoveryKey(key);
    if (write) setWriteToken(write);
    if (del) setDeleteToken(del);

    // Restore only once during the current browser page lifecycle.
    // Moving between Steps 5, 6 and 7 remounts this component, but must
    // not restore the older cloud copy again and overwrite newer local edits.
    if (id && key && !autoLoadedCloudIds.has(id)) {
      autoLoadedCloudIds.add(id);
      void loadCloud(id, key);
    }

    // Recovery URL values are intentionally inspected only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={download} className="card card-hover flex items-center gap-3 p-4 text-left">
          <Download size={20} style={{ color: "var(--accent)" }} />
          <span>
            <span className="block text-[0.88rem] font-semibold" style={{ color: "var(--heading)" }}>Download backup</span>
            <span className="mt-0.5 block text-[0.73rem]" style={{ color: "var(--text-faint)" }}>Portable .itrwork JSON</span>
          </span>
        </button>

        <button type="button" onClick={beginPdfDownload} className="card card-hover flex items-center gap-3 p-4 text-left">
          <FileText size={20} style={{ color: "var(--accent)" }} />
          <span>
            <span className="block text-[0.88rem] font-semibold" style={{ color: "var(--heading)" }}>Download PDF report</span>
            <span className="mt-0.5 block text-[0.73rem]" style={{ color: "var(--text-faint)" }}>Readable and restorable</span>
          </span>
        </button>

        <button type="button" onClick={() => inputRef.current?.click()} className="card card-hover flex items-center gap-3 p-4 text-left">
          <FileUp size={20} style={{ color: "var(--accent)" }} />
          <span>
            <span className="block text-[0.88rem] font-semibold" style={{ color: "var(--heading)" }}>Import backup</span>
            <span className="mt-0.5 block text-[0.73rem]" style={{ color: "var(--text-faint)" }}>JSON or app PDF</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (confirm("Reset the local return workspace?")) reset();
          }}
          className="card card-hover flex items-center gap-3 p-4 text-left"
        >
          <RotateCcw size={20} style={{ color: "var(--danger)" }} />
          <span>
            <span className="block text-[0.88rem] font-semibold" style={{ color: "var(--heading)" }}>Reset workspace</span>
            <span className="mt-0.5 block text-[0.73rem]" style={{ color: "var(--text-faint)" }}>Remove local structured data</span>
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".json,.itrwork.json,.pdf,application/json,application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            void importFile(file);
          }}
        />
      </div>

      {pdfMode ? (
        <div className="card-solid p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold" style={{ color: "var(--heading)" }}>
                {pdfMode === "download" ? "Create a restorable PDF" : "Restore from PDF"}
              </p>
              <p className="mt-1 max-w-[70ch] text-[0.8rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>
                {pdfMode === "download"
                  ? "The PDF contains a readable workpaper plus an encrypted workspace attachment. The password protects the embedded backup, not the visible report."
                  : `Selected file: ${pendingPdf?.name || "No PDF selected"}. Only an original PDF generated by this app can restore the workspace.`}
              </p>
            </div>

            <button type="button" className="btn btn-ghost !p-2" onClick={closePdfPanel} disabled={pdfBusy} aria-label="Close PDF backup panel">
              <X size={17} />
            </button>
          </div>

          <div className={`mt-5 grid gap-4 ${pdfMode === "download" ? "sm:grid-cols-2" : "sm:grid-cols-[1fr_auto] sm:items-end"}`}>
            <label>
              <span className="field-label">PDF backup password</span>
              <input
                type="password"
                autoComplete="new-password"
                className="input"
                value={pdfPassword}
                minLength={RESTORABLE_PDF_MIN_PASSWORD_LENGTH}
                onChange={(event) => setPdfPassword(event.target.value)}
                placeholder={`Minimum ${RESTORABLE_PDF_MIN_PASSWORD_LENGTH} characters`}
              />
            </label>

            {pdfMode === "download" ? (
              <label>
                <span className="field-label">Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  value={pdfPasswordConfirm}
                  minLength={RESTORABLE_PDF_MIN_PASSWORD_LENGTH}
                  onChange={(event) => setPdfPasswordConfirm(event.target.value)}
                  placeholder="Enter the same password again"
                />
              </label>
            ) : null}

            <button
              type="button"
              className="btn btn-primary sm:self-end"
              disabled={pdfBusy}
              onClick={() => void (pdfMode === "download" ? downloadPdf() : importPdf())}
            >
              {pdfBusy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : pdfMode === "download" ? (
                <FileText size={15} />
              ) : (
                <FileUp size={15} />
              )}
              {pdfMode === "download" ? "Create PDF" : "Restore workspace"}
            </button>
          </div>

          <p className="mt-3 text-[0.74rem] leading-relaxed" style={{ color: "var(--text-faint)" }}>
            Keep this password separately. It is never saved by the app and cannot be recovered. Also keep the standalone JSON backup, because PDF editing, printing, scanning or optimization may remove embedded attachments.
          </p>
        </div>
      ) : null}

      <div className="card-solid p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold" style={{ color: "var(--heading)" }}>Optional encrypted cloud save</p>
            <p className="mt-1 max-w-[65ch] text-[0.8rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>
              The browser encrypts the structured workspace with AES-GCM before Neon receives it. Separate owner tokens authorize updates and immediate deletion; only token hashes are stored.
            </p>
          </div>
          <button type="button" onClick={() => void saveCloud()} disabled={busy || !cloudConsent} className="btn btn-primary shrink-0">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <CloudUpload size={15} />}
            {cloudId && writeToken ? "Update encrypted" : "Save encrypted"}
          </button>
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-sm border p-3 text-[0.78rem] leading-relaxed" style={{ borderColor: "var(--line)", color: "var(--text-soft)" }}>
          <input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={cloudConsent} onChange={(event) => setCloudConsent(event.target.checked)} />
          <span>I understand that ciphertext, IV, salt, token hashes and expiry metadata will be stored in the configured Neon database for up to 90 days, and I can delete it with the owner link.</span>
        </label>

        {recoveryLink ? (
          <div className="mt-5 space-y-3 rounded-sm border p-3.5" style={{ borderColor: "var(--line)", background: "var(--accent-soft)" }}>
            <div>
              <p className="field-label">Read-only recovery link</p>
              <div className="flex gap-2">
                <input readOnly className="input text-[0.78rem]" value={recoveryLink} />
                <button type="button" className="btn btn-secondary !px-3" onClick={() => void navigator.clipboard.writeText(recoveryLink)} aria-label="Copy recovery link"><Copy size={15} /></button>
              </div>
            </div>
            <div>
              <p className="field-label">Private owner link - update and delete</p>
              <div className="flex gap-2">
                <input readOnly className="input text-[0.78rem]" value={ownerLink} />
                <button type="button" className="btn btn-secondary !px-3" onClick={() => void navigator.clipboard.writeText(ownerLink)} aria-label="Copy owner link"><Copy size={15} /></button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label><span className="field-label">Workspace ID</span><input className="input" value={cloudId} onChange={(event) => setCloudId(event.target.value)} /></label>
          <label><span className="field-label">Recovery key</span><input className="input" value={recoveryKey} onChange={(event) => setRecoveryKey(event.target.value)} /></label>
          <button type="button" onClick={() => void loadCloud()} disabled={busy} className="btn btn-secondary"><CloudDownload size={15} /> Restore</button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label><span className="field-label">Owner update token</span><input className="input" value={writeToken} onChange={(event) => setWriteToken(event.target.value)} /></label>
          <label><span className="field-label">Owner deletion token</span><input className="input" value={deleteToken} onChange={(event) => setDeleteToken(event.target.value)} /></label>
          <button type="button" onClick={() => void deleteCloud()} disabled={busy || !cloudId || !deleteToken} className="btn btn-secondary" style={{ color: "var(--danger)" }}><Trash2 size={15} /> Delete cloud</button>
        </div>
      </div>

      {message ? <div className="callout callout-info"><p>{message}</p></div> : null}
    </div>
  );
}