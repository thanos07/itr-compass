import type { LegalSource } from "./corpus";

export const ACTIVE_LEGAL_ASSESSMENT_YEAR =
  "2026-27";

export const LEGAL_SOURCE_MAX_AGE_DAYS: Record<
  LegalSource["sourceStatus"],
  number
> = {
  current: 90,
  "verify-before-filing": 45,
};

const REVIEW_DUE_WINDOW_DAYS = 7;
const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1_000;

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

const OFFICIAL_LEGAL_SOURCE_HOSTS =
  new Set([
    "incometax.gov.in",
    "www.incometax.gov.in",
    "incometaxindia.gov.in",
    "www.incometaxindia.gov.in",
  ]);

export type LegalSourceFreshness = {
  ageDays: number | null;
  maxAgeDays: number;
  stale: boolean;
  reviewDue: boolean;
};

export type LegalCorpusIssue = {
  severity: "error" | "warning";
  code: string;
  sourceId?: string;
  message: string;
};

function parseIsoDate(
  value: string,
): Date | null {
  if (!ISO_DATE_PATTERN.test(value)) {
    return null;
  }

  const parsed = new Date(
    `${value}T00:00:00Z`,
  );

  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed
      .toISOString()
      .slice(0, 10) !== value
  ) {
    return null;
  }

  return parsed;
}

function normalizeAsOfDate(
  value: Date | string,
): Date | null {
  if (typeof value === "string") {
    return parseIsoDate(value);
  }

  if (!Number.isFinite(value.getTime())) {
    return null;
  }

  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
    ),
  );
}

export function getLegalSourceFreshness(
  source: LegalSource,
  asOf: Date | string = new Date(),
): LegalSourceFreshness {
  const maxAgeDays =
    LEGAL_SOURCE_MAX_AGE_DAYS[
      source.sourceStatus
    ];

  const retrievedAt =
    parseIsoDate(source.retrievedAt);

  const asOfDate =
    normalizeAsOfDate(asOf);

  if (!retrievedAt || !asOfDate) {
    return {
      ageDays: null,
      maxAgeDays,
      stale: true,
      reviewDue: true,
    };
  }

  const ageDays = Math.floor(
    (
      asOfDate.getTime() -
      retrievedAt.getTime()
    ) / MILLISECONDS_PER_DAY,
  );

  const stale =
    ageDays > maxAgeDays;

  const reviewDue =
    !stale &&
    ageDays >=
      maxAgeDays -
        REVIEW_DUE_WINDOW_DAYS;

  return {
    ageDays,
    maxAgeDays,
    stale,
    reviewDue,
  };
}

export function validateLegalCorpus(
  sources: readonly LegalSource[],
  asOf: Date | string = new Date(),
): LegalCorpusIssue[] {
  const issues: LegalCorpusIssue[] = [];
  const seenIds = new Set<string>();

  const asOfDate =
    normalizeAsOfDate(asOf);

  if (!asOfDate) {
    return [
      {
        severity: "error",
        code: "invalid-as-of-date",
        message:
          "Legal corpus governance received an invalid as-of date.",
      },
    ];
  }

  for (const source of sources) {
    if (seenIds.has(source.id)) {
      issues.push({
        severity: "error",
        code: "duplicate-source-id",
        sourceId: source.id,
        message:
          `Duplicate legal source id: ${source.id}`,
      });
    }

    seenIds.add(source.id);

    if (
      !source.assessmentYears.includes(
        ACTIVE_LEGAL_ASSESSMENT_YEAR,
      ) &&
      !source.assessmentYears.includes(
        "all",
      )
    ) {
      issues.push({
        severity: "error",
        code:
          "assessment-year-mismatch",
        sourceId: source.id,
        message:
          `${source.id} is not tagged for AY ${ACTIVE_LEGAL_ASSESSMENT_YEAR} or all assessment years.`,
      });
    }

    if (source.sections.length === 0) {
      issues.push({
        severity: "error",
        code: "missing-sections",
        sourceId: source.id,
        message:
          `${source.id} has no section or form references.`,
      });
    }

    if (source.tags.length === 0) {
      issues.push({
        severity: "error",
        code: "missing-tags",
        sourceId: source.id,
        message:
          `${source.id} has no retrieval tags.`,
      });
    }

    if (source.text.trim().length < 80) {
      issues.push({
        severity: "error",
        code: "source-text-too-short",
        sourceId: source.id,
        message:
          `${source.id} does not contain a sufficiently descriptive curated extract.`,
      });
    }

    let parsedUrl: URL | null = null;

    try {
      parsedUrl =
        new URL(source.url);
    } catch {
      issues.push({
        severity: "error",
        code: "invalid-source-url",
        sourceId: source.id,
        message:
          `${source.id} has an invalid source URL.`,
      });
    }

    if (parsedUrl) {
      if (
        parsedUrl.protocol !== "https:"
      ) {
        issues.push({
          severity: "error",
          code:
            "insecure-source-url",
          sourceId: source.id,
          message:
            `${source.id} must use an HTTPS official-source URL.`,
        });
      }

      if (
        !OFFICIAL_LEGAL_SOURCE_HOSTS.has(
          parsedUrl.hostname.toLowerCase(),
        )
      ) {
        issues.push({
          severity: "error",
          code:
            "unapproved-source-host",
          sourceId: source.id,
          message:
            `${source.id} uses an unapproved legal-source host: ${parsedUrl.hostname}`,
        });
      }
    }

    const retrievedAt =
      parseIsoDate(
        source.retrievedAt,
      );

    if (!retrievedAt) {
      issues.push({
        severity: "error",
        code:
          "invalid-retrieved-date",
        sourceId: source.id,
        message:
          `${source.id} has an invalid retrievedAt date.`,
      });
    } else if (
      retrievedAt.getTime() >
      asOfDate.getTime()
    ) {
      issues.push({
        severity: "error",
        code:
          "future-retrieved-date",
        sourceId: source.id,
        message:
          `${source.id} has a retrievedAt date in the future.`,
      });
    } else {
      const freshness =
        getLegalSourceFreshness(
          source,
          asOfDate,
        );

      if (freshness.stale) {
        issues.push({
          severity: "error",
          code: "stale-source",
          sourceId: source.id,
          message:
            `${source.id} is ${freshness.ageDays} days old; ${source.sourceStatus} sources must be refreshed within ${freshness.maxAgeDays} days.`,
        });
      } else if (
        freshness.reviewDue
      ) {
        issues.push({
          severity: "warning",
          code: "review-due",
          sourceId: source.id,
          message:
            `${source.id} is ${freshness.ageDays} days old and is approaching its ${freshness.maxAgeDays}-day refresh limit.`,
        });
      }
    }

    if (
      source.effectiveFrom &&
      !parseIsoDate(
        source.effectiveFrom,
      )
    ) {
      issues.push({
        severity: "error",
        code:
          "invalid-effective-date",
        sourceId: source.id,
        message:
          `${source.id} has an invalid effectiveFrom date.`,
      });
    }
  }

  return issues;
}

export function assertLegalCorpusGovernance(
  sources: readonly LegalSource[],
  asOf: Date | string = new Date(),
): void {
  const errors =
    validateLegalCorpus(
      sources,
      asOf,
    ).filter(
      (issue) =>
        issue.severity === "error",
    );

  if (errors.length === 0) {
    return;
  }

  throw new Error(
    [
      "Legal corpus governance failed:",
      ...errors.map(
        (issue) =>
          `- [${issue.code}] ${issue.message}`,
      ),
    ].join("\n"),
  );
}
