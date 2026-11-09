// BU Pulse — Timetabling seed data for the Department of Computer Science

export type Status =
  | "Draft generated"
  | "Constraints in progress"
  | "Submitted to HOD"
  | "Rejected by HOD"
  | "Submitted to Dean"
  | "Submitted to Acad Pl. T.O"
  | "Approved"
  | "Published";

/**
 * Stage gate 1: Dean only sees timetable data once HOD has approved and forwarded.
 */
export function isApprovedByHOD(status: string | undefined | null): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return (
    s === "submitted to dean" ||
    s === "submitted to acad pl. t.o" ||
    s === "approved" ||
    s === "published"
  );
}

/**
 * Stage gate 2: Academic Planning only receives timetable data once School Dean has signed off.
 */
export function isApprovedByDean(status: string | undefined | null): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return (
    s === "submitted to acad pl. t.o" ||
    s === "approved" ||
    s === "published"
  );
}

export const department = {
  name: "Computer Science",
  school: "School of Computing",
  session: "2026 / 2027",
  semester: "First Semester",
  level: "200 Level",
  status: "Draft generated" as Status,
};

export type Allocation = {
  code: string;
  title: string;
  lecturer: string;
  units: number;
  size: number;
  type: "Core" | "Elective" | "GST";
  group?: string; // "Group A", "Group B", "Group C", "Group D", "Group E", "Group F", "All", or undefined for unified classes
  level?: string; // "100 Level", "200 Level", "300 Level", "400 Level"
  isVirtual?: boolean; // True for online/virtual classes (e.g. GST)
};

export type ExternalBooking = {
  venue: string;
  day: string;
  slot: string;
  duration: number;
  lecturer: string;
  course_code: string;
  booked_by_department: string;
};

export const universityAllocations: Record<string, Allocation[]> = {};

export const allocations: Allocation[] = [];

export type Venue = {
  name: string;
  capacity: number;
  block: string;
  floor?: string | null;
  spaceType?: "shared" | "exclusive";
  deptOwners?: string[];
  isVirtual?: boolean;
};

export const allUniversityVenues: Venue[] = [];
export const venues: Venue[] = [];

/**
 * Institutional mapping of academic departments to parent schools.
 */
export const DEPARTMENT_SCHOOL_MAP: Record<string, string> = {
  "Computer Science": "School of Computing",
  "Software Engineering": "School of Computing",
  "Information Technology": "School of Computing",
  "Civil Engineering": "School of Engineering",
  "Mechanical Engineering": "School of Engineering",
  "Electrical Engineering": "School of Engineering",
  "Computer Engineering": "School of Engineering",
  Accounting: "School of Management Science",
  Finance: "School of Management Science",
  "Business Administration": "School of Management Science",
  "Business Administration and Marketing": "School of Management Science",
  "Information Resource Management": "School of Management Science",
  "Mass Communication": "School of Social Sciences",
  Economics: "School of Social Sciences",
  "Social Work": "School of Social Sciences",
  "Political Science and Public Administration": "School of Social Sciences",
  "Private and Commercial Law": "School of Law and Security",
  "Jurisprudence and Public Law": "School of Law and Security",
  "International Law and Security Studies": "School of Law and Security",
  Law: "School of Law and Security",
  "Nursing Science": "School of Nursing Sciences",
  "Public Health": "School of Public and Allied Health",
};

let liveDepartmentSchoolMap: Map<string, string> = new Map();

export function setLiveDepartmentRegistry(
  departments: { name: string; school: string }[],
) {
  liveDepartmentSchoolMap = new Map(
    departments.map((d) => [d.name.toLowerCase().trim(), d.school]),
  );
}

export function getParentSchool(deptName: string): string {
  const norm = (deptName || "").trim().toLowerCase();

  // 1. Check live database registry if loaded
  if (liveDepartmentSchoolMap.has(norm)) {
    return liveDepartmentSchoolMap.get(norm)!;
  }
  for (const [name, school] of liveDepartmentSchoolMap.entries()) {
    if (norm.includes(name) || name.includes(norm)) {
      return school;
    }
  }

  // 2. Fall back to static dictionary
  for (const [d, s] of Object.entries(DEPARTMENT_SCHOOL_MAP)) {
    if (d.toLowerCase() === norm) {
      return s;
    }
  }
  for (const [d, s] of Object.entries(DEPARTMENT_SCHOOL_MAP)) {
    if (
      d.toLowerCase() === norm ||
      norm.includes(d.toLowerCase()) ||
      d.toLowerCase().includes(norm)
    ) {
      return s;
    }
  }
  return "School of Computing";
}

/**
 * Checks whether a venue is accessible to a given department:
 * 1. Direct owner: Accessible (whether exclusive or shared)
 * 2. Exclusive: Accessible ONLY if explicitly assigned to this department
 * 3. Shared: Accessible to any department within the parent school family of assigned departments,
 *    or if it belongs to a university-wide common pool.
 */
export function isVenueAccessibleToDepartment(
  venue: {
    name?: string;
    spaceType?: "exclusive" | "shared" | string;
    deptOwners?: string[];
    dept_owners?: string[];
    assignedDept?: string | null;
  },
  deptName: string,
): boolean {
  if (!deptName) return true;
  const deptNorm = deptName.trim().toLowerCase();
  const parentSchool = getParentSchool(deptName).toLowerCase();
  const spaceType = (venue.spaceType || "exclusive").toLowerCase();

  // Extract all owner names
  const rawOwners: string[] =
    venue.deptOwners ||
    (venue as any).dept_owners ||
    (venue.assignedDept ? [venue.assignedDept] : []);
  const owners = rawOwners.flatMap((o) =>
    typeof o === "string"
      ? o.split(",").map((s) => s.trim().toLowerCase())
      : [],
  );

  // 1. Direct owner can ALWAYS use it
  if (
    owners.some(
      (o) => o === deptNorm || deptNorm.includes(o) || o.includes(deptNorm),
    )
  ) {
    return true;
  }

  // 2. Exclusive venues CANNOT be shared across departments
  if (spaceType === "exclusive") {
    return false;
  }

  // 3. Shared venues:
  // a) Universal / University-wide shared venues
  const universal = [
    "university wide",
    "all departments",
    "university pool",
    "general studies",
    "central administration",
    "chapel administration",
  ];
  if (owners.some((o) => universal.some((u) => o.includes(u)))) {
    return true;
  }

  // b) Check if any owner belongs to the same parent school family
  for (const owner of owners) {
    const ownerSchool = getParentSchool(owner).toLowerCase();
    if (ownerSchool === parentSchool) {
      return true;
    }
    // Computing and Engineering school family grouping
    if (
      (parentSchool.includes("computing") ||
        parentSchool.includes("engineering")) &&
      (ownerSchool.includes("computing") || ownerSchool.includes("engineering"))
    ) {
      return true;
    }
  }

  return false;
}

export const days = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export const slots = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
] as const;

export type Session = {
  code: string;
  lecturer: string;
  venue: string;
  day: (typeof days)[number];
  slot: (typeof slots)[number];
  duration?: number;
  group?: string;
  level?: string;
  isVirtual?: boolean;
  conflict?: "venue" | "capacity" | "lecturer" | "availability";
};

export const sessions: Session[] = [];

export type ConstraintKind = string;

export type Constraint = {
  id: string;
  kind: string;
  lecturer: string;
  detail: string;
  range: string;
  department?: string;
  categoryId?: string;
  params?: Record<string, any>;
};

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC CONSTRAINT TYPE DEFINITIONS & PARAMETER TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export type ConstraintRuleArchetype =
  | "time_window" // Available/unavailable during specific days/times
  | "full_absence" // Completely unavailable for semester or date range
  | "daily_load_limit" // Maximum lecture hours a lecturer can teach in one day
  | "consecutive_hours" // Maximum back-to-back teaching hours without a break
  | "venue_requirement" // Course requires specific venue or venue type
  | "custom_rule"; // General institutional constraint

export type ParameterFieldType =
  | "text"
  | "number"
  | "select"
  | "date_range"
  | "days_multi"
  | "days_time_range"
  | "time_slot"
  | "boolean"
  | "lecturer_select";

export interface ConstraintParameterField {
  key: string;
  label: string;
  type: ParameterFieldType;
  options?: string[];
  defaultValue?: any;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}

export interface ConstraintTypeDefinition {
  id: string;
  name: string;
  category:
    | "Faculty Availability"
    | "Workload & Pacing"
    | "Venue & Space"
    | "Institutional";
  description: string;
  archetype: ConstraintRuleArchetype;
  parameters: ConstraintParameterField[];
  isSystemDefault?: boolean;
  isActive: boolean;
  iconName?: string;
}

export interface ConstraintArchetypeTemplate {
  archetype: ConstraintRuleArchetype;
  title: string;
  description: string;
  icon: string;
  suggestedParameters: ConstraintParameterField[];
}

export const constraintArchetypeTemplates: ConstraintArchetypeTemplate[] = [
  {
    archetype: "time_window",
    title: "Restricted Days & Teaching Hours",
    description:
      "Sets specific days or times when a lecturer is free to teach or unavailable (such as research days, hospital duty, or visiting faculty hours).",
    icon: "Clock",
    suggestedParameters: [
      {
        key: "lecturer",
        label: "Lecturer Name",
        type: "lecturer_select",
        required: true,
      },
      {
        key: "range",
        label: "Restricted Days",
        type: "days_multi",
        required: true,
        hint: "Select at least one day.",
      },
      {
        key: "detail",
        label: "Reason / Note",
        type: "text",
        placeholder: "e.g. Hospital clinic duty or research day",
        required: true,
      },
    ],
  },
  {
    archetype: "full_absence",
    title: "Lecturer Leave of Absence",
    description:
      "For lecturers away on doctoral studies, sabbatical, conference travel, or medical leave.",
    icon: "Plane",
    suggestedParameters: [
      {
        key: "lecturer",
        label: "Lecturer Name",
        type: "lecturer_select",
        required: true,
      },
      {
        key: "range",
        label: "Leave Period / Dates",
        type: "date_range",
        required: true,
        hint: "Choose the first and last day of the leave.",
      },
      {
        key: "substitute",
        label: "Covered by External Substitute",
        type: "boolean",
        defaultValue: true,
        hint: "Check if classes will be taught by a designated substitute",
      },
      {
        key: "detail",
        label: "Leave Purpose & Institution",
        type: "text",
        placeholder: "e.g. Doctoral fellowship at University of Ibadan",
        required: true,
      },
    ],
  },
  {
    archetype: "daily_load_limit",
    title: "Daily Teaching Limit",
    description:
      "Sets the maximum number of lecture hours a lecturer can teach in one day to prevent fatigue.",
    icon: "Layers",
    suggestedParameters: [
      {
        key: "lecturer",
        label: "Lecturer Name",
        type: "lecturer_select",
        required: true,
      },
      {
        key: "maxHours",
        label: "Maximum Hours per Day",
        type: "number",
        defaultValue: 4,
        required: true,
        hint: "Recommended: 4 hours maximum per day",
      },
      {
        key: "detail",
        label: "Policy Note",
        type: "text",
        placeholder: "e.g. Faculty wellness policy",
        required: true,
      },
    ],
  },
  {
    archetype: "consecutive_hours",
    title: "Rest Break / Back-to-Back Limit",
    description:
      "Prevents a lecturer from teaching continuous back-to-back classes for too many hours without a break.",
    icon: "Clock",
    suggestedParameters: [
      {
        key: "lecturer",
        label: "Lecturer Name",
        type: "lecturer_select",
        required: true,
      },
      {
        key: "maxConsecutive",
        label: "Max Continuous Hours",
        type: "number",
        defaultValue: 2,
        required: true,
        hint: "Recommended: 2 hours maximum without a break",
      },
      {
        key: "detail",
        label: "Policy Note",
        type: "text",
        placeholder: "e.g. Mandatory rest break between classes",
        required: true,
      },
    ],
  },
  {
    archetype: "venue_requirement",
    title: "Special Room / Lab Requirement",
    description:
      "Requires courses under this rule to always be scheduled in a specific room type (such as computer labs or amphitheatre).",
    icon: "Building2",
    suggestedParameters: [
      {
        key: "lecturer",
        label: "Lecturer or Group",
        type: "text",
        placeholder: "e.g. All Faculty or Computing Dept",
        required: true,
      },
      {
        key: "range",
        label: "Required Room Type",
        type: "select",
        options: [
          "Computing Laboratory",
          "Lecture Theatre",
          "Auditorium",
          "Seminar Room",
        ],
        defaultValue: "Computing Laboratory",
        required: true,
      },
      {
        key: "detail",
        label: "Reason / Equipment Needed",
        type: "text",
        placeholder: "e.g. High-performance workstations required",
        required: true,
      },
    ],
  },
  {
    archetype: "custom_rule",
    title: "General University Rule",
    description:
      "A flexible institutional rule for any special scheduling policy.",
    icon: "ShieldCheck",
    suggestedParameters: [
      {
        key: "lecturer",
        label: "Lecturer or Cohort",
        type: "text",
        placeholder: "e.g. All Faculty or 300 Level",
        required: true,
      },
      {
        key: "range",
        label: "Target Window / Time",
        type: "text",
        placeholder: "e.g. Mornings only or Mid-Semester",
        required: true,
      },
      {
        key: "detail",
        label: "Rule Description",
        type: "text",
        placeholder: "e.g. Departmental meeting reserved window",
        required: true,
      },
    ],
  },
];

export const defaultConstraintTypes: ConstraintTypeDefinition[] = [];

export const constraints: Constraint[] = [];

export type TimelineStep = {
  actor: string;
  role: string;
  action: string;
  at: string;
  state: "done" | "current" | "pending" | "rejected";
  comment?: string;
};

export function deduplicateTimeline(steps: TimelineStep[]): TimelineStep[] {
  if (!Array.isArray(steps) || steps.length <= 1) return steps || [];

  const result: TimelineStep[] = [];
  for (let i = 0; i < steps.length; i++) {
    const current = steps[i];
    const prev = result[result.length - 1];

    if (prev) {
      const sameAction =
        (current.action || "").trim().toLowerCase() ===
        (prev.action || "").trim().toLowerCase();
      const sameRole =
        (current.role || "").trim().toLowerCase() ===
        (prev.role || "").trim().toLowerCase();
      const sameActor =
        (current.actor || "").trim().toLowerCase() ===
        (prev.actor || "").trim().toLowerCase();
      const sameState = current.state === prev.state;
      const sameComment =
        (current.comment || "").trim() === (prev.comment || "").trim();
      const sameAt =
        (current.at || "").trim().toLowerCase() ===
        (prev.at || "").trim().toLowerCase();

      let closeInTime = sameAt;
      if (!closeInTime && (current as any).createdAt && (prev as any).createdAt) {
        const diff = Math.abs(
          new Date((current as any).createdAt).getTime() -
            new Date((prev as any).createdAt).getTime(),
        );
        if (diff < 120000) closeInTime = true;
      }

      if (sameAction && sameRole && sameActor && sameState && sameComment && closeInTime) {
        continue;
      }
    }
    result.push(current);
  }
  return result;
}

export const timeline: TimelineStep[] = [];

export const user = {
  name: "Yakubu Onome",
  email: "y.onome@bupulse.edu",
  role: "Departmental T.O",
};

export type UserRole =
  | "deptTO"
  | "hod"
  | "dean"
  | "acadPlanningTO"
  | "superAdmin";

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  department?: string;
  school?: string;
  avatarTone: "brand" | "violet" | "good" | "warn";
  initials: string;
};

export const accounts: UserAccount[] = [
  {
    id: "yakubu",
    name: "Yakubu Onome",
    email: "y.onome@bupulse.edu",
    role: "deptTO",
    roleLabel: "Dept T.O (Computer Science)",
    department: "Computer Science",
    school: "School of Computing",
    avatarTone: "violet",
    initials: "YO",
  },
  {
    id: "flourence",
    name: "Flourence Adeyemi",
    email: "flourencea@babcock.edu.ng",
    role: "deptTO",
    roleLabel: "Dept T.O (Software Eng.)",
    department: "Software Engineering",
    school: "School of Computing",
    avatarTone: "brand",
    initials: "FA",
  },
  {
    id: "olumide",
    name: "Dr. A. Olumide",
    email: "a.olumide@bupulse.edu",
    role: "hod",
    roleLabel: "Head of Department",
    department: "Computer Science",
    school: "School of Computing",
    avatarTone: "brand",
    initials: "AO",
  },
  {
    id: "bassey",
    name: "Prof. E. Bassey",
    email: "e.bassey@bupulse.edu",
    role: "dean",
    roleLabel: "Dean",
    school: "School of Computing",
    avatarTone: "good",
    initials: "EB",
  },
  {
    id: "danladi",
    name: "M. Danladi",
    email: "m.danladi@babcock.edu.ng",
    role: "acadPlanningTO",
    roleLabel: "Acad. Planning T.O",
    avatarTone: "warn",
    initials: "MD",
  },
  // School of Management Sciences Accounts
  {
    id: "akande_irm",
    name: "Akande Oyebola",
    email: "o.akande@babcock.edu.ng",
    role: "deptTO",
    roleLabel: "Dept T.O (Info. Resource Mgt)",
    department: "Information Resource Management",
    school: "School of Management Science",
    avatarTone: "brand",
    initials: "AO",
  },
  {
    id: "madukoma_irm",
    name: "Dr. Ezinwayi Madukoma",
    email: "e.madukoma@babcock.edu.ng",
    role: "hod",
    roleLabel: "Head of Dept (IRM)",
    department: "Information Resource Management",
    school: "School of Management Science",
    avatarTone: "violet",
    initials: "DE",
  },
  {
    id: "abimbola_acc",
    name: "Sola Abimbola",
    email: "s.abimbola@babcock.edu.ng",
    role: "deptTO",
    roleLabel: "Dept T.O (Accounting)",
    department: "Accounting",
    school: "School of Management Science",
    avatarTone: "good",
    initials: "SA",
  },
  {
    id: "eze_acc",
    name: "Dr. P. Eze",
    email: "p.eze@babcock.edu.ng",
    role: "hod",
    roleLabel: "Head of Dept (Accounting)",
    department: "Accounting",
    school: "School of Management Science",
    avatarTone: "warn",
    initials: "DP",
  },
  {
    id: "nwosu_bam",
    name: "Emeka Nwosu",
    email: "e.nwosu@babcock.edu.ng",
    role: "deptTO",
    roleLabel: "Dept T.O (Business Admin & Mkt)",
    department: "Business Administration and Marketing",
    school: "School of Management Science",
    avatarTone: "violet",
    initials: "EN",
  },
  {
    id: "okeke_bam",
    name: "Dr. C. Okeke",
    email: "c.okeke@babcock.edu.ng",
    role: "hod",
    roleLabel: "Head of Dept (BAM)",
    department: "Business Administration and Marketing",
    school: "School of Management Science",
    avatarTone: "brand",
    initials: "DC",
  },
  {
    id: "oladele_fin",
    name: "Ibijoke Oladele",
    email: "i.oladele@babcock.edu.ng",
    role: "deptTO",
    roleLabel: "Dept T.O (Finance)",
    department: "Finance",
    school: "School of Management Science",
    avatarTone: "warn",
    initials: "IO",
  },
  {
    id: "akintola_fin",
    name: "Dr. F. Akintola",
    email: "f.akintola@babcock.edu.ng",
    role: "hod",
    roleLabel: "Head of Dept (Finance)",
    department: "Finance",
    school: "School of Management Science",
    avatarTone: "good",
    initials: "DF",
  },
  {
    id: "adeleke_dean_sms",
    name: "Prof. O. Adeleke",
    email: "dean.sms@babcock.edu.ng",
    role: "dean",
    roleLabel: "Dean (Management Sciences)",
    school: "School of Management Science",
    avatarTone: "brand",
    initials: "OA",
  },
];

export type SubmissionSession = {
  code: string;
  lecturer: string;
  venue: string;
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | string;
  slot: string;
  duration?: number;
  level?: string;
  group?: string;
  isVirtual?: boolean;
  conflict?: boolean;
};

export type DeptSubmission = {
  id: string;
  department: string;
  school: string;
  level: string;
  semester: string;
  deptTO: string;
  hod: string;
  dean: string;
  deanSignedAt: string;
  courses: number;
  units: number;
  conflicts: number;
  status: "pending" | "approved" | "returned" | "published";
  rawStatus?: string;
  returnComment?: string;
  publishedAt?: string;
  sessions: SubmissionSession[];
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: "approved" | "returned" | "published";
  department: string;
  school: string;
  level: string;
  at: string;
  note?: string;
};

export function deduplicateAuditEntries(entries: AuditEntry[]): AuditEntry[] {
  if (!Array.isArray(entries) || entries.length <= 1) return entries || [];

  const result: AuditEntry[] = [];
  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];
    const prev = result[result.length - 1];

    if (prev) {
      const sameAction =
        (current.action || "").trim().toLowerCase() ===
        (prev.action || "").trim().toLowerCase();
      const sameDept =
        (current.department || "").trim().toLowerCase() ===
        (prev.department || "").trim().toLowerCase();
      const sameActor =
        (current.actor || "").trim().toLowerCase() ===
        (prev.actor || "").trim().toLowerCase();
      const sameNote =
        (current.note || "").trim().toLowerCase() ===
        (prev.note || "").trim().toLowerCase();
      const sameAt =
        (current.at || "").trim().toLowerCase() ===
        (prev.at || "").trim().toLowerCase();

      let closeInTime = sameAt;
      if (!closeInTime && (current as any).createdAt && (prev as any).createdAt) {
        const diff = Math.abs(
          new Date((current as any).createdAt).getTime() -
            new Date((prev as any).createdAt).getTime(),
        );
        if (diff < 120000) closeInTime = true;
      }

      if (sameAction && sameDept && sameActor && sameNote && closeInTime) {
        continue;
      }
    }
    result.push(current);
  }
  return result;
}

export const deptSubmissions: DeptSubmission[] = [];

// ── Constraints management (Acad Planning T.O) ──────────────────────────────

export type VenueRecord = {
  id: string;
  name: string;
  capacity: number;
  type: "Lecture Hall" | "Seminar Room" | "Lab" | "Auditorium";
  assignedDept: string | null;
  school: string | null;
  floor?: string | null;
  spaceType?: "shared" | "exclusive";
  isVirtual?: boolean;
};

export type AdjunctRecord = {
  id: string;
  name: string;
  department: string;
  school: string;
  courses: string[];
  availableDays: string[];
  note: string;
};

export type GlobalDayOff = {
  id: string;
  lecturer: string;
  department: string;
  date: string;
  reason: string;
  recurring: boolean;
};

export type GlobalStudyLeave = {
  id: string;
  lecturer: string;
  department: string;
  from: string;
  to: string;
  reason: string;
};

export const venueRecords: VenueRecord[] = [];

export const adjunctRecords: AdjunctRecord[] = [];

export const globalDaysOff: GlobalDayOff[] = [];

export const globalStudyLeaves: GlobalStudyLeave[] = [];

export const auditLog: AuditEntry[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC TIME LOCKS & OPERATING HOURS CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export interface LunchBreakLock {
  enabled: boolean;
  slot: (typeof slots)[number];
  duration: number; // Duration in hours (typically 1)
  label: string;
}

export interface EarlyClosingLock {
  id: string;
  enabled: boolean;
  day: (typeof days)[number];
  cutoffSlot: (typeof slots)[number]; // No lectures at or after this slot
  label: string;
  reason?: string;
}

export interface OperatingWindow {
  startSlot: (typeof slots)[number]; // e.g. "07:00"
  endSlot: (typeof slots)[number]; // e.g. "17:00"
}

export interface ChapelSeminarScheduleItem {
  day: (typeof days)[number];
  slot: (typeof slots)[number];
  duration: number;
  venue: string;
  lecturer: string;
  code: string;
  title: string;
}

export interface CustomTimeLock {
  id: string;
  title: string;
  day: (typeof days)[number];
  slot: (typeof slots)[number];
  duration: number; // in hours, e.g. 1 or 2
  level?: string; // "All Levels", "100 Level", "200 Level", etc.
  department?: string; // specific department or "All"
  reason?: string;
  enabled: boolean;
}

export interface DynamicTimeLockConfig {
  lunchBreak: LunchBreakLock;
  earlyClosings: EarlyClosingLock[];
  operatingWindow: OperatingWindow;
  chapelSeminarSchedule: Record<string, ChapelSeminarScheduleItem>;
  customTimeLocks: CustomTimeLock[];
}

export const defaultTimeLockConfig: DynamicTimeLockConfig = {
  lunchBreak: {
    enabled: true,
    slot: "13:00",
    duration: 1,
    label: "University Lunch Break",
  },
  earlyClosings: [
    {
      id: "wed-closing",
      enabled: true,
      day: "Wed",
      cutoffSlot: "17:00",
      label: "Midweek Fellowship Closing",
      reason: "Lectures conclude by 5:00 PM for fellowship and sports",
    },
    {
      id: "fri-closing",
      enabled: true,
      day: "Fri",
      cutoffSlot: "13:00",
      label: "Friday Afternoon Closing",
      reason: "Lectures conclude by 1:00 PM in preparation for Sabbath",
    },
  ],
  operatingWindow: {
    startSlot: "07:00",
    endSlot: "17:00",
  },
  chapelSeminarSchedule: {
    "100 Level": {
      day: "Mon",
      slot: "09:00",
      duration: 1,
      venue: "University Amphitheatre",
      lecturer: "Chilaka Uzoma",
      code: "BU-GST 011 / GEDS001",
      title: "Citizenship Orientation & Chapel Seminar",
    },
    "200 Level": {
      day: "Tue",
      slot: "09:00",
      duration: 1,
      venue: "University Amphitheatre",
      lecturer: "Chilaka Uzoma",
      code: "BU-GST 021",
      title: "Chapel Seminar & Leadership",
    },
    "300 Level": {
      day: "Wed",
      slot: "09:00",
      duration: 1,
      venue: "University Amphitheatre",
      lecturer: "Chilaka Uzoma",
      code: "BU-GST 031",
      title: "Chapel Seminar & Ethics",
    },
    "400 Level": {
      day: "Thu",
      slot: "09:00",
      duration: 1,
      venue: "University Amphitheatre",
      lecturer: "Chilaka Uzoma",
      code: "BU-GST 041",
      title: "Chapel Seminar & Career Transition",
    },
  },
  customTimeLocks: [
    {
      id: "lock-dept-assembly",
      title: "Departmental Student & Faculty Assembly",
      day: "Thu",
      slot: "12:00",
      duration: 1,
      level: "All Levels",
      department: "Computer Science",
      reason: "Monthly faculty-student townhall and mentorship",
      enabled: false,
    },
  ],
};

export function normalizeTimeLockConfig(raw: any): DynamicTimeLockConfig {
  if (!raw || typeof raw !== "object") return defaultTimeLockConfig;
  const rawChapel = raw.chapelSeminarSchedule || raw.chapelSlots;
  const hasValidChapel =
    rawChapel &&
    typeof rawChapel === "object" &&
    !Array.isArray(rawChapel) &&
    Object.keys(rawChapel).length > 0;
  const chapelSchedule = hasValidChapel
    ? { ...defaultTimeLockConfig.chapelSeminarSchedule, ...rawChapel }
    : { ...defaultTimeLockConfig.chapelSeminarSchedule };

  // Institutional policy: 400 Level Chapel Seminar is Thursday (Thu).
  // Guard against stale or conflicting payloads that set 400L to Monday (which falsely flags Monday 400L courses as chapel clashes).
  if (chapelSchedule["400 Level"]?.day === "Mon") {
    chapelSchedule["400 Level"] = {
      ...chapelSchedule["400 Level"],
      day: "Thu",
    };
  }

  return {
    ...defaultTimeLockConfig,
    ...raw,
    lunchBreak: {
      ...defaultTimeLockConfig.lunchBreak,
      ...(raw.lunchBreak || {}),
    },
    operatingWindow: {
      ...defaultTimeLockConfig.operatingWindow,
      ...(raw.operatingWindow || {}),
    },
    earlyClosings: Array.isArray(raw.earlyClosings)
      ? raw.earlyClosings
      : defaultTimeLockConfig.earlyClosings,
    chapelSeminarSchedule: chapelSchedule,
    customTimeLocks: Array.isArray(raw.customTimeLocks)
      ? raw.customTimeLocks
      : defaultTimeLockConfig.customTimeLocks || [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENTAL EVENTS (e.g. Departmental Week, Hackathon, Symposium)
// ─────────────────────────────────────────────────────────────────────────────

export interface DepartmentalEvent {
  id: string;
  title: string;
  department?: string;
  category:
    | "Departmental Week"
    | "Symposium"
    | "Exhibition"
    | "Fellowship"
    | "Orientation"
    | "Special Lecture"
    | "Hackathon"
    | "Social / Dinner"
    | "General"
    | (string & {});
  week: string; // e.g. "Semester Week 8", "Week 7 (Oct 26 – Oct 30)"
  dates?: string; // e.g. "Oct 26 – Oct 30" or "Wed 14:00"
  day?: (typeof days)[number] | "All Week";
  timeRange?: string; // e.g. "10:00 – 14:00" or "All Day"
  venue?: string; // e.g. "BUC Auditorium", "University Amphitheatre"
  level?: string; // "All Levels", "100 Level", etc.
  description?: string;
  advisoryNote?: string;
  exemptFromLectures?: boolean;
}

export const initialDepartmentalEvents: DepartmentalEvent[] = [];
