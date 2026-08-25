import assert from "node:assert/strict";
import { retrieveLegalSources } from "@/lib/legal/retriever";
import { runIntakeTools, runReconciliationTools, runReviewTools, type AgentWorkspaceSnapshot } from "@/lib/agents/tools";
import { createEmptyWorkspace } from "@/lib/workspace-types";

const workspace = createEmptyWorkspace();
workspace.profile = { fullName: "", panMasked: "", ageBand: "under60", residency: "resident", employmentNature: "private" };
workspace.eligibility.housePropertyCount = 1;
workspace.income.grossSalary = 1_200_000;
workspace.income.otherSources = 20_000;
workspace.deductions.section80C = 150_000;
workspace.deductions.section80D = 25_000;
workspace.taxesPaid.tdsSalary = 70_000;

const snapshot: AgentWorkspaceSnapshot = {
  assessmentYear: workspace.assessmentYear,
  profile: { ageBand: workspace.profile.ageBand, residency: workspace.profile.residency, employmentNature: workspace.profile.employmentNature },
  eligibility: workspace.eligibility,
  presumptive: workspace.presumptive,
  income: workspace.income,
  deductions: workspace.deductions,
  taxesPaid: workspace.taxesPaid,
  documents: [
    {
      id: "form16-1",
      name: "Form16.pdf",
      kind: "form16",
      parser: "browser",
      pagesOrRows: 4,
      warnings: [],
      preview: "Form No. 16 gross salary 12,00,000 total tax deducted 70,000",
      claims: [
        { label: "Gross salary", field: "income.grossSalary", value: 1_200_000, confidence: 0.9, locator: "page 2", accepted: true },
        { label: "TDS salary", field: "taxesPaid.tdsSalary", value: 70_000, confidence: 0.9, locator: "page 1", accepted: true },
      ],
    },
    {
      id: "ais-1",
      name: "AIS.pdf",
      kind: "ais",
      parser: "browser",
      pagesOrRows: 8,
      warnings: [],
      preview: "Annual Information Statement salary information 12,50,000",
      claims: [
        { label: "Salary reported", field: "income.grossSalary", value: 1_250_000, confidence: 0.75, locator: "page 3", accepted: false },
      ],
    },
  ],
  notes: "Confirm bank interest.",
};

const intake = runIntakeTools(snapshot);
assert.equal(intake.inventory.length, 2);
assert.ok(intake.expectedDocuments.includes("AIS"));
assert.equal(intake.controls.acceptedClaims, 2);

const reconciliation = runReconciliationTools(snapshot);
const salaryCheck = reconciliation.fieldChecks.find((item) => item.field === "income.grossSalary");
assert.ok(salaryCheck);
assert.equal(salaryCheck?.conflict, true);
assert.equal(salaryCheck?.acceptedConflict, false);

const review = runReviewTools(snapshot);
assert.equal(review.likelyForm.form, "ITR-1");
assert.equal(review.evidenceStats.accepted, 2);
assert.equal(review.regimeComparison.newRegime.supported, true);

const RETRIEVAL_TEST_DATE =
  "2026-08-25";

const section44ada =
  retrieveLegalSources(
    "Can a social media influencer automatically use section 44ADA?",
    "2026-27",
    3,
    RETRIEVAL_TEST_DATE,
  );

assert.equal(
  section44ada[0]?.id,
  "section-44ada",
);

const rebate =
  retrieveLegalSources(
    "section 87A rebate 12 lakh AY 2026-27",
    "2026-27",
    3,
    RETRIEVAL_TEST_DATE,
  );

assert.equal(
  rebate[0]?.id,
  "section-87a-ay26",
);

/*
 * Runtime retrieval must fail closed when every
 * otherwise matching legal source is stale.
 */
const staleRetrieval =
  retrieveLegalSources(
    "section 44ADA presumptive profession",
    "2026-27",
    5,
    "2099-01-01",
  );

assert.deepEqual(
  staleRetrieval,
  [],
  "Stale legal sources must not be returned at runtime.",
);

/*
 * Unknown assessment years must not fall through
 * to AY-specific sources.
 */
const wrongAssessmentYear =
  retrieveLegalSources(
    "section 87A rebate",
    "2099-00",
    5,
    RETRIEVAL_TEST_DATE,
  );

assert.deepEqual(
  wrongAssessmentYear,
  [],
  "AY-specific sources must not leak into another assessment year.",
);

/*
 * Non-positive limits should return no sources.
 */
const zeroLimit =
  retrieveLegalSources(
    "section 87A",
    "2026-27",
    0,
    RETRIEVAL_TEST_DATE,
  );

assert.deepEqual(
  zeroLimit,
  [],
);

console.log(
  "Agent tools and legal retrieval tests passed.",
);
