"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  List,
  ArrowRight,
  ShieldCheck,
  X,
  Send,
  Loader2,
  Building2,
  BookOpen,
  Users,
  SlidersHorizontal,
  Clock,
  Eye,
  Calendar,
  Check,
  Globe,
  Pencil,
  UserCheck,
  Search,
  RefreshCw,
  Lock,
  GraduationCap,
  ChevronRight,
  AlertCircle,
  User,
  Layers,
} from "lucide-react";
import { Card, CardHead, Pill, Button } from "../components/ui";
import {
  days,
  slots,
  allocations as defaultAllocations,
  venues as defaultVenues,
  type Session,
  type Status,
  type TimelineStep,
  type Constraint,
} from "../lib/data";
import {
  validateLiveSessions,
  isLecturerAvailableForSlot,
  extractSubgroups,
  type LiveConflict,
} from "../lib/engine";
import type { View } from "../components/Sidebar";
import { useRouter } from "next/navigation";
import { useApp } from "../lib/AppContext";

const conflictLabel: Record<string, string> = {
  venue: "Venue double-booking",
  capacity: "Capacity overage",
  lecturer: "Lecturer clash",
  availability: "Constraint violation",
};

function getEndSlot(slot: string, duration: number = 1): string {
  const idx = slots.indexOf(slot as any);
  if (idx !== -1 && idx + duration < slots.length) {
    return slots[idx + duration];
  }
  const [h, m] = slot.split(":").map(Number);
  const endH = h + duration;
  return `${String(endH).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}

// Dynamically check if a lecturer has day-level leave or restrictions
function getLecturerDayRestriction(
  lecturer: string,
  day: (typeof days)[number],
  constraintsList: Constraint[],
): { isOff: boolean; label?: string } {
  if (lecturer === "all") return { isOff: false };
  const lecturerConstraints = constraintsList.filter(
    (c) => c.lecturer === lecturer,
  );
  for (const c of lecturerConstraints) {
    if (c.kind === "Study Leave") {
      return { isOff: true, label: "On Study Leave" };
    }
    const lowerRange = c.range.toLowerCase();
    if (c.kind === "Day Off") {
      if (lowerRange.includes("wed") && day === "Wed") {
        return { isOff: true, label: "Day Off" };
      }
      if (lowerRange.includes("fri am") && day === "Fri") {
        return { isOff: true, label: "Clinic AM Off" };
      }
      if (lowerRange.includes(day.toLowerCase())) {
        return { isOff: true, label: "Day Off" };
      }
    }
    if (c.kind === "Adjunct") {
      if (
        (lowerRange.includes("tue, fri") || lowerRange.includes("tue & fri")) &&
        day !== "Tue" &&
        day !== "Fri"
      ) {
        return { isOff: true, label: "Adjunct Off" };
      }
      if (lowerRange.includes("wed") && day !== "Wed") {
        return { isOff: true, label: "Adjunct Off" };
      }
    }
  }
  return { isOff: false };
}

// Dynamically check if a lecturer is restricted in a specific slot
function getLecturerSlotRestriction(
  lecturer: string,
  day: (typeof days)[number],
  slot: (typeof slots)[number],
  constraintsList: Constraint[],
): { isRestricted: boolean; reason?: string } {
  if (lecturer === "all") return { isRestricted: false };
  const slotIdx = slots.indexOf(slot);
  const check = isLecturerAvailableForSlot(
    lecturer,
    day,
    slotIdx,
    1,
    constraintsList,
  );
  if (!check.available) {
    return { isRestricted: true, reason: check.reason };
  }
  return { isRestricted: false };
}

export default function Generate(props?: {
  localSessions?: Session[];
  setLocalSessions?: (s: Session[]) => void;
  constraintsComplete?: boolean;
  status?: Status;
  setStatus?: (s: Status) => void;
  setLocalTimeline?: (t: TimelineStep[]) => void;
  setView?: (v: View) => void;
}) {
  const router = useRouter();
  const context = useApp();

  const localSessions = props?.localSessions ?? context.localSessions;
  const setLocalSessions = props?.setLocalSessions ?? context.setLocalSessions;
  const constraintsComplete =
    props?.constraintsComplete ?? context.constraintsComplete;
  const status = props?.status ?? context.status;
  const setStatus = props?.setStatus ?? context.setStatus;
  const setLocalTimeline = props?.setLocalTimeline ?? context.setLocalTimeline;
  const localConstraints = context.localConstraints;
  const allocations = context.localAllocations ?? defaultAllocations;
  const venues = context.localVenues ?? defaultVenues;

  // Screen flow: "snapshot" (Generate Timetable screen) -> "generated" (Generated Timetable screen)
  const [screenMode, setScreenMode] = useState<"snapshot" | "generated">(
    status === "Submitted to HOD" ? "generated" : "snapshot",
  );

  // View Perspective: "cohort" (by level/group) | "lecturer" | "course"
  const [perspective, setPerspective] = useState<
    "cohort" | "lecturer" | "course"
  >("cohort");

  // Filter States
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedLecturer, setSelectedLecturer] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [courseSearch, setCourseSearch] = useState<string>("");

  // Mode: Cards vs Calendar Grid vs Table List
  const [mode, setMode] = useState<"cards" | "grid" | "list">("grid");

  // Line Edit Modal State
  const [editingSessionIndex, setEditingSessionIndex] = useState<number | null>(
    null,
  );
  const [editDay, setEditDay] = useState<(typeof days)[number]>("Mon");
  const [editSlot, setEditSlot] = useState<(typeof slots)[number]>("08:00");
  const [editVenue, setEditVenue] = useState<string>("Lab 3 — Software");

  // Interactive feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCheckingConstraints, setIsCheckingConstraints] = useState(false);
  const [submitModal, setSubmitModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [highlightCell, setHighlightCell] = useState<{
    day: string;
    slot: string;
  } | null>(null);
  const [cellDetail, setCellDetail] = useState<Session | null>(null);
  const [viewDensity, setViewDensity] = useState<"compact" | "normal">("compact");

  // Synchronized scrollbar refs for user-friendly top scroll
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  function handleTopScroll() {
    if (topScrollRef.current && tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  }

  function handleMainScroll() {
    if (topScrollRef.current && tableContainerRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LIVE CONSTRAINT SATISFACTION VALIDATION
  // ───────────────────────────────────────────────────────────────────────────
  const { validatedSessions, conflicts } = useMemo(() => {
    return validateLiveSessions(
      localSessions,
      allocations,
      venues,
      localConstraints,
    );
  }, [localSessions, localConstraints]);

  const cleared = conflicts.length === 0;
  const isSubmitted = status === "Submitted to HOD";
  const totalCapacity = venues.reduce((sum, v) => sum + v.capacity, 0);
  const totalUnits = allocations.reduce((sum, a) => sum + a.units, 0);

  // Distinct Lecturers list
  const allLecturers = useMemo(() => {
    const set = new Set<string>();
    allocations.forEach((a) => set.add(a.lecturer));
    validatedSessions.forEach((s) => set.add(s.lecturer));
    return Array.from(set).sort();
  }, [allocations, validatedSessions]);

  // Distinct Courses list
  const allCourseCodes = useMemo(() => {
    const set = new Set<string>();
    allocations.forEach((a) => set.add(a.code));
    return Array.from(set).sort();
  }, [allocations]);

  // Filtered Sessions for Cohort view
  const cohortFilteredSessions = useMemo(() => {
    return validatedSessions.filter((s) => {
      if (selectedLevel !== "all" && s.level && s.level !== selectedLevel)
        return false;
      if (selectedGroup !== "all") {
        if (!s.group || s.group === "All") return true;
        const subs = extractSubgroups(s.group);
        if (!subs.includes(selectedGroup) && s.group !== selectedGroup)
          return false;
      }
      return true;
    });
  }, [validatedSessions, selectedLevel, selectedGroup]);

  // Filtered Sessions for Lecturer view
  const lecturerFilteredSessions = useMemo(() => {
    return validatedSessions.filter((s) => {
      if (selectedLecturer !== "all" && s.lecturer !== selectedLecturer)
        return false;
      return true;
    });
  }, [validatedSessions, selectedLecturer]);

  useEffect(() => {
    if (tableContainerRef.current) {
      setScrollWidth(tableContainerRef.current.scrollWidth);
    }
  }, [mode, viewDensity, cohortFilteredSessions, lecturerFilteredSessions]);

  // Filtered Course allocations for Course view
  const courseFilteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      if (selectedCourse !== "all" && a.code !== selectedCourse) return false;
      if (courseSearch.trim()) {
        const q = courseSearch.toLowerCase();
        return (
          a.code.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          a.lecturer.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allocations, selectedCourse, courseSearch]);

  // Grid Cell lookup based on active perspective
  const cell = (d: string, s: string) => {
    const slotIdx = slots.indexOf(s as any);
    const activeList =
      perspective === "lecturer"
        ? lecturerFilteredSessions
        : cohortFilteredSessions;

    return activeList.filter((x) => {
      if (x.day !== d) return false;
      const startIdx = slots.indexOf(x.slot as any);
      const dur = x.duration ?? 1;
      return slotIdx >= startIdx && slotIdx < startIdx + dur;
    });
  };

  // Real-time Hypothetical Conflict Checker for Line Edit Modal
  const editHypotheticalCheck = useMemo(() => {
    if (editingSessionIndex === null)
      return { hasConflict: false, message: "" };
    const targetSession = localSessions[editingSessionIndex];
    if (!targetSession) return { hasConflict: false, message: "" };

    const hypothetical: Session = {
      ...targetSession,
      day: editDay,
      slot: editSlot,
      venue: editVenue,
    };

    const copy = [...localSessions];
    copy[editingSessionIndex] = hypothetical;

    const result = validateLiveSessions(
      copy,
      allocations,
      venues,
      localConstraints,
    );
    const found = result.conflicts.find(
      (c) => c.sessionIndex === editingSessionIndex,
    );

    if (found) {
      return {
        hasConflict: true,
        type: found.type,
        title: found.title,
        message: found.description,
      };
    }

    return {
      hasConflict: false,
      message:
        "No conflicts detected. Slot, lecturer availability, and venue capacity are valid.",
    };
  }, [
    editingSessionIndex,
    editDay,
    editSlot,
    editVenue,
    localSessions,
    localConstraints,
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ───────────────────────────────────────────────────────────────────────────
  function handleProceedToGenerate() {
    setIsRegenerating(true);
    setHighlightCell(null);

    setTimeout(() => {
      import("../lib/engine").then(({ generateTimetable }) => {
        const result = generateTimetable(
          allocations,
          venues,
          context.localConstraints
        );
        setLocalSessions(result.sessions);
        setIsRegenerating(false);
        setScreenMode("generated");
      });
    }, 1200);
  }

  function handleRegenerate() {
    setIsRegenerating(true);
    setHighlightCell(null);

    setTimeout(() => {
      import("../lib/engine").then(({ generateTimetable }) => {
        const result = generateTimetable(
          allocations,
          venues,
          context.localConstraints
        );
        setLocalSessions(result.sessions);
        setIsRegenerating(false);
      });
    }, 1000);
  }

  function handleManualConstraintCheck() {
    setIsCheckingConstraints(true);
    setTimeout(() => {
      setIsCheckingConstraints(false);
      setToastMessage(
        cleared
          ? "All institutional constraints checked and verified!"
          : `${conflicts.length} constraint violation(s) currently active.`,
      );
      setTimeout(() => setToastMessage(null), 3000);
    }, 450);
  }

  function handleOpenEdit(index: number) {
    const s = localSessions[index];
    if (!s) return;
    setEditingSessionIndex(index);
    setEditDay(s.day);
    setEditSlot(s.slot);
    setEditVenue(s.venue);
    setCellDetail(null);
  }

  function handleSaveEdit() {
    if (editingSessionIndex === null) return;
    const copy = [...localSessions];
    const s = copy[editingSessionIndex];
    copy[editingSessionIndex] = {
      ...s,
      day: editDay,
      slot: editSlot,
      venue: editVenue,
    };
    setLocalSessions(copy);
    setEditingSessionIndex(null);
    setToastMessage(
      `Updated ${s.code} to ${editDay} ${editSlot} in ${editVenue}`,
    );
    setTimeout(() => setToastMessage(null), 3500);
  }

  function handleJumpToConflict(c: LiveConflict) {
    setHighlightCell({ day: c.day, slot: c.slot });
    // If in cohort perspective and filtered out, ensure it's visible
    setSelectedLevel("all");
    setSelectedGroup("all");

    if (perspective === "lecturer") {
      setSelectedLecturer(c.lecturer);
    } else if (perspective === "course") {
      setSelectedCourse(c.code);
    }

    // Immediately open line edit on that conflicting class
    handleOpenEdit(c.sessionIndex);
    setTimeout(() => setHighlightCell(null), 3500);
  }

  function jumpToCell(day: string, slot: string) {
    setMode("grid");
    setHighlightCell({ day, slot });
    setTimeout(() => setHighlightCell(null), 2800);
  }

  // Deep-link revision handler: when entering Generate with an activeRevisionTarget (Story A10)
  useEffect(() => {
    if (!context.activeRevisionTarget) return;
    const target = context.activeRevisionTarget;
    // Ensure screen is in generated view
    setScreenMode("generated");

    // Find the session matching the target code (and optionally day/slot)
    const sessionIdx = localSessions.findIndex((s) => {
      if (s.code !== target.code) return false;
      if (target.day && s.day !== target.day) return false;
      if (target.slot && s.slot !== target.slot) return false;
      return true;
    });

    if (sessionIdx !== -1) {
      const s = localSessions[sessionIdx];
      // Reset perspective/filters so target is visible
      setSelectedLevel("all");
      setSelectedGroup("all");
      setSelectedLecturer("all");
      setSelectedCourse("all");
      setHighlightCell({ day: s.day, slot: s.slot });

      // Automatically drop directly into Line Edit mode
      handleOpenEdit(sessionIdx);
      setToastMessage(
        `Editing flagged course ${s.code} as requested by reviewer`,
      );
      setTimeout(() => setToastMessage(null), 4000);
    }

    // Clear target after activating
    context.setActiveRevisionTarget(null);
  }, [context.activeRevisionTarget, localSessions]);

  function handleSubmit() {
    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    setStatus("Submitted to HOD");
    setLocalTimeline([
      {
        actor: "Yakubu Onome",
        role: "Dept T.O",
        action: "Draft generated & submitted",
        at: "Mar 04, 09:12",
        state: "done",
      },
      {
        actor: "Dr. A. Olumide",
        role: "HOD",
        action: "Rejected with comment",
        at: "Mar 04, 15:40",
        state: "rejected",
        comment:
          "BU-GST 205 exceeds LT 12 capacity — relocate to CST Hall A. Also resolve the Thu 12:00 venue clash in CST Hall A before resubmitting.",
      },
      {
        actor: "Yakubu Onome",
        role: "Dept T.O",
        action: "Revised & resubmitted",
        at: now,
        state: "done",
      },
      {
        actor: "Dr. A. Olumide",
        role: "HOD",
        action: "Reviewing revised draft",
        at: "Pending",
        state: "current",
      },
      {
        actor: "Prof. E. Bassey",
        role: "Dean",
        action: "School-level approval",
        at: "Pending",
        state: "pending",
      },
      {
        actor: "M. Danladi",
        role: "Acad Pl. T.O",
        action: "Final approval & publish",
        at: "Pending",
        state: "pending",
      },
    ]);
    setSubmitModal(false);
    if (props?.setView) {
      props.setView("history");
    } else {
      router.push("/history");
    }
  }

  function navigateToView(viewName: View, path: string) {
    if (props?.setView) {
      props.setView(viewName);
    } else {
      router.push(path);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCREEN 1: PRE-GENERATION SNAPSHOT SCREEN
  // ───────────────────────────────────────────────────────────────────────────
  if (screenMode === "snapshot") {
    return (
      <div className="bp-fade flex flex-col gap-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[20px] font-bold tracking-tight text-ink">
                Generate Timetable
              </h2>
              <Pill tone="brand">Input Snapshot Review</Pill>
            </div>
            <p className="mt-1 text-[13.5px] text-muted">
              Verify venue capacity, course allocations, and active constraints
              before running the generation engine.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {localSessions.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setScreenMode("generated")}
              >
                <Eye size={15} /> View Current Schedule
              </Button>
            )}
            <Button onClick={handleProceedToGenerate} disabled={isRegenerating}>
              {isRegenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Proceed to Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Generating Overlay Card */}
        {isRegenerating && (
          <Card className="border-brand/30 bg-brand-soft/30 p-6">
            <div className="flex items-start gap-4">
              <Loader2 size={24} className="mt-0.5 animate-spin text-brand" />
              <div className="space-y-1.5">
                <p className="text-[15px] font-bold text-brand-ink">
                  Constraint Satisfaction Engine Running…
                </p>
                <p className="text-[13px] text-muted leading-relaxed">
                  Evaluating {venues.length} venues, {allocations.length} course
                  allocations, and {localConstraints.length} active constraints.
                  Splitting 3-unit courses (2h + 1h), resolving multi-group
                  non-overlap, and eliminating room clashes.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 3 Snapshots Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Snapshot 1: Venue Availability */}
          <Card className="flex flex-col">
            <CardHead
              icon={<Building2 size={17} />}
              title="Venue Availability"
              sub={`${venues.length} rooms mapped · ${totalCapacity} total capacity`}
              action={<Pill tone="brand">{venues.length} Venues</Pill>}
            />
            <div className="flex-1 space-y-3 px-5 pb-5">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-panel/70 p-3 text-center">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted">
                    Total Seats
                  </p>
                  <p className="text-[17px] font-bold text-ink">
                    {totalCapacity}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted">
                    Time Grid
                  </p>
                  <p className="text-[13px] font-semibold text-subink mt-0.5">
                    7am – 6pm
                  </p>
                </div>
              </div>

              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                Mapped Department Venues (Sample)
              </p>
              <div className="space-y-2">
                {venues.slice(0, 5).map((v) => (
                  <div
                    key={v.name}
                    className="flex items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2 text-[12.5px]"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-semibold text-ink truncate">
                        {v.name}
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        {v.block}
                      </p>
                    </div>
                    <Pill tone="neutral">{v.capacity} seats</Pill>
                  </div>
                ))}
              </div>

              {venues.length > 5 && (
                <p className="text-[11.5px] text-center text-muted">
                  + {venues.length - 5} more mapped departmental venues
                </p>
              )}

              <div className="rounded-xl border border-line bg-panel/50 p-2.5 text-[11.5px] text-muted">
                <span className="font-semibold text-subink">
                  Locked Windows:
                </span>{" "}
                1–2pm Lunch Break, Wed 5pm cutoff, Fri 1pm cutoff.
              </div>
            </div>

            <div className="border-t border-line px-5 py-3.5">
              <button
                onClick={() => navigateToView("venues", "/venues")}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
              >
                Inspect Venue Availability Timetable →
              </button>
            </div>
          </Card>

          {/* Snapshot 2: Course Allocations */}
          <Card className="flex flex-col">
            <CardHead
              icon={<BookOpen size={17} />}
              title="Course Allocations"
              sub={`${allocations.length} courses · ${totalUnits} total units`}
              action={<Pill tone="neutral">100L – 400L</Pill>}
            />
            <div className="flex-1 space-y-3 px-5 pb-5">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-panel/70 p-3 text-center">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted">
                    Allocations
                  </p>
                  <p className="text-[17px] font-bold text-ink">
                    {allocations.length}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted">
                    Total Units
                  </p>
                  <p className="text-[17px] font-bold text-brand">
                    {totalUnits}
                  </p>
                </div>
              </div>

              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                Department Courses (Sample)
              </p>
              <div className="space-y-2">
                {allocations.slice(0, 5).map((a, i) => (
                  <div
                    key={`${a.code}-${a.group ?? ""}-${i}`}
                    className="flex items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2 text-[12.5px]"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink">{a.code}</span>
                        {a.isVirtual && (
                          <span className="flex items-center gap-0.5 rounded bg-violet-soft px-1 py-0.2 text-[9.5px] font-semibold text-violet">
                            <Globe size={9} /> Virtual
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted truncate">
                        {a.lecturer}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11.5px] font-semibold text-subink">
                        {a.units}u
                      </span>
                      <p className="text-[10px] text-muted">
                        {a.group ?? "Unified"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {allocations.length > 5 && (
                <p className="text-[11.5px] text-center text-muted">
                  + {allocations.length - 5} more allocated courses across
                  levels
                </p>
              )}
            </div>

            <div className="border-t border-line px-5 py-3.5">
              <button
                onClick={() => navigateToView("allocations", "/allocations")}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
              >
                Inspect Teaching Allocations Matrix →
              </button>
            </div>
          </Card>

          {/* Snapshot 3: Active Constraints */}
          <Card className="flex flex-col">
            <CardHead
              icon={<Users size={17} />}
              title="Active Constraints"
              sub={`${localConstraints.length} lecturer policies active`}
              action={<Pill tone="warn">{localConstraints.length} Active</Pill>}
            />
            <div className="flex-1 space-y-3 px-5 pb-5">
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-panel/70 p-3 text-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted">
                    Leave
                  </p>
                  <p className="text-[15px] font-bold text-ink">
                    {
                      localConstraints.filter((c) => c.kind === "Study Leave")
                        .length
                    }
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted">
                    Days Off
                  </p>
                  <p className="text-[15px] font-bold text-ink">
                    {
                      localConstraints.filter((c) => c.kind === "Day Off")
                        .length
                    }
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted">
                    Adjunct
                  </p>
                  <p className="text-[15px] font-bold text-ink">
                    {
                      localConstraints.filter((c) => c.kind === "Adjunct")
                        .length
                    }
                  </p>
                </div>
              </div>

              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                Constraint Rules
              </p>
              <div className="space-y-2">
                {localConstraints.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2 text-[12.5px]"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-semibold text-ink truncate">
                        {c.lecturer}
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        {c.detail}
                      </p>
                    </div>
                    <Pill tone="warn">{c.kind}</Pill>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-line px-5 py-3.5">
              <button
                onClick={() => navigateToView("constraints", "/constraints")}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
              >
                Manage Department Constraints →
              </button>
            </div>
          </Card>
        </div>

        {/* Bottom Readiness & Action Banner */}
        <Card className="border-brand/30 bg-gradient-to-r from-brand-soft/40 via-card to-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-sm shrink-0">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-ink">
                  Ready to Run Constraint Satisfaction Engine
                </h3>
                <p className="mt-0.5 text-[13px] text-muted">
                  All {venues.length} venues, {allocations.length} course
                  allocations across 100L–400L, and {localConstraints.length}{" "}
                  active constraints will be synthesized into a conflict-free
                  master schedule.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="px-5 py-3 text-[14px]"
                onClick={handleProceedToGenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Solving
                    Constraints…
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Proceed to Generate Timetable{" "}
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCREEN 2: POST-GENERATION SCHEDULE SCREEN
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="bp-fade flex flex-col gap-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-brand/30 bg-card px-4 py-3 text-[13px] font-semibold text-ink shadow-2xl bp-fade">
          <CheckCircle2 size={16} className="text-brand shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Perspective Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Primary View Perspective Switcher */}
          <div className="flex rounded-xl border border-line bg-card p-1 shadow-2xs">
            <button
              onClick={() => {
                setPerspective("cohort");
                if (mode === "cards") setMode("grid");
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition cursor-pointer ${
                perspective === "cohort"
                  ? "bg-brand text-white shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              <Users size={14} /> Cohort / Master
            </button>
            <button
              onClick={() => setPerspective("lecturer")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition cursor-pointer ${
                perspective === "lecturer"
                  ? "bg-brand text-white shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              <UserCheck size={14} /> By Lecturer
            </button>
            <button
              onClick={() => setPerspective("course")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition cursor-pointer ${
                perspective === "course"
                  ? "bg-brand text-white shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              <BookOpen size={14} /> By Course
            </button>
          </div>

          {/* Persistent ✱ Live Constraint Check Indicator */}
          <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5 shadow-2xs">
            <span className="font-bold text-amber-500 text-[14px]">✱</span>
            <span className="text-[12px] font-semibold text-muted uppercase tracking-wider hidden sm:inline">
              Constraints
            </span>
            {cleared ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-good-soft px-2.5 py-0.5 text-[11.5px] font-bold text-good">
                <CheckCircle2 size={12} /> All Satisfied (
                {localConstraints.length + 12})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-bad-soft px-2.5 py-0.5 text-[11.5px] font-bold text-bad animate-pulse">
                <AlertTriangle size={12} /> {conflicts.length} Violations Active
              </span>
            )}
            <button
              onClick={handleManualConstraintCheck}
              disabled={isCheckingConstraints}
              className="ml-1 rounded-md border border-line px-2 py-0.5 text-[11.5px] font-semibold text-ink hover:bg-panel transition cursor-pointer flex items-center gap-1"
              title="Re-run live institutional constraint verification"
            >
              {isCheckingConstraints ? (
                <>
                  <Loader2 size={11} className="animate-spin text-brand" />
                  <span className="text-muted">Checking…</span>
                </>
              ) : (
                <>
                  <RefreshCw size={11} className="text-muted" />
                  <span>Re-check</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Controls: Snapshots, Regenerate & Submit */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setScreenMode("snapshot")}
            title="Review input snapshots and setup"
          >
            <SlidersHorizontal size={14} /> Input Snapshots
          </Button>

          {!isSubmitted && (
            <>
              <Button
                variant="outline"
                disabled={isRegenerating}
                onClick={() => handleRegenerate()}
              >
                {isRegenerating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Regenerating…
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Regenerate
                  </>
                )}
              </Button>
              <Button
                disabled={!cleared || isRegenerating}
                onClick={() => setSubmitModal(true)}
                title={
                  !cleared
                    ? `Submission blocked: Resolve ${conflicts.length} conflict(s) before submitting to HOD`
                    : "Submit draft schedule to HOD for departmental review"
                }
              >
                {!cleared && <Lock size={13} className="mr-1 text-muted" />}
                Submit to HOD <ArrowRight size={15} />
              </Button>
            </>
          )}

          {isSubmitted && (
            <Pill tone="good">
              <Send size={12} /> Submitted to HOD
            </Pill>
          )}
        </div>
      </div>

      {/* Sub-toolbar: Perspective-specific filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Cohort Perspective Filters */}
          {perspective === "cohort" && (
            <div className="flex items-center gap-2">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="h-8 rounded-lg border border-line bg-card px-2.5 text-[12px] font-semibold text-ink outline-none focus:border-brand"
              >
                <option value="all">All Levels</option>
                <option value="100 Level">100 Level</option>
                <option value="200 Level">200 Level</option>
                <option value="300 Level">300 Level</option>
                <option value="400 Level">400 Level</option>
              </select>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="h-8 rounded-lg border border-line bg-card px-2.5 text-[12px] font-semibold text-ink outline-none focus:border-brand"
              >
                <option value="all">All Sub-groups</option>
                <option value="Group A">Group A</option>
                <option value="Group B">Group B</option>
                <option value="Group C">Group C</option>
                <option value="Group D">Group D</option>
                <option value="Group E">Group E</option>
                <option value="Group F">Group F</option>
                <option value="Direct Entry">Direct Entry</option>
              </select>
            </div>
          )}

          {/* Lecturer Perspective Filter */}
          {perspective === "lecturer" && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-muted">
                Lecturer:
              </span>
              <select
                value={selectedLecturer}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedLecturer(val);
                  if (val !== "all" && mode === "cards") {
                    setMode("grid");
                  }
                }}
                className="h-8 rounded-lg border border-line bg-card px-2.5 text-[12.5px] font-semibold text-ink outline-none focus:border-brand"
              >
                <option value="all">
                  All Department Lecturers ({allLecturers.length})
                </option>
                {allLecturers.map((lec) => (
                  <option key={lec} value={lec}>
                    {lec}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Course Perspective Filter & Search */}
          {perspective === "course" && (
            <div className="flex items-center gap-2">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="h-8 rounded-lg border border-line bg-card px-2.5 text-[12px] font-semibold text-ink outline-none focus:border-brand"
              >
                <option value="all">
                  All Courses ({allCourseCodes.length})
                </option>
                {allCourseCodes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-2 text-muted"
                />
                <input
                  type="text"
                  placeholder="Search course title or lecturer…"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="h-8 w-56 rounded-lg border border-line bg-card pl-7 pr-2.5 text-[12px] text-ink outline-none focus:border-brand"
                />
              </div>
            </div>
          )}

          <span className="text-[12.5px] text-muted">
            {perspective === "cohort" &&
              `${cohortFilteredSessions.length} sessions listed`}
            {perspective === "lecturer" &&
              (selectedLecturer === "all"
                ? `${allLecturers.length} department lecturers · ${lecturerFilteredSessions.length} teaching sessions`
                : `${lecturerFilteredSessions.length} teaching sessions for ${selectedLecturer}`)}
            {perspective === "course" &&
              `${courseFilteredAllocations.length} course allocations`}
          </span>
        </div>

        {/* View mode toggle (Calendar Grid vs List + Density Toggle) */}
        {perspective === "cohort" && (
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-line bg-card p-1">
              <button
                onClick={() => setViewDensity(viewDensity === "compact" ? "normal" : "compact")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition cursor-pointer ${
                  viewDensity === "compact"
                    ? "bg-brand-soft text-brand-ink"
                    : "text-muted hover:text-ink"
                }`}
                title={
                  viewDensity === "compact"
                    ? "Fit entire week on screen without scrolling (Compact)"
                    : "Switch to roomier cards (Normal)"
                }
              >
                <Layers size={13} />
                <span>{viewDensity === "compact" ? "Fit to Screen" : "Comfortable"}</span>
              </button>
            </div>

            <div className="flex rounded-xl border border-line bg-card p-1">
              {(["grid", "list"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold capitalize transition cursor-pointer ${
                    mode === m ? "bg-brand-soft text-brand-ink" : "text-muted"
                  }`}
                >
                  {m === "grid" ? <LayoutGrid size={14} /> : <List size={14} />}
                  {m === "grid" ? "Calendar" : "List"}
                </button>
              ))}
            </div>
          </div>
        )}

        {perspective === "lecturer" && (
          <div className="flex items-center gap-2">
            {mode === "grid" && (
              <div className="flex rounded-xl border border-line bg-card p-1">
                <button
                  onClick={() => setViewDensity(viewDensity === "compact" ? "normal" : "compact")}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition cursor-pointer ${
                    viewDensity === "compact"
                      ? "bg-brand-soft text-brand-ink"
                      : "text-muted hover:text-ink"
                  }`}
                  title={
                    viewDensity === "compact"
                      ? "Fit entire week on screen without scrolling (Compact)"
                      : "Switch to roomier cards (Normal)"
                  }
                >
                  <Layers size={13} />
                  <span>{viewDensity === "compact" ? "Fit to Screen" : "Comfortable"}</span>
                </button>
              </div>
            )}

            <div className="flex rounded-xl border border-line bg-card p-1">
              {selectedLecturer === "all"
                ? (["cards", "grid", "list"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold capitalize transition cursor-pointer ${
                        mode === m ? "bg-brand-soft text-brand-ink" : "text-muted"
                      }`}
                    >
                      {m === "cards" && <Users size={14} />}
                      {m === "grid" && <LayoutGrid size={14} />}
                      {m === "list" && <List size={14} />}
                      {m === "cards"
                        ? "Cards"
                        : m === "grid"
                          ? "Calendar"
                          : "List"}
                    </button>
                  ))
                : (["grid", "list"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold capitalize transition cursor-pointer ${
                        mode === m ? "bg-brand-soft text-brand-ink" : "text-muted"
                      }`}
                    >
                      {m === "grid" ? (
                        <LayoutGrid size={14} />
                      ) : (
                        <List size={14} />
                      )}
                      {m === "grid" ? "Calendar" : "List"}
                    </button>
                  ))}
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────
          CONFLICT BANNER WITH JUMP-TO & SUBMISSION BLOCKER
          ─────────────────────────────────────────────────────────────────────────── */}
      {!cleared && !isSubmitted && (
        <Card className="border-bad/40 bg-bad-soft/30 shadow-xs">
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bad/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bad text-white shrink-0">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-ink">
                    {conflicts.length} Constraint Conflict
                    {conflicts.length > 1 ? "s" : ""} Detected — Submission to
                    HOD Blocked
                  </h4>
                  <p className="text-[12px] text-muted">
                    Institutional policy requires 0 clashes before submission.
                    Click <b>Jump & Edit</b> on any row to adjust the class
                    venue or time slot.
                  </p>
                </div>
              </div>
              <Pill tone="bad">
                <Lock size={12} className="mr-1 inline" /> Submission Locked
              </Pill>
            </div>

            <div className="mt-3.5 space-y-2">
              {conflicts.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bad/25 bg-card px-3.5 py-2.5 transition hover:border-bad/50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="rounded-md bg-bad/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-bad shrink-0">
                      {conflictLabel[c.type] ?? c.type}
                    </span>
                    <span className="font-bold text-[13px] text-ink">
                      {c.code}
                    </span>
                    <span className="text-[12px] text-muted truncate">
                      {c.description}
                    </span>
                  </div>
                  <button
                    onClick={() => handleJumpToConflict(c)}
                    className="inline-flex items-center gap-1 rounded-lg bg-bad/10 px-2.5 py-1 text-[12px] font-semibold text-bad hover:bg-bad/20 transition cursor-pointer shrink-0"
                  >
                    Jump & Edit →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Regenerating overlay */}
      {isRegenerating && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand-soft/40 px-5 py-4">
          <Loader2 size={18} className="animate-spin text-brand" />
          <span className="text-[13.5px] font-semibold text-brand-ink">
            Regenerating against {constraintsComplete ? "all" : "active"}{" "}
            constraints — resolving venue clashes and capacity issues…
          </span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────
          PERSPECTIVE 1 & 2: COHORT OR LECTURER GRID / LIST / CARDS VIEW
          ─────────────────────────────────────────────────────────────────────────── */}
      {(perspective === "cohort" || perspective === "lecturer") && (
        <>
          {/* Lecturer Highlight Card (When specific lecturer selected in Lecturer perspective) */}
          {perspective === "lecturer" && selectedLecturer !== "all" && (
            <Card className="border-brand/20 bg-panel/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand font-bold text-white text-[15px] shadow-xs">
                    {selectedLecturer
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[16px] font-bold text-ink">
                        {selectedLecturer}
                      </h3>
                      <button
                        onClick={() => setSelectedLecturer("all")}
                        className="rounded-lg border border-line bg-card px-2.5 py-0.5 text-[11px] font-semibold text-brand hover:border-brand transition cursor-pointer"
                        title="Return to all department lecturers"
                      >
                        ← All Lecturers
                      </button>
                    </div>
                    <p className="text-[12px] text-muted mt-0.5">
                      Department of Computer Science · Teaching Load:{" "}
                      <span className="font-semibold text-subink">
                        {lecturerFilteredSessions.reduce(
                          (acc, s) => acc + (s.duration ?? 1),
                          0,
                        )}{" "}
                        hrs/week
                      </span>{" "}
                      ·{" "}
                      {
                        allocations.filter(
                          (a) => a.lecturer === selectedLecturer,
                        ).length
                      }{" "}
                      assigned course(s)
                    </p>
                  </div>
                </div>

                {/* Lecturer Constraint Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {localConstraints
                    .filter((c) => c.lecturer === selectedLecturer)
                    .map((c) => (
                      <span
                        key={c.id}
                        className="rounded-lg bg-warn-soft px-2.5 py-1 text-[11.5px] font-semibold text-warn border border-warn/20"
                      >
                        {c.kind}: {c.range}
                      </span>
                    ))}
                  {localConstraints.filter(
                    (c) => c.lecturer === selectedLecturer,
                  ).length === 0 && (
                    <span className="rounded-lg bg-panel px-2.5 py-1 text-[11.5px] text-muted border border-line">
                      No restrictive leave or days off
                    </span>
                  )}
                  {lecturerFilteredSessions.some((s) => s.conflict) ? (
                    <Pill tone="bad">Conflict in Schedule</Pill>
                  ) : (
                    <Pill tone="good">Clear of Clashes</Pill>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Lecturer Cards View (Available when browsing All Lecturers) */}
          {perspective === "lecturer" &&
          selectedLecturer === "all" &&
          mode === "cards" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {allLecturers.map((lecName) => {
                  const lecSessions = validatedSessions.filter(
                    (s) => s.lecturer === lecName,
                  );
                  const lecAllocations = allocations.filter(
                    (a) => a.lecturer === lecName,
                  );
                  const lecConstraints = localConstraints.filter(
                    (c) => c.lecturer === lecName,
                  );
                  const hasConflict = lecSessions.some((s) => s.conflict);
                  const totalWeeklyHours = lecSessions.reduce(
                    (acc, s) => acc + (s.duration ?? 1),
                    0,
                  );

                  return (
                    <Card
                      key={lecName}
                      className={`flex flex-col border transition ${
                        hasConflict
                          ? "border-bad/40 bg-bad-soft/10"
                          : "border-line bg-card"
                      }`}
                    >
                      <CardHead
                        icon={
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft font-bold text-brand text-[13px]">
                            {lecName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                        }
                        title={lecName}
                        sub={`Dept. of Computer Science · ${lecAllocations.length} Course${
                          lecAllocations.length !== 1 ? "s" : ""
                        } Assigned`}
                        action={
                          <div className="flex items-center gap-1.5">
                            <Pill tone="brand">
                              {totalWeeklyHours} hrs/week
                            </Pill>
                            {hasConflict ? (
                              <Pill tone="bad">Conflict</Pill>
                            ) : (
                              <Pill tone="good">Clear</Pill>
                            )}
                          </div>
                        }
                      />

                      <div className="flex-1 space-y-3 px-5 pb-5">
                        {/* Lecturer Metadata & Constraints */}
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-panel/60 px-3.5 py-2 text-[12px]">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-muted font-medium">
                              Constraints:
                            </span>
                            {lecConstraints.length > 0 ? (
                              lecConstraints.map((c) => (
                                <span
                                  key={c.id}
                                  className="rounded-md bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn border border-warn/20"
                                >
                                  {c.kind}: {c.range}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11.5px] text-muted">
                                Full Availability · No Restrictions
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setSelectedLecturer(lecName);
                              setMode("grid");
                            }}
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline cursor-pointer"
                          >
                            View on Calendar →
                          </button>
                        </div>

                        {/* Scheduled Teaching Sessions */}
                        <div className="space-y-1.5">
                          <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                            Scheduled Sessions ({lecSessions.length})
                          </p>
                          {lecSessions.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-line p-3 text-center text-[12px] text-muted">
                              No teaching sessions scheduled for this lecturer
                              yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {lecSessions.map((ls, sIdx) => {
                                const globalIdx = localSessions.findIndex(
                                  (s) =>
                                    s.code === ls.code &&
                                    s.day === ls.day &&
                                    s.slot === ls.slot &&
                                    s.venue === ls.venue,
                                );

                                return (
                                  <div
                                    key={sIdx}
                                    className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2.5 ${
                                      ls.conflict
                                        ? "border-bad/40 bg-bad-soft/30"
                                        : "border-line bg-card"
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-bold text-ink">
                                          {ls.code}
                                        </span>
                                        {ls.group && ls.group !== "All" && (
                                          <span className="rounded bg-brand/10 px-1.5 py-0.2 text-[10px] font-semibold text-brand">
                                            {ls.group}
                                          </span>
                                        )}
                                        <span className="text-[12px] font-medium text-subink">
                                          {ls.day} at {ls.slot}
                                          {ls.duration && ls.duration > 1
                                            ? ` (${ls.duration}h)`
                                            : ""}
                                        </span>
                                        {ls.conflict && (
                                          <span className="rounded bg-bad/20 px-1.5 py-0.2 text-[10px] font-bold text-bad">
                                            {conflictLabel[ls.conflict] ??
                                              ls.conflict}
                                          </span>
                                        )}
                                      </div>
                                      <p className="mt-0.5 text-[11.5px] text-muted truncate">
                                        Venue:{" "}
                                        <span className="font-semibold text-subink">
                                          {ls.venue}
                                        </span>{" "}
                                        · {ls.level ?? "200 Level"}
                                      </p>
                                    </div>

                                    <button
                                      onClick={() => {
                                        if (globalIdx !== -1)
                                          handleOpenEdit(globalIdx);
                                      }}
                                      className="flex items-center gap-1 rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-semibold text-brand hover:border-brand transition cursor-pointer shrink-0"
                                    >
                                      <Pencil size={11} /> Edit
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Calendar Grid or List Mode */
            <Card className="overflow-hidden">
              {mode === "grid" ? (
                <div>
                  {/* Top synchronized horizontal scrollbar for easy navigation */}
                  <div
                    ref={topScrollRef}
                    onScroll={handleTopScroll}
                    className="overflow-x-auto border-b border-line/40 bg-panel/30 px-3 py-1 text-[11px] text-muted select-none"
                    style={{ scrollbarWidth: "thin" }}
                  >
                    <div className="flex items-center justify-between text-[10.5px] font-medium text-muted/80 pb-0.5" style={{ minWidth: 700 }}>
                      <span className="flex items-center gap-1">
                        <span>← Scroll Monday to Friday</span>
                      </span>
                      <span className="text-[10px] text-muted/60">
                        Showing all 5 days (Mon–Fri)
                      </span>
                    </div>
                    <div style={{ width: scrollWidth || "100%", height: 1 }} />
                  </div>

                  <div
                    ref={tableContainerRef}
                    onScroll={handleMainScroll}
                    className="overflow-x-auto p-2 sm:p-3"
                    style={{ scrollbarWidth: "thin" }}
                  >
                    <div className="w-full min-w-[700px]">
                    <div className="grid grid-cols-[56px_repeat(5,1fr)] gap-1.5 sm:gap-2">
                      <div className="pb-2 text-center text-[10.5px] font-bold uppercase tracking-wider text-muted">
                        Time
                      </div>
                      {days.map((d) => {
                        const dayRestriction =
                          perspective === "lecturer"
                            ? getLecturerDayRestriction(
                                selectedLecturer,
                                d,
                                localConstraints,
                              )
                            : { isOff: false };

                        return (
                          <div
                            key={d}
                            className="pb-2 text-center text-[11.5px] font-bold uppercase tracking-wider text-ink border-b border-line/60"
                          >
                            {d}
                            {dayRestriction.isOff && (
                              <span className="block text-[9px] text-warn font-semibold">
                                ({dayRestriction.label})
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {slots.map((s) => (
                        <div key={s} className="contents">
                          <div className="flex items-start justify-center pt-2 text-[11px] font-semibold text-muted">
                            {s}
                          </div>
                          {days.map((d) => {
                            const items = cell(d, s);
                            const isHighlighted =
                              highlightCell?.day === d &&
                              highlightCell?.slot === s;

                            const isBreak = s === "13:00";
                            const isWedOff = d === "Wed" && s === "17:00";
                            const isFriOff =
                              d === "Fri" &&
                              (s === "13:00" ||
                                s === "14:00" ||
                                s === "15:00" ||
                                s === "16:00" ||
                                s === "17:00");

                            // Dynamic slot restriction for selected lecturer
                            const slotRestriction =
                              perspective === "lecturer"
                                ? getLecturerSlotRestriction(
                                    selectedLecturer,
                                    d,
                                    s,
                                    localConstraints,
                                  )
                                : { isRestricted: false };

                            if (isBreak) {
                              return (
                                <div
                                  key={d + s}
                                  className="flex min-h-[48px] items-center justify-center rounded-lg border border-dashed border-line bg-panel/60 p-1 text-[10px] font-semibold text-muted text-center"
                                >
                                  Lunch Break
                                </div>
                              );
                            }

                            if (isWedOff) {
                              return (
                                <div
                                  key={d + s}
                                  className="flex min-h-[48px] items-center justify-center rounded-lg border border-line bg-panel/30 p-1 text-[9.5px] font-medium text-muted/60 text-center"
                                >
                                  Wed 5pm End
                                </div>
                              );
                            }

                            if (isFriOff) {
                              return (
                                <div
                                  key={d + s}
                                  className="flex min-h-[48px] items-center justify-center rounded-lg border border-line bg-panel/30 p-1 text-[9.5px] font-medium text-muted/60 text-center"
                                >
                                  Fri Off
                                </div>
                              );
                            }

                            return (
                              <div
                                key={d + s}
                                className={`rounded-lg border p-1 transition-all duration-200 ${
                                  viewDensity === "compact"
                                    ? "min-h-[58px]"
                                    : "min-h-[72px]"
                                } ${
                                  isHighlighted
                                    ? "border-brand bg-brand-soft/70 shadow-sm ring-3 ring-brand/40 animate-pulse"
                                    : slotRestriction.isRestricted
                                      ? "border-warn/30 bg-warn-soft/20"
                                      : "border-line/70 bg-panel/30 hover:border-line"
                                }`}
                              >
                                {slotRestriction.isRestricted &&
                                  items.length === 0 && (
                                    <div className="flex h-full min-h-[48px] flex-col items-center justify-center rounded border border-dashed border-warn/30 bg-card/60 p-1 text-center">
                                      <span className="text-[9.5px] font-bold text-warn">
                                        Unavailable
                                      </span>
                                      <span className="text-[8px] text-muted truncate max-w-[85px] mt-0.5">
                                        {slotRestriction.reason}
                                      </span>
                                    </div>
                                  )}
                                {items.map((it, k) => {
                                  // Find actual global index in localSessions for line edit
                                  const globalIdx = localSessions.findIndex(
                                    (ls) =>
                                      ls.code === it.code &&
                                      ls.day === it.day &&
                                      ls.slot === it.slot &&
                                      ls.venue === it.venue,
                                  );

                                  const isStartSlot = s === it.slot;
                                  const dur = it.duration ?? 1;

                                  // If this cell represents a continuation hour (e.g. Hour 2 of a 2-hour class)
                                  if (!isStartSlot) {
                                    return (
                                      <div
                                        key={k}
                                        onClick={() => setCellDetail(it)}
                                        className={`group relative mb-1 w-full rounded-md border border-dashed px-1.5 py-1 text-left transition hover:shadow-xs cursor-pointer ${
                                          it.conflict
                                            ? "border-bad/40 bg-bad-soft/50"
                                            : "border-brand/30 bg-card/80"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-1">
                                          <p className="text-[10px] font-bold text-subink truncate">
                                            {it.code}
                                          </p>
                                          <div className="flex items-center gap-0.5 shrink-0">
                                            <span className="rounded bg-brand/10 px-1 py-0.2 text-[8px] font-semibold text-brand-ink">
                                              Hr 2
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (globalIdx !== -1)
                                                  handleOpenEdit(globalIdx);
                                              }}
                                              title="Line edit venue & time"
                                              className="rounded p-0.5 text-muted hover:bg-card hover:text-brand transition cursor-pointer"
                                            >
                                              <Pencil size={9} />
                                            </button>
                                          </div>
                                        </div>
                                        <p className="text-[8.5px] text-muted truncate mt-0.5">
                                          {it.venue}
                                        </p>
                                        {(perspective === "cohort" ||
                                          (perspective === "lecturer" &&
                                            selectedLecturer === "all")) && (
                                          <p className="truncate text-[8.5px] font-medium text-brand truncate">
                                            {it.lecturer}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={k}
                                      className={`group relative mb-1 w-full rounded-md border px-1.5 py-1 text-left last:mb-0 transition hover:shadow-xs ${
                                        it.conflict
                                          ? "border-bad/40 bg-bad-soft"
                                          : "border-brand/25 bg-brand-soft/70 hover:bg-brand-soft"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-1 min-w-0">
                                          <p
                                            className={`text-[10.5px] font-bold truncate leading-tight ${
                                              it.conflict
                                                ? "text-bad"
                                                : "text-brand-ink"
                                            }`}
                                          >
                                            {it.code}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          {it.isVirtual && (
                                            <span className="rounded bg-violet-soft px-1 py-0.2 text-[8px] font-bold text-violet">
                                              Online
                                            </span>
                                          )}
                                          {it.group && it.group !== "All" && (
                                            <span className="rounded bg-brand/15 px-1 py-0.2 text-[8px] font-bold text-brand-ink">
                                              {it.group.replace("Group ", "Gr.")}
                                            </span>
                                          )}
                                          {dur > 1 && (
                                            <span className="rounded bg-brand/15 px-1 py-0.2 text-[8px] font-bold text-brand-ink">
                                              {dur}h
                                            </span>
                                          )}
                                          {/* Line Edit trigger button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (globalIdx !== -1)
                                                handleOpenEdit(globalIdx);
                                            }}
                                            title="Line edit venue & time"
                                            className="ml-0.5 rounded p-0.5 text-muted hover:bg-card hover:text-brand transition cursor-pointer"
                                          >
                                            <Pencil size={9} />
                                          </button>
                                        </div>
                                      </div>

                                      <div
                                        onClick={() => setCellDetail(it)}
                                        className="cursor-pointer mt-0.5"
                                      >
                                        <p className="truncate text-[9px] text-subink font-medium leading-tight">
                                          {it.venue}
                                        </p>
                                        {/* In Cohort perspective OR when viewing All Lecturers: display lecturer name with badge */}
                                        {(perspective === "cohort" ||
                                          (perspective === "lecturer" &&
                                            selectedLecturer === "all")) && (
                                          <div className="flex items-center gap-0.5 truncate text-[8.5px] font-semibold text-brand leading-tight mt-0.5">
                                            <User
                                              size={8.5}
                                              className="shrink-0"
                                            />
                                            <span className="truncate">
                                              {it.lecturer}
                                            </span>
                                          </div>
                                        )}
                                        {/* In specific Lecturer perspective: display student group and level */}
                                        {perspective === "lecturer" &&
                                          selectedLecturer !== "all" && (
                                            <p className="truncate text-[8.5px] text-subink font-medium leading-tight mt-0.5">
                                              {it.level ?? "200 Level"} ·{" "}
                                              {it.group ?? "Unified"}
                                            </p>
                                          )}
                                      </div>
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
                </div>
              </div>
              ) : (
                <div className="px-2 py-2">
                  <div className="grid grid-cols-[100px_1fr_140px_120px_90px_80px] items-center gap-3 px-3 pb-2 pt-1 border-b border-line">
                    {[
                      "Code",
                      "Lecturer",
                      "Venue",
                      "Day / Time",
                      "Status",
                      "Action",
                    ].map((h) => (
                      <span
                        key={h}
                        className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted last:text-right"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  {(perspective === "lecturer"
                    ? lecturerFilteredSessions
                    : cohortFilteredSessions
                  ).map((s, i) => {
                    const globalIdx = localSessions.findIndex(
                      (ls) =>
                        ls.code === s.code &&
                        ls.day === s.day &&
                        ls.slot === s.slot &&
                        ls.venue === s.venue,
                    );

                    return (
                      <div
                        key={i}
                        className="grid grid-cols-[100px_1fr_140px_120px_90px_80px] items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] transition hover:bg-panel border-b border-line-soft last:border-0"
                      >
                        <div>
                          <span className="font-bold text-ink">{s.code}</span>
                          {s.group && s.group !== "All" && (
                            <span className="ml-1.5 text-[10px] text-brand font-semibold">
                              {s.group}
                            </span>
                          )}
                          {s.isVirtual && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-violet-soft px-1 py-0.2 text-[9.5px] font-semibold text-violet">
                              <Globe size={9} /> Virtual
                            </span>
                          )}
                        </div>
                        <span className="truncate text-muted">
                          {s.lecturer}
                        </span>
                        <span className="truncate text-subink">{s.venue}</span>
                        <span className="text-subink">
                          {s.day} · {s.slot}{" "}
                          {s.duration && s.duration > 1
                            ? `(${s.duration}h)`
                            : ""}
                        </span>
                        <div>
                          {s.conflict ? (
                            <Pill tone="bad">Conflict</Pill>
                          ) : (
                            <Pill tone="good">OK</Pill>
                          )}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              if (globalIdx !== -1) handleOpenEdit(globalIdx);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-line bg-card px-2.5 py-1 text-[11.5px] font-semibold text-brand hover:border-brand transition cursor-pointer"
                          >
                            <Pencil size={11} /> Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────
          PERSPECTIVE 3: BY COURSE VIEW
          ─────────────────────────────────────────────────────────────────────────── */}
      {perspective === "course" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {courseFilteredAllocations.map((alloc, idx) => {
              const matchedSessions = validatedSessions.filter(
                (s) =>
                  s.code === alloc.code &&
                  (!alloc.group ||
                    !s.group ||
                    s.group === alloc.group ||
                    alloc.group === "Unified Cohort"),
              );
              const hasConflict = matchedSessions.some((s) => s.conflict);
              const totalScheduledHours = matchedSessions.reduce(
                (acc, s) => acc + (s.duration ?? 1),
                0,
              );

              return (
                <Card
                  key={`${alloc.code}-${alloc.group ?? "unified"}-${alloc.lecturer}-${idx}`}
                  className={`flex flex-col border transition ${
                    hasConflict
                      ? "border-bad/40 bg-bad-soft/10"
                      : "border-line bg-card"
                  }`}
                >
                  <CardHead
                    icon={<BookOpen size={17} />}
                    title={`${alloc.code} · ${alloc.title}`}
                    sub={`${alloc.lecturer} · ${alloc.level ?? "200 Level"} · ${
                      alloc.group ?? "Unified Cohort"
                    }`}
                    action={
                      <div className="flex items-center gap-1.5">
                        <Pill
                          tone={alloc.type === "Core" ? "brand" : "neutral"}
                        >
                          {alloc.units} Units · {alloc.type}
                        </Pill>
                        {hasConflict && <Pill tone="bad">Conflict</Pill>}
                      </div>
                    }
                  />

                  <div className="flex-1 space-y-3 px-5 pb-5">
                    {/* Course Metadata Row */}
                    <div className="flex flex-wrap items-center justify-between rounded-xl bg-panel/60 px-3.5 py-2 text-[12px] text-muted">
                      <span>
                        Enrollment: <b>{alloc.size} students</b>
                      </span>
                      <span>
                        Scheduled:{" "}
                        <b>
                          {totalScheduledHours} of {alloc.units} hrs
                        </b>
                      </span>
                      {alloc.isVirtual ? (
                        <span className="flex items-center gap-1 text-violet font-semibold">
                          <Globe size={11} /> Virtual Course (LMS)
                        </span>
                      ) : (
                        <span>Physical Room Requirement</span>
                      )}
                    </div>

                    {/* Scheduled Line Sessions */}
                    <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                      Scheduled Sessions ({matchedSessions.length})
                    </p>
                    <div className="space-y-2">
                      {matchedSessions.map((ms, sIdx) => {
                        const globalIdx = localSessions.findIndex(
                          (ls) =>
                            ls.code === ms.code &&
                            ls.day === ms.day &&
                            ls.slot === ms.slot &&
                            ls.venue === ms.venue,
                        );

                        return (
                          <div
                            key={sIdx}
                            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${
                              ms.conflict
                                ? "border-bad/40 bg-bad-soft/30"
                                : "border-line bg-card"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-ink">
                                  {ms.day} at {ms.slot}
                                </span>
                                <span className="rounded bg-panel px-1.5 py-0.2 text-[10px] font-semibold text-subink">
                                  {ms.duration ?? 1} hour(s)
                                </span>
                                {ms.conflict && (
                                  <span className="rounded bg-bad/20 px-1.5 py-0.2 text-[10px] font-bold text-bad">
                                    {conflictLabel[ms.conflict] ?? ms.conflict}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[12px] text-muted truncate">
                                Venue:{" "}
                                <span className="font-semibold text-subink">
                                  {ms.venue}
                                </span>{" "}
                                · Lecturer: {ms.lecturer}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                if (globalIdx !== -1) handleOpenEdit(globalIdx);
                              }}
                              className="flex items-center gap-1 rounded-lg border border-line bg-panel px-3 py-1.5 text-[12px] font-semibold text-brand hover:border-brand transition cursor-pointer shrink-0"
                            >
                              <Pencil size={12} /> Edit Time & Venue
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────
          LINE EDIT MODAL (VENUE & TIME PER CLASS)
          ─────────────────────────────────────────────────────────────────────────── */}
      {editingSessionIndex !== null && localSessions[editingSessionIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs"
          onClick={() => setEditingSessionIndex(null)}
        >
          <div
            className="bp-fade w-full max-w-lg rounded-2xl border border-line bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand uppercase tracking-wider">
                    Line Edit Session
                  </span>
                  <span className="text-[12px] text-muted">
                    {localSessions[editingSessionIndex].duration ?? 1} hour(s)
                    block
                  </span>
                </div>
                <h3 className="mt-1 text-[18px] font-bold text-ink">
                  {localSessions[editingSessionIndex].code} ·{" "}
                  {localSessions[editingSessionIndex].lecturer}
                </h3>
              </div>
              <button
                onClick={() => setEditingSessionIndex(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Edit Controls */}
            <div className="space-y-4">
              {/* Day Selector */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-subink">
                  Day of the Week
                </label>
                <select
                  value={editDay}
                  onChange={(e) => setEditDay(e.target.value as any)}
                  className="w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-brand"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d === "Mon" && "Monday"}
                      {d === "Tue" && "Tuesday"}
                      {d === "Wed" && "Wednesday (Ends at 17:00)"}
                      {d === "Thu" && "Thursday"}
                      {d === "Fri" &&
                        "Friday (Institutional half-day, ends at 13:00)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Slot Selector */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-subink">
                  Start Time Slot{" "}
                  {(localSessions[editingSessionIndex]?.duration ?? 1) === 2 &&
                    "(2-Hour Lecture Block)"}
                </label>
                <select
                  value={editSlot}
                  onChange={(e) => setEditSlot(e.target.value as any)}
                  className="w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-brand"
                >
                  {slots.map((s) => {
                    const dur =
                      localSessions[editingSessionIndex]?.duration ?? 1;
                    const isTwoHour = dur === 2;
                    const end = getEndSlot(s, dur);

                    let label = `${s} – ${end}`;
                    let warning = "";

                    if (s === "13:00") {
                      warning = " [⚠️ Mandatory Lunch Break]";
                    } else if (isTwoHour && s === "12:00") {
                      warning = " [⚠️ Clashes into 13:00 Lunch Break]";
                    } else if (isTwoHour && s === "11:00") {
                      warning = " [⚠️ Non-standard: Overlaps 10-12 Period]";
                    } else if (
                      editDay === "Fri" &&
                      (s === "14:00" ||
                        s === "15:00" ||
                        s === "16:00" ||
                        s === "17:00")
                    ) {
                      warning = " [⚠️ Friday Afternoon Curfew]";
                    } else if (
                      editDay === "Wed" &&
                      (s === "17:00" || (isTwoHour && s === "16:00"))
                    ) {
                      warning = " [⚠️ Wed 17:00 Curfew]";
                    } else if (
                      isTwoHour &&
                      (s === "08:00" ||
                        s === "10:00" ||
                        s === "14:00" ||
                        s === "16:00")
                    ) {
                      warning = " [⭐ Standard 2h Block]";
                    }

                    return (
                      <option key={s} value={s}>
                        {label}
                        {warning}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Venue Selector */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-subink">
                  Assigned Venue
                </label>
                <select
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  className="w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-brand"
                >
                  {venues.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} — {v.capacity} seats{" "}
                      {v.isVirtual
                        ? "[Virtual / Online]"
                        : `(${v.spaceType ?? "shared"})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Real-Time Constraint Validation Preview in Modal */}
              <div
                className={`rounded-xl border p-3.5 text-[12.5px] transition ${
                  editHypotheticalCheck.hasConflict
                    ? "border-bad/40 bg-bad-soft/40 text-bad"
                    : "border-good/40 bg-good-soft/40 text-good"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {editHypotheticalCheck.hasConflict ? (
                    <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="font-bold">
                      {editHypotheticalCheck.hasConflict
                        ? `Conflict Warning: ${editHypotheticalCheck.title ?? "Constraint Violation"}`
                        : "Constraint Satisfied"}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed opacity-90">
                      {editHypotheticalCheck.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setEditingSessionIndex(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                <Check size={15} /> Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cell Detail Popover (Inspection) */}
      {cellDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4 backdrop-blur-xs"
          onClick={() => setCellDetail(null)}
        >
          <div
            className="bp-fade w-full max-w-xs rounded-2xl border border-line bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Session detail
                </p>
                <h3 className="mt-0.5 text-[18px] font-bold tracking-[-0.02em] text-ink">
                  {cellDetail.code}
                </h3>
              </div>
              <button
                onClick={() => setCellDetail(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 text-[13px]">
              {[
                ["Lecturer", cellDetail.lecturer],
                ["Venue", cellDetail.venue],
                ["Level", cellDetail.level ?? "200 Level"],
                ["Group", cellDetail.group ?? "All Groups"],
                ["Day", cellDetail.day],
                ["Time", cellDetail.slot],
                ["Duration", `${cellDetail.duration ?? 1} hour(s)`],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between border-b border-line-soft pb-2 last:border-0"
                >
                  <span className="text-muted">{k}</span>
                  <span className="font-semibold text-ink">{v}</span>
                </div>
              ))}
            </div>

            {cellDetail.conflict && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-bad-soft px-3 py-2 text-[12px] font-semibold text-bad">
                <AlertTriangle size={13} />
                {conflictLabel[cellDetail.conflict]} detected
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  const gIdx = localSessions.findIndex(
                    (ls) =>
                      ls.code === cellDetail.code &&
                      ls.day === cellDetail.day &&
                      ls.slot === cellDetail.slot &&
                      ls.venue === cellDetail.venue,
                  );
                  if (gIdx !== -1) handleOpenEdit(gIdx);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-2 text-[12.5px] font-semibold text-white hover:bg-brand-hover transition cursor-pointer"
              >
                <Pencil size={13} /> Line Edit Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs">
          <div className="bp-fade w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-good-soft text-good">
                  <ShieldCheck size={18} />
                </span>
                <h3 className="text-[16px] font-bold text-ink">
                  Submit Timetable for HOD Approval
                </h3>
              </div>
              <button
                onClick={() => setSubmitModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mb-5 rounded-xl bg-good-soft/60 px-4 py-3 text-[13px] text-good">
              <CheckCircle2 size={15} className="mr-1.5 inline" />
              Live constraint validation passed — zero clashes or policy
              breaches found.
            </div>
            <p className="mb-5 text-[13.5px] leading-relaxed text-muted">
              This draft will be forwarded to{" "}
              <b className="text-subink">Dr. A. Olumide (HOD)</b> and the
              departmental status will transition to{" "}
              <b className="text-subink">Submitted to HOD</b>.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSubmitModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                <Send size={15} /> Confirm submission
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
