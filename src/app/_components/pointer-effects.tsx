"use client";

import { useEffect } from "react";

const MAGNET_RADIUS = 28;
const MAGNET_PULL = 0.22;
const MAGNET_MAX = 6;
const TILT_MAX_DEG = 5;

function setVars(element: HTMLElement, vars: Record<string, string>) {
  for (const [name, value] of Object.entries(vars)) element.style.setProperty(name, value);
}

/**
 * One delegated, rAF-throttled pointer listener for the whole app. Effects only write
 * CSS variables, so nothing re-renders while the pointer moves:
 *  - .spotlight      → --mx/--my (a soft accent glow, colour only)
 *  - [data-tilt]     → --rx/--ry (perspective tilt)
 *  - [data-magnetic] → --tx/--ty (pull toward the pointer, zero at the element centre)
 * Tilt and magnetic run only for fine pointers without reduced motion.
 */
export function PointerEffects() {
  useEffect(() => {
    const motion = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    let lastEvent: PointerEvent | null = null;
    let spotlight: HTMLElement | null = null;
    let tilt: HTMLElement | null = null;
    let magnets = new Set<HTMLElement>();

    const resetSpotlight = () => {
      if (spotlight) setVars(spotlight, { "--mx": "-999px", "--my": "-999px" });
      spotlight = null;
    };
    const resetTilt = () => {
      if (tilt) setVars(tilt, { "--rx": "0deg", "--ry": "0deg" });
      tilt = null;
    };
    const resetMagnets = (keep = new Set<HTMLElement>()) => {
      for (const element of magnets) if (!keep.has(element)) setVars(element, { "--tx": "0px", "--ty": "0px" });
      magnets = keep;
    };

    const apply = () => {
      frame = 0;
      const event = lastEvent;
      if (!event) return;
      const target = event.target instanceof Element ? event.target : null;

      const nextSpotlight = target?.closest<HTMLElement>(".spotlight") ?? null;
      if (nextSpotlight !== spotlight) resetSpotlight();
      if (nextSpotlight) {
        const rect = nextSpotlight.getBoundingClientRect();
        setVars(nextSpotlight, { "--mx": `${event.clientX - rect.left}px`, "--my": `${event.clientY - rect.top}px` });
        spotlight = nextSpotlight;
      }

      if (!motion.matches) return;

      const nextTilt = target?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (nextTilt !== tilt) resetTilt();
      if (nextTilt) {
        const rect = nextTilt.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        setVars(nextTilt, { "--rx": `${(-y * TILT_MAX_DEG * 2).toFixed(2)}deg`, "--ry": `${(x * TILT_MAX_DEG * 2).toFixed(2)}deg` });
        tilt = nextTilt;
      }

      const active = new Set<HTMLElement>();
      for (const element of document.querySelectorAll<HTMLElement>("[data-magnetic]")) {
        const rect = element.getBoundingClientRect();
        const inside =
          event.clientX > rect.left - MAGNET_RADIUS && event.clientX < rect.right + MAGNET_RADIUS &&
          event.clientY > rect.top - MAGNET_RADIUS && event.clientY < rect.bottom + MAGNET_RADIUS;
        if (!inside || element.matches(":disabled")) continue;
        const clamp = (value: number) => Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, value));
        const dx = clamp((event.clientX - (rect.left + rect.width / 2)) * MAGNET_PULL);
        const dy = clamp((event.clientY - (rect.top + rect.height / 2)) * MAGNET_PULL);
        setVars(element, { "--tx": `${dx.toFixed(1)}px`, "--ty": `${dy.toFixed(1)}px` });
        active.add(element);
      }
      resetMagnets(active);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      lastEvent = event;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      resetSpotlight();
      resetTilt();
      resetMagnets();
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return null;
}
