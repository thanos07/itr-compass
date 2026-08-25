import type {
  AgentKey,
} from "@/lib/workspace-types";

type AgentErrorPayload = {
  error?: unknown;
};

export function describeAgentApiError({
  agent,
  status,
  payload,
  assessmentYear,
}: {
  agent: AgentKey;
  status: number;
  payload: unknown;
  assessmentYear: string;
}): string {
  const errorValue =
    payload &&
    typeof payload === "object" &&
    "error" in payload
      ? (
          payload as AgentErrorPayload
        ).error
      : undefined;

  const providerMessage =
    typeof errorValue === "string"
      ? errorValue.trim()
      : "";

  /*
   * The legal route deliberately fails closed when its
   * official-source corpus does not satisfy freshness
   * governance. Explain that state separately from a
   * normal provider/service failure.
   */
  if (
    agent === "legal" &&
    status === 503 &&
    /legal sources passed freshness checks/i.test(
      providerMessage,
    )
  ) {
    return [
      "Legal Retrieval Agent is temporarily paused because",
      `no current ${assessmentYear} official sources passed freshness checks.`,
      "No Groq request was sent.",
      "Verify or refresh the official-source corpus before relying on legal guidance.",
    ].join(" ");
  }

  if (providerMessage) {
    return providerMessage;
  }

  return `${agent} agent failed.`;
}
