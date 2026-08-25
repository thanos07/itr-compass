import assert from "node:assert/strict";

import { POST } from "./route";

function restoreEnvironment(
  name: string,
  value: string | undefined,
) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

async function runTest() {
  const originalMaxPayload =
    process.env.MAX_CLOUD_PAYLOAD_BYTES;

  const originalRateLimit =
    process.env.CLOUD_REQUESTS_PER_MINUTE;

  try {
    /*
     * The cloud route allows a small JSON-envelope overhead
     * above MAX_CLOUD_PAYLOAD_BYTES. With a 64-byte payload
     * setting, this body still exceeds the resulting request
     * limit by a clear margin.
     */
    process.env.MAX_CLOUD_PAYLOAD_BYTES =
      "64";

    const request =
      new Request(
        "http://localhost/api/cloud",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",

            "x-real-ip":
              "203.0.113.111",
          },

          body: JSON.stringify({
            action: "create",
            filler: "x".repeat(17_000),
          }),
        },
      );

    assert.equal(
      request.headers.has(
        "content-length",
      ),
      false,
      "Cloud regression request must omit Content-Length.",
    );

    const response =
      await POST(request);

    assert.equal(
      response.status,
      413,
      "Cloud requests must be rejected while streaming when actual bytes exceed the limit.",
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
      "Cloud streamed request-body limit regression test passed.",
    );

    /*
     * Client-IP precedence regression.
     *
     * Changing generic X-Forwarded-For values must not
     * create separate buckets when Vercel supplies the
     * same platform-forwarded client address.
     */
    process.env.CLOUD_REQUESTS_PER_MINUTE =
      "2";

    process.env.MAX_CLOUD_PAYLOAD_BYTES =
      "64";

    const precedenceStatuses: number[] =
      [];

    for (
      const spoofedForwarded
      of [
        "198.51.100.1",
        "198.51.100.2",
        "198.51.100.3",
      ]
    ) {
      const rateRequest =
        new Request(
          "http://localhost/api/cloud",
          {
            method: "POST",

            headers: {
              "content-type":
                "application/json",

              "x-vercel-forwarded-for":
                "203.0.113.200",

              "x-forwarded-for":
                spoofedForwarded,
            },

            body: JSON.stringify({
              action: "create",
              filler:
                "x".repeat(17_000),
            }),
          },
        );

      const rateResponse =
        await POST(rateRequest);

      precedenceStatuses.push(
        rateResponse.status,
      );
    }

    assert.deepEqual(
      precedenceStatuses,
      [413, 413, 429],
      "Vercel-forwarded client identity must control the cloud rate-limit bucket.",
    );

    console.log(
      "Cloud client-IP precedence regression test passed.",
    );

    /*
     * Invalid rate-limit configuration must fall
     * back to the normal default instead of silently
     * disabling rate limiting.
     */
    process.env.CLOUD_REQUESTS_PER_MINUTE =
      "not-a-number";

    const fallbackStatuses: number[] =
      [];

    for (
      let index = 0;
      index < 13;
      index += 1
    ) {
      const fallbackRequest =
        new Request(
          "http://localhost/api/cloud",
          {
            method: "POST",

            headers: {
              "content-type":
                "application/json",

              "x-vercel-forwarded-for":
                "203.0.113.210",
            },

            body: JSON.stringify({
              action: "create",
              filler:
                "x".repeat(17_000),
            }),
          },
        );

      const fallbackResponse =
        await POST(
          fallbackRequest,
        );

      fallbackStatuses.push(
        fallbackResponse.status,
      );
    }

    assert.equal(
      fallbackStatuses
        .slice(0, 12)
        .every(
          (status) =>
            status === 413,
        ),
      true,
      "The default cloud rate limit should allow the first twelve requests.",
    );

    assert.equal(
      fallbackStatuses[12],
      429,
      "Invalid cloud rate-limit configuration must fall back to twelve requests per minute.",
    );

    console.log(
      "Cloud rate-limit configuration regression test passed.",
    );

    /*
     * Invalid payload-limit configuration must use
     * the safe default rather than disabling actual
     * streamed-byte enforcement.
     */
    process.env.CLOUD_REQUESTS_PER_MINUTE =
      "60";

    process.env.MAX_CLOUD_PAYLOAD_BYTES =
      "not-a-number";

    const invalidPayloadLimitRequest =
      new Request(
        "http://localhost/api/cloud",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",

            "x-vercel-forwarded-for":
              "203.0.113.220",
          },

          body: JSON.stringify({
            action: "create",
            filler:
              "x".repeat(1_600_000),
          }),
        },
      );

    const invalidPayloadLimitResponse =
      await POST(
        invalidPayloadLimitRequest,
      );

    assert.equal(
      invalidPayloadLimitResponse.status,
      413,
      "Invalid cloud payload configuration must fall back to the safe default limit.",
    );

    console.log(
      "Cloud payload-limit configuration regression test passed.",
    );
  } finally {
    restoreEnvironment(
      "MAX_CLOUD_PAYLOAD_BYTES",
      originalMaxPayload,
    );

    restoreEnvironment(
      "CLOUD_REQUESTS_PER_MINUTE",
      originalRateLimit,
    );
  }
}

runTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
