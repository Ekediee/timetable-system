"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  sessions,
  constraints,
  timeline,
  deptSubmissions,
  auditLog,
  allocations,
  venues,
  universityAllocations,
  type Status,
  type Session,
  type Constraint,
  type TimelineStep,
  type UserAccount,
  type DeptSubmission,
  type AuditEntry,
  type Allocation,
  type Venue,
  type ExternalBooking,
  type DynamicTimeLockConfig,
  defaultTimeLockConfig,
  type CustomTimeLock,
  type DepartmentalEvent,
  initialDepartmentalEvents,
  type ConstraintTypeDefinition,
  defaultConstraintTypes,
  constraintArchetypeTemplates,
  days,
  slots,
} from "./data";
import { generateTimetable } from "./engine";
import { authApi, timetableApi, allocationsApi, getStoredToken } from "./api";

function nowLabel() {
  const d = new Date();
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${month} ${day}, ${h}:${m}`;
}

export interface DeptTimetableEntry {
  department: string;
  school: string;
  status: Status;
  sessions: Session[];
  timeline: TimelineStep[];
  updatedAt: string;
}

interface AppContextType {
  currentUser: UserAccount | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  status: Status;
  setStatus: React.Dispatch<React.SetStateAction<Status>>;
  constraintsComplete: boolean;
  setConstraintsComplete: React.Dispatch<React.SetStateAction<boolean>>;
  localSessions: Session[];
  setLocalSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  localConstraints: Constraint[];
  setLocalConstraints: React.Dispatch<React.SetStateAction<Constraint[]>>;
  localVenues: Venue[];
  setLocalVenues: React.Dispatch<React.SetStateAction<Venue[]>>;
  localAllocations: Allocation[];
  setLocalAllocations: React.Dispatch<React.SetStateAction<Allocation[]>>;
  externalBookings: ExternalBooking[];
  setExternalBookings: React.Dispatch<React.SetStateAction<ExternalBooking[]>>;
  deptTimetables: Record<string, DeptTimetableEntry>;
  getDepartmentTimetable: (dept: string) => DeptTimetableEntry | undefined;
  isLoadingBackend: boolean;
  isSavingDraft: boolean;
  currentProgram: string;
  setCurrentProgram: React.Dispatch<React.SetStateAction<string>>;
  localTimeline: TimelineStep[];
  setLocalTimeline: React.Dispatch<React.SetStateAction<TimelineStep[]>>;
  deptSubs: DeptSubmission[];
  setDeptSubs: React.Dispatch<React.SetStateAction<DeptSubmission[]>>;
  auditEntries: AuditEntry[];
  setAuditEntries: React.Dispatch<React.SetStateAction<AuditEntry[]>>;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeRevisionTarget: { code: string; day?: string; slot?: string } | null;
  setActiveRevisionTarget: React.Dispatch<
    React.SetStateAction<{ code: string; day?: string; slot?: string } | null>
  >;
  addAuditEntry: (partial: Omit<AuditEntry, "id" | "actor" | "at">) => void;
  handleLogin: (account: UserAccount) => void;
  handleLogout: () => void;
  loadDepartmentData: (deptName: string, schoolName?: string) => Promise<void>;
  switchDepartment: (deptName: string) => Promise<void>;
  saveTimetableDraft: (
    newStatus?: Status,
    customSessions?: Session[],
    department?: string
  ) => Promise<boolean>;
  updateTimetableStatus: (
    newStatus: Status,
    comment?: string,
    department?: string
  ) => Promise<boolean>;
  timeLockConfig: DynamicTimeLockConfig;
  setTimeLockConfig: React.Dispatch<React.SetStateAction<DynamicTimeLockConfig>>;
  updateTimeLockConfig: (updater: (prev: DynamicTimeLockConfig) => DynamicTimeLockConfig) => void;
  toggleLunchBreak: () => void;
  updateLunchBreak: (slot: (typeof slots)[number], duration?: number) => void;
  toggleEarlyClosing: (id: string) => void;
  updateEarlyClosing: (id: string, cutoffSlot: (typeof slots)[number]) => void;
  updateChapelSlot: (level: string, day: (typeof days)[number], slot: (typeof slots)[number]) => void;
  updateOperatingWindow: (startSlot: (typeof slots)[number], endSlot: (typeof slots)[number]) => void;
  addCustomTimeLock: (lock: Omit<CustomTimeLock, "id">) => void;
  deleteCustomTimeLock: (id: string) => void;
  toggleCustomTimeLock: (id: string) => void;

  departmentalEvents: DepartmentalEvent[];
  setDepartmentalEvents: React.Dispatch<React.SetStateAction<DepartmentalEvent[]>>;
  addDepartmentalEvent: (event: Omit<DepartmentalEvent, "id">) => void;
  updateDepartmentalEvent: (id: string, updates: Partial<DepartmentalEvent>) => void;
  deleteDepartmentalEvent: (id: string) => void;

  constraintTypes: ConstraintTypeDefinition[];
  setConstraintTypes: React.Dispatch<React.SetStateAction<ConstraintTypeDefinition[]>>;
  addConstraintType: (typeDef: Omit<ConstraintTypeDefinition, "id">) => void;
  updateConstraintType: (id: string, updates: Partial<ConstraintTypeDefinition>) => void;
  deleteConstraintType: (id: string) => void;
  toggleConstraintType: (id: string) => void;
  resetConstraintTypesToDefault: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function computeExternalBookings(
  deptName: string,
  timetablesMap: Record<string, DeptTimetableEntry>
): ExternalBooking[] {
  const result: ExternalBooking[] = [];
  const lockingStatuses: Status[] = [
    "Submitted to HOD",
    "Submitted to Dean",
    "Submitted to Acad Pl. T.O",
    "Published",
  ];

  const normalizedTarget = deptName.trim().toLowerCase();

  for (const [dept, entry] of Object.entries(timetablesMap)) {
    if (dept.trim().toLowerCase() === normalizedTarget) continue;
    if (lockingStatuses.includes(entry.status)) {
      for (const s of entry.sessions) {
        if (s.venue && s.day && s.slot) {
          result.push({
            venue: s.venue,
            day: s.day,
            slot: s.slot,
            duration: s.duration ?? 1,
            booked_by_department: dept,
            course_code: s.code,
            lecturer: s.lecturer,
          });
        }
      }
    }
  }

  return result;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeRevisionTarget, setActiveRevisionTarget] = useState<{
    code: string;
    day?: string;
    slot?: string;
  } | null>(null);
  const [status, setStatus] = useState<Status>("Draft generated");
  const [constraintsComplete, setConstraintsComplete] = useState(false);
  const [localConstraints, setLocalConstraints] = useState<Constraint[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("bupulse_academic_constraints");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return constraints;
  });

  // Sync localConstraints to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("bupulse_academic_constraints", JSON.stringify(localConstraints));
      } catch {}
    }
  }, [localConstraints]);

  // Dynamic Constraint Types Registry (Academic Planning managed)
  const [constraintTypes, setConstraintTypes] = useState<ConstraintTypeDefinition[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("bupulse_constraint_types");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return defaultConstraintTypes;
  });

  const addConstraintType = useCallback((typeDef: Omit<ConstraintTypeDefinition, "id">) => {
    const newId = `type-${Date.now()}`;
    const newType: ConstraintTypeDefinition = {
      ...typeDef,
      id: newId,
      isActive: true,
    };
    setConstraintTypes((prev) => {
      const next = [...prev, newType];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("bupulse_constraint_types", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  const updateConstraintType = useCallback((id: string, updates: Partial<ConstraintTypeDefinition>) => {
    setConstraintTypes((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("bupulse_constraint_types", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  const deleteConstraintType = useCallback((id: string) => {
    setConstraintTypes((prev) => {
      const target = prev.find((t) => t.id === id);
      if (target?.isSystemDefault) {
        return prev;
      }
      const next = prev.filter((t) => t.id !== id);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("bupulse_constraint_types", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  const toggleConstraintType = useCallback((id: string) => {
    setConstraintTypes((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("bupulse_constraint_types", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  const resetConstraintTypesToDefault = useCallback(() => {
    setConstraintTypes(defaultConstraintTypes);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("bupulse_constraint_types", JSON.stringify(defaultConstraintTypes));
      } catch {}
    }
  }, []);

  const [localVenues, setLocalVenues] = useState<Venue[]>(venues);
  const [localAllocations, setLocalAllocations] = useState<Allocation[]>(allocations);
  const [externalBookings, setExternalBookings] = useState<ExternalBooking[]>([]);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [currentProgram, setCurrentProgram] = useState<string>("Computer Science");
  const [localTimeline, setLocalTimeline] = useState<TimelineStep[]>(timeline);
  const [deptSubs, setDeptSubs] = useState<DeptSubmission[]>(deptSubmissions);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(auditLog);

  // Dynamic Time Lock Configuration State
  const [timeLockConfig, setTimeLockConfig] = useState<DynamicTimeLockConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("bupulse_timelock_config");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object") {
            return {
              ...defaultTimeLockConfig,
              ...parsed,
              lunchBreak: { ...defaultTimeLockConfig.lunchBreak, ...(parsed.lunchBreak || {}) },
              operatingWindow: { ...defaultTimeLockConfig.operatingWindow, ...(parsed.operatingWindow || {}) },
            };
          }
        }
      } catch {}
    }
    return defaultTimeLockConfig;
  });

  const updateTimeLockConfig = useCallback(
    (updater: (prev: DynamicTimeLockConfig) => DynamicTimeLockConfig) => {
      setTimeLockConfig((prev) => {
        const next = updater(prev);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("bupulse_timelock_config", JSON.stringify(next));
          } catch {}
        }
        return next;
      });
    },
    []
  );

  const toggleLunchBreak = useCallback(() => {
    updateTimeLockConfig((prev) => ({
      ...prev,
      lunchBreak: {
        ...prev.lunchBreak,
        enabled: !prev.lunchBreak.enabled,
      },
    }));
  }, [updateTimeLockConfig]);

  const updateLunchBreak = useCallback(
    (slot: (typeof slots)[number], duration: number = 1) => {
      updateTimeLockConfig((prev) => ({
        ...prev,
        lunchBreak: {
          ...prev.lunchBreak,
          slot,
          duration,
        },
      }));
    },
    [updateTimeLockConfig]
  );

  const toggleEarlyClosing = useCallback(
    (id: string) => {
      updateTimeLockConfig((prev) => ({
        ...prev,
        earlyClosings: prev.earlyClosings.map((ec) =>
          ec.id === id ? { ...ec, enabled: !ec.enabled } : ec
        ),
      }));
    },
    [updateTimeLockConfig]
  );

  const updateEarlyClosing = useCallback(
    (id: string, cutoffSlot: (typeof slots)[number]) => {
      updateTimeLockConfig((prev) => ({
        ...prev,
        earlyClosings: prev.earlyClosings.map((ec) =>
          ec.id === id ? { ...ec, cutoffSlot } : ec
        ),
      }));
    },
    [updateTimeLockConfig]
  );

  const updateChapelSlot = useCallback(
    (level: string, day: (typeof days)[number], slot: (typeof slots)[number]) => {
      updateTimeLockConfig((prev) => ({
        ...prev,
        chapelSeminarSchedule: {
          ...prev.chapelSeminarSchedule,
          [level]: {
            ...(prev.chapelSeminarSchedule[level] || {
              duration: 1,
              venue: "University Amphitheatre",
              lecturer: "Chilaka Uzoma",
              code: "BU-GST 011",
              title: "Citizenship Orientation & Chapel Seminar",
            }),
            day,
            slot,
          },
        },
      }));
    },
    [updateTimeLockConfig]
  );

  const updateOperatingWindow = useCallback(
    (startSlot: (typeof slots)[number], endSlot: (typeof slots)[number]) => {
      updateTimeLockConfig((prev) => ({
        ...prev,
        operatingWindow: {
          startSlot,
          endSlot,
        },
      }));
    },
    [updateTimeLockConfig]
  );

  const addCustomTimeLock = useCallback(
    (lock: Omit<CustomTimeLock, "id">) => {
      const newLock: CustomTimeLock = {
        ...lock,
        id: `lock-${Date.now()}`,
      };
      updateTimeLockConfig((prev) => ({
        ...prev,
        customTimeLocks: [...(prev.customTimeLocks || []), newLock],
      }));
    },
    [updateTimeLockConfig]
  );

  const deleteCustomTimeLock = useCallback(
    (id: string) => {
      updateTimeLockConfig((prev) => ({
        ...prev,
        customTimeLocks: (prev.customTimeLocks || []).filter((l) => l.id !== id),
      }));
    },
    [updateTimeLockConfig]
  );

  const toggleCustomTimeLock = useCallback(
    (id: string) => {
      updateTimeLockConfig((prev) => ({
        ...prev,
        customTimeLocks: (prev.customTimeLocks || []).map((l) =>
          l.id === id ? { ...l, enabled: !l.enabled } : l
        ),
      }));
    },
    [updateTimeLockConfig]
  );

  // Departmental Events state & CRUD
  const [departmentalEvents, setDepartmentalEvents] = useState<DepartmentalEvent[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("bupulse_departmental_events");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return initialDepartmentalEvents;
  });

  const addDepartmentalEvent = useCallback((event: Omit<DepartmentalEvent, "id">) => {
    const newEvent: DepartmentalEvent = {
      ...event,
      id: `evt-${Date.now()}`,
    };
    setDepartmentalEvents((prev) => {
      const next = [newEvent, ...prev];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("bupulse_departmental_events", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  const updateDepartmentalEvent = useCallback(
    (id: string, updates: Partial<DepartmentalEvent>) => {
      setDepartmentalEvents((prev) => {
        const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("bupulse_departmental_events", JSON.stringify(next));
          } catch {}
        }
        return next;
      });
    },
    []
  );

  const deleteDepartmentalEvent = useCallback((id: string) => {
    setDepartmentalEvents((prev) => {
      const next = prev.filter((e) => e.id !== id);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("bupulse_departmental_events", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  // Synchronized store for all department timetables
  const [deptTimetables, setDeptTimetables] = useState<
    Record<string, DeptTimetableEntry>
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("bupulse_dept_timetables");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object") {
            return parsed;
          }
        }
      } catch {}
    }

    // Default initial seed for Computer Science and Software Engineering
    let initialCsSessions: Session[] = sessions;
    try {
      const res = generateTimetable(allocations, venues, constraints, "Computer Science");
      initialCsSessions = res.sessions;
    } catch {}

    let initialSeSessions: Session[] = [];
    try {
      const seAllocs = universityAllocations["Software Engineering"] || [];
      const res = generateTimetable(seAllocs, venues, constraints, "Software Engineering");
      initialSeSessions = res.sessions;
    } catch {}

    return {
      "Computer Science": {
        department: "Computer Science",
        school: "School of Computing & Engineering",
        status: "Draft generated",
        sessions: initialCsSessions,
        timeline: timeline,
        updatedAt: new Date().toISOString(),
      },
      "Software Engineering": {
        department: "Software Engineering",
        school: "School of Computing & Engineering",
        status: "Draft generated",
        sessions: initialSeSessions,
        timeline: timeline,
        updatedAt: new Date().toISOString(),
      },
    };
  });

  const deptTimetablesRef = useRef(deptTimetables);
  deptTimetablesRef.current = deptTimetables;

  const [localSessions, setLocalSessions] = useState<Session[]>(() => {
    return (
      deptTimetables["Computer Science"]?.sessions ||
      (() => {
        try {
          return generateTimetable(allocations, venues, constraints, "Computer Science")
            .sessions;
        } catch {
          return sessions;
        }
      })()
    );
  });

  const updateStore = useCallback(
    (dept: string, entry: DeptTimetableEntry) => {
      setDeptTimetables((prev) => {
        const next = { ...prev, [dept]: entry };
        deptTimetablesRef.current = next;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("bupulse_dept_timetables", JSON.stringify(next));
          } catch {}
        }
        return next;
      });
    },
    []
  );

  function addAuditEntry(partial: Omit<AuditEntry, "id" | "actor" | "at">) {
    const entry: AuditEntry = {
      ...partial,
      id: `a${Date.now()}`,
      actor: currentUser?.name || "M. Danladi",
      at: nowLabel(),
    };
    setAuditEntries((prev) => [entry, ...prev]);
  }

  const getDepartmentTimetable = useCallback(
    (dept: string) => {
      return deptTimetablesRef.current[dept];
    },
    []
  );

  const loadDepartmentData = useCallback(
    async (deptName: string, schoolName?: string) => {
      setIsLoadingBackend(true);
      setCurrentProgram(deptName);
      const school = schoolName || "School of Computing & Engineering";

      try {
        // 1. Allocations
        const normalizedDeptKey =
          Object.keys(universityAllocations).find((k) => {
            const kNorm = k.trim().toLowerCase();
            const dNorm = deptName.trim().toLowerCase();
            return (
              kNorm === dNorm ||
              kNorm.replace(/s\b/g, "") === dNorm.replace(/s\b/g, "") ||
              dNorm.startsWith(kNorm) ||
              kNorm.startsWith(dNorm)
            );
          }) || deptName;

        let deptAllocations = universityAllocations[normalizedDeptKey] || [];
        try {
          const allocRes = await allocationsApi.getAllocations(deptName);
          if (allocRes && allocRes.allocations && allocRes.allocations.length > 0) {
            deptAllocations = allocRes.allocations;
          }
        } catch {}
        setLocalAllocations(deptAllocations);

        // 2. Compute external bookings from local store + backend
        const localExt = computeExternalBookings(deptName, deptTimetablesRef.current);
        let backendExt: ExternalBooking[] = [];
        try {
          const extRes = await timetableApi.getExternalBookings(deptName, school);
          if (extRes && extRes.bookings) {
            backendExt = extRes.bookings;
          }
        } catch {}

        // Deduplicate bookings
        const bookingMap = new Map<string, ExternalBooking>();
        for (const b of [...localExt, ...backendExt]) {
          const key = `${b.venue}_${b.day}_${b.slot}`;
          if (!bookingMap.has(key)) {
            bookingMap.set(key, b);
          }
        }
        const activeExtBookings = Array.from(bookingMap.values());
        setExternalBookings(activeExtBookings);

        // 3. Load timetable sessions and status
        let targetSessions: Session[] | null = null;
        let targetStatus: Status = "Draft generated";
        let targetTimeline: TimelineStep[] = timeline;

        // Try backend first
        try {
          const ttRes = await timetableApi.getCurrent(deptName);
          if (ttRes && ttRes.sessions && ttRes.sessions.length > 0) {
            targetSessions = ttRes.sessions;
            if (ttRes.status) {
              targetStatus = ttRes.status as Status;
            }
          }
        } catch {}

        // Fall back to local store
        if (!targetSessions && deptTimetablesRef.current[deptName]) {
          targetSessions = deptTimetablesRef.current[deptName].sessions;
          targetStatus = deptTimetablesRef.current[deptName].status;
          if (deptTimetablesRef.current[deptName].timeline) {
            targetTimeline = deptTimetablesRef.current[deptName].timeline;
          }
        }

        // If no schedule exists yet, run CSP solver respecting active external bookings
        if (!targetSessions || targetSessions.length === 0) {
          try {
            const res = generateTimetable(
              deptAllocations,
              localVenues,
              localConstraints,
              deptName,
              { externalBookings: activeExtBookings, timeLockConfig }
            );
            targetSessions = res.sessions;
            targetStatus = "Draft generated";

            timetableApi
              .saveDraft({
                department: deptName,
                school,
                session: "2026 / 2027",
                semester: "First Semester",
                status: targetStatus,
                sessions: targetSessions,
              })
              .catch(() => {});
          } catch (err) {
            console.error("Error generating initial schedule:", err);
            targetSessions = [];
          }
        }

        setLocalSessions(targetSessions);
        setStatus(targetStatus);
        setLocalTimeline(targetTimeline);

        updateStore(deptName, {
          department: deptName,
          school,
          status: targetStatus,
          sessions: targetSessions,
          timeline: targetTimeline,
          updatedAt: new Date().toISOString(),
        });
      } finally {
        setIsLoadingBackend(false);
      }
    },
    [localVenues, localConstraints, updateStore]
  );

  const switchDepartment = useCallback(
    async (deptName: string) => {
      const school = currentUser?.school || "School of Computing & Engineering";
      await loadDepartmentData(deptName, school);
    },
    [currentUser, loadDepartmentData]
  );

  const saveTimetableDraft = useCallback(
    async (
      newStatus?: Status,
      customSessions?: Session[],
      department?: string
    ): Promise<boolean> => {
      setIsSavingDraft(true);
      const currentDept = department || currentUser?.department || currentProgram;
      const currentSchool = currentUser?.school || "School of Computing & Engineering";
      const targetStatus = newStatus || status || "Draft generated";
      const targetSessions = customSessions || localSessions;

      if (!department || department === (currentUser?.department || currentProgram)) {
        if (newStatus) setStatus(newStatus);
        if (customSessions) setLocalSessions(customSessions);
      }

      // Update multi-department store
      const currentTimeline = localTimeline;
      updateStore(currentDept, {
        department: currentDept,
        school: currentSchool,
        status: targetStatus,
        sessions: targetSessions,
        timeline: currentTimeline,
        updatedAt: new Date().toISOString(),
      });

      // Update deptSubs
      setDeptSubs((prev) =>
        prev.map((s) => {
          if (s.department.toLowerCase() === currentDept.toLowerCase()) {
            const mappedStatus: "pending" | "approved" | "returned" | "published" =
              targetStatus === "Published"
                ? "published"
                : targetStatus === "Draft generated" || targetStatus.includes("Rejected")
                ? "returned"
                : "pending";
            return {
              ...s,
              status: mappedStatus,
              courses: targetSessions.length,
              sessions: targetSessions.map((ts) => ({
                code: ts.code,
                lecturer: ts.lecturer,
                venue: ts.venue,
                day: ts.day as any,
                slot: ts.slot as any,
                conflict: !!ts.conflict,
              })),
            };
          }
          return s;
        })
      );

      // Add audit entry
      addAuditEntry({
        action: targetStatus === "Published" ? "published" : "approved",
        department: currentDept,
        school: currentSchool,
        level: "All Levels",
        note: `${currentDept} timetable saved as "${targetStatus}" with ${targetSessions.length} sessions.`,
      });

      // Recalculate external bookings for other departments
      setTimeout(() => {
        const activeDept = currentUser?.department || currentProgram;
        const ext = computeExternalBookings(activeDept, deptTimetablesRef.current);
        setExternalBookings(ext);
      }, 50);

      try {
        await timetableApi.saveDraft({
          department: currentDept,
          school: currentSchool,
          session: "2026 / 2027",
          semester: "First Semester",
          status: targetStatus,
          sessions: targetSessions,
        });
        return true;
      } catch (err) {
        return true; // Local store updated successfully
      } finally {
        setIsSavingDraft(false);
      }
    },
    [currentUser, currentProgram, status, localSessions, localTimeline, updateStore]
  );

  const updateTimetableStatus = useCallback(
    async (
      newStatus: Status,
      comment?: string,
      department?: string
    ): Promise<boolean> => {
      const targetDept = department || currentUser?.department || currentProgram;
      const currentSchool = currentUser?.school || "School of Computing & Engineering";
      const now = nowLabel();

      if (!department || department === (currentUser?.department || currentProgram)) {
        setStatus(newStatus);
      }

      // Generate appropriate timeline step
      const roleLabel =
        currentUser?.roleLabel ||
        (currentUser?.role === "hod"
          ? "HOD"
          : currentUser?.role === "dean"
          ? "Dean"
          : currentUser?.role === "acadPlanningTO"
          ? "Acad Pl. T.O"
          : "Dept T.O");

      const actionText =
        newStatus === "Submitted to HOD"
          ? "Draft submitted for HOD review"
          : newStatus === "Submitted to Dean"
          ? "Approved & forwarded to Dean"
          : newStatus === "Submitted to Acad Pl. T.O"
          ? "Approved & forwarded to Acad Pl. T.O"
          : newStatus === "Published"
          ? "Published to Master Schedule"
          : comment
          ? `Returned: ${comment}`
          : `Status changed to ${newStatus}`;

      const newStep: TimelineStep = {
        actor: currentUser?.name || "Official",
        role: roleLabel,
        action: actionText,
        at: now,
        state: comment ? "rejected" : "done",
        comment: comment,
      };

      setLocalTimeline((prev) => {
        const updated = prev.map((step) => {
          if (newStatus === "Submitted to Dean" && step.role === "HOD" && step.state === "current") {
            return { ...step, action: "Approved & forwarded to Dean", at: now, state: "done" as const };
          }
          if (newStatus === "Submitted to Dean" && step.role === "Dean" && step.state === "pending") {
            return { ...step, action: "Reviewing submission", at: "Pending", state: "current" as const };
          }
          if (
            newStatus === "Submitted to Acad Pl. T.O" &&
            step.role === "Dean" &&
            step.state === "current"
          ) {
            return {
              ...step,
              action: "Approved & forwarded to Acad Pl. T.O",
              at: now,
              state: "done" as const,
            };
          }
          if (
            newStatus === "Submitted to Acad Pl. T.O" &&
            step.role === "Acad Pl. T.O" &&
            step.state === "pending"
          ) {
            return {
              ...step,
              action: "Final review in progress",
              at: "Pending",
              state: "current" as const,
            };
          }
          return step;
        });
        return [...updated, newStep];
      });

      // Update multi-department store
      const existing = deptTimetablesRef.current[targetDept];
      const updatedEntry: DeptTimetableEntry = {
        department: targetDept,
        school: existing?.school || currentSchool,
        status: newStatus,
        sessions: existing?.sessions || (targetDept === currentProgram ? localSessions : []),
        timeline: existing?.timeline ? [...existing.timeline, newStep] : [newStep],
        updatedAt: new Date().toISOString(),
      };
      updateStore(targetDept, updatedEntry);

      // Update deptSubs
      setDeptSubs((prev) =>
        prev.map((s) => {
          if (s.department.toLowerCase() === targetDept.toLowerCase()) {
            const mappedStatus: "pending" | "approved" | "returned" | "published" =
              newStatus === "Published"
                ? "published"
                : newStatus === "Draft generated" || newStatus.includes("Rejected")
                ? "returned"
                : "pending";
            return {
              ...s,
              status: mappedStatus,
              returnComment: comment || s.returnComment,
              publishedAt: newStatus === "Published" ? now : s.publishedAt,
            };
          }
          return s;
        })
      );

      // Re-evaluate external bookings dynamically
      setTimeout(() => {
        const activeDept = currentUser?.department || currentProgram;
        const ext = computeExternalBookings(activeDept, deptTimetablesRef.current);
        setExternalBookings(ext);
      }, 50);

      // Add audit log
      addAuditEntry({
        action: newStatus === "Published" ? "published" : comment ? "returned" : "approved",
        department: targetDept,
        school: currentSchool,
        level: "All Levels",
        note: comment || `Status updated to ${newStatus}`,
      });

      try {
        await timetableApi.updateStatus(targetDept, newStatus, comment);
        return true;
      } catch (err) {
        return true;
      }
    },
    [currentUser, currentProgram, localSessions, updateStore]
  );

  function handleLogin(account: UserAccount) {
    setCurrentUser(account);
    if (account.department) {
      loadDepartmentData(account.department, account.school);
    } else {
      // For Dean or Acad Planning T.O, refresh external bookings from all submitted timetables
      const ext = computeExternalBookings(currentProgram, deptTimetablesRef.current);
      setExternalBookings(ext);
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    authApi.logout();
  }

  // Auto-restore session from stored token
  useEffect(() => {
    const token = getStoredToken();
    if (token && !currentUser) {
      authApi
        .me()
        .then((res) => {
          if (res?.user) {
            const u = res.user as any;
            const userAcc: UserAccount = {
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              roleLabel: u.roleLabel || u.role_label || "Departmental T.O",
              department: u.department,
              school: u.school,
              avatarTone: u.avatarTone || u.avatar_tone || "violet",
              initials: u.initials || "YO",
            };
            setCurrentUser(userAcc);
            if (u.department) {
              loadDepartmentData(u.department, u.school);
            }
          }
        })
        .catch(() => {});
    }
  }, [currentUser, loadDepartmentData]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        status,
        setStatus,
        constraintsComplete,
        setConstraintsComplete,
        localSessions,
        setLocalSessions,
        localConstraints,
        setLocalConstraints,
        localVenues,
        setLocalVenues,
        localAllocations,
        setLocalAllocations,
        externalBookings,
        setExternalBookings,
        deptTimetables,
        getDepartmentTimetable,
        isLoadingBackend,
        isSavingDraft,
        currentProgram,
        setCurrentProgram,
        localTimeline,
        setLocalTimeline,
        deptSubs,
        setDeptSubs,
        auditEntries,
        setAuditEntries,
        sidebarOpen,
        setSidebarOpen,
        activeRevisionTarget,
        setActiveRevisionTarget,
        addAuditEntry,
        handleLogin,
        handleLogout,
        loadDepartmentData,
        switchDepartment,
        saveTimetableDraft,
        updateTimetableStatus,
        timeLockConfig,
        setTimeLockConfig,
        updateTimeLockConfig,
        toggleLunchBreak,
        updateLunchBreak,
        toggleEarlyClosing,
        updateEarlyClosing,
        updateChapelSlot,
        updateOperatingWindow,
        addCustomTimeLock,
        deleteCustomTimeLock,
        toggleCustomTimeLock,
        departmentalEvents,
        setDepartmentalEvents,
        addDepartmentalEvent,
        updateDepartmentalEvent,
        deleteDepartmentalEvent,
        constraintTypes,
        setConstraintTypes,
        addConstraintType,
        updateConstraintType,
        deleteConstraintType,
        toggleConstraintType,
        resetConstraintTypesToDefault,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    return {
      currentUser: null,
      setCurrentUser: () => {},
      status: "Draft generated" as Status,
      setStatus: () => {},
      constraintsComplete: false,
      setConstraintsComplete: () => {},
      localSessions: sessions,
      setLocalSessions: () => {},
      localConstraints: constraints,
      setLocalConstraints: () => {},
      localVenues: venues,
      setLocalVenues: () => {},
      localAllocations: allocations,
      setLocalAllocations: () => {},
      externalBookings: [],
      setExternalBookings: () => {},
      deptTimetables: {},
      getDepartmentTimetable: () => undefined,
      isLoadingBackend: false,
      isSavingDraft: false,
      currentProgram: "Computer Science",
      setCurrentProgram: () => {},
      localTimeline: timeline,
      setLocalTimeline: () => {},
      deptSubs: deptSubmissions,
      setDeptSubs: () => {},
      auditEntries: auditLog,
      setAuditEntries: () => {},
      sidebarOpen: false,
      setSidebarOpen: () => {},
      activeRevisionTarget: null,
      setActiveRevisionTarget: () => {},
      addAuditEntry: () => {},
      handleLogin: () => {},
      handleLogout: () => {},
      loadDepartmentData: async () => {},
      switchDepartment: async () => {},
      saveTimetableDraft: async () => false,
      updateTimetableStatus: async () => false,
      timeLockConfig: defaultTimeLockConfig,
      setTimeLockConfig: () => {},
      updateTimeLockConfig: () => {},
      toggleLunchBreak: () => {},
      updateLunchBreak: () => {},
      toggleEarlyClosing: () => {},
      updateEarlyClosing: () => {},
      updateChapelSlot: () => {},
      updateOperatingWindow: () => {},
      addCustomTimeLock: () => {},
      deleteCustomTimeLock: () => {},
      toggleCustomTimeLock: () => {},
      departmentalEvents: initialDepartmentalEvents,
      setDepartmentalEvents: () => {},
      addDepartmentalEvent: () => {},
      updateDepartmentalEvent: () => {},
      deleteDepartmentalEvent: () => {},
      constraintTypes: defaultConstraintTypes,
      setConstraintTypes: () => {},
      addConstraintType: () => {},
      updateConstraintType: () => {},
      deleteConstraintType: () => {},
      toggleConstraintType: () => {},
      resetConstraintTypesToDefault: () => {},
    };
  }
  return context;
}
