# Source and legal-design audit

This starter was designed after reviewing the uploaded `file-itr-main` and
`prepare-india-tax-return-main` repositories, the user's uploaded Income-tax Act
PDF and the official Income Tax Department web material for AY 2026-27.

## Adopted from the stronger workflow

- Evidence-first document inventory and reconciliation.
- Candidate values remain reviewable before being applied.
- No fabrication when dates, classification, cost, ownership or proof is absent.
- Separation of parsing, tax classification, computation and filing.
- Explicit escalation for foreign income, tax audit and disputed cases.

## Unsafe assumptions deliberately rejected

- A social-media/influencer activity code does not automatically establish
  section 44ADA eligibility. Eligibility requires a profession referred to in
  section 44AA(1).
- Section 87A eligibility is tested against total income, not only slab-rate
  income. Supported special-rate tax is not offset by the rebate.
- Presumptive profit is not treated as actual cash in hand.
- AIS/TIS descriptions are reconciliation sources, not conclusive statutory
  classification.
- Schema or portal validation does not prove that a return is legally correct.

## Calculator boundaries

The included calculator is an estimate for individuals and ITR-1 to ITR-4
screening. It does not automate surcharge, all capital-gain interactions,
complete loss set-off, every deduction condition, DTAA, Form 67, Schedule FA,
audit or notice-response matters.
