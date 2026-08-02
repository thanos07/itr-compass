# Four-agent architecture

ITR File uses four **controlled**, user-triggered Groq agents. They are not an
open-ended autonomous loop. Each agent receives a compact workspace snapshot,
a deterministic tool result, and a strict JSON output schema.

## Why controlled agents

Tax work is evidence-sensitive and assessment-year-sensitive. The LLM therefore
never owns the calculator, database, or filing decision. The architecture keeps
these responsibilities separate:

```text
redacted source previews
        +
deterministic tools
        +
curated legal retrieval
        ↓
Groq structured response
        ↓
reviewable findings stored in the workspace
```

## 1. Document Intake Agent

Deterministic tools provide:

- document inventory and parser used;
- expected evidence categories based on entered facts;
- parser warnings;
- documents with no extraction candidates;
- low-confidence candidates; and
- accepted-claim counts.

Groq turns those facts into a concise evidence-coverage report. It cannot
calculate tax or establish legal eligibility.

## 2. Reconciliation Agent

Deterministic tools group source claims by workpaper field and compare:

- candidate values across documents;
- accepted values;
- current workpaper values;
- Form 16 / AIS / 26AS / broker coverage; and
- conflicts between accepted claims.

The agent may identify a mismatch, but it may not choose a replacement amount
without source support.

## 3. Legal Retrieval Agent

This is a lightweight RAG pipeline built for free hosting:

```text
user question + AY/workspace facts
        ↓
AY metadata filter
        ↓
BM25-style lexical scoring + section/tag boosts
        ↓
top five official-source extracts and curated summaries
        ↓
Groq cited explanation
```

The corpus is stored in `src/lib/legal/corpus.ts`. It contains compact extracts/summaries, direct official links, assessment-year tags, retrieval dates and effective-date metadata where available rather than a large vector database. The model can
return only source IDs that were actually retrieved; the server maps those IDs
to citations. This prevents invented URLs and removes the cost of an embedding
API or hosted vector database.

This is genuine retrieval-augmented generation, but it is **lexical RAG**, not
dense-vector RAG.

## 4. Final Review Agent

The review agent receives:

- deterministic ITR-form screening;
- deterministic old/new regime results;
- calculator warnings;
- evidence statistics;
- critical readiness controls; and
- summaries from earlier agents when run through `Run all agents`.

It produces handoff blockers and next actions. It cannot certify the return or
submit it.

## Groq model strategy

The default model is `openai/gpt-oss-20b` to conserve free-tier tokens and
reduce latency. Set `GROQ_AGENT_MODEL=openai/gpt-oss-120b` for a stronger
model when quota permits. All calls use temperature zero, JSON mode, a bounded
completion, and a user-triggered workflow.

## Economy controls

- Maximum eight document previews per agent run.
- Maximum 1,800 characters per preview after server-side redaction.
- At most 24 source claims per document in the LLM payload.
- Existing agent results are reused when the input fingerprint is unchanged.
- One LLM request per agent, only on button click.
- The legal corpus and retrieval run locally in the Vercel function.
- No LangGraph service, Redis, embedding API, or paid vector database.

## Prompt-injection boundary

Uploaded text is placed between `UNTRUSTED_DATA_START` and
`UNTRUSTED_DATA_END`. System instructions state that commands inside source
documents are data and must be ignored. Outputs are validated with Zod, source
document IDs are filtered against the supplied inventory, and legal citations
are filtered against retrieved source IDs.

These controls reduce risk but do not make arbitrary-document LLM processing
perfectly safe. Public deployments still need abuse monitoring and independent
security review.
