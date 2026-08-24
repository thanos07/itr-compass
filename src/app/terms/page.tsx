import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Scale,
  ShieldCheck,
} from "lucide-react";

import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "Terms governing use of the ITR Compass educational income-tax workpaper application.",
};

const operator =
  process.env.NEXT_PUBLIC_OPERATOR_NAME ||
  siteConfig.creator.name ||
  "Md Noor";

const operatorUrl =
  process.env.NEXT_PUBLIC_OPERATOR_URL ||
  siteConfig.creator.url ||
  "https://portfolio-rosy-psi-74.vercel.app/";

const contact =
  process.env.NEXT_PUBLIC_LEGAL_CONTACT ||
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT ||
  "mdtahammulnoor@gmail.com";

const termCards = [
  {
    icon: ShieldCheck,
    title: "Permitted use",
    text:
      "You may use the application to organise your own evidence, compare supported scenarios and prepare questions for the official utility or a qualified professional. You remain responsible for source completeness, classifications, elections, payment and the final return.",
  },
  {
    icon: Ban,
    title: "Prohibited use",
    text:
      "Do not use the service to access another person’s data without authority, evade tax, fabricate evidence, submit false information, attack the service, bypass limits, upload malware or use owner or recovery links that do not belong to you.",
  },
  {
    icon: Scale,
    title: "Scope and limitations",
    text:
      "The calculator intentionally blocks or warns on unsupported situations. A displayed form is a potential candidate or safer fallback based only on collected facts. The service is not affiliated with the Income Tax Department and cannot file, pay or e-verify a return.",
  },
];

export default function TermsPage() {
  return (
    <>
      <section
        className="border-b py-14 sm:py-20"
        style={{
          borderColor: "var(--line)",
          background: "var(--page-alt)",
        }}
      >
        <div className="container-page max-w-[920px]">
          <p className="eyebrow">
            <span className="trace-tick" />
            TERMS OF USE
          </p>

          <h1
            className="mt-5 font-display text-[clamp(2.5rem,6vw,4.8rem)] font-semibold leading-[1.02] tracking-[-0.04em]"
            style={{ color: "var(--heading)" }}
          >
            A preparation workpaper—not an authorised filing service.
          </h1>

          <p
            className="mt-6 max-w-[76ch] text-[1rem] leading-relaxed"
            style={{ color: "var(--text-soft)" }}
          >
            These terms describe the intended use of ITR Compass, an
            independent educational income-tax preparation workpaper. The
            application helps users organise information, compare supported
            calculations and review potential filing requirements before using
            the official Income Tax Department portal.
          </p>
        </div>
      </section>

      <section className="section-py-sm">
        <div className="container-page max-w-[960px] space-y-7">
          <div className="callout callout-danger">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                No tax, legal or chartered-accountancy engagement
              </p>

              <p className="mt-1 text-[0.84rem]">
                The application, its calculations and its Groq agents provide
                informational structuring and screening only. They do not
                create a professional-client relationship, certify facts, sign
                a return, provide a legal opinion or guarantee acceptance by
                the Income Tax Department.
              </p>
            </div>
          </div>

          {termCards.map((item) => {
            const ItemIcon = item.icon;

            return (
              <article
                key={item.title}
                className="card p-6 sm:p-8"
              >
                <div className="flex items-center gap-3">
                  <ItemIcon
                    size={21}
                    style={{ color: "var(--accent)" }}
                  />

                  <h2
                    className="font-display text-3xl font-semibold"
                    style={{ color: "var(--heading)" }}
                  >
                    {item.title}
                  </h2>
                </div>

                <p
                  className="mt-4 text-[0.88rem] leading-relaxed"
                  style={{ color: "var(--text-soft)" }}
                >
                  {item.text}
                </p>
              </article>
            );
          })}

          <article className="card p-6 sm:p-8">
            <h2
              className="font-display text-3xl font-semibold"
              style={{ color: "var(--heading)" }}
            >
              Availability, warranties and responsibility
            </h2>

            <div
              className="mt-4 space-y-3 text-[0.86rem] leading-relaxed"
              style={{ color: "var(--text-soft)" }}
            >
              <p>
                The application is provided on an “as is” and “as available”
                basis to the extent permitted by applicable law. Free-tier
                infrastructure providers may impose quotas, suspend inactive
                services, change limits or experience outages.
              </p>

              <p>
                No term excludes any responsibility that cannot lawfully be
                excluded, including applicable data-protection, consumer and
                security obligations. Subject to those obligations, {operator}{" "}
                does not promise that every tax rule, parser result, external
                model output, third-party source or infrastructure provider
                will always be complete, current, uninterrupted or error-free.
              </p>

              <p>
                Do not rely on the application as the sole basis for a
                statutory filing. Verify the applicable assessment-year form,
                official instructions, validation rules, tax payments and
                supporting evidence. Obtain professional advice where the
                application identifies an unsupported, complex, disputed or
                high-value situation.
              </p>
            </div>
          </article>

          <article className="card p-6 sm:p-8">
            <h2
              className="font-display text-3xl font-semibold"
              style={{ color: "var(--heading)" }}
            >
              Third-party services
            </h2>

            <div
              className="mt-4 space-y-3 text-[0.86rem] leading-relaxed"
              style={{ color: "var(--text-soft)" }}
            >
              <p>
                ITR Compass may use third-party infrastructure or model
                providers, including hosting, database, document-parsing and AI
                services. Availability, processing and retention by those
                providers are subject to the configuration selected by the
                deployment operator and the provider’s own terms.
              </p>

              <p>
                Optional external processing should only occur after the user
                is informed and gives the required consent. Users should avoid
                submitting information that is unnecessary for the requested
                function.
              </p>
            </div>
          </article>

          <article className="card p-6 sm:p-8">
            <h2
              className="font-display text-3xl font-semibold"
              style={{ color: "var(--heading)" }}
            >
              Intellectual property and open-source use
            </h2>

            <div
              className="mt-4 space-y-3 text-[0.86rem] leading-relaxed"
              style={{ color: "var(--text-soft)" }}
            >
              <p>
                The application’s source code may be made available under its
                stated open-source licence. Open-source availability does not
                grant permission to misuse trademarks, impersonate a government
                authority, remove required notices or represent a modified
                deployment as an official Income Tax Department service.
              </p>

              <p>
                Users retain responsibility for the documents and information
                they enter and must have lawful authority to process them.
              </p>
            </div>
          </article>

          <article className="card p-6 sm:p-8">
            <h2
              className="font-display text-3xl font-semibold"
              style={{ color: "var(--heading)" }}
            >
              Suspension and termination
            </h2>

            <p
              className="mt-4 text-[0.86rem] leading-relaxed"
              style={{ color: "var(--text-soft)" }}
            >
              Access may be limited or suspended where reasonably necessary to
              protect users, investigate abuse, maintain service security,
              comply with applicable law or prevent unauthorised processing.
              Users may stop using the service at any time and may delete local
              or supported encrypted cloud workspaces using the controls
              provided by the application.
            </p>
          </article>

          <article className="card p-6 sm:p-8">
            <h2
              className="font-display text-3xl font-semibold"
              style={{ color: "var(--heading)" }}
            >
              Changes to these terms
            </h2>

            <p
              className="mt-4 text-[0.86rem] leading-relaxed"
              style={{ color: "var(--text-soft)" }}
            >
              These terms may be updated when the application, applicable law,
              supported assessment year or third-party integrations change.
              Material changes should be published on this page with an updated
              effective date. Continued use after publication means the user
              accepts the revised terms to the extent permitted by applicable
              law.
            </p>
          </article>

          <article className="card p-6 sm:p-8">
            <h2
              className="font-display text-3xl font-semibold"
              style={{ color: "var(--heading)" }}
            >
              Governing framework and contact
            </h2>

            <div
              className="mt-4 space-y-3 text-[0.86rem] leading-relaxed"
              style={{ color: "var(--text-soft)" }}
            >
              <p>
                These terms are governed by the laws of India. Subject to any
                mandatory statutory, consumer or data-protection rights, any
                dispute arising from or relating to the service will be handled
                by the courts or authorities having competent jurisdiction
                under applicable Indian law.
              </p>

              <p>
                The service is operated by{" "}
                <a
                  href={operatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline decoration-[var(--accent)]/40 underline-offset-4 transition hover:text-[var(--accent)]"
                  style={{ color: "var(--heading)" }}
                >
                  {operator}
                </a>
                .
              </p>

              <p>
                For legal, privacy, security or support enquiries, contact{" "}
                <a
                  href={`mailto:${contact}`}
                  className="font-semibold underline decoration-[var(--accent)]/40 underline-offset-4 transition hover:text-[var(--accent)]"
                  style={{ color: "var(--heading)" }}
                >
                  {contact}
                </a>
                .
              </p>
            </div>
          </article>

          <div className="flex justify-end">
            <Link
              href="/prepare"
              className="btn btn-primary"
            >
              Open workpaper
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}