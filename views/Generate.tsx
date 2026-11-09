"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  List,
  ArrowLeft,
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
  Save,
  Database,
  Plus,
  Trash2,
  CalendarDays,
  PartyPopper,
  Settings2,
  ToggleLeft,
  ToggleRight,
  Info,
  GripVertical,
  RotateCcw,
  ArrowLeftRight,
  Ban,
  Download,
  ChevronDown,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { Card, CardHead, Pill, Button, CustomSelect, DataUnavailableState, TimetableGridSkeleton } from "../components/ui";
import {
  days,
  slots,
  defaultTimeLockConfig,
  isVenueAccessibleToDepartment,
  type Session,
  type Status,
  type TimelineStep,
  type Constraint,
  type DepartmentalEvent,
  type CustomTimeLock,
  accounts,
} from "../lib/data";
import {
  validateLiveSessions,
  isLecturerAvailableForSlot,
  extractSubgroups,
  isCitizenshipOrientationCourse,
  type LiveConflict,
} from "../lib/engine";
import { workflowApi } from "../lib/api";
import { CURRENT_SESSION, CURRENT_SEMESTER } from "../lib/config";
import type { View } from "../components/Sidebar";
import { useRouter } from "next/navigation";
import { useApp } from "../lib/AppContext";
import { exportToCsv, printTimetablePdf } from "../lib/export";
import type { EngineWorkerResponse } from "../lib/engine.worker";
import TimetableGrid from "../components/TimetableGrid";

const conflictLabel: Record<string, string> = {
  venue: "Room Double-Booked",
  capacity: "Room Capacity Exceeded",
  lecturer: "Lecturer Double-Booked",
  availability: "Schedule Clash",
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
      if (
        c.detail.toLowerCase().includes("substituted externally") ||
        c.detail.toLowerCase().includes("substitute")
      ) {
        continue;
      }
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
  const allocations = context.localAllocations || [];
  const currentDept = context.currentUser?.department || context.currentProgram || "";
  const venues = useMemo(() => {
    const raw = context.localVenues || [];
    if (context.currentUser?.role === "deptTO" || context.currentUser?.role === "hod") {
      if (currentDept) {
        return raw.filter((v: any) => isVenueAccessibleToDepartment(v, currentDept));
      }
    }
    return raw;
  }, [context.localVenues, context.currentUser?.role, currentDept]);
  const isAcadPlanningTO = context.currentUser?.role === "acadPlanningTO";

  // Screen flow: "snapshot" (Constraints & Setup screen) -> "generated" (Current Timetable screen)
  // By default, current timetable is the main screen if sessions exist; otherwise show constraints screen
  const [screenMode, setScreenMode] = useState<"snapshot" | "generated">(() => {
    return (props?.localSessions ?? localSessions).length > 0
      ? "generated"
      : "snapshot";
  });

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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [hasPendingEdits, setHasPendingEdits] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{
    stage: string;
    percent: number;
    current?: number;
    total?: number;
  } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Terminate any ongoing Web Worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // C8: Guard against accidental tab close or page refresh when manual edits are pending
  useEffect(() => {
    if (!hasPendingEdits) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasPendingEdits]);

  // C8: Intercept in-app link clicks when manual edits are pending
  useEffect(() => {
    if (!hasPendingEdits) return;

    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (target && target.href && !target.href.startsWith("javascript:")) {
        const confirmLeave = window.confirm(
          "You have pending timetable edits that are still being saved. Are you sure you want to leave this page?"
        );
        if (!confirmLeave) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener("click", handleAnchorClick, true);
    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
    };
  }, [hasPendingEdits]);

  useEffect(() => {
    if (
      context.currentUser?.department &&
      (!context.localAllocations || context.localAllocations.length === 0) &&
      !context.isLoadingBackend
    ) {
      context.refreshAllocations(context.currentUser.department);
    }
  }, [
    context.currentUser?.department,
    context.localAllocations,
    context.isLoadingBackend,
    context.refreshAllocations,
  ]);
  const [highlightCell, setHighlightCell] = useState<{
    day: string;
    slot: string;
  } | null>(null);
  const [cellDetail, setCellDetail] = useState<Session | null>(null);
  const [viewDensity, setViewDensity] = useState<"compact" | "normal">("compact");

  // Modal and drawer states for Departmental Events & Dynamic Time Locks
  const [showEventModal, setShowEventModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showEventsDrawer, setShowEventsDrawer] = useState(false);

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventCategory, setNewEventCategory] = useState<DepartmentalEvent["category"]>("Departmental Week");
  const [newEventWeek, setNewEventWeek] = useState("Semester Week 8");
  const [newEventDay, setNewEventDay] = useState<string>("All Week");
  const [newEventTimeRange, setNewEventTimeRange] = useState("Full Week Event");
  const [newEventVenue, setNewEventVenue] = useState("");
  const [newEventLevel, setNewEventLevel] = useState("All Levels");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventAdvisory, setNewEventAdvisory] = useState("");

  // New Custom Time Lock Form State
  const [newLockTitle, setNewLockTitle] = useState("");
  const [newLockDay, setNewLockDay] = useState<(typeof days)[number]>("Thu");
  const [newLockSlot, setNewLockSlot] = useState<(typeof slots)[number]>("12:00");
  const [newLockDuration, setNewLockDuration] = useState<number>(1);
  const [newLockLevel, setNewLockLevel] = useState<string>("All Levels");
  const [newLockReason, setNewLockReason] = useState("");

  // Synchronized scrollbar refs for user-friendly top scroll
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  // ───────────────────────────────────────────────────────────────────────────
  // DRAG AND DROP STATE
  // ───────────────────────────────────────────────────────────────────────────
  const [draggedSession, setDraggedSession] = useState<{
    session: Session;
    globalIndex: number;
  } | null>(null);
  const draggedSessionRef = useRef<{ session: Session; globalIndex: number } | null>(null);

  const [dragOverTarget, setDragOverTarget] = useState<{
    day: (typeof days)[number];
    slot: (typeof slots)[number];
  } | null>(null);
  const dragOverRef = useRef<{ day: string; slot: string } | null>(null);

  // Keyboard Selection & Navigation State for Grid Accessibility (C4)
  const [keyboardPickedSession, setKeyboardPickedSession] = useState<{
    session: Session;
    globalIndex: number;
  } | null>(null);

  // Undo history for drag and drop moves & swaps
  const [historyStack, setHistoryStack] = useState<{
    sessions: Session[];
    description: string;
  }[]>([]);

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

  // Current program's departmental events
  const currentDeptEvents = useMemo(() => {
    const normDept = context.currentProgram.trim().toLowerCase();
    return context.departmentalEvents.filter((e) => {
      if (!e.department || e.department === "All") return true;
      const eNorm = e.department.trim().toLowerCase();
      return eNorm === normDept || eNorm.includes(normDept) || normDept.includes(eNorm);
    });
  }, [context.departmentalEvents, context.currentProgram]);

  // ───────────────────────────────────────────────────────────────────────────
  // LIVE CONSTRAINT SATISFACTION VALIDATION
  // ───────────────────────────────────────────────────────────────────────────
  const { validatedSessions, conflicts } = useMemo(() => {
    return validateLiveSessions(
      localSessions,
      allocations,
      venues,
      localConstraints,
      context.externalBookings,
      {
        departmentName: context.currentProgram,
        timeLockConfig: context.timeLockConfig,
      }
    );
  }, [
    localSessions,
    allocations,
    venues,
    localConstraints,
    context.externalBookings,
    context.currentProgram,
    context.timeLockConfig,
  ]);

  const cleared = conflicts.length === 0;
  const isSubmitted =
    status === "Submitted to HOD" ||
    status === "Submitted to Dean" ||
    status === "Submitted to Acad Pl. T.O" ||
    status === "Published";
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

  // Highly optimized O(1) Grid Cell Lookup
  const cellMap = useMemo(() => {
    const map: Record<string, Session[]> = {};
    const activeList =
      perspective === "lecturer"
        ? lecturerFilteredSessions
        : cohortFilteredSessions;

    for (const x of activeList) {
      const startIdx = slots.indexOf(x.slot as any);
      const dur = x.duration ?? 1;
      for (let i = 0; i < dur; i++) {
        const slotKey = slots[startIdx + i];
        if (slotKey) {
          const key = `${x.day}|${slotKey}`;
          if (!map[key]) map[key] = [];
          map[key].push(x);
        }
      }
    }
    return map;
  }, [perspective, lecturerFilteredSessions, cohortFilteredSessions]);

  const cell = useCallback(
    (d: string, s: string): Session[] => {
      return cellMap[`${d}|${s}`] || [];
    },
    [cellMap]
  );

  // Fast O(1) session index lookup
  const sessionIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    localSessions.forEach((ls, idx) => {
      map.set(`${ls.code}|${ls.day}|${ls.slot}|${ls.venue}`, idx);
    });
    return map;
  }, [localSessions]);

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
      context.externalBookings,
      {
        departmentName: context.currentProgram,
        timeLockConfig: context.timeLockConfig,
      }
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
  function handleCancelGeneration() {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsRegenerating(false);
    setGenerationProgress(null);
    setToastMessage("Timetable generation cancelled.");
    setTimeout(() => setToastMessage(null), 3500);
  }

  function startEngineGeneration(isInitial: boolean) {
    setIsRegenerating(true);
    setHighlightCell(null);
    setGenerationProgress({
      stage: "Initializing timetable engine...",
      percent: 0,
    });

    const onGenerationComplete = (sessions: Session[]) => {
      setLocalSessions(sessions);
      context.saveTimetableDraft("Draft generated", sessions).then((saved) => {
        setToastMessage(
          saved
            ? isInitial
              ? "Draft timetable generated and saved successfully!"
              : "Timetable regenerated and saved successfully!"
            : isInitial
              ? "Draft timetable generated."
              : "Timetable regenerated."
        );
        setTimeout(() => setToastMessage(null), 3500);
      });
      setIsRegenerating(false);
      setGenerationProgress(null);
      if (isInitial) {
        setScreenMode("generated");
      }
    };

    const runSyncFallback = () => {
      import("../lib/engine").then(({ generateTimetable }) => {
        try {
          const result = generateTimetable(
            allocations,
            venues,
            context.localConstraints,
            context.currentProgram,
            {
              externalBookings: context.externalBookings,
              timeLockConfig: context.timeLockConfig,
              onProgress: (p) => setGenerationProgress(p),
            }
          );
          onGenerationComplete(result.sessions);
        } catch (err: any) {
          setIsRegenerating(false);
          setGenerationProgress(null);
          setToastMessage(`Generation error: ${err?.message || "Failed"}`);
          setTimeout(() => setToastMessage(null), 4000);
        }
      });
    };

    if (typeof window !== "undefined" && typeof Worker !== "undefined") {
      try {
        if (workerRef.current) {
          workerRef.current.terminate();
        }

        const worker = new Worker(
          new URL("../lib/engine.worker.ts", import.meta.url)
        );
        workerRef.current = worker;

        worker.onmessage = (e: MessageEvent<EngineWorkerResponse>) => {
          const data = e.data;
          if (!data) return;

          if (data.type === "PROGRESS") {
            setGenerationProgress(data.payload);
          } else if (data.type === "SUCCESS") {
            worker.terminate();
            workerRef.current = null;
            onGenerationComplete(data.payload.sessions);
          } else if (data.type === "ERROR") {
            worker.terminate();
            workerRef.current = null;
            setIsRegenerating(false);
            setGenerationProgress(null);
            setToastMessage(`Generation error: ${data.error}`);
            setTimeout(() => setToastMessage(null), 4000);
          }
        };

        worker.onerror = (err) => {
          console.error("Worker error encountered, falling back to sync engine:", err);
          worker.terminate();
          workerRef.current = null;
          runSyncFallback();
        };

        worker.postMessage({
          type: "START",
          payload: {
            allocations,
            venues,
            activeConstraints: context.localConstraints,
            departmentName: context.currentProgram,
            options: {
              externalBookings: context.externalBookings,
              timeLockConfig: context.timeLockConfig,
            },
          },
        });
        return;
      } catch (err) {
        console.warn("Could not instantiate Web Worker, using main thread fallback:", err);
      }
    }

    runSyncFallback();
  }

  function handleProceedToGenerate() {
    startEngineGeneration(true);
  }

  function handleRegenerate() {
    startEngineGeneration(false);
  }

  function handleManualSaveDraft() {
    context.saveTimetableDraft(status, localSessions).then((saved) => {
      setHasPendingEdits(false);
      setToastMessage(
        saved
          ? `Draft saved to database (${localSessions.length} sessions).`
          : "Draft saved locally."
      );
      setTimeout(() => setToastMessage(null), 3500);
    });
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
    setHasPendingEdits(true);
    setLocalSessions(copy);
    context.saveTimetableDraft(status, copy).then((saved) => {
      setToastMessage(
        `Updated ${s.code} to ${editDay} ${editSlot} in ${editVenue}${saved ? " (saved to DB)" : ""}`
      );
      setTimeout(() => setToastMessage(null), 3500);
    }).finally(() => {
      setHasPendingEdits(false);
    });
    setEditingSessionIndex(null);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HIGHLY OPTIMIZED DRAG AND DROP HANDLERS
  // ───────────────────────────────────────────────────────────────────────────

  const checkDropFeasibility = useCallback(
    (
      session: Session,
      targetDay: (typeof days)[number],
      targetSlot: (typeof slots)[number]
    ): {
      allowed: boolean;
      status: "valid" | "swap" | "warning" | "blocked";
      reason: string;
      swapWith?: Session;
    } => {
      const dur = session.duration ?? 1;
      const isTwoHour = dur === 2;
      const targetIdx = slots.indexOf(targetSlot as any);
      const secondSlot =
        isTwoHour && targetIdx !== -1 && targetIdx + 1 < slots.length
          ? slots[targetIdx + 1]
          : null;

      // 1. Operating Window bounds check (configured by Academic Planning)
      const opWin = context.timeLockConfig?.operatingWindow || defaultTimeLockConfig.operatingWindow;
      const startSlotIdx = slots.indexOf((opWin.startSlot || "07:00") as any);
      const endSlotIdx = slots.indexOf((opWin.endSlot || "17:00") as any);
      const targetSlotEndIdx = isTwoHour ? targetIdx + 1 : targetIdx;

      if (startSlotIdx !== -1 && targetIdx < startSlotIdx) {
        return {
          allowed: false,
          status: "blocked",
          reason: `Before approved operating window (${opWin.startSlot})`,
        };
      }
      if (endSlotIdx !== -1 && targetSlotEndIdx > endSlotIdx) {
        return {
          allowed: false,
          status: "blocked",
          reason: `Extends past operating window cutoff (${opWin.endSlot})`,
        };
      }

      // 2. University Lunch Break
      const lunchConfig = context.timeLockConfig?.lunchBreak;
      const lunchSlot = lunchConfig?.enabled ? (lunchConfig.slot || "13:00") : "13:00";
      if (lunchConfig?.enabled && targetSlot === lunchSlot) {
        return {
          allowed: false,
          status: "blocked",
          reason: `University Lunch Break (${lunchSlot})`,
        };
      }
      if (lunchConfig?.enabled && isTwoHour && secondSlot === lunchSlot) {
        return {
          allowed: false,
          status: "blocked",
          reason: `2-hour class extends into Lunch Break (${lunchSlot})`,
        };
      }

      // 3. Early Closings (Dynamic)
      for (const ec of (context.timeLockConfig?.earlyClosings || [])) {
        if (ec.enabled && ec.day === targetDay) {
          const cutoffIdx = slots.indexOf((ec.cutoffSlot || "17:00") as any);
          if (cutoffIdx !== -1 && targetSlotEndIdx >= cutoffIdx) {
            return {
              allowed: false,
              status: "blocked",
              reason: `${ec.label || targetDay + " early closing"} (${ec.cutoffSlot})`,
            };
          }
        }
      }

      // 4. Custom Time Locks
      if (context.timeLockConfig?.customTimeLocks?.length) {
        const matchingLock = context.timeLockConfig.customTimeLocks.find(
          (l) =>
            l.enabled &&
            l.day === targetDay &&
            (l.slot === targetSlot || (secondSlot && l.slot === secondSlot))
        );
        if (matchingLock) {
          return {
            allowed: false,
            status: "blocked",
            reason: matchingLock.title,
          };
        }
      }

      // 5. University Chapel Seminar
      if (isCitizenshipOrientationCourse(session)) {
        const lvl = session.level || "100 Level";
        const chapelWin =
          context.timeLockConfig?.chapelSeminarSchedule?.[lvl] || {
            day: "Tue",
            slot: "11:00",
          };
        if (targetDay !== chapelWin.day || targetSlot !== chapelWin.slot) {
          return {
            allowed: false,
            status: "blocked",
            reason: `Mandatory Chapel Seminar for ${lvl} (${chapelWin.day} ${chapelWin.slot})`,
          };
        }
      }

      // 6. Lecturer Availability Check
      const targetSlotIdx = slots.indexOf(targetSlot as any);
      const isAvailable1 = isLecturerAvailableForSlot(
        session.lecturer,
        targetDay,
        targetSlotIdx,
        1,
        localConstraints
      );
      const secondSlotIdx = secondSlot ? slots.indexOf(secondSlot as any) : -1;
      const isAvailable2 = secondSlotIdx !== -1
        ? isLecturerAvailableForSlot(
            session.lecturer,
            targetDay,
            secondSlotIdx,
            1,
            localConstraints
          )
        : { available: true };

      if (!isAvailable1.available || !isAvailable2.available) {
        const reason =
          (!isAvailable1.available ? isAvailable1.reason : isAvailable2.reason) ||
          "Lecturer has scheduled day off";
        return {
          allowed: true,
          status: "warning",
          reason: `Lecturer notice: ${reason}`,
        };
      }

      // 7. Check existing sessions in target slot
      const targetSessions = cell(targetDay, targetSlot).filter(
        (s) =>
          !(
            s.code === session.code &&
            s.day === session.day &&
            s.slot === session.slot &&
            s.venue === session.venue
          )
      );

      if (targetSessions.length > 0) {
        // Find existing session of the same cohort (eligible for smart SWAP)
        const sameCohortSession = targetSessions.find(
          (s) =>
            (s.level === session.level || (!s.level && !session.level)) &&
            (s.group === session.group ||
              !s.group ||
              !session.group ||
              s.group === "All" ||
              session.group === "All")
        );

        if (sameCohortSession) {
          return {
            allowed: true,
            status: "swap",
            reason: `Swap with ${sameCohortSession.code}`,
            swapWith: sameCohortSession,
          };
        }

        // Check venue collision
        const sameVenue = targetSessions.some((s) => s.venue === session.venue);
        if (sameVenue) {
          return {
            allowed: true,
            status: "warning",
            reason: `Venue ${session.venue} double-booked`,
          };
        }

        return {
          allowed: true,
          status: "valid",
          reason: `Run concurrently with ${targetSessions.map((s) => s.code).join(", ")}`,
        };
      }

      return {
        allowed: true,
        status: "valid",
        reason: "Available & clash-free",
      };
    },
    [context.timeLockConfig, localConstraints, cell]
  );

  // Precomputed feasibility for the current hover target (computed ONCE per target change)
  const currentDropFeasibility = useMemo(() => {
    if (!draggedSession || !dragOverTarget) return null;
    return checkDropFeasibility(
      draggedSession.session,
      dragOverTarget.day,
      dragOverTarget.slot
    );
  }, [draggedSession, dragOverTarget, checkDropFeasibility]);

  // Background Debounced Auto-Saver (Prevents UI freezing / latency on drag-and-drop)
  const saveDraftTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerBackgroundSave = useCallback(
    (sessionsToSave: Session[]) => {
      setHasPendingEdits(true);
      if (saveDraftTimerRef.current) {
        clearTimeout(saveDraftTimerRef.current);
      }
      saveDraftTimerRef.current = setTimeout(() => {
        context.saveTimetableDraft(status, sessionsToSave).finally(() => {
          setHasPendingEdits(false);
        });
      }, 500);
    },
    [context.saveTimetableDraft, status]
  );

  function handleDragStart(
    e: React.DragEvent,
    session: Session,
    globalIdx: number
  ) {
    draggedSessionRef.current = { session, globalIndex: globalIdx };
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ session, globalIndex: globalIdx })
    );
    e.dataTransfer.setData(
      "text/plain",
      `${session.code} ${session.day} ${session.slot}`
    );
    e.dataTransfer.effectAllowed = "move";

    // Defer state update so native drag preview is generated instantly by the browser with 0ms lag!
    setTimeout(() => {
      setDraggedSession({ session, globalIndex: globalIdx });
    }, 0);
  }

  function handleDragEnd() {
    draggedSessionRef.current = null;
    setDraggedSession(null);
    dragOverRef.current = null;
    setDragOverTarget(null);
  }

  // Instant 0ms detection on cell boundary crossing
  function handleDragEnter(
    e: React.DragEvent,
    day: (typeof days)[number],
    slot: (typeof slots)[number]
  ) {
    e.preventDefault();
    if (
      dragOverRef.current?.day !== day ||
      dragOverRef.current?.slot !== slot
    ) {
      dragOverRef.current = { day, slot };
      setDragOverTarget({ day, slot });
    }
  }

  function handleDragOver(
    e: React.DragEvent,
    day: (typeof days)[number],
    slot: (typeof slots)[number]
  ) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (
      dragOverRef.current?.day !== day ||
      dragOverRef.current?.slot !== slot
    ) {
      dragOverRef.current = { day, slot };
      setDragOverTarget({ day, slot });
    }
  }

  function handleContainerDragLeave(e: React.DragEvent) {
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !e.currentTarget.contains(related)) {
      dragOverRef.current = null;
      setDragOverTarget(null);
    }
  }

  function applyMoveOrSwap(
    session: Session,
    globalIndex: number,
    targetDay: (typeof days)[number],
    targetSlot: (typeof slots)[number]
  ): boolean {
    // Dropped on same slot -> no-op
    if (session.day === targetDay && session.slot === targetSlot) {
      return false;
    }

    const feasibility = checkDropFeasibility(session, targetDay, targetSlot);
    if (feasibility.status === "blocked") {
      setToastMessage(`Cannot move: ${feasibility.reason}`);
      setTimeout(() => setToastMessage(null), 3500);
      return false;
    }

    const previousSessions = [...localSessions];

    // SWAP action
    if (feasibility.status === "swap" && feasibility.swapWith) {
      const targetSwap = feasibility.swapWith;
      const targetIdx =
        sessionIndexMap.get(
          `${targetSwap.code}|${targetSwap.day}|${targetSwap.slot}|${targetSwap.venue}`
        ) ??
        localSessions.findIndex(
          (ls) =>
            ls.code === targetSwap.code &&
            ls.day === targetSwap.day &&
            ls.slot === targetSwap.slot &&
            ls.venue === targetSwap.venue
        );

      if (targetIdx !== -1) {
        const updated = [...localSessions];
        updated[globalIndex] = {
          ...session,
          day: targetDay,
          slot: targetSlot,
        };
        updated[targetIdx] = {
          ...targetSwap,
          day: session.day,
          slot: session.slot,
        };

        // 1. Instant Optimistic UI Update (0ms delay)
        setLocalSessions(updated);
        setHistoryStack((prev) => [
          {
            sessions: previousSessions,
            description: `Swap ${session.code} with ${targetSwap.code}`,
          },
          ...prev.slice(0, 9),
        ]);

        setToastMessage(
          `Swapped ${session.code} with ${targetSwap.code} (${targetDay} ${targetSlot})`
        );
        setTimeout(() => setToastMessage(null), 4500);

        // 2. Background Auto-Save (no UI block)
        triggerBackgroundSave(updated);
        return true;
      }
    }

    // Standard MOVE
    const updated = [...localSessions];
    updated[globalIndex] = {
      ...session,
      day: targetDay,
      slot: targetSlot,
    };

    // 1. Instant Optimistic UI Update (0ms delay)
    setLocalSessions(updated);
    setHistoryStack((prev) => [
      {
        sessions: previousSessions,
        description: `Move ${session.code} to ${targetDay} ${targetSlot}`,
      },
      ...prev.slice(0, 9),
    ]);

    setToastMessage(
      `Moved ${session.code} to ${targetDay} ${targetSlot}${
        feasibility.status === "warning" ? ` (${feasibility.reason})` : ""
      }`
    );
    setTimeout(() => setToastMessage(null), 4500);

    // 2. Background Auto-Save (no UI block)
    triggerBackgroundSave(updated);
    return true;
  }

  function handleDrop(
    e: React.DragEvent,
    targetDay: (typeof days)[number],
    targetSlot: (typeof slots)[number]
  ) {
    e.preventDefault();

    const dragging = draggedSessionRef.current;
    draggedSessionRef.current = null;
    dragOverRef.current = null;
    setDraggedSession(null);
    setDragOverTarget(null);

    if (!dragging) return;
    const { session, globalIndex } = dragging;

    applyMoveOrSwap(session, globalIndex, targetDay, targetSlot);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // KEYBOARD ACCESSIBILITY (C4)
  // ───────────────────────────────────────────────────────────────────────────
  function handlePickupSession(session: Session, globalIndex: number) {
    setKeyboardPickedSession({ session, globalIndex });
    draggedSessionRef.current = { session, globalIndex };
    setDraggedSession({ session, globalIndex });
    setToastMessage(
      `Picked up ${session.code}. Navigate slots with Arrow keys, press Enter/Space to place or swap, Esc to cancel.`
    );
    setTimeout(() => setToastMessage(null), 5500);
  }

  function handleCancelKeyboardMove() {
    setKeyboardPickedSession(null);
    draggedSessionRef.current = null;
    dragOverRef.current = null;
    setDraggedSession(null);
    setDragOverTarget(null);
    setToastMessage("Keyboard move cancelled.");
    setTimeout(() => setToastMessage(null), 2500);
  }

  function handleExecuteKeyboardDrop(
    targetDay: (typeof days)[number],
    targetSlot: (typeof slots)[number]
  ) {
    if (!keyboardPickedSession) return;
    const { session, globalIndex } = keyboardPickedSession;
    const success = applyMoveOrSwap(session, globalIndex, targetDay, targetSlot);
    if (success) {
      setKeyboardPickedSession(null);
      draggedSessionRef.current = null;
      dragOverRef.current = null;
      setDraggedSession(null);
      setDragOverTarget(null);
    }
  }

  function focusGridCell(
    targetDay: (typeof days)[number],
    targetSlot: (typeof slots)[number]
  ) {
    const el = document.getElementById(`grid-cell-${targetDay}-${targetSlot}`);
    if (el) {
      el.focus();
    }
    if (keyboardPickedSession) {
      dragOverRef.current = { day: targetDay, slot: targetSlot };
      setDragOverTarget({ day: targetDay, slot: targetSlot });
    }
  }

  function handleGridCellKeyDown(
    e: React.KeyboardEvent,
    currentDay: (typeof days)[number],
    currentSlot: (typeof slots)[number]
  ) {
    const dayIdx = days.indexOf(currentDay);
    const slotIdx = slots.indexOf(currentSlot);

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextDay = days[Math.min(days.length - 1, dayIdx + 1)];
      focusGridCell(nextDay, currentSlot);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevDay = days[Math.max(0, dayIdx - 1)];
      focusGridCell(prevDay, currentSlot);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextSlot = slots[Math.min(slots.length - 1, slotIdx + 1)];
      focusGridCell(currentDay, nextSlot);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevSlot = slots[Math.max(0, slotIdx - 1)];
      focusGridCell(currentDay, prevSlot);
    } else if (e.key === "Enter" || e.key === " ") {
      if (keyboardPickedSession) {
        e.preventDefault();
        handleExecuteKeyboardDrop(currentDay, currentSlot);
      }
    } else if (e.key === "Escape") {
      if (keyboardPickedSession) {
        e.preventDefault();
        handleCancelKeyboardMove();
      }
    }
  }

  function handleSessionItemKeyDown(
    e: React.KeyboardEvent,
    item: Session,
    globalIdx: number,
    currentDay: (typeof days)[number],
    currentSlot: (typeof slots)[number]
  ) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      if (!keyboardPickedSession) {
        if (globalIdx !== -1) {
          handlePickupSession(item, globalIdx);
        }
      } else {
        handleExecuteKeyboardDrop(currentDay, currentSlot);
      }
    } else if (e.key === "Escape") {
      if (keyboardPickedSession) {
        e.preventDefault();
        e.stopPropagation();
        handleCancelKeyboardMove();
      }
    } else if (
      e.key === "ArrowRight" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowUp"
    ) {
      handleGridCellKeyDown(e, currentDay, currentSlot);
    }
  }

  function handleUndo() {
    if (historyStack.length === 0) return;
    const [last, ...rest] = historyStack;
    setLocalSessions(last.sessions);
    setHistoryStack(rest);
    setToastMessage(`Undone: ${last.description}`);
    setTimeout(() => setToastMessage(null), 3000);
    triggerBackgroundSave(last.sessions);
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

  const [isSubmittingToHod, setIsSubmittingToHod] = useState(false);

  async function handleSubmit() {
    const activeDept = context.currentProgram || context.currentUser?.department || "";
    if (!activeDept) {
      alert("A department is required before submitting this timetable.");
      return;
    }
    setIsSubmittingToHod(true);
    try {
      // Persist the latest sessions as a draft. The workflow endpoint below
      // is the single operation that submits to HOD.
      await context.saveTimetableDraft("Draft generated", localSessions, activeDept);
      await workflowApi.submitToHOD(activeDept, CURRENT_SEMESTER, CURRENT_SESSION);
      setStatus("Submitted to HOD");
      context.setStatus("Submitted to HOD");

      const tlRes = await workflowApi.getTimeline(activeDept);
      if (tlRes && Array.isArray(tlRes.timeline)) {
        setLocalTimeline(tlRes.timeline);
        context.setLocalTimeline(tlRes.timeline);
      }

      setSubmitModal(false);
      if (props?.setView) {
        props.setView("history");
      } else {
        router.push("/history");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to submit draft to HOD.");
    } finally {
      setIsSubmittingToHod(false);
    }
  }

  function navigateToView(viewName: View, path: string) {
    if (hasPendingEdits) {
      const confirmLeave = window.confirm(
        "You have pending timetable edits that are still being saved. Are you sure you want to leave this page?"
      );
      if (!confirmLeave) return;
    }
    if (props?.setView) {
      props.setView(viewName);
    } else {
      router.push(path);
    }
  }

  if (context.isLoadingBackend && localSessions.length === 0 && allocations.length === 0) {
    return <TimetableGridSkeleton daysCount={5} slotsCount={8} />;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCREEN 1: PRE-GENERATION SNAPSHOT SCREEN
  // ───────────────────────────────────────────────────────────────────────────
  if (screenMode === "snapshot") {
    return (
      <div className="bp-fade flex flex-col gap-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {localSessions.length > 0 && (
              <button
                onClick={() => setScreenMode("generated")}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card text-subink transition hover:bg-panel hover:text-ink cursor-pointer shadow-2xs"
                title="Back to Timetable"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[20px] font-bold tracking-tight text-ink">
                  Timetable Rules & Guidelines
                </h2>
                <Pill tone="brand">Department Guidelines</Pill>
              </div>
              <p className="mt-1 text-[13.5px] text-muted">
                University hours, break periods, weekly class hours, and lecturer preferences for {context.currentProgram}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {localSessions.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setScreenMode("generated")}
              >
                <ArrowLeft size={15} /> Back to Timetable
              </Button>
            )}
            <Button onClick={handleProceedToGenerate} disabled={isRegenerating}>
              {isRegenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Generating Timetable…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> {localSessions.length > 0 ? "Regenerate Timetable" : "Generate Timetable"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Generating Overlay Card */}
        {isRegenerating && (
          <Card className="border-brand/30 bg-brand-soft/30 p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Loader2 size={24} className="mt-0.5 animate-spin text-brand shrink-0" />
                <div className="space-y-2">
                  <p className="text-[15px] font-bold text-brand-ink">
                    Building Conflict-Free Timetable…
                  </p>
                  <p className="text-[13px] text-muted leading-relaxed">
                    {generationProgress?.stage || `Reviewing ${venues.length} teaching venues, ${allocations.length} course allocations, and lecturer teaching preferences.`}
                  </p>
                  {generationProgress && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-brand">
                        <span>Optimization Progress</span>
                        <span>{generationProgress.percent}%</span>
                      </div>
                      <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-brand/15">
                        <div
                          className="h-full bg-brand transition-all duration-200 ease-out"
                          style={{ width: `${generationProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleCancelGeneration}
                className="shrink-0 border-rose-200 text-rose-700 hover:bg-rose-50 self-start text-xs py-1.5 px-3"
              >
                <Ban size={14} className="mr-1" />
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* High-Level Constraint Metrics Row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-line bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between text-muted">
              <span className="text-[11.5px] font-bold uppercase tracking-wider">Campus Hours</span>
              <Clock size={15} className="text-amber-500" />
            </div>
            <p className="mt-2 text-[20px] font-bold text-ink">4 Rules Active</p>
            <p className="text-[11.5px] text-muted">Lunch break & early closing days</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between text-muted">
              <span className="text-[11.5px] font-bold uppercase tracking-wider">Course Duration</span>
              <Layers size={15} className="text-brand" />
            </div>
            <p className="mt-2 text-[20px] font-bold text-ink">Standard Split</p>
            <p className="text-[11.5px] text-muted">Weekly hours & class day spacing</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between text-muted">
              <span className="text-[11.5px] font-bold uppercase tracking-wider">Lecturer Times</span>
              <Users size={15} className="text-violet" />
            </div>
            <p className="mt-2 text-[20px] font-bold text-ink">{localConstraints.length} Preferences</p>
            <p className="text-[11.5px] text-muted">Approved leave & teaching days</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between text-muted">
              <span className="text-[11.5px] font-bold uppercase tracking-wider">Teaching Venues</span>
              <Building2 size={15} className="text-emerald-500" />
            </div>
            <p className="mt-2 text-[20px] font-bold text-ink">{venues.length} Rooms</p>
            <p className="text-[11.5px] text-muted">{totalCapacity} total seat capacity</p>
          </div>
        </div>

        {/* Section 1: University Hours & Mandatory Breaks (Institutional Locked Times) */}
        <Card className="flex flex-col overflow-hidden">
          <CardHead
            icon={<Clock size={17} />}
            title="University Hours & Mandatory Breaks (Institutional Policy)"
            sub="Standard Babcock University institutional hours and locked break periods configured on the backend administration panel."
            action={
              <Pill tone="neutral">
                <Lock size={12} className="inline mr-1" /> Backend Configured
              </Pill>
            }
          />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 bg-panel/30">
            {/* Lunch */}
            <div className="rounded-xl border border-line bg-card p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-bold text-amber-600 uppercase tracking-wide">
                    Daily Break
                  </span>
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-bold text-amber-700">
                    {context.timeLockConfig.lunchBreak.enabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <h4 className="mt-2 text-[14px] font-bold text-ink">University Lunch Break</h4>
                <p className="mt-1 text-[12px] text-muted leading-relaxed">
                  Locked daily period where no lectures or practicals may take place. 2-hour classes cannot start right before this hour.
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
                <span className="font-semibold text-muted">Break Hour:</span>
                <span className="font-bold text-amber-800">
                  {context.timeLockConfig.lunchBreak.slot} – {getEndSlot(context.timeLockConfig.lunchBreak.slot, context.timeLockConfig.lunchBreak.duration)}
                </span>
              </div>
            </div>

            {/* Wednesday */}
            {(() => {
              const wedClosing = context.timeLockConfig.earlyClosings.find((c) => c.day === "Wed");
              return (
                <div className="rounded-xl border border-line bg-card p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-bold text-blue-600 uppercase tracking-wide">
                        Wednesday
                      </span>
                      <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-bold text-blue-700">
                        {wedClosing?.enabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <h4 className="mt-2 text-[14px] font-bold text-ink">Midweek Fellowship Closing</h4>
                    <p className="mt-1 text-[12px] text-muted leading-relaxed">
                      Lectures conclude early on Wednesdays for student fellowship, chapel life, and sports.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
                    <span className="font-semibold text-muted">Concludes by:</span>
                    <span className="font-bold text-blue-800">
                      {wedClosing?.cutoffSlot || "17:00"}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Friday */}
            {(() => {
              const friClosing = context.timeLockConfig.earlyClosings.find((c) => c.day === "Fri");
              return (
                <div className="rounded-xl border border-line bg-card p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[10.5px] font-bold text-violet uppercase tracking-wide">
                        Friday
                      </span>
                      <span className="rounded bg-violet-soft px-2 py-0.5 text-[10.5px] font-bold text-violet">
                        {friClosing?.enabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <h4 className="mt-2 text-[14px] font-bold text-ink">Friday Sabbath Closing</h4>
                    <p className="mt-1 text-[12px] text-muted leading-relaxed">
                      Academic activities conclude early on Fridays in preparation for the Sabbath and weekend transition.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
                    <span className="font-semibold text-muted">Concludes by:</span>
                    <span className="font-bold text-violet">
                      {friClosing?.cutoffSlot || "13:00"}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Daily Band: Standard Teaching Hours (Configured on Backend) */}
            <div className="rounded-xl border border-line bg-card p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-bold text-emerald-600 uppercase tracking-wide">
                    Mon – Thu
                  </span>
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">
                    {context.timeLockConfig.operatingWindow.startSlot} – {context.timeLockConfig.operatingWindow.endSlot}
                  </span>
                </div>
                <h4 className="mt-2 text-[14px] font-bold text-ink">Standard Teaching Hours</h4>
                <p className="mt-1 text-[12px] text-muted leading-relaxed">
                  Daily university operating window. Regular class lectures and practicals are scheduled within these approved hours.
                </p>
              </div>
              <div className="mt-3 border-t border-line/60 pt-2">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="font-semibold text-muted">Operating Band:</span>
                  <span className="font-mono text-[10.5px] font-bold text-emerald-700">
                    {context.timeLockConfig.operatingWindow.startSlot} – {context.timeLockConfig.operatingWindow.endSlot}
                  </span>
                </div>
                <p className="text-[10.5px] text-muted leading-tight">
                  Locked institutional policy configured on the backend administration panel.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-line bg-card/60 px-5 py-2.5 text-[12px] text-muted flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lock size={13} className="text-muted shrink-0" />
              <span>
                <strong>Locked Institutional Policy:</strong> University operational hours and locked break periods are configured on the backend administration panel.
              </span>
            </div>
            <span className="rounded bg-panel px-2 py-0.5 text-[10.5px] font-semibold text-subink border border-line">
              Backend Admin Configured
            </span>
          </div>
        </Card>

        {/* Section 2: Schoolwide Chapel Seminar & Citizenship Orientation Schedule */}
        <Card className="flex flex-col">
          <CardHead
            icon={<ShieldCheck size={17} />}
            title="University Chapel Seminar & Orientation Schedule"
            sub="Mandatory weekly seminar attended together by all departments in the University Amphitheatre"
            action={
              isAcadPlanningTO ? (
                <Pill tone="brand">
                  <Settings2 size={11} className="inline mr-1" /> Editable by Acad Planning
                </Pill>
              ) : (
                <Pill tone="good">Schoolwide Attendance</Pill>
              )
            }
          />
          <div className="p-5 space-y-4">
            <div className="rounded-xl border border-line bg-brand-soft/20 p-3.5 text-[12.5px] text-subink flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white font-bold text-[11px]">
                  ✓
                </span>
                <span>
                  <strong>University Amphitheatre (Capacity: 2,500)</strong> · Coordinator: <strong>Pastor Chilaka Uzoma</strong>. All departments for each academic level attend together without clashing.
                </span>
              </div>
              <Pill tone="neutral">All Students in Level</Pill>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {(["100 Level", "200 Level", "300 Level", "400 Level"] as const).map((lvl, index) => {
                const colors = ["bg-brand", "bg-blue-500", "bg-violet", "bg-emerald-500"];
                const textColors = ["text-brand", "text-blue-600", "text-violet", "text-emerald-600"];
                const item = context.timeLockConfig?.chapelSeminarSchedule?.[lvl];

                // Normalization helpers so options always match without blank select displays
                const rawDay = item?.day;
                const dayMap: Record<string, (typeof days)[number]> = {
                  mon: "Mon", monday: "Mon",
                  tue: "Tue", tuesday: "Tue",
                  wed: "Wed", wednesday: "Wed",
                  thu: "Thu", thursday: "Thu",
                  fri: "Fri", friday: "Fri",
                };
                const fallbackDay = index === 0 ? "Mon" : index === 1 ? "Tue" : index === 2 ? "Wed" : "Thu";
                const activeDay = (rawDay ? dayMap[rawDay.trim().toLowerCase()] || rawDay : fallbackDay) as (typeof days)[number];

                const rawSlot = item?.slot;
                const cleanSlot = rawSlot
                  ? (rawSlot.trim().length === 4 && rawSlot.trim()[1] === ":" ? `0${rawSlot.trim()}` : rawSlot.trim().slice(0, 5))
                  : "09:00";
                const activeSlot = (slots.includes(cleanSlot as any) ? cleanSlot : "09:00") as (typeof slots)[number];

                return (
                  <div key={lvl} className="rounded-xl border border-line bg-card p-4 relative flex flex-col justify-between min-w-0 shadow-2xs">
                    <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${colors[index]}`} />
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="text-[13px] font-bold text-ink shrink-0">{lvl}</span>
                        <span className={`rounded bg-panel px-2 py-0.5 text-[11px] font-bold shrink-0 ${textColors[index]}`}>
                          {activeDay} {activeSlot}
                        </span>
                      </div>
                      <p className="mt-2 text-[12.5px] font-bold text-ink truncate">{item?.code || "BU-GST Seminar"}</p>
                      <p className="text-[11.5px] text-muted line-clamp-1">{item?.title || "Chapel Seminar"}</p>
                      <div className="mt-3 space-y-1 text-[11px] text-subink pt-2 border-t border-line">
                        <p className="truncate">📍 {item?.venue || "University Amphitheatre"}</p>
                        <p className="truncate">👤 {item?.lecturer || "Pastor Chilaka Uzoma"}</p>
                        <p className="truncate">👥 All {lvl} Students</p>
                      </div>
                    </div>
                    {isAcadPlanningTO ? (
                      <div className="mt-4 pt-3 border-t border-line/60 min-w-0">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-muted mb-1.5 min-w-0">
                          <span className="shrink-0">Adjust Window:</span>
                          <span className="font-mono text-[10.5px] font-bold text-ink shrink-0">
                            {activeDay} · {activeSlot}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="min-w-0">
                            <label className="block text-[9.5px] font-bold uppercase tracking-wider text-muted mb-1 truncate">
                              Day
                            </label>
                            <CustomSelect
                              value={activeDay}
                              onChange={(e) => context.updateChapelSlot(lvl, e.target.value as any, activeSlot)}
                              className="h-8.5 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-[12px] font-semibold text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
                            >
                              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </CustomSelect>
                          </div>
                          <div className="min-w-0">
                            <label className="block text-[9.5px] font-bold uppercase tracking-wider text-muted mb-1 truncate">
                              Time Slot
                            </label>
                            <CustomSelect
                              value={activeSlot}
                              onChange={(e) => context.updateChapelSlot(lvl, activeDay, e.target.value as any)}
                              className="h-8.5 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-[12px] font-semibold text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
                            >
                              {slots
                                .filter((s) => s !== "17:00")
                                .map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                            </CustomSelect>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between text-[11px] text-muted">
                        <span>Chapel Window:</span>
                        <span className="font-bold text-ink">
                          {activeDay} at {activeSlot}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[12px] text-muted">
              <div className="rounded-xl border border-line bg-panel/50 p-3">
                <span className="font-semibold text-subink">✨ Automatically Scheduled:</span> The system automatically ensures chapel seminar appears on every active level's timetable.
              </div>
              <div className="rounded-xl border border-line bg-panel/50 p-3">
                <span className="font-semibold text-subink">🛡️ Preceding Hour Rule:</span> 2-hour classes for that level cannot start directly before chapel to prevent class overlap.
              </div>
              <div className="rounded-xl border border-line bg-panel/50 p-3">
                <span className="font-semibold text-subink">🤝 Shared Venue:</span> All departments attend together in the Amphitheatre without creating room or lecturer clashes.
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2B: Departmental Locked Periods & Custom Blackouts */}
        <Card className="flex flex-col">
          <CardHead
            icon={<Lock size={17} />}
            title="Departmental Locked Periods & Assemblies"
            sub="Recurring time windows reserved exclusively for departmental meetings, student assemblies, or faculty seminars"
            action={
              <Button variant="outline" onClick={() => setShowLockModal(true)}>
                <Plus size={14} /> Add Locked Period
              </Button>
            }
          />
          <div className="p-5">
            {context.timeLockConfig.customTimeLocks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-6 text-center text-muted">
                <Lock size={22} className="mx-auto mb-2 text-muted/50" />
                <p className="text-[13px] font-semibold text-subink">No custom locked periods set</p>
                <p className="text-[12px] text-muted mt-0.5">
                  You can lock recurring time blocks for {context.currentProgram} (such as weekly mentorship hour or department meeting).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {context.timeLockConfig.customTimeLocks.map((lock) => (
                  <div key={lock.id} className="rounded-xl border border-line bg-card p-3.5 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-bold text-ink">{lock.title}</span>
                        <button
                          onClick={() => context.toggleCustomTimeLock(lock.id)}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase cursor-pointer transition ${
                            lock.enabled ? "bg-good-soft text-good hover:bg-good-soft/80" : "bg-panel text-muted hover:bg-line"
                          }`}
                        >
                          {lock.enabled ? "Active" : "Off"}
                        </button>
                      </div>
                      <p className="text-[12px] text-muted mt-1 leading-relaxed">
                        {lock.reason || "Reserved time period"}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-subink">
                      <span>
                        <strong>{lock.day}</strong> at <strong>{lock.slot}</strong> ({lock.duration}h) · {lock.level || "All"}
                      </span>
                      <button
                        onClick={() => context.deleteCustomTimeLock(lock.id)}
                        className="text-muted hover:text-bad transition cursor-pointer p-1"
                        title="Remove locked period"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Section 2C: Departmental Events & Activities (Semester-Specific Milestones) */}
        <Card className="flex flex-col">
          <CardHead
            icon={<PartyPopper size={17} />}
            title={`Departmental Events & Activities — ${context.currentProgram}`}
            sub="Milestone events such as Departmental Week, Tech Expo, Hackathon, and Symposium. Adding events provides clear planning without disrupting your semester-wide lecture timetable."
            action={
              <Button onClick={() => setShowEventModal(true)}>
                <Plus size={14} /> Add Departmental Event
              </Button>
            }
          />
          <div className="p-5 space-y-4">
            <div className="rounded-xl border border-line bg-panel/50 p-3.5 text-[12.5px] text-subink flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white font-bold text-[11px]">
                  ℹ
                </span>
                <span>
                  <strong>Calendar Milestones Notice:</strong> Departmental events occur during specific weeks or dates of the semester. They provide visibility for students and faculty while leaving your semester-wide lecture timetable fully intact.
                </span>
              </div>
              <Pill tone="brand">{currentDeptEvents.length} Events Registered</Pill>
            </div>

            {currentDeptEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-8 text-center text-muted">
                <PartyPopper size={28} className="mx-auto mb-2 text-muted/50" />
                <p className="text-[14px] font-bold text-ink">No departmental events scheduled yet</p>
                <p className="text-[12.5px] text-muted mt-1 max-w-md mx-auto">
                  Add semester milestones like NACOS/ACES Departmental Week, freshers welcome fellowship, or annual project symposium.
                </p>
                <Button onClick={() => setShowEventModal(true)} className="mt-4">
                  <Plus size={14} /> Add First Event
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {currentDeptEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="rounded-xl border border-line bg-card p-4 flex flex-col justify-between shadow-2xs relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-brand" />
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                          {evt.category}
                        </span>
                        <span className="text-[11.5px] font-semibold text-muted bg-panel px-2 py-0.5 rounded border border-line">
                          {evt.week}
                        </span>
                      </div>
                      <h4 className="mt-2 text-[15px] font-bold text-ink">{evt.title}</h4>
                      <p className="mt-1 text-[12.5px] text-muted leading-relaxed">
                        {evt.description}
                      </p>
                      {evt.advisoryNote && (
                        <div className="mt-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-[11px] text-amber-800">
                          <strong>Advisory:</strong> {evt.advisoryNote}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-line flex items-center justify-between text-[11.5px] text-subink">
                      <div className="space-y-0.5">
                        <p>📍 {evt.venue || "Campus / Departmental Hall"}</p>
                        <p>👥 {evt.level || "All Levels"} · ⏱ {evt.timeRange || evt.day || "Scheduled Time"}</p>
                      </div>
                      <button
                        onClick={() => context.deleteDepartmentalEvent(evt.id)}
                        className="rounded-lg p-1.5 text-muted hover:bg-panel hover:text-bad transition cursor-pointer"
                        title="Delete event"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Section 3: Course Credit Hours & Class Spacing */}
        <Card className="flex flex-col">
          <CardHead
            icon={<Layers size={17} />}
            title="Course Credit Hours & Class Spacing Guidelines"
            sub="How weekly teaching hours are divided and scheduled across weekdays"
            action={<Pill tone="neutral">Class Guidelines</Pill>}
          />
          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-3 bg-panel/30">
            {/* Unit split */}
            <div className="rounded-xl border border-line bg-card p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="rounded bg-brand-soft px-2 py-0.5 text-[10.5px] font-bold text-brand uppercase">
                  Class Duration
                </span>
                <span className="text-[11px] text-muted font-semibold">Weekly Hours</span>
              </div>
              <h4 className="text-[14px] font-bold text-ink">Hours per Course</h4>
              <ul className="space-y-1.5 text-[12px] text-muted">
                <li className="flex items-center justify-between">
                  <span>1-Unit Course:</span>
                  <strong className="text-subink">1 class of 1 hour per week</strong>
                </li>
                <li className="flex items-center justify-between">
                  <span>2-Unit Course:</span>
                  <strong className="text-subink">1 class of 2 hours per week</strong>
                </li>
                <li className="flex items-center justify-between">
                  <span>3-Unit Course:</span>
                  <strong className="text-subink">1× 2h + 1× 1h (on separate days)</strong>
                </li>
                <li className="flex items-center justify-between">
                  <span>4-Unit Course:</span>
                  <strong className="text-subink">2 classes of 2 hours each</strong>
                </li>
              </ul>
            </div>

            {/* Day separation */}
            <div className="rounded-xl border border-line bg-card p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="rounded bg-brand-soft px-2 py-0.5 text-[10.5px] font-bold text-brand uppercase">
                  Day Spacing
                </span>
                <span className="text-[11px] text-muted font-semibold">Avoid Fatigue</span>
              </div>
              <h4 className="text-[14px] font-bold text-ink">Class Day Spacing</h4>
              <p className="text-[12px] text-muted leading-relaxed">
                Courses that meet more than once a week are scheduled on <strong className="text-subink">separate calendar days</strong> so students are not overwhelmed on a single day.
              </p>
              <div className="pt-2 border-t border-line text-[11.5px] text-subink">
                <strong>Standard 2-Hour Blocks:</strong> 8:00–10:00 AM, 10:00–12:00 PM, 2:00–4:00 PM, 4:00–6:00 PM.
              </div>
            </div>

            {/* Groups */}
            <div className="rounded-xl border border-line bg-card p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="rounded bg-brand-soft px-2 py-0.5 text-[10.5px] font-bold text-brand uppercase">
                  Student Groups
                </span>
                <span className="text-[11px] text-muted font-semibold">Keep Groups</span>
              </div>
              <h4 className="text-[14px] font-bold text-ink">Class Groups & Cohorts</h4>
              <p className="text-[12px] text-muted leading-relaxed">
                Official departmental class groups (<code className="text-[11px] bg-panel px-1 rounded text-ink">Group A</code>, <code className="text-[11px] bg-panel px-1 rounded text-ink">Group B</code>) are scheduled independently without combined groupings.
              </p>
              <div className="pt-2 border-t border-line text-[11.5px] text-subink">
                Different groups taking different courses can meet at the same time in separate classrooms.
              </div>
            </div>
          </div>
        </Card>

        {/* Section 4: Resource & Faculty Availability Snapshots Grid */}
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
                    Operating Band
                  </p>
                  <p className="text-[13px] font-semibold text-subink mt-0.5">
                    07:00 – 18:00
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
                  Space Sharing:
                </span>{" "}
                External bookings from other submitted school departments are reserved automatically.
              </div>
            </div>

            <div className="border-t border-line px-5 py-3.5">
              <button
                onClick={() => navigateToView("venues", "/venues")}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline cursor-pointer"
              >
                Review Room Schedules →
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
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline cursor-pointer"
              >
                Review Course Allocations →
              </button>
            </div>
          </Card>

          {/* Snapshot 3: Active Constraints */}
          <Card className="flex flex-col">
            <CardHead
              icon={<Users size={17} />}
              title="Lecturer Scheduling Rules"
              sub={`${localConstraints.length} rules active`}
              action={<Pill tone="warn">{localConstraints.length} Active</Pill>}
            />
            <div className="flex-1 space-y-3 px-5 pb-5">
              <div className="flex flex-wrap gap-2 rounded-xl bg-panel/70 p-3 text-center">
                {Array.from(new Set(localConstraints.map((c) => c.kind))).slice(0, 4).map((kind) => (
                  <div key={kind} className="flex-1 min-w-[70px]">
                    <p className="text-[10px] font-semibold uppercase text-muted truncate" title={kind}>
                      {kind}
                    </p>
                    <p className="text-[15px] font-bold text-ink">
                      {localConstraints.filter((c) => c.kind === kind).length}
                    </p>
                  </div>
                ))}
                {localConstraints.length === 0 && (
                  <div className="flex-1 text-center py-1 text-[12px] text-muted">
                    No active rules recorded
                  </div>
                )}
              </div>

              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                Rules Enforced
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
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline cursor-pointer"
              >
                Review Scheduling Rules →
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
                  Ready to Build Department Timetable
                </h3>
                <p className="mt-0.5 text-[13px] text-muted">
                  All university hours, chapel periods, course hours, and lecturer teaching preferences will be used to create a conflict-free timetable for {context.currentProgram}.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {localSessions.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setScreenMode("generated")}
                >
                  <ArrowLeft size={16} /> Back to Timetable
                </Button>
              )}
              <Button
                className="px-5 py-3 text-[14px]"
                onClick={handleProceedToGenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Building Schedule…
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> {localSessions.length > 0 ? "Regenerate Timetable" : "Generate Timetable"}{" "}
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
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-brand/30 bg-card px-4 py-3 text-[13px] font-semibold text-ink shadow-2xl bp-fade">
          <CheckCircle2 size={16} className="text-brand shrink-0" />
          <span>{toastMessage}</span>
          {historyStack.length > 0 && (
            <button
              onClick={handleUndo}
              className="ml-2 flex items-center gap-1 rounded-lg bg-panel hover:bg-brand/10 text-brand px-2.5 py-1 text-[12px] font-bold transition cursor-pointer border border-line"
            >
              <RotateCcw size={12} /> Undo
            </button>
          )}
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
                <CheckCircle2 size={12} /> 0 Clashes · All Rules Met
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-bad-soft px-2.5 py-0.5 text-[11.5px] font-bold text-bad animate-pulse">
                <AlertTriangle size={12} /> {conflicts.length} Clashes Found
              </span>
            )}
            <button
              onClick={handleManualConstraintCheck}
              disabled={isCheckingConstraints}
              className="ml-1 rounded-md border border-line px-2 py-0.5 text-[11.5px] font-semibold text-ink hover:bg-panel transition cursor-pointer flex items-center gap-1"
              title="Check for time or room clashes"
            >
              {isCheckingConstraints ? (
                <>
                  <Loader2 size={11} className="animate-spin text-brand" />
                  <span className="text-muted">Checking…</span>
                </>
              ) : (
                <>
                  <RefreshCw size={11} className="text-muted" />
                  <span>Verify</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Controls: Events, Constraints, Regenerate & Submit */}
        <div className="flex flex-wrap items-center gap-2">
          {historyStack.length > 0 && !isSubmitted && (
            <Button
              variant="outline"
              onClick={handleUndo}
              className="border-brand/40 text-brand bg-brand-soft/40 hover:bg-brand-soft text-[12.5px]"
              title={`Undo: ${historyStack[0].description}`}
            >
              <RotateCcw size={13} /> Undo Move
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setShowEventsDrawer(true)}
            title="View and schedule departmental events like Departmental Week, Hackathons, or Symposiums"
          >
            <CalendarDays size={14} /> Department Events
            {currentDeptEvents.length > 0 && (
              <span className="ml-1.5 rounded-full bg-brand/10 px-1.5 py-0.2 text-[10.5px] font-bold text-brand">
                {currentDeptEvents.length}
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setScreenMode("snapshot")}
            title="View university hours, break times, and class guidelines"
          >
            <SlidersHorizontal size={14} /> Constraints
          </Button>

          {/* Export Timetable Dropdown (C1) */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Export timetable as CSV or Printable PDF"
              className="cursor-pointer"
            >
              <Download size={14} /> Export{" "}
              <ChevronDown size={12} className="text-muted" />
            </Button>

            {showExportMenu && (
              <div className="dropdown-surface absolute right-0 z-50 mt-2 w-52 space-y-0.5 p-1.5">
                <button
                  onClick={() => {
                    exportToCsv(localSessions, {
                      department: currentDept,
                      level: selectedLevel !== "all" ? selectedLevel : undefined,
                      semester: "First Semester",
                      status,
                    });
                    setShowExportMenu(false);
                  }}
                  className="dropdown-item flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12.5px] font-medium text-ink transition-colors cursor-pointer"
                >
                  <FileSpreadsheet size={15} className="text-good" />
                  <span>Download CSV (.csv)</span>
                </button>
                <button
                  onClick={() => {
                    printTimetablePdf(localSessions, {
                      department: currentDept,
                      level: selectedLevel !== "all" ? selectedLevel : undefined,
                      semester: "First Semester",
                      status,
                    });
                    setShowExportMenu(false);
                  }}
                  className="dropdown-item flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12.5px] font-medium text-ink transition-colors cursor-pointer"
                >
                  <Printer size={15} className="text-brand" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            )}
          </div>

          {!isSubmitted && (
            <>
              <Button
                variant="outline"
                disabled={isRegenerating || context.isSavingDraft}
                onClick={handleManualSaveDraft}
                title="Save current draft schedule"
              >
                {context.isSavingDraft ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Save size={15} /> Save Draft
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                disabled={isRegenerating || context.isSavingDraft}
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
            <Pill tone={status === "Published" ? "brand" : "good"}>
              {status === "Published" ? <Globe size={12} /> : <CheckCircle2 size={12} />} {status}
            </Pill>
          )}
        </div>
      </div>

      {/* Upcoming Departmental Event Alert Banner */}
      {currentDeptEvents.length > 0 && (
        <div className="rounded-2xl border border-brand/20 bg-gradient-to-r from-brand-soft/60 via-panel to-brand-soft/30 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-xs">
              <PartyPopper size={18} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-bold text-ink">
                  {currentDeptEvents[0].title}
                </span>
                <span className="rounded bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
                  {currentDeptEvents[0].week}
                </span>
                <span className="rounded bg-card px-2 py-0.5 text-[10.5px] font-semibold text-muted border border-line">
                  {currentDeptEvents[0].category}
                </span>
              </div>
              <p className="text-[12px] text-muted mt-0.5">
                {currentDeptEvents[0].description} · <em className="text-subink">Does not alter semester-wide lecture timetable.</em>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEventsDrawer(true)}
              className="rounded-xl border border-line bg-card px-3 py-1.5 text-[12px] font-semibold text-subink hover:bg-panel transition cursor-pointer"
            >
              View All Events ({currentDeptEvents.length})
            </button>
            <button
              onClick={() => setShowEventModal(true)}
              className="rounded-xl bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand/90 transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Event
            </button>
          </div>
        </div>
      )}

      {/* Sub-toolbar: Perspective-specific filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Cohort Perspective Filters */}
          {perspective === "cohort" && (
            <div className="flex items-center gap-2">
              <CustomSelect
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="h-8.5 rounded-xl border border-line bg-card px-3 text-[12px] font-semibold text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
              >
                <option value="all">All Levels</option>
                <option value="100 Level">100 Level</option>
                <option value="200 Level">200 Level</option>
                <option value="300 Level">300 Level</option>
                <option value="400 Level">400 Level</option>
              </CustomSelect>
              <CustomSelect
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="h-8.5 rounded-xl border border-line bg-card px-3 text-[12px] font-semibold text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
              >
                <option value="all">All Sub-groups</option>
                <option value="Group A">Group A</option>
                <option value="Group B">Group B</option>
                <option value="Group C">Group C</option>
                <option value="Group D">Group D</option>
                <option value="Group E">Group E</option>
                <option value="Group F">Group F</option>
                <option value="Direct Entry">Direct Entry</option>
              </CustomSelect>
            </div>
          )}

          {/* Lecturer Perspective Filter */}
          {perspective === "lecturer" && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-muted">
                Lecturer:
              </span>
              <CustomSelect
                value={selectedLecturer}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedLecturer(val);
                  if (val !== "all" && mode === "cards") {
                    setMode("grid");
                  }
                }}
                className="h-8.5 max-w-[240px] rounded-xl border border-line bg-card px-3 text-[12px] font-semibold text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
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

          {/* Course Perspective Filter & Search */}
          {perspective === "course" && (
            <div className="flex items-center gap-2">
              <CustomSelect
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="h-8.5 rounded-xl border border-line bg-card px-3 text-[12px] font-semibold text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
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
                    {conflicts.length} Schedule Clash
                    {conflicts.length > 1 ? "es" : ""} Detected — Submission to
                    HOD Locked
                  </h4>
                  <p className="text-[12px] text-muted">
                    The timetable must have 0 room or lecturer clashes before submitting to the HOD.
                    Click <b>Jump & Edit</b> on any row to adjust the class room or time slot.
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-brand-soft/40 px-5 py-4">
          <div className="flex items-start gap-3">
            <Loader2 size={18} className="animate-spin text-brand shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <span className="text-[13.5px] font-semibold text-brand-ink">
                {generationProgress?.stage || "Updating timetable — checking classroom availability and lecture hours…"}
              </span>
              {generationProgress && (
                <div className="flex items-center gap-3 text-xs text-muted">
                  <div className="h-1.5 w-36 overflow-hidden rounded-full bg-brand/20">
                    <div
                      className="h-full bg-brand transition-all duration-200"
                      style={{ width: `${generationProgress.percent}%` }}
                    />
                  </div>
                  <span className="font-semibold text-brand">{generationProgress.percent}%</span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleCancelGeneration}
            className="shrink-0 border-rose-200 text-rose-700 hover:bg-rose-50 self-start sm:self-auto text-xs py-1.5 px-3"
          >
            <Ban size={14} className="mr-1" />
            Cancel
          </Button>
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
                      Department of {currentDept || "Unavailable"} · Teaching Load:{" "}
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
                        sub={`Dept. of ${currentDept || "Unavailable"} · ${lecAllocations.length} Course${
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
                <TimetableGrid
                  topScrollRef={topScrollRef}
                  tableContainerRef={tableContainerRef}
                  handleTopScroll={handleTopScroll}
                  handleMainScroll={handleMainScroll}
                  handleContainerDragLeave={handleContainerDragLeave}
                  scrollWidth={scrollWidth}
                  keyboardPickedSession={keyboardPickedSession}
                  handleCancelKeyboardMove={handleCancelKeyboardMove}
                  perspective={perspective}
                  selectedLecturer={selectedLecturer}
                  localConstraints={context.localConstraints}
                  timeLockConfig={context.timeLockConfig}
                  highlightCell={highlightCell}
                  cell={cell}
                  dragOverTarget={dragOverTarget}
                  draggedSession={draggedSession}
                  currentDropFeasibility={currentDropFeasibility}
                  viewDensity={viewDensity}
                  sessionIndexMap={sessionIndexMap}
                  handleDragEnter={handleDragEnter}
                  handleDragOver={handleDragOver}
                  handleDrop={handleDrop}
                  handleDragStart={handleDragStart}
                  handleDragEnd={handleDragEnd}
                  handleGridCellKeyDown={handleGridCellKeyDown}
                  handleSessionItemKeyDown={handleSessionItemKeyDown}
                  setCellDetail={setCellDetail}
                  handleOpenEdit={handleOpenEdit}
                  onCellFocus={(d, s) => {
                    if (keyboardPickedSession) {
                      dragOverRef.current = { day: d, slot: s };
                      setDragOverTarget({ day: d, slot: s });
                    }
                  }}
                />
              ) : (
                <div className="overflow-x-auto px-2 py-2" style={{ scrollbarWidth: "thin" }}>
                  <div className="min-w-[680px]">
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
                    Edit Class Schedule
                  </span>
                  <span className="text-[12px] text-muted">
                    {localSessions[editingSessionIndex].duration ?? 1} hour(s) class
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

            {isCitizenshipOrientationCourse(localSessions[editingSessionIndex]) && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
                <span className="font-bold">⚠️ University Chapel Seminar:</span> All {localSessions[editingSessionIndex].level} students attend this seminar together in the University Amphitheatre. Moving it from this hour will create a clash with mandatory chapel.
              </div>
            )}

            {/* Edit Controls */}
            <div className="space-y-4">
              {/* Day Selector */}
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-subink">
                  Day of the Week
                </label>
                <CustomSelect
                  value={editDay}
                  onChange={(e) => setEditDay(e.target.value as any)}
                  className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d === "Mon" && "Monday"}
                      {d === "Tue" && "Tuesday"}
                      {d === "Wed" && "Wednesday (Classes close at 5:00 PM)"}
                      {d === "Thu" && "Thursday"}
                      {d === "Fri" &&
                        "Friday (Half-day, classes close at 1:00 PM)"}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              {/* Time Slot Selector */}
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-subink">
                  Start Time Slot{" "}
                  {(localSessions[editingSessionIndex]?.duration ?? 1) === 2 &&
                    "(2-Hour Class)"}
                </label>
                <CustomSelect
                  value={editSlot}
                  onChange={(e) => setEditSlot(e.target.value as any)}
                  className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
                >
                  {slots.map((s) => {
                    const dur =
                      localSessions[editingSessionIndex]?.duration ?? 1;
                    const isTwoHour = dur === 2;
                    const end = getEndSlot(s, dur);

                    let label = `${s} – ${end}`;
                    let warning = "";

                    if (s === "13:00") {
                      warning = " [⚠️ University Lunch Break (1:00–2:00 PM)]";
                    } else if (isTwoHour && s === "12:00") {
                      warning = " [⚠️ Runs into 1:00 PM Lunch Break]";
                    } else if (isTwoHour && s === "11:00") {
                      warning = " [⚠️ Overlaps Standard 10:00–12:00 Period]";
                    } else if (
                      editDay === "Fri" &&
                      (s === "14:00" ||
                        s === "15:00" ||
                        s === "16:00" ||
                        s === "17:00")
                    ) {
                      warning = " [⚠️ Friday after 1:00 PM Closing]";
                    } else if (
                      editDay === "Wed" &&
                      (s === "17:00" || (isTwoHour && s === "16:00"))
                    ) {
                      warning = " [⚠️ Wednesday after 5:00 PM Closing]";
                    } else if (
                      isTwoHour &&
                      (s === "08:00" ||
                        s === "10:00" ||
                        s === "14:00" ||
                        s === "16:00")
                    ) {
                      warning = " [⭐ Standard 2h Period]";
                    }

                    return (
                      <option key={s} value={s}>
                        {label}
                        {warning}
                      </option>
                    );
                  })}
                </CustomSelect>
              </div>

              {/* Venue Selector */}
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-subink">
                  Assigned Classroom / Lab
                </label>
                <CustomSelect
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
                >
                  {venues.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} — {v.capacity} seats{" "}
                      {v.isVirtual
                        ? "[Online / LMS]"
                        : `(${v.spaceType ?? "shared"})`}
                    </option>
                  ))}
                </CustomSelect>
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
                        ? `Schedule Clash: ${editHypotheticalCheck.title ?? "Rule Conflict"}`
                        : "No Clashes Detected"}
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
              <b className="text-subink">
                {(() => {
                  const activeDept = context.currentProgram || context.currentUser?.department || "";
                  const hod = accounts.find((a) => a.role === "hod" && a.department?.toLowerCase() === activeDept.toLowerCase());
                  return hod?.name || "the Head of Department";
                })()} (HOD)
              </b> and the
              departmental status will transition to{" "}
              <b className="text-subink">Submitted to HOD</b>.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSubmitModal(false)} disabled={isSubmittingToHod}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmittingToHod}>
                {isSubmittingToHod ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}{" "}
                {isSubmittingToHod ? "Submitting..." : "Confirm submission"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────
          MODAL 1: ADD DEPARTMENTAL EVENT MODAL
          ─────────────────────────────────────────────────────────────────────────── */}
      {showEventModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="bp-fade w-full max-w-lg rounded-2xl border border-line bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-xs">
                  <PartyPopper size={18} />
                </span>
                <div>
                  <h3 className="text-[17px] font-bold text-ink">Add Departmental Event</h3>
                  <p className="text-[12px] text-muted">
                    Schedule Departmental Week, symposium, or orientation for {context.currentProgram}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEventModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-brand/20 bg-brand-soft/30 p-3 text-[12px] text-subink flex items-start gap-2">
              <Info size={16} className="text-brand shrink-0 mt-0.5" />
              <span>
                <strong>Timetable Safe:</strong> Departmental events apply only to specific weeks or dates. Adding an event will provide calendar planning for students and staff without disrupting your semester-wide lecture timetable.
              </span>
            </div>

            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {/* Event Title */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-subink">
                  Event Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. NACOS Annual Departmental Week & Tech Expo"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-[13px] font-medium text-ink outline-none focus:border-brand"
                />
              </div>

              {/* Category & Week Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-subink">
                    Category
                  </label>
                  <CustomSelect
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
                  >
                    <option value="Departmental Week">Departmental Week</option>
                    <option value="Symposium">Symposium</option>
                    <option value="Exhibition">Exhibition / Hackathon</option>
                    <option value="Fellowship">Fellowship / Praise Hour</option>
                    <option value="Orientation">Orientation / Freshers</option>
                    <option value="Special Lecture">Special Lecture / Keynote</option>
                  </CustomSelect>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-subink">
                    Semester Week *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Semester Week 8"
                    value={newEventWeek}
                    onChange={(e) => setNewEventWeek(e.target.value)}
                    className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-[12.5px] font-medium text-ink outline-none focus:border-brand"
                  />
                </div>
              </div>

              {/* Day & Time Range Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-subink">
                    Day / Span
                  </label>
                  <CustomSelect
                    value={newEventDay}
                    onChange={(e) => setNewEventDay(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
                  >
                    <option value="All Week">All Week (Mon – Fri)</option>
                    <option value="Mon">Monday</option>
                    <option value="Tue">Tuesday</option>
                    <option value="Wed">Wednesday</option>
                    <option value="Thu">Thursday</option>
                    <option value="Fri">Friday</option>
                  </CustomSelect>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-subink">
                    Time Window
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Full Day or 14:00 – 17:00"
                    value={newEventTimeRange}
                    onChange={(e) => setNewEventTimeRange(e.target.value)}
                    className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-[12.5px] font-medium text-ink outline-none focus:border-brand"
                  />
                </div>
              </div>

              {/* Target Level & Venue Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-subink">
                    Target Academic Level
                  </label>
                  <CustomSelect
                    value={newEventLevel}
                    onChange={(e) => setNewEventLevel(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
                  >
                    <option value="All Levels">All Levels</option>
                    <option value="100 Level">100 Level</option>
                    <option value="200 Level">200 Level</option>
                    <option value="300 Level">300 Level</option>
                    <option value="400 Level">400 Level</option>
                  </CustomSelect>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-subink">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BUC Auditorium / Computing Labs"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-[12.5px] font-medium text-ink outline-none focus:border-brand"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-subink">
                  Event Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Details of student activities, competitions, or special guest speakers..."
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  className="w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-[12.5px] font-medium text-ink outline-none focus:border-brand"
                />
              </div>

              {/* Advisory Note */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-subink">
                  Lecture Advisory Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lectures for Friday afternoon may be adjusted for student hackathon"
                  value={newEventAdvisory}
                  onChange={(e) => setNewEventAdvisory(e.target.value)}
                  className="w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-[12.5px] font-medium text-ink outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-line/60 pt-4">
              <Button variant="outline" onClick={() => setShowEventModal(false)}>
                Cancel
              </Button>
              <Button
                disabled={!newEventTitle.trim() || !newEventWeek.trim()}
                onClick={() => {
                  context.addDepartmentalEvent({
                    title: newEventTitle.trim(),
                    department: context.currentProgram,
                    category: newEventCategory,
                    week: newEventWeek.trim(),
                    day: newEventDay as any,
                    timeRange: newEventTimeRange.trim() || undefined,
                    venue: newEventVenue.trim() || "Departmental Building",
                    level: newEventLevel,
                    description: newEventDescription.trim() || "Annual departmental event.",
                    advisoryNote: newEventAdvisory.trim() || undefined,
                  });
                  setNewEventTitle("");
                  setNewEventDescription("");
                  setNewEventAdvisory("");
                  setShowEventModal(false);
                  setToastMessage("Departmental event added successfully!");
                  setTimeout(() => setToastMessage(null), 3000);
                }}
              >
                <Plus size={15} /> Save Event
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────
          MODAL 2: ADD CUSTOM TIME LOCK MODAL
          ─────────────────────────────────────────────────────────────────────────── */}
      {showLockModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs"
          onClick={() => setShowLockModal(false)}
        >
          <div
            className="bp-fade w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet text-white shadow-xs">
                  <Lock size={18} />
                </span>
                <div>
                  <h3 className="text-[17px] font-bold text-ink">Add Locked Time Period</h3>
                  <p className="text-[12px] text-muted">
                    Lock a recurring time block for {context.currentProgram}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLockModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-subink">
                  Title / Assembly Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Department Faculty Meeting or Mentorship Hour"
                  value={newLockTitle}
                  onChange={(e) => setNewLockTitle(e.target.value)}
                  className="w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-[13px] font-medium text-ink outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-subink">
                    Day of Week
                  </label>
                  <CustomSelect
                    value={newLockDay}
                    onChange={(e) => setNewLockDay(e.target.value as any)}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-subink">
                    Start Time Slot
                  </label>
                  <CustomSelect
                    value={newLockSlot}
                    onChange={(e) => setNewLockSlot(e.target.value as any)}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
                  >
                    {slots.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-subink">
                    Duration
                  </label>
                  <CustomSelect
                    value={newLockDuration}
                    onChange={(e) => setNewLockDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                  </CustomSelect>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-subink">
                    Applies To
                  </label>
                  <CustomSelect
                    value={newLockLevel}
                    onChange={(e) => setNewLockLevel(e.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
                  >
                    <option value="All Levels">All Levels</option>
                    <option value="100 Level">100 Level</option>
                    <option value="200 Level">200 Level</option>
                    <option value="300 Level">300 Level</option>
                    <option value="400 Level">400 Level</option>
                  </CustomSelect>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-subink">
                  Reason / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekly departmental staff and student colloquium"
                  value={newLockReason}
                  onChange={(e) => setNewLockReason(e.target.value)}
                  className="w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-[12.5px] font-medium text-ink outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-line/60 pt-4">
              <Button variant="outline" onClick={() => setShowLockModal(false)}>
                Cancel
              </Button>
              <Button
                disabled={!newLockTitle.trim()}
                onClick={() => {
                  context.addCustomTimeLock({
                    title: newLockTitle.trim(),
                    day: newLockDay,
                    slot: newLockSlot,
                    duration: newLockDuration,
                    level: newLockLevel,
                    department: context.currentProgram,
                    reason: newLockReason.trim() || undefined,
                    enabled: true,
                  });
                  setNewLockTitle("");
                  setNewLockReason("");
                  setShowLockModal(false);
                  setToastMessage("Locked time period added!");
                  setTimeout(() => setToastMessage(null), 3000);
                }}
              >
                <Plus size={15} /> Save Locked Period
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────
          MODAL 3: DEPARTMENTAL EVENTS DRAWER / CALENDAR MODAL
          ─────────────────────────────────────────────────────────────────────────── */}
      {showEventsDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs"
          onClick={() => setShowEventsDrawer(false)}
        >
          <div
            className="bp-fade w-full max-w-2xl rounded-2xl border border-line bg-card p-6 shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-xs">
                  <CalendarDays size={18} />
                </span>
                <div>
                  <h3 className="text-[17px] font-bold text-ink">
                    Departmental Events Calendar — {context.currentProgram}
                  </h3>
                  <p className="text-[12px] text-muted">
                    Scheduled milestone activities during the semester
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setShowEventsDrawer(false);
                    setShowEventModal(true);
                  }}
                >
                  <Plus size={14} /> Add Event
                </Button>
                <button
                  onClick={() => setShowEventsDrawer(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {currentDeptEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line p-8 text-center text-muted">
                  <PartyPopper size={32} className="mx-auto mb-2 text-muted/50" />
                  <p className="text-[14px] font-bold text-ink">No departmental events scheduled</p>
                  <p className="text-[12.5px] text-muted mt-1">
                    Add milestone events such as Departmental Week, symposiums, or freshers orientation.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => {
                      setShowEventsDrawer(false);
                      setShowEventModal(true);
                    }}
                  >
                    <Plus size={14} /> Add Event
                  </Button>
                </div>
              ) : (
                currentDeptEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="rounded-xl border border-line bg-panel/30 p-4 flex flex-col justify-between transition hover:border-brand/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                          {evt.category}
                        </span>
                        <span className="rounded bg-card px-2 py-0.5 text-[11px] font-semibold text-muted border border-line">
                          {evt.week}
                        </span>
                      </div>
                      <button
                        onClick={() => context.deleteDepartmentalEvent(evt.id)}
                        className="rounded-lg p-1 text-muted hover:bg-panel hover:text-bad transition cursor-pointer"
                        title="Delete event"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <h4 className="mt-2 text-[14.5px] font-bold text-ink">{evt.title}</h4>
                    <p className="mt-1 text-[12.5px] text-muted leading-relaxed">
                      {evt.description}
                    </p>

                    {evt.advisoryNote && (
                      <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] text-amber-800">
                        <strong>Advisory:</strong> {evt.advisoryNote}
                      </div>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-line/60 flex items-center justify-between text-[11px] text-subink">
                      <span>📍 {evt.venue || "Department Building"}</span>
                      <span>👥 {evt.level || "All Levels"} · ⏱ {evt.timeRange || evt.day || "Scheduled Time"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-[12px] text-muted">
              <span>
                💡 Events span individual weeks and do not disturb the semester timetable.
              </span>
              <Button variant="outline" onClick={() => setShowEventsDrawer(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
