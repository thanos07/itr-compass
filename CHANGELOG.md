# Changelog

## 0.4.0 — Nonce-based Content Security Policy

- Replaced `script-src 'unsafe-inline'` with a fresh per-request 128-bit nonce.
- Added Next.js 16 `src/proxy.ts` so framework and application scripts receive the nonce.
- Added `script-src-attr 'none'` to block inline event-handler execution.
- Kept `unsafe-eval` development-only; production no longer permits it.
- Added optional `CSP_REPORT_ONLY=true` rollout mode.
- Added CSP regression tests and documented the dynamic-rendering trade-off.

## 0.3.0 — Security and compliance remediation

This release applies the actionable findings from the August 2026 legal, tax-compliance and security review.

### Tax and form screening

- Removed the unrestricted generic new-regime deduction field.
- Added explicit Section 80CCH handling gated by Agniveer status.
- Added conservative blocking for unsupported surcharge, foreign-income, Section 115BBE, agricultural partial-integration, lottery/racehorse and special-income edge cases.
- Expanded ITR screening for Section 194N, audit indicators, Form 10-IEA and Sections 44AD, 44ADA and 44AE.
- Changed form output to a potential candidate or safer fallback rather than statutory certification.
- Withholds a final tax recommendation when either regime is outside the supported calculation boundary.

### Cloud workspace security

- Replaced client-selected save IDs with server-generated workspace IDs.
- Added separate update and deletion capability tokens; only SHA-256 token hashes are stored.
- Added authorised immediate deletion and 90-day expiry.
- Added request-size checks, application-level throttling and opportunistic expired-row cleanup.
- Added a migration that removes legacy cloud rows without owner capability tokens.

### File parsing and dependencies

- Updated SheetJS to the current official distribution tarball instead of the stale npm-registry package.
- Replaced PyMuPDF with permissively licensed `pypdf[crypto]`.
- Replaced standard-library DOCX XML parsing with `defusedxml`.
- Added parser smoke tests for PDF, XLSX, DOCX and entity-expansion rejection.

### Privacy and deployment controls

- Added separate opt-in controls before transfers to Render, Groq and Neon.
- Added privacy/grievance, terms-of-use and security-reporting pages with deployment-owner placeholders.
- Added CSP, HSTS and related response headers.
- Documented localStorage residual risk, cross-provider processing, retention and deletion controls.

### Agents and legal retrieval

- Kept all four agents user-triggered and Groq-backed with no autonomous loops.
- Added effective-date, retrieval-date and source-status metadata to legal citations.
- Preserved source-ID allowlisting so Groq can cite only material actually retrieved by the server.
- Updated the final-review agent to surface tax-engine blockers and conservative form-screening results.
