import assert from "node:assert/strict";
import { selectItrForm } from "./form-selector";
import { createEmptyWorkspace, type TaxWorkspace } from "../workspace-types";

function expectForm(workspace: TaxWorkspace, form: "ITR-1" | "ITR-2" | "ITR-3" | "ITR-4") {
  assert.equal(selectItrForm(workspace).form, form);
}

function presumptiveBase(section: "44AD" | "44ADA" | "44AE") {
  const w = createEmptyWorkspace();
  w.eligibility.hasBusinessIncome = true;
  w.eligibility.usesPresumptiveTaxation = true;
  w.eligibility.presumptiveSection = section;
  return w;
}

// ITR-1 positive boundaries.
{
  const w = createEmptyWorkspace();
  expectForm(w, "ITR-1");
  assert.equal(selectItrForm(w).status, "candidate");
}
{
  const w = createEmptyWorkspace();
  w.eligibility.housePropertyCount = 2;
  expectForm(w, "ITR-1");
}
{
  const w = createEmptyWorkspace();
  w.income.agriculturalIncome = 5_000;
  expectForm(w, "ITR-1");
}
{
  const w = createEmptyWorkspace();
  w.income.otherSources = 5_000_000;
  expectForm(w, "ITR-1");
}
{
  const w = createEmptyWorkspace();
  w.income.ltcg112A = 125_000;
  expectForm(w, "ITR-1");
}

// ITR-1 exclusions -> ITR-2 fallback.
for (const configure of [
  (w: TaxWorkspace) => { w.profile.residency = "rnor"; },
  (w: TaxWorkspace) => { w.profile.residency = "non-resident"; },
  (w: TaxWorkspace) => { w.eligibility.hasForeignAssetsOrIncome = true; },
  (w: TaxWorkspace) => { w.eligibility.isCompanyDirector = true; },
  (w: TaxWorkspace) => { w.eligibility.heldUnlistedShares = true; },
  (w: TaxWorkspace) => { w.eligibility.hasBroughtForwardLoss = true; },
  (w: TaxWorkspace) => { w.eligibility.hasDeferredEsopTax = true; },
  (w: TaxWorkspace) => { w.eligibility.hasTds194N = true; },
  (w: TaxWorkspace) => { w.eligibility.hasLotteryOrRacehorseIncome = true; },
  (w: TaxWorkspace) => { w.eligibility.hasSection115BBEIncome = true; },
  (w: TaxWorkspace) => { w.eligibility.hasTaxAuditRequirement = true; },
  (w: TaxWorkspace) => { w.eligibility.housePropertyCount = 3; },
  (w: TaxWorkspace) => { w.income.agriculturalIncome = 5_001; },
  (w: TaxWorkspace) => { w.income.otherSources = 5_000_001; },
  (w: TaxWorkspace) => { w.eligibility.hasShortTermCapitalGains = true; },
  (w: TaxWorkspace) => { w.income.stcg111A = 1; },
  (w: TaxWorkspace) => { w.income.ltcg112A = 125_001; },
  (w: TaxWorkspace) => { w.income.vdaIncome = 1; },
  (w: TaxWorkspace) => { w.income.otherSpecialIncome = 1; },
]) {
  const w = createEmptyWorkspace();
  configure(w);
  expectForm(w, "ITR-2");
}

// Business without an established presumptive position -> ITR-3.
{
  const w = createEmptyWorkspace();
  w.eligibility.hasBusinessIncome = true;
  w.income.businessIncome = 100_000;
  expectForm(w, "ITR-3");
}

// 44AD.
{
  const w = presumptiveBase("44AD");
  w.presumptive.grossReceipts = 1_000_000;
  w.presumptive.cashReceipts = 0;
  w.presumptive.declaredIncome = 60_000;
  w.income.businessIncome = 60_000;
  expectForm(w, "ITR-4");
  w.presumptive.declaredIncome = 59_000;
  w.income.businessIncome = 59_000;
  expectForm(w, "ITR-3");
}
{
  const w = presumptiveBase("44AD");
  w.presumptive.grossReceipts = 30_000_000;
  w.presumptive.cashReceipts = 1_500_000;
  w.presumptive.declaredIncome = 1_830_000;
  w.income.businessIncome = 1_830_000;
  expectForm(w, "ITR-4");
  w.presumptive.grossReceipts = 30_000_001;
  w.presumptive.declaredIncome = 1_900_000;
  w.income.businessIncome = 1_900_000;
  expectForm(w, "ITR-3");
}
{
  const w = presumptiveBase("44AD");
  w.presumptive.grossReceipts = 20_000_000;
  w.presumptive.cashReceipts = 1_100_000;
  w.presumptive.declaredIncome = 1_300_000;
  w.income.businessIncome = 1_300_000;
  expectForm(w, "ITR-4");
  w.presumptive.grossReceipts = 20_000_001;
  expectForm(w, "ITR-3");
}
{
  const w = presumptiveBase("44AD");
  w.presumptive.grossReceipts = 1_000_000;
  w.presumptive.declaredIncome = 60_000;
  w.income.businessIncome = 60_000;
  w.presumptive.hasAgencyBusiness = true;
  expectForm(w, "ITR-3");
}
{
  const w = presumptiveBase("44AD");
  w.presumptive.grossReceipts = 1_000_000;
  w.presumptive.declaredIncome = 60_000;
  w.income.businessIncome = 60_000;
  w.presumptive.hasCommissionOrBrokerageIncome = true;
  expectForm(w, "ITR-3");
}

// 44ADA.
{
  const w = presumptiveBase("44ADA");
  w.presumptive.isSpecifiedProfession44AA = true;
  w.presumptive.grossReceipts = 1_000_000;
  w.presumptive.declaredIncome = 500_000;
  w.income.businessIncome = 500_000;
  expectForm(w, "ITR-4");
  w.presumptive.isSpecifiedProfession44AA = false;
  expectForm(w, "ITR-3");
}
{
  const w = presumptiveBase("44ADA");
  w.presumptive.isSpecifiedProfession44AA = true;
  w.presumptive.grossReceipts = 7_500_000;
  w.presumptive.cashReceipts = 375_000;
  w.presumptive.declaredIncome = 3_750_000;
  w.income.businessIncome = 3_750_000;
  expectForm(w, "ITR-4");
  w.presumptive.grossReceipts = 7_500_001;
  w.presumptive.declaredIncome = 3_800_000;
  w.income.businessIncome = 3_800_000;
  expectForm(w, "ITR-3");
}
{
  const w = presumptiveBase("44ADA");
  w.presumptive.isSpecifiedProfession44AA = true;
  w.presumptive.grossReceipts = 5_000_000;
  w.presumptive.cashReceipts = 300_000;
  w.presumptive.declaredIncome = 2_500_000;
  w.income.businessIncome = 2_500_000;
  expectForm(w, "ITR-4");
  w.presumptive.grossReceipts = 5_000_001;
  w.presumptive.declaredIncome = 2_600_000;
  w.income.businessIncome = 2_600_000;
  expectForm(w, "ITR-3");
}

// 44AE.
{
  const w = presumptiveBase("44AE");
  w.presumptive.grossReceipts = 1_000_000;
  w.presumptive.declaredIncome = 100_000;
  w.income.businessIncome = 100_000;
  w.presumptive.goodsCarriageCount = 1;
  w.presumptive.meetsSection44AEMinimumIncome = true;
  expectForm(w, "ITR-4");
  w.presumptive.goodsCarriageCount = 10;
  expectForm(w, "ITR-4");
  w.presumptive.goodsCarriageCount = 11;
  expectForm(w, "ITR-3");
}
{
  const w = presumptiveBase("44AE");
  w.presumptive.grossReceipts = 1_000_000;
  w.presumptive.declaredIncome = 100_000;
  w.income.businessIncome = 100_000;
  w.presumptive.goodsCarriageCount = 1;
  w.presumptive.meetsSection44AEMinimumIncome = false;
  expectForm(w, "ITR-3");
}

// ITR-4 exclusions -> ITR-3.
{
  const w = presumptiveBase("44ADA");
  w.presumptive.isSpecifiedProfession44AA = true;
  w.presumptive.grossReceipts = 1_000_000;
  w.presumptive.declaredIncome = 500_000;
  w.income.businessIncome = 500_000;
  w.profile.residency = "rnor";
  expectForm(w, "ITR-3");
}
{
  const w = presumptiveBase("44ADA");
  w.presumptive.isSpecifiedProfession44AA = true;
  w.presumptive.grossReceipts = 1_000_000;
  w.presumptive.declaredIncome = 500_000;
  w.income.businessIncome = 500_000;
  w.income.stcg111A = 1;
  expectForm(w, "ITR-3");
}
{
  const w = presumptiveBase("44ADA");
  w.presumptive.isSpecifiedProfession44AA = true;
  w.presumptive.grossReceipts = 1_000_000;
  w.presumptive.declaredIncome = 500_000;
  w.income.businessIncome = 500_000;
  w.income.ltcg112A = 125_000;
  expectForm(w, "ITR-4");
  w.income.ltcg112A = 125_001;
  expectForm(w, "ITR-3");
}
{
  const w = presumptiveBase("44ADA");
  w.presumptive.isSpecifiedProfession44AA = true;
  w.presumptive.grossReceipts = 1_000_000;
  w.presumptive.declaredIncome = 500_000;
  w.income.businessIncome = 500_000;
  w.eligibility.housePropertyCount = 3;
  expectForm(w, "ITR-3");
}

console.log("Expanded ITR form-selection regression tests passed.");
