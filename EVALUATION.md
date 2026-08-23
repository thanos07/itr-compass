# ITR Compass Evaluation

## Benchmark

**Benchmark version:** v1  
**Assessment year:** 2026-27  
**Command:** `npm run eval:v1`

The benchmark is a deterministic, versioned evaluation layer for the ITR Compass decision pipeline. It is intentionally separate from the unit/regression test suite so repository reviewers can see explicit product-quality metrics rather than only test-file counts.

### Coverage

| Category | v1 scenarios | What is measured |
| --- | ---: | --- |
| Tax engine | 8 | Rebate boundaries, marginal relief, special-rate income, deduction caps, tax-payment aggregation |
| ITR form selection | 8 | ITR-1/2/3/4 routing and important simplified-form / presumptive boundaries |
| Legal retrieval | 8 | Top-1 relevance plus expected-source hit within top 3 for the curated AY-aware legal corpus |
| Safety controls | 6 | Unsupported-scope blockers, duplicate suppression, conflicting-claim detection |
| **Total** | **30** | Deterministic decision checks |

A fully green v1 run reports `30/30 (100.0%)`. CI executes this benchmark on every push and pull request.

## Methodology

The benchmark uses synthetic fact patterns only. Expected outcomes are explicit and version-controlled. A scenario failure returns a non-zero exit code so GitHub Actions blocks the change.

The legal retrieval metric evaluates the project's current compact lexical/BM25-style curated corpus. It does **not** claim open-web retrieval quality, vector-search quality, or coverage of every Indian tax authority.

The tax and form scenarios evaluate only the rules and safety boundaries that ITR Compass currently implements for AY 2026-27. Unsupported or fact-sensitive areas are expected to fail closed through blocking issues rather than produce a confident calculation.

## Limitations

This benchmark is an engineering evaluation, not tax/legal certification. It does not establish parity with the Income Tax Department filing utility, validate every notified schema rule, or replace professional review. Live Groq model quality is outside v1 because provider responses are non-deterministic and would make the core CI benchmark unstable.

Future benchmark versions should add:
- larger document-extraction fixtures;
- retrieval precision/recall over a broader authority corpus;
- adversarial prompt-injection and malformed-document cases;
- human-reviewed agent-output rubrics;
- versioned comparisons across assessment years.
