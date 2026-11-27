"use client";

import { useRouter } from "next/navigation";
import { variants, type VariantKey } from "./flag";

const shortNames: Record<VariantKey, string> = { "0": "Working UI", A: "Command", B: "Workspace", C: "Editorial" };

export function PrototypeSwitcher({ current }: { current: VariantKey }) {
  const router = useRouter();
  function select(next: VariantKey) {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next);
    router.replace(url.pathname + url.search + url.hash, { scroll: false });
  }
  return (
    <aside className="p-variant-dock" aria-label="Prototype comparison">
      <span className="p-variant-label">DESIGN LAB</span>
      <div className="p-variant-options" role="group" aria-label="Choose a design variant">
        {variants.map((variant) => (
          <button key={variant.key} type="button" aria-pressed={current === variant.key}
            aria-label={variant.key + " — " + variant.name} title={variant.name}
            onClick={() => select(variant.key)}>
            {variant.key}<span>{shortNames[variant.key]}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
