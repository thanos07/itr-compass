import assert from "node:assert/strict";
import { computeTax, taxBySlabs } from "./engine";
import { TAX_RULES_AY_2026_27 } from "./rules";
import { createEmptyWorkspace } from "../workspace-types";

assert.equal(taxBySlabs(400000, TAX_RULES_AY_2026_27.newRegime.slabs), 0);
assert.equal(taxBySlabs(800000, TAX_RULES_AY_2026_27.newRegime.slabs), 20000);
assert.equal(taxBySlabs(1200000, TAX_RULES_AY_2026_27.newRegime.slabs), 60000);

{
  const workspace = createEmptyWorkspace();
  workspace.income.grossSalary = 1275000; // ₹12 lakh after ₹75,000 standard deduction.
  const result = computeTax(workspace, "new");
  assert.equal(result.totalIncome, 1200000);
  assert.equal(result.rebate, 60000);
  assert.equal(result.totalTax, 0);
}

{
  const workspace = createEmptyWorkspace();
  workspace.income.grossSalary = 1175000; // ₹11 lakh normal income after standard deduction.
  workspace.income.ltcg112A = 300000; // Total income ₹14 lakh: no 87A threshold eligibility.
  const result = computeTax(workspace, "new");
  assert.equal(result.totalIncome, 1400000);
  assert.equal(result.rebate, 0);
  assert.ok(result.totalTax > 0);
}

{
  const workspace = createEmptyWorkspace();
  workspace.profile.residency = "non-resident";
  workspace.income.grossSalary = 975000;
  const result = computeTax(workspace, "new");
  assert.equal(result.rebate, 0);
}

{
  const workspace = createEmptyWorkspace();
  workspace.income.grossSalary = 1285000; // ₹12.10 lakh after standard deduction.
  const result = computeTax(workspace, "new");
  assert.equal(result.totalIncome, 1210000);
  assert.equal(result.taxBeforeCess, 10000); // New-regime marginal relief estimate.
}

console.log("Tax engine tests passed.");
