import { z } from "zod";

export const responseSchema = z.object({
  summary: z.string().min(1).max(1_200),

  claims: z
    .array(
      z.object({
        label: z.string().min(1).max(180),

        field: z.enum([
          "income.grossSalary",
          "income.housePropertyIncome",
          "income.businessIncome",
          "income.otherSources",
          "income.stcg111A",
          "income.ltcg112A",
          "income.vdaIncome",
          "deductions.section80C",
          "deductions.section80D",
          "deductions.section80CCD1B",
          "deductions.section80CCD2",
          "taxesPaid.tdsSalary",
          "taxesPaid.tdsOther",
          "taxesPaid.tcs",
          "taxesPaid.advanceTax",
          "taxesPaid.selfAssessmentTax",
        ]),

        value: z
          .number()
          .min(-100_000_000_000)
          .max(100_000_000_000),

        evidence: z.string().min(1).max(180),

        confidence: z.number().min(0).max(1),
      }),
    )
    .max(30),

  unresolved: z
    .array(z.string().min(1).max(400))
    .max(20),
});
