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

// Positive token-boundary regression cases.
assert.equal(
  detectKind(
    "Information category AIS salary information",
    "statement.pdf",
  ),
  "ais",
);

assert.equal(
  detectKind(
    "TIS transaction summary",
    "summary.pdf",
  ),
  "tis",
);

assert.equal(
  detectKind(
    "ISIN INE000000001 quantity 10 purchase value 50000",
    "statement.pdf",
  ),
  "broker",
);

/*
 * Token-collision regression cases.
 *
 * Short tax-document abbreviations must be matched as
 * standalone tokens rather than arbitrary substrings.
 */
assert.equal(
  detectKind(
    "Statistical summary of ordinary salary information",
    "notes.txt",
  ),
  "generic",
);

assert.equal(
  detectKind(
    "Rising interest rates and general finance notes",
    "notes.txt",
  ),
  "generic",
);

assert.equal(
  detectKind(
    "Information category raised by the employer",
    "notes.txt",
  ),
  "generic",
);

assert.equal(
  detectKind(
    '{"description":"citric acid expense"}',
    "notes.json",
  ),
  "generic",
);

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


{
  const text = `
    Capital Gains Summary
    Short Term Capital Gain u/s 111A taxable at 20% ₹45,000
    Long Term Capital Gain u/s 112A taxable at 12.5% ₹1,80,000
    VDA income under section 115BBH taxable at 30% ₹30,000
  `;

  const claims = extractClaims(text, "doc-broker", "broker");

  const stcg = claims.find((item) => item.field === "income.stcg111A");
  assert.equal(stcg?.value, 45_000);
  assert.equal(stcg?.confidence, 0.88);

  const ltcg = claims.find((item) => item.field === "income.ltcg112A");
  assert.equal(ltcg?.value, 180_000);
  assert.equal(ltcg?.confidence, 0.88);

  const vda = claims.find((item) => item.field === "income.vdaIncome");
  assert.equal(vda?.value, 30_000);
}

{
  const claims = extractClaims(
    "Short Term Capital Gain u/s 111A ₹45,000 Long Term Capital Gain u/s 112A ₹1,80,000",
    "doc-generic-capital",
    "generic",
  );

  assert.equal(
    claims.some((item) => item.field === "income.stcg111A"),
    false,
  );
  assert.equal(
    claims.some((item) => item.field === "income.ltcg112A"),
    false,
  );
}

{
  const claims = extractClaims(
    "VDA income under section 115BBH ₹30,000",
    "doc-vda",
    "generic",
  );

  assert.equal(claims.length, 1);
  assert.equal(claims[0]?.field, "income.vdaIncome");
  assert.equal(claims[0]?.value, 30_000);
  assert.equal(claims[0]?.confidence, 0.72);
}

{
  const text = `
    Form 26AS Tax Credit Statement
    Total advance tax paid ₹1,00,000
    Total self-assessment tax paid ₹25,000
    Total amount of tax collected at source ₹15,000
  `;

  const claims = extractClaims(text, "doc-26as-summary", "26as");

  const advance = claims.find((item) => item.field === "taxesPaid.advanceTax");
  assert.equal(advance?.value, 100_000);
  assert.equal(advance?.confidence, 0.88);

  const selfAssessment = claims.find(
    (item) => item.field === "taxesPaid.selfAssessmentTax",
  );
  assert.equal(selfAssessment?.value, 25_000);

  const tcs = claims.find((item) => item.field === "taxesPaid.tcs");
  assert.equal(tcs?.value, 15_000);
}

{
  const text = `
    Advance tax paid ₹5,000
    Self-assessment tax paid ₹3,000
    Tax collected at source ₹1,200
  `;

  const claims = extractClaims(text, "doc-individual-rows", "26as");

  assert.equal(
    claims.some((item) => item.field === "taxesPaid.advanceTax"),
    false,
  );
  assert.equal(
    claims.some((item) => item.field === "taxesPaid.selfAssessmentTax"),
    false,
  );
  assert.equal(
    claims.some((item) => item.field === "taxesPaid.tcs"),
    false,
  );
}

console.log("Document detection, extraction and redaction tests passed.");
