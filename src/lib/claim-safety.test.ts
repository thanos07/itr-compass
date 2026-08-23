import assert from "node:assert/strict";
import {
  dedupeCandidateClaims,
  findAcceptedClaimConflict,
} from "./claim-safety";
import type { SourceClaim } from "./workspace-types";

function claim(
  id: string,
  field: string,
  value: number | string,
  accepted = false,
): SourceClaim {
  return {
    id,
    documentId: "doc-1",
    label: id,
    field,
    value,
    confidence: 1,
    locator: "test",
    accepted,
  };
}

const existing = [
  claim("salary-accepted", "income.grossSalary", 1_250_000, true),
  claim("tds-accepted", "taxesPaid.tdsSalary", 70_000, true),
  claim("other-accepted", "income.otherSources", 20_000, true),
];

const incoming = [
  claim("salary-ai", "income.grossSalary", 1_250_000),
  claim("tds-ai", "taxesPaid.tdsSalary", 70_000),
  claim("other-ai", "income.otherSources", 20_000),
];

const deduped = dedupeCandidateClaims(existing, incoming);
assert.equal(deduped.uniqueClaims.length, 0);
assert.equal(deduped.skipped, 3);

const mixedIncoming = [
  ...incoming,
  claim("different-salary", "income.grossSalary", 1_200_000),
];

const mixed = dedupeCandidateClaims(existing, mixedIncoming);
assert.equal(mixed.uniqueClaims.length, 1);
assert.equal(mixed.uniqueClaims[0]?.id, "different-salary");
assert.equal(mixed.skipped, 3);

const conflict = findAcceptedClaimConflict(
  existing,
  claim("salary-conflict", "income.grossSalary", 1_200_000),
);
assert.equal(conflict?.id, "salary-accepted");

const sameValue = findAcceptedClaimConflict(
  existing,
  claim("salary-same", "income.grossSalary", 1_250_000),
);
assert.equal(sameValue, undefined);

const differentField = findAcceptedClaimConflict(
  existing,
  claim("other-field", "taxesPaid.tdsOther", 1_200_000),
);
assert.equal(differentField, undefined);

const stringCandidate = findAcceptedClaimConflict(
  existing,
  claim("string-value", "income.grossSalary", "1250000"),
);
assert.equal(stringCandidate, undefined);

console.log("Claim safety tests passed.");
