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
  } finally {
    restoreEnvironment(
      "MAX_CLOUD_PAYLOAD_BYTES",
      originalMaxPayload,
    );
  }
}

runTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
