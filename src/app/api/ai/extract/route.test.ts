import assert from "node:assert/strict";

import { POST } from "./route";
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

async function runRouteSecurityRegression() {
  const originalApiKey =
    process.env.GROQ_API_KEY;

  const originalMaxPayload =
    process.env.MAX_AI_PAYLOAD_BYTES;

  const originalFetch =
    globalThis.fetch;

  const originalConsoleError =
    console.error;

  let outboundFetchAttempted =
    false;

  try {
    process.env.GROQ_API_KEY =
      "test-only-key";

    process.env.MAX_AI_PAYLOAD_BYTES =
      "200000";

    globalThis.fetch =
      (async () => {
        outboundFetchAttempted =
          true;

        throw new Error(
          "Unexpected outbound network request.",
        );
      }) as typeof fetch;

    /*
     * The body is deliberately malformed.
     *
     * Because Content-Length exceeds the configured
     * limit, the route must return 413 before attempting
     * JSON parsing or contacting Groq.
     */
    const request =
      new Request(
        "http://localhost/api/ai/extract",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",

            "content-length":
              "200001",

            /*
             * The left-most generic forwarded value
             * should not be treated as trusted client IP.
             */
            "x-forwarded-for":
              "198.51.100.50, 203.0.113.20",
          },

          body: "{",
        },
      );

    const response =
      await POST(request);

    assert.equal(
      response.status,
      413,
      "Oversized AI extraction requests must be rejected.",
    );

    assert.equal(
      outboundFetchAttempted,
      false,
      "Groq must not be contacted for oversized requests.",
    );

    assert.equal(
      response.headers.get(
        "cache-control",
      ),
      "no-store",
    );

    const body =
      (await response.json()) as {
        error?: unknown;
      };

    assert.equal(
      typeof body.error,
      "string",
    );

    assert.match(
      body.error as string,
      /too large/i,
    );

    console.log(
      "AI extraction route security regression test passed.",
    );

    /*
     * Actual-body-size regression.
     *
     * A request without Content-Length must still receive
     * 413 when the bytes actually read exceed the limit.
     */
    process.env.MAX_AI_PAYLOAD_BYTES =
      "128";

    const undeclaredOversizeRequest =
      new Request(
        "http://localhost/api/ai/extract",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",

            "x-real-ip":
              "203.0.113.88",
          },

          body: JSON.stringify({
            processingConsent: true,

            documentType:
              "generic tax document",

            text:
              "Gross salary " +
              "1".repeat(240),
          }),
        },
      );

    assert.equal(
      undeclaredOversizeRequest.headers.has(
        "content-length",
      ),
      false,
      "Regression request must omit Content-Length.",
    );

    const undeclaredOversizeResponse =
      await POST(
        undeclaredOversizeRequest,
      );

    assert.equal(
      undeclaredOversizeResponse.status,
      413,
      "Actual request bytes must be limited even without Content-Length.",
    );

    assert.equal(
      outboundFetchAttempted,
      false,
      "Groq must not be contacted for an actually oversized request.",
    );

    process.env.MAX_AI_PAYLOAD_BYTES =
      "200000";

    console.log(
      "AI extraction actual-body-size regression test passed.",
    );

    /*
     * Privacy regression:
     *
     * Explicitly labelled account numbers must be removed
     * before document text reaches Groq, while legitimate
     * large tax amounts must remain available for extraction.
     */
    let providerRequestBody = "";

    globalThis.fetch =
      (async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        if (
          typeof init?.body === "string"
        ) {
          providerRequestBody =
            init.body;
        } else if (
          input instanceof Request
        ) {
          providerRequestBody =
            await input.clone().text();
        }

        return new Response(
          JSON.stringify({
            id: "chatcmpl-redaction-test",
            object: "chat.completion",
            created: 0,
            model:
              "openai/gpt-oss-20b",

            choices: [
              {
                index: 0,

                message: {
                  role: "assistant",

                  content:
                    JSON.stringify({
                      summary:
                        "No supported claims returned by the test provider.",
                      claims: [],
                      unresolved: [],
                    }),
                },

                finish_reason: "stop",
              },
            ],
          }),
          {
            status: 200,

            headers: {
              "content-type":
                "application/json",
            },
          },
        );
      }) as typeof fetch;

    const privacyRequest =
      new Request(
        "http://localhost/api/ai/extract",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",

            /*
             * Use a distinct bucket for this request so
             * rate-limit state cannot affect the assertion.
             */
            "x-real-ip":
              "203.0.113.77",
          },

          body: JSON.stringify({
            processingConsent: true,

            documentType:
              "bank statement",

            text:
              "Bank account number 12345678901234. Gross salary 125000000.",
          }),
        },
      );

    const privacyResponse =
      await POST(privacyRequest);

    assert.equal(
      privacyResponse.status,
      200,
      "A valid redacted extraction request should still complete.",
    );

    assert.ok(
      providerRequestBody.includes(
        "[ACCOUNT NUMBER REDACTED]",
      ),
      "The provider payload must contain the account-number redaction marker.",
    );

    assert.equal(
      providerRequestBody.includes(
        "12345678901234",
      ),
      false,
      "The raw account number must not be sent to Groq.",
    );

    assert.ok(
      providerRequestBody.includes(
        "125000000",
      ),
      "A legitimate large rupee amount must not be removed by account-number redaction.",
    );

    console.log(
      "AI extraction account-number redaction regression test passed.",
    );

    /*
     * Provider error matrix.
     *
     * Provider-controlled error bodies must never reach
     * the client or application logs.
     */
    const providerCases = [
      {
        providerStatus: 429,
        expectedStatus: 429,
        expectedMessage:
          /rate limit/i,
      },
      {
        providerStatus: 401,
        expectedStatus: 503,
        expectedMessage:
          /authentication failed/i,
      },
      {
        providerStatus: 403,
        expectedStatus: 503,
        expectedMessage:
          /authentication failed/i,
      },
      {
        providerStatus: 500,
        expectedStatus: 502,
        expectedMessage:
          /temporarily unavailable/i,
      },
    ] as const;

    for (
      const providerCase
      of providerCases
    ) {
      const secret =
        `TEST_EXTRACTION_PROVIDER_SECRET_${providerCase.providerStatus}`;

      const providerLogs: string[] =
        [];

      console.error =
        (...args: unknown[]) => {
          providerLogs.push(
            args
              .map((value) =>
                String(value),
              )
              .join(" "),
          );
        };

      globalThis.fetch =
        (async () =>
          new Response(
            JSON.stringify({
              error: {
                message: secret,
                type:
                  "test_provider_error",
              },
            }),
            {
              status:
                providerCase.providerStatus,

              headers: {
                "content-type":
                  "application/json",
              },
            },
          )) as typeof fetch;

      const providerRequest =
        new Request(
          "http://localhost/api/ai/extract",
          {
            method: "POST",

            headers: {
              "content-type":
                "application/json",

              /*
               * Keep every provider case in its own
               * application rate-limit bucket.
               */
              "x-real-ip":
                `203.0.113.${providerCase.providerStatus === 429
                  ? 130
                  : providerCase.providerStatus === 401
                    ? 131
                    : providerCase.providerStatus === 403
                      ? 132
                      : 133}`,
            },

            body: JSON.stringify({
              processingConsent: true,

              documentType:
                "generic tax document",

              text:
                "Gross salary explicitly reported as 500000 rupees.",
            }),
          },
        );

      const providerResponse =
        await POST(providerRequest);

      assert.equal(
        providerResponse.status,
        providerCase.expectedStatus,
        `Provider ${providerCase.providerStatus} returned an unexpected local status.`,
      );

      assert.equal(
        providerResponse.headers.get(
          "cache-control",
        ),
        "no-store",
      );

      const providerBody =
        (await providerResponse.json()) as {
          error?: unknown;
        };

      assert.equal(
        typeof providerBody.error,
        "string",
      );

      assert.match(
        providerBody.error as string,
        providerCase.expectedMessage,
      );

      assert.equal(
        (
          providerBody.error as string
        ).includes(secret),
        false,
        "Provider-controlled extraction errors must not reach the client.",
      );

      assert.equal(
        providerLogs.some(
          (line) =>
            line.includes(secret),
        ),
        false,
        "Provider-controlled extraction errors must not reach server logs.",
      );

      assert.equal(
        providerLogs.some(
          (line) =>
            line.includes(
              `status=${providerCase.providerStatus}`,
            ),
        ),
        true,
        "The safe provider status should remain observable in server logs.",
      );
    }

    console.error =
      originalConsoleError;

    console.log(
      "AI extraction provider-error regressions passed.",
    );
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY =
        originalApiKey;
    }

    if (
      originalMaxPayload === undefined
    ) {
      delete process.env.MAX_AI_PAYLOAD_BYTES;
    } else {
      process.env.MAX_AI_PAYLOAD_BYTES =
        originalMaxPayload;
    }

    globalThis.fetch =
      originalFetch;

    console.error =
      originalConsoleError;
  }
}

runRouteSecurityRegression().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
