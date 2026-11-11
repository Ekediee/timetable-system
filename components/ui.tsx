"use client";

import React, { type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-card rounded-2xl border border-line ${className}`}>
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
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-1 px-4 pt-5 pb-4 sm:gap-4 sm:px-5">
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
    primary: "bg-brand text-white hover:bg-brand-ink active:scale-[0.98]",
    ghost: "text-subink hover:bg-panel",
    outline: "border border-line text-subink hover:bg-panel bg-card",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  sizeVariant?: "sm" | "md" | "lg";
  icon?: ReactNode;
  containerClassName?: string;
}

export function Select({
  label,
  error,
  helperText,
  sizeVariant = "md",
  icon,
  containerClassName = "",
  className = "",
  children,
  id,
  ...props
}: SelectProps) {
  const generatedId = React.useId();
  const selectId = id || (label ? `select-${generatedId}` : undefined);

  const sizeClasses = {
    sm: "h-8 text-[11.5px] px-2.5",
    md: "h-9 text-[12.5px] px-3",
    lg: "h-11 text-[13.5px] px-3.5",
  };

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-[12px] font-semibold text-subink"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="pointer-events-none absolute left-3 text-muted">
            {icon}
          </span>
        )}
        <select
          id={selectId}
          className={`w-full rounded-xl border border-line bg-card font-medium text-ink shadow-xs transition hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 ${
            icon ? "pl-9" : ""
          } ${sizeClasses[sizeVariant]} ${
            error ? "border-bad focus:border-bad focus:ring-bad/15" : ""
          } ${className}`}
          {...props}
        >
          {children}
        </select>
      </div>
      {error ? (
        <p className="text-[11px] font-medium text-bad">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}

export interface CustomSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Horizontal menu anchor relative to the trigger when width is auto-sized. */
  align?: "left" | "right";
}

export function CustomSelect({
  children,
  className = "",
  align = "left",
  value,
  onChange,
  disabled,
  id,
  name,
  ...props
}: CustomSelectProps) {
  const isFullWidth = /\bw-full\b/.test(className);
  const [open, setOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const options = React.Children.toArray(children).filter(
    (
      child,
    ): child is React.ReactElement<
      React.OptionHTMLAttributes<HTMLOptionElement>
    > => React.isValidElement(child) && child.type === "option",
  );
  const selectedValue = value == null ? "" : String(value);
  const selectedIndex = Math.max(
    0,
    options.findIndex(
      (option) => String(option.props.value ?? "") === selectedValue,
    ),
  );
  const selectedOption = options[selectedIndex];

  React.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  React.useEffect(() => {
    setHighlightedIndex(selectedIndex);
  }, [selectedIndex]);

  function chooseOption(
    option: React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>>,
    index: number,
  ) {
    if (option.props.disabled) return;
    const nextValue = String(option.props.value ?? "");
    onChange?.({
      target: { value: nextValue } as HTMLSelectElement,
      currentTarget: { value: nextValue } as HTMLSelectElement,
    } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    setHighlightedIndex(index);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) chooseOption(options[highlightedIndex], highlightedIndex);
      else setOpen(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setHighlightedIndex(
        (current) => (current + direction + options.length) % options.length,
      );
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex(event.key === "Home" ? 0 : options.length - 1);
    }
  }

  return (
    <div
      ref={rootRef}
      className={`custom-select relative ${isFullWidth ? "w-full" : "w-auto max-w-full shrink-0"}`}
    >
      <select
        {...props}
        id={id}
        name={name}
        value={selectedValue}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={onChange}
      >
        {children}
      </select>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id ? `${id}-options` : undefined}
        className={`custom-select-trigger flex w-full items-center justify-between gap-3 text-left ${className}`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className="min-w-0 truncate">
          {selectedOption?.props.children ?? selectedValue}
        </span>
        <ChevronDown
          size={14}
          className={`custom-select-chevron text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          id={id ? `${id}-options` : undefined}
          role="listbox"
          className={`custom-select-menu absolute top-[calc(100%+0.45rem)] z-[70] max-h-64 overflow-y-auto p-1.5 ${
            isFullWidth
              ? "left-0 right-0"
              : `${align === "right" ? "right-0" : "left-0"} min-w-full w-max max-w-[min(320px,85vw)]`
          }`}
        >
          {options.map((option, index) => {
            const optionValue = String(option.props.value ?? "");
            const isSelected = optionValue === selectedValue;
            const isHighlighted = index === highlightedIndex;
            return (
              <button
                key={`${optionValue}-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.props.disabled}
                className={`custom-select-option flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition ${
                  isSelected ? "font-semibold text-brand-ink" : "text-ink"
                } ${isHighlighted ? "bg-brand-soft" : "hover:bg-panel"} ${
                  option.props.disabled
                    ? "cursor-not-allowed opacity-45"
                    : "cursor-pointer"
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => chooseOption(option, index)}
              >
                <span className="truncate">{option.props.children}</span>
                {isSelected && <span className="ml-3 text-brand">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DataUnavailableState({
  title = "Data unavailable",
  description = "The data this screen needs could not be loaded from the backend.",
  tone = "warn",
  icon,
  action,
}: {
  title?: string;
  description?: string;
  tone?: "warn" | "bad" | "neutral" | "brand";
  icon?: ReactNode;
  action?: ReactNode;
}) {
  const toneBg =
    tone === "bad"
      ? "bg-bad-soft text-bad"
      : tone === "brand"
        ? "bg-brand-soft text-brand"
        : tone === "neutral"
          ? "bg-panel text-muted"
          : "bg-warn-soft text-warn";

  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-line bg-panel px-6 py-10">
      <div className="max-w-xl text-center">
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneBg}`}
        >
          {icon ?? <span className="text-2xl font-bold">!</span>}
        </div>
        <h3 className="text-[20px] font-bold tracking-[-0.02em] text-ink">
          {title}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          {description}
        </p>
        {action ? (
          <div className="mt-5 flex justify-center">{action}</div>
        ) : null}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line/80 ${className}`} />;
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-line bg-white p-4"
        >
          <Skeleton className="h-7 w-16 mb-2" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 5,
  className = "",
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border border-line bg-card ${className}`}
    >
      <div className="flex border-b border-line bg-panel/60 px-4 py-3 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-4 flex-1 ${c === 0 ? "max-w-[140px]" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimetableGridSkeleton({
  daysCount = 5,
  slotsCount = 6,
}: {
  daysCount?: number;
  slotsCount?: number;
}) {
  return (
    <div className="w-full space-y-4">
      <CardSkeleton count={4} />
      <div className="overflow-hidden rounded-2xl border border-line bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `80px repeat(${daysCount}, minmax(0, 1fr))`,
          }}
        >
          <Skeleton className="h-6 w-full" />
          {Array.from({ length: daysCount }).map((_, d) => (
            <Skeleton key={d} className="h-6 w-full" />
          ))}
          {Array.from({ length: slotsCount }).map((_, s) => (
            <div key={s} className="contents">
              <Skeleton className="h-14 w-full" />
              {Array.from({ length: daysCount }).map((_, d) => (
                <Skeleton key={d} className="h-14 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TimelineSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="w-full space-y-4">
      <div className="overflow-hidden rounded-2xl border border-line bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="divide-y divide-line">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3.5 py-4 first:pt-0 last:pb-0"
            >
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                  <Skeleton className="ml-auto h-3.5 w-24" />
                </div>
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* Left 2 cols */}
      <div className="xl:col-span-2 flex flex-col gap-5">
        {/* Pipeline Card */}
        <div className="overflow-hidden rounded-2xl border border-line bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <Skeleton className="mb-5 h-2.5 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-line bg-panel/40 p-3.5"
              >
                <Skeleton className="mb-2 h-3.5 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </div>

        {/* Venue utilization */}
        <div className="overflow-hidden rounded-2xl border border-line bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-8" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Slot demand heatmap */}
        <div className="overflow-hidden rounded-2xl border border-line bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-36" />
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-2">
              <Skeleton className="h-4 w-12" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, r) => (
              <div key={r} className="grid grid-cols-6 gap-2">
                <Skeleton className="h-9 w-12" />
                {Array.from({ length: 5 }).map((_, c) => (
                  <Skeleton key={c} className="h-9 w-full rounded-xl" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right col */}
      <div className="flex flex-col gap-5">
        {/* School readiness */}
        <div className="overflow-hidden rounded-2xl border border-line bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3.5 w-10" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department status */}
        <div className="overflow-hidden rounded-2xl border border-line bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <div className="divide-y divide-line">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConstraintsSkeleton() {
  return (
    <div className="bp-fade flex flex-col gap-6">
      {/* ── STEP 1: Institutional Policy Reference Skeleton ── */}
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-3.5 w-96 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-6 w-52 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-3.5 p-5 sm:grid-cols-2 lg:grid-cols-4 bg-panel/20">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-line bg-card p-3.5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>

      {/* ── STEP 2: Main Departmental Constraints Workspace Skeleton ── */}
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        {/* Tab Header Bar Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3.5 bg-panel/30">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-8.5 w-44 rounded-xl" />
        </div>

        {/* Constraint Rows Skeleton */}
        <div className="divide-y divide-line-soft px-3 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3.5 rounded-xl px-3 py-3"
            >
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
              <Skeleton className="h-6 w-28 rounded-full" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Actions Skeleton */}
        <div className="flex items-center justify-between border-t border-line bg-panel/30 p-3.5">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* ── STEP 3: Departmental Events Skeleton ── */}
      <div className="overflow-hidden rounded-2xl border border-line bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-5 w-56" />
          </div>
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-line p-3.5 space-y-2"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DeanReviewSkeleton() {
  return (
    <div className="bp-fade flex flex-col gap-5">
      {/* School Department Selector Bar Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-36 ml-2" />
          <div className="flex gap-1.5 flex-wrap">
            <Skeleton className="h-9 w-36 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-5 w-44 mr-2" />
      </div>

      {/* Main Review Grid Skeleton */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Left Column (2 cols) */}
        <div className="flex flex-col gap-5 xl:col-span-2">
          {/* Submission Overview Card Skeleton */}
          <div className="rounded-2xl border border-line bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-3.5 w-40" />
              </div>
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-line bg-panel/30 p-3.5 space-y-2"
                >
                  <Skeleton className="h-7 w-14" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              ))}
            </div>
          </div>

          {/* Review Requirements Skeleton */}
          <div className="rounded-2xl border border-line bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-3.5 w-64" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, col) => (
                <div
                  key={col}
                  className="rounded-xl border border-line bg-panel/30 p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-line">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, row) => (
                      <div
                        key={row}
                        className="rounded-lg border border-line bg-card/60 p-2.5 space-y-1.5"
                      >
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timetable Table Skeleton */}
          <div className="rounded-2xl border border-line bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-8 w-60 rounded-xl" />
            </div>
            <TableSkeleton rows={6} cols={5} />
          </div>
        </div>

        {/* Right Column (1 col) */}
        <div className="flex flex-col gap-5">
          {/* Action Card Skeleton */}
          <div className="rounded-2xl border border-line bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-panel/40 p-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>

          {/* Governance Timeline */}
          <TimelineSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}

export function HODReviewSkeleton() {
  return (
    <div className="bp-fade flex flex-col gap-5">
      {/* Department Header Banner Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-60" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-40 rounded-xl" />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Left Column (2 cols) */}
        <div className="flex flex-col gap-5 xl:col-span-2">
          {/* Submission Overview Card */}
          <div className="rounded-2xl border border-line bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-line bg-panel/30 p-3.5 space-y-2"
                >
                  <Skeleton className="h-7 w-14" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              ))}
            </div>
          </div>

          {/* Review Requirements Skeleton */}
          <div className="rounded-2xl border border-line bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-3.5 w-64" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, col) => (
                <div
                  key={col}
                  className="rounded-xl border border-line bg-panel/30 p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-line">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, row) => (
                      <div
                        key={row}
                        className="rounded-lg border border-line bg-card/60 p-2.5 space-y-1.5"
                      >
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timetable Table Skeleton */}
          <div className="rounded-2xl border border-line bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-8 w-60 rounded-xl" />
            </div>
            <TableSkeleton rows={6} cols={5} />
          </div>
        </div>

        {/* Right Column (1 col) */}
        <div className="flex flex-col gap-5">
          {/* Action Card Skeleton */}
          <div className="rounded-2xl border border-line bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-panel/40 p-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>

          {/* Governance Timeline */}
          <TimelineSkeleton count={4} />
        </div>
      </div>
    </div>
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

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  icon,
  isLoading = false,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "destructive" | "warning";
  icon?: ReactNode;
  isLoading?: boolean;
  children?: ReactNode;
}) {
  if (!isOpen) return null;

  const variantStyles = {
    primary: "bg-brand text-white hover:bg-brand-ink",
    destructive: "bg-bad text-white hover:bg-red-700",
    warning: "bg-warn text-white hover:bg-amber-700",
  };

  const iconBg = {
    primary: "bg-brand-soft text-brand",
    destructive: "bg-bad-soft text-bad",
    warning: "bg-warn-soft text-warn",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs bp-fade"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl transition"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg[variant]}`}
          >
            {icon ??
              (variant === "destructive" ? (
                <AlertTriangle size={20} />
              ) : (
                <CheckCircle2 size={20} />
              ))}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-bold text-ink tracking-[-0.01em]">
              {title}
            </h3>
            {description && (
              <div className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                {description}
              </div>
            )}
          </div>
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="cursor-pointer px-4 py-2 text-[13px] font-medium"
          >
            {cancelText}
          </Button>
          <Button
            className={`cursor-pointer px-4 py-2 text-[13px] font-semibold flex items-center gap-1.5 ${variantStyles[variant]}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            <span>{confirmText}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
