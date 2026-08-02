import type { TaxWorkspace } from "@/lib/workspace-types";
import { compareRegimes, computeTax } from "@/lib/tax/engine";

export type FormSelection = {
  form: "ITR-1" | "ITR-2" | "ITR-3" | "ITR-4";
  status: "candidate" | "fallback";
  title: string;
  reasons: string[];
  cautions: string[];
  blockers: string[];
};

type PresumptiveCheck = { eligible: boolean; reasons: string[]; blockers: string[]; cautions: string[] };

function checkPresumptiveEligibility(workspace: TaxWorkspace): PresumptiveCheck {
  const e = workspace.eligibility;
  const p = workspace.presumptive;
  const reasons: string[] = [];
  const blockers: string[] = [];
  const cautions: string[] = [];

  if (!e.usesPresumptiveTaxation || e.presumptiveSection === "none") {
    blockers.push("Presumptive taxation has not been affirmatively selected.");
    return { eligible: false, reasons, blockers, cautions };
  }
  if (workspace.profile.residency !== "resident") blockers.push("ITR-4 requires an eligible resident person; RNOR and non-resident cases are excluded.");
  if (p.grossReceipts <= 0) blockers.push("Gross turnover or receipts must be entered for presumptive eligibility screening.");
  if (p.cashReceipts < 0 || p.cashReceipts > p.grossReceipts) blockers.push("Cash receipts cannot exceed total gross receipts.");
  if (p.declaredIncome <= 0) blockers.push("Declared presumptive income must be entered.");

  const cashRatio = p.grossReceipts > 0 ? p.cashReceipts / p.grossReceipts : 1;
  if (e.presumptiveSection === "44AD") {
    const threshold = cashRatio <= 0.05 ? 30_000_000 : 20_000_000;
    const nonCashReceipts = Math.max(0, p.grossReceipts - p.cashReceipts);
    const minimumIncome = p.cashReceipts * 0.08 + nonCashReceipts * 0.06;
    if (p.grossReceipts > threshold) blockers.push(`Section 44AD turnover exceeds the applicable ₹${threshold === 30_000_000 ? "3 crore" : "2 crore"} threshold.`);
    if (p.hasAgencyBusiness) blockers.push("Agency business is not an eligible business for section 44AD.");
    if (p.hasCommissionOrBrokerageIncome) blockers.push("Commission or brokerage income is excluded from section 44AD.");
    if (p.declaredIncome + 1 < minimumIncome) blockers.push("Declared income is below the section 44AD presumptive minimum calculated from cash and non-cash receipts.");
    reasons.push(`Section 44AD threshold tested using ${cashRatio <= 0.05 ? "cash receipts not exceeding 5%" : "cash receipts above 5%"}.`);
    cautions.push("The screening does not establish every section 44AD condition, five-year opt-out consequence, books requirement or audit consequence.");
  }

  if (e.presumptiveSection === "44ADA") {
    const threshold = cashRatio <= 0.05 ? 7_500_000 : 5_000_000;
    if (!p.isSpecifiedProfession44AA) blockers.push("Section 44ADA requires a profession referred to in section 44AA(1); an occupation code alone is insufficient.");
    if (p.grossReceipts > threshold) blockers.push(`Section 44ADA gross receipts exceed the applicable ₹${threshold === 7_500_000 ? "75 lakh" : "50 lakh"} threshold.`);
    if (p.declaredIncome + 1 < p.grossReceipts * 0.5) blockers.push("Declared professional income is below 50% of gross receipts.");
    reasons.push(`Section 44ADA threshold tested using ${cashRatio <= 0.05 ? "cash receipts not exceeding 5%" : "cash receipts above 5%"}.`);
    cautions.push("Professional classification and any lower-income/audit position require evidence and current-law review.");
  }

  if (e.presumptiveSection === "44AE") {
    if (p.goodsCarriageCount < 1 || p.goodsCarriageCount > 10) blockers.push("Section 44AE requires ownership of not more than ten goods carriages at any time during the year.");
    if (!p.meetsSection44AEMinimumIncome) blockers.push("Vehicle-wise minimum income under section 44AE has not been confirmed.");
    reasons.push("Goods-carriage count and a user confirmation of the vehicle-wise minimum were checked.");
    cautions.push("The app does not calculate heavy-goods-vehicle tonnage, months owned or vehicle-wise section 44AE income.");
  }

  if (Math.abs(p.declaredIncome - workspace.income.businessIncome) > 1) {
    cautions.push("Declared presumptive income differs from the business/professional income used by the tax calculator.");
  }

  return { eligible: blockers.length === 0, reasons, blockers, cautions };
}

export function selectItrForm(workspace: TaxWorkspace): FormSelection {
  const e = workspace.eligibility;
  const i = workspace.income;
  const totalIncome = Math.max(computeTax(workspace, "new").totalIncome, computeTax(workspace, "old").totalIncome);
  const commonBlockers: string[] = [];
  if (workspace.profile.residency !== "resident") commonBlockers.push("Residential status is not resident-and-ordinarily-resident for the simplified individual forms.");
  if (e.hasForeignAssetsOrIncome) commonBlockers.push("Foreign assets, signing authority or foreign income are present.");
  if (e.isCompanyDirector) commonBlockers.push("The taxpayer was a company director.");
  if (e.heldUnlistedShares) commonBlockers.push("Unlisted equity shares were held.");
  if (e.hasBroughtForwardLoss) commonBlockers.push("A brought-forward or carry-forward loss is present.");
  if (e.hasDeferredEsopTax) commonBlockers.push("Deferred ESOP tax is present.");
  if (e.hasTds194N) commonBlockers.push("Tax was deducted under section 194N.");
  if (e.hasLotteryOrRacehorseIncome) commonBlockers.push("Lottery or racehorse income is present.");
  if (e.hasSection115BBEIncome) commonBlockers.push("Income potentially taxable under section 115BBE is present.");
  if (e.hasTaxAuditRequirement) commonBlockers.push("A tax-audit requirement is indicated.");
  if (i.agriculturalIncome > 5000) commonBlockers.push("Agricultural income exceeds ₹5,000.");
  if (totalIncome > 5000000) commonBlockers.push("Estimated total income exceeds ₹50 lakh.");

  if (e.hasBusinessIncome || i.businessIncome > 0) {
    const presumptive = checkPresumptiveEligibility(workspace);
    const itr4Blockers = [...commonBlockers, ...presumptive.blockers];
    if (e.hasShortTermCapitalGains || i.stcg111A > 0) itr4Blockers.push("Short-term capital gains are present.");
    if (i.ltcg112A > 125000) itr4Blockers.push("Section 112A long-term capital gains exceed ₹1.25 lakh.");
    if (i.vdaIncome > 0 || i.otherSpecialIncome > 0) itr4Blockers.push("Unsupported special-rate income is present.");
    if (e.housePropertyCount > 2) itr4Blockers.push("More than two house properties are selected.");

    if (itr4Blockers.length === 0 && presumptive.eligible) {
      const cautions = [...presumptive.cautions];
      if (e.form10IEAStatus !== "filed" && compareRegimes(workspace).recommended === "old") {
        cautions.push("The old regime appears lower, but Form 10-IEA filing status is not confirmed as filed.");
      }
      return {
        form: "ITR-4",
        status: "candidate",
        title: "Potential ITR-4 (Sugam) candidate",
        reasons: ["Business/professional income is being computed on a screened presumptive basis.", ...presumptive.reasons, "No collected ITR-4 exclusion is present."],
        cautions,
        blockers: [],
      };
    }
    return {
      form: "ITR-3",
      status: "fallback",
      title: "ITR-3 is the safer fallback",
      reasons: ["Business or professional income is present.", "The app could not establish every ITR-4 condition from the supplied facts."],
      cautions: ["Review tax-audit, books-of-account, presumptive-tax, Form 10-IEA and loss-carry-forward requirements separately.", ...presumptive.cautions],
      blockers: [...new Set(itr4Blockers)],
    };
  }

  const itr1Blockers = [...commonBlockers];
  if (e.hasShortTermCapitalGains || i.stcg111A > 0) itr1Blockers.push("Short-term capital gains are present.");
  if (i.ltcg112A > 125000) itr1Blockers.push("Section 112A long-term capital gains exceed ₹1.25 lakh.");
  if (i.vdaIncome > 0 || i.otherSpecialIncome > 0) itr1Blockers.push("Unsupported special-rate income is present.");
  if (e.housePropertyCount > 2) itr1Blockers.push("More than two house properties are selected.");

  if (itr1Blockers.length === 0) {
    return {
      form: "ITR-1",
      status: "candidate",
      title: "Potential ITR-1 (Sahaj) candidate",
      reasons: ["No business/professional income is recorded.", "Up to two house properties are selected.", "No collected ITR-1 exclusion is present."],
      cautions: ["This is a screening result, not a guarantee. Confirm every notified eligibility condition and utility validation before filing."],
      blockers: [],
    };
  }

  return {
    form: "ITR-2",
    status: "fallback",
    title: "ITR-2 is the safer fallback",
    reasons: ["No business/professional income is recorded.", "At least one collected ITR-1 restriction is present."],
    cautions: ["ITR-2 is for individuals/HUFs without profits and gains of business or profession; verify all schedules and residential-status consequences."],
    blockers: [...new Set(itr1Blockers)],
  };
}
