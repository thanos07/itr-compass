import assert from "node:assert/strict";

import { responseSchema } from "./schema";

const supportedTaxPaymentFields = [
  "taxesPaid.tdsSalary",
  "taxesPaid.tdsOther",
  "taxesPaid.tcs",
  "taxesPaid.advanceTax",
  "taxesPaid.selfAssessmentTax",
] as const;

function makeResponse(
  field: string,
  value: unknown = 10_000,
  confidence: unknown = 0.9,
) {
  return {
    summary:
      "Explicit amount extracted from the supplied tax document.",

    claims: [
      {
        label: "Tax payment",

        field,

        value,

        evidence:
          "Total tax paid 10000",

        confidence,
      },
    ],

    unresolved: [],
  };
}

// All supported tax-payment fields must remain accepted.
for (
  const field
  of supportedTaxPaymentFields
) {
  const result =
    responseSchema.safeParse(
      makeResponse(field),
    );

  assert.equal(
    result.success,
    true,
    `${field} should be accepted by the AI extraction schema`,
  );
}

// Explicit regression protection for self-assessment tax.
{
  const result =
    responseSchema.safeParse(
      makeResponse(
        "taxesPaid.selfAssessmentTax",
        25_000,
        0.95,
      ),
    );

  assert.equal(
    result.success,
    true,
    "Self-assessment tax should remain a supported AI extraction field",
  );

  if (result.success) {
    assert.equal(
      result.data.claims[0]?.field,
      "taxesPaid.selfAssessmentTax",
    );

    assert.equal(
      result.data.claims[0]?.value,
      25_000,
    );

    assert.equal(
      result.data.claims[0]?.confidence,
      0.95,
    );
  }
}

// Unsupported fields must be rejected.
{
  const result =
    responseSchema.safeParse(
      makeResponse(
        "taxesPaid.refund",
      ),
    );

  assert.equal(
    result.success,
    false,
    "Unsupported tax-payment fields must be rejected",
  );
}

// String values must not be coerced into numbers.
{
  const result =
    responseSchema.safeParse(
      makeResponse(
        "taxesPaid.selfAssessmentTax",
        "25000",
      ),
    );

  assert.equal(
    result.success,
    false,
    "AI extraction values must remain numeric",
  );
}

// Confidence cannot exceed 1.
{
  const result =
    responseSchema.safeParse(
      makeResponse(
        "taxesPaid.selfAssessmentTax",
        25_000,
        1.01,
      ),
    );

  assert.equal(
    result.success,
    false,
    "Confidence values above 1 must be rejected",
  );
}

// Confidence cannot be below 0.
{
  const result =
    responseSchema.safeParse(
      makeResponse(
        "taxesPaid.selfAssessmentTax",
        25_000,
        -0.01,
      ),
    );

  assert.equal(
    result.success,
    false,
    "Negative confidence values must be rejected",
  );
}

// Required top-level fields must remain mandatory.
{
  const result =
    responseSchema.safeParse({
      summary:
        "Malformed response",

      claims: [],
    });

  assert.equal(
    result.success,
    false,
    "Malformed AI responses must not pass the schema",
  );
}

// Claims array must reject unsupported objects.
{
  const result =
    responseSchema.safeParse({
      summary:
        "Malformed claim",

      claims: [
        {
          label:
            "Self-assessment tax",

          field:
            "taxesPaid.selfAssessmentTax",

          value:
            25_000,

          confidence:
            0.9,
        },
      ],

      unresolved: [],
    });

  assert.equal(
    result.success,
    false,
    "Claims without evidence must be rejected",
  );
}

console.log(
  "AI extraction response-schema regression tests passed.",
);
