/* PROTOTYPE Variant C home — editorial scroll story: five chapters, each with a sticky illustrative figure. */
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../_components/ui";
import { formatUsd } from "../format-purchase";
import { roleLabel, type HomeData } from "./data";
import { editorialSerif, publicSans } from "./fonts";
import { PersonaButton } from "./lab-switch";

function Figure({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="lg:sticky lg:top-24">
      <div className="border border-(--p-ink) bg-(--p-surface) p-6">{children}</div>
      <figcaption className="mt-2 text-xs text-(--p-ink-3)">{caption} Illustrative, not live data.</figcaption>
    </figure>
  );
}

const Row = ({ label, value, strong = false, tone }: { label: string; value: string; strong?: boolean; tone?: string }) => (
  <div className={cn("p-figures flex justify-between gap-4 border-b border-(--p-line) py-2 text-sm last:border-b-0", strong && "font-semibold")}>
    <span>{label}</span><span className={tone}>{value}</span>
  </div>
);

const chapters: { title: string; body: string; figure: ReactNode; caption: string }[] = [
  {
    title: "A request names its cost",
    body: "A requester in Northstar Industries asks for $7,000.00 of cloud security tooling against Platform Engineering. Nothing is spent yet; the request simply waits, pending.",
    caption: "Fig. 1 — The request as submitted.",
    figure: <><p className="p-serif-c text-2xl">Cloud Security Audit Tooling</p><Row label="Cost center" value="CC-ENG-01" /><Row label="Amount" value={formatUsd(700_000)} strong /><Row label="Status" value="Pending decision" tone="text-(--p-pending)" /></>,
  },
  {
    title: "The approver sees the whole ledger",
    body: "Before deciding, the approver sees what the cost center has left and what this request would leave behind, next to their own approval limit.",
    caption: "Fig. 2 — The context shown before a decision.",
    figure: <><Row label="Available now" value={formatUsd(1_000_000)} /><Row label="This request" value={`−${formatUsd(700_000)}`} /><Row label="If approved" value={formatUsd(300_000)} strong /><Row label="Approver's limit" value={formatUsd(2_500_000)} /></>,
  },
  {
    title: "A decision commits money",
    body: "Approval and commitment are one act. The status, the committed budget and the commitment record change together, or not at all.",
    caption: "Fig. 3 — One transaction, three records.",
    figure: <><Row label="Request" value="Approved" tone="text-(--p-approved)" /><Row label="Committed budget" value={formatUsd(700_000)} strong /><Row label="Financial commitment" value="1 record" /></>,
  },
  {
    title: "The record outlives the moment",
    body: "Each decision writes exactly one durable audit event, with the reason for any rejection. Auditors can trace every committed dollar back to one approval.",
    caption: "Fig. 4 — The audit trail.",
    figure: <><Row label="Created" value="Northstar Requester" /><Row label="Approved" value="Northstar Approver" strong /></>,
  },
  {
    title: "Two approvals, one budget",
    body: "Two $7,000.00 requests are approved at the same instant against $10,000.00. The intended outcome is that only one can commit; the other is refused for insufficient budget. The workshop shows what happens when that guarantee is missing.",
    caption: "Fig. 5 — The outcome the invariants require.",
    figure: <><Row label="First approval" value="Committed" tone="text-(--p-approved)" /><Row label="Second approval" value="Refused · insufficient budget" tone="text-(--p-violation)" /><Row label="Available after both" value={formatUsd(300_000)} strong /></>,
  },
];

export function HomeC({ data }: { data: HomeData }) {
  return (
    <div className={cn("pc min-h-dvh", editorialSerif.variable, publicSans.variable)}>
      <header className="border-b border-(--p-ink)">
        <div className="mx-auto flex max-w-[72rem] items-end justify-between gap-4 px-5 pt-6 pb-3 sm:px-8">
          <Link href="/?variant=C" className="p-serif-c text-[2rem] leading-none">Procurement Hub</Link>
          <a href={data.session ? "/?variant=C" : "#enter"} className="text-sm underline underline-offset-4 hover:text-(--p-accent)">
            {data.session ? "Return to your brief" : "Enter the lab workspace"}
          </a>
        </div>
      </header>

      <main id="main-content">
        <section aria-labelledby="hero-title" className="mx-auto max-w-[72rem] px-5 py-20 sm:px-8 lg:py-28">
          <p className="text-xs font-semibold tracking-[0.14em] text-(--p-gold-ink)">A SYNTHETIC FINANCE LAB</p>
          <h1 id="hero-title" className="p-serif-c p-rise mt-5 max-w-5xl text-[3.25rem] leading-[1.02] sm:text-[5.5rem]">
            Every financial decision, <em>backed by evidence.</em>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-(--p-ink-2)">
            Follow one purchase request from the moment it is raised to the audit record it leaves behind, and see why two approvals at once must never spend the same dollar twice.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#chapter-1" className="inline-flex min-h-12 items-center rounded-sm bg-(--p-accent) px-6 font-semibold tracking-wide text-white hover:bg-(--p-accent-hover)">Read how a decision is made</a>
            <a href="#enter" className="inline-flex min-h-12 items-center rounded-sm border border-(--p-ink) px-6 font-semibold tracking-wide hover:bg-(--p-ink) hover:text-(--p-canvas)">Enter the lab workspace</a>
          </div>
        </section>

        {chapters.map((chapter, index) => (
          <section key={chapter.title} id={`chapter-${index + 1}`} aria-labelledby={`chapter-${index + 1}-title`} className="border-t border-(--p-line)">
            <div className="mx-auto grid max-w-[72rem] gap-10 px-5 py-20 sm:px-8 lg:min-h-[80vh] lg:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="p-reveal">
                <p className="p-serif-c text-[4rem] leading-none text-(--p-gold-ink)">{String(index + 1).padStart(2, "0")}</p>
                <h2 id={`chapter-${index + 1}-title`} className="p-serif-c mt-4 text-[2.5rem] leading-tight">{chapter.title}</h2>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-(--p-ink-2)">{chapter.body}</p>
              </div>
              <Figure caption={chapter.caption}>{chapter.figure}</Figure>
            </div>
          </section>
        ))}

        <section id="enter" aria-labelledby="enter-heading" className="scroll-mt-8 bg-(--p-forest) text-(--p-canvas)">
          <div className="mx-auto max-w-[72rem] px-5 py-20 sm:px-8">
            <h2 id="enter-heading" className="p-serif-c text-[2.75rem] leading-tight">Enter the lab workspace</h2>
            <p className="mt-3 max-w-2xl text-(--p-track)">Choose a synthetic identity. This is a workshop simulation, not a sign-in; roles and limits come from seeded memberships on the server.</p>
            <ul className="mt-10 grid gap-x-10 sm:grid-cols-2">
              {data.identities.filter((i) => i.key).map((identity) => (
                <li key={identity.key} className="border-t border-white/20">
                  <PersonaButton identity={identity.key!} destination="/?variant=C" className="flex w-full items-baseline justify-between gap-3 py-3 text-left hover:text-(--p-gold)">
                    <span>
                      <span className="font-medium">{identity.displayName}</span>
                      <span className="p-figures block text-sm text-white/70">{identity.tenantName} · {roleLabel[identity.role]}{identity.approvalLimitMinor !== null && <> · limit {formatUsd(identity.approvalLimitMinor)}</>}</span>
                    </span>
                    <span aria-hidden="true">→</span>
                  </PersonaButton>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="px-5 py-8 text-center text-xs text-(--p-ink-3)">
        Synthetic lab only. Inspired by Lauren Tan&rsquo;s <em>All Code Is Slop (Except Mine)</em> and cursor/plugins/pstack (MIT).
      </footer>
    </div>
  );
}
