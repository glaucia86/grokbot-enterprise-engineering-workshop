"use client";

import { useEffect, useRef, type ReactNode } from "react";

const RULE = 32;

/**
 * Landing hero stage. Pointer parallax writes --px/--py (-1..1) on the stage; each layer
 * translates by its own --depth. Over the ledger paper ([data-ledger]) it also tracks a
 * cursor: --cx for the hairline and --row for the ruled row, snapped to the 32px rules,
 * plus a "Line NN" readout. Parallax runs only for fine pointers without reduced motion.
 */
export function ParallaxStage({ className, children }: { className?: string; children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const fine = window.matchMedia("(pointer: fine)");
    if (!fine.matches) return;
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const ledger = element.querySelector<HTMLElement>("[data-ledger]");
    const readout = element.querySelector<HTMLElement>("[data-ledger-line]");

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (motion.matches) {
          const rect = element.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
          element.style.setProperty("--px", Math.max(-1, Math.min(1, x)).toFixed(3));
          element.style.setProperty("--py", Math.max(-1, Math.min(1, y)).toFixed(3));
        }
        if (!ledger) return;
        const paper = ledger.getBoundingClientRect();
        const inside = event.clientX >= paper.left && event.clientX <= paper.right && event.clientY >= paper.top && event.clientY <= paper.bottom;
        element.dataset.active = inside ? "true" : "false";
        if (!inside) return;
        const line = Math.max(1, Math.floor((event.clientY - paper.top) / RULE));
        ledger.style.setProperty("--cx", `${Math.round(event.clientX - paper.left)}px`);
        ledger.style.setProperty("--row", `${line * RULE}px`);
        if (readout) readout.textContent = `Line ${String(line).padStart(2, "0")}`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      element.dataset.active = "false";
      element.style.setProperty("--px", "0");
      element.style.setProperty("--py", "0");
    };

    const host = element.closest("section") ?? element;
    host.addEventListener("pointermove", onMove as EventListener, { passive: true });
    host.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener("pointermove", onMove as EventListener);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={stage} className={className} data-active="false">
      {children}
    </div>
  );
}
