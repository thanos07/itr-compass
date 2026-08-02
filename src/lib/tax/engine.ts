import { oldRegimeSlabs, TAX_RULES_AY_2026_27 as RULES } from "@/lib/tax/rules";
import type { TaxRegime, TaxWorkspace } from "@/lib/workspace-types";

export type TaxComputation = {
  regime: TaxRegime;
  supported: boolean;
  blockingIssues: string[];
  grossIncome: number;
  taxableSalary: number;
  normalIncomeBeforeDeductions: number;
  deductions: number;
  normalTaxableIncome: number;
  specialIncome: number;
  totalIncome: number;
  slabTax: number;
  specialTax: number;
  rebate: number;
  rebateMarginalRelief: number;
  taxBeforeCess: number;
  cess: number;
  totalTax: number;
  taxesPaid: number;
  payable: number;
  refund: number;
  warnings: string[];
};

function nonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function taxBySlabs(income: number, slabs: readonly { upTo: number; rate: number }[]) {
  let tax = 0;
  let lower = 0;
  const amount = Math.max(0, income);
  for (const slab of slabs) {
    const taxable = Math.max(0, Math.min(amount, slab.upTo) - lower);
    tax += taxable * slab.rate;
    if (amount <= slab.upTo) break;
    lower = slab.upTo;
  }
  return tax;
}

function roundedRupee(value: number) {
  return Math.round(Math.max(0, value));
}

function basicExemption(workspace: TaxWorkspace, regime: TaxRegime) {
  if (regime === "new") return 400000;
  if (workspace.profile.ageBand === "80plus") return 500000;
  if (workspace.profile.ageBand === "60to79") return 300000;
  return 250000;
}

export function computeTax(workspace: TaxWorkspace, regime: TaxRegime): TaxComputation {
  const warnings: string[] = [];
  const blockingIssues: string[] = [];
  const { income, deductions, taxesPaid, profile, eligibility } = workspace;
  const isResident = profile.residency === "resident";
  const standardDeduction = regime === "new" ? RULES.newRegime.standardDeduction : RULES.oldRegime.standardDeduction;

  const salaryReductions = regime === "old"
    ? standardDeduction + nonNegative(income.exemptAllowancesOld) + nonNegative(deductions.hraOld) + nonNegative(income.professionalTaxOld)
    : standardDeduction;
  const taxableSalary = Math.max(0, nonNegative(income.grossSalary) - salaryReductions);

  let houseProperty = Number.isFinite(income.housePropertyIncome) ? income.housePropertyIncome : 0;
  if (houseProperty < 0) {
    if (regime === "new") {
      warnings.push("Negative house-property income is not set off against other heads in this simplified new-regime estimate; it is treated as zero here.");
      houseProperty = 0;
    } else if (houseProperty < -200000) {
      warnings.push("Old-regime current-year house-property loss set-off is capped at ₹2,00,000 in this estimate.");
      houseProperty = -200000;
    }
  }

  const normalIncomeBeforeDeductions = Math.max(
    0,
    taxableSalary + houseProperty + nonNegative(income.businessIncome) + nonNegative(income.otherSources),
  );

  const agniveerDeduction = eligibility.isAgniveer ? nonNegative(deductions.section80CCH) : 0;
  if (!eligibility.isAgniveer && nonNegative(deductions.section80CCH) > 0) {
    warnings.push("Section 80CCH was entered without marking the taxpayer as an eligible Agniveer; the amount is ignored.");
  }

  const oldDeductions =
    Math.min(nonNegative(deductions.section80C), 150000) +
    nonNegative(deductions.section80D) +
    Math.min(nonNegative(deductions.section80CCD1B), 50000) +
    nonNegative(deductions.section80CCD2) +
    agniveerDeduction +
    nonNegative(deductions.section80G) +
    nonNegative(deductions.otherOld);
  const newDeductions = nonNegative(deductions.section80CCD2) + agniveerDeduction;
  const deductionTotal = Math.min(normalIncomeBeforeDeductions, regime === "old" ? oldDeductions : newDeductions);
  const normalTaxableIncome = Math.max(0, normalIncomeBeforeDeductions - deductionTotal);

  const stcg = nonNegative(income.stcg111A);
  const ltcg = nonNegative(income.ltcg112A);
  const vda = nonNegative(income.vdaIncome);
  const otherSpecial = nonNegative(income.otherSpecialIncome);
  const specialIncome = stcg + ltcg + vda + otherSpecial;
  const totalIncome = normalTaxableIncome + specialIncome;

  const slabs = regime === "new" ? RULES.newRegime.slabs : oldRegimeSlabs(profile.ageBand);
  const slabTax = taxBySlabs(normalTaxableIncome, slabs);
  const specialTax =
    stcg * RULES.stcg111ARate +
    Math.max(0, ltcg - RULES.ltcg112AExemption) * RULES.ltcg112ARate +
    vda * RULES.vdaRate +
    nonNegative(income.otherSpecialTax);

  if (otherSpecial > 0 && nonNegative(income.otherSpecialTax) === 0) {
    blockingIssues.push("Other special-rate income is present but its verified tax amount is zero. The calculator cannot determine the applicable section or rate.");
  }

  if (specialIncome > 0 && normalTaxableIncome < basicExemption(workspace, regime)) {
    blockingIssues.push("Unused basic-exemption-limit adjustment against special-rate income is not automated. Verify Schedule SI/CG in the official utility.");
  }

  let rebate = 0;
  let rebateMarginalRelief = 0;
  if (isResident) {
    const threshold = regime === "new" ? RULES.newRegime.rebateThreshold : RULES.oldRegime.rebateThreshold;
    const maximum = regime === "new" ? RULES.newRegime.rebateMaximum : RULES.oldRegime.rebateMaximum;
    if (totalIncome <= threshold) rebate = Math.min(slabTax, maximum);

    if (regime === "new" && specialIncome === 0 && totalIncome > threshold) {
      const excess = totalIncome - threshold;
      const taxAfterNormalRebate = Math.max(0, slabTax - rebate);
      if (taxAfterNormalRebate > excess) rebateMarginalRelief = taxAfterNormalRebate - excess;
    } else if (regime === "new" && specialIncome > 0 && totalIncome > threshold && totalIncome < 1300000) {
      blockingIssues.push("Section 87A marginal relief with special-rate income is not automated for this income band.");
    }
  }

  const taxBeforeCess = Math.max(0, slabTax + specialTax - rebate - rebateMarginalRelief);
  if (totalIncome > 5000000) {
    blockingIssues.push("Surcharge and surcharge marginal relief are not implemented for total income above ₹50 lakh.");
  }
  if (eligibility.hasSection115BBEIncome) {
    blockingIssues.push("Income under sections 68 to 69D / section 115BBE is outside this calculator's supported scope.");
  }
  if (nonNegative(income.agriculturalIncome) > 5000) {
    blockingIssues.push("Agricultural income above ₹5,000 may require partial integration; that calculation is not automated.");
  }
  if (eligibility.hasLotteryOrRacehorseIncome) {
    blockingIssues.push("Lottery or racehorse income is indicated and its special-rate computation is outside this calculator's supported scope.");
  }
  if (eligibility.hasForeignAssetsOrIncome) {
    blockingIssues.push("Foreign asset/income facts are indicated. Foreign-income inclusion, treaty relief, Schedule FSI/TR/FA and Form 67 are outside this calculator's supported scope.");
  }
  if (regime === "old" && nonNegative(deductions.otherOld) > 0) {
    blockingIssues.push("A generic other old-regime deduction was entered. Select and validate the specific statutory section before relying on an old-regime estimate.");
  }
  if (regime === "old" && (eligibility.hasBusinessIncome || nonNegative(income.businessIncome) > 0) && eligibility.form10IEAStatus !== "filed") {
    blockingIssues.push("Old-regime computation for business/professional income requires a timely, valid Form 10-IEA position; filed status is not confirmed.");
  }

  const cess = taxBeforeCess * RULES.cessRate;
  const totalTax = roundedRupee(taxBeforeCess + cess);
  const paid = roundedRupee(
    nonNegative(taxesPaid.tdsSalary) +
      nonNegative(taxesPaid.tdsOther) +
      nonNegative(taxesPaid.tcs) +
      nonNegative(taxesPaid.advanceTax) +
      nonNegative(taxesPaid.selfAssessmentTax),
  );

  const balance = totalTax - paid;
  return {
    regime,
    supported: blockingIssues.length === 0,
    blockingIssues,
    grossIncome: roundedRupee(nonNegative(income.grossSalary) + Math.max(0, houseProperty) + nonNegative(income.businessIncome) + nonNegative(income.otherSources) + specialIncome),
    taxableSalary: roundedRupee(taxableSalary),
    normalIncomeBeforeDeductions: roundedRupee(normalIncomeBeforeDeductions),
    deductions: roundedRupee(deductionTotal),
    normalTaxableIncome: roundedRupee(normalTaxableIncome),
    specialIncome: roundedRupee(specialIncome),
    totalIncome: roundedRupee(totalIncome),
    slabTax: roundedRupee(slabTax),
    specialTax: roundedRupee(specialTax),
    rebate: roundedRupee(rebate),
    rebateMarginalRelief: roundedRupee(rebateMarginalRelief),
    taxBeforeCess: roundedRupee(taxBeforeCess),
    cess: roundedRupee(cess),
    totalTax,
    taxesPaid: paid,
    payable: Math.max(0, balance),
    refund: Math.max(0, -balance),
    warnings,
  };
}

export function compareRegimes(workspace: TaxWorkspace) {
  const oldRegime = computeTax(workspace, "old");
  const newRegime = computeTax(workspace, "new");
  const comparable = oldRegime.supported && newRegime.supported;
  const recommended: TaxRegime | null = comparable ? (oldRegime.totalTax < newRegime.totalTax ? "old" : "new") : null;
  return {
    oldRegime,
    newRegime,
    recommended,
    difference: comparable ? Math.abs(oldRegime.totalTax - newRegime.totalTax) : null,
  };
}
