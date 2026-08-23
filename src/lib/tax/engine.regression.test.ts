import assert from "node:assert/strict";
import { compareRegimes, computeTax, taxBySlabs } from "./engine";
import { oldRegimeSlabs, TAX_RULES_AY_2026_27 as RULES } from "./rules";
import { createEmptyWorkspace } from "../workspace-types";

function hasText(items: string[], text: string) {
  assert.ok(items.some((item) => item.includes(text)), `Expected message containing: ${text}`);
}

// New-regime slab boundaries.
assert.equal(taxBySlabs(-1, RULES.newRegime.slabs), 0);
assert.equal(taxBySlabs(0, RULES.newRegime.slabs), 0);
assert.equal(taxBySlabs(400_000, RULES.newRegime.slabs), 0);
assert.equal(taxBySlabs(800_000, RULES.newRegime.slabs), 20_000);
assert.equal(taxBySlabs(1_200_000, RULES.newRegime.slabs), 60_000);
assert.equal(taxBySlabs(1_600_000, RULES.newRegime.slabs), 120_000);
assert.equal(taxBySlabs(2_000_000, RULES.newRegime.slabs), 200_000);
assert.equal(taxBySlabs(2_400_000, RULES.newRegime.slabs), 300_000);
assert.equal(taxBySlabs(2_500_000, RULES.newRegime.slabs), 330_000);

// Old-regime age-band basic exemption boundaries.
assert.equal(taxBySlabs(500_000, oldRegimeSlabs("under60")), 12_500);
assert.equal(taxBySlabs(300_000, oldRegimeSlabs("60to79")), 0);
assert.equal(taxBySlabs(500_000, oldRegimeSlabs("60to79")), 10_000);
assert.equal(taxBySlabs(500_000, oldRegimeSlabs("80plus")), 0);

// Standard deductions.
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 75_000;
  assert.equal(computeTax(w, "new").taxableSalary, 0);
}
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 50_000;
  assert.equal(computeTax(w, "old").taxableSalary, 0);
}

// Section 87A thresholds and marginal relief.
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 1_275_000;
  const r = computeTax(w, "new");
  assert.equal(r.totalIncome, 1_200_000);
  assert.equal(r.slabTax, 60_000);
  assert.equal(r.rebate, 60_000);
  assert.equal(r.totalTax, 0);
}
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 1_285_000;
  const r = computeTax(w, "new");
  assert.equal(r.totalIncome, 1_210_000);
  assert.equal(r.rebateMarginalRelief, 51_500);
  assert.equal(r.taxBeforeCess, 10_000);
  assert.equal(r.totalTax, 10_400);
}
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 550_000;
  const r = computeTax(w, "old");
  assert.equal(r.slabTax, 12_500);
  assert.equal(r.rebate, 12_500);
  assert.equal(r.totalTax, 0);
}
{
  const w = createEmptyWorkspace();
  w.profile.residency = "non-resident";
  w.income.grossSalary = 1_275_000;
  const r = computeTax(w, "new");
  assert.equal(r.rebate, 0);
  assert.equal(r.totalTax, 62_400);
}

// Deduction boundaries.
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 1_000_000;
  w.deductions.section80C = 200_000;
  const r = computeTax(w, "old");
  assert.equal(r.deductions, 150_000);
  assert.equal(r.normalTaxableIncome, 800_000);
}
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 1_000_000;
  w.deductions.section80CCD1B = 80_000;
  const r = computeTax(w, "old");
  assert.equal(r.deductions, 50_000);
  assert.equal(r.normalTaxableIncome, 900_000);
}
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 1_000_000;
  w.deductions.section80C = 200_000;
  w.deductions.section80CCD2 = 100_000;
  const r = computeTax(w, "new");
  assert.equal(r.deductions, 100_000);
  assert.equal(r.normalTaxableIncome, 825_000);
}

// House-property loss handling.
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 1_000_000;
  w.income.housePropertyIncome = -100_000;
  const r = computeTax(w, "new");
  assert.equal(r.normalIncomeBeforeDeductions, 925_000);
  hasText(r.warnings, "Negative house-property income");
}
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 1_000_000;
  w.income.housePropertyIncome = -300_000;
  const r = computeTax(w, "old");
  assert.equal(r.normalIncomeBeforeDeductions, 750_000);
  hasText(r.warnings, "capped at ₹2,00,000");
}

// Special-rate income calculations.
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 1_000_000;
  w.income.stcg111A = 100_000;
  assert.equal(computeTax(w, "new").specialTax, 20_000);
}
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 1_000_000;
  w.income.ltcg112A = 225_000;
  assert.equal(computeTax(w, "new").specialTax, 12_500);
}
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 1_000_000;
  w.income.vdaIncome = 100_000;
  assert.equal(computeTax(w, "new").specialTax, 30_000);
}

// Safety boundaries.
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 1_000_000;
  w.income.otherSpecialIncome = 100_000;
  const r = computeTax(w, "new");
  assert.equal(r.supported, false);
  hasText(r.blockingIssues, "verified tax amount is zero");
}
{
  const w = createEmptyWorkspace();
  w.income.stcg111A = 100_000;
  const r = computeTax(w, "new");
  assert.equal(r.supported, false);
  hasText(r.blockingIssues, "Unused basic-exemption-limit adjustment");
}
{
  const w = createEmptyWorkspace();
  w.income.otherSources = 5_000_001;
  const r = computeTax(w, "new");
  assert.equal(r.supported, false);
  hasText(r.blockingIssues, "Surcharge");
}
{
  const w = createEmptyWorkspace();
  w.eligibility.hasSection115BBEIncome = true;
  const r = computeTax(w, "new");
  assert.equal(r.supported, false);
  hasText(r.blockingIssues, "115BBE");
}
{
  const w = createEmptyWorkspace();
  w.income.agriculturalIncome = 5_001;
  const r = computeTax(w, "new");
  assert.equal(r.supported, false);
  hasText(r.blockingIssues, "partial integration");
}
{
  const w = createEmptyWorkspace();
  w.eligibility.hasLotteryOrRacehorseIncome = true;
  const r = computeTax(w, "new");
  assert.equal(r.supported, false);
  hasText(r.blockingIssues, "Lottery or racehorse");
}
{
  const w = createEmptyWorkspace();
  w.eligibility.hasForeignAssetsOrIncome = true;
  const r = computeTax(w, "new");
  assert.equal(r.supported, false);
  hasText(r.blockingIssues, "Foreign asset/income");
}
{
  const w = createEmptyWorkspace();
  w.income.grossSalary = 1_000_000;
  w.deductions.otherOld = 25_000;
  const r = computeTax(w, "old");
  assert.equal(r.supported, false);
  hasText(r.blockingIssues, "generic other old-regime deduction");
}
{
  const w = createEmptyWorkspace();
  w.eligibility.hasBusinessIncome = true;
  w.income.businessIncome = 600_000;
  w.eligibility.form10IEAStatus = "not-filed";
  assert.equal(computeTax(w, "old").supported, false);
  w.eligibility.form10IEAStatus = "filed";
  assert.equal(computeTax(w, "old").supported, true);
}

// Taxes-paid aggregation and refund.
{
  const w = createEmptyWorkspace();
  w.profile.residency = "non-resident";
  w.income.grossSalary = 1_275_000;
  w.taxesPaid.tdsSalary = 20_000;
  w.taxesPaid.tdsOther = 10_000;
  w.taxesPaid.tcs = 5_000;
  w.taxesPaid.advanceTax = 15_000;
  w.taxesPaid.selfAssessmentTax = 20_000;
  const r = computeTax(w, "new");
  assert.equal(r.taxesPaid, 70_000);
  assert.equal(r.totalTax, 62_400);
  assert.equal(r.refund, 7_600);
  assert.equal(r.payable, 0);
}

// Unsupported computations must not generate a regime recommendation.
{
  const w = createEmptyWorkspace();
  w.eligibility.hasForeignAssetsOrIncome = true;
  const comparison = compareRegimes(w);
  assert.equal(comparison.recommended, null);
  assert.equal(comparison.difference, null);
}

console.log("Expanded tax-engine regression tests passed.");
