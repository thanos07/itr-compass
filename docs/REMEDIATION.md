# v0.3 remediation report

This document maps the August 2026 source review to the changes in version 0.3.0.

| Review item | v0.3 treatment |
|---|---|
| Unauthenticated cloud overwrite | Fixed: server-generated IDs and separate hashed update/delete capability tokens. |
| No cloud API throttling | Fixed for portfolio traffic: per-instance request throttling and body-size limits. Distributed throttling remains a public-scale deployment task. |
| No immediate cloud deletion | Fixed: owner-authorised delete action and UI control. |
| Stale SheetJS npm package | Replaced with the official SheetJS 0.20.3 distribution tarball. |
| PyMuPDF dual-licensing concern | Replaced with BSD-3-Clause `pypdf[crypto]`. |
| Unsafe DOCX XML parsing | Replaced with `defusedxml`; entity-expansion rejection is smoke-tested. |
| Generic new-regime deduction | Removed; only explicit supported new-regime fields are computed. |
| Generic old-regime deduction | Retained as a reference field, but any positive amount blocks the old-regime final estimate until section-specific review. |
| Shallow ITR-4 screening | Expanded with receipt/cash thresholds, minimum declared income, section 44AA(1), agency/commission, goods-carriage and Form 10-IEA facts. |
| Missing simplified-form gates | Added agricultural income, section 194N, lottery/racehorse, section 115BBE and tax-audit indicators. |
| Unsupported surcharge / complex special-income cases | Corrected conservatively: the app withholds a final estimate and lists the blocking issue instead of presenting an incomplete number. |
| Missing external-processing consent | Added separate opt-in controls and request-level acknowledgement for Groq, Render and Neon. |
| Missing privacy/grievance, terms and security pages | Added deployment-owner-configurable pages and contacts. |
| Missing CSP/HSTS | Added production CSP/HSTS and related response headers. |
| Legal citation hallucination risk | Preserved source-ID allowlisting and added effective/retrieval/status metadata. |

## Intentionally remaining boundaries

The free student version does not claim full filing-engine coverage. It still escalates rather than automates surcharge marginal relief, all Schedule SI/CG interactions, foreign-tax-credit/treaty analysis, tax audit, every deduction condition, notices and return forms outside ITR-1 to ITR-4.

The included throttles are suitable for a portfolio demonstration, not unrestricted public traffic across many serverless instances. Before processing real taxpayer data at scale, add distributed abuse controls, scheduled retention cleanup, operational monitoring, independent security testing and professional tax/legal review.

## CSP nonce hardening (v0.4.0)

The former static policy allowed `script-src 'unsafe-inline'`. Version 0.4.0 generates a fresh 128-bit nonce in `src/proxy.ts`, copies the policy into the request so Next.js can nonce its framework scripts, and attaches the same nonce to the theme bootstrap script in `src/app/layout.tsx`.

The enforced production directive is equivalent to:

```text
script-src 'self' 'nonce-<per-request-value>' 'wasm-unsafe-eval'; script-src-attr 'none'
```

`unsafe-eval` remains development-only. `unsafe-inline` is absent from `script-src` in every environment. Because nonces must change on every request, the root layout is intentionally dynamically rendered. Use `CSP_REPORT_ONLY=true` only during rollout testing, then remove it or set it to `false` before public use.

## Dependency security status — August 2026

Production dependency security is enforced in CI for both application runtimes.

- Node.js production dependencies are checked with `npm audit --omit=dev --audit-level=high`.
- Python parser production dependencies are checked with `pip-audit -r worker/requirements.txt`.
- Python dependency consistency is additionally checked with `pip check`.
- The current production dependency audits report no known vulnerabilities.

A full development dependency audit currently reports four moderate findings in the
`drizzle-kit -> @esbuild-kit/esm-loader -> @esbuild-kit/core-utils -> esbuild`
tooling chain.

These findings are limited to development tooling and are not part of the deployed
application runtime. The current stable Drizzle Kit release still depends on this
legacy tooling chain. `npm audit fix --force` proposes a breaking downgrade of
Drizzle Kit, so that remediation is intentionally not applied.

This dev-only advisory will be reassessed when Drizzle Kit removes or upgrades the
affected dependency chain. The project should not describe itself as having
"zero vulnerabilities overall"; the accurate statement is that the current
production dependency audits report no known vulnerabilities.

## Request-boundary and provider hardening (v0.4.0)

The public JSON routes now apply bounded request handling and conservative provider-failure behavior.

- AI extraction, agent and encrypted-cloud JSON requests are read through bounded streams. A missing or understated `Content-Length` cannot bypass the configured application-level body limit.
- AI extraction defaults to a 200,000-byte request limit and caps configuration at 1,000,000 bytes.
- Agent requests default to 1,500,000 bytes and cap configuration at 5,000,000 bytes.
- Encrypted cloud requests default to a 1,500,000-byte payload limit and cap configuration at 5,000,000 bytes.
- Public-route throttles use conservative configuration fallbacks and bounded per-process bucket cleanup.
- Platform forwarding headers are preferred when resolving the client bucket key; generic `x-forwarded-for` is not trusted from its left-most entry.
- Sensitive-data redaction is centralized into browser-preview, AI-provider and agent-payload profiles.
- Labelled bank-account numbers are removed before AI extraction while large legitimate rupee amounts remain available to the extractor.
- Groq agent and extraction failures are translated into controlled local HTTP responses. Provider-controlled error bodies are not returned to clients or copied into application error logs; only the provider status is retained for failure observability.
- Legal retrieval fails closed when no assessment-year-matching source satisfies runtime freshness governance. In that case the browser explains that legal guidance is paused and that no Groq request was sent.

These are application-level controls, not complete denial-of-service protection. The current rate limiters remain in-memory and per-instance. A larger public deployment should use a shared distributed limiter and platform-level abuse controls.
