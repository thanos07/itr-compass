# Security policy

## Scope

This repository is a deployable starter for sensitive tax workpapers. It is not
an audited or certified tax-filing system. Public deployment owners are
responsible for threat modelling, penetration testing, legal notices, retention,
incident response and operational monitoring.

## Data model

- Local mode stores structured workspace data in browser `localStorage`.
- Browser previews redact common PAN, Aadhaar, IFSC, email and mobile patterns.
- Raw source files are not stored in Neon by the included application.
- Optional cloud workspaces are encrypted in the browser with AES-256-GCM using
  a PBKDF2-derived key. Separate recovery, update and deletion secrets are carried
  in the URL fragment. Neon stores only ciphertext and token hashes.
- The optional Render parser operates in memory and does not intentionally
  persist uploads. Platform logs, crash dumps and infrastructure behaviour must
  still be reviewed by the deployment owner.
- Render, Groq and Neon transfers are optional and require separate user choices.
- Groq extraction and the four agents are optional. Agent economy mode sends shortened, redacted previews plus deterministic tool summaries. Only enable these features after reviewing the provider's terms and data controls.
- Uploaded text is treated as untrusted data and wrapped in prompt-injection delimiters. Zod schemas, document-ID filtering and retrieved-source-ID filtering constrain outputs, but these controls do not eliminate all LLM risk.

## Before public launch

1. Set exact production CORS and verify the generated CSP against the final parser origin.
2. Replace best-effort per-instance throttles with distributed rate limiting for public traffic.
3. Disable request-body logging and ensure hosting logs never capture previews, owner links or recovery fragments.
4. Add a scheduled expiry-cleanup job and database-size monitoring; opportunistic cleanup already runs on cloud requests.
5. Rotate API/database credentials, use least privilege and maintain a documented incident-response process.
6. Configure real privacy, legal and security contacts through the public environment variables.
7. Run dependency advisories, parser fuzzing, end-to-end tests and an independent penetration/tax review.
8. Do not process real taxpayer data at scale until the deployment notice and law-in-force assessment are complete.

## Reporting

The application security page reads `NEXT_PUBLIC_SECURITY_CONTACT`. A public
deployment must set it to a monitored private channel. Do not solicit reports
through a public issue containing taxpayer data or recovery/owner secrets.

## Nonce-based Content Security Policy

Version 0.4.0 generates a cryptographically random CSP nonce per document request through Next.js Proxy. The application and Next.js framework scripts must carry that nonce; `script-src 'unsafe-inline'` is not permitted. Inline event-handler attributes are blocked through `script-src-attr 'none'`.

For a staged deployment, `CSP_REPORT_ONLY=true` can be used temporarily while exercising every workflow. Production should enforce the policy by leaving this variable unset or setting it to `false`.
