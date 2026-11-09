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
  normalizeTimeLockConfig,
  type CustomTimeLock,
  type DepartmentalEvent,
  type ConstraintTypeDefinition,
  constraintArchetypeTemplates,
  days,
  slots,
  DEPARTMENT_SCHOOL_MAP,
  getParentSchool,
  setLiveDepartmentRegistry,
  isApprovedByHOD,
  isApprovedByDean,
  deduplicateTimeline,
  deduplicateAuditEntries,
} from "./data";
import { generateTimetable } from "./engine";
import {
  authApi,
  dashboardApi,
  type DashboardBootstrapResponse,
  timetableApi,
  allocationsApi,
  timeLocksApi,
  constraintTypesApi,
  constraintsApi,
  type ConstraintsBootstrapResponse,
  departmentalEventsApi,
  workflowApi,
  venuesApi,
  departmentsApi,
  setStoredToken,
} from "./api";
import { CURRENT_SESSION, CURRENT_SEMESTER } from "./config";
import { toast } from "../components/Toast";

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
  isAuthLoading: boolean;
  currentProgram: string;
  setCurrentProgram: React.Dispatch<React.SetStateAction<string>>;
  localTimeline: TimelineStep[];
  setLocalTimeline: React.Dispatch<React.SetStateAction<TimelineStep[]>>;
  deptSubs: DeptSubmission[];
  setDeptSubs: React.Dispatch<React.SetStateAction<DeptSubmission[]>>;
  auditEntries: AuditEntry[];
  setAuditEntries: React.Dispatch<React.SetStateAction<AuditEntry[]>>;
  dashboardData: DashboardBootstrapResponse | null;
  setDashboardData: React.Dispatch<
    React.SetStateAction<DashboardBootstrapResponse | null>
  >;
  bootstrapDashboard: (
    session?: string,
    semester?: string,
  ) => Promise<DashboardBootstrapResponse | null>;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeRevisionTarget: { code: string; day?: string; slot?: string } | null;
  setActiveRevisionTarget: React.Dispatch<
    React.SetStateAction<{ code: string; day?: string; slot?: string } | null>
  >;
  addAuditEntry: (partial: Omit<AuditEntry, "id" | "actor" | "at">) => void;
  submissionsLoaded: boolean;
  auditLogsLoaded: boolean;
  refreshWorkflowAndAudit: () => Promise<void>;
  refreshSubmissions: (force?: boolean) => Promise<DeptSubmission[]>;
  refreshAuditLogs: (force?: boolean) => Promise<AuditEntry[]>;
  handleLogin: (account: UserAccount) => Promise<void>;
  handleLogout: () => Promise<void> | void;
  loadDepartmentData: (deptName: string, schoolName?: string) => Promise<void>;
  switchDepartment: (deptName: string) => Promise<void>;
  saveTimetableDraft: (
    newStatus?: Status,
    customSessions?: Session[],
    department?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updateTimetableStatus: (
    newStatus: Status,
    comment?: string,
    department?: string,
    options?: { skipBackendApi?: boolean },
  ) => Promise<{ success: boolean; error?: string }>;
  timeLockConfig: DynamicTimeLockConfig;
  setTimeLockConfig: React.Dispatch<
    React.SetStateAction<DynamicTimeLockConfig>
  >;
  updateTimeLockConfig: (
    updater: (prev: DynamicTimeLockConfig) => DynamicTimeLockConfig,
  ) => void;
  toggleLunchBreak: () => void;
  updateLunchBreak: (slot: (typeof slots)[number], duration?: number) => void;
  toggleEarlyClosing: (id: string) => void;
  updateEarlyClosing: (id: string, cutoffSlot: (typeof slots)[number]) => void;
  updateChapelSlot: (
    level: string,
    day: (typeof days)[number],
    slot: (typeof slots)[number],
  ) => void;
  updateOperatingWindow: (
    startSlot: (typeof slots)[number],
    endSlot: (typeof slots)[number],
  ) => void;
  addCustomTimeLock: (lock: Omit<CustomTimeLock, "id">) => void;
  deleteCustomTimeLock: (id: string) => void;
  toggleCustomTimeLock: (id: string) => void;

  departmentalEvents: DepartmentalEvent[];
  setDepartmentalEvents: React.Dispatch<
    React.SetStateAction<DepartmentalEvent[]>
  >;
  addDepartmentalEvent: (event: Omit<DepartmentalEvent, "id">) => void;
  updateDepartmentalEvent: (
    id: string,
    updates: Partial<DepartmentalEvent>,
  ) => void;
  deleteDepartmentalEvent: (id: string) => void;

  constraintTypes: ConstraintTypeDefinition[];
  setConstraintTypes: React.Dispatch<
    React.SetStateAction<ConstraintTypeDefinition[]>
  >;
  addConstraintType: (
    typeDef: Omit<ConstraintTypeDefinition, "id">,
  ) => Promise<boolean>;
  updateConstraintType: (
    id: string,
    updates: Partial<ConstraintTypeDefinition>,
  ) => Promise<boolean>;
  deleteConstraintType: (id: string) => Promise<boolean>;
  toggleConstraintType: (id: string) => Promise<boolean>;
  resetConstraintTypesToDefault: () => void;
  saveConstraintTypes: () => Promise<boolean>;
  refreshConstraintTypes: () => Promise<ConstraintTypeDefinition[] | null>;
  constraintTypesDirty: boolean;

  departments: { code: string; name: string; school: string }[];
  setDepartments: React.Dispatch<
    React.SetStateAction<{ code: string; name: string; school: string }[]>
  >;
  refreshDepartments: () => Promise<void>;

  backendError: string | null;
  setBackendError: React.Dispatch<React.SetStateAction<string | null>>;
  refreshVenues: (department?: string) => Promise<Venue[]>;
  refreshConstraints: (department?: string) => Promise<Constraint[]>;
  refreshAllocations: (department?: string) => Promise<Allocation[]>;
  bootstrapConstraints: (
    department?: string,
    session?: string,
    semester?: string,
    options?: { signal?: AbortSignal }
  ) => Promise<ConstraintsBootstrapResponse | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function computeExternalBookings(
  deptName: string,
  timetablesMap: Record<string, DeptTimetableEntry>,
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

function normalizeLoadedConstraintTypes(
  types: ConstraintTypeDefinition[],
): ConstraintTypeDefinition[] {
  if (!Array.isArray(types)) return [];
  return types.map((typeDef) => ({
    ...typeDef,
    parameters: Array.isArray(typeDef.parameters) ? typeDef.parameters : [],
  }));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const currentUserRef = useRef<UserAccount | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [dashboardData, setDashboardData] =
    useState<DashboardBootstrapResponse | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeRevisionTarget, setActiveRevisionTarget] = useState<{
    code: string;
    day?: string;
    slot?: string;
  } | null>(null);
  const [status, setStatus] = useState<Status>("Draft generated");
  const [constraintsComplete, setConstraintsComplete] = useState(false);
  const [localConstraints, setLocalConstraints] = useState<Constraint[]>([]);

  // Dynamic Constraint Types Registry (Academic Planning managed)
  const [constraintTypes, setConstraintTypes] = useState<
    ConstraintTypeDefinition[]
  >([]);
  const [constraintTypesDirty, setConstraintTypesDirty] = useState(false);
  const inFlightConstraintTypesRef = useRef<Promise<ConstraintTypeDefinition[] | null> | null>(null);

  const addConstraintType = useCallback(
    async (typeDef: Omit<ConstraintTypeDefinition, "id">) => {
      const previousDirty = constraintTypesDirty;
      const newId = `type-${Date.now()}`;
      const newType: ConstraintTypeDefinition = {
        ...typeDef,
        id: newId,
        isActive: true,
        parameters:
          Array.isArray(typeDef.parameters) && typeDef.parameters.length > 0
            ? typeDef.parameters
            : [
                {
                  key: "lecturer",
                  label: "Faculty Member",
                  type: "lecturer_select",
                  required: true,
                },
              ],
      };
      setConstraintTypes((prev) => [...prev, newType]);
      setConstraintTypesDirty(true);

      try {
        const savedType = await constraintTypesApi.createType(newType);
        setConstraintTypes((prev) => {
          const next = prev.map((type) =>
            type.id === newId ? savedType : type,
          );
          if (typeof window !== "undefined") {
            localStorage.setItem("bupulse_constraint_types", JSON.stringify(next));
          }
          return next;
        });
        return true;
      } catch (err) {
        setConstraintTypes((prev) => {
          const next = prev.filter((type) => type.id !== newId);
          if (typeof window !== "undefined") {
            localStorage.setItem("bupulse_constraint_types", JSON.stringify(next));
          }
          return next;
        });
        setConstraintTypesDirty(previousDirty);
        console.error("Backend constraint type create failed:", err);
        return false;
      }
    },
    [constraintTypesDirty],
  );

  const updateConstraintType = useCallback(
    async (id: string, updates: Partial<ConstraintTypeDefinition>) => {
      const previousTypes = constraintTypes;
      const previousDirty = constraintTypesDirty;
      const nextTypes = previousTypes.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      );
      setConstraintTypes(nextTypes);
      setConstraintTypesDirty(true);

      try {
        const savedType = await constraintTypesApi.updateType(id, updates);
        setConstraintTypes((prev) => {
          const next = prev.map((type) =>
            type.id === id ? { ...type, ...savedType } : type,
          );
          if (typeof window !== "undefined") {
            localStorage.setItem("bupulse_constraint_types", JSON.stringify(next));
          }
          return next;
        });
        return true;
      } catch (err) {
        setConstraintTypes(previousTypes);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "bupulse_constraint_types",
            JSON.stringify(previousTypes),
          );
        }
        setConstraintTypesDirty(previousDirty);
        console.error("Backend constraint type update failed:", err);
        return false;
      }
    },
    [constraintTypes, constraintTypesDirty],
  );

  const deleteConstraintType = useCallback(
    async (id: string) => {
      const previousTypes = constraintTypes;
      const previousDirty = constraintTypesDirty;
      const target = previousTypes.find((type) => type.id === id);
      if (target?.isSystemDefault) return false;
      setConstraintTypes(previousTypes.filter((type) => type.id !== id));
      setConstraintTypesDirty(true);

      try {
        await constraintTypesApi.deleteType(id);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "bupulse_constraint_types",
            JSON.stringify(previousTypes.filter((type) => type.id !== id)),
          );
        }
        return true;
      } catch (err: any) {
        if (err?.status === 404) {
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "bupulse_constraint_types",
              JSON.stringify(previousTypes.filter((type) => type.id !== id)),
            );
          }
          return true;
        }
        setConstraintTypes(previousTypes);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "bupulse_constraint_types",
            JSON.stringify(previousTypes),
          );
        }
        setConstraintTypesDirty(previousDirty);
        console.error("Backend constraint type delete failed:", err);
        return false;
      }
    },
    [constraintTypes, constraintTypesDirty],
  );

  const toggleConstraintType = useCallback(
    async (id: string) => {
      const previousTypes = constraintTypes;
      const previousDirty = constraintTypesDirty;
      const target = previousTypes.find((type) => type.id === id);
      if (!target) return false;
      const isActive = !target.isActive;
      setConstraintTypes(
        previousTypes.map((type) =>
          type.id === id ? { ...type, isActive } : type,
        ),
      );
      setConstraintTypesDirty(true);

      try {
        const savedType = await constraintTypesApi.updateType(id, { isActive });
        setConstraintTypes((prev) => {
          const next = prev.map((type) =>
            type.id === id ? { ...type, ...savedType, isActive } : type,
          );
          if (typeof window !== "undefined") {
            localStorage.setItem("bupulse_constraint_types", JSON.stringify(next));
          }
          return next;
        });
        return true;
      } catch (err) {
        setConstraintTypes(previousTypes);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "bupulse_constraint_types",
            JSON.stringify(previousTypes),
          );
        }
        setConstraintTypesDirty(previousDirty);
        console.error("Backend constraint type toggle failed:", err);
        return false;
      }
    },
    [constraintTypes, constraintTypesDirty],
  );

  const refreshConstraintTypes = useCallback(async () => {
    if (inFlightConstraintTypesRef.current) {
      return inFlightConstraintTypesRef.current;
    }
    const fetchPromise = (async () => {
      try {
        const ctRes = await constraintTypesApi.getTypes();
        if (ctRes && Array.isArray(ctRes.types) && ctRes.types.length > 0) {
          const normalized = normalizeLoadedConstraintTypes(ctRes.types);
          setConstraintTypes(normalized);
          setConstraintTypesDirty(false);
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "bupulse_constraint_types",
              JSON.stringify(normalized),
            );
          }
          return normalized;
        }
      } catch (err) {
        console.warn("Failed fetching live constraint types:", err);
      } finally {
        inFlightConstraintTypesRef.current = null;
      }
      return null;
    })();

    inFlightConstraintTypesRef.current = fetchPromise;
    return fetchPromise;
  }, []);

  const resetConstraintTypesToDefault = useCallback(() => {
    refreshConstraintTypes();
  }, [refreshConstraintTypes]);

  const saveConstraintTypes = useCallback(async () => {
    try {
      const results = await Promise.all(
        constraintTypes.map((typeDef) =>
          constraintTypesApi.updateType(typeDef.id, typeDef),
        ),
      );
      if (Array.isArray(results) && results.length > 0) {
        const normalized = normalizeLoadedConstraintTypes(results);
        setConstraintTypes(normalized);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "bupulse_constraint_types",
            JSON.stringify(normalized),
          );
        }
      }
      setConstraintTypesDirty(false);
      return true;
    } catch (err) {
      console.warn("Backend constraint type save failed:", err);
      return false;
    }
  }, [constraintTypes]);

  const [localVenues, setLocalVenues] = useState<Venue[]>([]);
  const [localAllocations, setLocalAllocations] = useState<Allocation[]>([]);
  const [externalBookings, setExternalBookings] = useState<ExternalBooking[]>(
    [],
  );
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [currentProgram, setCurrentProgram] = useState<string>("");
  const [localTimeline, setLocalTimeline] = useState<TimelineStep[]>([]);
  const [deptSubs, setDeptSubs] = useState<DeptSubmission[]>([]);
  const deptSubsRef = useRef<DeptSubmission[]>(deptSubs);
  deptSubsRef.current = deptSubs;
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false);
  const submissionsLoadedRef = useRef(false);
  const inFlightSubmissionsRef = useRef<Promise<DeptSubmission[]> | null>(null);

  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const auditEntriesRef = useRef<AuditEntry[]>(auditEntries);
  auditEntriesRef.current = auditEntries;
  const [auditLogsLoaded, setAuditLogsLoaded] = useState(false);
  const auditLogsLoadedRef = useRef(false);
  const inFlightAuditLogsRef = useRef<Promise<AuditEntry[]> | null>(null);
  const [departments, setDepartments] = useState<
    { code: string; name: string; school: string }[]
  >([]);

  const refreshVenues = useCallback(async (department?: string) => {
    try {
      const res = await venuesApi.getVenues(
        department ? { department } : undefined,
      );
      if (res && Array.isArray(res.venues)) {
        setLocalVenues(res.venues);
        return res.venues;
      }
      return [];
    } catch (err) {
      console.warn("Failed refreshing venues:", err);
      throw err;
    }
  }, []);

  const refreshConstraints = useCallback(
    async (department?: string) => {
      try {
        const dept =
          department || currentProgram || currentUser?.department || "";
        const res = await constraintsApi.getConstraints(
          dept || undefined,
          CURRENT_SESSION,
          CURRENT_SEMESTER
        );
        if (res && Array.isArray(res.constraints)) {
          setLocalConstraints(res.constraints);
          if (typeof res.constraintsComplete === "boolean") {
            setConstraintsComplete(res.constraintsComplete);
          }
          return res.constraints;
        }
        return [];
      } catch (err) {
        console.warn("Failed refreshing constraints:", err);
        return [];
      }
    },
    [currentProgram, currentUser?.department],
  );

  const refreshAllocations = useCallback(
    async (department?: string) => {
      const dept =
        department || currentProgram || currentUser?.department || "";
      if (!dept) return [];
      try {
        const res = await allocationsApi.getAllocations(
          dept,
          CURRENT_SEMESTER,
          CURRENT_SESSION,
        );
        if (res && Array.isArray(res.allocations)) {
          setLocalAllocations(res.allocations);
          return res.allocations;
        }
        return [];
      } catch (err) {
        console.warn("Failed refreshing allocations:", err);
        return [];
      }
    },
    [currentProgram, currentUser?.department],
  );

  const bootstrapConstraints = useCallback(
    async (
      department?: string,
      session = CURRENT_SESSION,
      semester = CURRENT_SEMESTER,
      options?: { signal?: AbortSignal }
    ): Promise<ConstraintsBootstrapResponse | null> => {
      const dept = department || currentProgram || currentUser?.department || "";
      try {
        const data = await constraintsApi.getBootstrap(
          dept || undefined,
          session,
          semester,
          options
        );
        if (!data) return null;

        if (Array.isArray(data.constraints)) {
          setLocalConstraints(data.constraints);
        }
        if (typeof data.constraintsComplete === "boolean") {
          setConstraintsComplete(data.constraintsComplete);
        }
        if (Array.isArray(data.constraintTypes) && data.constraintTypes.length > 0) {
          const normalized = normalizeLoadedConstraintTypes(data.constraintTypes);
          setConstraintTypes(normalized);
          setConstraintTypesDirty(false);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("bupulse_constraint_types", JSON.stringify(normalized));
            } catch {}
          }
        }
        if (data.timeLocks && typeof data.timeLocks === "object") {
          const normTimeLocks = normalizeTimeLockConfig(data.timeLocks);
          setTimeLockConfig(normTimeLocks);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("bupulse_timelock_config", JSON.stringify(normTimeLocks));
            } catch {}
          }
        }
        if (Array.isArray(data.allocations)) {
          setLocalAllocations(data.allocations);
        }

        return data;
      } catch (err: any) {
        if (options?.signal?.aborted || err?.name === "AbortError" || err?.data?.isAborted) return null;
        console.warn("Unified constraints bootstrap failed:", err);
        return null;
      }
    },
    [currentProgram, currentUser?.department],
  );

  const refreshDepartments = useCallback(async () => {
    try {
      const res = await departmentsApi.getDepartments();
      if (res && Array.isArray(res.departments) && res.departments.length > 0) {
        setDepartments(res.departments);
        setLiveDepartmentRegistry(res.departments);
      }
    } catch (err) {
      console.warn("Could not fetch departments from backend:", err);
    }
  }, []);

  // Dynamic Time Lock Configuration State
  const [timeLockConfig, setTimeLockConfig] =
    useState<DynamicTimeLockConfig>(defaultTimeLockConfig);

  const updateTimeLockConfig = useCallback(
    (updater: (prev: DynamicTimeLockConfig) => DynamicTimeLockConfig) => {
      setTimeLockConfig((prev) => {
        const next = updater(prev);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              "bupulse_timelock_config",
              JSON.stringify(next),
            );
          } catch {}
        }

        // Live persistence to backend
        if (currentUser) {
          const chapelPayload = {
            ...defaultTimeLockConfig.chapelSeminarSchedule,
            ...(next.chapelSeminarSchedule &&
            typeof next.chapelSeminarSchedule === "object" &&
            !Array.isArray(next.chapelSeminarSchedule)
              ? next.chapelSeminarSchedule
              : {}),
          };
          const payload = {
            operatingWindow: next.operatingWindow,
            lunchBreak: next.lunchBreak,
            earlyClosings: next.earlyClosings,
            chapelSlots: chapelPayload,
            chapelSeminarSchedule: chapelPayload,
            customTimeLocks: next.customTimeLocks,
          };
          timeLocksApi.updateTimeLocks(payload).catch((err) => {
            console.warn("Backend time lock sync warning:", err);
          });
        }

        return next;
      });
    },
    [],
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
    [updateTimeLockConfig],
  );

  const toggleEarlyClosing = useCallback(
    (id: string) => {
      updateTimeLockConfig((prev) => ({
        ...prev,
        earlyClosings: prev.earlyClosings.map((ec) =>
          ec.id === id ? { ...ec, enabled: !ec.enabled } : ec,
        ),
      }));
    },
    [updateTimeLockConfig],
  );

  const updateEarlyClosing = useCallback(
    (id: string, cutoffSlot: (typeof slots)[number]) => {
      updateTimeLockConfig((prev) => ({
        ...prev,
        earlyClosings: prev.earlyClosings.map((ec) =>
          ec.id === id ? { ...ec, cutoffSlot } : ec,
        ),
      }));
    },
    [updateTimeLockConfig],
  );

  const updateChapelSlot = useCallback(
    (
      level: string,
      day: (typeof days)[number],
      slot: (typeof slots)[number],
    ) => {
      updateTimeLockConfig((prev) => {
        const currentSched =
          prev.chapelSeminarSchedule &&
          typeof prev.chapelSeminarSchedule === "object" &&
          !Array.isArray(prev.chapelSeminarSchedule)
            ? prev.chapelSeminarSchedule
            : defaultTimeLockConfig.chapelSeminarSchedule;

        const base = currentSched[level] ||
          defaultTimeLockConfig.chapelSeminarSchedule[level] || {
            duration: 1,
            venue: "University Amphitheatre",
            lecturer: "Chilaka Uzoma",
            code: "BU-GST 011",
            title: "Citizenship Orientation & Chapel Seminar",
          };

        return {
          ...prev,
          chapelSeminarSchedule: {
            ...defaultTimeLockConfig.chapelSeminarSchedule,
            ...currentSched,
            [level]: {
              ...base,
              day,
              slot,
            },
          },
        };
      });
    },
    [updateTimeLockConfig],
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
    [updateTimeLockConfig],
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
    [updateTimeLockConfig],
  );

  const deleteCustomTimeLock = useCallback(
    (id: string) => {
      updateTimeLockConfig((prev) => ({
        ...prev,
        customTimeLocks: (prev.customTimeLocks || []).filter(
          (l) => l.id !== id,
        ),
      }));
    },
    [updateTimeLockConfig],
  );

  const toggleCustomTimeLock = useCallback(
    (id: string) => {
      updateTimeLockConfig((prev) => ({
        ...prev,
        customTimeLocks: (prev.customTimeLocks || []).map((l) =>
          l.id === id ? { ...l, enabled: !l.enabled } : l,
        ),
      }));
    },
    [updateTimeLockConfig],
  );

  // Departmental Events state & CRUD
  const [departmentalEvents, setDepartmentalEvents] = useState<
    DepartmentalEvent[]
  >([]);

  const addDepartmentalEvent = useCallback(
    async (event: Omit<DepartmentalEvent, "id">) => {
      const response = await departmentalEventsApi.createEvent(event);
      setDepartmentalEvents((prev) => [response.event || response, ...prev]);
    },
    [],
  );

  const updateDepartmentalEvent = useCallback(
    async (id: string, updates: Partial<DepartmentalEvent>) => {
      const response = await departmentalEventsApi.updateEvent(id, updates);
      setDepartmentalEvents((prev) =>
        prev.map((e) =>
          e.id === id ? response.event || { ...e, ...updates } : e,
        ),
      );
    },
    [],
  );

  const deleteDepartmentalEvent = useCallback(async (id: string) => {
    await departmentalEventsApi.deleteEvent(id);
    setDepartmentalEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Synchronized store for all department timetables
  const [deptTimetables, setDeptTimetables] = useState<
    Record<string, DeptTimetableEntry>
  >({});

  const deptTimetablesRef = useRef(deptTimetables);
  deptTimetablesRef.current = deptTimetables;
  const loadDeptAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (loadDeptAbortRef.current) {
        loadDeptAbortRef.current.abort();
      }
    };
  }, []);

  // Hydrate client-persisted preferences from localStorage after initial render
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedTypes = localStorage.getItem("bupulse_constraint_types");
      if (storedTypes) {
        const parsed = JSON.parse(storedTypes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed.length === 7) {
            localStorage.removeItem("bupulse_constraint_types");
          } else {
            setConstraintTypes(normalizeLoadedConstraintTypes(parsed));
          }
        }
      }
    } catch {}

    try {
      const storedTimeLock = localStorage.getItem("bupulse_timelock_config");
      if (storedTimeLock) {
        const parsed = JSON.parse(storedTimeLock);
        if (parsed && typeof parsed === "object") {
          setTimeLockConfig(normalizeTimeLockConfig(parsed));
        }
      }
    } catch {}

    try {
      const storedTimetables = localStorage.getItem("bupulse_dept_timetables");
      if (storedTimetables) {
        const parsed = JSON.parse(storedTimetables);
        if (parsed && typeof parsed === "object") {
          setDeptTimetables(parsed);
          deptTimetablesRef.current = parsed;
        }
      }
    } catch {}
  }, []);

  const [localSessions, setLocalSessions] = useState<Session[]>([]);

  const updateStore = useCallback((dept: string, entry: DeptTimetableEntry) => {
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
  }, []);

  const bootstrapDashboard = useCallback(
    async (
      session = CURRENT_SESSION,
      semester = CURRENT_SEMESTER,
    ): Promise<DashboardBootstrapResponse | null> => {
      setIsLoadingBackend(true);
      try {
        const data = await dashboardApi.getDashboard(session, semester);
        if (!data) return null;

        setDashboardData(data);

        if (data.user) {
          const u = data.user as any;
          const userAcc: UserAccount = {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            roleLabel: u.roleLabel || u.role_label || "Departmental T.O",
            department: u.department || null,
            school: u.school || null,
            avatarTone: u.avatarTone || u.avatar_tone || "violet",
            initials: u.initials || "YO",
          };
          setCurrentUser(userAcc);
        }

        if (data.role === "deptTO") {
          if (data.department) {
            setCurrentProgram(data.department);
            setDepartments([
              {
                code: data.department.slice(0, 3).toUpperCase(),
                name: data.department,
                school: data.school || "",
              },
            ]);
          }
          if (data.timetable) {
            setStatus(data.timetable.status || "Draft generated");
            setConstraintsComplete(Boolean(data.timetable.constraintsComplete));
            setLocalSessions(data.timetable.sessions || []);
            updateStore(data.department, {
              department: data.department,
              school: data.school || "",
              status: data.timetable.status || "Draft generated",
              sessions: data.timetable.sessions || [],
              timeline: data.timeline || [],
              updatedAt: new Date().toISOString(),
            });
          }
          if (data.timeline) {
            setLocalTimeline(deduplicateTimeline(data.timeline));
          }
        } else if (data.role === "hod") {
          if (data.department) {
            setCurrentProgram(data.department);
            setDepartments([
              {
                code: data.department.slice(0, 3).toUpperCase(),
                name: data.department,
                school: data.school || "",
              },
            ]);
          }
          if (data.submission) {
            setStatus(data.submission.status || "Draft generated");
            setLocalSessions(data.submission.sessions || []);
            updateStore(data.department, {
              department: data.department,
              school: data.school || "",
              status: data.submission.status || "Draft generated",
              sessions: data.submission.sessions || [],
              timeline: data.timeline || [],
              updatedAt: data.submission.submittedAt || new Date().toISOString(),
            });
          }
          if (data.timeline) {
            setLocalTimeline(deduplicateTimeline(data.timeline));
          }
        } else if (data.role === "dean") {
          if (Array.isArray(data.departments)) {
            setDepartments(
              data.departments.map((dept) => ({
                code: dept.department.slice(0, 3).toUpperCase(),
                name: dept.department,
                school: data.school || "",
              })),
            );
            setDeptTimetables((prev) => {
              const next = { ...prev };
              data.departments.forEach((dept) => {
                const canAccess = isApprovedByHOD(dept.status);
                next[dept.department] = {
                  department: dept.department,
                  school: data.school || "",
                  status: dept.status,
                  sessions: canAccess ? dept.sessions || [] : [],
                  timeline: dept.timeline || [],
                  updatedAt: new Date().toISOString(),
                };
              });
              deptTimetablesRef.current = next;
              return next;
            });
          }
        } else if (data.role === "acadPlanningTO" || data.role === "superAdmin") {
          if (Array.isArray(data.submissions)) {
            const validSubs = data.submissions.filter((s) =>
              isApprovedByDean(s.rawStatus || s.status),
            );
            setDeptSubs(validSubs);
            deptSubsRef.current = validSubs;
            setSubmissionsLoaded(true);
            submissionsLoadedRef.current = true;

            const deptsFromSubs = Array.from(
              new Set(data.submissions.map((s) => s.department).filter(Boolean)),
            ).map((dept) => {
              const sub = data.submissions.find((s) => s.department === dept);
              return {
                code: dept.slice(0, 3).toUpperCase(),
                name: dept,
                school: sub?.school || "",
              };
            });
            if (deptsFromSubs.length > 0) {
              setDepartments(deptsFromSubs);
            }

            setDeptTimetables((prev) => {
              const next = { ...prev };
              validSubs.forEach((s) => {
                next[s.department] = {
                  department: s.department,
                  school: s.school,
                  status: (s.rawStatus || s.status) as Status,
                  sessions: (s.sessions as Session[]) || [],
                  timeline: next[s.department]?.timeline || [],
                  updatedAt: s.publishedAt || new Date().toISOString(),
                };
              });
              deptTimetablesRef.current = next;
              return next;
            });
          }
        }

        return data;
      } catch (err: any) {
        if (
          err?.status === 401 ||
          err?.message?.toLowerCase().includes("unauthenticated")
        ) {
          // Normal state when visitor is unauthenticated
          return null;
        }
        console.warn("Bootstrap dashboard failed:", err);
        return null;
      } finally {
        setIsLoadingBackend(false);
      }
    },
    [updateStore],
  );

  function addAuditEntry(partial: Omit<AuditEntry, "id" | "actor" | "at">) {
    const entry: AuditEntry = {
      ...partial,
      id: `a${Date.now()}`,
      actor: currentUser?.name || "M. Danladi",
      at: nowLabel(),
    };
    setAuditEntries((prev) => deduplicateAuditEntries([entry, ...prev]));
  }

  const getDepartmentTimetable = useCallback((dept: string) => {
    return deptTimetablesRef.current[dept];
  }, []);

  const refreshSubmissions = useCallback(
    async (force = false): Promise<DeptSubmission[]> => {
      if (!force && submissionsLoadedRef.current) {
        return deptSubsRef.current;
      }
      if (inFlightSubmissionsRef.current) {
        return inFlightSubmissionsRef.current;
      }

      const promise = (async () => {
        try {
          const subRes = await workflowApi.getSubmissions(
            CURRENT_SESSION,
            CURRENT_SEMESTER,
          );
          if (subRes && Array.isArray(subRes.submissions)) {
            const activeUser = currentUserRef.current;
            const role = activeUser?.role;
            const isAcadPlanning =
              role === "acadPlanningTO" || role === "superAdmin";
            const isDean = role === "dean";

            // Academic Planning submissions queue (deptSubs) ONLY ever contains Dean-approved timetables
            const mapped: DeptSubmission[] = subRes.submissions
              .filter((dbSub: any) =>
                isApprovedByDean(dbSub.rawStatus || dbSub.status),
              )
              .map((dbSub: any) => ({
                id: dbSub.id || dbSub.timetableId,
                department: dbSub.department || "",
                school: dbSub.school || "",
                level: dbSub.level || "All Levels",
                semester: dbSub.semester || "",
                deptTO: dbSub.deptTO || "",
                hod: dbSub.hod || "",
                dean: dbSub.dean || "",
                deanSignedAt: dbSub.deanSignedAt || "",
                courses: dbSub.courses ?? 0,
                units: dbSub.units ?? (dbSub.courses ?? 0) * 3,
                conflicts: dbSub.conflicts ?? 0,
                status: (["pending", "approved", "returned", "published"].includes(
                  dbSub.status,
                )
                  ? dbSub.status
                  : "pending") as "pending" | "approved" | "returned" | "published",
                rawStatus: dbSub.rawStatus,
                publishedAt: dbSub.publishedAt,
                sessions: dbSub.sessions || [],
              }));
            setDeptSubs(mapped);
            deptSubsRef.current = mapped;

            setDeptTimetables((prev) => {
              const next = { ...prev };
              subRes.submissions.forEach((s: any) => {
                const rawStatus = (s.rawStatus ||
                  (s.status === "published"
                    ? "Published"
                    : s.status === "approved"
                      ? "Submitted to Acad Pl. T.O"
                      : s.status === "returned"
                        ? "Draft generated"
                        : "Submitted to HOD")) as Status;

                const canAccessSessions = isAcadPlanning
                  ? isApprovedByDean(rawStatus)
                  : isDean
                    ? isApprovedByHOD(rawStatus)
                    : true;

                next[s.department] = {
                  department: s.department,
                  school: s.school,
                  status: rawStatus,
                  sessions: canAccessSessions
                    ? ((s.sessions as Session[]) || [])
                    : [],
                  timeline: next[s.department]?.timeline || [],
                  updatedAt: s.publishedAt || new Date().toISOString(),
                };
              });
              deptTimetablesRef.current = next;
              return next;
            });

            setSubmissionsLoaded(true);
            submissionsLoadedRef.current = true;
            return mapped;
          }
          setSubmissionsLoaded(true);
          submissionsLoadedRef.current = true;
          return [];
        } catch (err) {
          console.warn("Failed fetching workflow submissions:", err);
          return [];
        } finally {
          inFlightSubmissionsRef.current = null;
        }
      })();

      inFlightSubmissionsRef.current = promise;
      return promise;
    },
    [],
  );

  const refreshAuditLogs = useCallback(
    async (force = false): Promise<AuditEntry[]> => {
      if (!force && auditLogsLoadedRef.current) {
        return auditEntriesRef.current;
      }
      if (inFlightAuditLogsRef.current) {
        return inFlightAuditLogsRef.current;
      }

      const promise = (async () => {
        try {
          const auditRes = await workflowApi.getAuditLogs();
          if (auditRes && Array.isArray(auditRes.auditEntries)) {
            const activeUser = currentUserRef.current;
            const role = activeUser?.role;
            const isAcadPlanning =
              role === "acadPlanningTO" || role === "superAdmin";

            let result = auditRes.auditEntries;
            if (isAcadPlanning) {
              const approvedDepts = new Set(
                deptSubsRef.current
                  .filter((s) => isApprovedByDean(s.rawStatus || s.status))
                  .map((s) => s.department?.toLowerCase().trim())
                  .filter(Boolean),
              );
              result = auditRes.auditEntries.filter((entry: any) => {
                const note = (entry.note || "").toLowerCase();
                const action = (entry.action || "").toLowerCase();
                const actor = (entry.actor || "").toLowerCase();
                const dept = (entry.department || "").toLowerCase().trim();

                // Exclude internal departmental/HOD approval steps before reaching Academic Planning
                if (
                  note.includes("submitted to hod") ||
                  note.includes("submitted to dean") ||
                  note.includes("draft generated") ||
                  note.includes("draft submitted") ||
                  note.includes("hod review") ||
                  note.includes("hod approved") ||
                  note.includes("returned to dept") ||
                  note.includes("returned to hod")
                ) {
                  return false;
                }

                if (!dept || dept.includes("academic planning")) return true;
                if (approvedDepts.size > 0 && !approvedDepts.has(dept)) return false;

                if (
                  note.includes("submitted to acad pl") ||
                  note.includes("academic planning") ||
                  note.includes("forwarded to academic planning") ||
                  note.includes("dean sign-off") ||
                  note.includes("dean approved") ||
                  action === "published" ||
                  actor.includes("planning") ||
                  actor.includes("admin")
                ) {
                  return true;
                }

                return false;
              });
            }
            const cleaned = deduplicateAuditEntries(result);
            setAuditEntries(cleaned);
            auditEntriesRef.current = cleaned;
            setAuditLogsLoaded(true);
            auditLogsLoadedRef.current = true;
            return cleaned;
          }
          setAuditLogsLoaded(true);
          auditLogsLoadedRef.current = true;
          return [];
        } catch (err) {
          console.warn("Failed fetching audit logs:", err);
          return [];
        } finally {
          inFlightAuditLogsRef.current = null;
        }
      })();

      inFlightAuditLogsRef.current = promise;
      return promise;
    },
    [],
  );

  const refreshWorkflowAndAudit = useCallback(async () => {
    try {
      await Promise.all([refreshSubmissions(true), refreshAuditLogs(true)]);
    } catch (err) {
      console.warn("Failed refreshing workflow submissions or audit logs:", err);
    }
  }, [refreshSubmissions, refreshAuditLogs]);

  const loadDepartmentData = useCallback(
    async (deptName: string, schoolName?: string) => {
      if (loadDeptAbortRef.current) {
        loadDeptAbortRef.current.abort();
      }
      const controller = new AbortController();
      loadDeptAbortRef.current = controller;
      const { signal } = controller;

      setIsLoadingBackend(true);
      setCurrentProgram(deptName);
      const school = schoolName || currentUser?.school || "";
      setLocalAllocations([]);
      setLocalConstraints([]);
      setLocalVenues([]);
      setLocalSessions([]);
      setLocalTimeline([]);
      setExternalBookings([]);

      try {
        try {
          const eventResponse = await departmentalEventsApi.getEvents(undefined, { signal });
          if (signal.aborted) return;
          if (Array.isArray(eventResponse?.events)) {
            setDepartmentalEvents(eventResponse.events);
          }
        } catch (err: any) {
          if (signal.aborted || err?.name === "AbortError" || err?.data?.isAborted) return;
          console.warn(
            `Failed fetching departmental events for ${deptName}:`,
            err,
          );
          setDepartmentalEvents([]);
        }

        // 1. Unified constraints bootstrap (allocations, constraints, timeLocks, constraintTypes) in 1 single HTTP request
        try {
          const cBoot = await constraintsApi.getBootstrap(
            deptName,
            CURRENT_SESSION,
            CURRENT_SEMESTER,
            { signal }
          );
          if (signal.aborted) return;
          if (cBoot) {
            if (Array.isArray(cBoot.allocations)) {
              setLocalAllocations(cBoot.allocations);
            }
            if (Array.isArray(cBoot.constraints)) {
              setLocalConstraints(cBoot.constraints);
            }
            if (typeof cBoot.constraintsComplete === "boolean") {
              setConstraintsComplete(cBoot.constraintsComplete);
            }
            if (cBoot.timeLocks && typeof cBoot.timeLocks === "object") {
              setTimeLockConfig(normalizeTimeLockConfig(cBoot.timeLocks));
            }
            if (Array.isArray(cBoot.constraintTypes) && cBoot.constraintTypes.length > 0) {
              setConstraintTypes(normalizeLoadedConstraintTypes(cBoot.constraintTypes));
              setConstraintTypesDirty(false);
            }
          }
        } catch (err: any) {
          if (signal.aborted || err?.name === "AbortError" || err?.data?.isAborted) return;
          console.warn(`Failed unified constraints bootstrap for ${deptName}:`, err);
        }
        if (signal.aborted) return;

        // 1c. Fetch active teaching venues for department from live backend
        try {
          const vRes = await venuesApi.getVenues({ department: deptName }, { signal });
          if (signal.aborted) return;
          if (vRes && Array.isArray(vRes.venues)) {
            setLocalVenues(vRes.venues);
          }
        } catch (err: any) {
          if (signal.aborted || err?.name === "AbortError" || err?.data?.isAborted) return;
          console.warn(`Failed fetching venues for ${deptName}:`, err);
        }
        if (signal.aborted) return;

        // 2. Compute external bookings from local store + backend
        const localExt = computeExternalBookings(
          deptName,
          deptTimetablesRef.current,
        );
        let backendExt: ExternalBooking[] = [];
        try {
          const extRes = await timetableApi.getExternalBookings(
            deptName,
            school,
            CURRENT_SEMESTER,
            CURRENT_SESSION,
            { signal }
          );
          if (signal.aborted) return;
          if (extRes && extRes.bookings) {
            backendExt = extRes.bookings;
          }
        } catch (err: any) {
          if (signal.aborted || err?.name === "AbortError" || err?.data?.isAborted) return;
        }
        if (signal.aborted) return;

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

        // 3. Load timetable sessions, status and review timeline
        let targetSessions: Session[] = [];
        let targetStatus: Status = "Draft generated";
        let targetTimeline: TimelineStep[] = [];

        // 3a. Load review timeline from live backend
        try {
          const tlRes = await workflowApi.getTimeline(deptName, { signal });
          if (signal.aborted) return;
          if (tlRes && Array.isArray(tlRes.timeline)) {
            targetTimeline = tlRes.timeline;
          }
        } catch (err: any) {
          if (signal.aborted || err?.name === "AbortError" || err?.data?.isAborted) return;
        }
        if (signal.aborted) return;

        // 3b. Load timetable sessions and status from live backend
        try {
          const ttRes = await timetableApi.getCurrent(
            deptName,
            CURRENT_SEMESTER,
            CURRENT_SESSION,
            { signal }
          );
          if (signal.aborted) return;
          if (ttRes && Array.isArray(ttRes.sessions)) {
            targetSessions = ttRes.sessions;
            if (ttRes.status) {
              targetStatus = ttRes.status as Status;
            }
          }
        } catch (err: any) {
          if (signal.aborted || err?.name === "AbortError" || err?.data?.isAborted) return;
        }
        if (signal.aborted) return;

        setLocalSessions(targetSessions);
        setStatus(targetStatus);
        setLocalTimeline(deduplicateTimeline(targetTimeline));

        updateStore(deptName, {
          department: deptName,
          school,
          status: targetStatus,
          sessions: targetSessions,
          timeline: targetTimeline,
          updatedAt: new Date().toISOString(),
        });
      } finally {
        if (loadDeptAbortRef.current === controller) {
          setIsLoadingBackend(false);
          loadDeptAbortRef.current = null;
        }
      }
    },
    [currentUser?.school, updateStore],
  );

  const switchDepartment = useCallback(
    async (deptName: string) => {
      const school = currentUser?.school || getParentSchool(deptName);
      await loadDepartmentData(deptName, school);
    },
    [currentUser, loadDepartmentData],
  );

  const saveTimetableDraft = useCallback(
    async (
      newStatus?: Status,
      customSessions?: Session[],
      department?: string,
    ): Promise<{ success: boolean; error?: string }> => {
      setIsSavingDraft(true);
      const currentDept =
        department || currentUser?.department || currentProgram;
      const currentSchool =
        currentUser?.school || getParentSchool(currentDept);
      const targetStatus = newStatus || status || "Draft generated";
      const targetSessions = customSessions || localSessions;

      // Snapshot previous states for rollback on failure
      const prevStatus = status;
      const prevSessions = localSessions;
      const prevStoreEntry = deptTimetablesRef.current[currentDept];
      const prevDeptSubs = deptSubs;

      const isCurrentDept =
        !department ||
        department === (currentUser?.department || currentProgram);

      if (isCurrentDept) {
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
            const mappedStatus:
              | "pending"
              | "approved"
              | "returned"
              | "published" =
              targetStatus === "Published"
                ? "published"
                : targetStatus === "Draft generated" ||
                    targetStatus.includes("Rejected")
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
        }),
      );

      // Recalculate external bookings for other departments
      setTimeout(() => {
        const activeDept = currentUser?.department || currentProgram;
        const ext = computeExternalBookings(
          activeDept,
          deptTimetablesRef.current,
        );
        setExternalBookings(ext);
      }, 50);

      try {
        await timetableApi.saveDraft({
          department: currentDept,
          school: currentSchool,
          session: CURRENT_SESSION,
          semester: CURRENT_SEMESTER,
          status: targetStatus,
          sessions: targetSessions,
        });

        // Add audit entry on success
        addAuditEntry({
          action: targetStatus === "Published" ? "published" : "approved",
          department: currentDept,
          school: currentSchool,
          level: "All Levels",
          note: `${currentDept} timetable saved as "${targetStatus}" with ${targetSessions.length} sessions.`,
        });

        return { success: true };
      } catch (err: any) {
        // Rollback optimistic state
        if (isCurrentDept) {
          setStatus(prevStatus);
          setLocalSessions(prevSessions);
        }
        if (prevStoreEntry) {
          updateStore(currentDept, prevStoreEntry);
        }
        setDeptSubs(prevDeptSubs);

        const errorMsg =
          err?.message || `Failed to save timetable draft for ${currentDept}.`;
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsSavingDraft(false);
      }
    },
    [
      currentUser,
      currentProgram,
      status,
      localSessions,
      localTimeline,
      deptSubs,
      updateStore,
    ],
  );

  const updateTimetableStatus = useCallback(
    async (
      newStatus: Status,
      comment?: string,
      department?: string,
      options?: { skipBackendApi?: boolean },
    ): Promise<{ success: boolean; error?: string }> => {
      const targetDept =
        department || currentUser?.department || currentProgram;
      const currentSchool =
        currentUser?.school || getParentSchool(targetDept);
      const now = nowLabel();

      // Snapshot previous states for rollback on failure
      const prevStatus = status;
      const prevTimeline = localTimeline;
      const prevStoreEntry = deptTimetablesRef.current[targetDept];
      const prevDeptSubs = deptSubs;

      const isCurrentDept =
        !department ||
        department === (currentUser?.department || currentProgram);

      if (isCurrentDept) {
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
              : newStatus === "Approved"
                ? "Approved by Academic Planning (ready to publish)"
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
          if (
            newStatus === "Submitted to Dean" &&
            step.role === "HOD" &&
            step.state === "current"
          ) {
            return {
              ...step,
              action: "Approved & forwarded to Dean",
              at: now,
              state: "done" as const,
            };
          }
          if (
            newStatus === "Submitted to Dean" &&
            step.role === "Dean" &&
            step.state === "pending"
          ) {
            return {
              ...step,
              action: "Reviewing submission",
              at: "Pending",
              state: "current" as const,
            };
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
          if (
            (newStatus === "Approved" || newStatus === "Published") &&
            step.role === "Acad Pl. T.O" &&
            (step.state === "current" || step.state === "pending")
          ) {
            return {
              ...step,
              action:
                newStatus === "Published"
                  ? "Published to Master Schedule"
                  : "Approved by Academic Planning",
              at: now,
              state: "done" as const,
            };
          }
          return step;
        });
        return deduplicateTimeline([...updated, newStep]);
      });

      // Update multi-department store
      const existing = deptTimetablesRef.current[targetDept];
      const updatedEntry: DeptTimetableEntry = {
        department: targetDept,
        school: existing?.school || currentSchool,
        status: newStatus,
        sessions:
          existing?.sessions ||
          (targetDept === currentProgram ? localSessions : []),
        timeline: existing?.timeline
          ? deduplicateTimeline([...existing.timeline, newStep])
          : [newStep],
        updatedAt: new Date().toISOString(),
      };
      updateStore(targetDept, updatedEntry);

      // Update deptSubs
      setDeptSubs((prev) =>
        prev.map((s) => {
          if (s.department.toLowerCase() === targetDept.toLowerCase()) {
            const mappedStatus:
              | "pending"
              | "approved"
              | "returned"
              | "published" =
              newStatus === "Published"
                ? "published"
                : newStatus === "Approved"
                  ? "approved"
                  : newStatus === "Draft generated" ||
                      newStatus.includes("Rejected")
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
        }),
      );

      // Re-evaluate external bookings dynamically
      setTimeout(() => {
        const activeDept = currentUser?.department || currentProgram;
        const ext = computeExternalBookings(
          activeDept,
          deptTimetablesRef.current,
        );
        setExternalBookings(ext);
      }, 50);

      try {
        if (!options?.skipBackendApi) {
          await timetableApi.updateStatus(
            targetDept,
            newStatus,
            comment,
            CURRENT_SEMESTER,
            CURRENT_SESSION
          );
        }

        const tlRes = await workflowApi.getTimeline(targetDept);
        if (tlRes && Array.isArray(tlRes.timeline)) {
          setLocalTimeline(deduplicateTimeline(tlRes.timeline));
        }

        if (!options?.skipBackendApi) {
          // Add audit log on SUCCESS
          addAuditEntry({
            action:
              newStatus === "Published"
                ? "published"
                : comment
                  ? "returned"
                  : "approved",
            department: targetDept,
            school: currentSchool,
            level: "All Levels",
            note: comment || `Status updated to ${newStatus}`,
          });
        }

        return { success: true };
      } catch (err: any) {
        // Rollback optimistic state
        if (isCurrentDept) {
          setStatus(prevStatus);
        }
        setLocalTimeline(prevTimeline);
        if (prevStoreEntry) {
          updateStore(targetDept, prevStoreEntry);
        }
        setDeptSubs(prevDeptSubs);

        const errorMsg =
          err?.message || `Failed to update status to ${newStatus} for ${targetDept}.`;
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [currentUser, currentProgram, status, localTimeline, localSessions, deptSubs, updateStore],
  );

  const handleLogin = useCallback(
    async (account: UserAccount) => {
      setCurrentUser(account);

      if (account.department) {
        setCurrentProgram(account.department);
      }

      // Pre-fetch unified dashboard payload before resolving login so all stores
      // (localSessions, status, localTimeline, deptTimetables, deptSubs, etc.)
      // are 100% hydrated in context before role views mount.
      try {
        await bootstrapDashboard();
      } catch (e) {
        console.warn("Bootstrap error on login:", e);
      }
    },
    [bootstrapDashboard],
  );

  const handleLogout = useCallback(async () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie = "bupulse_token=; path=/; max-age=0";
        document.cookie = "bupulse_session=; path=/; max-age=0";
      } catch {}
    }
    setStoredToken(null);
    setCurrentUser(null);
    setDashboardData(null);
    setSubmissionsLoaded(false);
    submissionsLoadedRef.current = false;
    setAuditLogsLoaded(false);
    auditLogsLoadedRef.current = false;
    try {
      await authApi.logout();
    } catch {}
    if (typeof window !== "undefined") {
      window.location.href = "/login?logout=1";
    }
  }, []);

  // Auto-restore session from backend cookie once on initial app load
  useEffect(() => {
    let active = true;

    // Skip restore on login route — visitor is explicitly unauthenticated
    const isLoginRoute =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/login");

    if (isLoginRoute) {
      setIsAuthLoading(false);
      return;
    }

    bootstrapDashboard()
      .then((data) => {
        if (!active) return;
        if (!data) {
          setStoredToken(null);
        }
      })
      .catch(() => {
        setStoredToken(null);
      })
      .finally(() => {
        if (active) {
          setIsAuthLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [bootstrapDashboard]);

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
        isAuthLoading,
        currentProgram,
        setCurrentProgram,
        localTimeline,
        setLocalTimeline,
        deptSubs,
        setDeptSubs,
        auditEntries,
        setAuditEntries,
        dashboardData,
        setDashboardData,
        bootstrapDashboard,
        sidebarOpen,
        setSidebarOpen,
        activeRevisionTarget,
        setActiveRevisionTarget,
        addAuditEntry,
        submissionsLoaded,
        auditLogsLoaded,
        refreshWorkflowAndAudit,
        refreshSubmissions,
        refreshAuditLogs,
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
        saveConstraintTypes,
        refreshConstraintTypes,
        constraintTypesDirty,
        departments,
        setDepartments,
        refreshDepartments,
        backendError,
        setBackendError,
        refreshVenues,
        refreshConstraints,
        refreshAllocations,
        bootstrapConstraints,
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
      localSessions: [],
      setLocalSessions: () => {},
      localConstraints: [],
      setLocalConstraints: () => {},
      localVenues: [],
      setLocalVenues: () => {},
      localAllocations: [],
      setLocalAllocations: () => {},
      externalBookings: [],
      setExternalBookings: () => {},
      deptTimetables: {},
      getDepartmentTimetable: () => undefined,
      isLoadingBackend: false,
      isSavingDraft: false,
      isAuthLoading: false,
      currentProgram: "",
      setCurrentProgram: () => {},
      localTimeline: [],
      setLocalTimeline: () => {},
      deptSubs: [],
      setDeptSubs: () => {},
      auditEntries: [],
      setAuditEntries: () => {},
      dashboardData: null,
      setDashboardData: () => {},
      bootstrapDashboard: async () => null,
      sidebarOpen: false,
      setSidebarOpen: () => {},
      activeRevisionTarget: null,
      setActiveRevisionTarget: () => {},
      addAuditEntry: () => {},
      submissionsLoaded: false,
      auditLogsLoaded: false,
      refreshWorkflowAndAudit: async () => {},
      refreshSubmissions: async () => [],
      refreshAuditLogs: async () => [],
      handleLogin: async () => {},
      handleLogout: () => {},
      loadDepartmentData: async () => {},
      switchDepartment: async () => {},
      saveTimetableDraft: async () => ({ success: false }),
      updateTimetableStatus: async () => ({ success: false }),
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
      departmentalEvents: [],
      setDepartmentalEvents: () => {},
      addDepartmentalEvent: () => {},
      updateDepartmentalEvent: () => {},
      deleteDepartmentalEvent: () => {},
      constraintTypes: [],
      setConstraintTypes: () => {},
      addConstraintType: async () => false,
      updateConstraintType: async () => false,
      deleteConstraintType: async () => false,
      toggleConstraintType: async () => false,
      resetConstraintTypesToDefault: () => {},
      saveConstraintTypes: async () => false,
      refreshConstraintTypes: async () => null,
      constraintTypesDirty: false,
      departments: [],
      setDepartments: () => {},
      refreshDepartments: async () => {},
      backendError: null,
      setBackendError: () => {},
      refreshVenues: async () => [],
      refreshConstraints: async () => [],
      refreshAllocations: async () => [],
      bootstrapConstraints: async () => null,
    };
  }
  return context;
}
