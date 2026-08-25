/**
 * Pattern-based privacy reduction for tax-workspace text.
 *
 * These helpers reduce accidental identifier disclosure but cannot
 * guarantee removal of every possible personal or financial identifier.
 */

function redactCommonIdentifiers(text: string): string {
  return text
    // PAN
    .replace(
      /\b[A-Z]{5}[0-9]{4}[A-Z]\b/gi,
      "[PAN REDACTED]",
    )

    /*
     * Redact Indian mobile numbers before Aadhaar-like
     * twelve-digit sequences so "+91 9876543210" is not
     * misclassified as another identifier.
     */
    .replace(
      /(?<!\d)(?:\+91[- ]?)?[6-9]\d{9}(?!\d)/g,
      "[PHONE REDACTED]",
    )

    // Aadhaar with optional spaces or dashes
    .replace(
      /\b(?:\d[ -]?){11}\d\b/g,
      "[AADHAAR REDACTED]",
    )

    // IFSC
    .replace(
      /\b[A-Z]{4}0[A-Z0-9]{6}\b/gi,
      "[IFSC REDACTED]",
    )

    // Email
    .replace(
      /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,
      "[EMAIL REDACTED]",
    );
}

/*
 * Browser previews stay local to the workspace and should not
 * indiscriminately remove long numeric values that may be useful
 * evidence for the user.
 */
export function redactBrowserPreview(
  text: string,
): string {
  return redactCommonIdentifiers(text);
}

/*
 * AI extraction must preserve legitimate large rupee values.
 * Therefore account numbers are removed only when accompanied
 * by an explicit account label.
 */
export function redactForAiProvider(
  text: string,
): string {
  const accountRedacted = text.replace(
    /\b((?:bank\s+)?(?:a\/c|account)\s*(?:no\.?|number)?\s*[:#-]?\s*)\d{9,18}\b/gi,
    "$1[ACCOUNT NUMBER REDACTED]",
  );

  return redactCommonIdentifiers(
    accountRedacted,
  );
}

/*
 * Agent snapshots already carry important tax amounts as
 * structured numeric fields. Free-form strings can therefore
 * retain the existing stronger long-number protection.
 */
export function redactForAgentPayload(
  text: string,
): string {
  return redactCommonIdentifiers(text)
    .replace(
      /\b\d{9,18}\b/g,
      "[LONG NUMBER REDACTED]",
    );
}
