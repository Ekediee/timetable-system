import {
  Allocation,
  Venue,
  Constraint,
  Session,
  days,
  slots,
  VenueRecord,
  ExternalBooking,
  DynamicTimeLockConfig,
  defaultTimeLockConfig,
  ChapelSeminarScheduleItem,
  normalizeProgramme,
} from "./data";

export type HardConflictType = "venue" | "capacity" | "lecturer" | "availability";

export interface ConstraintViolation {
  code: string;
  lecturer: string;
  venue: string;
  day: string;
  slot: string;
  conflictType: HardConflictType;
  description: string;
}

export interface EngineResult {
  sessions: Session[];
  violations: ConstraintViolation[];
  success: boolean;
  score: number;
}

export interface DecomposedSession {
  id: string;
  code: string;
  title: string;
  lecturer: string;
  size: number;
  units: number;
  type: string;
  duration: number; // 1 or 2 hours
  group?: string; // "Group A", "Group B", "Group C", "Group D", "All", or undefined for unified classes
  level?: string; // "100 Level", "200 Level", etc.
  programme?: string | null;
  isVirtual?: boolean; // True for online/virtual classes
  sessionIndex: number; // 0 for primary, 1 for secondary
  totalSessionsForCourse: number;
}

export type EngineProgressCallback = (progress: {
  stage: string;
  percent: number;
  current?: number;
  total?: number;
}) => void;

export interface DecomposeOptions {
  externalBookings?: ExternalBooking[];
  exemptedDepartments?: string[];
  departmentName?: string;
  timeLockConfig?: DynamicTimeLockConfig;
  onProgress?: EngineProgressCallback;
}

/**
 * Extracts individual constituent sub-groups from group strings like:
 * "Group A", "Group B", "All", etc.
 */
export function extractSubgroups(groupStr?: string): string[] {
  if (!groupStr || groupStr === "All" || groupStr === "Unified") return ["All"];
  const parts = groupStr.split(/[&,+/]|\band\b/i).map((s) => s.trim()).filter(Boolean);
  const result: string[] = [];
  for (const p of parts) {
    const match = p.match(/^(?:Group\s+)?([A-Fa-f])$/i);
    if (match) {
      result.push(`Group ${match[1].toUpperCase()}`);
    } else {
      result.push(p);
    }
  }
  return result.length > 0 ? result : [groupStr];
}

/**
 * Checks if two groups clash within the same academic level
 */
export function doGroupsClash(group1?: string, group2?: string): boolean {
  if (!group1 || group1 === "All" || group1 === "Unified") return true;
  if (!group2 || group2 === "All" || group2 === "Unified") return true;

  const g1List = extractSubgroups(group1);
  const g2List = extractSubgroups(group2);

  if (g1List.includes("All") || g2List.includes("All")) return true;

  return g1List.some((g) => g2List.includes(g));
}

/**
 * Checks if two sub-programmes share students within the same department/level.
 * Main department courses (programme = null) are taken by all sub-programmes, so
 * null clashes with every sub-programme while distinct sub-programmes do not clash with each other.
 */
export function doProgrammesClash(
  prog1?: string | null,
  prog2?: string | null
): boolean {
  const p1 = normalizeProgramme(prog1);
  const p2 = normalizeProgramme(prog2);
  if (!p1 || !p2) return true;
  return p1.toLowerCase() === p2.toLowerCase();
}

/**
 * Checks whether two sessions belong to conflicting student cohorts
 * (same academic level, overlapping sub-programme, and overlapping sub-group).
 */
export function doSessionsCohortClash(
  a: { level?: string; group?: string; programme?: string | null },
  b: { level?: string; group?: string; programme?: string | null }
): boolean {
  if ((a.level || "") !== (b.level || "")) return false;
  if (!doProgrammesClash(a.programme, b.programme)) return false;
  return doGroupsClash(a.group, b.group);
}

/**
 * Institutional Chapel Seminar & Citizenship Orientation Schedule:
 * - 100 Level: Monday 09:00 (BU-GST 011 for CCMAS and GEDS001 for BMASS are the same course)
 * - 200 Level: Tuesday 09:00 (BU-GST 021)
 * - 300 Level: Wednesday 09:00 (BU-GST 031)
 * - 400 Level: Thursday 09:00 (BU-GST 041)
 */
export const CHAPEL_SEMINAR_SCHEDULE: Record<
  string,
  { day: (typeof days)[number]; slot: (typeof slots)[number] }
> = {
  "100 Level": { day: "Mon", slot: "09:00" },
  "200 Level": { day: "Tue", slot: "09:00" },
  "300 Level": { day: "Wed", slot: "09:00" },
  "400 Level": { day: "Thu", slot: "09:00" },
};

/**
 * Standard course identity & metadata for schoolwide Chapel Seminar per academic level
 */
export const CHAPEL_SEMINAR_COURSE_INFO: Record<
  string,
  {
    code: string;
    title: string;
    lecturer: string;
    venue: string;
    day: (typeof days)[number];
    slot: (typeof slots)[number];
    duration: number;
  }
> = {
  "100 Level": {
    code: "BU-GST 011 / GEDS001",
    title: "Citizenship Orientation & Chapel Seminar",
    lecturer: "Chilaka Uzoma",
    venue: "University Amphitheatre",
    day: "Mon",
    slot: "09:00",
    duration: 1,
  },
  "200 Level": {
    code: "BU-GST 021",
    title: "Chapel Seminar & Leadership",
    lecturer: "Chilaka Uzoma",
    venue: "University Amphitheatre",
    day: "Tue",
    slot: "09:00",
    duration: 1,
  },
  "300 Level": {
    code: "BU-GST 031",
    title: "Chapel Seminar & Ethics",
    lecturer: "Chilaka Uzoma",
    venue: "University Amphitheatre",
    day: "Wed",
    slot: "09:00",
    duration: 1,
  },
  "400 Level": {
    code: "BU-GST 041",
    title: "Chapel Seminar & Career Transition",
    lecturer: "Chilaka Uzoma",
    venue: "University Amphitheatre",
    day: "Thu",
    slot: "09:00",
    duration: 1,
  },
};

/**
 * Default list of departments exempted from university-wide Chapel Seminar.
 * As requested, by default no department is exempted, but exemptions can be
 * provided via options or added here.
 */
export const DEFAULT_EXEMPTED_DEPARTMENTS: string[] = [];

/**
 * Checks if a department is exempted from the university-wide Chapel Seminar
 */
export function isDepartmentExemptFromChapel(
  departmentName?: string,
  exemptedList?: string[]
): boolean {
  if (!departmentName) return false;
  const list = exemptedList || DEFAULT_EXEMPTED_DEPARTMENTS;
  const norm = departmentName.trim().toLowerCase();
  return list.some((ex) => ex.trim().toLowerCase() === norm);
}

/**
 * Checks if a course is a Citizenship Orientation or Chapel Seminar course
 */
export function isCitizenshipOrientationCourse(c: {
  code?: string;
  title?: string;
  lecturer?: string;
  venue?: string;
}): boolean {
  const code = (c.code || "").toUpperCase().replace(/[\s-]+/g, "");
  const title = (c.title || "").toLowerCase();
  const lecturer = (c.lecturer || "").toLowerCase();
  const venue = (c.venue || "").toLowerCase();

  if (
    lecturer.includes("chilaka") ||
    (venue.includes("amphi") && (title.includes("chapel") || title.includes("citizenship") || title.includes("orientation")))
  ) {
    return true;
  }

  return (
    code.includes("GEDS001") ||
    /(?:^|[^A-Z0-9])GEDS01(?:$|[^0-9])/.test(code) ||
    code.includes("GST011") ||
    code.includes("GTS011") ||
    code.includes("BUGST011") ||
    code.includes("BUGTS011") ||
    code.includes("GST021") ||
    code.includes("GTS021") ||
    code.includes("BUGST021") ||
    code.includes("BUGTS021") ||
    code.includes("GST031") ||
    code.includes("GTS031") ||
    code.includes("BUGST031") ||
    code.includes("BUGTS031") ||
    code.includes("GST041") ||
    code.includes("GTS041") ||
    code.includes("BUGST041") ||
    code.includes("BUGTS041") ||
    title.includes("citizenship orientation") ||
    title.includes("chapel seminar") ||
    title.includes("citizenship")
  );
}

/**
 * Determines whether a course should be scheduled as virtual/online (Virtual / LMS).
 * All GEDS, GST, and BU-GST courses are virtual, except Chapel Seminars / Citizenship Orientation,
 * which remain physical in the University Amphitheatre.
 */
export function isVirtualGeneralStudiesCourse(c: {
  code?: string;
  title?: string;
  type?: string;
  lecturer?: string;
  venue?: string;
  isVirtual?: boolean;
}): boolean {
  if (isCitizenshipOrientationCourse(c)) return false;
  if (c.isVirtual) return true;
  if (c.type === "GST") return true;
  const normalizedCode = (c.code || "").trim().toUpperCase();
  return /\b(?:BU[-\s]*)?(?:GEDS|GST)(?=[\s-\d]|$)/.test(normalizedCode);
}

/**
 * Applies institutional virtual-mode rules to loaded course allocations.
 */
export function normalizeAllocationsVirtualMode(allocations: Allocation[]): Allocation[] {
  return allocations.map((alloc) => ({
    ...alloc,
    isVirtual: isVirtualGeneralStudiesCourse(alloc),
  }));
}

/**
 * Resolves the academic level for Citizenship Orientation & Chapel courses:
 * - BU-GST 011 / GTS 011 (CCMAS) & GEDS001 (BMASS) are the same course for 100 Level
 * - BU-GST 021 is for 200 Level
 * - BU-GST 031 is for 300 Level
 * - BU-GST 041 is for 400 Level
 */
export function getCitizenshipOrientationLevel(c: {
  code?: string;
  title?: string;
  level?: string;
  day?: string;
  slot?: string;
}): string {
  if (c.day && c.slot) {
    for (const [lvl, fixed] of Object.entries(CHAPEL_SEMINAR_SCHEDULE)) {
      if (fixed.day === c.day && fixed.slot === c.slot) {
        return lvl;
      }
    }
  }

  const code = (c.code || "").toUpperCase().replace(/[\s-]+/g, "");
  if (
    code.includes("011") ||
    code.includes("GEDS001") ||
    code.includes("GEDS01") ||
    code.includes("GST011") ||
    code.includes("GTS011")
  ) {
    return "100 Level";
  }
  if (code.includes("021") || code.includes("GST021") || code.includes("GTS021")) {
    return "200 Level";
  }
  if (code.includes("031") || code.includes("GST031") || code.includes("GTS031")) {
    return "300 Level";
  }
  if (code.includes("041") || code.includes("GST041") || code.includes("GTS041")) {
    return "400 Level";
  }
  if (c.level && CHAPEL_SEMINAR_SCHEDULE[c.level]) {
    return c.level;
  }
  return "100 Level";
}

/**
 * Derives academic level from allocation course code or level field.
 * Supports:
 * - Direct level field: "100 Level", "200 Level", etc.
 * - Standard 3-digit course numbers:
 *   - NUDT201 -> 200 Level
 *   - MLSC513 -> 500 Level
 *   - BU-GST 011 / GTS011 / GEDS001 -> 100 Level
 *   - BU-GST 021 -> 200 Level
 *   - BU-GST 031 -> 300 Level
 *   - BU-GST 041 -> 400 Level
 */
export function deriveCourseLevel(c: { code?: string; title?: string; level?: string }): string {
  if (c.level && CHAPEL_SEMINAR_SCHEDULE[c.level]) {
    return c.level;
  }
  if (isCitizenshipOrientationCourse(c)) {
    return getCitizenshipOrientationLevel(c);
  }
  const code = (c.code || "").toUpperCase();
  const digitMatch = code.match(/\b([1-5])\d{2}\b/);
  if (digitMatch) {
    return `${digitMatch[1]}00 Level`;
  }
  const zeroDigitMatch = code.match(/\b0([1-4])\d\b/);
  if (zeroDigitMatch) {
    return `${zeroDigitMatch[1]}00 Level`;
  }
  return c.level || "100 Level";
}

/**
 * Checks if two courses represent equivalent citizenship orientation / chapel sessions
 * (e.g. BU-GST 011 for CCMAS and GEDS001 for BMASS are the same 100L session)
 */
export function isEquivalentOrientationSession(
  a: { code?: string; title?: string; level?: string; day?: string; slot?: string; lecturer?: string; venue?: string },
  b: { code?: string; title?: string; level?: string; day?: string; slot?: string; lecturer?: string; venue?: string }
): boolean {
  if (!isCitizenshipOrientationCourse(a) || !isCitizenshipOrientationCourse(b)) return false;
  return getCitizenshipOrientationLevel(a) === getCitizenshipOrientationLevel(b);
}

/**
 * Break down course allocations into scheduled sessions based on academic unit rules:
 * - 2-Unit course: 1 session of 2 hours
 * - 3-Unit course: 1 session of 2 hours + 1 session of 1 hour (on distinct days)
 * - 4-Unit course: 2 sessions of 2 hours (on distinct days)
 * - 1-Unit course: 1 session of 1 hour
 * - Citizenship Orientation / Chapel: 1 unified schoolwide session of 1 hour at designated slot
 */
export function decomposeAllocations(
  allocations: Allocation[],
  options?: DecomposeOptions
): DecomposedSession[] {
  const result: DecomposedSession[] = [];
  const deptName = options?.departmentName;
  const isExempt = isDepartmentExemptFromChapel(deptName, options?.exemptedDepartments);
  const chapelSchedule =
    options?.timeLockConfig?.chapelSeminarSchedule ||
    defaultTimeLockConfig.chapelSeminarSchedule;

  // 1. Identify active levels in this department's allocations
  const detectedLevels = new Set<string>();
  for (const alloc of allocations) {
    const lvl = deriveCourseLevel(alloc);
    if (chapelSchedule[lvl]) {
      detectedLevels.add(lvl);
    }
  }

  // If no levels detected from allocations, assume standard university undergraduate levels (100L-400L)
  const activeLevels =
    detectedLevels.size > 0
      ? Array.from(detectedLevels).sort()
      : ["100 Level", "200 Level", "300 Level", "400 Level"];

  // 2. Schoolwide Chapel Seminar: exactly 1 unified session per active level (unless exempt)
  if (!isExempt) {
    for (const lvl of activeLevels) {
      const scheduleItem = chapelSchedule[lvl];
      if (scheduleItem) {
        const info = scheduleItem || CHAPEL_SEMINAR_COURSE_INFO[lvl];
        result.push({
          id: `CHAPEL-${lvl.replace(/\s+/g, "")}-s1`,
          code: info.code || "BU-GST 011",
          title: info.title || "Citizenship Orientation & Chapel Seminar",
          lecturer: info.lecturer || "Chilaka Uzoma",
          size: 200,
          units: 1,
          type: "Required",
          duration: scheduleItem.duration || 1,
          group: "All",
          level: lvl,
          programme: null,
          isVirtual: false,
          sessionIndex: 0,
          totalSessionsForCourse: 1,
        });
      }
    }
  }

  // 3. Decompose all regular departmental course allocations (skip raw chapel rows as they are already unified above)
  for (const alloc of allocations) {
    if (isCitizenshipOrientationCourse(alloc)) {
      continue;
    }

    const resolvedLevel = deriveCourseLevel(alloc);
    const resolvedProgramme = normalizeProgramme(alloc.programme);

    const base = {
      code: alloc.code,
      title: alloc.title,
      lecturer: alloc.lecturer,
      size: alloc.size,
      units: alloc.units,
      type: alloc.type,
      group: alloc.group,
      level: resolvedLevel,
      programme: resolvedProgramme,
      isVirtual: isVirtualGeneralStudiesCourse(alloc),
    };

    const progTag = resolvedProgramme ? `-${resolvedProgramme.replace(/\s+/g, "")}` : "";
    const grp = alloc.group ? alloc.group.replace(/\s+/g, "").replace(/&/g, "_") : "All";

    if (alloc.units === 3) {
      result.push({
        ...base,
        id: `${alloc.code}${progTag}-${grp}-s1`,
        duration: 2,
        sessionIndex: 0,
        totalSessionsForCourse: 2,
      });
      result.push({
        ...base,
        id: `${alloc.code}${progTag}-${grp}-s2`,
        duration: 1,
        sessionIndex: 1,
        totalSessionsForCourse: 2,
      });
    } else if (alloc.units >= 4) {
      result.push({
        ...base,
        id: `${alloc.code}${progTag}-${grp}-s1`,
        duration: 2,
        sessionIndex: 0,
        totalSessionsForCourse: 2,
      });
      result.push({
        ...base,
        id: `${alloc.code}${progTag}-${grp}-s2`,
        duration: 2,
        sessionIndex: 1,
        totalSessionsForCourse: 2,
      });
    } else if (alloc.units === 2) {
      result.push({
        ...base,
        id: `${alloc.code}${progTag}-${grp}-s1`,
        duration: 2,
        sessionIndex: 0,
        totalSessionsForCourse: 1,
      });
    } else {
      result.push({
        ...base,
        id: `${alloc.code}${progTag}-${grp}-s1`,
        duration: 1,
        sessionIndex: 0,
        totalSessionsForCourse: 1,
      });
    }
  }

  return result;
}

/**
 * Validates if a proposed time slot & duration fits institutional operational boundaries:
 * Supports dynamic configuration for Operating Hours, Lunch Break, Midweek/Friday closing,
 * and custom departmental locked time blocks.
 */
export function isSlotWithinOperatingHours(
  day: (typeof days)[number],
  slotIndex: number,
  duration: number,
  config?: DynamicTimeLockConfig,
  level?: string,
  departmentName?: string
): boolean {
  const cfg = config || defaultTimeLockConfig;
  const endIndex = slotIndex + duration - 1;
  const maxSlotIndex = slots.length - 1;

  // 1. Operating window bounds check (e.g. 07:00 to 17:00/18:00)
  const startIdx = slots.indexOf(cfg.operatingWindow.startSlot);
  const endIdx = slots.indexOf(cfg.operatingWindow.endSlot);
  const allowedStart = startIdx !== -1 ? startIdx : 0;
  const allowedEnd = endIdx !== -1 ? endIdx : maxSlotIndex;

  if (slotIndex < allowedStart || endIndex > allowedEnd) {
    return false;
  }

  // 2. Early closing day checks (e.g. Wednesday 17:00 cutoff, Friday 13:00 cutoff)
  for (const ec of cfg.earlyClosings) {
    if (ec.enabled && ec.day === day) {
      const cutoffIdx = slots.indexOf(ec.cutoffSlot);
      if (cutoffIdx !== -1 && endIndex >= cutoffIdx) {
        return false;
      }
    }
  }

  // 3. Mandatory Lunch Break check (dynamic slot & duration)
  if (cfg.lunchBreak.enabled) {
    const lunchIdx = slots.indexOf(cfg.lunchBreak.slot);
    const lunchEnd = lunchIdx + cfg.lunchBreak.duration - 1;
    if (lunchIdx !== -1) {
      for (let i = slotIndex; i <= endIndex; i++) {
        if (i >= lunchIdx && i <= lunchEnd) {
          return false;
        }
      }
    }
  }

  // 4. Custom departmental time locks / blackouts
  if (cfg.customTimeLocks && cfg.customTimeLocks.length > 0) {
    for (const lock of cfg.customTimeLocks) {
      if (!lock.enabled || lock.day !== day) continue;
      if (
        departmentName &&
        lock.department &&
        lock.department !== "All" &&
        lock.department !== departmentName
      ) {
        continue;
      }
      if (level && lock.level && lock.level !== "All Levels" && lock.level !== level) {
        continue;
      }

      const lockStartIdx = slots.indexOf(lock.slot);
      const lockEndIdx = lockStartIdx + lock.duration - 1;
      if (lockStartIdx !== -1) {
        for (let i = slotIndex; i <= endIndex; i++) {
          if (i >= lockStartIdx && i <= lockEndIdx) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

/**
 * Checks lecturer availability against active constraints (Study Leave, Day Off, Adjunct rules)
 */
export function isLecturerAvailableForSlot(
  lecturer: string,
  day: (typeof days)[number],
  slotIndex: number,
  duration: number,
  constraints: Constraint[]
): { available: boolean; reason?: string } {
  const lecturerConstraints = constraints.filter(
    (c) => c.lecturer === lecturer || c.lecturer === "All Faculty"
  );

  for (const c of lecturerConstraints) {
    // 1. Full absence (Study Leave, Sabbatical, Medical Leave, etc.)
    const isAbsence =
      c.kind === "Study Leave" ||
      c.params?.archetype === "full_absence" ||
      c.kind.toLowerCase().includes("leave") ||
      c.kind.toLowerCase().includes("sabbatical");

    if (isAbsence) {
      if (
        c.params?.substitute === true ||
        c.detail.toLowerCase().includes("substituted externally") ||
        c.detail.toLowerCase().includes("substitute")
      ) {
        // Faculty on approved leave with external substitute handling teaching duties
        continue;
      }
      return { available: false, reason: `On ${c.kind} (${c.detail})` };
    }

    // 2. Day off or restricted weekday
    const isDayOff =
      c.kind === "Day Off" ||
      c.params?.archetype === "time_window" ||
      c.kind.toLowerCase().includes("day off") ||
      c.kind.toLowerCase().includes("blackout");

    if (c.kind === "Day Off" || isDayOff) {
      const lowerRange = (c.range || "").toLowerCase();
      if (lowerRange.includes("wed") && day === "Wed") {
        return { available: false, reason: `Lecturer day off on Wednesdays` };
      }
      if (lowerRange.includes("mon") && day === "Mon") {
        return { available: false, reason: `Lecturer day off on Mondays` };
      }
      if (lowerRange.includes("tue") && day === "Tue" && !lowerRange.includes("fri")) {
        return { available: false, reason: `Lecturer day off on Tuesdays` };
      }
      if (lowerRange.includes("thu") && day === "Thu") {
        return { available: false, reason: `Lecturer day off on Thursdays` };
      }
      if (lowerRange.includes("fri am") && day === "Fri" && slotIndex < 6) {
        return { available: false, reason: `Lecturer day off on Friday mornings` };
      }
      if (lowerRange.includes("fri") && !lowerRange.includes("am") && !lowerRange.includes("tue") && day === "Fri") {
        return { available: false, reason: `Lecturer day off on Fridays` };
      }
    }

    // 3. Adjunct or restricted availability window
    if (c.kind === "Adjunct" || c.params?.archetype === "time_window") {
      const lowerRange = (c.range || "").toLowerCase();
      if (lowerRange.includes("tue, fri") || lowerRange.includes("tue & fri")) {
        if (day !== "Tue" && day !== "Fri") {
          return { available: false, reason: `Available Tue & Fri only` };
        }
      } else if (lowerRange.includes("wed only") && day !== "Wed") {
        return { available: false, reason: `Available Wednesdays only` };
      }

      if (lowerRange.includes("after 14:00") && slotIndex < 7) {
        return { available: false, reason: `Available after 14:00 only` };
      }
    }
  }

  return { available: true };
}

/**
 * Calculates venue fitness score for a given class size and department.
 * Prefers department home venue and optimal room capacity ratio.
 */
export function scoreVenueFitness(
  venue: Venue | VenueRecord,
  classSize: number,
  departmentName: string = "Computer Science"
): number {
  if (venue.capacity < classSize) {
    return -1000; // Capacity conflict
  }

  let score = 0;

  // Capacity efficiency (0.0 to 1.0)
  const efficiency = classSize / venue.capacity;
  score += efficiency * 50;

  // Home venue bonus
  const assignedDept = "assignedDept" in venue ? venue.assignedDept : null;
  if (assignedDept === departmentName || venue.name.includes("CST") || venue.name.includes("Lab 3") || venue.name.includes("Lab 5")) {
    score += 40;
  }

  return score;
}

/**
 * Primary Engine: Solves constraint satisfaction problem and generates a timetable schedule
 */
export function generateTimetable(
  allocations: Allocation[],
  availableVenues: (Venue | VenueRecord)[],
  activeConstraints: Constraint[],
  departmentNameOrOptions: string | DecomposeOptions = "Computer Science",
  options?: DecomposeOptions,
  explicitExternalBookings?: ExternalBooking[]
): EngineResult {
  const departmentName =
    typeof departmentNameOrOptions === "string"
      ? departmentNameOrOptions
      : departmentNameOrOptions?.departmentName || "Computer Science";
  const opts: DecomposeOptions =
    typeof departmentNameOrOptions === "object"
      ? { ...departmentNameOrOptions, departmentName }
      : { ...(options || {}), departmentName };
  const externalBookings = opts?.externalBookings || explicitExternalBookings || [];
  const isExempt = isDepartmentExemptFromChapel(departmentName, opts?.exemptedDepartments);
  opts?.onProgress?.({
    stage: "Decomposing course allocations and groups...",
    percent: 10,
  });
  const decomposed = decomposeAllocations(allocations, opts);
  const scheduledSessions: Session[] = [];
  const violations: ConstraintViolation[] = [];

  // Data structure to track occupied slots: occupied[day][slotIndex][venueName] = lecturer / courseCode
  type CohortSlotEntry = {
    code: string;
    level: string;
    group?: string;
    programme: string | null;
  };
  const occupiedVenues: Record<string, Record<number, Record<string, string>>> = {};
  const occupiedLecturers: Record<string, Record<number, Record<string, string>>> = {};
  const occupiedCohorts: Record<string, Record<number, CohortSlotEntry[]>> = {};

  for (const day of days) {
    occupiedVenues[day] = {};
    occupiedLecturers[day] = {};
    occupiedCohorts[day] = {};
    for (let i = 0; i < slots.length; i++) {
      occupiedVenues[day][i] = {};
      occupiedLecturers[day][i] = {};
      occupiedCohorts[day][i] = [];
    }
  }

  const hasCohortClash = (
    day: (typeof days)[number],
    startIdx: number,
    duration: number,
    candidate: { level?: string; group?: string; programme?: string | null }
  ): boolean => {
    for (let d = startIdx; d < startIdx + duration; d++) {
      const entries = occupiedCohorts[day]?.[d];
      if (!entries) continue;
      if (entries.some((entry) => doSessionsCohortClash(entry, candidate))) {
        return true;
      }
    }
    return false;
  };

  const recordCohortOccupancy = (
    day: (typeof days)[number],
    startIdx: number,
    duration: number,
    entry: CohortSlotEntry
  ): void => {
    for (let d = startIdx; d < startIdx + duration; d++) {
      occupiedCohorts[day]?.[d]?.push(entry);
    }
  };

  // Pre-occupy slots booked by other departments across submitted/published timetables
  if (externalBookings && externalBookings.length > 0) {
    const venueNameByLower = new Map(
      availableVenues.map((v) => [v.name.trim().toLowerCase(), v.name]),
    );
    for (const eb of externalBookings) {
      const normalizedSlot = (eb.slot || "").slice(0, 5);
      const slotIdx = slots.indexOf(normalizedSlot as any);
      if (slotIdx === -1) continue;
      const dur = eb.duration || 1;
      const rawVenue = (eb.venue || "").trim();
      const canonicalVenue =
        rawVenue && rawVenue !== "Virtual / LMS"
          ? venueNameByLower.get(rawVenue.toLowerCase()) || rawVenue
          : "";
      for (let d = slotIdx; d < slotIdx + dur && d < slots.length; d++) {
        if (canonicalVenue && occupiedVenues[eb.day]?.[d]) {
          occupiedVenues[eb.day][d][canonicalVenue] = `[${eb.booked_by_department}] ${eb.course_code}`;
        }
        if (eb.lecturer && occupiedLecturers[eb.day]?.[d]) {
          occupiedLecturers[eb.day][d][eb.lecturer] = `[${eb.booked_by_department}] ${eb.course_code}`;
        }
      }
    }
  }

  const chapelSchedule =
    opts?.timeLockConfig?.chapelSeminarSchedule ||
    defaultTimeLockConfig.chapelSeminarSchedule;

  // Pre-occupy university-wide Citizenship Orientation & Chapel Seminar slots for all levels (if not exempt)
  if (!isExempt) {
    for (const [lvl, fixed] of Object.entries(chapelSchedule)) {
      const sIdx = slots.indexOf(fixed.slot as any);
      if (sIdx !== -1 && occupiedCohorts[fixed.day]) {
        recordCohortOccupancy(fixed.day, sIdx, fixed.duration || 1, {
          code: "Citizenship Orientation & Chapel Seminar",
          level: lvl,
          group: "All",
          programme: null,
        });
      }
    }
  }

  // Course day tracking to ensure 3-unit multi-sessions are placed on distinct days
  const courseScheduledDays: Record<string, Set<string>> = {};

  // Sort sessions using MRV (Chapel first, then constrained lecturers, longer blocks, shared main-dept courses, larger cohorts)
  const sortedSessions = [...decomposed].sort((a, b) => {
    const aIsChapel = isCitizenshipOrientationCourse(a);
    const bIsChapel = isCitizenshipOrientationCourse(b);

    if (aIsChapel && !bIsChapel) return -1;
    if (!aIsChapel && bIsChapel) return 1;

    const aHasConstraint = activeConstraints.some((c) => c.lecturer === a.lecturer);
    const bHasConstraint = activeConstraints.some((c) => c.lecturer === b.lecturer);

    if (aHasConstraint && !bHasConstraint) return -1;
    if (!aHasConstraint && bHasConstraint) return 1;
    if (b.duration !== a.duration) return b.duration - a.duration;

    // Shared main-department courses (programme === null) are taken by every sub-programme
    // in the level, so placing them before specialized courses avoids squeezing out shared slots.
    const aIsSharedDept = !normalizeProgramme(a.programme);
    const bIsSharedDept = !normalizeProgramme(b.programme);
    if (aIsSharedDept !== bIsSharedDept) return aIsSharedDept ? -1 : 1;

    return b.size - a.size;
  });

  // Filter venues with capacity >= minimum session size
  const validVenues = availableVenues.filter((v) => v.capacity >= 30);

  opts?.onProgress?.({
    stage: "Locking institutional chapel and external bookings...",
    percent: 20,
  });

  const totalSessionsCount = sortedSessions.length;
  for (let sIdx = 0; sIdx < totalSessionsCount; sIdx++) {
    const item = sortedSessions[sIdx];
    if (sIdx % 4 === 0 || sIdx === totalSessionsCount - 1) {
      const pct = Math.min(
        90,
        Math.round(20 + ((sIdx + 1) / totalSessionsCount) * 70),
      );
      opts?.onProgress?.({
        stage: `Scheduling ${item.code} (${sIdx + 1}/${totalSessionsCount})...`,
        percent: pct,
        current: sIdx + 1,
        total: totalSessionsCount,
      });
    }

    const courseGroupKey = `${item.code}-${normalizeProgramme(item.programme) || "General"}-${item.group || "All"}`;
    if (!courseScheduledDays[courseGroupKey]) {
      courseScheduledDays[courseGroupKey] = new Set();
    }

    // Institutional Chapel Seminar: Fixed Day per Level, 09:00, in University Amphitheatre
    const isChapel = isCitizenshipOrientationCourse(item);

    if (isChapel) {
      const fixedLevel = getCitizenshipOrientationLevel(item);
      const fixed = chapelSchedule[fixedLevel] || chapelSchedule["100 Level"];
      const slotIdx = slots.indexOf(fixed.slot);
      const chapelVenue =
        availableVenues.find(
          (v) =>
            v.name.toLowerCase().includes("amphi") ||
            v.name === "University Amphitheatre"
        )?.name || "University Amphitheatre";

      const dur = fixed.duration || 1;

      for (let d = slotIdx; d < slotIdx + dur; d++) {
        if (occupiedLecturers[fixed.day] && occupiedLecturers[fixed.day][d]) {
          occupiedLecturers[fixed.day][d][item.lecturer] = item.code;
        }
        if (occupiedVenues[fixed.day] && occupiedVenues[fixed.day][d]) {
          occupiedVenues[fixed.day][d][chapelVenue] = item.code;
        }
      }
      recordCohortOccupancy(fixed.day, slotIdx, dur, {
        code: item.code,
        level: fixedLevel,
        group: item.group || "All",
        programme: null,
      });

      courseScheduledDays[courseGroupKey].add(fixed.day);

      scheduledSessions.push({
        code: item.code,
        programme: item.programme ?? null,
        lecturer: item.lecturer,
        venue: chapelVenue,
        day: fixed.day,
        slot: fixed.slot,
        duration: dur,
        group: item.group || "All",
        level: fixedLevel,
        isVirtual: false,
      });

      continue;
    }

    let assigned = false;

    // Rank days to achieve balanced daily workload
    const dayCounts = days.map((d) => ({
      day: d,
      count: scheduledSessions.filter((s) => s.day === d).length,
    }));
    dayCounts.sort((a, b) => a.count - b.count);

    // Two-tier day search:
    // Tier A (allowSameDay = false): strictly assign multi-session courses to distinct days (AC-02)
    // Tier B (allowSameDay = true): if distinct days are saturated for this cohort, allow an open non-clashing slot on the same day before resorting to fallback
    for (const allowSameDay of [false, true]) {
      if (assigned) break;

      for (const { day } of dayCounts) {
        if (assigned) break;

        // Prevent multi-session courses for the same cohort from scheduling on the same day unless distinct days are fully booked
        if (!allowSameDay && item.totalSessionsForCourse > 1 && courseScheduledDays[courseGroupKey].has(day)) {
          continue;
        }

        // Standard academic block alignment:
        // Maximizes throughput by packing non-overlapping periods without slot fragmentation
        const slotOrder =
          item.duration === 2
            ? [0, 4, 7, 9, 3, 1, 8, 2] // 07:00, 11:00, 14:00, 16:00, 10:00, 08:00, 15:00, 09:00
            : [5, 10, 0, 9, 2, 8, 1, 3, 4, 7]; // 12:00, 17:00, 07:00, 16:00, 09:00, etc.

        // Try start slots
        for (const slotIdx of slotOrder) {
          if (assigned) break;

          // 1. Operating hours check
          if (!isSlotWithinOperatingHours(day, slotIdx, item.duration, opts?.timeLockConfig, item.level, departmentName)) {
            continue;
          }

          // 2. Lecturer constraint check
          const lecturerCheck = isLecturerAvailableForSlot(
            item.lecturer,
            day,
            slotIdx,
            item.duration,
            activeConstraints
          );
          if (!lecturerCheck.available) {
            continue;
          }

          // 3. Lecturer double-booking check
          let lecturerClash = false;
          for (let d = slotIdx; d < slotIdx + item.duration; d++) {
            if (occupiedLecturers[day][d][item.lecturer]) {
              lecturerClash = true;
              break;
            }
          }
          if (lecturerClash) continue;

          // 4. Student Cohort / Sub-programme / Sub-group non-overlap check
          const itemLevel = item.level || deriveCourseLevel(item);
          const itemProgramme = normalizeProgramme(item.programme);
          if (
            hasCohortClash(day, slotIdx, item.duration, {
              level: itemLevel,
              group: item.group,
              programme: itemProgramme,
            })
          ) {
            continue;
          }

          // 5. Virtual venue assignment or candidate physical venue selection
          if (item.isVirtual) {
            for (let d = slotIdx; d < slotIdx + item.duration; d++) {
              occupiedLecturers[day][d][item.lecturer] = item.code;
            }
            recordCohortOccupancy(day, slotIdx, item.duration, {
              code: item.code,
              level: itemLevel,
              group: item.group,
              programme: itemProgramme,
            });

            courseScheduledDays[courseGroupKey].add(day);

            scheduledSessions.push({
              code: item.code,
              programme: item.programme ?? null,
              lecturer: item.lecturer,
              venue: "Virtual / LMS",
              day,
              slot: slots[slotIdx],
              duration: item.duration,
              group: item.group,
              level: item.level,
              isVirtual: true,
            });

            assigned = true;
            break;
          }

          const candidateVenues = [...validVenues]
            .filter((v) => !v.isVirtual && v.capacity >= item.size)
            .sort((a, b) => scoreVenueFitness(b, item.size, departmentName) - scoreVenueFitness(a, item.size, departmentName));

          for (const venue of candidateVenues) {
            // Check venue double-booking across all duration slots
            let venueClash = false;
            for (let d = slotIdx; d < slotIdx + item.duration; d++) {
              if (occupiedVenues[day][d][venue.name]) {
                venueClash = true;
                break;
              }
            }
            if (venueClash) continue;

            // Assign session!
            for (let d = slotIdx; d < slotIdx + item.duration; d++) {
              occupiedVenues[day][d][venue.name] = item.code;
              occupiedLecturers[day][d][item.lecturer] = item.code;
            }
            recordCohortOccupancy(day, slotIdx, item.duration, {
              code: item.code,
              level: itemLevel,
              group: item.group,
              programme: itemProgramme,
            });

            courseScheduledDays[courseGroupKey].add(day);

            scheduledSessions.push({
              code: item.code,
              programme: item.programme ?? null,
              lecturer: item.lecturer,
              venue: venue.name,
              day,
              slot: slots[slotIdx],
              duration: item.duration,
              group: item.group,
              level: item.level,
            });

            assigned = true;
            break;
          }
        }
      }
    }

    // Fallback: If strict CSP couldn't assign without conflict, assign to best non-cohort-clashing slot
    // Fallback: If strict CSP couldn't assign without conflict, assign to best slot preventing lecturer double-booking
    if (!assigned) {
      let fallbackCandidate: { day: (typeof days)[number]; slotIdx: number; venueName: string } | null = null;
      const itemLevel = item.level || deriveCourseLevel(item);
      const itemProgramme = normalizeProgramme(item.programme);

      // Tier 1 Search: Free lecturer + free cohort (only venue is overloaded)
      for (const day of days) {
        if (fallbackCandidate) break;
        const candidateSlots =
          item.duration === 2
            ? [0, 4, 7, 9, 3, 1, 8, 2]
            : [5, 10, 0, 9, 2, 8, 1, 3, 4, 7];
        for (const slotIdx of candidateSlots) {
          if (!isSlotWithinOperatingHours(day, slotIdx, item.duration, opts?.timeLockConfig, item.level, departmentName)) continue;

          // Lecturer availability check (study leave, day off, adjunct)
          const lecturerCheck = isLecturerAvailableForSlot(item.lecturer, day, slotIdx, item.duration, activeConstraints);
          if (!lecturerCheck.available) continue;

          // Strict Lecturer Double-Booking Check
          let lecturerClash = false;
          for (let d = slotIdx; d < slotIdx + item.duration; d++) {
            if (occupiedLecturers[day][d][item.lecturer]) {
              lecturerClash = true;
              break;
            }
          }
          if (lecturerClash) continue;

          // Check cohort collision (respecting sub-programme vs main department courses)
          if (
            hasCohortClash(day, slotIdx, item.duration, {
              level: itemLevel,
              group: item.group,
              programme: itemProgramme,
            })
          ) {
            continue;
          }

          const v = validVenues.find((ven) => !ven.isVirtual && ven.capacity >= item.size) || validVenues[0];
          fallbackCandidate = {
            day,
            slotIdx,
            venueName: item.isVirtual ? "Virtual / LMS" : (v ? v.name : "LT 12"),
          };
          break;
        }
      }

      if (fallbackCandidate) {
        scheduledSessions.push({
          code: item.code,
          programme: item.programme ?? null,
          lecturer: item.lecturer,
          venue: fallbackCandidate.venueName,
          day: fallbackCandidate.day,
          slot: slots[fallbackCandidate.slotIdx],
          duration: item.duration,
          group: item.group,
          level: item.level,
          isVirtual: item.isVirtual,
        });
        const assignedDay = fallbackCandidate.day;
        const assignedSlotIdx = fallbackCandidate.slotIdx;

        recordCohortOccupancy(assignedDay, assignedSlotIdx, item.duration, {
          code: item.code,
          level: itemLevel,
          group: item.group,
          programme: itemProgramme,
        });
        for (let d = assignedSlotIdx; d < assignedSlotIdx + item.duration; d++) {
          if (occupiedLecturers[assignedDay] && occupiedLecturers[assignedDay][d]) {
            occupiedLecturers[assignedDay][d][item.lecturer] = item.code;
          }
        }
      } else {
        violations.push({
          code: item.code,
          lecturer: item.lecturer,
          venue: item.isVirtual ? "Virtual / LMS" : (validVenues[0]?.name || "LT 12"),
          day: days[0],
          slot: slots[0],
          conflictType: "availability",
          description: `Could not allocate non-overlapping slot for ${item.code} (${item.lecturer}).`,
        });
      }

      assigned = true;
    }
  }

  opts?.onProgress?.({
    stage: "Validating constraints and finalizing schedule...",
    percent: 95,
  });
  opts?.onProgress?.({
    stage: "Timetable generated successfully",
    percent: 100,
  });

  return {
    sessions: scheduledSessions,
    violations,
    success: violations.length === 0,
    score: 100 - violations.length * 15,
  };
}

export interface LiveConflict {
  id: string;
  sessionIndex: number;
  code: string;
  lecturer: string;
  venue: string;
  day: (typeof days)[number];
  slot: (typeof slots)[number];
  duration: number;
  type: HardConflictType;
  title: string;
  description: string;
}

/**
 * Finds the first locked external department booking that overlaps a candidate session's
 * physical venue, day, and time window (excluding equivalent Chapel Seminar sessions).
 */
export function findExternalBookingOverlap(
  session: {
    code?: string;
    venue?: string;
    day?: string;
    slot?: string;
    duration?: number;
    level?: string;
    lecturer?: string;
    isVirtual?: boolean;
  },
  externalBookings?: ExternalBooking[]
): ExternalBooking | undefined {
  if (!externalBookings || externalBookings.length === 0) return undefined;
  if (!session.venue || session.isVirtual || session.venue === "Virtual / LMS") {
    return undefined;
  }

  const slotIdx = slots.indexOf((session.slot || "").slice(0, 5) as (typeof slots)[number]);
  if (slotIdx === -1) return undefined;

  const thisEnd = slotIdx + (session.duration ?? 1);
  const targetVenue = session.venue.trim().toLowerCase();
  const targetDay = (session.day || "").trim();

  return externalBookings.find((eb) => {
    if ((eb.venue || "").trim().toLowerCase() !== targetVenue) return false;
    if ((eb.day || "").trim() !== targetDay) return false;
    if (
      session.code &&
      isEquivalentOrientationSession(session, {
        code: eb.course_code,
        day: eb.day,
        slot: eb.slot,
        lecturer: eb.lecturer,
        venue: eb.venue,
      })
    ) {
      return false;
    }

    const ebStart = slots.indexOf((eb.slot || "").slice(0, 5) as (typeof slots)[number]);
    if (ebStart === -1) return false;
    const ebEnd = ebStart + (eb.duration ?? 1);
    return slotIdx < ebEnd && ebStart < thisEnd;
  });
}

/**
 * Validates a live session schedule in real-time, checking:
 * 1. Institutional operating hours (lunch break, Wed cutoff, Fri cutoff)
 * 2. Lecturer active constraints (Study leave, Day off, Adjunct windows)
 * 3. Physical venue capacity bounds
 * 4. Venue double-booking overlaps
 * 5. Lecturer schedule overlaps
 * 6. Student cohort overlaps
 */
export function validateLiveSessions(
  rawSessions: Session[],
  allAllocations: Allocation[],
  allVenues: (Venue | VenueRecord)[],
  activeConstraints: Constraint[],
  externalBookings?: ExternalBooking[],
  options?: {
    exemptedDepartments?: string[];
    departmentName?: string;
    timeLockConfig?: DynamicTimeLockConfig;
  }
): {
  validatedSessions: Session[];
  conflicts: LiveConflict[];
} {
  const conflicts: LiveConflict[] = [];
  const updatedSessions: Session[] = rawSessions.map((s) => ({ ...s }));
  const isExempt = isDepartmentExemptFromChapel(
    options?.departmentName,
    options?.exemptedDepartments
  );
  const chapelSchedule =
    options?.timeLockConfig?.chapelSeminarSchedule ||
    defaultTimeLockConfig.chapelSeminarSchedule;

  for (let i = 0; i < updatedSessions.length; i++) {
    const s = updatedSessions[i];
    const slotIdx = slots.indexOf(s.slot as any);
    const dur = s.duration ?? 1;
    let conflictType: HardConflictType | undefined = undefined;
    let conflictTitle = "";
    let conflictDesc = "";

    // 0. University-wide Citizenship Orientation & Chapel Seminar lock validation
    const isOrientation = isCitizenshipOrientationCourse(s);
    const sessionLevel = isOrientation
      ? getCitizenshipOrientationLevel(s)
      : deriveCourseLevel(s);
    const chapelWindow = chapelSchedule[sessionLevel];

    if (!isExempt && chapelWindow) {
      const chapelSlotIdx = slots.indexOf(chapelWindow.slot as any);
      const thisEnd = slotIdx + dur;
      const overlapsChapel =
        s.day === chapelWindow.day &&
        slotIdx <= chapelSlotIdx &&
        thisEnd > chapelSlotIdx;

      if (overlapsChapel) {
        if (!isOrientation) {
          // A regular departmental class scheduled during university-wide orientation/chapel!
          conflictType = "availability";
          conflictTitle = "Chapel Seminar Clash";
          conflictDesc = `${sessionLevel} students attend Chapel Seminar on ${chapelWindow.day} ${chapelWindow.slot} (${chapelWindow.venue}). ${s.code} cannot be scheduled during this hour.`;
        } else if (slotIdx !== chapelSlotIdx || dur !== (chapelWindow.duration || 1)) {
          conflictType = "availability";
          conflictTitle = "Chapel Seminar Time Error";
          conflictDesc = `${s.code} (${sessionLevel} Chapel Seminar) must be held on ${chapelWindow.day} at ${chapelWindow.slot} (${chapelWindow.duration || 1} hour) in ${chapelWindow.venue}.`;
        }
      } else if (isOrientation) {
        conflictType = "availability";
        conflictTitle = "Chapel Seminar Time Error";
        conflictDesc = `${s.code} (${sessionLevel} Chapel Seminar) must be scheduled on ${chapelWindow.day} at ${chapelWindow.slot} in ${chapelWindow.venue}.`;
      }
    }

    // 1. Operating hours & locked lunch break check
    if (!conflictType && !isSlotWithinOperatingHours(s.day, slotIdx, dur, options?.timeLockConfig, sessionLevel, options?.departmentName)) {
      conflictType = "availability";
      const cfg = options?.timeLockConfig || defaultTimeLockConfig;
      const lunchIdx = slots.indexOf(cfg.lunchBreak.slot);
      const isLunchConflict = cfg.lunchBreak.enabled && lunchIdx !== -1 && (slotIdx <= lunchIdx && slotIdx + dur > lunchIdx);
      const earlyClosing = cfg.earlyClosings.find((ec) => ec.enabled && ec.day === s.day && (slotIdx + dur - 1 >= slots.indexOf(ec.cutoffSlot)));

      if (earlyClosing) {
        conflictTitle = earlyClosing.label || `${s.day} Early Closing`;
        conflictDesc = `${s.code} is scheduled during ${conflictTitle}. Classes conclude by ${earlyClosing.cutoffSlot} on ${s.day}.`;
      } else if (isLunchConflict) {
        conflictTitle = cfg.lunchBreak.label || "University Lunch Break";
        conflictDesc = `${s.code} overlaps with the locked ${conflictTitle} (${cfg.lunchBreak.slot}).`;
      } else {
        conflictTitle = "Operating Hours Restriction";
        conflictDesc = `${s.code} falls outside approved university teaching hours or during a locked departmental period.`;
      }
    }

    // 2. Lecturer active constraints (leave, day off, adjunct window)
    if (!conflictType) {
      const availCheck = isLecturerAvailableForSlot(s.lecturer, s.day, slotIdx, dur, activeConstraints);
      if (!availCheck.available) {
        conflictType = "availability";
        conflictTitle = "Lecturer Unavailable";
        conflictDesc = `${s.lecturer} (${s.code}): ${availCheck.reason ?? "Unavailable for this time slot"}.`;
      }
    }

    // 2b. Dynamic Workload Limits & Consecutive Teaching Hours
    if (!conflictType) {
      const loadConstraints = activeConstraints.filter(
        (c) => c.lecturer === s.lecturer || c.lecturer === "All Faculty"
      );
      for (const lc of loadConstraints) {
        // Daily load limit
        const maxDaily = lc.params?.maxHours ?? (lc.kind === "Max Daily Load" ? 4 : undefined);
        if (typeof maxDaily === "number" && maxDaily > 0) {
          const daySessions = updatedSessions.filter(
            (os) => os.lecturer === s.lecturer && os.day === s.day
          );
          const totalHours = daySessions.reduce((sum, os) => sum + (os.duration ?? 1), 0);
          if (totalHours > maxDaily) {
            conflictType = "availability";
            conflictTitle = "Daily Teaching Load Exceeded";
            conflictDesc = `${s.lecturer} is scheduled for ${totalHours} lecture hours on ${s.day}, exceeding the daily cap of ${maxDaily} hours.`;
            break;
          }
        }

        // Consecutive hours limit
        const maxConsec = lc.params?.maxConsecutive ?? (lc.kind === "Consecutive Hours Limit" ? 2 : undefined);
        if (typeof maxConsec === "number" && maxConsec > 0) {
          const daySessions = updatedSessions
            .filter((os) => os.lecturer === s.lecturer && os.day === s.day)
            .sort((a, b) => slots.indexOf(a.slot as any) - slots.indexOf(b.slot as any));

          let consecutiveRun = 0;
          let prevEndSlot = -1;
          for (const ds of daySessions) {
            const startIdx = slots.indexOf(ds.slot as any);
            const durHours = ds.duration ?? 1;
            if (prevEndSlot === startIdx) {
              consecutiveRun += durHours;
            } else {
              consecutiveRun = durHours;
            }
            prevEndSlot = startIdx + durHours;
            if (consecutiveRun > maxConsec) {
              conflictType = "availability";
              conflictTitle = "Consecutive Hours Limit Exceeded";
              conflictDesc = `${s.lecturer} has ${consecutiveRun} continuous lecture hours on ${s.day} without a mandatory break (policy limit: ${maxConsec} hrs).`;
              break;
            }
          }
          if (conflictType) break;
        }
      }
    }

    // 3. Physical venue capacity check
    if (!conflictType && !s.isVirtual && s.venue !== "Virtual / LMS" && !isOrientation) {
      const sessionProg = normalizeProgramme(s.programme);
      const alloc =
        allAllocations.find(
          (a) => a.code === s.code && normalizeProgramme(a.programme) === sessionProg
        ) || allAllocations.find((a) => a.code === s.code);
      const v = allVenues.find((ven) => ven.name === s.venue);
      if (alloc && v && !("isVirtual" in v && v.isVirtual) && alloc.size > v.capacity) {
        conflictType = "capacity";
        conflictTitle = "Room Capacity Exceeded";
        conflictDesc = `${alloc.size} students enrolled in ${s.code} exceed ${s.venue} capacity (${v.capacity} seats).`;
      }
    }

    // 4. Venue double-booking check
    if (!conflictType && !s.isVirtual && s.venue !== "Virtual / LMS") {
      for (let j = 0; j < updatedSessions.length; j++) {
        if (i === j) continue;
        const other = updatedSessions[j];
        if (other.isVirtual || other.venue === "Virtual / LMS") continue;
        if (other.venue === s.venue && other.day === s.day) {
          // If both are equivalent citizenship orientation / chapel sessions sharing the Amphitheatre, skip
          if (isEquivalentOrientationSession(s, other)) continue;
          const otherStart = slots.indexOf(other.slot as any);
          const otherDur = other.duration ?? 1;
          const otherEnd = otherStart + otherDur;
          const thisEnd = slotIdx + dur;
          if (slotIdx < otherEnd && otherStart < thisEnd) {
            conflictType = "venue";
            conflictTitle = "Room Double-Booked";
            conflictDesc = `${s.venue} is already booked on ${s.day} ${s.slot} for ${other.code} (${other.lecturer}).`;
            break;
          }
        }
      }

      // Cross-department external venue booking check
      if (!conflictType && externalBookings && externalBookings.length > 0) {
        const eb = findExternalBookingOverlap(s, externalBookings);
        if (eb) {
          conflictType = "venue";
          conflictTitle = "Room Reserved by Another Department";
          conflictDesc = `${s.venue} is reserved by ${eb.booked_by_department} for ${eb.course_code} (${eb.lecturer}) on ${s.day} ${eb.slot}.`;
        }
      }
    }

    // 5. Lecturer double-booking check
    if (!conflictType) {
      for (let j = 0; j < updatedSessions.length; j++) {
        if (i === j) continue;
        const other = updatedSessions[j];
        if (other.lecturer === s.lecturer && other.day === s.day) {
          // Equivalent citizenship orientation / chapel sessions co-scheduled in the Amphitheatre share the same lecturer
          if (isEquivalentOrientationSession(s, other)) continue;
          const otherStart = slots.indexOf(other.slot as any);
          const otherDur = other.duration ?? 1;
          const otherEnd = otherStart + otherDur;
          const thisEnd = slotIdx + dur;
          if (slotIdx < otherEnd && otherStart < thisEnd) {
            conflictType = "lecturer";
            conflictTitle = "Lecturer Double-Booked";
            conflictDesc = `${s.lecturer} is already scheduled on ${s.day} ${s.slot} for both ${s.code} and ${other.code}.`;
            break;
          }
        }
      }

      // Cross-department external lecturer clash check
      if (!conflictType && externalBookings && externalBookings.length > 0) {
        for (const eb of externalBookings) {
          if (eb.lecturer === s.lecturer && eb.day === s.day) {
            if (
              isEquivalentOrientationSession(s, {
                code: eb.course_code,
                day: eb.day,
                slot: eb.slot,
                lecturer: eb.lecturer,
                venue: eb.venue,
              })
            )
              continue;
            const ebStart = slots.indexOf(eb.slot as any);
            const ebDur = eb.duration ?? 1;
            const ebEnd = ebStart + ebDur;
            const thisEnd = slotIdx + dur;
            if (slotIdx < ebEnd && ebStart < thisEnd) {
              conflictType = "lecturer";
              conflictTitle = "Lecturer Scheduled in Another Department";
              conflictDesc = `${s.lecturer} is already scheduled by ${eb.booked_by_department} for ${eb.course_code} on ${s.day} ${eb.slot}.`;
              break;
            }
          }
        }
      }
    }

    // 6. Cohort / Sub-programme / Sub-group clash check
    if (!conflictType && s.level) {
      for (let j = 0; j < updatedSessions.length; j++) {
        if (i === j) continue;
        const other = updatedSessions[j];
        if (other.day === s.day) {
          // Equivalent orientation sessions share the Amphitheatre without clash
          if (isEquivalentOrientationSession(s, other)) continue;
          if (doSessionsCohortClash(s, other)) {
            const otherStart = slots.indexOf(other.slot as any);
            const otherDur = other.duration ?? 1;
            const otherEnd = otherStart + otherDur;
            const thisEnd = slotIdx + dur;
            if (slotIdx < otherEnd && otherStart < thisEnd) {
              conflictType = "availability";
              conflictTitle = "Student Class Overlap";
              conflictDesc = `${s.level} students (${s.group ?? "Cohort"}) have overlapping classes: ${s.code} and ${other.code} on ${s.day} ${s.slot}.`;
              break;
            }
          }
        }
      }
    }

    if (conflictType) {
      s.conflict = conflictType;
      conflicts.push({
        id: `conf-${i}-${s.code}-${s.day}-${s.slot}`,
        sessionIndex: i,
        code: s.code,
        lecturer: s.lecturer,
        venue: s.venue,
        day: s.day,
        slot: s.slot,
        duration: dur,
        type: conflictType,
        title: conflictTitle,
        description: conflictDesc,
      });
    } else {
      delete s.conflict;
    }
  }

  return {
    validatedSessions: updatedSessions,
    conflicts,
  };
}

