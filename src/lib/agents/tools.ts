import { compareRegimes } from "@/lib/tax/engine";
import { selectItrForm } from "@/lib/tax/form-selector";
import type { AgentKey, TaxWorkspace } from "@/lib/workspace-types";

export type AgentWorkspaceSnapshot = {
  assessmentYear: "2026-27";
  profile: Pick<TaxWorkspace["profile"], "ageBand" | "residency" | "employmentNature">;
  eligibility: TaxWorkspace["eligibility"];
  presumptive: TaxWorkspace["presumptive"];
  income: TaxWorkspace["income"];
  deductions: TaxWorkspace["deductions"];
  taxesPaid: TaxWorkspace["taxesPaid"];
  documents: Array<{
    id: string;
    name: string;
    kind: TaxWorkspace["documents"][number]["kind"];
    parser: TaxWorkspace["documents"][number]["parser"];
    pagesOrRows: number;
    warnings: string[];
    preview: string;
    claims: Array<Pick<TaxWorkspace["documents"][number]["claims"][number], "label" | "field" | "value" | "confidence" | "locator" | "accepted">>;
  }>;
  notes: string;
};

export function asTaxWorkspace(snapshot: AgentWorkspaceSnapshot): TaxWorkspace {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    id: "agent-snapshot",
    assessmentYear: snapshot.assessmentYear,
    createdAt: now,
    updatedAt: now,
    profile: { fullName: "", panMasked: "", ...snapshot.profile },
    eligibility: snapshot.eligibility,
    presumptive: snapshot.presumptive,
    income: snapshot.income,
    deductions: snapshot.deductions,
    taxesPaid: snapshot.taxesPaid,
    documents: snapshot.documents.map((document) => ({
      ...document,
      size: 0,
      uploadedAt: now,
      claims: document.claims.map((claim, index) => ({ ...claim, id: `claim-${index}`, documentId: document.id })),
    })),
    agentRuns: {},
    notes: snapshot.notes,
  };
}

function expectedDocuments(snapshot: AgentWorkspaceSnapshot) {
  const expected = new Set<string>(["AIS", "TIS", "Form 26AS"]);
  if (snapshot.income.grossSalary > 0 || snapshot.profile.employmentNature !== "not-applicable") expected.add("Form 16 or pension certificate");
  if (snapshot.income.otherSources > 0) expected.add("Bank / interest statements");
  if (snapshot.income.stcg111A > 0 || snapshot.income.ltcg112A > 0) expected.add("Broker capital-gains statement and contract notes");
  if (snapshot.eligibility.hasBusinessIncome || snapshot.income.businessIncome > 0) expected.add("Business receipts, books/expense records and presumptive eligibility evidence");
  if (snapshot.eligibility.hasForeignAssetsOrIncome) expected.add("Foreign account/equity statements, foreign tax proof and exchange-rate support");
  if (snapshot.income.agriculturalIncome > 0) expected.add("Agricultural-income evidence");
  if (snapshot.eligibility.hasTds194N) expected.add("Section 194N TDS certificate / Form 26AS evidence");
  return [...expected];
}

export function runIntakeTools(snapshot: AgentWorkspaceSnapshot) {
  const kinds = snapshot.documents.reduce<Record<string, number>>((acc, document) => {
    acc[document.kind] = (acc[document.kind] || 0) + 1;
    return acc;
  }, {});
  const warnings = snapshot.documents.flatMap((document) => document.warnings.map((warning) => ({ documentId: document.id, documentName: document.name, warning })));
  const emptyExtraction = snapshot.documents.filter((document) => document.claims.length === 0).map((document) => ({ id: document.id, name: document.name, kind: document.kind }));
  const lowConfidence = snapshot.documents.flatMap((document) => document.claims.filter((claim) => claim.confidence < 0.7).map((claim) => ({ documentId: document.id, field: claim.field, label: claim.label, confidence: claim.confidence })));
  return {
    inventory: snapshot.documents.map((document) => ({ id: document.id, name: document.name, kind: document.kind, parser: document.parser, units: document.pagesOrRows, claimCount: document.claims.length })),
    kindCounts: kinds,
    expectedDocuments: expectedDocuments(snapshot),
    parserWarnings: warnings,
    documentsWithoutCandidates: emptyExtraction,
    lowConfidenceCandidates: lowConfidence,
    controls: {
      browserParsed: snapshot.documents.filter((document) => document.parser === "browser").length,
      renderParsed: snapshot.documents.filter((document) => document.parser === "render").length,
      acceptedClaims: snapshot.documents.flatMap((document) => document.claims).filter((claim) => claim.accepted).length,
    },
  };
}

function readWorkspaceField(snapshot: AgentWorkspaceSnapshot, field: string) {
  const [section, key] = field.split(".") as ["income" | "deductions" | "taxesPaid", string];
  const record = snapshot[section] as unknown as Record<string, unknown>;
  return record && typeof record[key] === "number" ? Number(record[key]) : null;
}

export function runReconciliationTools(snapshot: AgentWorkspaceSnapshot) {
  const allClaims = snapshot.documents.flatMap((document) => document.claims.map((claim) => ({ ...claim, documentId: document.id, documentName: document.name, kind: document.kind })));
  const groups = new Map<string, typeof allClaims>();
  for (const claim of allClaims) groups.set(claim.field, [...(groups.get(claim.field) || []), claim]);

  const fieldChecks = [...groups.entries()].map(([field, claims]) => {
    const numeric = claims.filter((claim) => typeof claim.value === "number") as Array<(typeof claims)[number] & { value: number }>;
    const values = numeric.map((claim) => claim.value);
    const unique = [...new Set(values.map((value) => Math.round(value)))];
    const accepted = numeric.filter((claim) => claim.accepted);
    const workspaceValue = readWorkspaceField(snapshot, field);
    return {
      field,
      workspaceValue,
      candidateCount: claims.length,
      acceptedCount: accepted.length,
      values: numeric.map((claim) => ({ value: claim.value, documentId: claim.documentId, documentName: claim.documentName, label: claim.label, accepted: claim.accepted, confidence: claim.confidence })),
      conflict: unique.length > 1,
      acceptedConflict: new Set(accepted.map((claim) => Math.round(claim.value))).size > 1,
      workspaceMatchesAccepted: accepted.length === 0 || accepted.some((claim) => Math.round(claim.value) === Math.round(workspaceValue || 0)),
    };
  });

  const kinds = new Set(snapshot.documents.map((document) => document.kind));
  const coverage = {
    salaryHasForm16: snapshot.income.grossSalary === 0 || kinds.has("form16"),
    taxCreditsHave26ASorAIS: Object.values(snapshot.taxesPaid).every((value) => value === 0) || kinds.has("26as") || kinds.has("ais"),
    capitalGainsHaveBroker: snapshot.income.stcg111A + snapshot.income.ltcg112A === 0 || kinds.has("broker"),
    foreignCaseHasSpecialistEvidence: !snapshot.eligibility.hasForeignAssetsOrIncome || snapshot.documents.some((document) => /foreign|rsu|espp|w-?2|1042|broker/i.test(`${document.name} ${document.preview.slice(0, 400)}`)),
    presumptiveFactsEntered: !snapshot.eligibility.usesPresumptiveTaxation || (snapshot.presumptive.grossReceipts > 0 && snapshot.presumptive.declaredIncome > 0),
  };

  const totalTaxCredits = Object.values(snapshot.taxesPaid).reduce((sum, value) => sum + value, 0);
  const acceptedByField = allClaims.filter((claim) => claim.accepted && typeof claim.value === "number").reduce<Record<string, number[]>>((acc, claim) => {
    (acc[claim.field] ||= []).push(Number(claim.value));
    return acc;
  }, {});

  return { fieldChecks, coverage, totalTaxCredits, acceptedByField };
}

export function runReviewTools(snapshot: AgentWorkspaceSnapshot) {
  const workspace = asTaxWorkspace(snapshot);
  const form = selectItrForm(workspace);
  const regimes = compareRegimes(workspace);
  const allClaims = snapshot.documents.flatMap((document) => document.claims);
  const taxSupported = regimes.newRegime.supported && regimes.oldRegime.supported;
  const criticalControls = [
    { id: "documents", passed: snapshot.documents.length > 0, message: "At least one source document is registered." },
    { id: "accepted-claims", passed: allClaims.some((claim) => claim.accepted) || snapshot.documents.length === 0, message: "Extracted values used in the workpaper have been explicitly accepted." },
    { id: "44ada", passed: snapshot.eligibility.presumptiveSection !== "44ADA" || (snapshot.eligibility.usesPresumptiveTaxation && snapshot.presumptive.isSpecifiedProfession44AA), message: "Section 44ADA requires an explicit presumptive choice and a fact-supported section 44AA(1) profession; an occupation code is not enough." },
    { id: "presumptive", passed: snapshot.eligibility.presumptiveSection === "none" || form.form === "ITR-4", message: "The collected facts pass the app's conservative presumptive-tax screen; remaining statutory conditions still need verification." },
    { id: "foreign", passed: !snapshot.eligibility.hasForeignAssetsOrIncome, message: "Foreign asset/income cases require Schedule FA/FSI/TR and Form 67 review outside this simplified calculator." },
    { id: "tax-supported", passed: taxSupported, message: taxSupported ? "Both regime calculations are within the implemented boundary." : "At least one regime calculation is outside the implemented boundary; do not show a final estimate." },
    { id: "form-screen", passed: form.status === "candidate", message: form.status === "candidate" ? "The collected facts support a potential form candidate." : "The app selected a safer fallback because one or more form conditions are unresolved." },
    { id: "parser-warnings", passed: snapshot.documents.every((document) => document.warnings.length === 0), message: "No parser warning remains unresolved." },
  ];
  return {
    likelyForm: form,
    regimeComparison: {
      recommended: regimes.recommended,
      difference: regimes.difference,
      newRegime: {
        supported: regimes.newRegime.supported,
        blockingIssues: regimes.newRegime.blockingIssues,
        totalIncome: regimes.newRegime.totalIncome,
        totalTax: regimes.newRegime.supported ? regimes.newRegime.totalTax : null,
        payable: regimes.newRegime.supported ? regimes.newRegime.payable : null,
        refund: regimes.newRegime.supported ? regimes.newRegime.refund : null,
        warnings: regimes.newRegime.warnings,
      },
      oldRegime: {
        supported: regimes.oldRegime.supported,
        blockingIssues: regimes.oldRegime.blockingIssues,
        totalIncome: regimes.oldRegime.totalIncome,
        totalTax: regimes.oldRegime.supported ? regimes.oldRegime.totalTax : null,
        payable: regimes.oldRegime.supported ? regimes.oldRegime.payable : null,
        refund: regimes.oldRegime.supported ? regimes.oldRegime.refund : null,
        warnings: regimes.oldRegime.warnings,
      },
    },
    criticalControls,
    unresolvedNotes: snapshot.notes,
    evidenceStats: {
      documents: snapshot.documents.length,
      candidates: allClaims.length,
      accepted: allClaims.filter((claim) => claim.accepted).length,
      unacceptedHighConfidence: allClaims.filter((claim) => !claim.accepted && claim.confidence >= 0.8).length,
    },
  };
}

export function toolContextForAgent(agent: AgentKey, snapshot: AgentWorkspaceSnapshot) {
  if (agent === "intake") return runIntakeTools(snapshot);
  if (agent === "reconciliation") return runReconciliationTools(snapshot);
  if (agent === "review") return runReviewTools(snapshot);
  return {};
}
