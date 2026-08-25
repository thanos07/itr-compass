import { LEGAL_CORPUS, type LegalSource } from "@/lib/legal/corpus";
import { getLegalSourceFreshness } from "@/lib/legal/governance";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "for", "from", "has", "have", "how", "i", "in", "is", "it", "my", "of", "on", "or", "the", "this", "to", "under", "what", "when", "which", "with",
]);

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function sourceText(source: LegalSource) {
  return [source.title, source.authority, source.sections.join(" "), source.tags.join(" "), source.text].join(" ").toLowerCase();
}

/** Lightweight BM25-style retrieval with section/tag boosts and AY filtering. */
export function retrieveLegalSources(
  query: string,
  assessmentYear = "2026-27",
  limit = 5,
  asOf: Date | string = new Date(),
) {
  const eligibleSources = LEGAL_CORPUS
    .filter((source) => source.assessmentYears.includes(assessmentYear) || source.assessmentYears.includes("all"))
    .filter((source) => !getLegalSourceFreshness(source, asOf).stale);

  if (eligibleSources.length === 0 || limit <= 0) {
    return [];
  }

  const queryTokens = tokens(query);
  const corpusSize = eligibleSources.length;
  const documentFrequency = new Map<string, number>();

  for (const token of new Set(queryTokens)) {
    documentFrequency.set(
      token,
      eligibleSources.filter((source) => sourceText(source).includes(token)).length,
    );
  }

  return eligibleSources
    .map((source) => {
      const haystack = sourceText(source);
      const hayTokens = tokens(haystack);
      const lengthNorm = Math.max(0.72, Math.min(1.35, hayTokens.length / 120));
      let score = 0;
      for (const token of queryTokens) {
        const occurrences = hayTokens.filter((item) => item === token).length;
        if (!occurrences) continue;
        const df = documentFrequency.get(token) || 1;
        const idf = Math.log(1 + (corpusSize - df + 0.5) / (df + 0.5));
        score += (occurrences * idf) / lengthNorm;
        if (source.sections.some((section) => section.toLowerCase().includes(token))) score += 2.4;
        if (source.tags.some((tag) => tag.toLowerCase().includes(token))) score += 1.5;
      }
      if (haystack.includes(query.toLowerCase())) score += 4;
      return { source, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, Math.floor(limit)))
    .map(({ source, score }) => ({ ...source, retrievalScore: Number(score.toFixed(3)) }));
}
