"use client";

import Papa from "papaparse";
import { redactBrowserPreview } from "@/lib/security/redaction";
import type { ParsedDocument, SourceClaim } from "@/lib/workspace-types";

const MAX_BROWSER_TEXT = 800_000;

const AIS_TOKEN = /\bais\b/;
const TIS_TOKEN = /\btis\b/;
const ITR_TOKEN = /\bitr(?:[-\s]?[1-7])?\b/;
const ISIN_TOKEN = /\bisin\b/;

export function redactSensitive(text: string) {
  return redactBrowserPreview(text);
}

export function detectKind(text: string, fileName: string): ParsedDocument["kind"] {
  const sample = `${fileName}\n${text.slice(0, 100000)}`.toLowerCase();
  if (sample.includes("form no. 16") || sample.includes("certificate under section 203") || sample.includes("part b (annexure)")) return "form16";
  if (sample.includes("annual information statement") || sample.includes("information category") && AIS_TOKEN.test(sample)) return "ais";
  if (sample.includes("taxpayer information summary") || TIS_TOKEN.test(sample)) return "tis";
  if (sample.includes("form 26as") || sample.includes("tax credit statement")) return "26as";
  if (fileName.toLowerCase().includes("prefill") && fileName.toLowerCase().endsWith(".json")) return "prefill-json";
  if ((ITR_TOKEN.test(sample) || sample.includes("partagen1")) && fileName.toLowerCase().endsWith(".json")) return "itr-json";
  if (sample.includes("bank statement") || sample.includes("opening balance") && sample.includes("closing balance")) return "bank";
  if (sample.includes("capital gains") || sample.includes("contract note") || ISIN_TOKEN.test(sample)) return "broker";
  return "generic";
}

export function parseIndianNumber(raw: string) {
  const normalized = raw.replace(/[₹,\s]/g, "").replace(/\(([^)]+)\)/, "-$1");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function claim(id: string, documentId: string, label: string, field: string, value: number, locator: string, confidence = 0.74): SourceClaim {
  return { id, documentId, label, field, value, locator, confidence, accepted: false };
}

export function extractClaims(text: string, documentId: string, kind: ParsedDocument["kind"]): SourceClaim[] {
  const compact = text.replace(/\u00a0/g, " ");

  type ClaimRule = {
    label: string;
    field: string;
    patterns: RegExp[];
    confidence: number;
    kinds?: ParsedDocument["kind"][];
  };

  const rules: ClaimRule[] = [
    {
      label: "Gross salary",
      field: "income.grossSalary",
      patterns: [
        /gross\s+salary[^\d₹-]{0,120}(₹?\s?[\d,]+(?:\.\d{1,2})?)/i,
        /gross\s+total\s+salary[^\d₹-]{0,120}(₹?\s?[\d,]+(?:\.\d{1,2})?)/i,
      ],
      confidence: kind === "form16" ? 0.9 : 0.7,
    },
    {
      label: "Income chargeable under Salaries",
      field: "income.grossSalary",
      patterns: [
        /income\s+chargeable\s+under\s+the\s+head\s+[“"']?salar(?:y|ies)[”"']?[^\d₹-]{0,140}(₹?\s?[\d,]+(?:\.\d{1,2})?)/i,
      ],
      confidence: kind === "form16" ? 0.84 : 0.65,
    },
    {
      label: "TDS on salary",
      field: "taxesPaid.tdsSalary",
      patterns: [
        /total\s+amount\s+of\s+tax\s+deducted[^\d₹-]{0,120}(₹?\s?[\d,]+(?:\.\d{1,2})?)/i,
        /tax\s+deducted\s+at\s+source[^\d₹-]{0,120}(₹?\s?[\d,]+(?:\.\d{1,2})?)/i,
      ],
      confidence: kind === "form16" ? 0.88 : 0.64,
    },
    {
      label: "Other-source income",
      field: "income.otherSources",
      patterns: [
        /income\s+from\s+other\s+sources[^\d₹-]{0,120}(₹?\s?[\d,]+(?:\.\d{1,2})?)/i,
      ],
      confidence: 0.62,
    },

    // Broker/capital-gain summaries only. We intentionally do not apply the
    // 111A/112A rules to generic/AIS/TIS documents because transaction rows
    // must not be mistaken for return-level aggregate gains.
    {
      label: "STCG under section 111A",
      field: "income.stcg111A",
      patterns: [
        /(?:total\s+)?(?:short[-\s]*term\s+capital\s+gains?|stcg)\s*(?:(?:under\s+section|under|u\/s|section)\s*)?111a(?:\s*(?:taxable\s+at\s+)?\d+(?:\.\d+)?\s*%)?[^\d₹-]{0,100}(₹?\s?[\d,]+(?:\.\d{1,2})?)/i,
      ],
      confidence: 0.88,
      kinds: ["broker"],
    },
    {
      label: "LTCG under section 112A",
      field: "income.ltcg112A",
      patterns: [
        /(?:total\s+)?(?:long[-\s]*term\s+capital\s+gains?|ltcg)\s*(?:(?:under\s+section|under|u\/s|section)\s*)?112a(?:\s*(?:taxable\s+at\s+)?\d+(?:\.\d+)?\s*%)?[^\d₹-]{0,100}(₹?\s?[\d,]+(?:\.\d{1,2})?)/i,
      ],
      confidence: 0.88,
      kinds: ["broker"],
    },
    {
      label: "VDA income",
      field: "income.vdaIncome",
      patterns: [
        /(?:(?:total\s+)?(?:income\s+from\s+)?virtual\s+digital\s+assets?|(?:total\s+)?vda\s+income)(?:\s*(?:(?:under\s+section|under|u\/s|section)\s*)?115bbh)?(?:\s*(?:taxable\s+at\s+)?\d+(?:\.\d+)?\s*%)?[^\d₹-]{0,100}(₹?\s?[\d,]+(?:\.\d{1,2})?)/i,
      ],
      confidence: kind === "broker" ? 0.84 : 0.72,
      kinds: ["broker", "generic", "prefill-json", "itr-json"],
    },

    // Return-level tax-payment fields are aggregates. Require an explicit
    // "total" or "aggregate" label so a single challan/AIS/26AS row is not
    // silently treated as the complete workspace amount.
    {
      label: "Total advance tax",
      field: "taxesPaid.advanceTax",
      patterns: [
        /(?:total|aggregate)\s+(?:amount\s+of\s+)?advance\s+tax(?:\s+paid)?[^\d₹-]{0,80}(₹?\s?[\d,]+(?:\.\d{1,2})?)/i,
      ],
      confidence: kind === "26as" ? 0.88 : 0.76,
      kinds: ["26as", "prefill-json", "itr-json", "generic"],
    },
    {
      label: "Total self-assessment tax",
      field: "taxesPaid.selfAssessmentTax",
      patterns: [
        /(?:total|aggregate)\s+(?:amount\s+of\s+)?self[-\s]*assessment\s+tax(?:\s+paid)?[^\d₹-]{0,80}(₹?\s?[\d,]+(?:\.\d{1,2})?)/i,
      ],
      confidence: kind === "26as" ? 0.88 : 0.76,
      kinds: ["26as", "prefill-json", "itr-json", "generic"],
    },
    {
      label: "Total TCS",
      field: "taxesPaid.tcs",
      patterns: [
        /(?:total|aggregate)\s+(?:amount\s+of\s+)?(?:tax\s+collected\s+at\s+source|tcs)(?:\s+collected)?[^\d₹-]{0,80}(₹?\s?[\d,]+(?:\.\d{1,2})?)/i,
      ],
      confidence: kind === "26as" ? 0.88 : 0.76,
      kinds: ["26as", "ais", "tis", "prefill-json", "itr-json", "generic"],
    },
  ];

  const out: SourceClaim[] = [];
  for (const rule of rules) {
    if (rule.kinds && !rule.kinds.includes(kind)) continue;

    for (const pattern of rule.patterns) {
      const match = compact.match(pattern);
      if (!match) continue;

      const value = parseIndianNumber(match[1]);
      if (value === null) continue;

      const offset = match.index ?? 0;
      out.push(
        claim(
          crypto.randomUUID(),
          documentId,
          rule.label,
          rule.field,
          value,
          `text offset ${offset}`,
          rule.confidence,
        ),
      );
      break;
    }
  }

  return out;
}

async function sha256(file: File) {
  const data = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function parsePdf(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());

  const loadingTask = pdfjs.getDocument({
    data,
  });

  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pages.push(`[Page ${pageNumber}]\n${text}`);
    if (pages.join("\n").length > MAX_BROWSER_TEXT) break;
  }
  return { text: pages.join("\n\n").slice(0, MAX_BROWSER_TEXT), units: pdf.numPages, warnings: pdf.numPages > pages.length ? ["Browser preview was truncated; use the optional parser service for the complete file."] : [] };
}

async function parseSpreadsheet(file: File) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const chunks: string[] = [];
  let rows = 0;
  for (const sheetName of workbook.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    const lineCount = csv.split(/\r?\n/).length;
    rows += lineCount;
    chunks.push(`[Sheet: ${sheetName}]\n${csv}`);
    if (chunks.join("\n").length > MAX_BROWSER_TEXT) break;
  }
  return { text: chunks.join("\n\n").slice(0, MAX_BROWSER_TEXT), units: rows, warnings: chunks.join("\n").length > MAX_BROWSER_TEXT ? ["Spreadsheet preview was truncated."] : [] };
}

async function parseCsv(file: File) {
  const text = await file.text();
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const preview = parsed.data.slice(0, 10000).map((row, index) => `${index + 1}: ${row.join(" | ")}`).join("\n");
  return { text: preview.slice(0, MAX_BROWSER_TEXT), units: parsed.data.length, warnings: parsed.errors.map((e) => `Row ${e.row ?? "?"}: ${e.message}`).slice(0, 8) };
}

export async function parseDocumentInBrowser(file: File): Promise<ParsedDocument> {
  const documentId = crypto.randomUUID();
  const lower = file.name.toLowerCase();
  let result: { text: string; units: number; warnings: string[] };
  const parser: ParsedDocument["parser"] = "browser";

  if (lower.endsWith(".pdf")) result = await parsePdf(file);
  else if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".xlsm")) result = await parseSpreadsheet(file);
  else if (lower.endsWith(".csv") || lower.endsWith(".tsv")) result = await parseCsv(file);
  else if (lower.endsWith(".json")) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    result = { text: JSON.stringify(parsed, null, 2).slice(0, MAX_BROWSER_TEXT), units: 1, warnings: text.length > MAX_BROWSER_TEXT ? ["JSON preview was truncated."] : [] };
  } else if (/\.(txt|md|html|xml)$/i.test(lower)) {
    const text = await file.text();
    result = { text: text.slice(0, MAX_BROWSER_TEXT), units: text.split(/\r?\n/).length, warnings: text.length > MAX_BROWSER_TEXT ? ["Text preview was truncated."] : [] };
  } else {
    throw new Error("This file type needs the optional Render parser service.");
  }

  const kind = detectKind(result.text, file.name);
  return {
    id: documentId,
    name: file.name,
    size: file.size,
    sha256: await sha256(file),
    kind,
    parser,
    pagesOrRows: result.units,
    uploadedAt: new Date().toISOString(),
    preview: redactSensitive(result.text.slice(0, 5000)),
    warnings: result.warnings,
    claims: extractClaims(result.text, documentId, kind),
  };
}

export async function parseDocumentWithWorker(file: File, password?: string): Promise<ParsedDocument> {
  const endpoint = process.env.NEXT_PUBLIC_PARSER_URL;
  if (!endpoint) throw new Error("NEXT_PUBLIC_PARSER_URL is not configured.");
  const form = new FormData();
  form.append("file", file);
  form.append("consent_acknowledged", "true");
  if (password) form.append("password", password);
  const response = await fetch(`${endpoint.replace(/\/$/, "")}/parse`, { method: "POST", body: form });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail || "Parser service failed.");
  const data = await response.json();
  const documentId = crypto.randomUUID();
  const text = String(data.text || "").slice(0, MAX_BROWSER_TEXT);
  const kind = detectKind(text, file.name);
  return {
    id: documentId,
    name: file.name,
    size: file.size,
    sha256: data.sha256,
    kind,
    parser: "render",
    pagesOrRows: Number(data.units || 1),
    uploadedAt: new Date().toISOString(),
    preview: redactSensitive(text.slice(0, 5000)),
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
    claims: extractClaims(text, documentId, kind),
  };
}
