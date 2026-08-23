import { computeTax } from "@/lib/tax/engine";
import { selectItrForm } from "@/lib/tax/form-selector";
import { retrieveLegalSources } from "@/lib/legal/retriever";
import {
  dedupeCandidateClaims,
  findAcceptedClaimConflict,
} from "@/lib/claim-safety";
import {
  createEmptyWorkspace,
  type SourceClaim,
  type TaxWorkspace,
} from "@/lib/workspace-types";

export type EvalCategory =
  | "Tax engine"
  | "ITR form selection"
  | "Legal retrieval"
  | "Safety controls";

export type EvalCase = {
  id: string;
  category: EvalCategory;
  description: string;
  run: () => string;
};

function equal<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function includes(items: string[], text: string, label: string) {
  if (!items.some((item) => item.includes(text))) {
    throw new Error(`${label}: expected a message containing "${text}"`);
  }
}

function claim(
  id: string,
  field: string,
  value: number | string,
  accepted = false,
): SourceClaim {
  return {
    id,
    documentId: "eval-doc",
    label: id,
    field,
    value,
    confidence: 1,
    locator: "benchmark-v1",
    accepted,
  };
}

function valid44AdaWorkspace(): TaxWorkspace {
  const workspace = createEmptyWorkspace();
  workspace.eligibility.hasBusinessIncome = true;
  workspace.eligibility.usesPresumptiveTaxation = true;
  workspace.eligibility.presumptiveSection = "44ADA";
  workspace.presumptive.isSpecifiedProfession44AA = true;
  workspace.presumptive.grossReceipts = 1_000_000;
  workspace.presumptive.declaredIncome = 500_000;
  workspace.income.businessIncome = 500_000;
  return workspace;
}

function retrievalCase(
  id: string,
  description: string,
  query: string,
  expectedSourceId: string,
): EvalCase {
  return {
    id,
    category: "Legal retrieval",
    description,
    run: () => {
      const results = retrieveLegalSources(query, "2026-27", 3);
      equal(results[0]?.id, expectedSourceId, `${id} top-1 source`);
      equal(
        results.some((source) => source.id === expectedSourceId),
        true,
        `${id} expected source in top 3`,
      );
      return `top-1=${results[0]?.id ?? "none"}; hit@3=yes`;
    },
  };
}

export const BENCHMARK_VERSION = "v1";
export const BENCHMARK_ASSESSMENT_YEAR = "2026-27";

export const BENCHMARK_CASES: EvalCase[] = [
  {
    id: "TAX-01",
    category: "Tax engine",
    description: "Resident salary reaches exactly ₹12 lakh taxable income under the new regime.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.income.grossSalary = 1_275_000;
      const result = computeTax(workspace, "new");
      equal(result.totalIncome, 1_200_000, "total income");
      equal(result.rebate, 60_000, "87A rebate");
      equal(result.totalTax, 0, "total tax");
      return "₹12,00,000 total income; ₹60,000 rebate; ₹0 tax";
    },
  },
  {
    id: "TAX-02",
    category: "Tax engine",
    description: "New-regime marginal relief immediately above the ₹12 lakh threshold.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.income.grossSalary = 1_285_000;
      const result = computeTax(workspace, "new");
      equal(result.totalIncome, 1_210_000, "total income");
      equal(result.taxBeforeCess, 10_000, "tax before cess");
      equal(result.totalTax, 10_400, "tax including cess");
      return "₹12,10,000 total income; ₹10,400 total tax";
    },
  },
  {
    id: "TAX-03",
    category: "Tax engine",
    description: "Non-resident does not receive the resident-only section 87A rebate.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.profile.residency = "non-resident";
      workspace.income.grossSalary = 1_275_000;
      const result = computeTax(workspace, "new");
      equal(result.rebate, 0, "rebate");
      equal(result.totalTax, 62_400, "total tax");
      return "rebate=₹0; total tax=₹62,400";
    },
  },
  {
    id: "TAX-04",
    category: "Tax engine",
    description: "Old-regime resident salary at the ₹5 lakh rebate threshold.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.income.grossSalary = 550_000;
      const result = computeTax(workspace, "old");
      equal(result.totalIncome, 500_000, "total income");
      equal(result.rebate, 12_500, "rebate");
      equal(result.totalTax, 0, "total tax");
      return "₹5,00,000 total income; ₹12,500 rebate; ₹0 tax";
    },
  },
  {
    id: "TAX-05",
    category: "Tax engine",
    description: "Section 112A long-term capital gain applies the ₹1.25 lakh exemption.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.income.grossSalary = 1_000_000;
      workspace.income.ltcg112A = 225_000;
      const result = computeTax(workspace, "new");
      equal(result.specialTax, 12_500, "special tax");
      return "₹2,25,000 LTCG -> ₹12,500 special tax";
    },
  },
  {
    id: "TAX-06",
    category: "Tax engine",
    description: "Virtual digital asset income is taxed at the configured special rate.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.income.grossSalary = 1_000_000;
      workspace.income.vdaIncome = 100_000;
      const result = computeTax(workspace, "new");
      equal(result.specialTax, 30_000, "special tax");
      return "₹1,00,000 VDA income -> ₹30,000 special tax";
    },
  },
  {
    id: "TAX-07",
    category: "Tax engine",
    description: "Taxes-paid fields aggregate correctly and produce the expected refund.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.profile.residency = "non-resident";
      workspace.income.grossSalary = 1_275_000;
      workspace.taxesPaid.tdsSalary = 20_000;
      workspace.taxesPaid.tdsOther = 10_000;
      workspace.taxesPaid.tcs = 5_000;
      workspace.taxesPaid.advanceTax = 15_000;
      workspace.taxesPaid.selfAssessmentTax = 20_000;
      const result = computeTax(workspace, "new");
      equal(result.taxesPaid, 70_000, "taxes paid");
      equal(result.refund, 7_600, "refund");
      equal(result.payable, 0, "payable");
      return "₹70,000 paid; ₹7,600 refund";
    },
  },
  {
    id: "TAX-08",
    category: "Tax engine",
    description: "Section 80C is capped at ₹1.5 lakh in the old-regime estimate.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.income.grossSalary = 1_000_000;
      workspace.deductions.section80C = 200_000;
      const result = computeTax(workspace, "old");
      equal(result.deductions, 150_000, "deduction total");
      return "₹2,00,000 entered; ₹1,50,000 allowed by engine";
    },
  },

  {
    id: "FORM-01",
    category: "ITR form selection",
    description: "Simple resident individual with no business or exclusion is an ITR-1 candidate.",
    run: () => {
      const result = selectItrForm(createEmptyWorkspace());
      equal(result.form, "ITR-1", "form");
      equal(result.status, "candidate", "status");
      return "ITR-1 candidate";
    },
  },
  {
    id: "FORM-02",
    category: "ITR form selection",
    description: "Company directorship excludes ITR-1 and falls back to ITR-2.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.eligibility.isCompanyDirector = true;
      equal(selectItrForm(workspace).form, "ITR-2", "form");
      return "ITR-2 fallback";
    },
  },
  {
    id: "FORM-03",
    category: "ITR form selection",
    description: "Section 112A LTCG of exactly ₹1.25 lakh remains within the simplified-form boundary.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.income.ltcg112A = 125_000;
      equal(selectItrForm(workspace).form, "ITR-1", "form");
      return "ITR-1 candidate at ₹1.25 lakh LTCG";
    },
  },
  {
    id: "FORM-04",
    category: "ITR form selection",
    description: "Section 112A LTCG above ₹1.25 lakh excludes ITR-1.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.income.ltcg112A = 125_001;
      equal(selectItrForm(workspace).form, "ITR-2", "form");
      return "ITR-2 fallback above ₹1.25 lakh LTCG";
    },
  },
  {
    id: "FORM-05",
    category: "ITR form selection",
    description: "Business income without established presumptive eligibility falls back to ITR-3.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.eligibility.hasBusinessIncome = true;
      workspace.income.businessIncome = 100_000;
      equal(selectItrForm(workspace).form, "ITR-3", "form");
      return "ITR-3 fallback";
    },
  },
  {
    id: "FORM-06",
    category: "ITR form selection",
    description: "Valid screened section 44ADA facts produce an ITR-4 candidate.",
    run: () => {
      const result = selectItrForm(valid44AdaWorkspace());
      equal(result.form, "ITR-4", "form");
      equal(result.status, "candidate", "status");
      return "ITR-4 candidate";
    },
  },
  {
    id: "FORM-07",
    category: "ITR form selection",
    description: "Section 44ADA is rejected when specified-profession status is not established.",
    run: () => {
      const workspace = valid44AdaWorkspace();
      workspace.presumptive.isSpecifiedProfession44AA = false;
      const result = selectItrForm(workspace);
      equal(result.form, "ITR-3", "form");
      includes(result.blockers, "section 44AA(1)", "blockers");
      return "ITR-3 fallback with 44AA blocker";
    },
  },
  {
    id: "FORM-08",
    category: "ITR form selection",
    description: "Section 44AE screening rejects ownership above ten goods carriages.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.eligibility.hasBusinessIncome = true;
      workspace.eligibility.usesPresumptiveTaxation = true;
      workspace.eligibility.presumptiveSection = "44AE";
      workspace.presumptive.grossReceipts = 1_000_000;
      workspace.presumptive.declaredIncome = 100_000;
      workspace.income.businessIncome = 100_000;
      workspace.presumptive.goodsCarriageCount = 11;
      workspace.presumptive.meetsSection44AEMinimumIncome = true;
      equal(selectItrForm(workspace).form, "ITR-3", "form");
      return "ITR-3 fallback for 11 goods carriages";
    },
  },

  retrievalCase("RET-01", "Retrieve section 44ADA for an influencer / specified-profession question.", "social media influencer section 44ADA specified profession 44AA", "section-44ada"),
  retrievalCase("RET-02", "Retrieve section 87A guidance for the ₹12 lakh new-regime rebate.", "section 87A rebate 12 lakh 60000 marginal relief new regime", "section-87a-ay26"),
  retrievalCase("RET-03", "Retrieve AIS guidance for reconciliation and feedback questions.", "AIS TIS 26AS feedback reconciliation reported information", "ais-guidance"),
  retrievalCase("RET-04", "Retrieve Schedule FA guidance for foreign-asset reporting and RNOR status.", "Schedule FA foreign asset foreign income RNOR non-resident", "schedule-fa"),
  retrievalCase("RET-05", "Retrieve Form 67 guidance for foreign tax credit.", "Form 67 foreign tax credit Rule 128 DTAA", "form67-ftc"),
  retrievalCase("RET-06", "Retrieve ITR-4 FAQ for Form 10-IEA and presumptive business questions.", "ITR-4 Form 10-IEA old regime 44AD 44ADA 44AE", "itr4-ay26-faq"),
  retrievalCase("RET-07", "Retrieve section 112A capital-gains guidance.", "long term capital gains 112A 125000 50AA debt mutual fund", "capital-gains-112a"),
  retrievalCase("RET-08", "Retrieve Notification 45/2026 for Rule 12 and the notified simplified forms.", "Notification 45 2026 Rule 12 ITR-1 ITR-4 two house properties", "notification-45-2026"),

  {
    id: "SAFE-01",
    category: "Safety controls",
    description: "Foreign-asset or foreign-income facts force the calculator out of supported scope.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.eligibility.hasForeignAssetsOrIncome = true;
      const result = computeTax(workspace, "new");
      equal(result.supported, false, "supported");
      includes(result.blockingIssues, "Foreign asset/income", "blocking issues");
      return "unsupported with foreign-asset blocker";
    },
  },
  {
    id: "SAFE-02",
    category: "Safety controls",
    description: "Agricultural income above ₹5,000 is blocked because partial integration is not automated.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.income.agriculturalIncome = 5_001;
      const result = computeTax(workspace, "new");
      equal(result.supported, false, "supported");
      includes(result.blockingIssues, "partial integration", "blocking issues");
      return "unsupported with partial-integration blocker";
    },
  },
  {
    id: "SAFE-03",
    category: "Safety controls",
    description: "Total income above ₹50 lakh is blocked because surcharge is not implemented.",
    run: () => {
      const workspace = createEmptyWorkspace();
      workspace.income.otherSources = 5_000_001;
      const result = computeTax(workspace, "new");
      equal(result.supported, false, "supported");
      includes(result.blockingIssues, "Surcharge", "blocking issues");
      return "unsupported with surcharge blocker";
    },
  },
  {
    id: "SAFE-04",
    category: "Safety controls",
    description: "AI candidates identical to existing field/value claims are deduplicated.",
    run: () => {
      const existing = [
        claim("salary-existing", "income.grossSalary", 1_250_000, true),
        claim("tds-existing", "taxesPaid.tdsSalary", 70_000, true),
      ];
      const incoming = [
        claim("salary-ai", "income.grossSalary", 1_250_000),
        claim("tds-ai", "taxesPaid.tdsSalary", 70_000),
      ];
      const result = dedupeCandidateClaims(existing, incoming);
      equal(result.uniqueClaims.length, 0, "unique claims");
      equal(result.skipped, 2, "skipped claims");
      return "0 new; 2 duplicates skipped";
    },
  },
  {
    id: "SAFE-05",
    category: "Safety controls",
    description: "A different numeric value for an already accepted field is detected as a conflict.",
    run: () => {
      const existing = [claim("salary-existing", "income.grossSalary", 1_250_000, true)];
      const candidate = claim("salary-new", "income.grossSalary", 1_200_000);
      equal(findAcceptedClaimConflict(existing, candidate)?.id, "salary-existing", "conflict id");
      return "conflict detected";
    },
  },
  {
    id: "SAFE-06",
    category: "Safety controls",
    description: "The same numeric value does not create a false conflict.",
    run: () => {
      const existing = [claim("salary-existing", "income.grossSalary", 1_250_000, true)];
      const candidate = claim("salary-same", "income.grossSalary", 1_250_000);
      equal(findAcceptedClaimConflict(existing, candidate), undefined, "conflict");
      return "no false conflict";
    },
  },
];
