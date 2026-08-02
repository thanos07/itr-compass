"use client";

import { ArrowLeft, ArrowRight, BadgeIndianRupee, BookOpenCheck, Bot, FileSpreadsheet, Info, Landmark, ReceiptIndianRupee, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";
import AgentWorkspace from "@/components/prepare/AgentWorkspace";
import DocumentManager from "@/components/prepare/DocumentManager";
import { BooleanCard, CurrencyField, NumberField, SelectField, TextField } from "@/components/prepare/Fields";
import ReviewPanel from "@/components/prepare/ReviewPanel";
import StepSidebar, { type Step } from "@/components/prepare/StepSidebar";
import { compareRegimes } from "@/lib/tax/engine";
import { selectItrForm } from "@/lib/tax/form-selector";
import { formatInr } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace-store";
import type { AgeBand, Residency, TaxWorkspace } from "@/lib/workspace-types";

const steps: Step[] = [
  { id: "basics", label: "Taxpayer basics", short: "Status and form gates" },
  { id: "documents", label: "Source documents", short: "Read and reconcile files" },
  { id: "income", label: "Income", short: "Normal and special-rate heads" },
  { id: "deductions", label: "Deductions", short: "Old and new regime inputs" },
  { id: "taxes", label: "Taxes paid", short: "TDS, TCS and challans" },
  { id: "agents", label: "Agent desk", short: "Intake, reconcile, retrieve, review" },
  { id: "review", label: "Review and handoff", short: "Form, regime and export" },
];

const stepIcons = [UserRoundCheck, FileSpreadsheet, BadgeIndianRupee, BookOpenCheck, ReceiptIndianRupee, Bot, Landmark];

type ProfileKey = keyof TaxWorkspace["profile"];
type EligibilityKey = keyof TaxWorkspace["eligibility"];
type PresumptiveKey = keyof TaxWorkspace["presumptive"];
type IncomeKey = keyof TaxWorkspace["income"];
type DeductionKey = keyof TaxWorkspace["deductions"];
type TaxPaidKey = keyof TaxWorkspace["taxesPaid"];

export default function PreparePage() {
  const { workspace, hydrated, update } = useWorkspace();
  const [current, setCurrent] = useState(0);

  const comparison = useMemo(() => compareRegimes(workspace), [workspace]);
  const form = useMemo(() => selectItrForm(workspace), [workspace]);
  const CurrentIcon = stepIcons[current];

  const setProfile = <K extends ProfileKey>(key: K, value: TaxWorkspace["profile"][K]) =>
    update((draft) => { draft.profile[key] = value; return draft; });
  const setEligibility = <K extends EligibilityKey>(key: K, value: TaxWorkspace["eligibility"][K]) =>
    update((draft) => { draft.eligibility[key] = value; return draft; });
  const setPresumptive = <K extends PresumptiveKey>(key: K, value: TaxWorkspace["presumptive"][K]) =>
    update((draft) => { draft.presumptive[key] = value; return draft; });
  const setIncome = <K extends IncomeKey>(key: K, value: TaxWorkspace["income"][K]) =>
    update((draft) => { draft.income[key] = value; return draft; });
  const setDeduction = <K extends DeductionKey>(key: K, value: TaxWorkspace["deductions"][K]) =>
    update((draft) => { draft.deductions[key] = value; return draft; });
  const setTaxesPaid = <K extends TaxPaidKey>(key: K, value: TaxWorkspace["taxesPaid"][K]) =>
    update((draft) => { draft.taxesPaid[key] = value; return draft; });

  const next = () => { setCurrent((value) => Math.min(steps.length - 1, value + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const previous = () => { setCurrent((value) => Math.max(0, value - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (!hydrated) {
    return <div className="container-page section-py"><div className="card p-8 text-center" style={{ color: "var(--text-soft)" }}>Opening your local tax workspace…</div></div>;
  }

  return (
    <>
      <section className="border-b py-9 sm:py-12" style={{ borderColor: "var(--line)", background: "var(--page-alt)" }}>
        <div className="container-page">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow"><span className="trace-tick" />AY 2026–27 WORKPAPER</p>
              <h1 className="mt-4 font-display text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.04] tracking-[-0.035em]" style={{ color: "var(--heading)" }}>Prepare before you file.</h1>
              <p className="mt-4 max-w-[72ch] text-[0.96rem] leading-relaxed" style={{ color: "var(--text-soft)" }}>Build an evidence-backed individual return workpaper, compare regimes, screen a potential ITR form or safer fallback and preserve unresolved items instead of inventing figures.</p>
            </div>
            <div className="grid min-w-[280px] grid-cols-2 overflow-hidden rounded-md border" style={{ borderColor: "var(--line)", background: "var(--surface-solid)" }}>
              <div className="p-4"><p className="field-label !mb-1">Likely form</p><p className="font-display text-2xl font-semibold" style={{ color: "var(--heading)" }}>{form.form}</p></div>
              <div className="border-l p-4" style={{ borderColor: "var(--line)" }}><p className="field-label !mb-1">Lower estimate</p><p className="font-display text-2xl font-semibold" style={{ color: "var(--accent)" }}>{comparison.recommended === "new" ? "New" : comparison.recommended === "old" ? "Old" : "Review"}</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-py-sm">
        <div className="container-page grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <StepSidebar steps={steps} current={current} onSelect={setCurrent} />

          <div className="min-w-0">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><CurrentIcon size={20} /></span>
              <div><p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-faint)" }}>Step {current + 1} of {steps.length}</p><h2 className="mt-1 font-display text-3xl font-semibold" style={{ color: "var(--heading)" }}>{steps[current].label}</h2></div>
            </div>

            {current === 0 ? (
              <div className="space-y-6">
                <div className="card p-5 sm:p-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField label="Full name" value={workspace.profile.fullName} onChange={(value) => setProfile("fullName", value)} placeholder="As per PAN records" />
                    <TextField label="PAN (masked only)" value={workspace.profile.panMasked} onChange={(value) => setProfile("panMasked", value.toUpperCase())} placeholder="ABCDE****F" help="Do not store the complete PAN in this workpaper." />
                    <SelectField label="Residential status" value={workspace.profile.residency} onChange={(value) => setProfile("residency", value as Residency)} help="Residency changes form eligibility, scope of income and foreign-asset reporting.">
                      <option value="resident">Resident and ordinarily resident</option>
                      <option value="rnor">Resident but not ordinarily resident</option>
                      <option value="non-resident">Non-resident</option>
                    </SelectField>
                    <SelectField label="Age category" value={workspace.profile.ageBand} onChange={(value) => setProfile("ageBand", value as AgeBand)}>
                      <option value="under60">Below 60</option>
                      <option value="60to79">60 to 79</option>
                      <option value="80plus">80 or above</option>
                    </SelectField>
                    <SelectField label="Employment nature" value={workspace.profile.employmentNature} onChange={(value) => setProfile("employmentNature", value as TaxWorkspace["profile"]["employmentNature"])}>
                      <option value="private">Private sector</option><option value="central-govt">Central Government</option><option value="state-govt">State Government</option><option value="psu">Public-sector undertaking</option><option value="pensioner">Pensioner</option><option value="not-applicable">Not applicable</option>
                    </SelectField>
                    <SelectField label="Number of house properties" value={String(workspace.eligibility.housePropertyCount)} onChange={(value) => setEligibility("housePropertyCount", Number(value) as 0 | 1 | 2 | 3)}>
                      <option value="0">None</option><option value="1">One</option><option value="2">Two</option><option value="3">Three or more</option>
                    </SelectField>
                  </div>
                </div>

                <div className="card p-5 sm:p-6">
                  <p className="field-label">Form-selection gates</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <BooleanCard label="Business or professional income" description="Includes freelancing, creator, consulting, trade or profession." checked={workspace.eligibility.hasBusinessIncome} onChange={(value) => setEligibility("hasBusinessIncome", value)} />
                    <BooleanCard label="Short-term capital gains" description="Any STCG, including section 111A transactions." checked={workspace.eligibility.hasShortTermCapitalGains} onChange={(value) => setEligibility("hasShortTermCapitalGains", value)} />
                    <BooleanCard label="Foreign asset or foreign income" description="Includes foreign shares, RSUs, accounts or overseas income." checked={workspace.eligibility.hasForeignAssetsOrIncome} onChange={(value) => setEligibility("hasForeignAssetsOrIncome", value)} />
                    <BooleanCard label="Director in a company" checked={workspace.eligibility.isCompanyDirector} onChange={(value) => setEligibility("isCompanyDirector", value)} />
                    <BooleanCard label="Held unlisted equity shares" checked={workspace.eligibility.heldUnlistedShares} onChange={(value) => setEligibility("heldUnlistedShares", value)} />
                    <BooleanCard label="Brought-forward or carry-forward loss" checked={workspace.eligibility.hasBroughtForwardLoss} onChange={(value) => setEligibility("hasBroughtForwardLoss", value)} />
                    <BooleanCard label="Deferred ESOP tax" checked={workspace.eligibility.hasDeferredEsopTax} onChange={(value) => setEligibility("hasDeferredEsopTax", value)} />
                    <BooleanCard label="TDS under section 194N" description="Cash-withdrawal TDS is a simplified-form exclusion." checked={workspace.eligibility.hasTds194N} onChange={(value) => setEligibility("hasTds194N", value)} />
                    <BooleanCard label="Lottery or racehorse income" checked={workspace.eligibility.hasLotteryOrRacehorseIncome} onChange={(value) => setEligibility("hasLotteryOrRacehorseIncome", value)} />
                    <BooleanCard label="Income potentially under section 115BBE" description="Unexplained credits, money, investments or expenditure need specialist treatment." checked={workspace.eligibility.hasSection115BBEIncome} onChange={(value) => setEligibility("hasSection115BBEIncome", value)} />
                    <BooleanCard label="Tax audit may be required" checked={workspace.eligibility.hasTaxAuditRequirement} onChange={(value) => setEligibility("hasTaxAuditRequirement", value)} />
                    <BooleanCard label="Eligible Agniveer contribution" description="Enables explicit section 80CCH input; do not select merely to obtain a deduction." checked={workspace.eligibility.isAgniveer} onChange={(value) => setEligibility("isAgniveer", value)} />
                  </div>
                </div>

                {workspace.eligibility.hasBusinessIncome ? (
                  <div className="card p-5 sm:p-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <BooleanCard label="Use presumptive taxation" description="Select only after checking statutory eligibility and turnover/receipt conditions." checked={workspace.eligibility.usesPresumptiveTaxation} onChange={(value) => setEligibility("usesPresumptiveTaxation", value)} />
                      <SelectField label="Presumptive section" value={workspace.eligibility.presumptiveSection} onChange={(value) => setEligibility("presumptiveSection", value as TaxWorkspace["eligibility"]["presumptiveSection"])}>
                        <option value="none">Not selected</option><option value="44AD">44AD — eligible business</option><option value="44ADA">44ADA — specified profession</option><option value="44AE">44AE — goods carriages</option>
                      </SelectField>
                      <SelectField label="Form 10-IEA status" value={workspace.eligibility.form10IEAStatus} onChange={(value) => setEligibility("form10IEAStatus", value as TaxWorkspace["eligibility"]["form10IEAStatus"])} help="Relevant when a taxpayer with business/professional income wants the old regime.">
                        <option value="not-applicable">Not applicable / new regime</option><option value="filed">Filed on time</option><option value="not-filed">Not filed</option><option value="unsure">Unsure</option>
                      </SelectField>
                    </div>
                    {workspace.eligibility.usesPresumptiveTaxation && workspace.eligibility.presumptiveSection !== "none" ? (
                      <div className="mt-6 space-y-4 border-t pt-5" style={{ borderColor: "var(--line)" }}>
                        <p className="field-label">Presumptive eligibility facts</p>
                        <div className="grid gap-5 sm:grid-cols-3">
                          <CurrencyField label="Gross turnover / receipts" value={workspace.presumptive.grossReceipts} onChange={(value) => setPresumptive("grossReceipts", value)} />
                          <CurrencyField label="Cash receipts" value={workspace.presumptive.cashReceipts} onChange={(value) => setPresumptive("cashReceipts", value)} help="Cash percentage affects the 44AD/44ADA threshold." />
                          <CurrencyField label="Declared presumptive income" value={workspace.presumptive.declaredIncome} onChange={(value) => setPresumptive("declaredIncome", value)} help="Keep this aligned with business/professional income used by the calculator." />
                        </div>
                        {workspace.eligibility.presumptiveSection === "44AD" ? <div className="grid gap-3 sm:grid-cols-2"><BooleanCard label="Agency business" checked={workspace.presumptive.hasAgencyBusiness} onChange={(value) => setPresumptive("hasAgencyBusiness", value)} /><BooleanCard label="Commission or brokerage income" checked={workspace.presumptive.hasCommissionOrBrokerageIncome} onChange={(value) => setPresumptive("hasCommissionOrBrokerageIncome", value)} /></div> : null}
                        {workspace.eligibility.presumptiveSection === "44ADA" ? <><BooleanCard label="Profession is covered by section 44AA(1)" description="Select only after verifying the actual profession, not merely a portal occupation code." checked={workspace.presumptive.isSpecifiedProfession44AA} onChange={(value) => setPresumptive("isSpecifiedProfession44AA", value)} /><div className="callout callout-warning"><Info size={18} className="mt-0.5 shrink-0" /><p><strong>Eligibility is fact-specific.</strong> A creator or influencer is not automatically eligible for section 44ADA.</p></div></> : null}
                        {workspace.eligibility.presumptiveSection === "44AE" ? <div className="grid gap-4 sm:grid-cols-2"><NumberField label="Maximum goods carriages owned during the year" value={workspace.presumptive.goodsCarriageCount} min={0} max={1000} onChange={(value) => setPresumptive("goodsCarriageCount", value)} /><BooleanCard label="Vehicle-wise 44AE minimum income has been computed and met" checked={workspace.presumptive.meetsSection44AEMinimumIncome} onChange={(value) => setPresumptive("meetsSection44AEMinimumIncome", value)} /></div> : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {current === 1 ? <DocumentManager /> : null}

            {current === 2 ? (
              <div className="space-y-6">
                <div className="card p-5 sm:p-6">
                  <p className="field-label">Normal-rate income</p>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <CurrencyField label="Gross salary / pension" value={workspace.income.grossSalary} onChange={(value) => setIncome("grossSalary", value)} help="Before standard deduction and old-regime exemptions." />
                    <CurrencyField label="Old-regime exempt allowances" value={workspace.income.exemptAllowancesOld} onChange={(value) => setIncome("exemptAllowancesOld", value)} help="Only supported exemption amounts; HRA has a separate field." />
                    <CurrencyField label="Professional tax paid" value={workspace.income.professionalTaxOld} onChange={(value) => setIncome("professionalTaxOld", value)} help="Used only in the old-regime estimate." />
                    <CurrencyField label="House-property income / loss" value={workspace.income.housePropertyIncome} min={-100000000} onChange={(value) => setIncome("housePropertyIncome", value)} help="Use a negative number for a supported loss. Set-off rules are simplified." />
                    <CurrencyField label="Business / professional income" value={workspace.income.businessIncome} onChange={(value) => setIncome("businessIncome", value)} help="Enter computed taxable profit, not gross receipts." />
                    <CurrencyField label="Other-source income" value={workspace.income.otherSources} onChange={(value) => setIncome("otherSources", value)} help="Interest, dividend and other normal-rate income after applicable deductions." />
                    <CurrencyField label="Agricultural income (exempt)" value={workspace.income.agriculturalIncome} onChange={(value) => setIncome("agriculturalIncome", value)} help="Not added to this simplified tax total; more than ₹5,000 blocks ITR-1/ITR-4 screening." />
                  </div>
                </div>

                <div className="card p-5 sm:p-6">
                  <p className="field-label">Special-rate income</p>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <CurrencyField label="STCG under section 111A" value={workspace.income.stcg111A} onChange={(value) => setIncome("stcg111A", value)} help="Estimated at 20%; verify transaction dates and STT conditions." />
                    <CurrencyField label="LTCG under section 112A" value={workspace.income.ltcg112A} onChange={(value) => setIncome("ltcg112A", value)} help="12.5% estimate above the ₹1.25 lakh aggregate threshold." />
                    <CurrencyField label="VDA / crypto income" value={workspace.income.vdaIncome} onChange={(value) => setIncome("vdaIncome", value)} help="Estimated at 30%; loss and expense rules are not automated." />
                    <CurrencyField label="Other special-rate income" value={workspace.income.otherSpecialIncome} onChange={(value) => setIncome("otherSpecialIncome", value)} help="Used in total-income and form checks." />
                    <CurrencyField label="Tax on other special-rate income" value={workspace.income.otherSpecialTax} onChange={(value) => setIncome("otherSpecialTax", value)} help="Enter separately from the underlying income after verifying the applicable section." />
                  </div>
                </div>
                <div className="callout callout-info"><Info size={18} className="mt-0.5 shrink-0" /><p>AIS and broker labels are reconciliation evidence, not conclusive legal classification. Verify the instrument, acquisition date, STT and statutory conditions.</p></div>
              </div>
            ) : null}

            {current === 3 ? (
              <div className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="card p-5 sm:p-6">
                    <div className="flex items-center justify-between"><p className="field-label !mb-0">Old regime</p><span className="badge badge-warning">proof required</span></div>
                    <div className="mt-5 grid gap-5">
                      <CurrencyField label="Section 80C" value={workspace.deductions.section80C} onChange={(value) => setDeduction("section80C", value)} help="Calculator caps this input at ₹1.5 lakh." />
                      <CurrencyField label="Section 80D" value={workspace.deductions.section80D} onChange={(value) => setDeduction("section80D", value)} help="Enter only the admissible amount after age and payment-mode limits." />
                      <CurrencyField label="Section 80CCD(1B)" value={workspace.deductions.section80CCD1B} onChange={(value) => setDeduction("section80CCD1B", value)} help="Calculator caps this input at ₹50,000." />
                      <CurrencyField label="HRA exemption" value={workspace.deductions.hraOld} onChange={(value) => setDeduction("hraOld", value)} help="Enter the computed exemption, not total rent paid." />
                      <CurrencyField label="Section 80G" value={workspace.deductions.section80G} onChange={(value) => setDeduction("section80G", value)} help="Enter the admissible deduction after qualifying-limit calculations." />
                      <CurrencyField label="Other old-regime deductions (reference only)" value={workspace.deductions.otherOld} onChange={(value) => setDeduction("otherOld", value)} help="A positive amount blocks the old-regime final estimate until the specific statutory section and conditions are implemented or reviewed." />
                    </div>
                  </div>

                  <div className="card p-5 sm:p-6">
                    <div className="flex items-center justify-between"><p className="field-label !mb-0">Available in selected cases</p><span className="badge badge-blue">both / new</span></div>
                    <div className="mt-5 grid gap-5">
                      <CurrencyField label="Employer NPS — section 80CCD(2)" value={workspace.deductions.section80CCD2} onChange={(value) => setDeduction("section80CCD2", value)} help="Eligibility and percentage limits depend on regime and employer category." />
                      <CurrencyField label="Agniveer Corpus Fund — section 80CCH" value={workspace.deductions.section80CCH} onChange={(value) => setDeduction("section80CCH", value)} help="Applied only when the eligible Agniveer gate is selected." />
                    </div>
                    <div className="callout callout-warning mt-6"><Info size={18} className="mt-0.5 shrink-0" /><p>The calculator does not independently test every deduction condition, payment mode, relationship, approval number or proof. Keep source documents and verify the notified return schedule.</p></div>
                  </div>
                </div>
              </div>
            ) : null}

            {current === 4 ? (
              <div className="space-y-6">
                <div className="card p-5 sm:p-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <CurrencyField label="TDS from salary" value={workspace.taxesPaid.tdsSalary} onChange={(value) => setTaxesPaid("tdsSalary", value)} help="Reconcile Form 16, AIS/TIS and 26AS." />
                    <CurrencyField label="Other TDS" value={workspace.taxesPaid.tdsOther} onChange={(value) => setTaxesPaid("tdsOther", value)} help="Reconcile payer-wise credit and ownership." />
                    <CurrencyField label="TCS" value={workspace.taxesPaid.tcs} onChange={(value) => setTaxesPaid("tcs", value)} />
                    <CurrencyField label="Advance tax" value={workspace.taxesPaid.advanceTax} onChange={(value) => setTaxesPaid("advanceTax", value)} help="Use challan-confirmed amounts only." />
                    <CurrencyField label="Self-assessment tax" value={workspace.taxesPaid.selfAssessmentTax} onChange={(value) => setTaxesPaid("selfAssessmentTax", value)} help="Use challan-confirmed amounts; interest timing is not automated." />
                  </div>
                </div>
                <div className="card p-5 sm:p-6">
                  <label className="block"><span className="field-label">Reconciliation notes</span><textarea className="input min-h-36 resize-y" value={workspace.notes} onChange={(event) => update((draft) => { draft.notes = event.target.value; return draft; })} placeholder="Missing statements, mismatched TDS, unresolved classification, tax-payment references…" /></label>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="card p-5"><p className="field-label">New-regime tax</p><p className="font-display text-2xl font-semibold" style={{ color: "var(--heading)" }}>{comparison.newRegime.supported ? formatInr(comparison.newRegime.totalTax) : "Unsupported"}</p></div>
                  <div className="card p-5"><p className="field-label">Old-regime tax</p><p className="font-display text-2xl font-semibold" style={{ color: "var(--heading)" }}>{comparison.oldRegime.supported ? formatInr(comparison.oldRegime.totalTax) : "Unsupported"}</p></div>
                  <div className="card p-5"><p className="field-label">Taxes recorded</p><p className="font-display text-2xl font-semibold" style={{ color: "var(--accent)" }}>{formatInr(comparison.newRegime.taxesPaid)}</p></div>
                </div>
              </div>
            ) : null}

            {current === 5 ? <AgentWorkspace /> : null}

            {current === 6 ? <ReviewPanel /> : null}

            <div className="mt-8 flex items-center justify-between border-t pt-5" style={{ borderColor: "var(--line)" }}>
              <button type="button" className="btn btn-secondary" onClick={previous} disabled={current === 0}><ArrowLeft size={16} /> Previous</button>
              {current < steps.length - 1 ? <button type="button" className="btn btn-primary" onClick={next}>Continue <ArrowRight size={16} /></button> : <button type="button" className="btn btn-secondary" onClick={() => setCurrent(0)}>Review inputs again</button>}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
