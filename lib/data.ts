

// BU Pulse — Timetabling seed data for the Department of Computer Science

export type Status =
  | "Draft generated"
  | "Constraints in progress"
  | "Submitted to HOD"
  | "Rejected by HOD"
  | "Submitted to Dean"
  | "Submitted to Acad Pl. T.O"
  | "Published";

export const department = {
  name: "Computer Science",
  school: "School of Computing & Engineering",
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

import universityAllocationsJson from "./university_allocations.json";

export const universityAllocations = universityAllocationsJson as Record<
  string,
  Allocation[]
>;

// Default to Computer Science allocations from 2026_2027_first_semester_allocation.xlsx (169 allocations)
export const allocations: Allocation[] =
  universityAllocations["Computer Science"] || [];

import universityVenuesData from "./university_venues.json";

export type Venue = {
  name: string;
  capacity: number;
  block: string;
  floor?: string | null;
  spaceType?: "shared" | "exclusive";
  deptOwners?: string[];
  isVirtual?: boolean;
};

export const allUniversityVenues: Venue[] = (universityVenuesData.all as unknown as Venue[]) || [];

// Derive School of Computing / Computer Science venues from venu.csv
const csVenueMap = new Map<string, Venue>();
const targetDepts = [
  "Computer Science",
  "Computer Science, Software Engineering, Information Technology",
  "School Of Computing (IT, CS, CS, And SE)",
  "Software Engineering",
  "Information Technology",
];

targetDepts.forEach((dept) => {
  const deptList = (universityVenuesData.byDepartment as Record<string, Venue[]>)[dept] || [];
  deptList.forEach((v) => {
    if (!csVenueMap.has(v.name)) {
      csVenueMap.set(v.name, v);
    }
  });
});

export const venues: Venue[] = Array.from(csVenueMap.values()).sort((a, b) => {
  if (a.isVirtual) return 1;
  if (b.isVirtual) return -1;
  return a.name.localeCompare(b.name);
});

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

export const sessions: Session[] = [
  { code: "CSC 203", lecturer: "ADEGBENJO Aderonke", venue: "BUC_ROOM1", day: "Mon", slot: "08:00", duration: 2, level: "200 Level", group: "Group A" },
  { code: "COS 201", lecturer: "Ayankoya Folashade", venue: "BUC_LAB1", day: "Mon", slot: "10:00", duration: 2, level: "200 Level", group: "Group A" },
  { code: "SEN 201", lecturer: "Akande Oyebola", venue: "SAT_B006", day: "Mon", slot: "14:00", duration: 2, level: "200 Level", group: "Group A" },
  { code: "BU-GST 221", lecturer: "Akintunde Adeyinka Oye", venue: "Virtual / LMS", day: "Tue", slot: "08:00", duration: 2, level: "200 Level", group: "Group A", isVirtual: true },
  { code: "BU-COS 209", lecturer: "Bankole Oloruntobi", venue: "BUC_ROOM2", day: "Tue", slot: "10:00", duration: 2, level: "200 Level", group: "Group B" },
  { code: "IFT 211", lecturer: "Fatade Oluwayemisi B", venue: "BUC_LAB2", day: "Tue", slot: "14:00", duration: 2, level: "200 Level", group: "Group B" },
  // Capacity conflict: BU-GST 215 has 180 students in SAT_A008 (cap 92)
  { code: "BU-GST 215", lecturer: "Dickson Theodore", venue: "SAT_A008", day: "Wed", slot: "10:00", duration: 2, level: "200 Level", group: "All", conflict: "capacity" },
  { code: "BU-CSC 333", lecturer: "Idepefo Felix Olutokunbo", venue: "BUC_LAB1", day: "Wed", slot: "14:00", duration: 2, level: "300 Level", group: "Group D" },
  { code: "CSC 301", lecturer: "UDOSEN Alfred Akpan", venue: "SAT_B106", day: "Thu", slot: "08:00", duration: 2, level: "300 Level", group: "Group C" },
  // Venue double-booking: two classes in CIT, Thu 10:00
  { code: "COSC111", lecturer: "Akande Oyebola", venue: "CIT", day: "Thu", slot: "10:00", duration: 2, level: "100 Level", group: "Group A", conflict: "venue" },
  { code: "SENG400", lecturer: "Bamidele Oluwadoyinsola", venue: "CIT", day: "Thu", slot: "10:00", duration: 2, level: "400 Level", group: "Group A", conflict: "venue" },
  { code: "INS 401", lecturer: "AWODELE SIMON", venue: "SAPHIRE_HALL1", day: "Fri", slot: "10:00", duration: 2, level: "400 Level", group: "Group A" },
];

export type ConstraintKind = string;

export type Constraint = {
  id: string;
  kind: string;
  lecturer: string;
  detail: string;
  range: string;
  department?: string;
  params?: Record<string, any>;
};

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC CONSTRAINT TYPE DEFINITIONS & PARAMETER TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export type ConstraintRuleArchetype =
  | "time_window"          // Available/unavailable during specific days/times
  | "full_absence"         // Completely unavailable for semester or date range
  | "daily_load_limit"     // Maximum lecture hours a lecturer can teach in one day
  | "consecutive_hours"    // Maximum back-to-back teaching hours without a break
  | "venue_requirement"    // Course requires specific venue or venue type
  | "custom_rule";         // General institutional constraint

export type ParameterFieldType =
  | "text"
  | "number"
  | "select"
  | "days_multi"
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
  category: "Faculty Availability" | "Workload & Pacing" | "Venue & Space" | "Institutional";
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
    description: "Sets specific days or times when a lecturer is free to teach or unavailable (such as research days, hospital duty, or visiting faculty hours).",
    icon: "Clock",
    suggestedParameters: [
      { key: "lecturer", label: "Lecturer Name", type: "lecturer_select", required: true },
      { key: "range", label: "Restricted Days or Hours", type: "text", placeholder: "e.g. Every Wednesday, or Tuesdays & Fridays", required: true },
      { key: "detail", label: "Reason / Note", type: "text", placeholder: "e.g. Hospital clinic duty or research day", required: true },
    ],
  },
  {
    archetype: "full_absence",
    title: "Lecturer Leave of Absence",
    description: "For lecturers away on doctoral studies, sabbatical, conference travel, or medical leave.",
    icon: "Plane",
    suggestedParameters: [
      { key: "lecturer", label: "Lecturer Name", type: "lecturer_select", required: true },
      { key: "range", label: "Leave Period / Dates", type: "text", placeholder: "e.g. 12 Jan – 28 Feb or First Semester", required: true },
      { key: "substitute", label: "Covered by External Substitute", type: "boolean", defaultValue: true, hint: "Check if classes will be taught by a designated substitute" },
      { key: "detail", label: "Leave Purpose & Institution", type: "text", placeholder: "e.g. Doctoral fellowship at University of Ibadan", required: true },
    ],
  },
  {
    archetype: "daily_load_limit",
    title: "Daily Teaching Limit",
    description: "Sets the maximum number of lecture hours a lecturer can teach in one day to prevent fatigue.",
    icon: "Layers",
    suggestedParameters: [
      { key: "lecturer", label: "Lecturer Name", type: "lecturer_select", required: true },
      { key: "maxHours", label: "Maximum Hours per Day", type: "number", defaultValue: 4, required: true, hint: "Recommended: 4 hours maximum per day" },
      { key: "detail", label: "Policy Note", type: "text", placeholder: "e.g. Faculty wellness policy", required: true },
    ],
  },
  {
    archetype: "consecutive_hours",
    title: "Rest Break / Back-to-Back Limit",
    description: "Prevents a lecturer from teaching continuous back-to-back classes for too many hours without a break.",
    icon: "Clock",
    suggestedParameters: [
      { key: "lecturer", label: "Lecturer Name", type: "lecturer_select", required: true },
      { key: "maxConsecutive", label: "Max Continuous Hours", type: "number", defaultValue: 2, required: true, hint: "Recommended: 2 hours maximum without a break" },
      { key: "detail", label: "Policy Note", type: "text", placeholder: "e.g. Mandatory rest break between classes", required: true },
    ],
  },
  {
    archetype: "venue_requirement",
    title: "Special Room / Lab Requirement",
    description: "Requires courses under this rule to always be scheduled in a specific room type (such as computer labs or amphitheatre).",
    icon: "Building2",
    suggestedParameters: [
      { key: "lecturer", label: "Lecturer or Group", type: "text", placeholder: "e.g. All Faculty or Computing Dept", required: true },
      { key: "range", label: "Required Room Type", type: "select", options: ["Computing Laboratory", "Lecture Theatre", "Auditorium", "Seminar Room"], defaultValue: "Computing Laboratory", required: true },
      { key: "detail", label: "Reason / Equipment Needed", type: "text", placeholder: "e.g. High-performance workstations required", required: true },
    ],
  },
  {
    archetype: "custom_rule",
    title: "General University Rule",
    description: "A flexible institutional rule for any special scheduling policy.",
    icon: "ShieldCheck",
    suggestedParameters: [
      { key: "lecturer", label: "Lecturer or Cohort", type: "text", placeholder: "e.g. All Faculty or 300 Level", required: true },
      { key: "range", label: "Target Window / Time", type: "text", placeholder: "e.g. Mornings only or Mid-Semester", required: true },
      { key: "detail", label: "Rule Description", type: "text", placeholder: "e.g. Departmental meeting reserved window", required: true },
    ],
  },
];

export const defaultConstraintTypes: ConstraintTypeDefinition[] = [
  {
    id: "type-study-leave",
    name: "Study Leave",
    category: "Faculty Availability",
    description: "Doctoral research fellowships, conferences, and approved academic leaves.",
    archetype: "full_absence",
    isSystemDefault: true,
    isActive: true,
    iconName: "Plane",
    parameters: [
      { key: "lecturer", label: "Faculty Member", type: "lecturer_select", required: true },
      { key: "detail", label: "Reason & Institution", type: "text", required: true, placeholder: "e.g. Doctoral fellowship" },
      { key: "range", label: "Date Window", type: "text", required: true, placeholder: "e.g. 12 Jan – 28 Feb" },
      { key: "substitute", label: "External Substitute", type: "boolean", defaultValue: true, hint: "Check if classes are covered externally" },
    ],
  },
  {
    id: "type-day-off",
    name: "Day Off",
    category: "Faculty Availability",
    description: "Weekly designated research days, clinical duties, or faculty release days.",
    archetype: "time_window",
    isSystemDefault: true,
    isActive: true,
    iconName: "CalendarOff",
    parameters: [
      { key: "lecturer", label: "Faculty Member", type: "lecturer_select", required: true },
      { key: "detail", label: "Activity Detail", type: "text", required: true, placeholder: "e.g. Research day" },
      { key: "range", label: "Recurring Day", type: "select", options: ["Every Wed", "Every Fri AM", "Every Mon", "Every Tue", "Every Thu"], defaultValue: "Every Wed", required: true },
    ],
  },
  {
    id: "type-adjunct",
    name: "Adjunct",
    category: "Faculty Availability",
    description: "Industry practitioners and guest faculty with restricted teaching availability.",
    archetype: "time_window",
    isSystemDefault: true,
    isActive: true,
    iconName: "UserCog",
    parameters: [
      { key: "lecturer", label: "Faculty Member", type: "lecturer_select", required: true },
      { key: "detail", label: "Practitioner Detail", type: "text", required: true, placeholder: "e.g. Industry practitioner" },
      { key: "range", label: "Permitted Window", type: "select", options: ["Tue, Fri", "After 14:00", "Wednesdays Only", "Mon, Wed"], defaultValue: "Tue, Fri", required: true },
    ],
  },
  {
    id: "type-daily-load",
    name: "Max Daily Load",
    category: "Workload & Pacing",
    description: "Limits maximum daily lecture hours per faculty member to prevent burnout.",
    archetype: "daily_load_limit",
    isSystemDefault: true,
    isActive: true,
    iconName: "Layers",
    parameters: [
      { key: "lecturer", label: "Faculty Member", type: "lecturer_select", required: true },
      { key: "maxHours", label: "Max Hours per Day", type: "number", defaultValue: 4, required: true },
      { key: "range", label: "Max Hours Ceiling", type: "text", defaultValue: "Max 4h/day", required: true },
      { key: "detail", label: "Guideline Note", type: "text", defaultValue: "Faculty wellness & daily teaching ceiling", required: true },
    ],
  },
  {
    id: "type-consecutive-hours",
    name: "Consecutive Hours Limit",
    category: "Workload & Pacing",
    description: "Restricts back-to-back lecture sessions without a break (max 2 hours continuous).",
    archetype: "consecutive_hours",
    isSystemDefault: true,
    isActive: true,
    iconName: "Clock",
    parameters: [
      { key: "lecturer", label: "Faculty Member", type: "lecturer_select", required: true },
      { key: "maxConsecutive", label: "Max Continuous Hours", type: "number", defaultValue: 2, required: true },
      { key: "range", label: "Consecutive Limit", type: "text", defaultValue: "Max 2h block", required: true },
      { key: "detail", label: "Guideline Note", type: "text", defaultValue: "Mandatory rest interval between continuous classes", required: true },
    ],
  },
  {
    id: "type-admin-blackout",
    name: "Administrative Blackout",
    category: "Institutional",
    description: "Blocks out departmental board, senate, or deanery meeting hours from lectures.",
    archetype: "time_window",
    isSystemDefault: false,
    isActive: true,
    iconName: "ShieldCheck",
    parameters: [
      { key: "lecturer", label: "Applies To", type: "lecturer_select", defaultValue: "All Faculty", required: true },
      { key: "detail", label: "Meeting Name", type: "text", defaultValue: "School Board Meeting", required: true },
      { key: "range", label: "Day & Time Window", type: "select", options: ["Thu 12:00 – 14:00", "Wed 15:00 – 17:00", "Mon 10:00 – 12:00"], defaultValue: "Thu 12:00 – 14:00", required: true },
    ],
  },
];

export const constraints: Constraint[] = [
  { id: "c1", kind: "Study Leave", lecturer: "Adebanjo Olawunmi Asake", detail: "Doctoral research fellowship (Substituted externally)", range: "12 Jan – 28 Feb" },
  { id: "c2", kind: "Study Leave", lecturer: "DARAMOLA CHRISTIANA", detail: "International conference & sabbatical (Substituted externally)", range: "05 – 19 Feb" },
  { id: "c3", kind: "Day Off", lecturer: "Akinwunmi Damilare Samuel", detail: "Recurring — Wednesdays", range: "Every Wed" },
  { id: "c4", kind: "Day Off", lecturer: "Nzenwata Uchenna Jeremiah", detail: "Clinical / Research day", range: "Every Fri AM" },
  { id: "c5", kind: "Adjunct", lecturer: "Adeoye Ayodele Olusegun", detail: "Industry practitioner — Tue & Fri only", range: "Tue, Fri" },
  { id: "c6", kind: "Adjunct", lecturer: "Bamishile Olabode Oludare", detail: "Visiting faculty — evenings only", range: "After 14:00" },
];

export type TimelineStep = {
  actor: string;
  role: string;
  action: string;
  at: string;
  state: "done" | "current" | "pending" | "rejected";
  comment?: string;
};

export const timeline: TimelineStep[] = [
  { actor: "Yakubu Onome", role: "Dept T.O", action: "Draft generated & submitted", at: "Mar 04, 09:12", state: "done" },
  { actor: "Dr. A. Olumide", role: "HOD", action: "Rejected with comment", at: "Mar 04, 15:40", state: "rejected", comment: "BU-GST 205 exceeds LT 12 capacity — relocate to CST Hall A. Also resolve the Thu 12:00 venue clash in CST Hall A before resubmitting." },
  { actor: "Yakubu Onome", role: "Dept T.O", action: "Revising draft", at: "In progress", state: "current" },
  { actor: "Prof. E. Bassey", role: "Dean", action: "School-level approval", at: "Pending", state: "pending" },
  { actor: "M. Danladi", role: "Acad Pl. T.O", action: "Final approval & publish", at: "Pending", state: "pending" },
];

export const user = {
  name: "Yakubu Onome",
  email: "y.onome@bupulse.edu",
  role: "Departmental T.O",
};

export type UserRole = "deptTO" | "hod" | "dean" | "acadPlanningTO";

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
    school: "School of Computing & Engineering",
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
    school: "School of Computing & Engineering",
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
    school: "School of Computing & Engineering",
    avatarTone: "brand",
    initials: "AO",
  },
  {
    id: "bassey",
    name: "Prof. E. Bassey",
    email: "e.bassey@bupulse.edu",
    role: "dean",
    roleLabel: "Dean",
    school: "School of Computing & Engineering",
    avatarTone: "good",
    initials: "EB",
  },
  {
    id: "danladi",
    name: "M. Danladi",
    email: "m.danladi@bupulse.edu",
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
];

export type SubmissionSession = {
  code: string;
  lecturer: string;
  venue: string;
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri";
  slot: "08:00" | "10:00" | "12:00" | "14:00" | "16:00";
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

export const deptSubmissions: DeptSubmission[] = [
  {
    id: "cs-200",
    department: "Computer Science",
    school: "School of Computing & Engineering",
    level: "200 Level",
    semester: "First Semester 2025/26",
    deptTO: "Yakubu Onome",
    hod: "Dr. A. Olumide",
    dean: "Prof. E. Bassey",
    deanSignedAt: "Mar 07, 11:34",
    courses: 9,
    units: 27,
    conflicts: 0,
    status: "pending",
    sessions: [
      { code: "COSC 204", lecturer: "Maitanmi S.O", venue: "Lab 3 — Software", day: "Mon", slot: "08:00" },
      { code: "COSC 200", lecturer: "Adams P.L", venue: "CST Hall B", day: "Mon", slot: "10:00" },
      { code: "SENG 270", lecturer: "Rodriguez T.F", venue: "Lab 5 — Networks", day: "Mon", slot: "14:00" },
      { code: "BU-GST 201", lecturer: "Nguyen A.K", venue: "CST Hall A", day: "Tue", slot: "08:00" },
      { code: "COSC 202", lecturer: "Johnson R.T", venue: "LT 12", day: "Tue", slot: "12:00" },
      { code: "ITGY 271", lecturer: "Lee M.N", venue: "Lab 3 — Software", day: "Tue", slot: "16:00" },
      { code: "BU-GST 205", lecturer: "Williams H.J", venue: "CST Hall A", day: "Wed", slot: "10:00" },
      { code: "COSC 268", lecturer: "Peterson J.E", venue: "Lab 3 — Software", day: "Wed", slot: "14:00" },
      { code: "COSC 872", lecturer: "Singh R.V", venue: "CST Hall B", day: "Thu", slot: "08:00" },
    ],
  },
  {
    id: "se-200",
    department: "Software Engineering",
    school: "School of Computing & Engineering",
    level: "All Levels",
    semester: "First Semester 2026/27",
    deptTO: "Flourence Adeyemi",
    hod: "Dr. A. Olumide",
    dean: "Prof. E. Bassey",
    deanSignedAt: "Mar 07, 11:45",
    courses: 8,
    units: 24,
    conflicts: 0,
    status: "pending",
    sessions: [
      { code: "SENG 201", lecturer: "Maitanmi S.O", venue: "BUC_LAB1", day: "Mon", slot: "10:00" },
      { code: "SENG 203", lecturer: "Adams P.L", venue: "SAT_A008", day: "Tue", slot: "10:00" },
      { code: "SENG 305", lecturer: "Nguyen A.K", venue: "CIT", day: "Wed", slot: "08:00" },
    ],
  },
  {
    id: "ee-300",
    department: "Electrical Engineering",
    school: "School of Computing & Engineering",
    level: "300 Level",
    semester: "First Semester 2025/26",
    deptTO: "Fatima Bello",
    hod: "Dr. K. Amadi",
    dean: "Prof. E. Bassey",
    deanSignedAt: "Mar 07, 09:18",
    courses: 11,
    units: 33,
    conflicts: 0,
    status: "pending",
    sessions: [
      { code: "EELE 301", lecturer: "Adeyemi O.P", venue: "Eng Hall A", day: "Mon", slot: "08:00" },
      { code: "EELE 302", lecturer: "Okafor B.J", venue: "Lab 7 — Electronics", day: "Mon", slot: "12:00" },
      { code: "EELE 303", lecturer: "Abdullahi K.S", venue: "LT 12", day: "Tue", slot: "12:00" },
      { code: "EELE 304", lecturer: "Peters N.O", venue: "Eng Hall B", day: "Tue", slot: "14:00" },
      { code: "EELE 305", lecturer: "Olawale F.B", venue: "Eng Hall A", day: "Wed", slot: "08:00" },
      { code: "EELE 306", lecturer: "Chukwu G.A", venue: "Lab 7 — Electronics", day: "Wed", slot: "14:00" },
      { code: "EELE 307", lecturer: "Osei M.T", venue: "Eng Hall A", day: "Thu", slot: "08:00" },
      { code: "EELE 308", lecturer: "Taiwo B.K", venue: "Eng Hall B", day: "Thu", slot: "12:00" },
      { code: "EELE 309", lecturer: "Yusuf S.O", venue: "Eng Hall A", day: "Fri", slot: "08:00" },
      { code: "BU-GST 301", lecturer: "Ibrahim T.A", venue: "CST Hall A", day: "Fri", slot: "10:00" },
      { code: "BU-GST 302", lecturer: "Balogun P.R", venue: "CST Hall B", day: "Fri", slot: "14:00" },
    ],
  },
  {
    id: "mcm-100",
    department: "Mass Communication",
    school: "School of Social Sciences",
    level: "100 Level",
    semester: "First Semester 2025/26",
    deptTO: "Ngozi Igwe",
    hod: "Dr. S. Afolabi",
    dean: "Prof. H. Oke",
    deanSignedAt: "Mar 06, 12:40",
    courses: 6,
    units: 18,
    conflicts: 0,
    status: "pending",
    sessions: [
      { code: "MCOM 101", lecturer: "Okonkwo N.J", venue: "Art Hall A", day: "Mon", slot: "08:00" },
      { code: "MCOM 102", lecturer: "Adejoke A.B", venue: "Studio 1", day: "Mon", slot: "14:00" },
      { code: "MCOM 103", lecturer: "Eze K.M", venue: "Art Hall A", day: "Tue", slot: "10:00" },
      { code: "MCOM 104", lecturer: "Oduola V.S", venue: "Art Hall B", day: "Wed", slot: "08:00" },
      { code: "BU-GST 101", lecturer: "Ibrahim T.A", venue: "LT 15", day: "Thu", slot: "08:00" },
      { code: "BU-GST 102", lecturer: "Chukwuemeka O.B", venue: "LT 15", day: "Fri", slot: "10:00" },
    ],
  },
  {
    id: "bus-100",
    department: "Business Administration",
    school: "School of Management Sciences",
    level: "100 Level",
    semester: "First Semester 2025/26",
    deptTO: "Emeka Nwosu",
    hod: "Dr. C. Okeke",
    dean: "Prof. L. Adegoke",
    deanSignedAt: "Mar 06, 16:50",
    courses: 8,
    units: 24,
    conflicts: 1,
    status: "pending",
    sessions: [
      { code: "BUSA 101", lecturer: "Nwosu E.C", venue: "Mgt Hall A", day: "Mon", slot: "10:00" },
      { code: "BUSA 102", lecturer: "Okafor D.M", venue: "Mgt Hall B", day: "Mon", slot: "14:00" },
      { code: "BUSA 103", lecturer: "Adeyemi R.K", venue: "Mgt Hall A", day: "Tue", slot: "08:00" },
      { code: "BUSA 104", lecturer: "Lawal S.T", venue: "Mgt Hall B", day: "Tue", slot: "12:00" },
      { code: "BUSA 105", lecturer: "Nnaji F.O", venue: "Mgt Hall A", day: "Wed", slot: "10:00" },
      { code: "BU-GST 101", lecturer: "Ibrahim T.A", venue: "LT 10", day: "Thu", slot: "08:00" },
      { code: "BUSA 106", lecturer: "Babatunde K.L", venue: "Mgt Hall A", day: "Thu", slot: "14:00", conflict: true },
      { code: "BUSA 107", lecturer: "Chukwu A.N", venue: "Mgt Hall A", day: "Thu", slot: "14:00", conflict: true },
    ],
  },
  {
    id: "mec-200",
    department: "Mechanical Engineering",
    school: "School of Computing & Engineering",
    level: "200 Level",
    semester: "First Semester 2025/26",
    deptTO: "Bode Fashola",
    hod: "Dr. U. Obi",
    dean: "Prof. E. Bassey",
    deanSignedAt: "Mar 07, 13:55",
    courses: 12,
    units: 35,
    conflicts: 0,
    status: "pending",
    sessions: [
      { code: "MECE 201", lecturer: "Fashola B.O", venue: "Eng Hall C", day: "Mon", slot: "08:00" },
      { code: "MECE 202", lecturer: "Okafor T.S", venue: "Lab 8 — Mech", day: "Mon", slot: "12:00" },
      { code: "MECE 203", lecturer: "Adeyemi P.R", venue: "Eng Hall C", day: "Tue", slot: "08:00" },
      { code: "MECE 204", lecturer: "Nwosu K.A", venue: "Lab 8 — Mech", day: "Tue", slot: "10:00" },
      { code: "MECE 205", lecturer: "Osei M.B", venue: "Eng Hall D", day: "Tue", slot: "14:00" },
      { code: "MECE 206", lecturer: "Chukwu F.N", venue: "Eng Hall C", day: "Wed", slot: "08:00" },
      { code: "MECE 207", lecturer: "Abiodun T.K", venue: "Lab 8 — Mech", day: "Wed", slot: "12:00" },
      { code: "MECE 208", lecturer: "Bello O.S", venue: "Eng Hall C", day: "Thu", slot: "08:00" },
      { code: "MECE 209", lecturer: "Eze N.T", venue: "Eng Hall D", day: "Thu", slot: "10:00" },
      { code: "MECE 210", lecturer: "Okonkwo A.P", venue: "Lab 8 — Mech", day: "Thu", slot: "14:00" },
      { code: "BU-GST 201", lecturer: "Ibrahim T.A", venue: "LT 15", day: "Thu", slot: "08:00" },
      { code: "BU-GST 202", lecturer: "Balogun R.O", venue: "LT 16", day: "Fri", slot: "12:00" },
    ],
  },
  {
    id: "law-400",
    department: "Law",
    school: "School of Law",
    level: "400 Level",
    semester: "First Semester 2025/26",
    deptTO: "Aisha Garba",
    hod: "Prof. R. Oladipo",
    dean: "Prof. T. Osei",
    deanSignedAt: "Mar 05, 14:22",
    courses: 7,
    units: 21,
    conflicts: 0,
    status: "approved",
    sessions: [
      { code: "LAW 401", lecturer: "Garba A.O", venue: "Law Hall A", day: "Mon", slot: "08:00" },
      { code: "LAW 402", lecturer: "Oladele R.T", venue: "Law Hall B", day: "Mon", slot: "14:00" },
      { code: "LAW 403", lecturer: "Folarin K.S", venue: "Law Hall A", day: "Tue", slot: "10:00" },
      { code: "LAW 404", lecturer: "Ibrahim O.C", venue: "Law Hall B", day: "Wed", slot: "08:00" },
      { code: "LAW 405", lecturer: "Adeola P.N", venue: "Law Hall A", day: "Thu", slot: "10:00" },
      { code: "LAW 406", lecturer: "Nwoye F.O", venue: "Law Hall B", day: "Thu", slot: "14:00" },
      { code: "BU-GST 401", lecturer: "Osei A.T", venue: "LT 8", day: "Fri", slot: "10:00" },
    ],
  },
  {
    id: "nurs-200",
    department: "Nursing Science",
    school: "College of Health Sciences",
    level: "200 Level",
    semester: "First Semester 2025/26",
    deptTO: "Joy Okonkwo",
    hod: "Dr. M. Eze",
    dean: "Prof. B. Hassan",
    deanSignedAt: "Mar 05, 10:05",
    courses: 10,
    units: 28,
    conflicts: 0,
    status: "published",
    publishedAt: "Mar 05, 10:22",
    sessions: [
      { code: "NURS 201", lecturer: "Okonkwo J.M", venue: "Health Sci Hall", day: "Mon", slot: "08:00" },
      { code: "NURS 202", lecturer: "Eze A.B", venue: "Lab 9 — Clinical", day: "Mon", slot: "12:00" },
      { code: "NURS 203", lecturer: "Hassan S.T", venue: "Health Sci Hall", day: "Tue", slot: "08:00" },
      { code: "NURS 204", lecturer: "Balogun R.K", venue: "Lab 9 — Clinical", day: "Tue", slot: "14:00" },
      { code: "NURS 205", lecturer: "Nwachukwu P.O", venue: "Health Sci Hall", day: "Wed", slot: "08:00" },
      { code: "NURS 206", lecturer: "Adebayo M.F", venue: "Lab 9 — Clinical", day: "Wed", slot: "12:00" },
      { code: "NURS 207", lecturer: "Osei G.T", venue: "Health Sci Hall", day: "Thu", slot: "08:00" },
      { code: "NURS 208", lecturer: "Okugo C.A", venue: "Lab 9 — Clinical", day: "Thu", slot: "14:00" },
      { code: "NURS 209", lecturer: "Olumide P.N", venue: "Health Sci Hall", day: "Fri", slot: "08:00" },
      { code: "BU-GST 201", lecturer: "Ade T.K", venue: "LT 5", day: "Fri", slot: "12:00" },
    ],
  },
  {
    id: "acct-300",
    department: "Accounting",
    school: "School of Management Sciences",
    level: "300 Level",
    semester: "First Semester 2025/26",
    deptTO: "Sola Abimbola",
    hod: "Dr. P. Eze",
    dean: "Prof. L. Adegoke",
    deanSignedAt: "Mar 04, 17:11",
    courses: 9,
    units: 26,
    conflicts: 2,
    status: "returned",
    returnComment: "Persistent venue overlap on Tuesday afternoon — resolve before resubmitting.",
    sessions: [
      { code: "ACCT 301", lecturer: "Abimbola S.O", venue: "Mgt Hall C", day: "Mon", slot: "08:00" },
      { code: "ACCT 302", lecturer: "Adeyemi O.T", venue: "Mgt Hall C", day: "Mon", slot: "12:00" },
      { code: "ACCT 303", lecturer: "Nwosu K.B", venue: "Mgt Hall D", day: "Tue", slot: "08:00" },
      { code: "ACCT 304", lecturer: "Okafor P.A", venue: "Mgt Hall C", day: "Tue", slot: "14:00", conflict: true },
      { code: "ACCT 305", lecturer: "Ibrahim C.L", venue: "Mgt Hall C", day: "Tue", slot: "14:00", conflict: true },
      { code: "ACCT 306", lecturer: "Chukwu N.O", venue: "Mgt Hall C", day: "Thu", slot: "08:00" },
      { code: "ACCT 307", lecturer: "Babatunde S.T", venue: "Mgt Hall D", day: "Thu", slot: "14:00" },
      { code: "ACCT 308", lecturer: "Eze J.M", venue: "Mgt Hall C", day: "Fri", slot: "10:00" },
      { code: "BU-GST 301", lecturer: "Osei B.K", venue: "LT 11", day: "Fri", slot: "14:00" },
    ],
  },
];

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

export const venueRecords: VenueRecord[] = [
  { id: "v1", name: "CST Hall A", capacity: 240, type: "Lecture Hall", assignedDept: "Computer Science", school: "School of Computing & Engineering", floor: "Ground Floor", spaceType: "exclusive" },
  { id: "v2", name: "CST Hall B", capacity: 160, type: "Lecture Hall", assignedDept: "Computer Science", school: "School of Computing & Engineering", floor: "Ground Floor", spaceType: "exclusive" },
  { id: "v3", name: "Lab 3 — Software", capacity: 60, type: "Lab", assignedDept: "Computer Science", school: "School of Computing & Engineering", floor: "1st Floor", spaceType: "exclusive" },
  { id: "v4", name: "Lab 5 — Networks", capacity: 60, type: "Lab", assignedDept: "Computer Science", school: "School of Computing & Engineering", floor: "1st Floor", spaceType: "exclusive" },
  { id: "v5", name: "Eng Hall A", capacity: 200, type: "Lecture Hall", assignedDept: "Electrical Engineering", school: "School of Computing & Engineering", floor: "Ground Floor", spaceType: "exclusive" },
  { id: "v6", name: "Eng Hall B", capacity: 180, type: "Lecture Hall", assignedDept: "Electrical Engineering", school: "School of Computing & Engineering", floor: "1st Floor", spaceType: "exclusive" },
  { id: "v7", name: "Lab 7 — Electronics", capacity: 50, type: "Lab", assignedDept: "Electrical Engineering", school: "School of Computing & Engineering", floor: "2nd Floor", spaceType: "exclusive" },
  { id: "v8", name: "Eng Hall C", capacity: 200, type: "Lecture Hall", assignedDept: "Mechanical Engineering", school: "School of Computing & Engineering", floor: "Ground Floor", spaceType: "exclusive" },
  { id: "v9", name: "Eng Hall D", capacity: 160, type: "Lecture Hall", assignedDept: "Mechanical Engineering", school: "School of Computing & Engineering", floor: "1st Floor", spaceType: "exclusive" },
  { id: "v10", name: "Lab 8 — Mech", capacity: 45, type: "Lab", assignedDept: "Mechanical Engineering", school: "School of Computing & Engineering", floor: "Basement", spaceType: "exclusive" },
  { id: "v11", name: "Art Hall A", capacity: 150, type: "Lecture Hall", assignedDept: "Mass Communication", school: "School of Social Sciences", floor: "Ground Floor", spaceType: "exclusive" },
  { id: "v12", name: "Art Hall B", capacity: 120, type: "Lecture Hall", assignedDept: "Mass Communication", school: "School of Social Sciences", floor: "1st Floor", spaceType: "exclusive" },
  { id: "v13", name: "Studio 1", capacity: 30, type: "Seminar Room", assignedDept: "Mass Communication", school: "School of Social Sciences", floor: "2nd Floor", spaceType: "exclusive" },
  { id: "v14", name: "Mgt Hall A", capacity: 180, type: "Lecture Hall", assignedDept: "Business Administration", school: "School of Management Sciences", floor: "Ground Floor", spaceType: "exclusive" },
  { id: "v15", name: "Mgt Hall B", capacity: 160, type: "Lecture Hall", assignedDept: "Business Administration", school: "School of Management Sciences", floor: "1st Floor", spaceType: "exclusive" },
  { id: "v16", name: "Mgt Hall C", capacity: 180, type: "Lecture Hall", assignedDept: "Accounting", school: "School of Management Sciences", floor: "Ground Floor", spaceType: "exclusive" },
  { id: "v17", name: "Mgt Hall D", capacity: 140, type: "Lecture Hall", assignedDept: "Accounting", school: "School of Management Sciences", floor: "1st Floor", spaceType: "exclusive" },
  { id: "v18", name: "Law Hall A", capacity: 120, type: "Lecture Hall", assignedDept: "Law", school: "School of Law", floor: "Ground Floor", spaceType: "exclusive" },
  { id: "v19", name: "Law Hall B", capacity: 100, type: "Seminar Room", assignedDept: "Law", school: "School of Law", floor: "1st Floor", spaceType: "exclusive" },
  { id: "v20", name: "Health Sci Hall", capacity: 220, type: "Lecture Hall", assignedDept: "Nursing Science", school: "College of Health Sciences", floor: "Ground Floor", spaceType: "exclusive" },
  { id: "v21", name: "Lab 9 — Clinical", capacity: 40, type: "Lab", assignedDept: "Nursing Science", school: "College of Health Sciences", floor: "1st Floor", spaceType: "exclusive" },
  { id: "v22", name: "LT 5", capacity: 300, type: "Lecture Hall", assignedDept: "Nursing Science", school: "College of Health Sciences", floor: "Ground Floor", spaceType: "shared" },
  { id: "v23", name: "LT 8", capacity: 280, type: "Lecture Hall", assignedDept: "Law", school: "School of Law", floor: "Ground Floor", spaceType: "shared" },
  { id: "v24", name: "LT 10", capacity: 300, type: "Lecture Hall", assignedDept: "Business Administration", school: "School of Management Sciences", floor: "1st Floor", spaceType: "shared" },
  { id: "v25", name: "LT 11", capacity: 280, type: "Lecture Hall", assignedDept: "Mass Communication", school: "School of Social Sciences", floor: "1st Floor", spaceType: "shared" },
  { id: "v26", name: "LT 12", capacity: 260, type: "Lecture Hall", assignedDept: "Computer Science", school: "School of Computing & Engineering", floor: "2nd Floor", spaceType: "shared" },
  { id: "v27", name: "LT 15", capacity: 320, type: "Lecture Hall", assignedDept: "Electrical Engineering", school: "School of Computing & Engineering", floor: "Ground Floor", spaceType: "shared" },
  { id: "v28", name: "LT 16", capacity: 300, type: "Lecture Hall", assignedDept: "Accounting", school: "School of Management Sciences", floor: "1st Floor", spaceType: "shared" },
  { id: "v29", name: "Main Auditorium", capacity: 1200, type: "Auditorium", assignedDept: "Central Administration", school: "University Central Services", floor: "Ground Floor", spaceType: "shared" },
  { id: "v30", name: "Seminar Room A", capacity: 40, type: "Seminar Room", assignedDept: "Mechanical Engineering", school: "School of Computing & Engineering", floor: "2nd Floor", spaceType: "shared" },
  { id: "v31", name: "Virtual / LMS", capacity: 5000, type: "Lecture Hall", assignedDept: "Academic Planning Office", school: "Vice-Chancellor's Office", floor: "Online", spaceType: "shared", isVirtual: true },
];

export const adjunctRecords: AdjunctRecord[] = [
  { id: "adj1", name: "Adeoye Ayodele Olusegun", department: "Computer Science", school: "School of Computing & Engineering", courses: ["SEN 201"], availableDays: ["Tue", "Fri"], note: "Available Tue & Fri only — tech industry practitioner" },
  { id: "adj2", name: "Bamishile Olabode Oludare", department: "Computer Science", school: "School of Computing & Engineering", courses: ["CSC 301"], availableDays: ["Wed"], note: "Industry practitioner — evenings only, after 14:00" },
  { id: "adj3", name: "Ibrahim T.A", department: "General Studies", school: "Cross-dept (GST)", courses: ["BU-GST 101", "BU-GST 201", "BU-GST 301"], availableDays: ["Mon", "Tue", "Thu", "Fri"], note: "GST lecturer shared across multiple departments — no Wednesdays" },
  { id: "adj4", name: "Balogun R.O", department: "General Studies", school: "Cross-dept (GST)", courses: ["BU-GST 202"], availableDays: ["Fri"], note: "Available Fridays only — part-time visiting" },
  { id: "adj5", name: "Osei A.T", department: "General Studies", school: "Cross-dept (GST)", courses: ["BU-GST 401"], availableDays: ["Mon", "Wed", "Fri"], note: "Morning slots preferred — not available after 14:00" },
];

export const globalDaysOff: GlobalDayOff[] = [
  { id: "do1", lecturer: "Akinwunmi Damilare Samuel", department: "Computer Science", date: "Every Wednesday", reason: "Research day — standing arrangement with department", recurring: true },
  { id: "do2", lecturer: "Nzenwata Uchenna Jeremiah", department: "Computer Science", date: "Every Friday AM", reason: "Clinic day — unavailable until 12:00 on Fridays", recurring: true },
  { id: "do3", lecturer: "Adeyemi O.P", department: "Electrical Engineering", date: "Mar 15, 2026", reason: "External examiner duty at FUTA", recurring: false },
];

export const globalStudyLeaves: GlobalStudyLeave[] = [
  { id: "sl1", lecturer: "Adebanjo Olawunmi Asake", department: "Computer Science", from: "12 Jan 2026", to: "28 Feb 2026", reason: "Doctoral research fellowship — University of Lagos (Substitute handled externally)" },
  { id: "sl2", lecturer: "DARAMOLA CHRISTIANA", department: "Computer Science", from: "05 Feb 2026", to: "19 Feb 2026", reason: "Conference & sabbatical — IEEE ICCV 2026 (Substitute handled externally)" },
  { id: "sl3", lecturer: "Nwachukwu P.O", department: "Nursing Science", from: "10 Mar 2026", to: "14 Mar 2026", reason: "Clinical attachment — Lagos University Teaching Hospital" },
];

export const auditLog: AuditEntry[] = [
  {
    id: "a1",
    actor: "M. Danladi",
    action: "published",
    department: "Nursing Science",
    school: "College of Health Sciences",
    level: "200 Level",
    at: "Mar 05, 10:22",
  },
  {
    id: "a2",
    actor: "M. Danladi",
    action: "approved",
    department: "Law",
    school: "School of Law",
    level: "400 Level",
    at: "Mar 05, 14:35",
    note: "Clean submission, no conflicts. All venue assignments verified against school calendar.",
  },
  {
    id: "a3",
    actor: "M. Danladi",
    action: "returned",
    department: "Accounting",
    school: "School of Management Sciences",
    level: "300 Level",
    at: "Mar 04, 17:20",
    note: "Persistent venue overlap on Tuesday afternoon — resolve before resubmitting.",
  },
];

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
  endSlot: (typeof slots)[number];   // e.g. "17:00"
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
  level?: string;   // "All Levels", "100 Level", "200 Level", etc.
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
  venue?: string;     // e.g. "BUC Auditorium", "University Amphitheatre"
  level?: string;     // "All Levels", "100 Level", etc.
  description?: string;
  advisoryNote?: string;
  exemptFromLectures?: boolean;
}

export const initialDepartmentalEvents: DepartmentalEvent[] = [
  {
    id: "evt-cs-week",
    title: "NACOS Annual Departmental Week & Tech Expo",
    department: "Computer Science",
    category: "Departmental Week",
    week: "Semester Week 8",
    day: "All Week",
    timeRange: "Full Week Event",
    venue: "BUC Auditorium & Computer Labs",
    level: "All Levels",
    description: "Annual Computer Science Departmental Week featuring coding challenges, developer workshops, industry guest keynotes, and project exhibitions.",
    advisoryNote: "Lectures for Friday afternoon may be adjusted for student hackathon presentations.",
  },
  {
    id: "evt-freshers-welcome",
    title: "100 Level Freshers Orientation & Welcome Fellowship",
    department: "Computer Science",
    category: "Orientation",
    week: "Semester Week 2",
    day: "Wed",
    timeRange: "14:00 – 16:00",
    venue: "SAT_A008 / BUC_ROOM1",
    level: "100 Level",
    description: "Departmental orientation for incoming 100 Level students, introduction to curriculum, academic advisors, and student tech clubs.",
    advisoryNote: "100 Level students meet with faculty mentors.",
  },
  {
    id: "evt-se-week",
    title: "Software Engineering Innovation Week & Hackathon",
    department: "Software Engineering",
    category: "Departmental Week",
    week: "Semester Week 9",
    day: "All Week",
    timeRange: "Full Week Event",
    venue: "Innovation Hub & BUC_LAB1",
    level: "All Levels",
    description: "Software engineering project showcase, 24-hour product hackathon, and developer demo day.",
    advisoryNote: "Held in Week 9 without disrupting the general lecture timetable.",
  },
  {
    id: "evt-symposium",
    title: "Faculty Research & Industry Innovation Symposium",
    department: "Computer Science",
    category: "Symposium",
    week: "Semester Week 11",
    day: "Thu",
    timeRange: "10:00 – 13:00",
    venue: "University Amphitheatre",
    level: "All Levels",
    description: "Annual academic symposium presenting research papers, student-faculty capstone projects, and AI in education workshops.",
    advisoryNote: "Attended by 300L & 400L students and faculty.",
  },
];
