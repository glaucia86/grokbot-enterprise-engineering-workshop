/* PROTOTYPE Variant B home — product tour: an illustrative inbox where a request settles from pending to approved. */
import Link from "next/link";
import { formatUsd } from "../format-purchase";
import { roleLabel, type HomeData } from "./data";
import { PersonaButton } from "./lab-switch";

const rows = [
  { title: "Cloud Security Audit Tooling", center: "Platform Engineering Q4", amount: 700_000, animate: true },
  { title: "Dock door seal replacement", center: "Warehouse Operations Q4", amount: 1_800_000, animate: false },
  { title: "Packing station anti-fatigue mats", center: "Warehouse Operations Q4", amount: 95_000, animate: false },
];

export function HomeB({ data }: { data: HomeData }) {
  const roles = ["APPROVER", "REQUESTER", "AUDITOR"] as const;
  return (
    <div className="pb min-h-dvh">
      <header className="mx-auto flex max-w-[72rem] items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/?variant=B" className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-md bg-(--p-navy) text-xs font-bold text-white" aria-hidden="true">PH</span>
          Procurement Hub
        </Link>
        <a href={data.session ? "/?variant=B" : "#enter"} className="inline-flex min-h-10 items-center rounded-md bg-(--p-accent) px-4 text-sm font-semibold text-white hover:bg-(--p-accent-hover)">
          {data.session ? "Open your inbox" : "Enter the lab workspace"}
        </a>
      </header>

      <main id="main-content">
        <section aria-labelledby="hero-title" className="mx-auto max-w-[72rem] px-5 pt-12 pb-16 text-center sm:px-8 lg:pt-20">
          <h1 id="hero-title" className="mx-auto max-w-3xl text-[2.5rem] leading-[1.08] font-semibold tracking-[-0.03em] sm:text-[3.5rem]">
            Approve spend with the budget in view.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-(--p-ink-2)">
            One inbox for every purchase request: the amount, the cost center&rsquo;s available budget and your own authority, before you decide.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#enter" className="inline-flex min-h-12 items-center rounded-md bg-(--p-accent) px-6 font-semibold text-white hover:bg-(--p-accent-hover)">Enter the lab workspace</a>
            <a href="#checks" className="inline-flex min-h-12 items-center rounded-md border border-(--p-line-strong) bg-(--p-surface) px-6 font-semibold hover:border-(--p-ink-3)">See the three checks</a>
          </div>

          <figure className="mx-auto mt-14 max-w-4xl text-left">
            <div className="overflow-hidden rounded-lg border border-(--p-line) bg-(--p-surface) shadow-[0_30px_60px_-40px_rgb(11_22_40/0.5)]">
              <div className="flex items-center justify-between border-b border-(--p-line) px-5 py-3 text-sm">
                <span className="font-semibold">Inbox</span>
                <span className="p-figures relative inline-block h-5 w-44 text-right text-(--p-ink-3)">
                  <span className="p-settle-out absolute inset-0">3 need your decision</span>
                  <span className="p-settle absolute inset-0">2 need your decision</span>
                </span>
              </div>
              <ul className="p-figures text-sm">
                {rows.map((row) => (
                  <li key={row.title} className="grid grid-cols-[minmax(0,1fr)_auto_7.5rem] items-center gap-4 border-b border-(--p-line) px-5 py-3.5 last:border-b-0">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{row.title}</span>
                      <span className="block truncate text-xs text-(--p-ink-3)">{row.center}</span>
                    </span>
                    <span className="font-semibold">{formatUsd(row.amount)}</span>
                    <span className="relative h-6 text-right text-xs font-semibold">
                      {row.animate ? (
                        <>
                          <span className="p-settle-out absolute inset-0 text-(--p-pending)">Pending decision</span>
                          <span className="p-settle absolute inset-0 text-(--p-approved)">Approved</span>
                        </>
                      ) : <span className="text-(--p-pending)">Pending decision</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="p-figures grid grid-cols-3 border-t border-(--p-line) bg-(--p-canvas) text-xs">
                <span className="px-5 py-3"><span className="block text-(--p-ink-3)">Platform Engineering available</span>
                  <span className="relative block h-5 text-sm font-semibold">
                    <span className="p-settle-out absolute inset-0">{formatUsd(1_000_000)}</span>
                    <span className="p-settle absolute inset-0">{formatUsd(300_000)}</span>
                  </span>
                </span>
                <span className="px-5 py-3"><span className="block text-(--p-ink-3)">Your limit</span><span className="text-sm font-semibold">{formatUsd(2_500_000)}</span></span>
                <span className="px-5 py-3"><span className="block text-(--p-ink-3)">Audit events</span>
                  <span className="relative block h-5 text-sm font-semibold"><span className="p-settle-out absolute inset-0">3</span><span className="p-settle absolute inset-0">4</span></span>
                </span>
              </div>
            </div>
            <figcaption className="mt-3 text-center text-xs text-(--p-ink-3)">Illustrative scenario, not live data. With reduced motion the final state is shown.</figcaption>
          </figure>
        </section>

        <section id="checks" aria-labelledby="checks-heading" className="scroll-mt-16 border-y border-(--p-line) bg-(--p-surface)">
          <div className="mx-auto max-w-[72rem] px-5 py-16 sm:px-8">
            <h2 id="checks-heading" className="text-2xl font-semibold tracking-[-0.02em]">Three checks before money moves</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-(--p-line)">
              {[
                ["Authority", "Is the amount within your approval limit, and did someone else raise the request?"],
                ["Budget", "Does the cost center still have the amount available when you confirm, not just when you looked?"],
                ["Record", "Is the outcome written once, with its commitment and audit event, even if the connection drops?"],
              ].map(([title, body], index) => (
                <li key={title} className="md:px-8 md:first:pl-0 md:last:pr-0">
                  <p className="p-figures text-sm font-semibold text-(--p-accent)">{index + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-(--p-ink-2)">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="enter" aria-labelledby="enter-heading" className="mx-auto max-w-[72rem] scroll-mt-16 px-5 py-16 sm:px-8">
          <h2 id="enter-heading" className="text-2xl font-semibold tracking-[-0.02em]">Enter the lab workspace</h2>
          <p className="mt-2 text-(--p-ink-2)">Pick a synthetic identity. It is a workshop simulation, not a sign-in.</p>
          {roles.map((role) => (
            <div key={role} className="mt-8">
              <h3 className="text-sm font-semibold text-(--p-ink-3)">{roleLabel[role]}s</h3>
              <ul className="mt-2 divide-y divide-(--p-line) rounded-lg border border-(--p-line) bg-(--p-surface)">
                {data.identities.filter((i) => i.role === role && i.key).map((identity) => (
                  <li key={identity.key}>
                    <PersonaButton identity={identity.key!} destination="/?variant=B" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-(--p-canvas)">
                      <span>
                        <span className="font-medium">{identity.displayName}</span>
                        <span className="p-figures text-sm text-(--p-ink-3)"> · {identity.tenantName}{identity.approvalLimitMinor !== null && <> · limit {formatUsd(identity.approvalLimitMinor)}</>}</span>
                      </span>
                      <span className="text-sm font-semibold text-(--p-accent)">Enter →</span>
                    </PersonaButton>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
