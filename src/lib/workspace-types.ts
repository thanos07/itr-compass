export type Residency = "resident" | "rnor" | "non-resident";
export type AgeBand = "under60" | "60to79" | "80plus";
export type TaxRegime = "new" | "old";
export type Form10IEAStatus = "not-applicable" | "filed" | "not-filed" | "unsure";

export type SourceClaim = {
  id: string;
  documentId: string;
  label: string;
  field: string;
  value: number | string;
  confidence: number;
  locator: string;
  accepted: boolean;
};

export type ParsedDocument = {
  id: string;
  name: string;
  size: number;
  sha256?: string;
  kind: "form16" | "ais" | "tis" | "26as" | "prefill-json" | "itr-json" | "bank" | "broker" | "generic";
  parser: "browser" | "render" | "manual";
  pagesOrRows: number;
  uploadedAt: string;
  preview: string;
  warnings: string[];
  claims: SourceClaim[];
};

export type AgentKey = "intake" | "reconciliation" | "legal" | "review";
export type AgentSeverity = "info" | "warning" | "critical";

export type AgentFinding = {
  id: string;
  severity: AgentSeverity;
  title: string;
  detail: string;
  sourceDocumentIds: string[];
  suggestedAction: string;
};

export type AgentCitation = {
  sourceId: string;
  title: string;
  authority: string;
  section: string;
  assessmentYear: string;
  url: string;
  effectiveFrom?: string;
  retrievedAt?: string;
  sourceStatus?: "current" | "verify-before-filing";
  excerpt: string;
};

export type AgentRun = {
  agent: AgentKey;
  completedAt: string;
  model: string;
  inputFingerprint: string;
  query?: string;
  summary: string;
  findings: AgentFinding[];
  unresolved: string[];
  citations: AgentCitation[];
  warnings: string[];
};

export type TaxWorkspace = {
  schemaVersion: 2;
  id: string;
  assessmentYear: "2026-27";
  createdAt: string;
  updatedAt: string;
  profile: {
    fullName: string;
    panMasked: string;
    ageBand: AgeBand;
    residency: Residency;
    employmentNature: "private" | "central-govt" | "state-govt" | "psu" | "pensioner" | "not-applicable";
  };
  eligibility: {
    hasBusinessIncome: boolean;
    usesPresumptiveTaxation: boolean;
    presumptiveSection: "none" | "44AD" | "44ADA" | "44AE";
    hasShortTermCapitalGains: boolean;
    hasForeignAssetsOrIncome: boolean;
    isCompanyDirector: boolean;
    heldUnlistedShares: boolean;
    hasBroughtForwardLoss: boolean;
    hasDeferredEsopTax: boolean;
    hasTds194N: boolean;
    hasLotteryOrRacehorseIncome: boolean;
    hasSection115BBEIncome: boolean;
    hasTaxAuditRequirement: boolean;
    isAgniveer: boolean;
    form10IEAStatus: Form10IEAStatus;
    housePropertyCount: 0 | 1 | 2 | 3;
  };
  presumptive: {
    grossReceipts: number;
    cashReceipts: number;
    declaredIncome: number;
    isSpecifiedProfession44AA: boolean;
    hasAgencyBusiness: boolean;
    hasCommissionOrBrokerageIncome: boolean;
    goodsCarriageCount: number;
    meetsSection44AEMinimumIncome: boolean;
  };
  income: {
    grossSalary: number;
    exemptAllowancesOld: number;
    professionalTaxOld: number;
    housePropertyIncome: number;
    businessIncome: number;
    otherSources: number;
    agriculturalIncome: number;
    stcg111A: number;
    ltcg112A: number;
    vdaIncome: number;
    otherSpecialIncome: number;
    otherSpecialTax: number;
  };
  deductions: {
    section80C: number;
    section80D: number;
    section80CCD1B: number;
    section80CCD2: number;
    section80CCH: number;
    hraOld: number;
    section80G: number;
    otherOld: number;
  };
  taxesPaid: {
    tdsSalary: number;
    tdsOther: number;
    tcs: number;
    advanceTax: number;
    selfAssessmentTax: number;
  };
  documents: ParsedDocument[];
  agentRuns: Partial<Record<AgentKey, AgentRun>>;
  notes: string;
};

export function createEmptyWorkspace(): TaxWorkspace {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    assessmentYear: "2026-27",
    createdAt: now,
    updatedAt: now,
    profile: {
      fullName: "",
      panMasked: "",
      ageBand: "under60",
      residency: "resident",
      employmentNature: "private",
    },
    eligibility: {
      hasBusinessIncome: false,
      usesPresumptiveTaxation: false,
      presumptiveSection: "none",
      hasShortTermCapitalGains: false,
      hasForeignAssetsOrIncome: false,
      isCompanyDirector: false,
      heldUnlistedShares: false,
      hasBroughtForwardLoss: false,
      hasDeferredEsopTax: false,
      hasTds194N: false,
      hasLotteryOrRacehorseIncome: false,
      hasSection115BBEIncome: false,
      hasTaxAuditRequirement: false,
      isAgniveer: false,
      form10IEAStatus: "not-applicable",
      housePropertyCount: 0,
    },
    presumptive: {
      grossReceipts: 0,
      cashReceipts: 0,
      declaredIncome: 0,
      isSpecifiedProfession44AA: false,
      hasAgencyBusiness: false,
      hasCommissionOrBrokerageIncome: false,
      goodsCarriageCount: 0,
      meetsSection44AEMinimumIncome: false,
    },
    income: {
      grossSalary: 0,
      exemptAllowancesOld: 0,
      professionalTaxOld: 0,
      housePropertyIncome: 0,
      businessIncome: 0,
      otherSources: 0,
      agriculturalIncome: 0,
      stcg111A: 0,
      ltcg112A: 0,
      vdaIncome: 0,
      otherSpecialIncome: 0,
      otherSpecialTax: 0,
    },
    deductions: {
      section80C: 0,
      section80D: 0,
      section80CCD1B: 0,
      section80CCD2: 0,
      section80CCH: 0,
      hraOld: 0,
      section80G: 0,
      otherOld: 0,
    },
    taxesPaid: {
      tdsSalary: 0,
      tdsOther: 0,
      tcs: 0,
      advanceTax: 0,
      selfAssessmentTax: 0,
    },
    documents: [],
    agentRuns: {},
    notes: "",
  };
}
