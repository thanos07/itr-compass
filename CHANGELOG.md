# Changelog

## Unreleased — Quality gates, evaluation and parser hardening

### CI and regression safety

- Added GitHub Actions quality gates for linting, the full deterministic test suite, the versioned evaluation benchmark and the production build.
- Added Playwright Chromium end-to-end smoke coverage for public navigation, local workspace persistence, form-screening UI integration and review/reset access.
- Configured Playwright browser smoke tests to run against the production Next.js build, matching deployed hydration behavior and avoiding dev-HMR-specific instability.
- Added a parser-worker CI job with dependency installation, compilation, smoke tests and FastAPI route verification.
- Updated GitHub Actions to the current Node 24-based action runtime.
- Added accepted-claim conflict protection so a different value cannot silently overwrite an already accepted field.
- Added AI candidate deduplication for identical field/value claims.

### Tax, form and evaluation coverage

- Expanded AY 2026-27 tax-engine regression coverage across slab boundaries, rebates, marginal relief, deductions, special-rate income, unsupported-scope blockers and tax-payment aggregation.
- Expanded ITR-1/2/3/4 form-selection regression coverage, including sections 44AD, 44ADA and 44AE boundary cases.
- Added the versioned `v1` product evaluation benchmark with 30 deterministic scenarios across tax calculation, form selection, legal retrieval and safety controls.
- Added `EVALUATION.md` to document benchmark scope, methodology and limitations.

### Document parsing and privacy

- Added browser document tests for document-kind detection, supported claim extraction, Indian-number parsing and sensitive-pattern redaction.
- Added document-kind-scoped deterministic extraction for broker summary STCG under section 111A, LTCG under section 112A and explicit VDA income.
- Added conservative total-only extraction for advance tax, self-assessment tax and TCS so individual payment or statement rows are not treated as aggregates.
- Added the existing Python parser smoke and XML-hardening suite to CI.
- Fixed redaction precedence so Indian phone numbers with a `+91` prefix are classified and redacted as phone numbers before the generic 12-digit Aadhaar pattern.
- Updated README testing instructions to match the enforced quality gates.

### Repository and product consistency

- Removed internal repository-development wording from the public homepage workflow copy.
- Aligned `.env.example` with the documented public operator URL and removed placeholder parser/security values.

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
