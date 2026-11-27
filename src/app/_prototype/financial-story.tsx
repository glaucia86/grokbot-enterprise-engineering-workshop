"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  FileTextIcon,
  ReceiptIcon,
  ShieldCheckIcon,
} from "../_components/icons";
import { formatUsd } from "../format-purchase";
import { financialChapters, illustrativePurchase, type FinancialChapter } from "./financial-story-data";
import "./financial-story.css";

const scrollLayout = "(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)";

function chapterSummary(chapter: FinancialChapter) {
  const available = illustrativePurchase.allocatedMinor - chapter.committedMinor;
  const projection = chapter.id === "story-review"
    ? ` Available if approved: ${formatUsd(illustrativePurchase.allocatedMinor - illustrativePurchase.requestedMinor)}.`
    : "";
  return `${chapter.status}. Requested: ${formatUsd(illustrativePurchase.requestedMinor)}. Committed: ${formatUsd(chapter.committedMinor)}. Available: ${formatUsd(available)}.${projection} ${chapter.note}`;
}

/**
 * The narrative is server-rendered and readable before enhancement.
 * CSS scrubs transforms; IntersectionObserver changes only the discrete chapter.
 * No scroll listener, frame-by-frame React state, session data, or financial action.
 */
export function FinancialStory() {
  const root = useRef<HTMLDivElement>(null);
  const manuallySelected = useRef(false);
  const [active, setActive] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const chapter = financialChapters[active];

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = window.matchMedia(scrollLayout);
    const supportsTimeline = CSS.supports("animation-timeline: view()")
      && CSS.supports("animation-range: entry 50% exit 50%");
    const articles = Array.from(element.querySelectorAll<HTMLElement>("[data-story-chapter]"));
    let observer: IntersectionObserver | undefined;
    let restoreFrame: number | undefined;
    let disposed = false;

    function selectVisibleChapter() {
      const midpoint = window.innerHeight / 2;
      let nearest = 0;
      let distance = Infinity;
      for (const [index, article] of articles.entries()) {
        const box = article.getBoundingClientRect();
        // Prefer the chapter containing the midpoint, even when text makes chapter heights unequal.
        const nextDistance = Math.max(box.top - midpoint, midpoint - box.bottom, 0);
        if (nextDistance < distance) {
          nearest = index;
          distance = nextDistance;
        }
      }
      setActive(nearest);
    }

    function configureLayout() {
      observer?.disconnect();
      if (!element) return;
      element.dataset.scroll = "static";
      if (!media.matches || !supportsTimeline || !("IntersectionObserver" in window)) return;

      element.dataset.scroll = "enhanced";
      // A narrow viewport band gives each chapter a stable activation point.
      const inset = Math.floor(window.innerHeight * .49);
      observer = new IntersectionObserver(selectVisibleChapter, {
        rootMargin: `-${inset}px 0px -${inset}px 0px`,
        threshold: 0,
      });
      articles.forEach((article) => observer?.observe(article));
    }

    element.dataset.ready = "true";
    configureLayout();

    // A chapter fragment first targets the compact server-rendered layout.
    // Restore that explicit destination once the enhanced layout and fonts settle.
    const initialHash = window.location.hash;
    const destination = articles.find((article) => `#${article.id}` === initialHash);
    if (destination && element.dataset.scroll === "enhanced") {
      void document.fonts.ready.then(() => {
        if (disposed || window.location.hash !== initialHash || element.dataset.scroll !== "enhanced") return;
        restoreFrame = window.requestAnimationFrame(() => {
          if (disposed || manuallySelected.current || window.location.hash !== initialHash || element.dataset.scroll !== "enhanced") return;
          destination.scrollIntoView({ behavior: "instant", block: "center" });
        });
      });
    }

    media.addEventListener("change", configureLayout);
    window.addEventListener("resize", configureLayout, { passive: true });
    return () => {
      disposed = true;
      if (restoreFrame !== undefined) window.cancelAnimationFrame(restoreFrame);
      observer?.disconnect();
      media.removeEventListener("change", configureLayout);
      window.removeEventListener("resize", configureLayout);
      delete element.dataset.scroll;
      delete element.dataset.ready;
    };
  }, []);

  function chooseChapter(index: number) {
    const next = financialChapters[index];
    manuallySelected.current = true;
    setActive(index);
    // Only a deliberate button action announces a change, never ordinary scrolling.
    setAnnouncement(`${next.action}. ${chapterSummary(next)}`);
    if (root.current?.dataset.scroll === "enhanced") {
      root.current.querySelector<HTMLElement>(`#${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return (
    <div ref={root} className="ph-journey" data-chapter={active}>
      <div className="ph-journey-toolbar">
        <p>Illustrative scenario. No live data or financial actions.</p>
        <a href="#controls">Skip walkthrough <ArrowRightIcon size={15} aria-hidden="true" /></a>
      </div>

      <div className="ph-journey-layout">
        <div className="ph-journey-visual">
          <figure id="story-preview" className="ph-journey-figure" aria-label="Illustrative mobile purchase review">
            {/* Moving duplicates are decorative; the complete narrative follows in document order. */}
            <div className="ph-journey-stage" aria-hidden="true">
              <div className="ph-journey-backdrop" />
              <MobilePurchase active={active} />
              <div className="ph-journey-float ph-journey-balance">
                <div className="ph-journey-balance-inner" key={chapter.id}>
                  <span>{active === 1 ? "Available if approved" : "Available budget"}</span>
                  <strong>{formatUsd(active === 1
                    ? illustrativePurchase.allocatedMinor - illustrativePurchase.requestedMinor
                    : illustrativePurchase.allocatedMinor - chapter.committedMinor)}</strong>
                  <small>{active === 1 ? "Projected in this example" : "Platform Engineering"}</small>
                </div>
              </div>
              <div className="ph-journey-float ph-journey-receipt">
                <div className="ph-journey-receipt-inner" key={chapter.id}>
                  <div className="ph-journey-receipt-top"><ReceiptIcon size={18} /><span>{active < 2 ? "Purchase request" : "Illustrative record"}</span></div>
                  <strong>{active === 3 ? "Two linked audit events" : active === 2 ? "One recorded commitment" : "Cloud security tooling"}</strong>
                  <small>{active === 3 ? "Request submitted. Approval recorded." : active === 2 ? `${formatUsd(chapter.committedMinor)} committed in this example.` : "A clear purpose. An accountable decision."}</small>
                </div>
              </div>
            </div>
            <figcaption>
              Mobile layout illustration. {chapter.action}.
              <span className="sr-only"> {chapterSummary(chapter)}</span>
            </figcaption>
          </figure>

          <div className="ph-journey-navigation" role="group" aria-label="Illustrative decision steps">
            {financialChapters.map((item, index) => (
              <button key={item.id} type="button" aria-pressed={index === active}
                aria-controls="story-preview" onClick={() => chooseChapter(index)}>
                {item.action}
              </button>
            ))}
          </div>
        </div>

        <div className="ph-journey-chapters">
          {financialChapters.map((item) => (
            <article id={item.id} key={item.id} className="ph-journey-chapter" data-story-chapter aria-labelledby={`${item.id}-heading`}>
              <h3 id={`${item.id}-heading`}>{item.title}</h3>
              <p>{item.description}</p>
              <div className="ph-journey-metric">
                <span>{item.metricLabel}</span>
                <strong>{item.metricIsMoney ? formatUsd(item.metric) : item.metric}</strong>
              </div>
              <dl className="ph-journey-facts">
                {item.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{formatUsd(fact.value)}</dd></div>)}
              </dl>
              <p className="ph-journey-note">{item.note}</p>
            </article>
          ))}
        </div>
      </div>
      <p role="status" className="sr-only">{announcement}</p>
    </div>
  );
}

function MobilePurchase({ active }: { active: number }) {
  return (
    <div className="ph-journey-phone">
      <div className="ph-mobile-screen">
        <div className="ph-mobile-camera" />
        <div className="ph-mobile-brand"><ShieldCheckIcon size={17} weight="duotone" /><span>Procurement Hub</span><span>USD</span></div>
        <div className="ph-mobile-viewport">
          <div className="ph-mobile-track">
            {financialChapters.map((chapter, index) => (
              <MobilePurchasePanel key={chapter.id} chapter={chapter} index={index} active={index === active} />
            ))}
          </div>
        </div>
        <div className="ph-mobile-home-indicator" />
      </div>
    </div>
  );
}

function MobilePurchasePanel({ chapter, index, active }: { chapter: FinancialChapter; index: number; active: boolean }) {
  const approved = chapter.committedMinor > 0;
  const review = chapter.id === "story-review";
  const trace = chapter.id === "story-trace";

  return (
    <div className="ph-mobile-content" data-story-screen={index} data-active={active} data-approved={approved}>
      <p className="ph-mobile-center">{illustrativePurchase.costCenter}</p>
      <h4>{illustrativePurchase.title}</h4>
      <p className="ph-mobile-status" data-approved={approved}>
        {approved && <CheckCircleIcon size={12} weight="fill" />}{chapter.status}
      </p>
      <div className="ph-mobile-requested"><span>Requested</span><strong>{formatUsd(illustrativePurchase.requestedMinor)}</strong></div>
      <dl className="ph-mobile-ledger">
        <div><dt>Committed</dt><dd>{formatUsd(chapter.committedMinor)}</dd></div>
        <div><dt>Available</dt><dd>{formatUsd(illustrativePurchase.allocatedMinor - chapter.committedMinor)}</dd></div>
        {review && <div><dt>If approved</dt><dd>{formatUsd(illustrativePurchase.allocatedMinor - illustrativePurchase.requestedMinor)}</dd></div>}
      </dl>
      <div className="ph-mobile-budget"><span /></div>
      {trace ? (
        <ol className="ph-mobile-trail">
          <li><FileTextIcon size={17} /><span><strong>Request submitted</strong><small>Requester</small></span></li>
          <li><ReceiptIcon size={17} /><span><strong>Approval recorded</strong><small>Authorized approver</small></span></li>
        </ol>
      ) : (
        <p className="ph-mobile-annotation"><ShieldCheckIcon size={14} />{review
          ? "Authority and budget are checked before a decision."
          : approved ? "Approval shown for illustration only."
            : "Awaiting review. No budget committed."}</p>
      )}
    </div>
  );
}
