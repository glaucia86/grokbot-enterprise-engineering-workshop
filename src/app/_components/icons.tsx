type IconProps = { size?: number; className?: string };

function baseProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className,
  };
}

export function ShieldCheckIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M12 3l7 3v6c0 5-3.2 8.2-7 9-3.8-.8-7-4-7-9V6l7-3z" />
      <path d="M9.5 12.2l1.8 1.8 3.6-3.8" />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function WalletIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M16 12h5" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function BuildingIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M16 10h4a1 1 0 0 1 1 1v10" />
      <path d="M2 21h20" />
      <path d="M8 7h2M12 7h2M8 11h2M12 11h2M8 15h2M12 15h2" />
    </svg>
  );
}

export function ActivityIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M3 12h4l3-7 4 14 3-7h4" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

export function FileCheckIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  );
}

export function ClockIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function LockIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

export function LayersIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
      <path d="M3 17.5l9 5 9-5" />
    </svg>
  );
}

export function DatabaseIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </svg>
  );
}

export function UsersIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18.5 14.2A6.5 6.5 0 0 1 21.5 20" />
    </svg>
  );
}

export function GitPullRequestIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 8.5v7" />
      <path d="M18 15.5V9a3 3 0 0 0-3-3h-4" />
      <path d="M13 3.5L10.5 6 13 8.5" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
    </svg>
  );
}

export function XCircleIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6" />
    </svg>
  );
}

export function SparklesIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M12 3l1.8 4.9L18.7 9.7l-4.9 1.8L12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  );
}

export function ScaleIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M12 3v18" />
      <path d="M7 21h10" />
      <path d="M5 7h14" />
      <path d="M5 7l-3 7a3.5 3.5 0 0 0 6 0L5 7z" />
      <path d="M19 7l-3 7a3.5 3.5 0 0 0 6 0l-3-7z" />
    </svg>
  );
}

export function LogInIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

export function TerminalIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9l3 3-3 3" />
      <path d="M13 15h4" />
    </svg>
  );
}
