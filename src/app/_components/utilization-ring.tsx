export function UtilizationRing({ percent, tone, size = 56, label }: {
  percent: number;
  tone: "healthy" | "warning" | "danger";
  size?: number;
  label?: string;
}) {
  const filled = Math.min(100, Math.max(0, percent));
  return (
    <span className="ring" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <circle className="ring-track" cx="60" cy="60" r="50" pathLength={100} />
        <circle
          className={"ring-value ring-value-" + tone}
          cx="60"
          cy="60"
          r="50"
          pathLength={100}
          style={{ strokeDashoffset: 100 - filled }}
        />
      </svg>
      {label && <span className="ring-label mono">{label}</span>}
    </span>
  );
}

export function utilizationTone(percent: number, overspent: boolean) {
  if (overspent) return "danger" as const;
  return percent >= 80 ? ("warning" as const) : ("healthy" as const);
}
