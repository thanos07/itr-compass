# ITR File

A deploy-ready, privacy-first Indian income-tax workpaper for **FY 2025–26 / AY 2026–27**. It reads tax documents, keeps extracted values reviewable, compares old and new regimes, screens for ITR-1 to ITR-4, runs four controlled Groq agents, and exports a portable structured workspace.

The visual language is based on the user-provided SimpleByNoor and portfolio projects: cream, navy and royal blue; Fraunces display headings; IBM Plex Sans/Mono; trace-line details; restrained cards; and two switchable colour variants.

> **Important:** this is preparation and reconciliation software. It does not submit a return, pay tax, e-verify, determine disputed legal facts or replace a practising tax professional.

## Included

- Cream and blue theme variants
- Seven-step AY 2026–27 return workspace
- ITR-1 / ITR-2 / ITR-3 / ITR-4 screening
- Old-versus-new regime estimate
- Form 16, AIS, TIS, 26AS, prefill/ITR JSON, CSV, XLSX and text parsing in the browser
- Optional stateless Render parser for PDF, password-protected PDF/ZIP, XLSX, DOCX, ZIP, CSV, JSON and text
- Optional constrained Groq extraction fallback
- Four user-triggered Groq agents: document intake, reconciliation, legal retrieval and final review
- Free, local lexical RAG over a curated AY-aware official-source corpus
- Input fingerprints that reuse unchanged agent results to conserve Groq quota
- Local-first browser storage
- Portable `.itrwork.json` backup/import
- Optional client-encrypted Neon sync with separate read, update and delete capabilities, immediate owner deletion and 90-day expiry
- Legal-methodology, privacy-notice, terms and security pages
- Vercel and Render configuration
- Neon SQL migration
- Tax-engine smoke tests

## Legal-design choices

This project deliberately rejects several unsafe assumptions found during the source audit:

- Section 44ADA is not inferred from an influencer/activity code. It is restricted to professions referred to in section 44AA(1).
- Section 87A eligibility uses **total income**, not only slab-rate income.
- Supported special-rate tax is not offset by the rebate.
- Presumptive profit is never converted into invented cash in hand.
- AIS/TIS and broker labels are evidence for reconciliation, not conclusive legal classification.
- Successful JSON/schema validation is not described as legal correctness.

See [`docs/SOURCE_AUDIT.md`](docs/SOURCE_AUDIT.md) and the in-product `/legal` page.

## Stack

- Next.js 16, React 19, TypeScript and Tailwind CSS 4
- Browser PDF/CSV/XLSX parsing
- Neon Postgres + Drizzle for optional encrypted workspace storage
- Groq API for optional constrained extraction and four controlled agents
- Local BM25-style legal retrieval with no embedding API or paid vector store
- FastAPI + permissively licensed pypdf, defusedxml and openpyxl on Render for optional parsing fallback

## Local development

Requires Node.js 20+ and Python 3.11+ for the optional worker.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

Run the optional parser separately:

```bash
cd worker
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Useful checks:

```bash
npm run build
npm run lint
npm run test:tax
npm run test:agents
npm run test:forms
python -m py_compile worker/main.py
(cd worker && python test_smoke.py)
```

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `NEXT_PUBLIC_SITE_URL` | production | Public Vercel URL/custom domain used for metadata |
| `NEXT_PUBLIC_PARSER_URL` | no | Render parser base URL; omit to keep parsing browser-only |
| `DATABASE_URL` | no | Neon pooled Postgres connection string for encrypted sync |
| `GROQ_API_KEY` | no | Enables the AI extraction fallback and all four controlled agents |
| `GROQ_MODEL` | no | Extraction model; defaults to the resource-efficient `openai/gpt-oss-20b` |
| `GROQ_AGENT_MODEL` | no | Model used by all four agents; defaults to `openai/gpt-oss-20b` |
| `AI_REQUESTS_PER_MINUTE` | no | Best-effort per-instance extraction throttle; defaults to 5 |
| `AGENT_REQUESTS_PER_MINUTE` | no | Best-effort per-instance agent throttle; defaults to 6 so one four-agent run fits |
| `CLOUD_REQUESTS_PER_MINUTE` | no | Best-effort cloud API throttle; defaults to 12 |
| `MAX_CLOUD_PAYLOAD_BYTES` | no | Maximum encrypted payload accepted by the cloud API |
| `NEXT_PUBLIC_PRIVACY_CONTACT` | public launch | Monitored privacy/grievance contact shown in the privacy notice |
| `NEXT_PUBLIC_SECURITY_CONTACT` | public launch | Private vulnerability-reporting contact |
| `NEXT_PUBLIC_OPERATOR_NAME` / `NEXT_PUBLIC_LEGAL_CONTACT` / `NEXT_PUBLIC_GOVERNING_STATE` | public launch | Deployment-owner identity and starter terms placeholders |

The Python worker uses:

| Variable | Purpose |
|---|---|
| `ALLOWED_ORIGINS` | Comma-separated exact Vercel/custom-domain origins |
| `MAX_UPLOAD_MB` | Worker upload limit; defaults to 20 MB |
| `MAX_EXPANDED_MB` | ZIP/DOCX expansion safety limit; defaults to 60 MB |

## Free deployment

### 1. Create the Neon database

1. Create a Neon project and copy the **pooled** connection string.
2. For a new database, run [`drizzle/0000_encrypted_workspaces.sql`](drizzle/0000_encrypted_workspaces.sql). For a v0.2 database, back up any needed encrypted data and run [`drizzle/0001_cloud_authorization.sql`](drizzle/0001_cloud_authorization.sql); legacy rows are removed because they lack owner tokens.
3. Keep the connection string for the Vercel environment variable `DATABASE_URL`.

Neon is optional. Without it, local mode, calculation, parsing and backup/import continue to work.

### 2. Deploy the parser to Render

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and select the repository. `render.yaml` creates the free Python web service.
3. Set `ALLOWED_ORIGINS` to the exact Vercel domain, for example `https://your-project.vercel.app`.
4. Copy the resulting parser URL.

The Render free service can sleep after inactivity, so the first fallback parse may take longer. Browser-supported files do not need the worker.

### 3. Create a Groq key

Create a Groq API key and set it only on Vercel as `GROQ_API_KEY`. Extraction and all four agents are user-triggered. The default `openai/gpt-oss-20b` model conserves free-tier tokens; switch `GROQ_AGENT_MODEL` to a larger active Groq model only when your quota permits.

Groq is optional. Deterministic parsing, calculation, form screening, manual entry and export remain available without it; the agent desk will clearly report that Groq is not configured.

### 4. Deploy Next.js to Vercel

1. Import the GitHub repository into Vercel.
2. Add the environment variables:

```text
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
NEXT_PUBLIC_PARSER_URL=https://your-render-service.onrender.com
DATABASE_URL=postgresql://...
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-20b
GROQ_AGENT_MODEL=openai/gpt-oss-20b
```

3. Deploy. Vercel auto-detects Next.js.
4. Update `NEXT_PUBLIC_SITE_URL` after attaching a custom domain.

Every optional integration may be omitted:

- **Vercel only:** local workpaper, calculator, browser parsing and export/import
- **+ Render:** wider file parsing and password-protected file fallback
- **+ Neon:** client-encrypted recovery links
- **+ Groq:** reviewable extraction candidates and the four controlled agents

## Four controlled agents

The Agent desk contains four Groq-backed workflows:

1. **Document Intake Agent** — inventories evidence, parser warnings and missing source categories.
2. **Reconciliation Agent** — compares source candidates, accepted claims and workpaper fields.
3. **Legal Retrieval Agent** — runs assessment-year-filtered lexical RAG over curated official-source extracts and summaries, with effective-date metadata, and returns only retrieved citations.
4. **Final Review Agent** — combines deterministic form/tax results, evidence controls and prior agent summaries into handoff blockers.

Tax calculations remain deterministic TypeScript functions. The agents do not submit returns, choose unsupported amounts, invent legal citations or autonomously loop. See [`docs/AGENTS.md`](docs/AGENTS.md).

### Free-resource design

The default deployment does not require LangGraph hosting, Redis, an embedding API or a paid vector database. Legal retrieval runs inside the Vercel function, Neon stores only optional client-encrypted workspaces, and Render is used only as a parsing fallback. Free plans have usage quotas and Render free web services can cold-start after idle periods, so this architecture is intended for a student portfolio/demo rather than unlimited public traffic.

## Privacy architecture

- Browser parsing is attempted first.
- Raw files are not stored in Neon.
- Stored previews redact common PAN, Aadhaar, IFSC, email and Indian mobile patterns.
- Agent requests re-apply server-side redaction and cap the payload to eight shortened document previews.
- Cloud workspaces are encrypted in the browser using AES-256-GCM and a PBKDF2-derived key.
- The recovery key is placed after `#` in the recovery URL, so normal HTTP navigation does not send it to the server.
- Neon receives ciphertext, IV, salt, schema version, hashed update/delete tokens and expiry. The recovery and owner secrets remain in URL fragments and local UI state.
- The included parser is stateless at application level, uses hardened DOCX XML parsing, avoids the prior AGPL PDF dependency, and reports `retained: false`.

Pattern redaction, client-side encryption and stateless code do not remove the deployment owner's duties. Read [`SECURITY.md`](SECURITY.md) before a public launch.

## Current calculator boundaries

The estimator covers the displayed AY 2026–27 slabs, standard deductions, section 87A threshold/rebate logic, 4% cess, section 111A, section 112A and VDA rates. It does not fully automate:

- surcharge or surcharge marginal relief;
- every unused-basic-exemption interaction;
- all capital-gain grandfathering and transaction-date variations;
- complete loss set-off/carry-forward;
- every deduction condition and proof requirement;
- DTAA, Form 67, Schedule FA and beneficial-ownership analysis;
- tax audit, notices, trusts, firms or companies.

When `supported` is false, the UI withholds the final estimate and lists blocking issues. Always reproduce supported final figures in the notified AY 2026–27 return utility and resolve its validation messages using the Act, Rules, notifications and facts—not invented data.

## v0.3 remediation highlights

- Removed the unrestricted generic new-regime deduction; only explicit supported fields are used.
- Expanded ITR screening for agricultural income, section 194N, lottery/racehorse income, section 115BBE, audit indicators, Form 10-IEA and detailed sections 44AD/44ADA/44AE facts.
- Replaced client-selected cloud IDs with server-generated IDs and separate hashed update/delete tokens.
- Added cloud rate limiting, request-size checks and immediate authorised deletion.
- Replaced the old npm-registry SheetJS package with the current official distribution URL.
- Replaced PyMuPDF with BSD-licensed pypdf and added defusedxml for DOCX parsing.
- Added explicit consent controls for Render, Groq and Neon transfers.
- Added CSP, HSTS, privacy/grievance, terms and security-reporting pages.

## Repository notices

The optional parser adapts ideas and portions from the MIT-licensed `prepare-india-tax-return` project. The upstream notice is preserved in [`worker/THIRD_PARTY_LICENSE.txt`](worker/THIRD_PARTY_LICENSE.txt). See [`NOTICE.md`](NOTICE.md).

## Strict CSP in v0.4

The application uses a per-request, nonce-based Content Security Policy generated by `src/proxy.ts`. Production `script-src` does not contain `'unsafe-inline'` or `'unsafe-eval'`; the theme bootstrap and Next.js framework scripts are authorized with the request nonce. Inline event-handler attributes are blocked with `script-src-attr 'none'`.

Nonce generation requires dynamic rendering of the root layout. This uses more request-time compute than a fully static export, but provides materially stronger XSS protection for a financial-data application. During initial deployment testing only, set `CSP_REPORT_ONLY=true`; enforce the policy afterward by removing that variable or setting it to `false`.

Run the regression check with:

```bash
npm run test:csp
```
