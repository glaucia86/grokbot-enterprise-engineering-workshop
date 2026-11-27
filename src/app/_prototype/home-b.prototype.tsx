/* PROTOTYPE B: institutional product narrative, with an explicitly illustrative interactive walkthrough. */
import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, ShieldCheckIcon, TrayIcon, WalletIcon, ReceiptIcon } from "../_components/icons";
import { formatUsd } from "../format-purchase";
import { roleLabel, type HomeData } from "./data";
import { PersonaButton } from "./lab-switch";
import { FinancialStory } from "./financial-story";
import { illustrativePurchase } from "./financial-story-data";
import "./experience-b.css";

const roles = ["APPROVER", "REQUESTER", "AUDITOR"] as const;

export function HomeB({ data }: { data: HomeData }) {
  const destination = "/dashboard?variant=B";
  return (
    <div className="pb ph-product min-h-dvh">
      <header className="ph-site-header">
        <div className="ph-site-nav">
          <Link href="/home?variant=B" className="ph-wordmark"><span className="ph-brand-icon"><ShieldCheckIcon size={24} weight="duotone" /></span><span>Procurement<span className="ph-wordmark-light"> Hub</span></span></Link>
          <nav aria-label="Product navigation" className="ph-site-links"><a href="#workflow">How it works</a><a href="#controls">Financial controls</a><a href="#enter">Explore roles</a></nav>
          <Link className="ph-primary ph-nav-cta" href={data.session ? destination : "#enter"}>Open workspace <ArrowUpRightIcon size={17} aria-hidden="true" /></Link>
        </div>
      </header>
      <main id="main-content">
        <section className="ph-hero" aria-labelledby="ph-hero-heading">
          <div className="ph-hero-grid" aria-hidden="true" />
          <div className="ph-hero-inner">
            <div className="ph-hero-copy">
              <p className="ph-kicker"><span /> Corporate spend · Engineering lab</p>
              <h1 id="ph-hero-heading">Clarity before<br />money <em>moves.</em></h1>
              <p className="ph-lede">One place to request purchases, understand the budget impact, and trace the decisions behind every commitment.</p>
              <div className="ph-hero-actions"><Link href={data.session ? destination : "#enter"} className="ph-primary">Explore the workspace <ArrowRightIcon size={19} aria-hidden="true" /></Link><a className="ph-secondary" href="#workflow">See a decision unfold <span aria-hidden="true">↓</span></a></div>
              <p className="ph-hero-note">A synthetic enterprise lab. No real corporate data or payments.</p>
            </div>
            <figure className="ph-hero-figure">
              <div className="ph-orbit ph-orbit-one" aria-hidden="true" /><div className="ph-orbit ph-orbit-two" aria-hidden="true" />
              <div className="ph-ledger">
                <div className="ph-ledger-top"><span><WalletIcon size={18} aria-hidden="true" /> {illustrativePurchase.costCenter}</span><span>Q4 / USD</span></div>
                <div className="ph-ledger-balance"><span>Available after approval</span><strong>{formatUsd(illustrativePurchase.allocatedMinor - illustrativePurchase.requestedMinor)}</strong><small>of {formatUsd(illustrativePurchase.allocatedMinor)} allocated</small></div>
                <div className="ph-ledger-bar" aria-hidden="true"><span /></div>
                <div className="ph-ledger-key"><span><i /> Committed {formatUsd(illustrativePurchase.requestedMinor)}</span><span>Available {formatUsd(illustrativePurchase.allocatedMinor - illustrativePurchase.requestedMinor)}</span></div>
                <div className="ph-ledger-rule" />
                <div className="ph-ledger-row"><span className="ph-ledger-symbol"><TrayIcon size={20} /></span><span><strong>{illustrativePurchase.title}</strong><small>Purchase request · {illustrativePurchase.costCenterCode}</small></span><strong>{formatUsd(illustrativePurchase.requestedMinor)}</strong></div>
                <div className="ph-ledger-row ph-ledger-result"><span className="ph-ledger-symbol"><ReceiptIcon size={20} /></span><span><strong>Approval recorded</strong><small>Illustrative commitment</small></span><span className="ph-ledger-ok">Approved</span></div>
              </div>
              <figcaption>Illustrative scenario. Not live tenant data.</figcaption>
            </figure>
          </div>
          <div className="ph-hero-footer"><span>01 / Procurement operations</span><span>Request → Review → Record</span><a href="#workflow">Scroll to explore ↓</a></div>
        </section>
        <section id="workflow" className="ph-workflow" aria-labelledby="ph-workflow-heading">
          <div className="ph-section-intro"><h2 id="ph-workflow-heading">From a request<br />to a record.</h2><p>Follow a $7,000 example from submission to an auditable outcome. The view follows each step of the decision.</p></div>
          <FinancialStory />
        </section>
        <section id="controls" className="ph-controls" aria-labelledby="ph-controls-heading">
          <div className="ph-controls-inner"><div><p className="ph-index">02 / FINANCIAL CONTROLS</p><h2 id="ph-controls-heading">Trust is a property<br />of the system.</h2><p>These are the intended rules. The workshop tests the implementation against them; this page is not a verification report.</p></div>
            <dl className="ph-control-list">
              {[
                ["01", "Authority before approval", "Approval is limited by the organization’s server-side membership and policy."],
                ["02", "Budget before commitment", "An approval must fit the cost center’s available allocation at the time of the decision."],
                ["03", "A durable record", "A financial outcome must be traceable to its authorized decision and audit event."],
                ["04", "Concurrency under scrutiny", "Two competing approvals must never spend the same available dollar twice."],
              ].map(([n, title, body]) => <div key={n}><dt><span aria-hidden="true">{n}</span>{title}</dt><dd>{body}</dd></div>)}
            </dl>
          </div>
        </section>
        <section id="enter" className="ph-personas" aria-labelledby="ph-enter-heading">
          <div className="ph-section-intro"><p className="ph-index">03 / ENTER THE LAB</p><h2 id="ph-enter-heading">Choose your perspective.</h2><p>Explore the same financial operation from a different role. This identity selector is a workshop simulation, not production authentication.</p></div>
          {!data.enabled && <p role="status">Lab mode is disabled. Start the local workshop environment to continue.</p>}
          <div className="ph-persona-grid">
            {roles.map((role) => <section key={role} className="ph-persona"><h3>{roleLabel[role]}</h3><p>{role === "APPROVER" ? "Review pending work and assess financial impact." : role === "REQUESTER" ? "Create and track your purchase requests." : "Trace outcomes and review financial evidence."}</p>
              <ul>{data.identities.filter((i) => i.role === role && i.key).map((identity) => <li key={identity.key}><PersonaButton identity={identity.key!} destination={destination} className="ph-persona-button"><span><strong>{identity.displayName}</strong><small>{identity.tenantName}{identity.approvalLimitMinor !== null && <> · {formatUsd(identity.approvalLimitMinor)} limit</>}</small></span><ArrowRightIcon size={18} aria-hidden="true" /></PersonaButton></li>)}</ul>
            </section>)}
          </div>
          {data.session && <Link href={destination} className="ph-primary">Return to your workspace <ArrowRightIcon size={18} aria-hidden="true" /></Link>}
        </section>
      </main>
      <footer className="ph-site-footer"><span>Procurement Hub · Enterprise engineering lab</span><Link href="/?variant=0">Open working application ↗</Link></footer>
    </div>
  );
}
