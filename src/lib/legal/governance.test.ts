import assert from "node:assert/strict";

import {
  LEGAL_CORPUS,
  type LegalSource,
} from "./corpus";

import {
  assertLegalCorpusGovernance,
  getLegalSourceFreshness,
  LEGAL_SOURCE_MAX_AGE_DAYS,
  validateLegalCorpus,
} from "./governance";

/*
 * This intentionally uses the current date.
 *
 * The purpose of this test is to make future CI runs
 * fail when AY-specific legal sources become stale,
 * forcing an explicit corpus review instead of allowing
 * old legal guidance to remain unnoticed.
 */
const currentIssues =
  validateLegalCorpus(
    LEGAL_CORPUS,
    new Date(),
  );

const currentErrors =
  currentIssues.filter(
    (issue) =>
      issue.severity === "error",
  );

assert.deepEqual(
  currentErrors,
  [],
  [
    "Current legal corpus must satisfy governance checks.",
    ...currentErrors.map(
      (issue) =>
        `[${issue.code}] ${issue.message}`,
    ),
  ].join("\n"),
);

assert.doesNotThrow(() =>
  assertLegalCorpusGovernance(
    LEGAL_CORPUS,
    new Date(),
  ),
);

/*
 * All identifiers must be unique.
 */
assert.equal(
  new Set(
    LEGAL_CORPUS.map(
      (source) => source.id,
    ),
  ).size,
  LEGAL_CORPUS.length,
);

/*
 * Verify the configured freshness windows.
 */
assert.equal(
  LEGAL_SOURCE_MAX_AGE_DAYS.current,
  90,
);

assert.equal(
  LEGAL_SOURCE_MAX_AGE_DAYS[
    "verify-before-filing"
  ],
  45,
);

const fixtureSource =
  LEGAL_CORPUS[0];

assert.ok(
  fixtureSource,
  "Legal corpus must contain at least one source.",
);

/*
 * A deliberately stale source must fail governance.
 */
const staleSource: LegalSource = {
  ...fixtureSource,
  id: "governance-stale-fixture",
  retrievedAt: "2020-01-01",
  sourceStatus:
    "verify-before-filing",
};

const staleIssues =
  validateLegalCorpus(
    [staleSource],
    "2026-08-25",
  );

assert.equal(
  staleIssues.some(
    (issue) =>
      issue.code ===
      "stale-source",
  ),
  true,
  "Stale legal sources must be rejected.",
);

/*
 * A source hosted outside the approved official
 * Income Tax domains must fail governance.
 */
const unapprovedHostSource: LegalSource = {
  ...fixtureSource,
  id:
    "governance-host-fixture",
  url:
    "https://example.com/tax-guidance",
  retrievedAt:
    "2026-08-25",
};

const hostIssues =
  validateLegalCorpus(
    [unapprovedHostSource],
    "2026-08-25",
  );

assert.equal(
  hostIssues.some(
    (issue) =>
      issue.code ===
      "unapproved-source-host",
  ),
  true,
  "Non-official legal source hosts must be rejected.",
);

/*
 * Duplicate source identifiers must fail governance.
 */
const duplicateIssues =
  validateLegalCorpus(
    [
      {
        ...fixtureSource,
        retrievedAt:
          "2026-08-25",
      },
      {
        ...fixtureSource,
        retrievedAt:
          "2026-08-25",
      },
    ],
    "2026-08-25",
  );

assert.equal(
  duplicateIssues.some(
    (issue) =>
      issue.code ===
      "duplicate-source-id",
  ),
  true,
  "Duplicate legal source IDs must be rejected.",
);

/*
 * Freshness calculation itself receives a direct
 * regression check.
 */
const freshness =
  getLegalSourceFreshness(
    {
      ...fixtureSource,
      retrievedAt:
        "2026-08-01",
      sourceStatus:
        "verify-before-filing",
    },
    "2026-08-25",
  );

assert.equal(
  freshness.ageDays,
  24,
);

assert.equal(
  freshness.stale,
  false,
);

console.log(
  "Legal corpus governance tests passed.",
);
