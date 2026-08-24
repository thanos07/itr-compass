"use client";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import { decryptWorkspace, encryptWorkspace } from "@/lib/cloud-crypto";
import { formatDate } from "@/lib/format";
import { parseTaxWorkspace } from "@/lib/workspace-schema";
import { compareRegimes } from "@/lib/tax/engine";
import { selectItrForm } from "@/lib/tax/form-selector";
import type { AgentKey, SourceClaim, TaxWorkspace } from "@/lib/workspace-types";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 46;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const FOOTER_HEIGHT = 34;

const ATTACHMENT_NAME = "itr-file-workspace.encrypted.json";
const BACKUP_FORMAT = "ITRFILE_PDF_BACKUP";
const BACKUP_VERSION = 1;
const MIN_PASSWORD_LENGTH = 12;
const MAX_IMPORT_PDF_BYTES = 10_000_000;
const MAX_ATTACHMENT_BYTES = 4_000_000;

const COLORS = {
  navy: rgb(14 / 255, 27 / 255, 51 / 255),
  royal: rgb(41 / 255, 84 / 255, 216 / 255),
  royalSoft: rgb(233 / 255, 237 / 255, 251 / 255),
  cream: rgb(250 / 255, 247 / 255, 241 / 255),
  line: rgb(228 / 255, 220 / 255, 201 / 255),
  ink: rgb(24 / 255, 32 / 255, 51 / 255),
  soft: rgb(92 / 255, 102 / 255, 121 / 255),
  faint: rgb(137 / 255, 146 / 255, 164 / 255),
  white: rgb(1, 1, 1),
  success: rgb(23 / 255, 107 / 255, 77 / 255),
  successSoft: rgb(228 / 255, 243 / 255, 236 / 255),
  warning: rgb(138 / 255, 90 / 255, 21 / 255),
  warningSoft: rgb(247 / 255, 236 / 255, 215 / 255),
  danger: rgb(155 / 255, 47 / 255, 61 / 255),
  dangerSoft: rgb(250 / 255, 232 / 255, 235 / 255),
};

type RestorablePdfPayload = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  schemaVersion: 2;
  assessmentYear: "2026-27";
  workspaceId: string;
  createdAt: string;
  encryption: "AES-256-GCM/PBKDF2-SHA256-250000";
  ciphertext: string;
  iv: string;
  salt: string;
};

type PdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
  serifBold: PDFFont;
};

type KeyValue = {
  label: string;
  value: string;
};

type PdfAttachment = {
  filename?: string;
  content?: Uint8Array;
};

function safeText(value: unknown): string {
  return String(value ?? "")
    .replace(/\u20b9/g, "INR ")
    .replace(/[\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7E\n\r\t]/g, "");
}

function redactReportText(value: string): string {
  return safeText(value)
    .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/gi, "[PAN REDACTED]")
    .replace(/\b(?:\d[ -]?){11}\d\b/g, "[AADHAAR REDACTED]")
    .replace(/\b[A-Z]{4}0[A-Z0-9]{6}\b/gi, "[IFSC REDACTED]")
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[EMAIL REDACTED]")
    .replace(/(?<!\d)(?:\+91[- ]?)?[6-9]\d{9}(?!\d)/g, "[PHONE REDACTED]")
    .replace(/\b\d{9,18}\b/g, "[LONG NUMBER REDACTED]");
}

function maskedPan(value: string): string {
  const clean = safeText(value).trim().toUpperCase();
  if (!clean) return "Not entered";
  if (clean.includes("*")) return clean;
  if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean)) {
    return `${clean.slice(0, 5)}****${clean.slice(-1)}`;
  }
  return "[PAN MASKED]";
}

function inr(value: number): string {
  return `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)}`;
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function labelFromKey(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/(\d)([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function displayDate(value: string): string {
  try {
    return safeText(formatDate(value));
  } catch {
    return safeText(value);
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const normalized = safeText(text).replace(/\s+/g, " ").trim();
  if (!normalized) return [""];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word;
      continue;
    }

    let fragment = "";
    for (const character of word) {
      const next = fragment + character;
      if (font.widthOfTextAtSize(next, size) > maxWidth && fragment) {
        lines.push(fragment);
        fragment = character;
      } else {
        fragment = next;
      }
    }
    current = fragment;
  }

  if (current) lines.push(current);
  return lines;
}

class ReportWriter {
  private page: PDFPage;
  private y: number;
  private continuedTitle = "Tax workpaper report";

  constructor(
    private readonly document: PDFDocument,
    private readonly fonts: PdfFonts,
  ) {
    this.page = this.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - 86;
  }

  get currentPage(): PDFPage {
    return this.page;
  }

  get cursorY(): number {
    return this.y;
  }

  set cursorY(value: number) {
    this.y = value;
  }

  addContentPage(title = this.continuedTitle): void {
    this.continuedTitle = title;
    this.page = this.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    this.page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 42,
      width: PAGE_WIDTH,
      height: 42,
      color: COLORS.navy,
    });

    this.page.drawText("ITR FILE", {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 27,
      size: 9,
      font: this.fonts.bold,
      color: COLORS.white,
    });

    this.page.drawText(safeText(title).slice(0, 78), {
      x: 120,
      y: PAGE_HEIGHT - 27,
      size: 8.5,
      font: this.fonts.regular,
      color: rgb(0.82, 0.86, 0.94),
    });

    this.y = PAGE_HEIGHT - 70;
  }

  ensureSpace(height: number): void {
    if (this.y - height < FOOTER_HEIGHT + 16) {
      this.addContentPage(this.continuedTitle);
    }
  }

  heading(title: string, subtitle?: string): void {
    this.ensureSpace(subtitle ? 72 : 50);

    this.page.drawRectangle({
      x: MARGIN_X,
      y: this.y - 5,
      width: 26,
      height: 2,
      color: COLORS.royal,
    });

    this.page.drawText(safeText(title), {
      x: MARGIN_X,
      y: this.y - 27,
      size: 17,
      font: this.fonts.serifBold,
      color: COLORS.navy,
    });

    this.y -= 40;

    if (subtitle) {
      this.paragraph(subtitle, {
        size: 8.4,
        color: COLORS.soft,
        maxWidth: CONTENT_WIDTH,
        gapAfter: 12,
      });
    }
  }

  paragraph(
    text: string,
    options?: {
      size?: number;
      color?: ReturnType<typeof rgb>;
      font?: PDFFont;
      maxWidth?: number;
      lineHeight?: number;
      gapAfter?: number;
      indent?: number;
    },
  ): void {
    const font = options?.font ?? this.fonts.regular;
    const size = options?.size ?? 9;
    const maxWidth = options?.maxWidth ?? CONTENT_WIDTH;
    const lineHeight = options?.lineHeight ?? size * 1.42;
    const gapAfter = options?.gapAfter ?? 8;
    const indent = options?.indent ?? 0;
    const lines = wrapText(text, font, size, maxWidth - indent);

    this.ensureSpace(lines.length * lineHeight + gapAfter);

    for (const line of lines) {
      this.page.drawText(line, {
        x: MARGIN_X + indent,
        y: this.y,
        size,
        font,
        color: options?.color ?? COLORS.ink,
      });
      this.y -= lineHeight;
    }

    this.y -= gapAfter;
  }

  callout(
    title: string,
    body: string,
    tone: "info" | "success" | "warning" | "danger" = "info",
  ): void {
    const palette = {
      info: { bg: COLORS.royalSoft, fg: COLORS.royal },
      success: { bg: COLORS.successSoft, fg: COLORS.success },
      warning: { bg: COLORS.warningSoft, fg: COLORS.warning },
      danger: { bg: COLORS.dangerSoft, fg: COLORS.danger },
    }[tone];

    const titleLines = wrapText(title, this.fonts.bold, 9, CONTENT_WIDTH - 28);
    const bodyLines = wrapText(body, this.fonts.regular, 8.2, CONTENT_WIDTH - 28);
    const height = 18 + titleLines.length * 12 + bodyLines.length * 11 + 12;

    this.ensureSpace(height + 10);

    this.page.drawRectangle({
      x: MARGIN_X,
      y: this.y - height + 5,
      width: CONTENT_WIDTH,
      height,
      color: palette.bg,
      borderColor: palette.fg,
      borderWidth: 0.7,
    });

    let lineY = this.y - 13;
    for (const line of titleLines) {
      this.page.drawText(line, {
        x: MARGIN_X + 14,
        y: lineY,
        size: 9,
        font: this.fonts.bold,
        color: palette.fg,
      });
      lineY -= 12;
    }

    lineY -= 2;

    for (const line of bodyLines) {
      this.page.drawText(line, {
        x: MARGIN_X + 14,
        y: lineY,
        size: 8.2,
        font: this.fonts.regular,
        color: COLORS.ink,
      });
      lineY -= 11;
    }

    this.y -= height + 10;
  }

  keyValues(items: KeyValue[]): void {
    const labelWidth = 194;
    let alternate = false;

    for (const item of items) {
      const valueLines = wrapText(
        item.value || "Not entered",
        this.fonts.regular,
        8.6,
        CONTENT_WIDTH - labelWidth - 28,
      );
      const rowHeight = Math.max(28, valueLines.length * 11 + 12);

      this.ensureSpace(rowHeight);

      this.page.drawRectangle({
        x: MARGIN_X,
        y: this.y - rowHeight + 4,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: alternate ? COLORS.cream : COLORS.white,
        borderColor: COLORS.line,
        borderWidth: 0.5,
      });

      this.page.drawText(safeText(item.label), {
        x: MARGIN_X + 10,
        y: this.y - 14,
        size: 8.1,
        font: this.fonts.bold,
        color: COLORS.soft,
      });

      let valueY = this.y - 14;
      for (const line of valueLines) {
        this.page.drawText(line, {
          x: MARGIN_X + labelWidth,
          y: valueY,
          size: 8.6,
          font: this.fonts.regular,
          color: COLORS.ink,
        });
        valueY -= 11;
      }

      this.y -= rowHeight;
      alternate = !alternate;
    }

    this.y -= 10;
  }

  bullet(text: string, tone: "normal" | "warning" | "danger" = "normal"): void {
    const color =
      tone === "danger"
        ? COLORS.danger
        : tone === "warning"
          ? COLORS.warning
          : COLORS.ink;

    const lines = wrapText(text, this.fonts.regular, 8.5, CONTENT_WIDTH - 18);
    const height = lines.length * 11.5 + 4;
    this.ensureSpace(height);

    this.page.drawCircle({
      x: MARGIN_X + 3.5,
      y: this.y + 2.5,
      size: 1.8,
      color,
    });

    for (const line of lines) {
      this.page.drawText(line, {
        x: MARGIN_X + 14,
        y: this.y,
        size: 8.5,
        font: this.fonts.regular,
        color,
      });
      this.y -= 11.5;
    }

    this.y -= 4;
  }

  subheading(text: string): void {
    this.ensureSpace(28);
    this.page.drawText(safeText(text), {
      x: MARGIN_X,
      y: this.y,
      size: 10,
      font: this.fonts.bold,
      color: COLORS.navy,
    });
    this.y -= 20;
  }

  finish(): void {
    const pages = this.document.getPages();

    pages.forEach((page, index) => {
      page.drawLine({
        start: { x: MARGIN_X, y: 28 },
        end: { x: PAGE_WIDTH - MARGIN_X, y: 28 },
        thickness: 0.5,
        color: COLORS.line,
      });

      page.drawText(
        index === 0
          ? "Generated locally in the browser"
          : "ITR File - workpaper report",
        {
          x: MARGIN_X,
          y: 15,
          size: 7.2,
          font: this.fonts.regular,
          color: COLORS.faint,
        },
      );

      const pageLabel = `Page ${index + 1} of ${pages.length}`;
      page.drawText(pageLabel, {
        x:
          PAGE_WIDTH -
          MARGIN_X -
          this.fonts.regular.widthOfTextAtSize(pageLabel, 7.2),
        y: 15,
        size: 7.2,
        font: this.fonts.regular,
        color: COLORS.faint,
      });
    });
  }
}

function drawCover(writer: ReportWriter, fonts: PdfFonts, workspace: TaxWorkspace): void {
  const page = writer.currentPage;
  const comparison = compareRegimes(workspace);
  const form = selectItrForm(workspace);
  const generatedAt = new Date().toISOString();
  const selectedResult =
    comparison.recommended === "old"
      ? comparison.oldRegime
      : comparison.newRegime;

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 240,
    width: PAGE_WIDTH,
    height: 240,
    color: COLORS.navy,
  });

  page.drawRectangle({
    x: MARGIN_X,
    y: PAGE_HEIGHT - 67,
    width: 34,
    height: 3,
    color: COLORS.royal,
  });

  page.drawText("ITR FILE", {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 48,
    size: 10,
    font: fonts.bold,
    color: rgb(0.72, 0.79, 0.96),
  });

  page.drawText("Income-tax workpaper", {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 112,
    size: 31,
    font: fonts.serifBold,
    color: COLORS.white,
  });

  page.drawText("Readable report with an encrypted, restorable workspace", {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 139,
    size: 11,
    font: fonts.regular,
    color: rgb(0.82, 0.86, 0.94),
  });

  page.drawText(`Assessment Year ${workspace.assessmentYear}`, {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 181,
    size: 11,
    font: fonts.bold,
    color: COLORS.white,
  });

  page.drawText(`Generated ${safeText(formatDate(generatedAt))}`, {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 202,
    size: 8.5,
    font: fonts.regular,
    color: rgb(0.74, 0.79, 0.89),
  });

  writer.cursorY = PAGE_HEIGHT - 285;

  writer.keyValues([
    {
      label: "Taxpayer",
      value: redactReportText(workspace.profile.fullName) || "Not entered",
    },
    { label: "PAN", value: maskedPan(workspace.profile.panMasked) },
    { label: "Form screening", value: `${form.form} - ${form.title}` },
    {
      label: "Recommended regime",
      value: comparison.recommended
        ? `${comparison.recommended === "new" ? "New" : "Old"} regime`
        : "No recommendation - calculation is blocked",
    },
    {
      label: "Estimated tax",
      value:
        comparison.recommended && selectedResult.supported
          ? inr(selectedResult.totalTax)
          : "Blocked",
    },
    {
      label: "Refund / payable",
      value:
        comparison.recommended && selectedResult.supported
          ? selectedResult.payable > 0
            ? `Payable ${inr(selectedResult.payable)}`
            : `Potential refund ${inr(selectedResult.refund)}`
          : "Not available",
    },
  ]);

  writer.callout(
    "Important",
    "This PDF is a workpaper, not an electronically filed return, filing confirmation, legal opinion or tax-payment receipt. Verify the notified AY 2026-27 form and official validation utility before filing.",
    "warning",
  );

  writer.callout(
    "Restorable PDF",
    "The visible report remains readable without a password. The embedded workspace backup is encrypted and requires the password created at download time. Editing, printing, scanning or optimizing the PDF may remove its embedded backup.",
    "info",
  );
}

function acceptedClaims(workspace: TaxWorkspace): Array<{ documentName: string; claim: SourceClaim }> {
  return workspace.documents.flatMap((document) =>
    document.claims
      .filter((claim) => claim.accepted)
      .map((claim) => ({
        documentName: redactReportText(document.name),
        claim,
      })),
  );
}

function addReportPages(writer: ReportWriter, workspace: TaxWorkspace): void {
  const comparison = compareRegimes(workspace);
  const form = selectItrForm(workspace);
  const claims = acceptedClaims(workspace);

  writer.addContentPage("Taxpayer inputs and recommendation");

  writer.heading(
    "Taxpayer profile",
    "Profile values entered into the workpaper. PAN is always masked in the visible report.",
  );

  writer.keyValues([
    { label: "Full name", value: redactReportText(workspace.profile.fullName) || "Not entered" },
    { label: "Masked PAN", value: maskedPan(workspace.profile.panMasked) },
    {
      label: "Age band",
      value: {
        under60: "Under 60",
        "60to79": "60 to 79",
        "80plus": "80 or above",
      }[workspace.profile.ageBand],
    },
    {
      label: "Residential status",
      value: {
        resident: "Resident",
        rnor: "Resident but not ordinarily resident",
        "non-resident": "Non-resident",
      }[workspace.profile.residency],
    },
    { label: "Employment nature", value: labelFromKey(workspace.profile.employmentNature) },
    { label: "Workspace created", value: displayDate(workspace.createdAt) },
    { label: "Last updated", value: displayDate(workspace.updatedAt) },
  ]);

  writer.heading("Form screening and recommendation");
  writer.callout(
    form.title,
    `Suggested form: ${form.form}. Status: ${form.status}. This is screening only and does not guarantee legal eligibility.`,
    form.status === "candidate" ? "success" : "warning",
  );

  writer.subheading("Why");
  form.reasons.forEach((reason) => writer.bullet(redactReportText(reason)));

  if (form.blockers.length) {
    writer.subheading("Blocks simplified form");
    form.blockers.forEach((blocker) => writer.bullet(redactReportText(blocker), "danger"));
  }

  writer.subheading("Confirm before filing");
  form.cautions.forEach((caution) => writer.bullet(redactReportText(caution), "warning"));

  writer.heading("Regime comparison");
  writer.keyValues([
    {
      label: "Recommended regime",
      value: comparison.recommended
        ? comparison.recommended === "new"
          ? "New regime"
          : "Old regime"
        : "No recommendation - resolve blockers first",
    },
    {
      label: "Estimated tax difference",
      value: comparison.difference === null ? "Blocked" : inr(comparison.difference),
    },
    {
      label: "New regime total tax",
      value: comparison.newRegime.supported ? inr(comparison.newRegime.totalTax) : "Blocked",
    },
    {
      label: "New regime result",
      value: comparison.newRegime.supported
        ? comparison.newRegime.payable > 0
          ? `Payable ${inr(comparison.newRegime.payable)}`
          : `Potential refund ${inr(comparison.newRegime.refund)}`
        : comparison.newRegime.blockingIssues.join("; "),
    },
    {
      label: "Old regime total tax",
      value: comparison.oldRegime.supported ? inr(comparison.oldRegime.totalTax) : "Blocked",
    },
    {
      label: "Old regime result",
      value: comparison.oldRegime.supported
        ? comparison.oldRegime.payable > 0
          ? `Payable ${inr(comparison.oldRegime.payable)}`
          : `Potential refund ${inr(comparison.oldRegime.refund)}`
        : comparison.oldRegime.blockingIssues.join("; "),
    },
  ]);

  const addTaxBreakdown = (title: string, result: typeof comparison.newRegime) => {
    writer.subheading(title);
    writer.keyValues([
      { label: "Gross income", value: inr(result.grossIncome) },
      { label: "Taxable salary", value: inr(result.taxableSalary) },
      { label: "Normal income before deductions", value: inr(result.normalIncomeBeforeDeductions) },
      { label: "Deductions applied", value: inr(result.deductions) },
      { label: "Normal taxable income", value: inr(result.normalTaxableIncome) },
      { label: "Special-rate income", value: inr(result.specialIncome) },
      { label: "Total income", value: inr(result.totalIncome) },
      { label: "Slab tax", value: inr(result.slabTax) },
      { label: "Special-rate tax", value: inr(result.specialTax) },
      { label: "Rebate / marginal relief", value: inr(result.rebate + result.rebateMarginalRelief) },
      { label: "Cess", value: inr(result.cess) },
      { label: "Total tax", value: inr(result.totalTax) },
      { label: "Taxes paid", value: inr(result.taxesPaid) },
      { label: "Balance payable", value: inr(result.payable) },
      { label: "Potential refund", value: inr(result.refund) },
    ]);

    result.blockingIssues.forEach((issue) => writer.bullet(redactReportText(issue), "danger"));
    result.warnings.forEach((warning) => writer.bullet(redactReportText(warning), "warning"));
  };

  addTaxBreakdown("New regime calculation", comparison.newRegime);
  addTaxBreakdown("Old regime calculation", comparison.oldRegime);

  writer.addContentPage("Financial inputs");
  writer.heading("Income inputs");
  writer.keyValues([
    { label: "Gross salary", value: inr(workspace.income.grossSalary) },
    { label: "Old-regime exempt allowances", value: inr(workspace.income.exemptAllowancesOld) },
    { label: "Old-regime professional tax", value: inr(workspace.income.professionalTaxOld) },
    { label: "House-property income / loss", value: inr(workspace.income.housePropertyIncome) },
    { label: "Business / professional income", value: inr(workspace.income.businessIncome) },
    { label: "Income from other sources", value: inr(workspace.income.otherSources) },
    { label: "Agricultural income", value: inr(workspace.income.agriculturalIncome) },
    { label: "Section 111A short-term capital gains", value: inr(workspace.income.stcg111A) },
    { label: "Section 112A long-term capital gains", value: inr(workspace.income.ltcg112A) },
    { label: "VDA income", value: inr(workspace.income.vdaIncome) },
    { label: "Other special-rate income", value: inr(workspace.income.otherSpecialIncome) },
    { label: "Verified tax on other special income", value: inr(workspace.income.otherSpecialTax) },
  ]);

  writer.heading("Deductions entered");
  writer.keyValues([
    { label: "Section 80C", value: inr(workspace.deductions.section80C) },
    { label: "Section 80D", value: inr(workspace.deductions.section80D) },
    { label: "Section 80CCD(1B)", value: inr(workspace.deductions.section80CCD1B) },
    { label: "Section 80CCD(2)", value: inr(workspace.deductions.section80CCD2) },
    { label: "Section 80CCH", value: inr(workspace.deductions.section80CCH) },
    { label: "Old-regime HRA", value: inr(workspace.deductions.hraOld) },
    { label: "Section 80G", value: inr(workspace.deductions.section80G) },
    { label: "Other old-regime deduction", value: inr(workspace.deductions.otherOld) },
  ]);

  writer.heading("Taxes paid");
  writer.keyValues([
    { label: "Salary TDS", value: inr(workspace.taxesPaid.tdsSalary) },
    { label: "Other TDS", value: inr(workspace.taxesPaid.tdsOther) },
    { label: "TCS", value: inr(workspace.taxesPaid.tcs) },
    { label: "Advance tax", value: inr(workspace.taxesPaid.advanceTax) },
    { label: "Self-assessment tax", value: inr(workspace.taxesPaid.selfAssessmentTax) },
  ]);

  writer.addContentPage("Eligibility and evidence");
  writer.heading("Eligibility inputs");
  writer.keyValues([
    { label: "Business income indicated", value: yesNo(workspace.eligibility.hasBusinessIncome) },
    { label: "Presumptive taxation selected", value: yesNo(workspace.eligibility.usesPresumptiveTaxation) },
    { label: "Presumptive section", value: workspace.eligibility.presumptiveSection },
    { label: "Short-term capital gains", value: yesNo(workspace.eligibility.hasShortTermCapitalGains) },
    { label: "Foreign assets or income", value: yesNo(workspace.eligibility.hasForeignAssetsOrIncome) },
    { label: "Company director", value: yesNo(workspace.eligibility.isCompanyDirector) },
    { label: "Held unlisted shares", value: yesNo(workspace.eligibility.heldUnlistedShares) },
    { label: "Brought-forward loss", value: yesNo(workspace.eligibility.hasBroughtForwardLoss) },
    { label: "Deferred ESOP tax", value: yesNo(workspace.eligibility.hasDeferredEsopTax) },
    { label: "Section 194N TDS", value: yesNo(workspace.eligibility.hasTds194N) },
    { label: "Lottery or racehorse income", value: yesNo(workspace.eligibility.hasLotteryOrRacehorseIncome) },
    { label: "Section 115BBE income", value: yesNo(workspace.eligibility.hasSection115BBEIncome) },
    { label: "Tax-audit requirement", value: yesNo(workspace.eligibility.hasTaxAuditRequirement) },
    { label: "Eligible Agniveer", value: yesNo(workspace.eligibility.isAgniveer) },
    { label: "Form 10-IEA status", value: labelFromKey(workspace.eligibility.form10IEAStatus) },
    { label: "House-property count", value: String(workspace.eligibility.housePropertyCount) },
  ]);

  if (
    workspace.eligibility.usesPresumptiveTaxation ||
    workspace.eligibility.hasBusinessIncome ||
    workspace.income.businessIncome > 0
  ) {
    writer.heading("Presumptive-tax inputs");
    writer.keyValues([
      { label: "Gross receipts", value: inr(workspace.presumptive.grossReceipts) },
      { label: "Cash receipts", value: inr(workspace.presumptive.cashReceipts) },
      { label: "Declared income", value: inr(workspace.presumptive.declaredIncome) },
      { label: "Specified profession under section 44AA(1)", value: yesNo(workspace.presumptive.isSpecifiedProfession44AA) },
      { label: "Agency business", value: yesNo(workspace.presumptive.hasAgencyBusiness) },
      { label: "Commission or brokerage income", value: yesNo(workspace.presumptive.hasCommissionOrBrokerageIncome) },
      { label: "Goods-carriage count", value: String(workspace.presumptive.goodsCarriageCount) },
      { label: "Section 44AE minimum confirmed", value: yesNo(workspace.presumptive.meetsSection44AEMinimumIncome) },
    ]);
  }

  writer.heading(
    "Document inventory",
    "Raw uploaded files and raw extracted previews are not embedded in this report.",
  );

  if (!workspace.documents.length) {
    writer.paragraph("No source document is registered.");
  } else {
    workspace.documents.forEach((document, index) => {
      const accepted = document.claims.filter((claim) => claim.accepted).length;
      writer.subheading(`${index + 1}. ${redactReportText(document.name)}`);
      writer.keyValues([
        { label: "Document type", value: document.kind },
        { label: "Parser", value: document.parser },
        { label: "Pages / rows", value: String(document.pagesOrRows) },
        { label: "Uploaded", value: displayDate(document.uploadedAt) },
        { label: "Accepted claims", value: String(accepted) },
        {
          label: "Warnings",
          value: document.warnings.length
            ? document.warnings.map(redactReportText).join("; ")
            : "None",
        },
      ]);
    });
  }

  writer.heading("Accepted evidence claims");
  if (!claims.length) {
    writer.paragraph("No extracted claim has been accepted.");
  } else {
    claims.forEach(({ documentName, claim }) => {
      writer.bullet(
        `${documentName}: ${redactReportText(claim.label)} = ${
          typeof claim.value === "number"
            ? inr(claim.value)
            : redactReportText(claim.value)
        } (confidence ${Math.round(claim.confidence * 100)}%)`,
      );
    });
  }

  writer.addContentPage("Agent review and handoff");
  writer.heading(
    "Controlled agent review",
    "Agent output is advisory and constrained by supplied redacted text, retrieved sources and deterministic tools.",
  );

  const order: AgentKey[] = ["intake", "reconciliation", "legal", "review"];

  for (const key of order) {
    const run = workspace.agentRuns[key];
    writer.subheading(
      {
        intake: "Document Intake Agent",
        reconciliation: "Reconciliation Agent",
        legal: "Legal Retrieval Agent",
        review: "Final Review Agent",
      }[key],
    );

    if (!run) {
      writer.paragraph("Not run.");
      continue;
    }

    writer.paragraph(redactReportText(run.summary), { gapAfter: 10 });

    run.findings.forEach((finding) => {
      const tone =
        finding.severity === "critical"
          ? "danger"
          : finding.severity === "warning"
            ? "warning"
            : "normal";

      writer.bullet(
        `${finding.title}: ${finding.detail}${
          finding.suggestedAction ? ` Next: ${finding.suggestedAction}` : ""
        }`,
        tone,
      );
    });

    run.unresolved.forEach((item) =>
      writer.bullet(`Unresolved: ${redactReportText(item)}`, "warning"),
    );
    run.warnings.forEach((warning) =>
      writer.bullet(`Warning: ${redactReportText(warning)}`, "warning"),
    );
    run.citations.forEach((citation) =>
      writer.bullet(
        `Source: ${redactReportText(citation.title)} - ${redactReportText(
          citation.authority,
        )} - ${redactReportText(citation.section)} - ${safeText(citation.url)}`,
      ),
    );

    writer.paragraph(
      `Model: ${redactReportText(run.model)} | Completed: ${displayDate(run.completedAt)}`,
      { size: 7.4, color: COLORS.faint, gapAfter: 14 },
    );
  }

  writer.heading("Workspace notes");
  writer.paragraph(
    workspace.notes.trim()
      ? redactReportText(workspace.notes)
      : "No workspace note was entered.",
  );

  writer.heading("Handoff checklist");
  [
    "Confirm all taxpayer facts and source documents against originals.",
    "Resolve every calculation blocker and reconciliation difference.",
    "Confirm the notified AY 2026-27 ITR form and schedules.",
    "Run the official validation utility before submission.",
    "Pay any tax due and complete e-verification separately.",
    "Keep the standalone .itrwork.json backup because PDF editors may remove attachments.",
  ].forEach((item) => writer.bullet(item));

  writer.callout(
    "Not a filing confirmation",
    "This report does not prove legal eligibility, submit the return, pay tax or e-verify. Use professional review where the facts or applicable law require it.",
    "danger",
  );
}

function validatePassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Use a PDF backup password of at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

function validatePayload(value: unknown): RestorablePdfPayload {
  if (!value || typeof value !== "object") {
    throw new Error("The embedded PDF backup is invalid.");
  }

  const payload = value as Partial<RestorablePdfPayload>;

  if (
    payload.format !== BACKUP_FORMAT ||
    payload.version !== BACKUP_VERSION ||
    payload.schemaVersion !== 2 ||
    payload.assessmentYear !== "2026-27" ||
    typeof payload.workspaceId !== "string" ||
    typeof payload.createdAt !== "string" ||
    payload.encryption !== "AES-256-GCM/PBKDF2-SHA256-250000" ||
    typeof payload.ciphertext !== "string" ||
    typeof payload.iv !== "string" ||
    typeof payload.salt !== "string"
  ) {
    throw new Error("This PDF is not a supported restorable ITR File report.");
  }

  if (
    payload.ciphertext.length > MAX_ATTACHMENT_BYTES ||
    payload.iv.length > 1_000 ||
    payload.salt.length > 1_000
  ) {
    throw new Error("The embedded PDF backup exceeds safety limits.");
  }

  return payload as RestorablePdfPayload;
}

export async function createRestorablePdf(
  workspace: TaxWorkspace,
  password: string,
): Promise<Uint8Array> {
  validatePassword(password);

  const validatedWorkspace = parseTaxWorkspace(workspace);
  const encrypted = await encryptWorkspace(validatedWorkspace, password);

  const payload: RestorablePdfPayload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    schemaVersion: 2,
    assessmentYear: validatedWorkspace.assessmentYear,
    workspaceId: validatedWorkspace.id,
    createdAt: new Date().toISOString(),
    encryption: "AES-256-GCM/PBKDF2-SHA256-250000",
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    salt: encrypted.salt,
  };

  const document = await PDFDocument.create();
  document.setTitle(`ITR File workpaper - AY ${validatedWorkspace.assessmentYear}`);
  document.setAuthor("ITR File");
  document.setCreator("ITR File browser application");
  document.setProducer("pdf-lib");
  document.setSubject("Indian income-tax workpaper with encrypted restorable workspace");
  document.setKeywords([
    "ITR File",
    "income tax",
    "workpaper",
    "AY 2026-27",
    "encrypted workspace backup",
  ]);
  document.setCreationDate(new Date());
  document.setModificationDate(new Date());

  const fonts: PdfFonts = {
    regular: await document.embedFont(StandardFonts.Helvetica),
    bold: await document.embedFont(StandardFonts.HelveticaBold),
    serifBold: await document.embedFont(StandardFonts.TimesRomanBold),
  };

  const writer = new ReportWriter(document, fonts);
  drawCover(writer, fonts, validatedWorkspace);
  addReportPages(writer, validatedWorkspace);
  writer.finish();

  const attachmentBytes = new TextEncoder().encode(JSON.stringify(payload));

  await document.attach(attachmentBytes, ATTACHMENT_NAME, {
    mimeType: "application/json",
    description: "Encrypted ITR File workspace backup. Import only through ITR File.",
    creationDate: new Date(),
    modificationDate: new Date(),
  });

  return document.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });
}

export async function importWorkspaceFromRestorablePdf(
  file: File,
  password: string,
): Promise<TaxWorkspace> {
  validatePassword(password);

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Select an app-generated PDF report.");
  }

  if (file.size > MAX_IMPORT_PDF_BYTES) {
    throw new Error("The PDF exceeds the 10 MB import limit.");
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  try {
    const attachments = (await pdf.getAttachments()) as Record<string, PdfAttachment> | null;
    const entries = Object.entries(attachments ?? {});

    const match = entries.find(([id, descriptor]) => {
      const filename = descriptor.filename ?? id;
      return filename === ATTACHMENT_NAME || id === ATTACHMENT_NAME;
    });

    if (!match) {
      throw new Error(
        "This PDF has no restorable ITR File workspace. Use the original app-generated PDF; printed, scanned or optimized copies may lose the embedded backup.",
      );
    }

    const [, descriptor] = match;
    const bytes = descriptor.content;

    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
      throw new Error("The embedded PDF backup is empty or unreadable.");
    }

    if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
      throw new Error("The embedded PDF backup exceeds safety limits.");
    }

    const payload = validatePayload(JSON.parse(new TextDecoder().decode(bytes)));

    let decrypted: TaxWorkspace;
    try {
      decrypted = await decryptWorkspace(payload, password);
    } catch {
      throw new Error(
        "The PDF backup password is incorrect, or the embedded workspace is damaged.",
      );
    }

    const validated = parseTaxWorkspace(decrypted);

    if (
      validated.id !== payload.workspaceId ||
      validated.assessmentYear !== payload.assessmentYear
    ) {
      throw new Error(
        "The embedded workspace identity does not match the PDF backup metadata.",
      );
    }

    return validated;
  } finally {
    await loadingTask.destroy();
  }
}

export function restorablePdfFileName(workspace: TaxWorkspace): string {
  return `itr-file-${workspace.assessmentYear}-${workspace.id.slice(0, 8)}-restorable.pdf`;
}

export const RESTORABLE_PDF_MIN_PASSWORD_LENGTH = MIN_PASSWORD_LENGTH;
