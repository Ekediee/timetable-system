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

export interface DecomposeOptions {
  // Reserved for future solver options
}

/**
 * Extracts individual constituent sub-groups from combined group strings like:
 * "Group A", "Group A & B", "Group A & F", "Group B & E", "Group A & C & E", "All", etc.
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
 * Break down course allocations into scheduled sessions based on academic unit rules:
 * - 2-Unit course: 1 session of 2 hours
 * - 3-Unit course: 1 session of 2 hours + 1 session of 1 hour (on distinct days)
 * - 4-Unit course: 2 sessions of 2 hours (on distinct days)
 * - 1-Unit course: 1 session of 1 hour
 */
export function decomposeAllocations(
  allocations: Allocation[],
  options?: DecomposeOptions
): DecomposedSession[] {
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

    const grp = alloc.group ? alloc.group.replace(/\s+/g, "").replace(/&/g, "_") : "All";

    if (alloc.units === 3) {
      result.push({
        ...base,
        id: `${alloc.code}-${grp}-s1`,
        duration: 2,
        sessionIndex: 0,
        totalSessionsForCourse: 2,
      });
      result.push({
        ...base,
        id: `${alloc.code}-${grp}-s2`,
        duration: 1,
        sessionIndex: 1,
        totalSessionsForCourse: 2,
      });
    } else if (alloc.units >= 4) {
      result.push({
        ...base,
        id: `${alloc.code}-${grp}-s1`,
        duration: 2,
        sessionIndex: 0,
        totalSessionsForCourse: 2,
      });
      result.push({
        ...base,
        id: `${alloc.code}-${grp}-s2`,
        duration: 2,
        sessionIndex: 1,
        totalSessionsForCourse: 2,
      });
    } else if (alloc.units === 2) {
      result.push({
        ...base,
        id: `${alloc.code}-${grp}-s1`,
        duration: 2,
        sessionIndex: 0,
        totalSessionsForCourse: 1,
      });
    } else {
      result.push({
        ...base,
        id: `${alloc.code}-${grp}-s1`,
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
 * Primary Engine: Solves constraint satisfaction problem and generates a timetable schedule
 */
export function generateTimetable(
  allocations: Allocation[],
  availableVenues: (Venue | VenueRecord)[],
  activeConstraints: Constraint[],
  departmentNameOrOptions: string | DecomposeOptions = "Computer Science",
  options?: DecomposeOptions
): EngineResult {
  const departmentName =
    typeof departmentNameOrOptions === "string"
      ? departmentNameOrOptions
      : "Computer Science";
  const opts =
    typeof departmentNameOrOptions === "object"
      ? departmentNameOrOptions
      : options;
  const decomposed = decomposeAllocations(allocations, opts);
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

  // Sort sessions using MRV (Most Constrained Variables first, Chapel Seminar first)
  const isChapelCourse = (c: { code: string; title: string }) => {
    const code = c.code.toUpperCase();
    const title = c.title.toLowerCase();
    return (
      code.includes("GEDS001") ||
      code.includes("GEDS 001") ||
      code.includes("BU-GST 0") ||
      title.includes("chapel") ||
      title.includes("citizenship orientation")
    );
  };

  const sortedSessions = [...decomposed].sort((a, b) => {
    const aIsChapel = isChapelCourse(a);
    const bIsChapel = isChapelCourse(b);

    if (aIsChapel && !bIsChapel) return -1;
    if (!aIsChapel && bIsChapel) return 1;

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
    const courseGroupKey = `${item.code}-${item.group || "All"}`;
    if (!courseScheduledDays[courseGroupKey]) {
      courseScheduledDays[courseGroupKey] = new Set();
    }

    // Institutional Chapel Seminar: Fixed Day per Level, 09:00, in University Amphitheatre
    const isChapel = isChapelCourse(item);

    if (isChapel && item.level && CHAPEL_SEMINAR_SCHEDULE[item.level]) {
      const fixed = CHAPEL_SEMINAR_SCHEDULE[item.level];
      const slotIdx = slots.indexOf(fixed.slot);
      const chapelVenue =
        availableVenues.find(
          (v) =>
            v.name.toLowerCase().includes("amphi") ||
            v.name === "University Amphitheatre"
        )?.name || "University Amphitheatre";

      const dur = item.duration || 1;

      for (let d = slotIdx; d < slotIdx + dur; d++) {
        if (occupiedLecturers[fixed.day] && occupiedLecturers[fixed.day][d]) {
          occupiedLecturers[fixed.day][d][item.lecturer] = item.code;
        }
        if (occupiedVenues[fixed.day] && occupiedVenues[fixed.day][d]) {
          occupiedVenues[fixed.day][d][chapelVenue] = item.code;
        }
        if (occupiedGroups[fixed.day] && occupiedGroups[fixed.day][d]) {
          occupiedGroups[fixed.day][d][`${item.level}-All`] = item.code;
          for (const g of ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F"]) {
            occupiedGroups[fixed.day][d][`${item.level}-${g}`] = item.code;
          }
        }
      }

      courseScheduledDays[courseGroupKey].add(fixed.day);

      scheduledSessions.push({
        code: item.code,
        lecturer: item.lecturer,
        venue: chapelVenue,
        day: fixed.day,
        slot: fixed.slot,
        duration: dur,
        group: item.group || "All",
        level: item.level,
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

    for (const { day } of dayCounts) {
      if (assigned) break;

      // Prevent multi-session courses for the same cohort from scheduling on the same day if possible
      if (item.totalSessionsForCourse > 1 && courseScheduledDays[courseGroupKey].has(day)) {
        continue;
      }

      // Standard academic block alignment:
      // 2-hour classes prioritize standard 2-hour lecture periods:
      // 08:00 (slot 1), 10:00 (slot 3), 14:00 (slot 7), 16:00 (slot 9), 07:00 (slot 0), followed by 11:00 (slot 4), 15:00 (slot 8), 09:00 (slot 2)
      const slotOrder =
        item.duration === 2
          ? [1, 3, 7, 9, 0, 4, 8, 2] // 08:00, 10:00, 14:00, 16:00, 07:00, 11:00, 15:00, 09:00
          : [5, 0, 9, 2, 8, 1, 3, 4, 7]; // 12:00 (1h before lunch), 07:00, 16:00, 09:00, etc.

      // Try start slots
      for (const slotIdx of slotOrder) {
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
        const itemLevel = item.level || "200 Level";
        const itemGroups = extractSubgroups(item.group);
        const isUnified = itemGroups.includes("All");
        let groupClash = false;
        for (let d = slotIdx; d < slotIdx + item.duration; d++) {
          const occ = occupiedGroups[day][d];
          const allKey = `${itemLevel}-All`;
          if (occ[allKey]) {
            groupClash = true;
            break;
          }
          if (isUnified) {
            // Whole-cohort class: cannot overlap with ANY session of the same level
            const levelPrefix = `${itemLevel}-`;
            if (Object.keys(occ).some((k) => k.startsWith(levelPrefix))) {
              groupClash = true;
              break;
            }
          } else {
            // Specific sub-group(s): cannot overlap if ANY constituent group is occupied
            if (itemGroups.some((g) => occ[`${itemLevel}-${g}`])) {
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
            if (isUnified) {
              occupiedGroups[day][d][`${itemLevel}-All`] = item.code;
              for (const g of ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F", "Direct Entry"]) {
                occupiedGroups[day][d][`${itemLevel}-${g}`] = item.code;
              }
            } else {
              for (const g of itemGroups) {
                occupiedGroups[day][d][`${itemLevel}-${g}`] = item.code;
              }
              occupiedGroups[day][d][`${itemLevel}-${item.group}`] = item.code;
            }
          }

          courseScheduledDays[courseGroupKey].add(day);

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
            if (isUnified) {
              occupiedGroups[day][d][`${itemLevel}-All`] = item.code;
              for (const g of ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F", "Direct Entry"]) {
                occupiedGroups[day][d][`${itemLevel}-${g}`] = item.code;
              }
            } else {
              for (const g of itemGroups) {
                occupiedGroups[day][d][`${itemLevel}-${g}`] = item.code;
              }
              occupiedGroups[day][d][`${itemLevel}-${item.group}`] = item.code;
            }
          }

          courseScheduledDays[courseGroupKey].add(day);

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

    // Fallback: If strict CSP couldn't assign without conflict, assign to best non-cohort-clashing slot
    // Fallback: If strict CSP couldn't assign without conflict, assign to best slot preventing lecturer double-booking
    if (!assigned) {
      let fallbackCandidate: { day: (typeof days)[number]; slotIdx: number; venueName: string } | null = null;
      const itemLevel = item.level || "200 Level";
      const itemGroups = extractSubgroups(item.group);
      const isUnified = itemGroups.includes("All");

      // Tier 1 Search: Free lecturer + free cohort (only venue is overloaded)
      for (const day of days) {
        if (fallbackCandidate) break;
        const candidateSlots = item.duration === 2 ? [1, 3, 7, 9, 0, 4, 8, 2] : [5, 0, 9, 2, 8, 1, 3, 4, 7];
        for (const slotIdx of candidateSlots) {
          if (!isSlotWithinOperatingHours(day, slotIdx, item.duration)) continue;

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

          // Check cohort collision
          let cohortClash = false;
          for (let d = slotIdx; d < slotIdx + item.duration; d++) {
            const occ = occupiedGroups[day][d];
            if (occ[`${itemLevel}-All`]) {
              cohortClash = true;
              break;
            }
            if (isUnified) {
              if (Object.keys(occ).some((k) => k.startsWith(`${itemLevel}-`))) {
                cohortClash = true;
                break;
              }
            } else {
              if (itemGroups.some((g) => occ[`${itemLevel}-${g}`])) {
                cohortClash = true;
                break;
              }
            }
          }
          if (cohortClash) continue;

          const v = validVenues.find((ven) => !ven.isVirtual && ven.capacity >= item.size) || validVenues[0];
          fallbackCandidate = {
            day,
            slotIdx,
            venueName: item.isVirtual ? "Virtual / LMS" : (v ? v.name : "LT 12"),
          };
          break;
        }
      }

      // Tier 2 Search: If no free cohort slot, at least guarantee free lecturer!
      if (!fallbackCandidate) {
        for (const day of days) {
          if (fallbackCandidate) break;
          const candidateSlots = item.duration === 2 ? [1, 3, 7, 9, 0, 4, 8, 2] : [5, 0, 9, 2, 8, 1, 3, 4, 7];
          for (const slotIdx of candidateSlots) {
            if (!isSlotWithinOperatingHours(day, slotIdx, item.duration)) continue;

            const lecturerCheck = isLecturerAvailableForSlot(item.lecturer, day, slotIdx, item.duration, activeConstraints);
            if (!lecturerCheck.available) continue;

            let lecturerClash = false;
            for (let d = slotIdx; d < slotIdx + item.duration; d++) {
              if (occupiedLecturers[day][d][item.lecturer]) {
                lecturerClash = true;
                break;
              }
            }
            if (lecturerClash) continue;

            const v = validVenues.find((ven) => !ven.isVirtual && ven.capacity >= item.size) || validVenues[0];
            fallbackCandidate = {
              day,
              slotIdx,
              venueName: item.isVirtual ? "Virtual / LMS" : (v ? v.name : "LT 12"),
            };
            break;
          }
        }
      }

      const assignedDay = fallbackCandidate ? fallbackCandidate.day : days[0];
      const assignedSlotIdx = fallbackCandidate ? fallbackCandidate.slotIdx : 0;
      const assignedVenue = fallbackCandidate ? fallbackCandidate.venueName : (validVenues[0]?.name || "LT 12");

      scheduledSessions.push({
        code: item.code,
        lecturer: item.lecturer,
        venue: assignedVenue,
        day: assignedDay,
        slot: slots[assignedSlotIdx],
        duration: item.duration,
        group: item.group,
        level: item.level,
        isVirtual: item.isVirtual,
        conflict: "venue",
      });

      violations.push({
        code: item.code,
        lecturer: item.lecturer,
        venue: assignedVenue,
        day: assignedDay,
        slot: slots[assignedSlotIdx],
        conflictType: "venue",
        description: `Could not satisfy optimal venue allocation for ${item.code} — assigned to ${assignedVenue} with soft warning.`,
      });

      for (let d = assignedSlotIdx; d < assignedSlotIdx + item.duration; d++) {
        if (occupiedGroups[assignedDay] && occupiedGroups[assignedDay][d]) {
          if (isUnified) {
            occupiedGroups[assignedDay][d][`${itemLevel}-All`] = item.code;
            for (const g of ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F", "Direct Entry"]) {
              occupiedGroups[assignedDay][d][`${itemLevel}-${g}`] = item.code;
            }
          } else {
            for (const g of itemGroups) {
              occupiedGroups[assignedDay][d][`${itemLevel}-${g}`] = item.code;
            }
            occupiedGroups[assignedDay][d][`${itemLevel}-${item.group}`] = item.code;
          }
        }
        if (occupiedLecturers[assignedDay] && occupiedLecturers[assignedDay][d]) {
          occupiedLecturers[assignedDay][d][item.lecturer] = item.code;
        }
      }

      assigned = true;
    }
  }

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
  activeConstraints: Constraint[]
): {
  validatedSessions: Session[];
  conflicts: LiveConflict[];
} {
  const conflicts: LiveConflict[] = [];
  const updatedSessions: Session[] = rawSessions.map((s) => ({ ...s }));

  for (let i = 0; i < updatedSessions.length; i++) {
    const s = updatedSessions[i];
    const slotIdx = slots.indexOf(s.slot as any);
    const dur = s.duration ?? 1;
    let conflictType: HardConflictType | undefined = undefined;
    let conflictTitle = "";
    let conflictDesc = "";

    // 1. Operating hours & locked lunch break check
    if (!isSlotWithinOperatingHours(s.day, slotIdx, dur)) {
      conflictType = "availability";
      if (s.day === "Fri" && slotIdx + dur - 1 >= 6) {
        conflictTitle = "Friday Institutional Off";
        conflictDesc = `${s.code} is scheduled on Friday afternoon. Institutional policy ends Friday classes at 13:00.`;
      } else if (s.day === "Wed" && slotIdx + dur - 1 >= 10) {
        conflictTitle = "Wednesday 17:00 University Cutoff";
        conflictDesc = `${s.code} extends past the Wednesday 17:00 university sports/chapel cutoff.`;
      } else {
        conflictTitle = "Mandatory Lunch Break (13:00 - 14:00)";
        conflictDesc = `${s.code} collides with the locked institutional lunch break (13:00 - 14:00).`;
      }
    }

    // 2. Lecturer active constraints (leave, day off, adjunct window)
    if (!conflictType) {
      const availCheck = isLecturerAvailableForSlot(s.lecturer, s.day, slotIdx, dur, activeConstraints);
      if (!availCheck.available) {
        conflictType = "availability";
        conflictTitle = "Lecturer Constraint Conflict";
        conflictDesc = `${s.lecturer} (${s.code}): ${availCheck.reason ?? "Unavailable for this slot"}.`;
      }
    }

    // 3. Physical venue capacity check
    if (!conflictType && !s.isVirtual && s.venue !== "Virtual / LMS") {
      const alloc = allAllocations.find((a) => a.code === s.code);
      const v = allVenues.find((ven) => ven.name === s.venue);
      if (alloc && v && !("isVirtual" in v && v.isVirtual) && alloc.size > v.capacity) {
        conflictType = "capacity";
        conflictTitle = "Venue Capacity Exceeded";
        conflictDesc = `${alloc.size} students enrolled in ${s.code} exceed ${s.venue} capacity of ${v.capacity} seats.`;
      }
    }

    // 4. Venue double-booking check
    if (!conflictType && !s.isVirtual && s.venue !== "Virtual / LMS") {
      for (let j = 0; j < updatedSessions.length; j++) {
        if (i === j) continue;
        const other = updatedSessions[j];
        if (other.isVirtual || other.venue === "Virtual / LMS") continue;
        if (other.venue === s.venue && other.day === s.day) {
          const otherStart = slots.indexOf(other.slot as any);
          const otherDur = other.duration ?? 1;
          const otherEnd = otherStart + otherDur;
          const thisEnd = slotIdx + dur;
          if (slotIdx < otherEnd && otherStart < thisEnd) {
            conflictType = "venue";
            conflictTitle = "Venue Double-Booking";
            conflictDesc = `${s.venue} is double-booked on ${s.day} ${s.slot} with ${other.code} (${other.lecturer}).`;
            break;
          }
        }
      }
    }

    // 5. Lecturer double-booking check
    if (!conflictType) {
      for (let j = 0; j < updatedSessions.length; j++) {
        if (i === j) continue;
        const other = updatedSessions[j];
        if (other.lecturer === s.lecturer && other.day === s.day) {
          const otherStart = slots.indexOf(other.slot as any);
          const otherDur = other.duration ?? 1;
          const otherEnd = otherStart + otherDur;
          const thisEnd = slotIdx + dur;
          if (slotIdx < otherEnd && otherStart < thisEnd) {
            conflictType = "lecturer";
            conflictTitle = "Lecturer Double-Booking";
            conflictDesc = `${s.lecturer} is booked simultaneously on ${s.day} ${s.slot} for both ${s.code} and ${other.code}.`;
            break;
          }
        }
      }
    }

    // 6. Cohort / Sub-group clash check
    if (!conflictType && s.level) {
      for (let j = 0; j < updatedSessions.length; j++) {
        if (i === j) continue;
        const other = updatedSessions[j];
        if (other.level === s.level && other.day === s.day) {
          const groupClash = doGroupsClash(s.group, other.group);

          if (groupClash) {
            const otherStart = slots.indexOf(other.slot as any);
            const otherDur = other.duration ?? 1;
            const otherEnd = otherStart + otherDur;
            const thisEnd = slotIdx + dur;
            if (slotIdx < otherEnd && otherStart < thisEnd) {
              conflictType = "availability";
              conflictTitle = "Cohort Schedule Collision";
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

