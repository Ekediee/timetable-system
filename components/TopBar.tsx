"use client";

import { Search, Bell, Menu } from "lucide-react";
import { type Status } from "../lib/data";
import { StatusBadge } from "./ui";

export default function TopBar({
  title,
  subtitle,
  status,
  onMenuClick,
}: {
  title: string;
  subtitle?: string;
  status?: Status;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-canvas/80 px-4 py-3.5 backdrop-blur-md sm:gap-4 sm:px-6 lg:px-8 lg:py-4">
      <div className="flex min-w-0 items-center gap-3">
        {/* Hamburger — mobile/tablet only */}
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-subink transition hover:bg-panel lg:hidden"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold tracking-[-0.02em] text-ink sm:text-[20px]">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden truncate text-[12px] font-medium text-muted sm:block lg:text-[13.5px]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {status && <StatusBadge status={status} />}
        <div className="relative hidden lg:block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            placeholder="Search courses, venues…"
            className="w-56 rounded-xl border border-line bg-card py-2 pl-9 pr-3 text-[13px] text-ink placeholder:text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
          />
        </div>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-card text-subink transition hover:bg-panel">
          <Bell size={17} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-card bg-bad" />
        </button>
      </div>
    </header>
  );
}
