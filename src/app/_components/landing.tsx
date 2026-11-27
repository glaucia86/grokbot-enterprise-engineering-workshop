import Link from "next/link";
import type { listLabIdentities, readLabSession } from "../../server/auth/lab-session";
import "../landing.css";
import { LabIdentityForm } from "../lab-identity-form";
import { AppTopbar } from "./app-topbar";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  DatabaseIcon,
  GitPullRequestIcon,
  LayersIcon,
  LockIcon,
  ScaleIcon,
  SparklesIcon,
  TerminalIcon,
  UsersIcon,
  XCircleIcon,
} from "./icons";
import { invariants, stack, trustLayers, workflowSteps } from "./landing-content";
import { stagger } from "./motion";
import { QuickStartIdentities } from "./quick-start-identities";

type Identity = Awaited<ReturnType<typeof listLabIdentities>>[number];
type Session = NonNullable<Awaited<ReturnType<typeof readLabSession>>>;

function LedgerIllustration() {
  return (
    <div className="ledger-float" aria-hidden="true">
      <div className="ledger-card">
        <div className="ledger-card-head">
          <span className="ledger-code mono">CC-ENG-01</span>
          <span className="ledger-tag">Illustrative · AC-01</span>
        </div>
        <p className="ledger-title">Platform Engineering Q4</p>
        <div className="ledger-figures">
          <span>Allocated</span>
          <span className="mono">$10,000.00</span>
        </div>
        <div className="ledger-meter"><span /></div>
        <ul className="ledger-race">
          <li>
            <span className="ledger-race-lane">Approval A</span>
            <span className="mono">$7,000.00</span>
            <span className="ledger-pill ledger-pill-ok"><CheckCircleIcon size={13} />Committed</span>
          </li>
          <li>
            <span className="ledger-race-lane">Approval B</span>
            <span className="mono">$7,000.00</span>
            <span className="ledger-pill ledger-pill-stop"><XCircleIcon size={13} />409 Insufficient</span>
          </li>
        </ul>
        <div className="ledger-foot">
          <span><LockIcon size={12} />INV-01 holds</span>
          <span><LockIcon size={12} />INV-02 holds</span>
        </div>
      </div>
    </div>
  );
}

export function Landing({ enabled, identities, session }: {
  enabled: boolean;
  identities: Identity[];
  session?: Session;
}) {
  const hasPersonas = enabled && identities.some((identity) => identity.key);

  return (
    <>
      <AppTopbar session={session} section="overview" tone="dark" />
      <main id="main-content" className="landing">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-backdrop" aria-hidden="true">
            <span className="aurora aurora-1" />
            <span className="aurora aurora-2" />
            <span className="aurora aurora-3" />
            <span className="hero-grid" />
            <span className="hero-beam" />
          </div>

          <div className="hero-inner">
            <div className="hero-copy">
              <p className="hero-eyebrow reveal" style={stagger(0)}>
                <SparklesIcon size={14} />
                Packt Workshop · Dec 11, 2026 · Synthetic Enterprise Lab
              </p>
              <h1 id="hero-title" className="hero-title reveal" style={stagger(1)}>Procurement Hub</h1>
              <p className="hero-tagline reveal" style={stagger(2)}>
                Spend controls you can <span className="hero-highlight">prove</span>.
              </p>
              <p className="hero-lead reveal" style={stagger(3)}>
                Multi-tenant purchase approvals where every dollar is an exact integer, every decision leaves a
                durable audit trail, and every invariant is verified — from issue to verified pull request.
              </p>
              <div className="hero-actions reveal" style={stagger(4)}>
                {session ? (
                  <Link className="btn btn-primary btn-lg" href="/" prefetch={false}>
                    Open dashboard <ArrowRightIcon size={17} />
                  </Link>
                ) : (
                  <a className="btn btn-primary btn-lg" href={hasPersonas ? "#personas" : "#trust"}>
                    {hasPersonas ? "Choose a persona" : "See how it is verified"} <ArrowRightIcon size={17} />
                  </a>
                )}
                <a className="btn btn-glass btn-lg" href="#invariants">Explore the invariants</a>
              </div>
              <ul className="hero-proof reveal" style={stagger(5)}>
                <li><ScaleIcon size={15} />Integer minor units</li>
                <li><UsersIcon size={15} />Tenant-isolated sessions</li>
                <li><GitPullRequestIcon size={15} />Revision-bound evidence</li>
              </ul>
            </div>

            <div className="hero-panel reveal" style={stagger(3)}>
              <div className="glass-card">
                <p className="glass-card-eyebrow"><span className="health-dot" aria-hidden="true" />Start a lab session</p>
                {enabled ? (
                  <>
                    <p className="glass-card-lead">
                      {session
                        ? `Signed in as ${session.displayName} at ${session.tenantName}. Switch to explore another role.`
                        : "Pick a synthetic identity. Sessions are server-side, HTTP-only, and scoped to one tenant."}
                    </p>
                    <LabIdentityForm identities={identities} selected={session?.key ?? undefined} />
                  </>
                ) : (
                  <p className="glass-card-lead">
                    The lab profile is disabled. Run <code>bun run lab:bootstrap</code> and start the app with{" "}
                    <code>WORKSHOP_LAB_MODE=enabled</code> to load the synthetic identities.
                  </p>
                )}
              </div>
              <LedgerIllustration />
            </div>
          </div>
        </section>

        {hasPersonas && (
          <section id="personas" className="landing-section" aria-labelledby="personas-heading">
            <header className="section-header">
              <p className="eyebrow"><UsersIcon size={14} />Personas</p>
              <h2 id="personas-heading">Step into a role</h2>
              <p className="section-lead">
                Two isolated tenants with requester, approver, and auditor personas. Every permission is derived
                from server-side membership records — never from the browser.
              </p>
            </header>
            <QuickStartIdentities identities={identities} activeKey={session?.key ?? undefined} />
          </section>
        )}

        <section id="workflow" className="landing-section" aria-labelledby="workflow-heading">
          <header className="section-header">
            <p className="eyebrow"><GitPullRequestIcon size={14} />Workflow</p>
            <h2 id="workflow-heading">From issue to verified pull request</h2>
            <p className="section-lead">A bounded loop that replaces &ldquo;it compiles&rdquo; with observable, persisted proof.</p>
          </header>
          <ol className="workflow">
            {workflowSteps.map((item, index) => (
              <li key={item.step} className="workflow-step reveal" style={stagger(index)}>
                <span className="workflow-index mono">{item.step}</span>
                <h3>{item.name}</h3>
                <p>{item.body}</p>
                <code className="command-chip"><TerminalIcon size={13} />{item.command}</code>
              </li>
            ))}
          </ol>
        </section>

        <section id="trust" className="landing-section" aria-labelledby="trust-heading">
          <header className="section-header">
            <p className="eyebrow"><LayersIcon size={14} />Trust Pyramid</p>
            <h2 id="trust-heading">Enforceable constraints before prose</h2>
            <p className="section-lead">
              Financial correctness rests on the base of the pyramid. Each layer up adds a different kind of evidence,
              and prose sits at the apex — useful guidance, never the guarantee.
            </p>
          </header>
          <ol className="pyramid">
            {trustLayers.map((tier, index) => (
              <li
                key={tier.layer}
                className={"pyramid-tier pyramid-tier-" + tier.layer + " reveal"}
                style={stagger(trustLayers.length - index)}
              >
                <span className="pyramid-layer mono">Layer {tier.layer}</span>
                <div className="pyramid-copy">
                  <h3>{tier.name}</h3>
                  <p>{tier.body}</p>
                </div>
                <code className="command-chip">{tier.command}</code>
              </li>
            ))}
          </ol>
        </section>

        <section id="invariants" className="landing-section" aria-labelledby="invariants-heading">
          <header className="section-header">
            <p className="eyebrow"><LockIcon size={14} />Business invariants</p>
            <h2 id="invariants-heading">Ten invariants. Zero tolerance.</h2>
            <p className="section-lead">
              Each one is traced to deterministic tests, runtime journeys, and — for the approval protocol — a formal
              model.
            </p>
          </header>
          <ul className="invariant-grid">
            {invariants.map((item, index) => (
              <li key={item.id} className="invariant-card reveal" style={stagger(index % 5)}>
                <span className="code-chip" translate="no">{item.id}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-section stack-section" aria-labelledby="stack-heading">
          <div className="stack-strip">
            <h2 id="stack-heading" className="stack-title"><DatabaseIcon size={16} />Built on real infrastructure</h2>
            <ul className="stack-list">
              {stack.map((item) => <li key={item} className="mono">{item}</li>)}
            </ul>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <p>
            <strong>Synthetic lab only.</strong> Loopback resources and generated data — never connect to production
            systems or real corporate records.
          </p>
          <p>
            Inspired by Lauren Tan&rsquo;s <em>All Code Is Slop (Except Mine)</em> and{" "}
            <a href="https://github.com/cursor/plugins/tree/main/pstack" rel="noreferrer">cursor/plugins/pstack</a> (MIT).
          </p>
        </div>
      </footer>
    </>
  );
}
