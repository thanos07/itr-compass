import type { SourceClaim } from "@/lib/workspace-types";

function claimSignature(claim: Pick<SourceClaim, "field" | "value">): string {
  return `${claim.field}:${typeof claim.value}:${String(claim.value)}`;
}

export function dedupeCandidateClaims(
  existingClaims: SourceClaim[],
  incomingClaims: SourceClaim[],
): { uniqueClaims: SourceClaim[]; skipped: number } {
  const signatures = new Set(existingClaims.map(claimSignature));
  const uniqueClaims: SourceClaim[] = [];

  for (const candidate of incomingClaims) {
    const signature = claimSignature(candidate);
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    uniqueClaims.push(candidate);
  }

  return {
    uniqueClaims,
    skipped: incomingClaims.length - uniqueClaims.length,
  };
}

export function findAcceptedClaimConflict(
  existingClaims: SourceClaim[],
  candidate: SourceClaim,
): SourceClaim | undefined {
  if (typeof candidate.value !== "number") return undefined;

  return existingClaims.find(
    (item) =>
      item.id !== candidate.id &&
      item.accepted &&
      item.field === candidate.field &&
      typeof item.value === "number" &&
      item.value !== candidate.value,
  );
}
