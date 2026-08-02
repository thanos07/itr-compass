import assert from "node:assert/strict";
import { computeTax } from "./engine";
import { selectItrForm } from "./form-selector";
import { createEmptyWorkspace } from "../workspace-types";

{
  const workspace = createEmptyWorkspace();
  workspace.eligibility.hasBusinessIncome = true;
  workspace.eligibility.usesPresumptiveTaxation = true;
  workspace.eligibility.presumptiveSection = "44ADA";
  workspace.income.businessIncome = 500_000;
  workspace.presumptive.grossReceipts = 1_000_000;
  workspace.presumptive.declaredIncome = 500_000;
  const result = selectItrForm(workspace);
  assert.equal(result.form, "ITR-3");
  assert.ok(result.blockers.some((item) => item.includes("section 44AA(1)")));

  workspace.presumptive.isSpecifiedProfession44AA = true;
  const eligible = selectItrForm(workspace);
  assert.equal(eligible.form, "ITR-4");
  assert.equal(eligible.status, "candidate");
}

{
  const workspace = createEmptyWorkspace();
  workspace.income.agriculturalIncome = 6_000;
  const result = selectItrForm(workspace);
  assert.equal(result.form, "ITR-2");
  assert.ok(result.blockers.some((item) => item.includes("Agricultural income")));
  const tax = computeTax(workspace, "new");
  assert.equal(tax.supported, false);
  assert.ok(tax.blockingIssues.some((item) => item.includes("partial integration")));
}

{
  const workspace = createEmptyWorkspace();
  workspace.income.grossSalary = 5_200_000;
  const result = computeTax(workspace, "new");
  assert.equal(result.supported, false);
  assert.ok(result.blockingIssues.some((item) => item.includes("Surcharge")));
}

{
  const workspace = createEmptyWorkspace();
  workspace.income.grossSalary = 1_000_000;
  workspace.deductions.section80CCH = 200_000;
  const notAgniveer = computeTax(workspace, "new");
  assert.equal(notAgniveer.deductions, 0);
  assert.ok(notAgniveer.warnings.some((item) => item.includes("ignored")));
  workspace.eligibility.isAgniveer = true;
  const agniveer = computeTax(workspace, "new");
  assert.equal(agniveer.deductions, 200_000);
}

console.log("Form selector and safety-boundary tests passed.");

{
  const workspace = createEmptyWorkspace();
  workspace.eligibility.hasBusinessIncome = true;
  workspace.income.businessIncome = 600_000;
  workspace.eligibility.form10IEAStatus = "not-filed";
  assert.equal(computeTax(workspace, "old").supported, false);
  assert.equal(computeTax(workspace, "new").supported, true);
}

{
  const workspace = createEmptyWorkspace();
  workspace.income.grossSalary = 1_000_000;
  workspace.deductions.otherOld = 25_000;
  const oldResult = computeTax(workspace, "old");
  assert.equal(oldResult.supported, false);
  assert.ok(oldResult.blockingIssues.some((item) => item.includes("generic other old-regime deduction")));
}
