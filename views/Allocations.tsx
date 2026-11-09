"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Users,
  X,
  GraduationCap,
  BookOpen,
  Lock,
  Globe,
  Layers,
} from "lucide-react";
import {
  Card,
  Pill,
  DataUnavailableState,
  CardSkeleton,
  TableSkeleton,
  Button,
  CustomSelect,
} from "../components/ui";
import { type Allocation } from "../lib/data";
import { useApp } from "../lib/AppContext";
import { extractSubgroups } from "../lib/engine";

const typeTone: Record<string, "brand" | "violet" | "warn" | "neutral"> = {
  Core: "brand",
  Elective: "violet",
  GST: "warn",
};

const typeFilters = ["All", "Core", "Elective", "GST"] as const;
const levelFilters = [
  "All",
  "100 Level",
  "200 Level",
  "300 Level",
  "400 Level",
] as const;
const groupFilters = [
  "All",
  "Group A",
  "Group B",
  "Group C",
  "Group D",
  "Group E",
  "Group F",
  "Direct Entry",
  "Unified / All",
] as const;

function DetailModal({
  alloc,
  onClose,
}: {
  alloc: Allocation;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // E3: Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // E3: Focus trap inside modal
  useEffect(() => {
    const dialogEl = dialogRef.current;
    if (!dialogEl) return;

    const focusable = dialogEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      dialogEl.focus();
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const elements = dialogEl.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alloc-detail-title"
        tabIndex={-1}
        className="bp-fade w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Course detail
              </span>
              {alloc.isVirtual && (
                <span className="flex items-center gap-0.5 rounded bg-violet-soft px-1.5 py-0.2 text-[9.5px] font-semibold text-violet">
                  <Globe size={10} /> Virtual
                </span>
              )}
            </div>
            <h3
              id="alloc-detail-title"
              className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-ink"
            >
              {alloc.code}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close details"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink cursor-pointer"
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
              <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-ink truncate">
                <Users size={13} className="text-brand shrink-0" />
                <span className="truncate">{alloc.lecturer}</span>
              </p>
            </div>
            <div className="rounded-xl bg-panel px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Type
              </p>
              <p className="mt-1.5">
                <Pill tone={typeTone[alloc.type] ?? "neutral"}>
                  {alloc.type}
                </Pill>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-panel px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Level
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[13.5px] font-bold text-ink">
                <GraduationCap size={13} className="text-brand" />
                {alloc.level ? alloc.level.replace(" Level", "L") : "200L"}
              </p>
            </div>
            <div className="rounded-xl bg-panel px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Group
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[13px] font-bold text-ink">
                <Layers size={13} className="text-brand" />
                {alloc.group || "Unified"}
              </p>
            </div>
            <div className="rounded-xl bg-panel px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Units
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[14px] font-bold text-brand">
                <BookOpen size={13} />
                {alloc.units}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Allocations Component ──

export default function Allocations() {
  const context = useApp();
  const currentProgram =
    context.currentUser?.department || context.currentProgram || "";
  const currentAllocations = context.localAllocations || [];

  const [loading, setLoading] = useState(
    currentAllocations.length === 0 && Boolean(currentProgram),
  );

  const lastLoadedDeptRef = useRef<string | null>(null);

  const loadAllocations = useCallback(async () => {
    const dept =
      context.currentUser?.department || context.currentProgram || "";
    if (!dept) return;
    setLoading(true);
    try {
      await context.refreshAllocations(dept);
      lastLoadedDeptRef.current = dept;
    } catch (err) {
      console.warn("Failed loading allocations:", err);
    } finally {
      setLoading(false);
    }
  }, [
    context.currentUser?.department,
    context.currentProgram,
    context.refreshAllocations,
  ]);

  useEffect(() => {
    const dept = context.currentUser?.department || context.currentProgram;
    if (
      dept &&
      lastLoadedDeptRef.current !== dept &&
      currentAllocations.length === 0
    ) {
      loadAllocations();
    }
  }, [
    currentAllocations.length,
    context.currentUser?.department,
    context.currentProgram,
    loadAllocations,
  ]);

  const [q, setQ] = useState("");
  const [levelFilter, setLevelFilter] =
    useState<(typeof levelFilters)[number]>("All");
  const [typeFilter, setTypeFilter] =
    useState<(typeof typeFilters)[number]>("All");
  const [groupFilter, setGroupFilter] =
    useState<(typeof groupFilters)[number]>("All");
  const [selected, setSelected] = useState<Allocation | null>(null);

  const totalUnits = useMemo(() => {
    return currentAllocations.reduce((acc, a) => acc + a.units, 0);
  }, [currentAllocations]);

  const uniqueLecturers = useMemo(() => {
    return new Set(currentAllocations.map((a) => a.lecturer)).size;
  }, [currentAllocations]);

  const rows = useMemo(() => {
    return currentAllocations.filter((a) => {
      const matchQ =
        a.code.toLowerCase().includes(q.toLowerCase()) ||
        a.title.toLowerCase().includes(q.toLowerCase()) ||
        a.lecturer.toLowerCase().includes(q.toLowerCase());
      const matchType = typeFilter === "All" || a.type === typeFilter;
      const matchLevel =
        levelFilter === "All" || (a.level && a.level === levelFilter);
      const matchGroup =
        groupFilter === "All" ||
        (groupFilter === "Unified / All"
          ? !a.group || a.group === "All"
          : extractSubgroups(a.group).includes(groupFilter) ||
            a.group === groupFilter);

      return matchQ && matchType && matchLevel && matchGroup;
    });
  }, [currentAllocations, q, typeFilter, levelFilter, groupFilter]);

  if (
    (loading || context.isLoadingBackend) &&
    currentAllocations.length === 0
  ) {
    return (
      <div className="space-y-4">
        <CardSkeleton count={4} />
        <TableSkeleton rows={8} cols={6} />
      </div>
    );
  }

  if (
    !loading &&
    !context.isLoadingBackend &&
    currentAllocations.length === 0
  ) {
    return (
      <DataUnavailableState
        tone="neutral"
        title="No course allocations found"
        description={
          currentProgram
            ? `No teaching course allocations have been loaded for ${currentProgram}.`
            : "No departmental course allocations currently loaded from the backend."
        }
        action={
          currentProgram ? (
            <Button
              variant="outline"
              onClick={loadAllocations}
              className="cursor-pointer"
            >
              Fetch Teaching Allocations
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="bp-fade space-y-4">
      {/* Program Summary & Action Header Card */}
      <Card className="p-4 sm:p-5 border-brand/20 bg-gradient-to-r from-card via-card to-brand-soft/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white shadow-xs shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-ink">
                  {currentProgram} Course Allocations
                </h2>
                <Pill tone="brand">First Semester 2026/2027</Pill>
              </div>
              <p className="text-[12px] text-muted mt-0.5">
                Synchronized directly from the Academic Planning master database
                ·{" "}
                <span className="font-semibold text-subink">
                  {currentAllocations.length} courses
                </span>{" "}
                ·{" "}
                <span className="font-semibold text-subink">
                  {totalUnits} units
                </span>{" "}
                ·{" "}
                <span className="font-semibold text-subink">
                  {uniqueLecturers} lecturers assigned
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-xl border border-line bg-panel/90 px-3.5 py-2 text-[12px] font-semibold text-subink shadow-2xs">
              <Lock size={13} className="text-muted" /> Locked · Strictly
              Read-Only
            </span>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {/* Filters bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Level Filter */}
            <div className="flex flex-row items-center gap-2">
              <CustomSelect
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as any)}
                className="h-8.5 rounded-xl border border-line bg-card px-3 text-[12px] font-semibold text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
              >
                {levelFilters.map((l) => (
                  <option key={l} value={l}>
                    {l === "All" ? "All Levels" : l}
                  </option>
                ))}
              </CustomSelect>

              {/* Sub-group Filter */}
              <CustomSelect
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value as any)}
                className="h-8.5 rounded-xl border border-line bg-card px-3 text-[12px] font-semibold text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
              >
                {groupFilters.map((g) => (
                  <option key={g} value={g}>
                    {g === "All" ? "All Groups" : g}
                  </option>
                ))}
              </CustomSelect>
            </div>

            {/* Type buttons */}
            <div className="flex gap-1 border-l border-line pl-2">
              {typeFilters.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition cursor-pointer ${
                    typeFilter === t
                      ? "bg-brand-soft text-brand-ink"
                      : "text-muted hover:bg-panel"
                  }`}
                >
                  {t}
                  {t !== "All" && (
                    <span className="ml-1 text-[10.5px] opacity-60">
                      ({currentAllocations.filter((a) => a.type === t).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search box & course count */}
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-muted">
              {rows.length} of {currentAllocations.length} courses
            </span>
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search courses or lecturers…"
                className="w-60 rounded-xl border border-line bg-panel py-1.5 pl-8 pr-3 text-[12.5px] outline-none transition focus:border-brand focus:bg-card focus:ring-2 focus:ring-brand-soft"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div
          className="overflow-x-auto px-2 pb-3"
          style={{ scrollbarWidth: "thin" }}
        >
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th
                  scope="col"
                  className="w-[110px] px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted"
                >
                  Code
                </th>
                <th
                  scope="col"
                  className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted"
                >
                  Course Title
                </th>
                <th
                  scope="col"
                  className="w-[160px] px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted"
                >
                  Lecturer
                </th>
                <th
                  scope="col"
                  className="w-[80px] px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted"
                >
                  Group
                </th>
                <th
                  scope="col"
                  className="w-[70px] px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted"
                >
                  Level
                </th>
                <th
                  scope="col"
                  className="w-[76px] px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="w-[74px] px-3 pb-2 pt-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-muted"
                >
                  Units
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {rows.map((a, i) => (
                <tr
                  key={a.code + a.group + i}
                  onClick={() => setSelected(a)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${a.code}: ${a.title}, taught by ${a.lecturer}, ${a.units} units`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(a);
                    }
                  }}
                  className="group transition-colors hover:bg-panel cursor-pointer focus:outline-none focus:bg-panel focus:ring-1 focus:ring-inset focus:ring-brand"
                >
                  <td className="px-3 py-3 align-middle">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[13.5px] font-bold tracking-[-0.01em] text-ink truncate">
                        {a.code}
                      </span>
                      {a.isVirtual && (
                        <span
                          title="Virtual Course"
                          className="text-violet shrink-0"
                        >
                          <Globe size={11} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span
                      className="block truncate text-[13px] font-medium text-subink max-w-[280px]"
                      title={a.title}
                    >
                      {a.title}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span
                      className="block truncate text-[12.5px] text-muted max-w-[150px]"
                      title={a.lecturer}
                    >
                      {a.lecturer}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className="rounded bg-panel px-1.5 py-0.5 text-[10.5px] font-semibold text-subink">
                      {a.group || "Unified"}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-brand">
                      {a.level ? a.level.replace(" Level", "L") : "200L"}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <Pill tone={typeTone[a.type] ?? "neutral"}>{a.type}</Pill>
                  </td>
                  <td className="px-3 py-3 text-right align-middle">
                    <span className="rounded bg-panel px-2 py-0.5 text-[11px] font-bold text-ink">
                      {a.units}u
                    </span>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-12 text-center text-[13px] text-muted"
                  >
                    No course allocations match your search or active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[12.5px] text-muted">
          <span>
            Showing {rows.length} of {currentAllocations.length} allocations
          </span>
          <span className="text-[11.5px]">
            Click any course row to view full details
          </span>
        </div>
      </Card>

      {/* Course Detail Modal */}
      {selected && (
        <DetailModal alloc={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
