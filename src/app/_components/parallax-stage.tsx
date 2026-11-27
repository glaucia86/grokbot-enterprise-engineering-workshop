"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Pointer parallax for the landing hero. Writes two CSS variables (--px, --py in -1..1)
 * on the stage; layers translate by their own --depth. Runs only for fine pointers and
 * when the user has not asked for reduced motion. Scroll parallax is pure CSS (.scroll-drift).
 */
export function ParallaxStage({ className, children }: { className?: string; children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const allowed = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!allowed.matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        element.style.setProperty("--px", Math.max(-1, Math.min(1, x)).toFixed(3));
        element.style.setProperty("--py", Math.max(-1, Math.min(1, y)).toFixed(3));
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
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
    <div ref={stage} className={className}>
      {children}
    </div>
  );
}
