/* PROTOTYPE Variant A home — institutional: editorial serif headline, an illustrative ledger statement as the hero. */
import Link from "next/link";
import { cn } from "../_components/ui";
import { formatUsd } from "../format-purchase";
import { roleLabel, type HomeData } from "./data";
import { sourceSerif } from "./fonts";
import { PersonaButton } from "./lab-switch";

const steps = [
  { title: "A request is submitted", body: "A requester names the need, the amount and the cost center. The request starts pending.", record: "Created event" },
  { title: "An approver reviews the context", body: "Available budget, the amount and the approver's own limit are shown before any decision.", record: "No change yet" },
  { title: "The decision moves money", body: "Approval commits the amount against the cost center in the same transaction as the status change.", record: "Financial commitment" },
  { title: "The outcome is recorded", body: "Every decision writes exactly one durable audit event, with the reason for any rejection.", record: "Approved or rejected event" },
  { title: "Simultaneous approvals stay within budget", body: "When two approvals compete for the last of a budget, only one can commit; the other is refused.", record: "One commitment, one refusal" },
];

const capabilities = [
  ["Budgets that cannot go negative", "Committed spend is checked against the allocation at the moment of approval, not when the page was loaded."],
  ["Authority that follows the person", "Approval limits come from each membership on the server; nobody can raise their own limit from the browser."],
  ["Tenants that never meet", "Each organization sees only its own cost centers, requests and audit trail."],
  ["Retries that never double-charge", "A decision retried after a lost connection resolves to the original outcome instead of a second commitment."],
];

export function HomeA({ data }: { data: HomeData }) {
  const tenants = [...new Set(data.identities.map((i) => i.tenantName))];
  return (
    <div className={cn("pa min-h-dvh", sourceSerif.variable)}>
      <header className="border-b border-(--p-line) bg-(--p-surface)">
        <div className="mx-auto flex max-w-[76rem] items-center gap-6 px-5 py-4 sm:px-8">
          <Link href="/?variant=A" className="p-serif-a text-xl font-semibold">Procurement Hub</Link>
          <nav aria-label="Sections" className="hidden gap-5 text-sm text-(--p-ink-2) md:flex">
            <a href="#how" className="hover:text-(--p-ink)">How it works</a>
            <a href="#protects" className="hover:text-(--p-ink)">What it protects</a>
            <a href="#verified" className="hover:text-(--p-ink)">How it is verified</a>
          </nav>
          <a href={data.session ? "/?variant=A" : "#enter"} className="ml-auto inline-flex min-h-10 items-center rounded-md bg-(--p-accent) px-4 text-sm font-semibold text-white hover:bg-(--p-accent-hover)">
            {data.session ? "Open the workspace" : "Enter the lab workspace"}
          </a>
        </div>
      </header>

      <main id="main-content">
        <section aria-labelledby="hero-title" className="mx-auto grid max-w-[76rem] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-24">
          <div className="p-rise">
            <h1 id="hero-title" className="p-serif-a text-[2.75rem] leading-[1.05] font-semibold tracking-[-0.02em] sm:text-[4rem]">Every financial decision, backed by evidence.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-(--p-ink-2)">
              Purchase requests, approval authority and cost-center budgets in one ledger, with every decision recorded as a durable audit event.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#enter" className="inline-flex min-h-12 items-center rounded-md bg-(--p-accent) px-6 text-[0.9375rem] font-semibold text-white hover:bg-(--p-accent-hover)">Enter the lab workspace</a>
              <a href="#how" className="inline-flex min-h-12 items-center rounded-md border border-(--p-line-strong) px-6 text-[0.9375rem] font-semibold hover:border-(--p-ink-3)">See how a decision is verified</a>
            </div>
          </div>

          <figure className="p-rise">
            <div className="rounded-lg border border-(--p-line) bg-(--p-surface) shadow-[0_24px_48px_-32px_rgb(11_22_40/0.45)]">
              <div className="flex items-baseline justify-between border-b border-(--p-line) px-6 py-4">
                <p className="font-semibold">Platform Engineering Q4</p>
                <p className="text-xs text-(--p-ink-3)">CC-ENG-01 · statement</p>
              </div>
              <dl className="p-figures px-6 py-2 text-sm">
                <div className="flex justify-between border-b border-(--p-line) py-3"><dt>Allocated budget</dt><dd>{formatUsd(1_000_000)}</dd></div>
                <div className="flex justify-between gap-4 border-b border-(--p-line) py-3">
                  <dt><span className="block">Cloud Security Audit Tooling</span><span className="text-xs text-(--p-approved)">Approved · committed</span></dt>
                  <dd>−{formatUsd(700_000)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-(--p-line) py-3">
                  <dt><span className="block">CI Runner Capacity Expansion</span><span className="text-xs text-(--p-violation)">Refused · insufficient budget</span></dt>
                  <dd className="text-(--p-ink-3)">{formatUsd(0)}</dd>
                </div>
                <div className="flex justify-between py-3 text-base font-semibold"><dt>Available</dt><dd>{formatUsd(300_000)}</dd></div>
              </dl>
              <p className="border-t border-(--p-line) px-6 py-3 text-xs text-(--p-evidence)">2 decisions · 3 audit events · 1 financial commitment</p>
            </div>
            <figcaption className="mt-3 text-xs text-(--p-ink-3)">Illustrative scenario, not live data: two $7,000.00 approvals arrive at once against a $10,000.00 budget.</figcaption>
          </figure>
        </section>

        <section id="how" aria-labelledby="how-heading" className="scroll-mt-20 border-t border-(--p-line) bg-(--p-surface)">
          <div className="mx-auto max-w-[76rem] px-5 py-20 sm:px-8">
            <h2 id="how-heading" className="p-serif-a text-[2rem] font-semibold">How a decision moves</h2>
            <ol className="mt-10 border-t-2 border-(--p-ink)">
              {steps.map((step, index) => (
                <li key={step.title} className="p-reveal grid gap-2 border-b border-(--p-line) py-6 md:grid-cols-[5rem_minmax(0,1fr)_14rem] md:gap-8">
                  <span className="p-figures p-serif-a text-2xl text-(--p-ink-3)">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-1 max-w-2xl text-(--p-ink-2)">{step.body}</p>
                  </div>
                  <p className="text-sm text-(--p-evidence) md:text-right">Recorded: {step.record}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="protects" aria-labelledby="protects-heading" className="scroll-mt-20">
          <div className="mx-auto grid max-w-[76rem] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <h2 id="protects-heading" className="p-serif-a text-[2rem] leading-tight font-semibold">What it protects</h2>
            <dl className="grid gap-x-10 sm:grid-cols-2">
              {capabilities.map(([title, body]) => (
                <div key={title} className="p-reveal border-t border-(--p-ink) py-5">
                  <dt className="font-semibold">{title}</dt>
                  <dd className="mt-1.5 text-(--p-ink-2)">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="verified" aria-labelledby="verified-heading" className="scroll-mt-20 bg-(--p-navy) text-(--p-navy-ink)">
          <div className="mx-auto grid max-w-[76rem] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <h2 id="verified-heading" className="p-serif-a text-[2rem] leading-tight font-semibold text-white">How it is verified</h2>
              <p className="mt-4 max-w-md text-(--p-navy-muted)">
                These checks run in the workshop repository. Their results live in revision-bound evidence bundles, not on this page.
              </p>
            </div>
            <ol className="grid gap-px overflow-hidden rounded-lg bg-white/10 text-sm">
              {[
                ["Architecture", "bun run verify:architecture"],
                ["Deterministic tests", "bun run check:static · test:unit · test:security"],
                ["Runtime against PostgreSQL and Chromium", "bun run verify:all --run-id <id>"],
                ["Bounded model of concurrent approvals", "bun run verify:formal"],
              ].map(([name, command]) => (
                <li key={name} className="flex flex-wrap items-center justify-between gap-3 bg-(--p-navy-2) px-5 py-4">
                  <span className="font-medium text-white">{name}</span>
                  <code className="font-mono text-xs text-(--p-navy-ink)">{command}</code>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="enter" aria-labelledby="enter-heading" className="scroll-mt-20">
          <div className="mx-auto max-w-[76rem] px-5 py-20 sm:px-8">
            <h2 id="enter-heading" className="p-serif-a text-[2rem] font-semibold">Enter the lab workspace</h2>
            <p className="mt-2 max-w-2xl text-(--p-ink-2)">Choose a synthetic identity. This is a simulation for the workshop, not a sign-in: roles and limits come from seeded memberships on the server.</p>
            {!data.enabled && <p className="mt-6 text-sm text-(--p-violation)">Lab mode is disabled.</p>}
            <div className="mt-8 grid gap-10 lg:grid-cols-2">
              {tenants.map((tenant) => (
                <div key={tenant}>
                  <h3 className="border-b-2 border-(--p-ink) pb-2 font-semibold" translate="no">{tenant}</h3>
                  <ul>
                    {data.identities.filter((i) => i.tenantName === tenant && i.key).map((identity) => (
                      <li key={identity.key} className="flex items-center justify-between gap-3 border-b border-(--p-line) py-3">
                        <span>
                          <span className="block font-medium">{identity.displayName}</span>
                          <span className="p-figures text-sm text-(--p-ink-3)">
                            {roleLabel[identity.role]}{identity.approvalLimitMinor !== null && <> · limit {formatUsd(identity.approvalLimitMinor)}</>}
                          </span>
                        </span>
                        <PersonaButton identity={identity.key!} destination="/?variant=A" className="min-h-10 rounded-md border border-(--p-line-strong) px-4 text-sm font-semibold hover:border-(--p-accent) hover:text-(--p-accent)">
                          Enter
                        </PersonaButton>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-(--p-line) px-5 py-8 text-center text-xs text-(--p-ink-3)">
        Synthetic lab only. Inspired by Lauren Tan&rsquo;s <em>All Code Is Slop (Except Mine)</em> and cursor/plugins/pstack (MIT).
      </footer>
    </div>
  );
}
