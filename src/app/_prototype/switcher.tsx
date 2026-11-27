"use client";

/* PROTOTYPE floating variant switcher. Arrow keys cycle variants unless a form control has focus. */
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { variants, type VariantKey } from "./flag";

export function PrototypeSwitcher({ current }: { current: VariantKey }) {
  const router = useRouter();
  const index = variants.findIndex((variant) => variant.key === current);

  function go(step: number) {
    const next = variants[(index + step + variants.length) % variants.length].key;
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next);
    router.replace(url.pathname + url.search + url.hash, { scroll: false });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-1.5 py-1.5 text-sm text-white shadow-[0_8px_30px_rgb(0_0_0/0.35)] ring-1 ring-white/20"
      role="toolbar"
      aria-label="Prototype variant switcher"
    >
      <button type="button" onClick={() => go(-1)} className="grid size-8 place-items-center rounded-full hover:bg-white/15" aria-label="Previous variant">←</button>
      <span className="px-2 font-medium whitespace-nowrap">
        <span className="mr-2 rounded bg-white/15 px-1.5 py-0.5 text-[0.6875rem] font-bold tracking-wider">PROTOTYPE</span>
        {current === "0" ? "Current UI" : <>{current}<span className="hidden sm:inline"> · {variants[index].name}</span></>}
      </span>
      <button type="button" onClick={() => go(1)} className="grid size-8 place-items-center rounded-full hover:bg-white/15" aria-label="Next variant">→</button>
    </div>
  );
}
