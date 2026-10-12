import {
  Allocation,
  Venue,
  Constraint,
  Session,
  days,
  slots,
  VenueRecord,
  venueRecords,
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
  isVirtual?: boolean; // True for online/virtual classes
  sessionIndex: number; // 0 for primary, 1 for secondary
  totalSessionsForCourse: number;
}

/**
 * Break down course allocations into scheduled sessions based on academic unit rules:
 * - 2-Unit course: 1 session of 2 hours
 * - 3-Unit course: 1 session of 2 hours + 1 session of 1 hour (on distinct days)
 * - 4-Unit course: 2 sessions of 2 hours (on distinct days)
 * - 1-Unit course: 1 session of 1 hour
 */
export function decomposeAllocations(allocations: Allocation[]): DecomposedSession[] {
  const result: DecomposedSession[] = [];

  for (const alloc of allocations) {
    const base = {
      code: alloc.code,
      title: alloc.title,
      lecturer: alloc.lecturer,
      size: alloc.size,
      units: alloc.units,
      type: alloc.type,
      group: alloc.group,
      level: alloc.level,
      isVirtual: alloc.isVirtual,
    };

    if (alloc.units === 3) {
      result.push({
        ...base,
        id: `${alloc.code}-s1`,
        duration: 2,
        sessionIndex: 0,
        totalSessionsForCourse: 2,
      });
      result.push({
        ...base,
        id: `${alloc.code}-s2`,
        duration: 1,
        sessionIndex: 1,
        totalSessionsForCourse: 2,
      });
    } else if (alloc.units >= 4) {
      result.push({
        ...base,
        id: `${alloc.code}-s1`,
        duration: 2,
        sessionIndex: 0,
        totalSessionsForCourse: 2,
      });
      result.push({
        ...base,
        id: `${alloc.code}-s2`,
        duration: 2,
        sessionIndex: 1,
        totalSessionsForCourse: 2,
      });
    } else if (alloc.units === 2) {
      result.push({
        ...base,
        id: `${alloc.code}-s1`,
        duration: 2,
        sessionIndex: 0,
        totalSessionsForCourse: 1,
      });
    } else {
      result.push({
        ...base,
        id: `${alloc.code}-s1`,
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
 * - Operating hours: Mon/Tue/Thu (07:00-18:00), Wed (07:00-17:00), Fri (07:00-13:00)
 * - Break Time: 13:00 - 14:00 (slotIndex 6) is strictly locked daily
 */
export function isSlotWithinOperatingHours(
  day: (typeof days)[number],
  slotIndex: number,
  duration: number
): boolean {
  const endIndex = slotIndex + duration - 1;
  const maxSlotIndex = slots.length - 1; // 10 (17:00)

  // Out of bounds check
  if (slotIndex < 0 || endIndex > maxSlotIndex) return false;

  // Friday early finish: no classes after 13:00 (slotIndex 6+)
  if (day === "Fri" && endIndex >= 6) {
    return false;
  }

  // Wednesday early finish: classes end by 17:00 (no classes at 17:00 / slotIndex 10)
  if (day === "Wed" && endIndex >= 10) {
    return false;
  }

  // Mandatory Lunch Break: 13:00 (slotIndex 6) locked on all days
  for (let i = slotIndex; i <= endIndex; i++) {
    if (i === 6) {
      return false; // Cannot start at or overlap through 13:00
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
  const lecturerConstraints = constraints.filter((c) => c.lecturer === lecturer);

  for (const c of lecturerConstraints) {
    if (c.kind === "Study Leave") {
      return { available: false, reason: `On Study Leave (${c.detail})` };
    }

    if (c.kind === "Day Off") {
      const lowerRange = c.range.toLowerCase();
      if (lowerRange.includes("wed") && day === "Wed") {
        return { available: false, reason: `Lecturer day off on Wednesdays` };
      }
      if (lowerRange.includes("fri am") && day === "Fri" && slotIndex < 6) {
        return { available: false, reason: `Lecturer day off on Friday mornings` };
      }
    }

    if (c.kind === "Adjunct") {
      const lowerRange = c.range.toLowerCase();
      if (lowerRange.includes("tue, fri") || lowerRange.includes("tue & fri")) {
        if (day !== "Tue" && day !== "Fri") {
          return { available: false, reason: `Adjunct available Tue & Fri only` };
        }
      } else if (lowerRange.includes("wed") && day !== "Wed") {
        return { available: false, reason: `Adjunct available Wed only` };
      }

      if (lowerRange.includes("after 14:00") && slotIndex < 7) {
        return { available: false, reason: `Adjunct available after 14:00 only` };
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
  departmentName: string = "Computer Science"
): EngineResult {
  const decomposed = decomposeAllocations(allocations);
  const scheduledSessions: Session[] = [];
  const violations: ConstraintViolation[] = [];

  // Data structure to track occupied slots: occupied[day][slotIndex][venueName] = lecturer / courseCode
  const occupiedVenues: Record<string, Record<number, Record<string, string>>> = {};
  const occupiedLecturers: Record<string, Record<number, Record<string, string>>> = {};
  const occupiedGroups: Record<string, Record<number, Record<string, string>>> = {};

  for (const day of days) {
    occupiedVenues[day] = {};
    occupiedLecturers[day] = {};
    occupiedGroups[day] = {};
    for (let i = 0; i < slots.length; i++) {
      occupiedVenues[day][i] = {};
      occupiedLecturers[day][i] = {};
      occupiedGroups[day][i] = {};
    }
  }

  // Course day tracking to ensure 3-unit multi-sessions are placed on distinct days
  const courseScheduledDays: Record<string, Set<string>> = {};

  // Sort sessions using MRV (Most Constrained Variables first)
  const sortedSessions = [...decomposed].sort((a, b) => {
    const aHasConstraint = activeConstraints.some((c) => c.lecturer === a.lecturer);
    const bHasConstraint = activeConstraints.some((c) => c.lecturer === b.lecturer);

    if (aHasConstraint && !bHasConstraint) return -1;
    if (!aHasConstraint && bHasConstraint) return 1;
    if (b.duration !== a.duration) return b.duration - a.duration;
    return b.size - a.size;
  });

  // Filter venues with capacity >= minimum session size
  const validVenues = availableVenues.filter((v) => v.capacity >= 30);

  for (const item of sortedSessions) {
    if (!courseScheduledDays[item.code]) {
      courseScheduledDays[item.code] = new Set();
    }

    let assigned = false;

    // Rank days to achieve balanced daily workload
    const dayCounts = days.map((d) => ({
      day: d,
      count: scheduledSessions.filter((s) => s.day === d).length,
    }));
    dayCounts.sort((a, b) => a.count - b.count);

    for (const { day } of dayCounts) {
      if (assigned) break;

      // Prevent multi-session courses from scheduling on the same day if possible
      if (item.totalSessionsForCourse > 1 && courseScheduledDays[item.code].has(day)) {
        continue;
      }

      // Try start slots
      for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
        if (assigned) break;

        // 1. Operating hours check
        if (!isSlotWithinOperatingHours(day, slotIdx, item.duration)) {
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

        // 4. Student Group / Cohort non-overlap check
        const isUnified = !item.group || item.group === "All" || item.group === "Unified";
        const groupKey = isUnified ? `${item.level || "200 Level"}-All` : `${item.level || "200 Level"}-${item.group}`;
        let groupClash = false;
        for (let d = slotIdx; d < slotIdx + item.duration; d++) {
          const occ = occupiedGroups[day][d];
          if (isUnified) {
            // Whole-cohort class: cannot overlap with ANY session of the same level
            const levelPrefix = `${item.level || "200 Level"}-`;
            if (Object.keys(occ).some((k) => k.startsWith(levelPrefix))) {
              groupClash = true;
              break;
            }
          } else {
            // Specific sub-group: cannot overlap with same group OR with a unified class of the same level
            const allKey = `${item.level || "200 Level"}-All`;
            if (occ[groupKey] || occ[allKey]) {
              groupClash = true;
              break;
            }
          }
        }
        if (groupClash) continue;

        // 5. Virtual venue assignment or candidate physical venue selection
        if (item.isVirtual) {
          for (let d = slotIdx; d < slotIdx + item.duration; d++) {
            occupiedLecturers[day][d][item.lecturer] = item.code;
            occupiedGroups[day][d][groupKey] = item.code;
          }

          courseScheduledDays[item.code].add(day);

          scheduledSessions.push({
            code: item.code,
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
            occupiedGroups[day][d][groupKey] = item.code;
          }

          courseScheduledDays[item.code].add(day);

          scheduledSessions.push({
            code: item.code,
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

    // Fallback: If strict CSP couldn't assign without conflict, assign with best-effort & flag conflict
    if (!assigned) {
      // Find a slot and venue and flag conflict
      for (const day of days) {
        if (assigned) break;
        for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
          if (slotIdx === 6) continue; // Skip lunch break even in fallback
          if (day === "Fri" && slotIdx >= 6) continue;

          const venue = validVenues[0];
          scheduledSessions.push({
            code: item.code,
            lecturer: item.lecturer,
            venue: venue ? venue.name : "LT 12",
            day,
            slot: slots[slotIdx],
            duration: item.duration,
            conflict: "venue",
          });

          violations.push({
            code: item.code,
            lecturer: item.lecturer,
            venue: venue ? venue.name : "LT 12",
            day,
            slot: slots[slotIdx],
            conflictType: "venue",
            description: `Could not satisfy all constraints for ${item.code} — fallback assignment made with potential clash.`,
          });

          assigned = true;
          break;
        }
      }
    }
  }

  return {
    sessions: scheduledSessions,
    violations,
    success: violations.length === 0,
    score: 100 - violations.length * 15,
  };
}
