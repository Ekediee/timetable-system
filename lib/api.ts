/**
 * API client configuration for connecting to the Laravel backend.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bupulse_token");
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("bupulse_token", token);
  } else {
    localStorage.removeItem("bupulse_token");
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

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

/**
 * Auth API service
 */
export const authApi = {
  async login(email: string, password: string) {
    const res = await apiRequest<{
      token: string;
      token_type: string;
      user: {
        id: string;
        name: string;
        email: string;
        role: "deptTO" | "hod" | "dean" | "acadPlanningTO";
        roleLabel: string;
        department?: string;
        school?: string;
        avatarTone: "brand" | "violet" | "good" | "warn";
        initials: string;
      };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (res.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  async me() {
    return apiRequest<{
      user: {
        id: string;
        name: string;
        email: string;
        role: "deptTO" | "hod" | "dean" | "acadPlanningTO";
        roleLabel: string;
        department?: string;
        school?: string;
        avatarTone: "brand" | "violet" | "good" | "warn";
        initials: string;
      };
    }>("/auth/me");
  },

  async logout() {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      setStoredToken(null);
    }
  },
};

import type { Allocation, Session, ExternalBooking } from "./data";

/**
 * Course Allocations API service
 */
export const allocationsApi = {
  async getAllocations(
    department: string = "Computer Science",
    semester: string = "First Semester",
    session: string = "2026 / 2027"
  ) {
    const params = new URLSearchParams({
      department,
      semester,
      session,
    });
    return apiRequest<{
      department: string;
      semester: string;
      session: string;
      totalCourses: number;
      allocations: Allocation[];
    }>(`/allocations?${params.toString()}`);
  },
};

/**
 * Timetable and External Bookings API service
 */
export const timetableApi = {
  async getCurrent(
    department: string,
    semester: string = "First Semester",
    session: string = "2026 / 2027"
  ) {
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
    }>(`/timetable/current?${params.toString()}`);
  },

  async saveDraft(data: {
    department: string;
    school: string;
    session: string;
    semester: string;
    status: string;
    sessions: Session[];
  }) {
    const sanitizedSessions = data.sessions.map((s) => ({
      code: s.code,
      lecturer: s.lecturer,
      venue: s.venue,
      day: s.day,
      slot: s.slot,
      duration: s.duration ?? 1,
      level: s.level ?? "200 Level",
      group: s.group ?? "All",
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
    comment?: string,
    semester: string = "First Semester",
    session: string = "2026 / 2027"
  ) {
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
    excludeDepartment?: string,
    school?: string,
    semester: string = "First Semester",
    session: string = "2026 / 2027"
  ) {
    const params = new URLSearchParams({ semester, session });
    if (excludeDepartment) params.append("exclude_department", excludeDepartment);
    if (school) params.append("school", school);
    return apiRequest<{
      totalLocked: number;
      bookings: ExternalBooking[];
    }>(`/timetable/external-bookings?${params.toString()}`);
  },
};

/**
 * Multi-Tier Governance & Workflow API service
 */
export const workflowApi = {
  async submitToHOD(department: string, semester?: string, session?: string) {
    return apiRequest<{ status: string }>("/workflow/submit-to-hod", {
      method: "POST",
      body: JSON.stringify({ department, semester, session }),
    });
  },

  async hodApprove(department: string, semester?: string, session?: string) {
    return apiRequest<{ status: string }>("/workflow/hod/approve", {
      method: "POST",
      body: JSON.stringify({ department, semester, session }),
    });
  },

  async hodReject(department: string, comment?: string, semester?: string, session?: string) {
    return apiRequest<{ status: string }>("/workflow/hod/reject", {
      method: "POST",
      body: JSON.stringify({ department, comment, semester, session }),
    });
  },

  async deanApprove(department: string, semester?: string, session?: string) {
    return apiRequest<{ status: string }>("/workflow/dean/approve", {
      method: "POST",
      body: JSON.stringify({ department, semester, session }),
    });
  },

  async deanReject(department: string, comment?: string, semester?: string, session?: string) {
    return apiRequest<{ status: string }>("/workflow/dean/reject", {
      method: "POST",
      body: JSON.stringify({ department, comment, semester, session }),
    });
  },

  async publish(department: string, semester?: string, session?: string) {
    return apiRequest<{ status: string }>("/publish", {
      method: "POST",
      body: JSON.stringify({ department, semester, session }),
    });
  },

  async getSubmissions(session: string = "2026 / 2027", semester: string = "First Semester") {
    const params = new URLSearchParams({ session, semester });
    return apiRequest<{ submissions: any[] }>(`/workflow/submissions?${params.toString()}`);
  },

  async getTimeline(department: string = "Computer Science") {
    return apiRequest<{ timeline: any[] }>(`/workflow/timeline?department=${encodeURIComponent(department)}`);
  },

  async getAuditLogs() {
    return apiRequest<{ auditEntries: any[] }>("/audit/logs");
  },
};


