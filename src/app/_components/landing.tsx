import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { listLabIdentities, readLabSession } from "../../server/auth/lab-session";
import { LabIdentityForm } from "../lab-identity-form";
import { BrandMark, HealthLink } from "./app-shell";
import { ArrowRightIcon, CheckCircleIcon, SealCheckIcon, XCircleIcon } from "./icons";
import { invariants, stack, trustLayers } from "./landing-content";
import { ParallaxStage } from "./parallax-stage";
import { RoleGateway } from "./role-gateway";
import { button, card, chip, cn } from "./ui";

type Identity = Awaited<ReturnType<typeof listLabIdentities>>[number];
type Session = NonNullable<Awaited<ReturnType<typeof readLabSession>>>;

const depth = (value: number, drift = 0): CSSProperties => ({ "--depth": value, "--drift": drift }) as CSSProperties;
const rise = (value: number): CSSProperties => ({ "--rise": value }) as CSSProperties;

/* The base is the strongest guarantee, so it is the one layer that carries the accent. */
const pyramidTone: Record<string, string> = {
  "05": "w-full sm:w-[60%] border border-night-line bg-white/[0.06] text-night-ink",
  "04": "w-full sm:w-[70%] bg-[#2f2c29] text-white",
  "03": "w-full sm:w-[80%] bg-[#3a3733] text-white",
  "02": "w-full sm:w-[90%] bg-[#44403c] text-white",
  "01": "w-full bg-accent-solid text-white",
};

/** Real UI fragments floating over ruled ledger paper, each at its own depth. */
function LedgerComposition() {
  return (
    <ParallaxStage className="relative mx-auto hidden aspect-[5/4] w-full max-w-[34rem] sm:block">
      <div
        className="parallax-layer scroll-drift ledger-rules-night absolute inset-[6%_4%_4%_10%] rounded-xl border border-night-line"
        style={depth(6, 40)}
        aria-hidden="true"
      >
        <div className="absolute top-4 right-5 left-16 flex items-center justify-between font-mono text-[0.6875rem] text-night-muted">
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
          <div className="h-full w-[70%] rounded-full bg-ink-2" />
        </div>
      </div>

      <div
        className={cn(card, "parallax-layer scroll-drift absolute top-[46%] right-0 w-[60%] p-4 shadow-float")}
        style={depth(24, -70)}
        aria-hidden="true"
      >
        <p className="text-xs font-semibold text-ink">Two approvals, one budget</p>
        <ul className="mt-2.5 grid gap-2 text-xs">
          <li className="flex items-center justify-between gap-2 rounded-lg bg-subtle px-2.5 py-2">
            <span className="flex items-center gap-1.5 text-ink-2">
              <CheckCircleIcon size={14} weight="fill" className="text-success-solid" />
              $7,000.00
            </span>
            <span className="font-mono tabular-nums text-ink">200</span>
          </li>
          <li className="flex items-center justify-between gap-2 rounded-lg bg-subtle px-2.5 py-2">
            <span className="flex items-center gap-1.5 text-ink-2">
              <XCircleIcon size={14} weight="fill" className="text-danger-solid" />
              $7,000.00
            </span>
            <span className="font-mono tabular-nums text-ink">409</span>
          </li>
        </ul>
      </div>

      <div
        className="parallax-layer scroll-drift absolute bottom-[2%] left-[14%] flex items-center gap-2.5 rounded-full bg-surface py-1.5 pr-4 pl-1.5 shadow-float"
        style={depth(34, -110)}
        aria-hidden="true"
      >
        <span className="grid size-7 place-items-center rounded-full bg-success-soft text-success">
          <SealCheckIcon size={15} />
        </span>
        <span className="text-xs text-ink-2">
          <strong className="font-semibold text-ink">INV-01</strong> holds
        </span>
      </div>
    </ParallaxStage>
  );
}

function SectionTitle({ id, kicker, title, night = false, children }: {
  id: string;
  kicker: string;
  title: string;
  night?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="view-rise max-w-xl" style={rise(20)}>
      <p className={cn("text-xs font-semibold tracking-[0.08em] uppercase", night ? "text-night-accent" : "text-accent")}>{kicker}</p>
      <h2
        id={id}
        className={cn("mt-2 text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[2.5rem]", night ? "text-white" : "text-ink")}
      >
        {title}
      </h2>
      {children && <p className={cn("mt-3 text-base", night ? "text-night-muted" : "text-ink-3")}>{children}</p>}
    </header>
  );
}

export function Landing({ enabled, identities, session }: {
  enabled: boolean;
  identities: Identity[];
  session?: Session;
}) {
  const hasPersonas = enabled && identities.some((identity) => identity.key);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 border-b border-night-line bg-night text-night-ink">
        <div className="mx-auto flex max-w-[80rem] items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href={session ? "/" : "/overview"}
            prefetch={false}
            className="flex shrink-0 items-center gap-2.5 font-semibold tracking-[-0.01em] whitespace-nowrap text-white"
          >
            <BrandMark />
            Procurement Hub
          </Link>
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {[
              ...(hasPersonas ? [{ href: "#roles", label: "Roles" }] : []),
              { href: "#proof", label: "Proof" },
              { href: "#invariants", label: "Invariants" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-2.5 py-1.5 text-sm text-night-muted transition-colors duration-150 hover:bg-night-raised hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:block"><HealthLink tone="night" /></span>
            {session && (
              <Link href="/" prefetch={false} className={button.primary}>
                Open dashboard <ArrowRightIcon size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden bg-night text-night-ink" aria-labelledby="hero-title">
          <div className="mx-auto grid max-w-[80rem] items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-24 lg:pb-28">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.08em] text-night-muted uppercase">Packt workshop · December 11, 2026</p>
              <h1 id="hero-title" className="mt-4 text-[3rem] leading-[0.95] font-semibold tracking-[-0.045em] text-white sm:text-[4.75rem]">
                Procurement Hub
              </h1>
              <p className="mt-5 text-[1.5rem] leading-tight font-medium tracking-[-0.02em] text-night-muted sm:text-[2rem]">
                Spend controls you can <span className="text-night-accent">prove</span>.
              </p>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-night-muted">
                Multi-tenant purchase approvals with exact integer money, durable audit trails, and verified invariants.
              </p>
              <div className="mt-9 max-w-lg">
                {enabled ? (
                  <LabIdentityForm identities={identities} selected={session?.key ?? undefined} tone="night" />
                ) : (
                  <p className="text-sm text-night-muted">
                    Lab profile disabled. Run <code className="font-mono text-night-ink">bun run lab:bootstrap</code> with{" "}
                    <code className="font-mono text-night-ink">WORKSHOP_LAB_MODE=enabled</code>.
                  </p>
                )}
              </div>
            </div>
            <LedgerComposition />
          </div>
        </section>

        {hasPersonas && (
          <section id="roles" className="scroll-mt-16" aria-labelledby="roles-heading">
            <div className="mx-auto max-w-[80rem] px-4 py-24 sm:px-6 lg:px-8">
              <SectionTitle id="roles-heading" kicker="Roles" title="Choose who you are today">
                Two isolated tenants. Permissions come from the server, never the browser.
              </SectionTitle>
              <div className="mt-10">
                <RoleGateway identities={identities} activeKey={session?.key ?? undefined} />
              </div>
            </div>
          </section>
        )}

        <section id="proof" className="scroll-mt-16 bg-night" aria-labelledby="proof-heading">
          <div className="mx-auto grid max-w-[80rem] items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:px-8">
            <SectionTitle id="proof-heading" kicker="Trust Pyramid" title="Enforceable constraints before prose" night>
              Each layer adds evidence. Prose guides; the base guarantees.
            </SectionTitle>
            <ol className="grid justify-items-center gap-2">
              {trustLayers.map((tier, index) => (
                <li
                  key={tier.layer}
                  className={cn("view-rise flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg px-4 py-3", pyramidTone[tier.layer])}
                  style={rise(16 + (trustLayers.length - index) * 10)}
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold">L{tier.layer}</span>
                    <h3 className="text-sm font-semibold">{tier.name}</h3>
                  </span>
                  <code className="font-mono text-xs">{tier.command}</code>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="invariants" className="scroll-mt-16" aria-labelledby="invariants-heading">
          <div className="mx-auto max-w-[80rem] px-4 py-24 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionTitle id="invariants-heading" kicker="Business invariants" title="Ten invariants. Zero tolerance." />
              <p className="view-rise text-sm text-ink-3" style={rise(20)}>Defined in the PRD · model-checked in TLA+</p>
            </div>
            <ul className={cn(card, "mt-10 grid overflow-hidden sm:grid-cols-2")}>
              {invariants.map((item, index) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-baseline gap-4 border-line px-6 py-4",
                    index > 0 && "border-t",
                    index === 1 && "sm:border-t-0",
                    index % 2 === 1 && "sm:border-l",
                  )}
                >
                  <span className="font-mono text-[0.8125rem] font-semibold text-accent" translate="no">{item.id}</span>
                  <h3 className="text-sm font-medium text-ink">{item.title}</h3>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="bg-night text-night-muted">
        <div className="mx-auto grid max-w-[80rem] gap-3 px-4 py-8 text-[0.8125rem] sm:px-6 lg:px-8">
          <p className="font-mono text-xs text-night-ink">{stack.join(" · ")}</p>
          <div className="flex flex-wrap justify-between gap-x-8 gap-y-2">
            <p>Synthetic lab only — loopback resources and generated data.</p>
            <p>
              Inspired by Lauren Tan&rsquo;s <em>All Code Is Slop (Except Mine)</em> and{" "}
              <a className="text-night-accent hover:text-white" href="https://github.com/cursor/plugins/tree/main/pstack" rel="noreferrer">
                cursor/plugins/pstack
              </a>{" "}
              (MIT).
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
