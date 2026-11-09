/**
 * API client configuration for connecting to the Laravel backend.
 */

import {
  CURRENT_SESSION,
  CURRENT_SEMESTER,
  TOKEN_KEY,
  DEFAULT_TIMEOUT_MS,
  DEPARTMENT_ALIASES,
  getBackendBaseUrl,
} from "./config";
import type {
  Status,
  Allocation,
  Session,
  ExternalBooking,
  DynamicTimeLockConfig,
  ConstraintTypeDefinition,
  Constraint,
  DepartmentalEvent,
  Venue,
  VenueRecord,
  DeptSubmission,
  TimelineStep,
  AuditEntry,
} from "./data";

export { TOKEN_KEY, DEFAULT_TIMEOUT_MS };

export function getApiBaseUrl(): string {
  return getBackendBaseUrl();
}

export class ApiError extends Error {
  status: number;
  data: any;
  isTimeout?: boolean;
  isAborted?: boolean;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
    if (data?.isTimeout) this.isTimeout = true;
    if (data?.isAborted) this.isAborted = true;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Route requests:
  // - Absolute URL (starts with http): use as-is
  // - Local API routes (starts with /api/): use directly
  // - Backend API routes: proxy through /api/backend/... which automatically attaches the HttpOnly cookie
  let url: string;
  if (endpoint.startsWith("http")) {
    url = endpoint;
  } else if (endpoint.startsWith("/api/")) {
    url = endpoint;
  } else {
    const cleanEndpoint = endpoint.startsWith("/")
      ? endpoint.slice(1)
      : endpoint;
    url = `/api/backend/${cleanEndpoint}`;
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  let effectiveSignal: AbortSignal;
  if (options.signal) {
    if (typeof AbortSignal.any === "function") {
      effectiveSignal = AbortSignal.any([options.signal, timeoutSignal]);
    } else {
      const controller = new AbortController();
      const onAbort = () => controller.abort(options.signal?.reason);
      const onTimeout = () => controller.abort(timeoutSignal.reason);
      if (options.signal.aborted) {
        controller.abort(options.signal.reason);
      } else if (timeoutSignal.aborted) {
        controller.abort(timeoutSignal.reason);
      } else {
        options.signal.addEventListener("abort", onAbort, { once: true });
        timeoutSignal.addEventListener("abort", onTimeout, { once: true });
      }
      effectiveSignal = controller.signal;
    }
  } else {
    effectiveSignal = timeoutSignal;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: effectiveSignal,
      credentials: "same-origin",
    });
  } catch (error: any) {
    const isTimeout =
      error?.name === "TimeoutError" ||
      (error?.name === "AbortError" &&
        (effectiveSignal.reason?.name === "TimeoutError" ||
          String(effectiveSignal.reason).toLowerCase().includes("timeout")));

    const isManualAbort = error?.name === "AbortError" && !isTimeout;

    if (isManualAbort) {
      const abortError = new ApiError("Request cancelled.", 0, {
        cause: error,
        endpoint,
        isAborted: true,
      });
      abortError.name = "AbortError";
      throw abortError;
    }

    const message = isTimeout
      ? `Request timed out after ${Math.round(timeoutMs / 1000)} seconds. Please check your connection and retry.`
      : error instanceof TypeError && error.message === "Failed to fetch"
        ? "Unable to reach the timetable backend. Check the backend service and browser network access."
        : error instanceof Error
          ? error.message
          : "Unable to reach the timetable backend.";

    throw new ApiError(message, 0, { cause: error, endpoint, isTimeout });
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export type AuthUserRole =
  | "deptTO"
  | "hod"
  | "dean"
  | "acadPlanningTO"
  | "superAdmin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthUserRole;
  roleLabel: string;
  department?: string | null;
  school?: string | null;
  avatarTone: "brand" | "violet" | "good" | "warn";
  initials: string;
}

/**
 * Auth API service
 */
export const authApi = {
  async login(email: string, password: string) {
    const res = await apiRequest<{
      success: boolean;
      user: AuthUser;
      token_type?: string;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    return res;
  },

  async me() {
    return apiRequest<{
      user: AuthUser | null;
    }>("/api/auth/me");
  },

  async logout() {
    if (typeof window !== "undefined") {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    }
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // Ignore network errors on logout
    }
  },
};

export interface BaseDashboardResponse {
  user: AuthUser;
  session: string;
  semester: string;
}

export interface DeptTODashboardData extends BaseDashboardResponse {
  role: "deptTO";
  department: string;
  school: string;
  allocationsSummary: {
    totalCourses: number;
    allocatedCount: number;
    unallocatedCount: number;
  };
  timeline: TimelineStep[];
  timetable: {
    id: string;
    version: number;
    status: Status;
    constraintsComplete: boolean;
    sessions: Session[];
    sessionsCount: number;
    conflictsCount: number;
    totalCourses: number;
  } | null;
}

export interface HodDashboardData extends BaseDashboardResponse {
  role: "hod";
  department: string;
  school: string;
  deptTO: {
    name: string;
    email: string;
    phone?: string;
  } | null;
  submission: {
    hasSubmission: boolean;
    status: Status;
    version: number;
    coursesCount: number;
    unitsCount: number;
    sessionsCount: number;
    conflictsCount: number;
    submittedAt: string | null;
    sessions: Session[];
  } | null;
  timeline: TimelineStep[];
}

export interface DeanDepartmentSummary {
  department: string;
  status: Status;
  stage: "awaiting_hod" | "ready_for_dean" | "approved";
  deptTO: {
    name: string;
    email: string;
    phone?: string;
  } | null;
  hod: {
    name: string;
    email: string;
    phone?: string;
  } | null;
  coursesCount: number;
  sessionsCount: number;
  conflictsCount: number;
  sessions: Session[];
  timeline: TimelineStep[];
}

export interface DeanDashboardData extends BaseDashboardResponse {
  role: "dean";
  school: string;
  summary: {
    totalDepartments: number;
    awaitingHodCount: number;
    readyForDeanCount: number;
    forwardedCount: number;
  };
  departments: DeanDepartmentSummary[];
}

export interface PlanningDashboardData extends BaseDashboardResponse {
  role: "acadPlanningTO" | "superAdmin";
  summary: {
    totalSubmissions: number;
    pendingReview: number;
    approved: number;
    published: number;
    returned: number;
    approvedPercent: number;
  };
  submissions: DeptSubmission[];
}

export type DashboardBootstrapResponse =
  | DeptTODashboardData
  | HodDashboardData
  | DeanDashboardData
  | PlanningDashboardData;

/**
 * Fast unified dashboard bootstrap API service
 */
export const dashboardApi = {
  async getDashboard(
    session?: string,
    semester?: string,
    options?: { signal?: AbortSignal }
  ) {
    const params = new URLSearchParams();
    if (session) params.append("session", session);
    if (semester) params.append("semester", semester);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<DashboardBootstrapResponse>(`/dashboard${query}`, {
      signal: options?.signal,
    });
  },
};

/**
 * Course Allocations API service
 */
export const allocationsApi = {
  async getAllocations(
    department: string,
    semester: string,
    session: string,
    options?: { signal?: AbortSignal }
  ) {
    if (!department) {
      throw new Error("Department is required to query allocations.");
    }

    type AllocationResponse = {
      department: string;
      semester: string;
      session: string;
      totalCourses: number;
      allocations: Allocation[];
    };

    const candidates = Array.from(
      new Set([department, ...(DEPARTMENT_ALIASES[department] || [])])
    );
    const allocationMap = new Map<string, Allocation>();
    let firstResponse: AllocationResponse | null = null;

    const results = await Promise.all(
      candidates.map(async (candidate) => {
        const params = new URLSearchParams({
          department: candidate,
          semester,
          session,
        });
        try {
          return await apiRequest<AllocationResponse>(
            `/allocations?${params.toString()}`,
            { signal: options?.signal }
          );
        } catch (err) {
          if (candidate === department) {
            throw err;
          }
          console.warn(`Failed loading allocations for alias "${candidate}":`, err);
          return null;
        }
      })
    );

    for (const response of results) {
      if (!response) continue;
      firstResponse ??= response;
      for (const allocation of response.allocations || []) {
        const key = [
          allocation.code,
          allocation.level || "",
          allocation.group || "",
          allocation.lecturer,
        ].join("|");
        allocationMap.set(key, allocation);
      }
    }

    return {
      ...(firstResponse || {
        semester,
        session,
        totalCourses: 0,
      }),
      department,
      totalCourses: allocationMap.size,
      allocations: Array.from(allocationMap.values()),
    };
  },
};

/**
 * Timetable and External Bookings API service
 */
export const timetableApi = {
  async getCurrent(
    department: string,
    semester: string,
    session: string,
    options?: { signal?: AbortSignal }
  ) {
    if (!department) {
      throw new Error("Department is required to fetch current timetable.");
    }
    const params = new URLSearchParams({
      department,
      semester,
      session,
    });
    return apiRequest<{
      timetableId: string;
      department: string;
      status: string;
      version: number;
      sessions: Session[];
    }>(`/timetable/current?${params.toString()}`, { signal: options?.signal });
  },

  async saveDraft(data: {
    department: string;
    school: string;
    session: string;
    semester: string;
    status: string;
    sessions: Session[];
  }) {
    if (!data.department) {
      throw new Error("Department is required to save timetable draft.");
    }

    const sanitizedSessions = data.sessions.map((s) => ({
      code: s.code,
      lecturer: s.lecturer,
      venue: s.venue,
      day: s.day,
      slot: s.slot,
      duration: s.duration,
      level: s.level,
      group: s.group,
      isVirtual: !!s.isVirtual,
    }));

    return apiRequest<{
      success: boolean;
      timetableId: string;
      version: number;
      status: string;
      sessionCount: number;
    }>("/timetable/draft", {
      method: "PUT",
      body: JSON.stringify({
        ...data,
        sessions: sanitizedSessions,
      }),
    });
  },

  async updateStatus(
    department: string,
    status: string,
    comment: string | undefined,
    semester: string,
    session: string
  ) {
    if (!department) {
      throw new Error("Department is required to update timetable status.");
    }
    return apiRequest<{
      success: boolean;
      timetableId: string;
      department: string;
      status: string;
    }>("/timetable/status", {
      method: "PUT",
      body: JSON.stringify({
        department,
        status,
        comment,
        semester,
        session,
      }),
    });
  },

  async getExternalBookings(
    excludeDepartment: string | undefined,
    school: string | undefined,
    semester: string,
    session: string,
    options?: { signal?: AbortSignal }
  ) {
    const params = new URLSearchParams({ semester, session });
    if (excludeDepartment) params.append("exclude_department", excludeDepartment);
    if (school) params.append("school", school);
    return apiRequest<{
      totalLocked: number;
      bookings: ExternalBooking[];
    }>(`/timetable/external-bookings?${params.toString()}`, { signal: options?.signal });
  },

  async reset(
    department: string,
    session: string,
    semester: string
  ) {
    if (!department) {
      throw new Error("Department is required to reset timetable.");
    }
    if (!session) {
      throw new Error("Session is required to reset timetable.");
    }
    if (!semester) {
      throw new Error("Semester is required to reset timetable.");
    }
    return apiRequest<{ success: boolean; message?: string }>("/timetable/reset", {
      method: "POST",
      body: JSON.stringify({ department, session, semester }),
    });
  },
};

/**
 * Multi-Tier Governance & Workflow API service
 */
export const workflowApi = {
  async submitToHOD(department: string, semester: string, session: string) {
    if (!department) throw new Error("Department is required for HOD submission.");
    return apiRequest<{ status: string }>("/workflow/submit-to-hod", {
      method: "POST",
      body: JSON.stringify({ department, semester, session }),
    });
  },

  async hodApprove(department: string, semester: string, session: string) {
    if (!department) throw new Error("Department is required for HOD approval.");
    return apiRequest<{ status: string }>("/workflow/hod/approve", {
      method: "POST",
      body: JSON.stringify({ department, semester, session }),
    });
  },

  async hodReject(department: string, comment: string | undefined, semester: string, session: string) {
    if (!department) throw new Error("Department is required for HOD rejection.");
    return apiRequest<{ status: string }>("/workflow/hod/reject", {
      method: "POST",
      body: JSON.stringify({ department, comment, semester, session }),
    });
  },

  async deanApprove(department: string, semester: string, session: string) {
    if (!department) throw new Error("Department is required for Dean approval.");
    return apiRequest<{ status: string }>("/workflow/dean/approve", {
      method: "POST",
      body: JSON.stringify({ department, semester, session }),
    });
  },

  async deanReject(department: string, comment: string | undefined, semester: string, session: string) {
    if (!department) throw new Error("Department is required for Dean rejection.");
    return apiRequest<{ status: string }>("/workflow/dean/reject", {
      method: "POST",
      body: JSON.stringify({ department, comment, semester, session }),
    });
  },

  async academicPlanningApprove(
    department: string,
    publish: boolean = false,
    semester?: string,
    session?: string,
  ) {
    if (!department) throw new Error("Department is required for Academic Planning approval.");
    return apiRequest<{ success: boolean; status: string; department: string }>(
      "/workflow/academic-planning/approve",
      {
        method: "POST",
        body: JSON.stringify({ department, publish, semester, session }),
      },
    );
  },

  async publish(department: string, semester: string, session: string) {
    if (!department) throw new Error("Department is required for publishing.");
    return apiRequest<{ status: string }>("/publish", {
      method: "POST",
      body: JSON.stringify({ department, semester, session }),
    });
  },

  async getSubmissions(session: string, semester: string) {
    const params = new URLSearchParams({ session, semester });
    return apiRequest<{ submissions: DeptSubmission[] }>(`/workflow/submissions?${params.toString()}`);
  },

  async getTimeline(
    department: string,
    options?: { signal?: AbortSignal }
  ) {
    if (!department) {
      throw new Error("Department is required to query workflow timeline.");
    }
    return apiRequest<{ timeline: TimelineStep[] }>(
      `/workflow/timeline?department=${encodeURIComponent(department)}`,
      { signal: options?.signal }
    );
  },

  async getAuditLogs() {
    return apiRequest<{ auditEntries: AuditEntry[] }>("/audit/logs");
  },
};

/**
 * Campus Time Locks API service
 */
export const timeLocksApi = {
  async getTimeLocks(options?: { signal?: AbortSignal }) {
    return apiRequest<DynamicTimeLockConfig>("/time-locks", {
      signal: options?.signal,
    });
  },

  async updateTimeLocks(data: Partial<DynamicTimeLockConfig>) {
    return apiRequest<DynamicTimeLockConfig>("/time-locks", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

/**
 * Dynamic Constraint Types API service (Academic Planning)
 */
export const constraintTypesApi = {
  async getTypes(options?: { signal?: AbortSignal }) {
    return apiRequest<{ types: ConstraintTypeDefinition[] }>(
      "/constraint-types",
      { signal: options?.signal }
    );
  },

  async createType(data: Partial<ConstraintTypeDefinition>) {
    return apiRequest<ConstraintTypeDefinition>("/constraint-types", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateType(id: string, data: Partial<ConstraintTypeDefinition>) {
    return apiRequest<ConstraintTypeDefinition>(`/constraint-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteType(id: string) {
    return apiRequest<{ success: boolean; message?: string }>(`/constraint-types/${id}`, {
      method: "DELETE",
    });
  },
};

/**
 * Academic Departments API service
 */
export const departmentsApi = {
  async getDepartments() {
    return apiRequest<{
      departments: { code: string; name: string; school: string }[];
    }>("/departments");
  },
};

export interface ConstraintsBootstrapResponse {
  constraints: Constraint[];
  constraintsComplete: boolean;
  constraintTypes: ConstraintTypeDefinition[];
  timeLocks: DynamicTimeLockConfig;
  allocations: Allocation[];
  roster: string[];
}

/**
 * Departmental Faculty Constraints API service
 */
export const constraintsApi = {
  async getBootstrap(
    department?: string,
    session?: string,
    semester?: string,
    options?: { signal?: AbortSignal }
  ) {
    const params = new URLSearchParams();
    if (department) params.append("department", department);
    if (session) params.append("session", session);
    if (semester) params.append("semester", semester);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<ConstraintsBootstrapResponse>(`/constraints/bootstrap${qs}`, {
      signal: options?.signal,
    });
  },

  async getConstraints(
    department: string | undefined,
    session: string,
    semester: string,
    options?: { signal?: AbortSignal }
  ) {
    const params = new URLSearchParams({ session, semester });
    if (department) {
      params.append("department", department);
    }
    return apiRequest<{
      constraints: Constraint[];
      constraintsComplete: boolean;
    }>(`/constraints?${params.toString()}`, { signal: options?.signal });
  },

  async createConstraint(data: {
    kind: string;
    lecturer: string;
    detail: string;
    range: string;
    department: string;
    categoryId?: string;
    params?: Record<string, any>;
  }) {
    return apiRequest<Constraint>("/constraints", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateConstraint(id: string, data: Partial<Constraint>) {
    return apiRequest<Constraint>(`/constraints/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteConstraint(id: string) {
    return apiRequest<{ success: boolean }>(`/constraints/${id}`, {
      method: "DELETE",
    });
  },

  async updateStatus(
    department: string,
    completed: boolean,
    session: string,
    semester: string
  ) {
    if (!department) {
      throw new Error("Department is required to update constraints status.");
    }
    return apiRequest<{ constraintsComplete: boolean }>("/constraints/status", {
      method: "POST",
      body: JSON.stringify({ department, completed, session, semester }),
    });
  },
};

/**
 * Departmental Events API service
 */
export const departmentalEventsApi = {
  async getEvents(department?: string, options?: { signal?: AbortSignal }) {
    const params = department ? `?department=${encodeURIComponent(department)}` : "";
    return apiRequest<{ events: DepartmentalEvent[] }>(
      `/departmental-events${params}`,
      { signal: options?.signal }
    );
  },

  async createEvent(event: Omit<DepartmentalEvent, "id">) {
    return apiRequest<{ event: DepartmentalEvent } & DepartmentalEvent>("/departmental-events", {
      method: "POST",
      body: JSON.stringify(event),
    });
  },

  async updateEvent(id: string, data: Partial<DepartmentalEvent>) {
    return apiRequest<{ event: DepartmentalEvent } & DepartmentalEvent>(`/departmental-events/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteEvent(id: string) {
    return apiRequest<{ success: boolean; message: string }>(`/departmental-events/${id}`, {
      method: "DELETE",
    });
  },
};

/**
 * Venues & Facilities API service
 */
export const venuesApi = {
  async getVenues(
    params?: { department?: string; type?: string; spaceType?: string },
    options?: { signal?: AbortSignal }
  ) {
    const query = new URLSearchParams();
    if (params?.department) query.set("department", params.department);
    if (params?.type) query.set("type", params.type);
    if (params?.spaceType) query.set("spaceType", params.spaceType);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<{ venues: Venue[] }>(`/venues${qs}`, {
      signal: options?.signal,
    });
  },

  async createVenue(venue: {
    name: string;
    capacity: number;
    block?: string;
    floor?: string;
    type?: string;
    spaceType?: "exclusive" | "shared";
    deptOwners?: string[];
    isVirtual?: boolean;
  }) {
    return apiRequest<{ venue: Venue } & Venue>("/venues", {
      method: "POST",
      body: JSON.stringify(venue),
    });
  },

  async updateVenue(
    id: string,
    data: Partial<{
      name: string;
      capacity: number;
      block: string;
      floor: string;
      type: string;
      spaceType: "exclusive" | "shared";
      deptOwners: string[];
      isVirtual: boolean;
    }>
  ) {
    return apiRequest<{ venue: Venue } & Venue>(`/venues/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteVenue(id: string) {
    return apiRequest<{ success: boolean; message: string }>(`/venues/${id}`, {
      method: "DELETE",
    });
  },

  async importVenues(data: {
    venues?: Array<Venue | VenueRecord | Record<string, any>>;
    mode?: "append" | "replace";
    csv?: string;
  }) {
    return apiRequest<{
      success: boolean;
      importedCount: number;
      totalVenues: number;
      message: string;
      venues?: Venue[];
    }>("/venues/import-csv", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async importCsv(csv: string, mode: "append" | "replace" = "append") {
    return this.importVenues({ csv, mode });
  },

  async getOccupancyMatrix() {
    return apiRequest<{ occupancy: any[] }>("/venues/occupancy/matrix");
  },
};

/**
 * Faculty Roster API service
 */
export const facultyApi = {
  async getRoster(department?: string) {
    const qs = department ? `?department=${encodeURIComponent(department)}` : "";
    return apiRequest<{ faculty: string[] }>(`/faculty/roster${qs}`);
  },
};

/**
 * Analytics & Master Publishing API service
 */
export const analyticsApi = {
  async getOverview() {
    return apiRequest<{ approvedPercent: number }>("/analytics/overview");
  },

  async getCrossClashes(session: string, semester: string) {
    const params = new URLSearchParams({ session, semester });
    return apiRequest<{ clashes: any[] }>(`/publish/cross-clashes?${params.toString()}`);
  },

  async getMasterSchedule() {
    return apiRequest<{ sessions: any[] }>("/publish/master");
  },
};
