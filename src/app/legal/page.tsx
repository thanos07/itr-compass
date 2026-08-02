import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ExternalLink,
  Scale,
  ShieldAlert,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Legal basis",
  description:
    "Legal methodology, source hierarchy and calculation boundaries for the AY 2026-27 ITR Compass workpaper.",
};

const sourceHierarchy = [
  [
    "1",
    "Income-tax Act, 1961",
    "As amended for FY 2025-26 / AY 2026-27. The Act controls when a rule, form label or portal code appears broader.",
  ],
  [
    "2",
    "Finance Act amendments",
    "The consolidated text must include amendments applicable to the relevant assessment year.",
  ],
  [
    "3",
    "Income-tax Rules, 1962",
    "Including Rule 12, prescribed forms, statements, valuation and procedural requirements.",
  ],
  [
    "4",
    "CBDT notifications and notified ITR forms",
    "Used for the exact AY 2026-27 schedules, eligibility conditions and schema.",
  ],
  [
    "5",
    "Official validation rules and guidance",
    "Useful for filing mechanics, but not a substitute for the statute.",
  ],
  [
    "6",
    "Judicial interpretation and professional opinion",
    "Required where classification, residence, treaty, ownership or eligibility is disputed.",
  ],
];

const implementedSafeguards = [
  "Section 87A eligibility uses total income, while the rebate is not applied against tax on supported special-rate income.",
  "Section 44ADA requires an explicit section 44AA(1) profession confirmation, gross-receipt facts and presumptive-income checks; an occupation code alone is never enough.",
  "AIS/TIS and broker descriptions are reconciliation evidence, not conclusive asset classification.",
  "The product never creates a cash-in-hand figure from presumptive profit.",
  "Extracted document values remain candidates until the user accepts them; generic new-regime deductions are not accepted by the calculator.",
  "The Legal Retrieval Agent uses an AY-filtered set of curated official-source extracts and summaries; returned citation IDs are restricted to sources actually retrieved.",
];

const escalationBoundaries = [
  "Surcharge, surcharge marginal relief and total income above ₹50 lakh. The interface blocks a final estimate rather than silently omitting surcharge.",
  "Complex capital-loss set-off, unused basic-exemption adjustment, special-income marginal relief and transaction-specific grandfathering. The interface blocks affected calculations.",
  "Foreign tax credit, treaty positions, beneficial ownership and disputed residential status.",
  "Audit applicability, books-of-account failures, notices, reassessment or prosecution exposure.",
  "Trusts, firms, companies and return forms outside ITR-1 to ITR-4. Form output is a potential candidate or safer fallback, not a statutory certification.",
];

const calculatorRules = [
  [
    "New regime",
    "₹0–4L nil; 4–8L 5%; 8–12L 10%; 12–16L 15%; 16–20L 20%; 20–24L 25%; above 24L 30%",
    "Individual slab estimate only",
  ],
  [
    "Section 87A",
    "Resident new-regime threshold ₹12L / maximum ₹60,000; old-regime threshold ₹5L / maximum ₹12,500",
    "Special-rate and marginal-relief edge cases may require official utility review",
  ],
  [
    "Standard deduction",
    "₹75,000 new regime; ₹50,000 old regime",
    "Salary or pension input only",
  ],
  [
    "Section 111A",
    "20%",
    "Verify transfer date, security and STT conditions",
  ],
  [
    "Section 112A",
    "12.5% above aggregate ₹1.25L threshold",
    "No grandfathering or unused basic-exemption-limit automation",
  ],
  [
    "VDA",
    "30%",
    "No loss or expense eligibility determination",
  ],
];

export default function LegalPage() {
  return (
    <>
      <section
        className="border-b py-14 sm:py-20"
        style={{
          borderColor: "var(--line)",
          background: "var(--page-alt)",
        }}
      >
        <div className="container-page max-w-[940px]">
          <p className="eyebrow">
            <span className="trace-tick" />
            LEGAL METHODOLOGY
          </p>

          <h1
            className="mt-5 font-display text-[clamp(2.5rem,6vw,4.8rem)] font-semibold leading-[1.02] tracking-[-0.04em]"
            style={{ color: "var(--heading)" }}
          >
            The return follows evidence—not a dropdown label.
          </h1>

          <p
            className="mt-6 max-w-[76ch] text-[1rem] leading-relaxed"
            style={{ color: "var(--text-soft)" }}
          >
            This project is designed for FY 2025–26 / AY 2026–27
            individual workpapers. It separates source extraction, legal
            classification, computation and official filing so that a
            technically valid file is never presented as legal certification.
          </p>
        </div>
      </section>

      <section className="section-py-sm">
        <div className="container-page max-w-[1000px] space-y-8">
          <div className="callout callout-danger">
            <Scale
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Preparation software, not legal or chartered-accountancy advice
              </p>

              <p className="mt-1 text-[0.84rem]">
                ITR Compass and its four Groq agents do not represent you,
                sign a return, certify books, determine disputed facts or
                guarantee acceptance by the Income Tax Department. Complex or
                high-value cases should be reviewed by a practising tax
                professional.
              </p>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <BookOpenCheck
                size={22}
                style={{ color: "var(--accent)" }}
              />

              <h2
                className="font-display text-3xl font-semibold"
                style={{ color: "var(--heading)" }}
              >
                Source hierarchy
              </h2>
            </div>

            <div className="mt-6 space-y-3">
              {sourceHierarchy.map(([number, title, text]) => (
                <div
                  key={number}
                  className="grid gap-3 rounded-sm border p-4 sm:grid-cols-[44px_220px_1fr] sm:items-start"
                  style={{
                    borderColor: "var(--line)",
                    background: "var(--surface)",
                  }}
                >
                  <span className="step-number step-number-active">
                    {number}
                  </span>

                  <p
                    className="font-semibold"
                    style={{ color: "var(--heading)" }}
                  >
                    {title}
                  </p>

                  <p
                    className="text-[0.84rem] leading-relaxed"
                    style={{ color: "var(--text-soft)" }}
                  >
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="card p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2
                  size={20}
                  style={{ color: "var(--success)" }}
                />

                <h2
                  className="font-display text-2xl font-semibold"
                  style={{ color: "var(--heading)" }}
                >
                  Implemented safeguards
                </h2>
              </div>

              <ul
                className="mt-5 space-y-3 text-[0.86rem] leading-relaxed"
                style={{ color: "var(--text-soft)" }}
              >
                {implementedSafeguards.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2"
                  >
                    <span
                      className="mt-[0.15rem]"
                      aria-hidden="true"
                    >
                      •
                    </span>

                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="card p-6">
              <div className="flex items-center gap-3">
                <ShieldAlert
                  size={20}
                  style={{ color: "var(--warning)" }}
                />

                <h2
                  className="font-display text-2xl font-semibold"
                  style={{ color: "var(--heading)" }}
                >
                  Escalation boundaries
                </h2>
              </div>

              <ul
                className="mt-5 space-y-3 text-[0.86rem] leading-relaxed"
                style={{ color: "var(--text-soft)" }}
              >
                {escalationBoundaries.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2"
                  >
                    <span
                      className="mt-[0.15rem]"
                      aria-hidden="true"
                    >
                      •
                    </span>

                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="card p-6 sm:p-8">
            <h2
              className="font-display text-3xl font-semibold"
              style={{ color: "var(--heading)" }}
            >
              AY 2026–27 rules represented in the calculator
            </h2>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-[0.84rem]">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <th className="field-label pb-3 pr-5">
                      Item
                    </th>

                    <th className="field-label pb-3 pr-5">
                      Implemented treatment
                    </th>

                    <th className="field-label pb-3">
                      Boundary
                    </th>
                  </tr>
                </thead>

                <tbody style={{ color: "var(--text-soft)" }}>
                  {calculatorRules.map(([item, treatment, boundary]) => (
                    <tr
                      key={item}
                      style={{
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <td
                        className="py-4 pr-5 font-semibold"
                        style={{ color: "var(--heading)" }}
                      >
                        {item}
                      </td>

                      <td className="py-4 pr-5">
                        {treatment}
                      </td>

                      <td className="py-4">
                        {boundary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <h2
              className="font-display text-3xl font-semibold"
              style={{ color: "var(--heading)" }}
            >
              Official starting points
            </h2>

            <p
              className="mt-3 text-[0.87rem] leading-relaxed"
              style={{ color: "var(--text-soft)" }}
            >
              These links are provided for verification. Always select
              material applicable to the relevant assessment year and check
              amendment dates.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <a
                className="btn btn-secondary justify-between"
                href="https://www.incometaxindia.gov.in/pages/acts/income-tax-act.aspx"
                target="_blank"
                rel="noopener noreferrer"
              >
                Income-tax Act
                <ExternalLink size={15} />
              </a>

              <a
                className="btn btn-secondary justify-between"
                href="https://www.incometaxindia.gov.in/all-rules"
                target="_blank"
                rel="noopener noreferrer"
              >
                Income-tax Rules
                <ExternalLink size={15} />
              </a>

              <a
                className="btn btn-secondary justify-between"
                href="https://www.incometax.gov.in/iec/foportal/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Official e-filing portal
                <ExternalLink size={15} />
              </a>

              <a
                className="btn btn-secondary justify-between"
                href="https://www.incometax.gov.in/iec/foportal/downloads/income-tax-returns"
                target="_blank"
                rel="noopener noreferrer"
              >
                ITR downloads and utilities
                <ExternalLink size={15} />
              </a>
            </div>
          </div>

          <div className="callout callout-warning">
            <AlertTriangle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Source and verification notice
              </p>

              <p className="mt-1 text-[0.84rem] leading-relaxed">
                An archival copy of the Income-tax Act, 1961 was consulted
                during research but is not treated as the sole legal or
                computational source. Before filing, verify the applicable AY
                2026–27 provisions, notified forms, instructions, amendments
                and validation requirements using current official Income Tax
                Department resources.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/prepare"
              className="btn btn-primary"
            >
              Open the workpaper
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}