import assert from "node:assert/strict";

import {
  redactBrowserPreview,
  redactForAgentPayload,
  redactForAiProvider,
} from "./redaction";

{
  const input = [
    "PAN ABCDE1234F",
    "Aadhaar 1234 5678 9012",
    "IFSC HDFC0001234",
    "Email person@example.com",
    "Phone +91 9876543210",
  ].join("\n");

  const redacted =
    redactBrowserPreview(input);

  assert.ok(
    redacted.includes("[PAN REDACTED]"),
  );

  assert.ok(
    redacted.includes("[AADHAAR REDACTED]"),
  );

  assert.ok(
    redacted.includes("[IFSC REDACTED]"),
  );

  assert.ok(
    redacted.includes("[EMAIL REDACTED]"),
  );

  assert.ok(
    redacted.includes("[PHONE REDACTED]"),
  );

  assert.equal(
    redacted.includes("ABCDE1234F"),
    false,
  );

  assert.equal(
    redacted.includes("1234 5678 9012"),
    false,
  );

  assert.equal(
    redacted.includes("9876543210"),
    false,
  );
}

{
  const redacted =
    redactForAiProvider(
      "Bank account number 12345678901234. Gross salary 125000000.",
    );

  assert.ok(
    redacted.includes(
      "[ACCOUNT NUMBER REDACTED]",
    ),
  );

  assert.equal(
    redacted.includes("12345678901234"),
    false,
  );

  assert.ok(
    redacted.includes("125000000"),
    "Large rupee values must remain available to AI extraction.",
  );
}

{
  const redacted =
    redactForAgentPayload(
      "Reference number 1234567890.",
    );

  assert.ok(
    redacted.includes(
      "[LONG NUMBER REDACTED]",
    ),
  );

  assert.equal(
    redacted.includes("1234567890"),
    false,
  );
}

console.log(
  "Shared sensitive-data redaction tests passed.",
);
