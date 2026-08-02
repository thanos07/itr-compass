"use client";

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ExternalLink,
  Files,
  GitCompareArrows,
  Loader2,
  Play,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { AgentWorkspaceSnapshot } from "@/lib/agents/tools";
import { useWorkspace } from "@/lib/workspace-store";
import type {
  AgentKey,
  AgentRun,
  AgentSeverity,
  TaxWorkspace,
} from "@/lib/workspace-types";

const agentConfig: Array<{
  key: AgentKey;
  title: string;
  short: string;
  description: string;
  icon: typeof Files;
}> = [
  {
    key: "intake",
    title: "Document Intake Agent",
    short: "Inventory and evidence coverage",
    description:
      "Checks document types, parser quality, missing source categories and low-confidence extraction candidates.",
    icon: Files,
  },
  {
    key: "reconciliation",
    title: "Reconciliation Agent",
    short: "Cross-source mismatch detection",
    description:
      "Compares candidate values, accepted claims and workpaper fields without choosing an unsupported amount.",
    icon: GitCompareArrows,
  },
  {
    key: "legal",
    title: "Legal Retrieval Agent",
    short: "AY-aware cited RAG",
    description:
      "Retrieves a compact official-source corpus, then uses Groq to explain conditions with source-linked citations.",
    icon: Scale,
  },
  {
    key: "review",
    title: "Final Review Agent",
    short: "Handoff readiness gate",
    description:
      "Combines deterministic tax/form outputs with evidence controls and prior agent summaries to identify blockers.",
    icon: ShieldCheck,
  },
];

function snapshotFromWorkspace(
  workspace: TaxWorkspace,
): AgentWorkspaceSnapshot {
  return {
    assessmentYear: workspace.assessmentYear,

    profile: {
      ageBand: workspace.profile.ageBand,
      residency: workspace.profile.residency,
      employmentNature: workspace.profile.employmentNature,
    },

    eligibility: workspace.eligibility,
    presumptive: workspace.presumptive,
    income: workspace.income,
    deductions: workspace.deductions,
    taxesPaid: workspace.taxesPaid,

    documents: workspace.documents.slice(0, 12).map((document) => ({
      id: document.id,
      name: document.name,
      kind: document.kind,
      parser: document.parser,
      pagesOrRows: document.pagesOrRows,
      warnings: document.warnings.slice(0, 20),
      preview: document.preview.slice(0, 2500),

      claims: document.claims
        .slice(0, 40)
        .map(
          ({
            label,
            field,
            value,
            confidence,
            locator,
            accepted,
          }) => ({
            label,
            field,
            value,
            confidence,
            locator,
            accepted,
          }),
        ),
    })),

    notes: workspace.notes.slice(0, 3000),
  };
}

async function fingerprint(value: unknown) {
  const bytes = new TextEncoder().encode(
    JSON.stringify(value),
  );

  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes,
  );

  return Array.from(
    new Uint8Array(digest),
  )
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

function severityBadge(
  severity: AgentSeverity,
) {
  if (severity === "critical") {
    return "badge-danger";
  }

  if (severity === "warning") {
    return "badge-warning";
  }

  return "badge-blue";
}

export default function AgentWorkspace() {
  const { workspace, update } = useWorkspace();

  const [busyAgent, setBusyAgent] =
    useState<AgentKey | "all" | null>(
      null,
    );

  const [message, setMessage] =
    useState<string | null>(null);

  const [legalQuery, setLegalQuery] =
    useState(
      "Which ITR form and major legal restrictions apply to this workspace, and what must I verify before filing?",
    );

  const [groqConsent, setGroqConsent] =
    useState(false);

  useEffect(() => {
    setGroqConsent(
      sessionStorage.getItem(
        "itr-file-consent-groq-v1",
      ) === "yes",
    );
  }, []);

  const changeGroqConsent = (
    value: boolean,
  ) => {
    sessionStorage.setItem(
      "itr-file-consent-groq-v1",
      value ? "yes" : "no",
    );

    setGroqConsent(value);
  };

  const sourceNames = useMemo(
    () =>
      new Map(
        workspace.documents.map(
          (document) => [
            document.id,
            document.name,
          ],
        ),
      ),
    [workspace.documents],
  );

  const completed = agentConfig.filter(
    (agent) =>
      workspace.agentRuns[agent.key],
  ).length;

  const persist = (run: AgentRun) =>
    update((draft) => {
      draft.agentRuns[run.agent] = run;
      return draft;
    });

  const execute = async (
    agent: AgentKey,
    options?: {
      force?: boolean;
      priorAgentSummaries?: Record<
        string,
        string
      >;
      snapshot?: AgentWorkspaceSnapshot;
    },
  ): Promise<AgentRun> => {
    if (!groqConsent) {
      throw new Error(
        "Consent for the optional Groq transfer is required before running an agent.",
      );
    }

    const snapshot =
      options?.snapshot ||
      snapshotFromWorkspace(workspace);

    const query =
      agent === "legal"
        ? legalQuery.trim()
        : undefined;

    const inputFingerprint =
      await fingerprint({
        agent,
        snapshot,
        query,
      });

    const existing =
      workspace.agentRuns[agent];

    if (
      !options?.force &&
      existing?.inputFingerprint ===
        inputFingerprint
    ) {
      setMessage(
        `${
          agentConfig.find(
            (item) =>
              item.key === agent,
          )?.title
        } is already current. No Groq request was used.`,
      );

      return existing;
    }

    const response = await fetch(
      "/api/agents/run",
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          processingConsent: true,
          agent,
          workspace: snapshot,
          query,

          priorAgentSummaries:
            options?.priorAgentSummaries ||
            {},

          inputFingerprint,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          `${agent} agent failed.`,
      );
    }

    const run = data as AgentRun;

    persist(run);

    return run;
  };

  const runOne = async (
    agent: AgentKey,
    force = false,
  ) => {
    setBusyAgent(agent);
    setMessage(null);

    try {
      await execute(agent, {
        force,
      });

      setMessage(
        `${
          agentConfig.find(
            (item) =>
              item.key === agent,
          )?.title
        } completed with Groq.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Agent run failed.",
      );
    } finally {
      setBusyAgent(null);
    }
  };

  const runAll = async () => {
    setBusyAgent("all");
    setMessage(null);

    const snapshot =
      snapshotFromWorkspace(workspace);

    const prior: Record<
      string,
      string
    > = {};

    try {
      for (const agent of agentConfig.map(
        (item) => item.key,
      )) {
        const result = await execute(
          agent,
          {
            snapshot,
            priorAgentSummaries: prior,
          },
        );

        prior[agent] =
          result.summary;
      }

      setMessage(
        "All four controlled agents completed. Unchanged agents were reused without another Groq call.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The agent workflow stopped before completion.",
      );
    } finally {
      setBusyAgent(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
          <div>
            <p className="eyebrow">
              <span className="trace-tick" />
              CONTROLLED GROQ WORKFLOW
            </p>

            <h3
              className="mt-3 font-display text-3xl font-semibold"
              style={{
                color: "var(--heading)",
              }}
            >
              Four agents, deterministic
              tools, one review trail.
            </h3>

            <p
              className="mt-3 max-w-[72ch] text-[0.86rem] leading-relaxed"
              style={{
                color:
                  "var(--text-soft)",
              }}
            >
              Agents run only when you
              press a button. Economy mode
              limits the request to eight
              document previews, reuses
              unchanged results, and keeps
              tax calculation outside the
              LLM.
            </p>
          </div>

          <aside
            className="self-center rounded-xl border p-5 shadow-sm"
            style={{
              borderColor:
                "var(--line)",
              background:
                "var(--page-alt)",
            }}
          >
            <p className="field-label">
              Workflow status
            </p>

            <p
              className="mt-1 font-display text-3xl font-semibold"
              style={{
                color:
                  "var(--heading)",
              }}
            >
              {completed}/4
            </p>

            <button
              type="button"
              className="btn btn-primary mt-4 w-full"
              disabled={
                busyAgent !== null ||
                !groqConsent
              }
              onClick={() =>
                void runAll()
              }
            >
              {busyAgent === "all" ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Play size={16} />
              )}

              Run all agents
            </button>
          </aside>
        </div>
      </div>

      <div className="callout callout-info">
        <Sparkles
          size={18}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>
            Free-tier design:
          </strong>{" "}
          no LangGraph server, no paid
          vector database and no embedding
          API. Legal RAG uses an
          in-repository official-source
          corpus with local lexical
          retrieval; only the compact
          retrieved context is sent to
          Groq.
        </p>
      </div>

      <label
        className="flex items-start gap-3 rounded-sm border p-4 text-[0.8rem] leading-relaxed"
        style={{
          borderColor: groqConsent
            ? "var(--accent)"
            : "var(--line)",

          background: groqConsent
            ? "var(--accent-soft)"
            : "var(--surface)",

          color: "var(--text-soft)",
        }}
      >
        <input
          type="checkbox"
          className="mt-1 accent-[var(--accent)]"
          checked={groqConsent}
          onChange={(event) =>
            changeGroqConsent(
              event.target.checked,
            )
          }
        />

        <span>
          <strong
            style={{
              color:
                "var(--heading)",
            }}
          >
            Consent for optional Groq
            processing.
          </strong>{" "}
          Running an agent sends
          shortened, pattern-redacted
          previews, entered financial
          values and deterministic
          summaries to Groq. No raw file is
          sent, but pattern redaction
          cannot guarantee removal of every
          identifier. Provider processing
          may occur outside India. Clear
          this box to withdraw consent for
          future requests.
        </span>
      </label>

      <div className="card p-5 sm:p-6">
        <label className="block">
          <span className="field-label">
            Question for the Legal
            Retrieval Agent
          </span>

          <textarea
            className="input min-h-24 resize-y"
            value={legalQuery}
            maxLength={1200}
            onChange={(event) =>
              setLegalQuery(
                event.target.value,
              )
            }
          />
        </label>

        <p
          className="mt-2 text-[0.75rem] leading-relaxed"
          style={{
            color:
              "var(--text-faint)",
          }}
        >
          The legal agent can explain
          retrieved official material; it
          cannot certify facts, replace the
          notified utility or provide a
          professional opinion.
        </p>
      </div>

      {message ? (
        <div className="callout callout-warning">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <p>{message}</p>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        {agentConfig.map((agent) => {
          const Icon = agent.icon;

          const run =
            workspace.agentRuns[
              agent.key
            ];

          const isBusy =
            busyAgent === agent.key ||
            busyAgent === "all";

          return (
            <article
              key={agent.key}
              className="card overflow-hidden"
            >
              <div
                className="flex items-start justify-between gap-4 border-b p-5"
                style={{
                  borderColor:
                    "var(--line)",

                  background:
                    "var(--surface)",
                }}
              >
                <div className="flex min-w-0 gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm"
                    style={{
                      background:
                        "var(--accent-soft)",

                      color:
                        "var(--accent)",
                    }}
                  >
                    <Icon size={19} />
                  </span>

                  <div>
                    <h4
                      className="font-semibold"
                      style={{
                        color:
                          "var(--heading)",
                      }}
                    >
                      {agent.title}
                    </h4>

                    <p
                      className="mt-1 text-[0.74rem]"
                      style={{
                        color:
                          "var(--text-faint)",
                      }}
                    >
                      {agent.short}
                    </p>
                  </div>
                </div>

                {run ? (
                  <span className="badge badge-success">
                    <CheckCircle2
                      size={12}
                    />
                    complete
                  </span>
                ) : (
                  <span className="badge badge-blue">
                    <Bot size={12} />
                    ready
                  </span>
                )}
              </div>

              <div className="p-5">
                <p
                  className="text-[0.82rem] leading-relaxed"
                  style={{
                    color:
                      "var(--text-soft)",
                  }}
                >
                  {agent.description}
                </p>

                <button
                  type="button"
                  className="btn btn-secondary mt-4"
                  disabled={
                    busyAgent !== null ||
                    !groqConsent
                  }
                  onClick={() =>
                    void runOne(
                      agent.key,
                      Boolean(run),
                    )
                  }
                >
                  {isBusy ? (
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                  ) : run ? (
                    <RefreshCw
                      size={15}
                    />
                  ) : (
                    <Play size={15} />
                  )}

                  {run
                    ? "Refresh agent"
                    : "Run agent"}
                </button>

                {run ? (
                  <div
                    className="mt-5 space-y-4 border-t pt-5"
                    style={{
                      borderColor:
                        "var(--line)",
                    }}
                  >
                    <div>
                      <p className="field-label">
                        Summary
                      </p>

                      <p
                        className="text-[0.84rem] leading-relaxed"
                        style={{
                          color:
                            "var(--text-soft)",
                        }}
                      >
                        {run.summary}
                      </p>
                    </div>

                    {run.findings.length ? (
                      <div>
                        <p className="field-label">
                          Findings
                        </p>

                        <div className="space-y-2">
                          {run.findings.map(
                            (finding) => (
                              <div
                                key={
                                  finding.id
                                }
                                className="rounded-sm border p-3"
                                style={{
                                  borderColor:
                                    "var(--line)",

                                  background:
                                    "var(--surface)",
                                }}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`badge ${severityBadge(
                                      finding.severity,
                                    )}`}
                                  >
                                    {
                                      finding.severity
                                    }
                                  </span>

                                  <p
                                    className="text-[0.82rem] font-semibold"
                                    style={{
                                      color:
                                        "var(--heading)",
                                    }}
                                  >
                                    {
                                      finding.title
                                    }
                                  </p>
                                </div>

                                <p
                                  className="mt-2 text-[0.78rem] leading-relaxed"
                                  style={{
                                    color:
                                      "var(--text-soft)",
                                  }}
                                >
                                  {
                                    finding.detail
                                  }
                                </p>

                                {finding
                                  .sourceDocumentIds
                                  .length ? (
                                  <p
                                    className="mt-2 text-[0.7rem]"
                                    style={{
                                      color:
                                        "var(--text-faint)",
                                    }}
                                  >
                                    Sources:{" "}
                                    {finding.sourceDocumentIds
                                      .map(
                                        (
                                          id,
                                        ) =>
                                          sourceNames.get(
                                            id,
                                          ) ||
                                          id,
                                      )
                                      .join(
                                        ", ",
                                      )}
                                  </p>
                                ) : null}

                                {finding.suggestedAction ? (
                                  <p
                                    className="mt-2 text-[0.75rem] font-medium"
                                    style={{
                                      color:
                                        "var(--accent-hover)",
                                    }}
                                  >
                                    Next:{" "}
                                    {
                                      finding.suggestedAction
                                    }
                                  </p>
                                ) : null}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ) : null}

                    {run.unresolved.length ? (
                      <div>
                        <p className="field-label">
                          Unresolved
                        </p>

                        <ul
                          className="space-y-1.5 text-[0.77rem] leading-relaxed"
                          style={{
                            color:
                              "var(--text-soft)",
                          }}
                        >
                          {run.unresolved.map(
                            (item) => (
                              <li key={item}>
                                • {item}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    ) : null}

                    {run.citations.length ? (
                      <div>
                        <p className="field-label">
                          Retrieved official
                          sources
                        </p>

                        <div className="space-y-2">
                          {run.citations.map(
                            (citation) => (
                              <a
                                key={
                                  citation.sourceId
                                }
                                href={
                                  citation.url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-start justify-between gap-3 rounded-sm border p-3 text-[0.76rem] transition-colors hover:bg-[var(--accent-soft)]"
                                style={{
                                  borderColor:
                                    "var(--line)",

                                  color:
                                    "var(--heading)",
                                }}
                              >
                                <span>
                                  <strong>
                                    {
                                      citation.title
                                    }
                                  </strong>

                                  <span
                                    className="mt-1 block"
                                    style={{
                                      color:
                                        "var(--text-faint)",
                                    }}
                                  >
                                    {
                                      citation.section
                                    }{" "}
                                    ·{" "}
                                    {
                                      citation.authority
                                    }
                                    {citation.effectiveFrom
                                      ? ` · effective ${citation.effectiveFrom}`
                                      : ""}
                                    {citation.retrievedAt
                                      ? ` · checked ${citation.retrievedAt}`
                                      : ""}
                                  </span>
                                </span>

                                <ExternalLink
                                  size={14}
                                  className="shrink-0"
                                />
                              </a>
                            ),
                          )}
                        </div>
                      </div>
                    ) : null}

                    <p
                      className="text-[0.68rem]"
                      style={{
                        color:
                          "var(--text-faint)",
                      }}
                    >
                      Model: {run.model} ·{" "}
                      {new Date(
                        run.completedAt,
                      ).toLocaleString()}
                    </p>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}