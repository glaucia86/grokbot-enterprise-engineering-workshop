"use client";

/* PROTOTYPE: j / k move through the inbox list (arrow keys belong to the variant switcher). */
import { useEffect } from "react";

export function InboxKeys() {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return;
      if (document.querySelector("dialog[open]") || target?.closest("input, textarea, select, button, [contenteditable='true']")) return;
      if (event.key !== "j" && event.key !== "k") return;
      const items = [...document.querySelectorAll<HTMLAnchorElement>("[data-inbox-item]")];
      if (!items.length) return;
      const current = items.findIndex((item) => item.getAttribute("aria-current") === "true");
      const next = items[Math.min(items.length - 1, Math.max(0, current + (event.key === "j" ? 1 : -1)))];
      next?.click();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
