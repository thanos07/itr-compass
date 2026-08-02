import { z } from "zod";
import type { TaxWorkspace } from "@/lib/workspace-types";

const boundedMoney = z.number().finite().min(-100_000_000_000).max(100_000_000_000);
const nonNegativeMoney = z.number().finite().min(0).max(100_000_000_000);

const claimSchema = z.object({
  id: z.string().min(1).max(100),
  documentId: z.string().min(1).max(100),
  label: z.string().max(180),
  field: z.string().max(120),
  value: z.union([boundedMoney, z.string().max(500)]),
  confidence: z.number().min(0).max(1),
  locator: z.string().max(500),
  accepted: z.boolean(),
});

const documentSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(260),
  size: z.number().int().min(0).max(100_000_000),
  sha256: z.string().length(64).optional(),
  kind: z.enum(["form16", "ais", "tis", "26as", "prefill-json", "itr-json", "bank", "broker", "generic"]),
  parser: z.enum(["browser", "render", "manual"]),
  pagesOrRows: z.number().int().min(0).max(1_000_000),
  uploadedAt: z.string().max(80),
  preview: z.string().max(10_000),
  warnings: z.array(z.string().max(500)).max(50),
  claims: z.array(claimSchema).max(500),
});

const agentFindingSchema = z.object({
  id: z.string().min(1).max(100),
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string().min(1).max(180),
  detail: z.string().min(1).max(1200),
  sourceDocumentIds: z.array(z.string().max(100)).max(30),
  suggestedAction: z.string().max(700),
});

const agentCitationSchema = z.object({
  sourceId: z.string().min(1).max(100),
  title: z.string().min(1).max(240),
  authority: z.string().min(1).max(160),
  section: z.string().max(120),
  assessmentYear: z.string().max(40),
  url: z.string().url().max(700),
  effectiveFrom: z.string().max(40).optional(),
  retrievedAt: z.string().max(40).optional(),
  sourceStatus: z.enum(["current", "verify-before-filing"]).optional(),
  excerpt: z.string().max(700),
});

const agentRunSchema = z.object({
  agent: z.enum(["intake", "reconciliation", "legal", "review"]),
  completedAt: z.string().max(80),
  model: z.string().max(120),
  inputFingerprint: z.string().min(16).max(128),
  query: z.string().max(1200).optional(),
  summary: z.string().max(3000),
  findings: z.array(agentFindingSchema).max(40),
  unresolved: z.array(z.string().max(700)).max(40),
  citations: z.array(agentCitationSchema).max(12),
  warnings: z.array(z.string().max(700)).max(30),
});

const v2Schema: z.ZodType<TaxWorkspace> = z.object({
  schemaVersion: z.literal(2),
  id: z.string().min(1).max(100),
  assessmentYear: z.literal("2026-27"),
  createdAt: z.string().max(80),
  updatedAt: z.string().max(80),
  profile: z.object({
    fullName: z.string().max(180),
    panMasked: z.string().max(20),
    ageBand: z.enum(["under60", "60to79", "80plus"]),
    residency: z.enum(["resident", "rnor", "non-resident"]),
    employmentNature: z.enum(["private", "central-govt", "state-govt", "psu", "pensioner", "not-applicable"]),
  }),
  eligibility: z.object({
    hasBusinessIncome: z.boolean(),
    usesPresumptiveTaxation: z.boolean(),
    presumptiveSection: z.enum(["none", "44AD", "44ADA", "44AE"]),
    hasShortTermCapitalGains: z.boolean(),
    hasForeignAssetsOrIncome: z.boolean(),
    isCompanyDirector: z.boolean(),
    heldUnlistedShares: z.boolean(),
    hasBroughtForwardLoss: z.boolean(),
    hasDeferredEsopTax: z.boolean(),
    hasTds194N: z.boolean(),
    hasLotteryOrRacehorseIncome: z.boolean(),
    hasSection115BBEIncome: z.boolean(),
    hasTaxAuditRequirement: z.boolean(),
    isAgniveer: z.boolean(),
    form10IEAStatus: z.enum(["not-applicable", "filed", "not-filed", "unsure"]),
    housePropertyCount: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  }),
  presumptive: z.object({
    grossReceipts: nonNegativeMoney,
    cashReceipts: nonNegativeMoney,
    declaredIncome: nonNegativeMoney,
    isSpecifiedProfession44AA: z.boolean(),
    hasAgencyBusiness: z.boolean(),
    hasCommissionOrBrokerageIncome: z.boolean(),
    goodsCarriageCount: z.number().int().min(0).max(1000),
    meetsSection44AEMinimumIncome: z.boolean(),
  }),
  income: z.object({
    grossSalary: nonNegativeMoney,
    exemptAllowancesOld: nonNegativeMoney,
    professionalTaxOld: nonNegativeMoney,
    housePropertyIncome: boundedMoney,
    businessIncome: nonNegativeMoney,
    otherSources: nonNegativeMoney,
    agriculturalIncome: nonNegativeMoney,
    stcg111A: nonNegativeMoney,
    ltcg112A: nonNegativeMoney,
    vdaIncome: nonNegativeMoney,
    otherSpecialIncome: nonNegativeMoney,
    otherSpecialTax: nonNegativeMoney,
  }),
  deductions: z.object({
    section80C: nonNegativeMoney,
    section80D: nonNegativeMoney,
    section80CCD1B: nonNegativeMoney,
    section80CCD2: nonNegativeMoney,
    section80CCH: nonNegativeMoney,
    hraOld: nonNegativeMoney,
    section80G: nonNegativeMoney,
    otherOld: nonNegativeMoney,
  }),
  taxesPaid: z.object({
    tdsSalary: nonNegativeMoney,
    tdsOther: nonNegativeMoney,
    tcs: nonNegativeMoney,
    advanceTax: nonNegativeMoney,
    selfAssessmentTax: nonNegativeMoney,
  }),
  documents: z.array(documentSchema).max(100),
  agentRuns: z.object({
    intake: agentRunSchema.optional(),
    reconciliation: agentRunSchema.optional(),
    legal: agentRunSchema.optional(),
    review: agentRunSchema.optional(),
  }).default({}),
  notes: z.string().max(20_000),
});

function migrateV1(value: Record<string, unknown>): unknown {
  const eligibility = (value.eligibility || {}) as Record<string, unknown>;
  const income = (value.income || {}) as Record<string, unknown>;
  const deductions = (value.deductions || {}) as Record<string, unknown>;
  return {
    ...value,
    schemaVersion: 2,
    eligibility: {
      ...eligibility,
      hasTds194N: false,
      hasLotteryOrRacehorseIncome: false,
      hasSection115BBEIncome: false,
      hasTaxAuditRequirement: false,
      isAgniveer: false,
      form10IEAStatus: eligibility.hasBusinessIncome ? "unsure" : "not-applicable",
    },
    presumptive: {
      grossReceipts: 0,
      cashReceipts: 0,
      declaredIncome: Number(income.businessIncome || 0),
      isSpecifiedProfession44AA: false,
      hasAgencyBusiness: false,
      hasCommissionOrBrokerageIncome: false,
      goodsCarriageCount: 0,
      meetsSection44AEMinimumIncome: false,
    },
    income: { ...income, agriculturalIncome: 0 },
    deductions: {
      section80C: Number(deductions.section80C || 0),
      section80D: Number(deductions.section80D || 0),
      section80CCD1B: Number(deductions.section80CCD1B || 0),
      section80CCD2: Number(deductions.section80CCD2 || 0),
      section80CCH: 0,
      hraOld: Number(deductions.hraOld || 0),
      section80G: Number(deductions.section80G || 0),
      otherOld: Number(deductions.otherOld || 0),
    },
  };
}

export function parseTaxWorkspace(value: unknown) {
  const candidate = value && typeof value === "object" && (value as { schemaVersion?: unknown }).schemaVersion === 1
    ? migrateV1(value as Record<string, unknown>)
    : value;
  const parsed = v2Schema.safeParse(candidate);
  if (!parsed.success) throw new Error("The workspace file is invalid, unsupported or exceeds safety limits.");
  return parsed.data;
}
