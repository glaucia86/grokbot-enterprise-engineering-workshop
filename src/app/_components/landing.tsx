import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { listLabIdentities, readLabSession } from "../../server/auth/lab-session";
import { LabIdentityForm } from "../lab-identity-form";
import { BrandMark, HealthLink } from "./app-shell";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  FileTextIcon,
  LockSimpleIcon,
  SealCheckIcon,
  TerminalWindowIcon,
  XCircleIcon,
} from "./icons";
import { invariants, stack, trustLayers, workflowSteps } from "./landing-content";
import { ParallaxStage } from "./parallax-stage";
import { RoleGateway } from "./role-gateway";
import { button, card, chip, cn, eyebrow } from "./ui";

type Identity = Awaited<ReturnType<typeof listLabIdentities>>[number];
type Session = NonNullable<Awaited<ReturnType<typeof readLabSession>>>;

const depth = (value: number, drift = 0): CSSProperties => ({ "--depth": value, "--drift": drift }) as CSSProperties;
const rise = (value: number): CSSProperties => ({ "--rise": value }) as CSSProperties;

const pyramidTone: Record<string, string> = {
  "05": "w-full sm:w-[60%] border border-accent-line bg-accent-soft text-accent-ink",
  "04": "w-full sm:w-[70%] bg-[#3d68e6] text-white",
  "03": "w-full sm:w-[80%] bg-[#1f4fd8] text-white",
  "02": "w-full sm:w-[90%] bg-[#1a3fb0] text-white",
  "01": "w-full bg-[#142f80] text-white",
};

/** The hero composition: real UI fragments on ruled ledger paper, each at its own depth. */
function LedgerComposition() {
  return (
    <ParallaxStage className="relative mx-auto hidden aspect-[5/4] w-full max-w-[34rem] sm:block">
      <div
        className="parallax-layer scroll-drift ledger-paper absolute inset-[6%_4%_4%_10%] rounded-xl border border-line shadow-raised"
        style={depth(6, 40)}
        aria-hidden="true"
      >
        <div className="absolute top-4 right-5 left-16 flex items-center justify-between font-mono text-[0.6875rem] text-ink-3">
          <span>LEDGER · Q4</span>
          <span>USD · minor units</span>
        </div>
      </div>

      <div
        className={cn(card, "parallax-layer scroll-drift absolute top-[14%] left-0 w-[64%] p-4 shadow-float")}
        style={depth(14, -30)}
        aria-hidden="true"
      >
        <div className="flex items-center justify-between">
          <span className={chip}>CC-ENG-01</span>
          <span className="text-[0.6875rem] font-medium text-ink-3">Platform Engineering Q4</span>
        </div>
        <p className="mt-3 text-xs text-ink-3">Available headroom</p>
        <p className="font-mono text-xl font-semibold tracking-[-0.03em] tabular-nums text-ink">$3,000.00</p>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[70%] rounded-full bg-accent-solid" />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[0.6875rem] tabular-nums text-ink-3">
          <span>$7,000.00 committed</span>
          <span>70%</span>
        </div>
      </div>

      <div
        className={cn(card, "parallax-layer scroll-drift absolute top-[46%] right-0 w-[60%] p-4 shadow-float")}
        style={depth(24, -70)}
        aria-hidden="true"
      >
        <p className="text-xs font-semibold text-ink">Concurrent approvals · AC-01</p>
        <ul className="mt-2.5 grid gap-2 text-xs">
          <li className="flex items-center justify-between gap-2 rounded-lg border border-line bg-subtle px-2.5 py-2">
            <span className="flex items-center gap-1.5 text-ink-2">
              <CheckCircleIcon size={14} weight="fill" className="text-success-solid" />
              Approval A
            </span>
            <span className="font-mono tabular-nums text-ink">$7,000.00 · 200</span>
          </li>
          <li className="flex items-center justify-between gap-2 rounded-lg border border-line bg-subtle px-2.5 py-2">
            <span className="flex items-center gap-1.5 text-ink-2">
              <XCircleIcon size={14} weight="fill" className="text-danger-solid" />
              Approval B
            </span>
            <span className="font-mono tabular-nums text-ink">409 · Insufficient</span>
          </li>
        </ul>
      </div>

      <div
        className="parallax-layer scroll-drift absolute bottom-[2%] left-[14%] flex items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pr-4 pl-1.5 shadow-float"
        style={depth(34, -110)}
        aria-hidden="true"
      >
        <span className="grid size-7 place-items-center rounded-full bg-success-soft text-success">
          <SealCheckIcon size={15} />
        </span>
        <span className="text-xs text-ink-2">
          <strong className="font-semibold text-ink">APPROVED</strong> · audit event 2 of 2
        </span>
      </div>
    </ParallaxStage>
  );
}

function SectionHeader({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: ReactNode }) {
  return (
    <header className="view-rise max-w-2xl" style={rise(20)}>
      <p className={eyebrow}>{kicker}</p>
      <h2 id={id} className="mt-2 text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-ink sm:text-[2.5rem]">
        {title}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-ink-2">{children}</p>
    </header>
  );
}

export function Landing({ enabled, identities, session }: {
  enabled: boolean;
  identities: Identity[];
  session?: Session;
}) {
  const hasPersonas = enabled && identities.some((identity) => identity.key);
  const navLinks = [
    ...(hasPersonas ? [{ href: "#roles", label: "Roles" }] : []),
    { href: "#workflow", label: "Workflow" },
    { href: "#trust", label: "Trust Pyramid" },
    { href: "#invariants", label: "Invariants" },
  ];

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[80rem] items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
          <Link href={session ? "/" : "/overview"} prefetch={false} className="flex shrink-0 items-center gap-2.5 font-semibold tracking-[-0.01em] whitespace-nowrap text-ink">
            <BrandMark />
            Procurement Hub
          </Link>
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="rounded-lg px-2.5 py-1.5 text-sm text-ink-2 transition-colors duration-150 hover:bg-muted hover:text-ink">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:block"><HealthLink /></span>
            {session && (
              <Link href="/" prefetch={false} className={button.primary}>
                Open dashboard <ArrowRightIcon size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-line bg-canvas" aria-labelledby="hero-title">
          <div className="mx-auto grid max-w-[80rem] items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-8 lg:pt-20 lg:pb-24">
            <div className="min-w-0">
              <p className={eyebrow}>Packt workshop · December 11, 2026 · Synthetic enterprise lab</p>
              <h1 id="hero-title" className="mt-4 text-[3rem] leading-[0.95] font-semibold tracking-[-0.045em] text-ink sm:text-[4.5rem]">
                Procurement Hub
              </h1>
              <p className="mt-4 text-[1.5rem] leading-tight font-medium tracking-[-0.02em] text-ink-2 sm:text-[1.875rem]">
                Spend controls you can <span className="font-semibold text-accent">prove</span>.
              </p>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:text-[1.0625rem]">
                Multi-tenant purchase approvals where every dollar is an exact integer, every decision leaves a durable
                audit trail, and every invariant is verified — from issue to verified pull request.
              </p>

              <div className={cn(card, "mt-8 max-w-xl p-5")}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">Start a lab session</p>
                  <span className="hidden items-center gap-1.5 text-xs text-ink-3 sm:flex">
                    <LockSimpleIcon size={13} aria-hidden="true" />
                    Server-side, HTTP-only, one tenant
                  </span>
                </div>
                <div className="mt-3">
                  {enabled ? (
                    <>
                      {session && (
                        <p className="mb-3 text-[0.8125rem] text-ink-3">
                          Signed in as <strong className="font-medium text-ink">{session.displayName}</strong> at {session.tenantName}.
                        </p>
                      )}
                      <LabIdentityForm identities={identities} selected={session?.key ?? undefined} />
                    </>
                  ) : (
                    <p className="text-sm text-ink-2">
                      The lab profile is disabled. Run <code className={chip}>bun run lab:bootstrap</code> and start the app with{" "}
                      <code className={chip}>WORKSHOP_LAB_MODE=enabled</code> to load the synthetic identities.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {hasPersonas && (
                  <a href="#roles" className="inline-flex items-center gap-1.5 font-semibold text-accent hover:text-accent-hover">
                    Or choose by role <ArrowRightIcon size={15} aria-hidden="true" />
                  </a>
                )}
                <a href="#invariants" className="inline-flex items-center gap-1.5 font-medium text-ink-2 hover:text-ink">
                  Read the ten invariants
                </a>
              </div>
            </div>

            <LedgerComposition />
          </div>
        </section>

        <section className="border-b border-line bg-surface" aria-label="Stack">
          <div className="mx-auto flex max-w-[80rem] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-xs font-medium text-ink-3">Verified against real infrastructure</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {stack.map((item) => (
                <li key={item} className="font-mono text-[0.8125rem] text-ink-2">{item}</li>
              ))}
            </ul>
          </div>
        </section>

        {hasPersonas && (
          <section id="roles" className="scroll-mt-20 border-b border-line bg-canvas" aria-labelledby="roles-heading">
            <div className="mx-auto max-w-[80rem] px-4 py-20 sm:px-6 lg:px-8">
              <SectionHeader id="roles-heading" kicker="Roles" title="Choose who you are today">
                Two isolated tenants share one database and never see each other. Every permission comes from
                server-side membership records — never from the browser.
              </SectionHeader>
              <div className="mt-10">
                <RoleGateway identities={identities} activeKey={session?.key ?? undefined} />
              </div>
            </div>
          </section>
        )}

        <section id="workflow" className="scroll-mt-20 border-b border-line bg-surface" aria-labelledby="workflow-heading">
          <div className="mx-auto max-w-[80rem] px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeader id="workflow-heading" kicker="Workflow" title="From issue to verified pull request">
              A bounded loop that replaces &ldquo;it compiles&rdquo; with observable, persisted proof.
            </SectionHeader>
            <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
              <span className="absolute top-4 right-[12.5%] left-[12.5%] hidden h-px bg-line-strong md:block" aria-hidden="true" />
              {workflowSteps.map((item, index) => (
                <li key={item.step} className="view-rise relative grid content-start gap-3" style={rise(20 + index * 14)}>
                  <span className="relative grid size-8 place-items-center rounded-full border border-line-strong bg-surface font-mono text-xs font-semibold text-ink md:mx-auto">
                    {item.step}
                  </span>
                  <div className="md:text-center">
                    <h3 className="text-lg font-semibold tracking-[-0.015em] text-ink">{item.name}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{item.body}</p>
                    <code className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#0d1421] px-2 py-1 font-mono text-xs text-[#c7d4ff] dark:bg-[#05080f]">
                      <TerminalWindowIcon size={13} aria-hidden="true" />
                      {item.command}
                    </code>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="trust" className="scroll-mt-20 border-b border-line bg-canvas" aria-labelledby="trust-heading">
          <div className="mx-auto grid max-w-[80rem] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-8">
            <SectionHeader id="trust-heading" kicker="Trust Pyramid" title="Enforceable constraints before prose">
              Financial correctness rests on the base: types, ports, and transactions. Each layer up adds a different
              kind of evidence. Prose sits at the apex — useful guidance, never the guarantee.
            </SectionHeader>
            <ol className="grid justify-items-center gap-2">
              {trustLayers.map((tier, index) => (
                <li
                  key={tier.layer}
                  className={cn("view-rise grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 rounded-lg px-4 py-3", pyramidTone[tier.layer])}
                  style={rise(16 + (trustLayers.length - index) * 10)}
                >
                  <span className="pt-0.5 font-mono text-xs font-semibold">L{tier.layer}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="text-sm font-semibold">{tier.name}</h3>
                      <code className="font-mono text-[0.6875rem]">{tier.command}</code>
                    </div>
                    <p className="mt-0.5 text-[0.8125rem] leading-snug">{tier.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="invariants" className="scroll-mt-20 bg-surface" aria-labelledby="invariants-heading">
          <div className="mx-auto max-w-[80rem] px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeader id="invariants-heading" kicker="Business invariants" title="Ten invariants. Zero tolerance.">
              Each one is traced to deterministic tests, runtime journeys, and — for the approval protocol — a formal model.
            </SectionHeader>
            <div className={cn(card, "mt-10 overflow-hidden")}>
              <div className="hidden grid-cols-[7rem_16rem_minmax(0,1fr)] border-b border-line bg-subtle px-6 py-2.5 text-[0.6875rem] font-semibold tracking-[0.07em] text-ink-3 uppercase md:grid">
                <span>Code</span>
                <span>Invariant</span>
                <span>Guarantee</span>
              </div>
              <ul className="divide-y divide-line">
                {invariants.map((item) => (
                  <li
                    key={item.id}
                    className="grid gap-1 px-6 py-4 transition-colors duration-150 hover:bg-subtle md:grid-cols-[7rem_16rem_minmax(0,1fr)] md:items-baseline md:gap-0"
                  >
                    <span className="font-mono text-[0.8125rem] font-semibold text-accent" translate="no">{item.id}</span>
                    <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-ink-2">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-3">
              <li className="flex items-center gap-1.5"><FileTextIcon size={14} aria-hidden="true" />Defined in PRD.md</li>
              <li className="flex items-center gap-1.5"><ClockCounterClockwiseIcon size={14} aria-hidden="true" />Traced in REQUIREMENTS-TRACEABILITY.md</li>
              <li className="flex items-center gap-1.5"><SealCheckIcon size={14} aria-hidden="true" />Model-checked in ProcurementApproval.tla</li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto flex max-w-[80rem] flex-wrap justify-between gap-x-8 gap-y-2 px-4 py-6 text-[0.8125rem] text-ink-3 sm:px-6 lg:px-8">
          <p>
            <strong className="font-medium text-ink-2">Synthetic lab only.</strong> Loopback resources and generated data —
            never connect to production systems or real corporate records.
          </p>
          <p>
            Inspired by Lauren Tan&rsquo;s <em>All Code Is Slop (Except Mine)</em> and{" "}
            <a className="text-accent hover:text-accent-hover" href="https://github.com/cursor/plugins/tree/main/pstack" rel="noreferrer">
              cursor/plugins/pstack
            </a>{" "}
            (MIT).
          </p>
        </div>
      </footer>
    </div>
  );
}
