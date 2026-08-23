import assert from "node:assert/strict";
import {
  detectKind,
  extractClaims,
  parseIndianNumber,
  redactSensitive,
} from "./document-parser";

assert.equal(detectKind("Form No. 16 Certificate under section 203", "salary.pdf"), "form16");
assert.equal(detectKind("Annual Information Statement AIS information category", "ais.pdf"), "ais");
assert.equal(detectKind("Taxpayer Information Summary TIS", "tis.pdf"), "tis");
assert.equal(detectKind("Form 26AS Tax Credit Statement", "26as.pdf"), "26as");
assert.equal(detectKind('{"salary":1200000}', "my-prefill.json"), "prefill-json");
assert.equal(detectKind('{"itr":"ITR1","partagen1":{}}', "return.json"), "itr-json");
assert.equal(detectKind("Bank statement opening balance closing balance", "bank.pdf"), "bank");
assert.equal(detectKind("Capital gains report ISIN INE000000001", "broker.pdf"), "broker");
assert.equal(detectKind("ordinary notes with no tax document markers", "notes.txt"), "generic");

assert.equal(parseIndianNumber("₹12,50,000"), 1_250_000);
assert.equal(parseIndianNumber(" 70,000.50 "), 70_000.5);
assert.equal(parseIndianNumber("(1,234)"), -1_234);
assert.equal(parseIndianNumber("not-a-number"), null);

{
  const input = [
    "PAN ABCDE1234F",
    "Aadhaar 1234 5678 9012",
    "IFSC HDFC0001234",
    "Email person@example.com",
    "Phone +91 9876543210",
  ].join("\n");

  const redacted = redactSensitive(input);
  assert.ok(redacted.includes("[PAN REDACTED]"));
  assert.ok(redacted.includes("[AADHAAR REDACTED]"));
  assert.ok(redacted.includes("[IFSC REDACTED]"));
  assert.ok(redacted.includes("[EMAIL REDACTED]"));
  assert.ok(redacted.includes("[PHONE REDACTED]"));
  assert.ok(!redacted.includes("ABCDE1234F"));
  assert.ok(!redacted.includes("person@example.com"));
  assert.ok(!redacted.includes("9876543210"));
}

{
  const text = `
    Form No. 16
    Certificate under section 203
    Gross salary ₹12,50,000
    Income chargeable under the head "Salaries" ₹12,00,000
    Total amount of tax deducted ₹70,000
    Income from other sources ₹20,000
  `;

  const claims = extractClaims(text, "doc-form16", "form16");
  assert.equal(claims.length, 4);

  const gross = claims.find((item) => item.label === "Gross salary");
  assert.equal(gross?.field, "income.grossSalary");
  assert.equal(gross?.value, 1_250_000);
  assert.equal(gross?.confidence, 0.9);

  const chargeable = claims.find((item) => item.label === "Income chargeable under Salaries");
  assert.equal(chargeable?.field, "income.grossSalary");
  assert.equal(chargeable?.value, 1_200_000);

  const tds = claims.find((item) => item.label === "TDS on salary");
  assert.equal(tds?.field, "taxesPaid.tdsSalary");
  assert.equal(tds?.value, 70_000);

  const other = claims.find((item) => item.label === "Other-source income");
  assert.equal(other?.field, "income.otherSources");
  assert.equal(other?.value, 20_000);
}

{
  const claims = extractClaims("Gross salary 900000", "doc-generic", "generic");
  assert.equal(claims.length, 1);
  assert.equal(claims[0]?.value, 900_000);
  assert.equal(claims[0]?.confidence, 0.7);
}

{
  const claims = extractClaims(
    "This document mentions salary and tax but contains no supported labelled amount.",
    "doc-empty",
    "generic",
  );
  assert.equal(claims.length, 0);
}

console.log("Document detection, extraction and redaction tests passed.");
