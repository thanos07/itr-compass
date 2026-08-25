import assert from "node:assert/strict";

import { LEGAL_CORPUS } from "@/lib/legal/corpus";
import { createEmptyWorkspace } from "@/lib/workspace-types";

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
  const originalApiKey =
    process.env.GROQ_API_KEY;

  const originalAgentModel =
    process.env.GROQ_AGENT_MODEL;

  const originalGroqModel =
    process.env.GROQ_MODEL;

  const originalMaxAgentPayload =
    process.env.MAX_AGENT_PAYLOAD_BYTES;

  const originalRetrievedDates =
    LEGAL_CORPUS.map(
      (source) => source.retrievedAt,
    );

  const originalFetch =
    globalThis.fetch;

  const originalConsoleError =
    console.error;

  let outboundFetchAttempted =
    false;

  const workspace =
    createEmptyWorkspace();

  const request =
    new Request(
      "http://localhost/api/agents/run",
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          processingConsent: true,

          agent: "legal",

          workspace,

          query:
            "What are the section 87A rebate conditions?",

          inputFingerprint:
            "legal-route-fail-closed-test",
        }),
      },
    );

  try {
    /*
     * The route requires Groq configuration before
     * processing an otherwise valid request.
     *
     * A fake key is sufficient because the fail-closed
     * legal-source guard must return before Groq is called.
     */
    process.env.GROQ_API_KEY =
      "test-only-key";

    /*
     * Ensure developer shell configuration cannot
     * change model resolution during this test.
     */
    delete process.env.GROQ_AGENT_MODEL;
    delete process.env.GROQ_MODEL;

    /*
     * Force every legal source beyond its freshness
     * window without permanently modifying the corpus.
     */
    for (
      const source
      of LEGAL_CORPUS
    ) {
      source.retrievedAt =
        "2020-01-01";
    }

    /*
     * Block outbound provider traffic.
     *
     * If this function is invoked, the route failed
     * to stop before reaching Groq.
     */
    globalThis.fetch =
      (async () => {
        outboundFetchAttempted =
          true;

        throw new Error(
          "Unexpected outbound network request.",
        );
      }) as typeof fetch;

    /*
     * Actual-body-size regression.
     *
     * The agent route must enforce the bytes actually
     * received even when Content-Length is absent.
     */
    process.env.MAX_AGENT_PAYLOAD_BYTES =
      "128";

    const oversizedRequest =
      new Request(
        "http://localhost/api/agents/run",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",

            "x-real-ip":
              "203.0.113.99",
          },

          body: JSON.stringify({
            processingConsent: true,
            agent: "review",
            filler: "x".repeat(300),
          }),
        },
      );

    assert.equal(
      oversizedRequest.headers.has(
        "content-length",
      ),
      false,
      "Agent regression request must omit Content-Length.",
    );

    const oversizedResponse =
      await POST(oversizedRequest);

    assert.equal(
      oversizedResponse.status,
      413,
      "Agent request bytes must be limited even without Content-Length.",
    );

    assert.equal(
      outboundFetchAttempted,
      false,
      "Groq must not be contacted for an oversized agent request.",
    );

    restoreEnvironment(
      "MAX_AGENT_PAYLOAD_BYTES",
      originalMaxAgentPayload,
    );

    console.log(
      "Agent actual-body-size regression test passed.",
    );

    const response =
      await POST(request);

    assert.equal(
      response.status,
      503,
      "Legal requests with no fresh sources must fail closed.",
    );

    assert.equal(
      outboundFetchAttempted,
      false,
      "Groq must not be contacted when no fresh legal sources are available.",
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
      /legal sources passed freshness checks/i,
    );

    console.log(
      "Legal-agent fail-closed route test passed.",
    );

    /*
     * Provider-boundary regression.
     *
     * Simulate Groq returning HTTP 429 and verify
     * that the route returns the controlled local
     * message without exposing provider response data.
     */
    outboundFetchAttempted =
      false;

    globalThis.fetch =
      (async () => {
        outboundFetchAttempted =
          true;

        return new Response(
          JSON.stringify({
            error: {
              message:
                "TEST_PROVIDER_SECRET_MESSAGE",
              type:
                "rate_limit_error",
            },
          }),
          {
            status: 429,

            headers: {
              "content-type":
                "application/json",
            },
          },
        );
      }) as typeof fetch;

    const providerErrorLogs: string[] =
      [];

    console.error =
      (...args: unknown[]) => {
        providerErrorLogs.push(
          args
            .map((value) =>
              String(value),
            )
            .join(" "),
        );
      };

    const providerRateLimitRequest =
      new Request(
        "http://localhost/api/agents/run",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",

            "x-real-ip":
              "203.0.113.120",
          },

          body: JSON.stringify({
            processingConsent: true,

            agent: "review",

            workspace:
              createEmptyWorkspace(),

            inputFingerprint:
              "provider-rate-limit-regression",
          }),
        },
      );

    const providerRateLimitResponse =
      await POST(
        providerRateLimitRequest,
      );

    assert.equal(
      outboundFetchAttempted,
      true,
      "Provider regression must reach the mocked Groq transport.",
    );

    assert.equal(
      providerRateLimitResponse.status,
      429,
      "Groq rate limiting must be represented as HTTP 429.",
    );

    assert.equal(
      providerRateLimitResponse.headers.get(
        "cache-control",
      ),
      "no-store",
    );

    const providerRateLimitBody =
      (await providerRateLimitResponse.json()) as {
        error?: unknown;
      };

    assert.equal(
      typeof providerRateLimitBody.error,
      "string",
    );

    assert.match(
      providerRateLimitBody.error as string,
      /rate limit/i,
    );

    assert.equal(
      (
        providerRateLimitBody.error as string
      ).includes(
        "TEST_PROVIDER_SECRET_MESSAGE",
      ),
      false,
      "Provider error details must not be exposed to the client.",
    );

    assert.equal(
      providerErrorLogs.some(
        (line) =>
          line.includes(
            "TEST_PROVIDER_SECRET_MESSAGE",
          ),
      ),
      false,
      "Provider response details must not be written to server logs.",
    );

    assert.equal(
      providerErrorLogs.some(
        (line) =>
          line.includes(
            "status=429",
          ),
      ),
      true,
      "The safe provider status should still be logged.",
    );

    console.error =
      originalConsoleError;

    console.log(
      "Agent provider-rate-limit regression test passed.",
    );
  } finally {
    LEGAL_CORPUS.forEach(
      (source, index) => {
        const original =
          originalRetrievedDates[
            index
          ];

        if (
          original !== undefined
        ) {
          source.retrievedAt =
            original;
        }
      },
    );

    restoreEnvironment(
      "GROQ_API_KEY",
      originalApiKey,
    );

    restoreEnvironment(
      "GROQ_AGENT_MODEL",
      originalAgentModel,
    );

    restoreEnvironment(
      "GROQ_MODEL",
      originalGroqModel,
    );

    restoreEnvironment(
      "MAX_AGENT_PAYLOAD_BYTES",
      originalMaxAgentPayload,
    );

    globalThis.fetch =
      originalFetch;

    console.error =
      originalConsoleError;
  }
}

runTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
