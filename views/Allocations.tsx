"use client";

import { useState } from "react";
import { Search, Users, X, GraduationCap, BookOpen, Hash } from "lucide-react";
import { Card, Pill } from "../components/ui";
import { allocations, type Allocation } from "../lib/data";

const typeTone: Record<string, string> = {
  Core: "brand",
  Elective: "violet",
  GST: "warn",
};

const typeFilters = ["All", "Core", "Elective", "GST"] as const;

function DetailModal({
  alloc,
  onClose,
}: {
  alloc: Allocation;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bp-fade w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Course detail
            </p>
            <h3 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-ink">
              {alloc.code}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3.5">
          <div className="rounded-xl bg-panel px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
              Title
            </p>
            <p className="mt-1 text-[14px] font-semibold text-ink leading-snug">
              {alloc.title}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-panel px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Lecturer
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
                <Users size={13} className="text-brand" />
                {alloc.lecturer}
              </p>
            </div>
            <div className="rounded-xl bg-panel px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Type
              </p>
              <p className="mt-1.5">
                <Pill tone={typeTone[alloc.type]}>{alloc.type}</Pill>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-panel px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Level
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[15px] font-bold text-ink">
                <GraduationCap size={14} className="text-brand" />
                200L
              </p>
            </div>
            <div className="rounded-xl bg-panel px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Units
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[15px] font-bold text-ink">
                <BookOpen size={13} className="text-brand" />
                {alloc.units}
              </p>
            </div>
            <div className="rounded-xl bg-panel px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Size
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[15px] font-bold text-ink">
                <Hash size={13} className="text-brand" />
                {alloc.size}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Allocations() {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<(typeof typeFilters)[number]>("All");
  const [selected, setSelected] = useState<Allocation | null>(null);

  const rows = allocations.filter((a) => {
    const matchQ =
      a.code.toLowerCase().includes(q.toLowerCase()) ||
      a.title.toLowerCase().includes(q.toLowerCase()) ||
      a.lecturer.toLowerCase().includes(q.toLowerCase());
    const matchType = typeFilter === "All" || a.type === typeFilter;
    return matchQ && matchType;
  });

  return (
    <div className="bp-fade">
      <Card className="overflow-hidden">
        {/* Filter row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex gap-1">
            {typeFilters.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  typeFilter === t
                    ? "bg-brand-soft text-brand-ink"
                    : "text-muted hover:bg-panel"
                }`}
              >
                {t}
                {t !== "All" && (
                  <span className="ml-1.5 text-[11px] opacity-60">
                    {allocations.filter((a) => a.type === t).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[13px] text-muted">
              <Users size={15} className="text-brand" />
              {allocations.length} courses
            </div>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search courses or lecturers"
                className="w-56 rounded-xl border border-line bg-panel py-2 pl-9 pr-3 text-[13px] outline-none transition focus:border-brand focus:bg-card focus:ring-2 focus:ring-brand-soft"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="px-2 pb-3">
          {/* Header */}
          <div className="grid grid-cols-[110px_1fr_150px_56px_76px_80px] items-center gap-4 px-3 pb-2 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Code</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Course Title</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Lecturer</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Level</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Type</span>
            <span className="text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Units</span>
          </div>
          {rows.map((a, i) => (
            <button
              key={a.code + i}
              onClick={() => setSelected(a)}
              className="group grid w-full grid-cols-[110px_1fr_150px_56px_76px_80px] items-center gap-4 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-panel"
            >
              <span className="text-[14px] font-bold tracking-[-0.01em] text-ink">
                {a.code}
              </span>
              <span className="truncate text-[13.5px] text-subink">
                {a.title}
              </span>
              <span className="truncate text-[13px] text-muted">
                {a.lecturer}
              </span>
              <span className="text-[13px] font-medium text-muted">200L</span>
              <Pill tone={typeTone[a.type]}>{a.type}</Pill>
              <div className="flex justify-end">
                <Pill tone="neutral">{a.units} Units</Pill>
              </div>
            </button>
          ))}
          {rows.length === 0 && (
            <p className="px-3 py-10 text-center text-[13.5px] text-muted">
              No allocations match your filter.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-3.5 text-[13px] text-muted">
          <span>
            Showing {rows.length} of {allocations.length} courses
          </span>
          <span className="text-[12px]">Click a row to view details</span>
        </div>
      </Card>

      {selected && (
        <DetailModal alloc={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
