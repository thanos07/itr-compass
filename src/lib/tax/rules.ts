import type { AgeBand } from "@/lib/workspace-types";

export const TAX_RULES_AY_2026_27 = {
  assessmentYear: "2026-27",
  newRegime: {
    slabs: [
      { upTo: 400000, rate: 0 },
      { upTo: 800000, rate: 0.05 },
      { upTo: 1200000, rate: 0.1 },
      { upTo: 1600000, rate: 0.15 },
      { upTo: 2000000, rate: 0.2 },
      { upTo: 2400000, rate: 0.25 },
      { upTo: Number.POSITIVE_INFINITY, rate: 0.3 },
    ],
    standardDeduction: 75000,
    rebateThreshold: 1200000,
    rebateMaximum: 60000,
  },
  oldRegime: {
    standardDeduction: 50000,
    rebateThreshold: 500000,
    rebateMaximum: 12500,
  },
  cessRate: 0.04,
  stcg111ARate: 0.2,
  ltcg112ARate: 0.125,
  ltcg112AExemption: 125000,
  vdaRate: 0.3,
} as const;

export function oldRegimeSlabs(ageBand: AgeBand) {
  const firstLimit = ageBand === "80plus" ? 500000 : ageBand === "60to79" ? 300000 : 250000;
  return [
    { upTo: firstLimit, rate: 0 },
    { upTo: 500000, rate: ageBand === "80plus" ? 0 : 0.05 },
    { upTo: 1000000, rate: 0.2 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.3 },
  ];
}
