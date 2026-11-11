"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Download,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  Printer,
  Users,
  UserCheck,
  BookOpen,
  LayoutGrid,
  List,
  Search,
  RotateCcw,
  Building2,
  CalendarDays,
  Clock,
  Layers,
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  type DeptSubmission,
  type Session,
  slots as defaultSlots,
  days as defaultDays,
  buildProgrammeFilterOptions,
  formatProgrammeLabel,
  matchesProgrammeFilter,
  NO_PROGRAMME_FILTER,
} from "../lib/data";
import { extractSubgroups } from "../lib/engine";
import { exportToCsv, printTimetablePdf } from "../lib/export";
import { Pill, Button, CustomSelect } from "./ui";
import ProgrammeFilterSelect from "./ProgrammeFilterSelect";

const DAYS = defaultDays;
const SLOTS = defaultSlots;

const FILTER_SELECT_CLASS =
  "h-8.5 rounded-xl border border-line bg-card px-3 text-[12px] font-semibold text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition";

const conflictLabel: Record<string, string> = {
  venue: "Room Double-Booked",
  capacity: "Room Capacity Exceeded",
  lecturer: "Lecturer Clashed",
  availability: "Outside Available Hours",
};

function getConflictLabel(conflict: any): string {
  if (!conflict) return "";
  if (typeof conflict === "string" && conflictLabel[conflict]) {
    return conflictLabel[conflict];
  }
  return "Schedule Clash";
}

export function exportTimetable(
  sub: DeptSubmission,
  format: "csv" | "pdf" = "csv",
  programmeFilter: string = "all",
) {
  const sessions =
    programmeFilter === "all"
      ? sub.sessions
      : sub.sessions.filter((s) =>
          matchesProgrammeFilter(s.programme, programmeFilter),
        );
  const programmeLabel =
    programmeFilter === "all"
      ? undefined
      : programmeFilter === NO_PROGRAMME_FILTER
        ? "General / Unassigned"
        : programmeFilter;

  if (format === "csv") {
    exportToCsv(sessions, {
      department: sub.department,
      programme: programmeLabel,
      level: sub.level,
      semester: sub.semester,
      status: sub.status,
    });
  } else {
    printTimetablePdf(sessions, {
      department: sub.department,
      programme: programmeLabel,
      level: sub.level,
      semester: sub.semester,
      status: sub.status,
    });
  }
}

function getLevelBadge(level?: string) {
  if (!level) return null;
  const l = level.toUpperCase();
  if (l.includes("100"))
    return { label: "100L", bg: "bg-blue-50 text-blue-700 border-blue-200" };
  if (l.includes("200"))
    return {
      label: "200L",
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  if (l.includes("300"))
    return { label: "300L", bg: "bg-amber-50 text-amber-700 border-amber-200" };
  if (l.includes("400"))
    return {
      label: "400L",
      bg: "bg-purple-50 text-purple-700 border-purple-200",
    };
  if (l.includes("500"))
    return { label: "500L", bg: "bg-rose-50 text-rose-700 border-rose-200" };
  return { label: level, bg: "bg-panel text-subink border-line" };
}

export default function TimetableModal({
  sub,
  onClose,
}: {
  sub: DeptSubmission;
  onClose: () => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Perspective & Filtering state (matching Departmental T.O)
  const [perspective, setPerspective] = useState<
    "cohort" | "lecturer" | "course"
  >("cohort");
  const [mode, setMode] = useState<"grid" | "list">("grid");
  const [viewDensity, setViewDensity] = useState<"compact" | "normal">(
    "normal",
  );

  const [selectedProgramme, setSelectedProgramme] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedLecturer, setSelectedLecturer] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    setSelectedProgramme("all");
  }, [sub.id]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // E3: Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // E3: Trap focus inside modal while open
  useEffect(() => {
    if (!isMounted) return;
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
  }, [isMounted]);

  // Extract distinct metadata from department submission
  const rawSessions = sub.sessions || [];
  const conflicts = useMemo(
    () => rawSessions.filter((s) => s.conflict),
    [rawSessions],
  );

  const allLecturers = useMemo(() => {
    const set = new Set<string>();
    rawSessions.forEach((s) => {
      if (s.lecturer && s.lecturer.trim()) set.add(s.lecturer.trim());
    });
    return Array.from(set).sort();
  }, [rawSessions]);

  const allCourseCodes = useMemo(() => {
    const set = new Set<string>();
    rawSessions.forEach((s) => {
      if (s.code && s.code.trim()) set.add(s.code.trim());
    });
    return Array.from(set).sort();
  }, [rawSessions]);

  const allLevels = useMemo(() => {
    const set = new Set<string>();
    rawSessions.forEach((s) => {
      if (s.level && s.level.trim()) set.add(s.level.trim());
    });
    return Array.from(set).sort();
  }, [rawSessions]);

  const programmeOptions = useMemo(
    () => buildProgrammeFilterOptions(rawSessions),
    [rawSessions],
  );

  const allGroups = useMemo(() => {
    const set = new Set<string>();
    rawSessions.forEach((s) => {
      if (s.group && s.group.trim() && s.group !== "All") {
        extractSubgroups(s.group).forEach((g) => set.add(g));
      }
    });
    return Array.from(set).sort();
  }, [rawSessions]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return rawSessions.filter((s) => {
      if (!matchesProgrammeFilter(s.programme, selectedProgramme)) {
        return false;
      }

      if (selectedLevel !== "all") {
        const sLevel = (s.level || "").toLowerCase();
        const target = selectedLevel.toLowerCase();
        if (!sLevel.includes(target) && !target.includes(sLevel)) return false;
      }

      if (selectedGroup !== "all") {
        if (s.group && s.group !== "All" && s.group !== selectedGroup) {
          const subs = extractSubgroups(s.group);
          if (!subs.includes(selectedGroup)) return false;
        }
      }

      if (selectedLecturer !== "all" && s.lecturer !== selectedLecturer) {
        return false;
      }

      if (selectedCourse !== "all" && s.code !== selectedCourse) {
        return false;
      }

      if (selectedDay !== "all" && s.day !== selectedDay) {
        return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const code = (s.code || "").toLowerCase();
        const prog = (s.programme || "").toLowerCase();
        const lec = (s.lecturer || "").toLowerCase();
        const ven = (s.venue || "").toLowerCase();
        const grp = (s.group || "").toLowerCase();
        const lvl = (s.level || "").toLowerCase();
        if (
          !code.includes(q) &&
          !prog.includes(q) &&
          !lec.includes(q) &&
          !ven.includes(q) &&
          !grp.includes(q) &&
          !lvl.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    rawSessions,
    selectedProgramme,
    selectedLevel,
    selectedGroup,
    selectedLecturer,
    selectedCourse,
    selectedDay,
    search,
  ]);

  const isFilteringActive =
    selectedProgramme !== "all" ||
    selectedLevel !== "all" ||
    selectedGroup !== "all" ||
    selectedLecturer !== "all" ||
    selectedCourse !== "all" ||
    selectedDay !== "all" ||
    search.trim() !== "";

  function resetFilters() {
    setSelectedProgramme("all");
    setSelectedLevel("all");
    setSelectedGroup("all");
    setSelectedLecturer("all");
    setSelectedCourse("all");
    setSelectedDay("all");
    setSearch("");
  }

  function cell(day: string, slot: string) {
    return filteredSessions.filter((s) => s.day === day && s.slot === slot);
  }

  if (!isMounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-ink/40 p-3 sm:p-5 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="timetable-modal-title"
        tabIndex={-1}
        className="bp-fade flex max-h-[94vh] w-full max-w-6xl xl:max-w-7xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-panel/30 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="timetable-modal-title"
                className="text-[18px] font-bold tracking-[-0.02em] text-ink"
              >
                {sub.department}
              </h2>
              <span className="rounded-md bg-panel border border-line px-2 py-0.5 text-[11px] font-bold text-muted">
                {sub.level}
              </span>
              <span className="text-[12.5px] text-muted">
                {sub.school} · {sub.semester}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted">
              Official schedule view with departmental perspective filters &
              clash inspection
            </p>
          </div>

          <div className="flex items-center gap-2">
            {conflicts.length > 0 ? (
              <Pill tone="bad">
                <AlertTriangle size={11} /> {conflicts.length} conflict
                {conflicts.length > 1 ? "s" : ""}
              </Pill>
            ) : (
              <Pill tone="good">
                <CheckCircle2 size={11} /> 0 Clashes · Clean Schedule
              </Pill>
            )}

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-[12.5px] font-semibold text-subink transition hover:bg-panel cursor-pointer"
              >
                <Download size={13} /> Export{" "}
                <ChevronDown size={12} className="text-muted" />
              </button>

              {showExportMenu && (
                <div className="dropdown-surface absolute right-0 z-50 mt-1 w-44 py-1">
                  <button
                    onClick={() => {
                      exportTimetable(sub, "csv", selectedProgramme);
                      setShowExportMenu(false);
                    }}
                    className="dropdown-item flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-ink transition cursor-pointer"
                  >
                    <FileSpreadsheet size={14} className="text-good" />
                    <span>Download CSV (.csv)</span>
                  </button>
                  <button
                    onClick={() => {
                      exportTimetable(sub, "pdf", selectedProgramme);
                      setShowExportMenu(false);
                    }}
                    className="dropdown-item flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-ink transition cursor-pointer"
                  >
                    <Printer size={14} className="text-brand" />
                    <span>Print / Save PDF</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Toolbar: Perspectives, Filters & Search (Exact Departmental T.O experience) */}
        <div className="flex flex-col gap-3 border-b border-line bg-canvas/40 px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Primary View Perspective Switcher */}
            <div className="flex flex-row items-center gap-2">
              <div className="flex rounded-xl border border-line bg-card p-1 shadow-2xs">
                <button
                  onClick={() => setPerspective("cohort")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition cursor-pointer ${
                    perspective === "cohort"
                      ? "bg-brand text-white shadow-xs"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <Users size={13} /> Cohort / Level
                </button>
                <button
                  onClick={() => setPerspective("lecturer")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition cursor-pointer ${
                    perspective === "lecturer"
                      ? "bg-brand text-white shadow-xs"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <UserCheck size={13} /> By Lecturer
                </button>
                <button
                  onClick={() => setPerspective("course")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition cursor-pointer ${
                    perspective === "course"
                      ? "bg-brand text-white shadow-xs"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <BookOpen size={13} /> By Course
                </button>
              </div>

              {/* View mode toggle (Calendar Grid vs List) */}
              <div className="flex rounded-xl border border-line bg-card p-1 shadow-2xs">
                <button
                  onClick={() => setMode("grid")}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold transition cursor-pointer ${
                    mode === "grid"
                      ? "bg-brand-soft text-brand-ink"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <LayoutGrid size={13} /> Calendar
                </button>
                <button
                  onClick={() => setMode("list")}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold transition cursor-pointer ${
                    mode === "list"
                      ? "bg-brand-soft text-brand-ink"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <List size={13} /> List
                </button>
              </div>

              {mode === "grid" && (
                <button
                  onClick={() =>
                    setViewDensity(
                      viewDensity === "compact" ? "normal" : "compact",
                    )
                  }
                  className={`flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-medium transition cursor-pointer ${
                    viewDensity === "compact"
                      ? "bg-brand/10 text-brand border-brand/30"
                      : "bg-card text-muted hover:text-ink"
                  }`}
                  title="Toggle card sizing density"
                >
                  <Layers size={12} />
                  <span>
                    {viewDensity === "compact" ? "Compact" : "Comfortable"}
                  </span>
                </button>
              )}
            </div>

            {/* Live Search */}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-2.5 text-muted"
              />
              <input
                type="text"
                placeholder="Search course, lecturer, or venue…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8.5 w-64 rounded-xl border border-line bg-card pl-8 pr-3 text-[12px] text-ink placeholder:text-muted outline-none focus:border-brand"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 text-muted hover:text-ink cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Sub-Filters: Programme, Level, Group, Lecturer, Course, Day */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <ProgrammeFilterSelect
                value={selectedProgramme}
                onChange={setSelectedProgramme}
                options={programmeOptions}
                className={FILTER_SELECT_CLASS}
              />
              {perspective === "cohort" && (
                <>
                  <CustomSelect
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className={FILTER_SELECT_CLASS}
                  >
                    <option value="all">All Levels</option>
                    {allLevels.length > 0
                      ? allLevels.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))
                      : [
                          "100 Level",
                          "200 Level",
                          "300 Level",
                          "400 Level",
                          "500 Level",
                        ].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                  </CustomSelect>

                  <CustomSelect
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className={FILTER_SELECT_CLASS}
                  >
                    <option value="all">All Sub-groups</option>
                    {allGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </CustomSelect>
                </>
              )}

              {perspective === "lecturer" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11.5px] font-medium text-muted shrink-0">
                    Lecturer:
                  </span>
                  <CustomSelect
                    value={selectedLecturer}
                    onChange={(e) => setSelectedLecturer(e.target.value)}
                    className={`max-w-[240px] ${FILTER_SELECT_CLASS}`}
                  >
                    <option value="all">
                      All Department Lecturers ({allLecturers.length})
                    </option>
                    {allLecturers.map((lec) => (
                      <option key={lec} value={lec}>
                        {lec}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
              )}

              {perspective === "course" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11.5px] font-medium text-muted shrink-0">
                    Course:
                  </span>
                  <CustomSelect
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className={FILTER_SELECT_CLASS}
                  >
                    <option value="all">
                      All Courses ({allCourseCodes.length})
                    </option>
                    {allCourseCodes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
              )}

              <CustomSelect
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className={FILTER_SELECT_CLASS}
              >
                <option value="all">All Days</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </CustomSelect>

              {isFilteringActive && (
                <button
                  onClick={resetFilters}
                  className="flex h-8.5 items-center gap-1 rounded-xl border border-line bg-panel px-2.5 text-[11.5px] font-semibold text-muted hover:text-ink transition cursor-pointer shrink-0"
                >
                  <RotateCcw size={11} /> Reset filters
                </button>
              )}
            </div>

            <p className="text-[11.5px] text-muted shrink-0">
              Showing <b className="text-ink">{filteredSessions.length}</b> of{" "}
              {rawSessions.length} sessions
            </p>
          </div>
        </div>

        {/* Timetable Body (Calendar Grid or List) */}
        <div className="flex-1 overflow-auto p-5">
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays size={32} className="text-muted/60 mb-2" />
              <p className="text-[14px] font-bold text-ink">
                No matching sessions found
              </p>
              <p className="mt-1 text-[12px] text-muted max-w-sm">
                No timetable sessions match the selected filters. Try choosing a
                different perspective or resetting your search.
              </p>
              {isFilteringActive && (
                <button
                  onClick={resetFilters}
                  className="mt-3 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white cursor-pointer"
                >
                  Reset all filters
                </button>
              )}
            </div>
          ) : mode === "grid" ? (
            /* Calendar Grid Mode */
            <div className="min-w-[800px]">
              <div
                className="grid gap-2.5"
                style={{
                  gridTemplateColumns: "70px repeat(5, minmax(0, 1fr))",
                }}
              >
                {/* Day headers */}
                <div />
                {DAYS.map((d) => (
                  <div
                    key={d}
                    className={`rounded-xl border py-2 text-center text-[12px] font-bold uppercase tracking-wider ${
                      selectedDay === d
                        ? "border-brand bg-brand-soft text-brand-ink"
                        : "border-line bg-panel/60 text-muted"
                    }`}
                  >
                    {d}
                  </div>
                ))}

                {/* Rows (Time Slots) */}
                {SLOTS.map((slot) => (
                  <div key={slot} className="contents">
                    <div className="flex items-start justify-end pr-3 pt-2 text-[11.5px] font-semibold text-muted font-mono">
                      {slot}
                    </div>
                    {DAYS.map((day) => {
                      const items = cell(day, slot);
                      const isHighlightedDay =
                        selectedDay === "all" || selectedDay === day;
                      return (
                        <div
                          key={day + slot}
                          className={`min-h-[82px] rounded-xl border p-1.5 transition-colors ${
                            items.length > 0
                              ? "border-line bg-card shadow-2xs"
                              : isHighlightedDay
                                ? "border-line-soft bg-panel/30"
                                : "border-line-soft/50 bg-panel/10 opacity-50"
                          }`}
                        >
                          {items.map((it, k) => {
                            const badge = getLevelBadge(it.level);
                            const isCompact = viewDensity === "compact";
                            return (
                              <div
                                key={k}
                                className={`mb-1.5 rounded-lg border p-2 last:mb-0 transition shadow-2xs ${
                                  it.conflict
                                    ? "border-bad/40 bg-bad-soft/70"
                                    : "border-line bg-panel hover:border-brand/40"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`text-[12px] font-bold leading-tight ${
                                      it.conflict ? "text-bad" : "text-ink"
                                    }`}
                                  >
                                    {it.code}
                                  </span>
                                  {badge && (
                                    <span
                                      className={`rounded border px-1 py-0.2 text-[9.5px] font-bold ${badge.bg}`}
                                    >
                                      {badge.label}
                                    </span>
                                  )}
                                </div>

                                {it.group && it.group !== "All" && (
                                  <span className="mt-0.5 inline-block text-[10px] font-medium text-brand">
                                    {it.group}
                                  </span>
                                )}

                                {it.programme && (
                                  <p
                                    title={it.programme}
                                    className="mt-0.5 truncate text-[10px] font-semibold text-brand-ink/80"
                                  >
                                    {it.programme}
                                  </p>
                                )}

                                {!isCompact && (
                                  <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                                    <Building2
                                      size={11}
                                      className="shrink-0 text-muted"
                                    />
                                    <span className="truncate">{it.venue}</span>
                                  </div>
                                )}

                                <p className="mt-0.5 truncate text-[10.5px] text-subink font-medium">
                                  {it.lecturer}
                                </p>

                                {it.conflict && (
                                  <div className="mt-1 flex items-center gap-1 rounded bg-bad-soft px-1.5 py-0.5 text-[10px] font-bold text-bad">
                                    <AlertTriangle
                                      size={10}
                                      className="shrink-0"
                                    />
                                    <span className="truncate">
                                      {getConflictLabel(it.conflict)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Structured Schedule List Mode */
            <div className="overflow-hidden rounded-xl border border-line bg-card">
              <table className="w-full text-left border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-b border-line bg-panel/60 text-[11px] font-bold uppercase tracking-wider text-muted">
                    <th className="px-4 py-3">Day & Time</th>
                    <th className="px-4 py-3">Level & Group</th>
                    <th className="px-4 py-3">Programme</th>
                    <th className="px-4 py-3">Course Code</th>
                    <th className="px-4 py-3">Lecturer</th>
                    <th className="px-4 py-3">Venue</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredSessions.map((s, idx) => {
                    const badge = getLevelBadge(s.level);
                    return (
                      <tr key={idx} className="hover:bg-panel/40 transition">
                        <td className="px-4 py-2.5 font-medium text-ink">
                          <span className="font-bold text-subink">{s.day}</span>{" "}
                          ·{" "}
                          <span className="font-mono text-muted">{s.slot}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {badge && (
                              <span
                                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${badge.bg}`}
                              >
                                {badge.label}
                              </span>
                            )}
                            <span className="text-[12px] text-muted">
                              {s.group || "All"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[12px] font-medium text-subink">
                          {formatProgrammeLabel(s.programme)}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-brand">
                          {s.code}
                        </td>
                        <td className="px-4 py-2.5 text-subink">
                          {s.lecturer}
                        </td>
                        <td className="px-4 py-2.5 text-muted">
                          <div className="flex items-center gap-1">
                            <Building2 size={12} className="text-muted" />
                            <span>{s.venue}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {s.conflict ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-bad-soft px-2 py-0.5 text-[11px] font-bold text-bad">
                              <AlertTriangle size={11} />{" "}
                              {getConflictLabel(s.conflict)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-good">
                              <CheckCircle2 size={12} /> Scheduled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line bg-panel/30 px-6 py-3">
          <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-muted">
            <span>
              <b className="text-ink">{sub.courses}</b> courses
            </span>
            <span>
              <b className="text-ink">{sub.units}</b> units
            </span>
            <span>
              <b className="text-ink">{rawSessions.length}</b> total sessions
            </span>
            {conflicts.length > 0 ? (
              <span className="font-semibold text-bad">
                <b>{conflicts.length}</b> conflict
                {conflicts.length > 1 ? "s" : ""} detected
              </span>
            ) : (
              <span className="font-semibold text-good">
                All scheduled conflict-free
              </span>
            )}
          </div>

          <p className="text-[11.5px] text-muted">
            Dept T.O: <strong className="text-subink">{sub.deptTO}</strong> ·
            HOD: <strong className="text-subink">{sub.hod}</strong> · Dean:{" "}
            <strong className="text-subink">{sub.dean}</strong>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
