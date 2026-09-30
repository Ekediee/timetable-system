"use client";

import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card rounded-2xl border border-line ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHead({
  icon,
  title,
  sub,
  action,
}: {
  icon?: ReactNode;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-5 pb-4 sm:gap-4 sm:px-5">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-brand">{icon}</span>}
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {title}
          </h3>
          {sub && <p className="text-[13px] text-muted mt-0.5">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const toneMap: Record<string, string> = {
  brand: "bg-brand-soft text-brand-ink",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  violet: "bg-violet-soft text-violet",
  neutral: "bg-panel text-subink",
};

export function Pill({
  children,
  tone = "brand",
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof toneMap | string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.03em] ${
        toneMap[tone] ?? toneMap.brand
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold px-4 py-2.5 transition-all duration-150 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer";
  const variants = {
    primary:
      "bg-brand text-white hover:bg-brand-ink active:scale-[0.98]",
    ghost: "text-subink hover:bg-panel",
    outline: "border border-line text-subink hover:bg-panel bg-card",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

const statusTone: Record<string, string> = {
  "Draft generated": "warn",
  "Constraints in progress": "neutral",
  "Submitted to HOD": "brand",
  "Rejected by HOD": "bad",
  "Submitted to Dean": "brand",
  "Submitted to Acad Pl. T.O": "brand",
  Published: "good",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Pill tone={statusTone[status] ?? "neutral"}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </Pill>
  );
}
