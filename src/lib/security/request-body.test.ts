import assert from "node:assert/strict";

import {
  readJsonBodyWithLimit,
} from "./request-body";

async function runTests() {
  {
    const request =
      new Request(
        "http://localhost/test",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            value: "allowed",
          }),
        },
      );

    const result =
      await readJsonBodyWithLimit(
        request,
        1_024,
      );

    assert.equal(result.ok, true);

    if (result.ok) {
      assert.deepEqual(
        result.value,
        {
          value: "allowed",
        },
      );
    }
  }

  /*
   * No Content-Length header is supplied here.
   * The actual body size must still be enforced.
   */
  {
    const request =
      new Request(
        "http://localhost/test",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            value: "x".repeat(300),
          }),
        },
      );

    assert.equal(
      request.headers.has(
        "content-length",
      ),
      false,
      "Regression request must not carry Content-Length.",
    );

    const result =
      await readJsonBodyWithLimit(
        request,
        128,
      );

    assert.deepEqual(
      result,
      {
        ok: false,
        reason: "too-large",
      },
    );
  }

  {
    const request =
      new Request(
        "http://localhost/test",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: "{",
        },
      );

    const result =
      await readJsonBodyWithLimit(
        request,
        1_024,
      );

    assert.deepEqual(
      result,
      {
        ok: false,
        reason: "invalid-json",
      },
    );
  }

  console.log(
    "Bounded JSON request-body tests passed.",
  );
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
