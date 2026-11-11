"use client";

import { CustomSelect } from "./ui";

export interface ProgrammeOption {
  value: string;
  label: string;
}

interface ProgrammeFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ProgrammeOption[];
  align?: "left" | "right";
  className?: string;
}

/** Shared dropdown filter for selecting sub-programmes across timetable views. */
export default function ProgrammeFilterSelect({
  value,
  onChange,
  options,
  align = "left",
  className = "h-8.5 rounded-xl border border-line bg-card px-3 text-[12px] font-semibold text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition",
}: ProgrammeFilterSelectProps) {
  const resolvedValue = options.some((opt) => opt.value === value)
    ? value
    : "all";

  return (
    <CustomSelect
      aria-label="Filter by programme"
      align={align}
      value={resolvedValue}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </CustomSelect>
  );
}
