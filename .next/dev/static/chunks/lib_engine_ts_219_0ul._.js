(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/engine.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "decomposeAllocations",
    ()=>decomposeAllocations,
    "generateTimetable",
    ()=>generateTimetable,
    "isLecturerAvailableForSlot",
    ()=>isLecturerAvailableForSlot,
    "isSlotWithinOperatingHours",
    ()=>isSlotWithinOperatingHours,
    "scoreVenueFitness",
    ()=>scoreVenueFitness,
    "validateLiveSessions",
    ()=>validateLiveSessions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/data.ts [app-client] (ecmascript)");
;
function decomposeAllocations(allocations) {
    const result = [];
    for (const alloc of allocations){
        const base = {
            code: alloc.code,
            title: alloc.title,
            lecturer: alloc.lecturer,
            size: alloc.size,
            units: alloc.units,
            type: alloc.type,
            group: alloc.group,
            level: alloc.level,
            isVirtual: alloc.isVirtual
        };
        if (alloc.units === 3) {
            result.push({
                ...base,
                id: `${alloc.code}-s1`,
                duration: 2,
                sessionIndex: 0,
                totalSessionsForCourse: 2
            });
            result.push({
                ...base,
                id: `${alloc.code}-s2`,
                duration: 1,
                sessionIndex: 1,
                totalSessionsForCourse: 2
            });
        } else if (alloc.units >= 4) {
            result.push({
                ...base,
                id: `${alloc.code}-s1`,
                duration: 2,
                sessionIndex: 0,
                totalSessionsForCourse: 2
            });
            result.push({
                ...base,
                id: `${alloc.code}-s2`,
                duration: 2,
                sessionIndex: 1,
                totalSessionsForCourse: 2
            });
        } else if (alloc.units === 2) {
            result.push({
                ...base,
                id: `${alloc.code}-s1`,
                duration: 2,
                sessionIndex: 0,
                totalSessionsForCourse: 1
            });
        } else {
            result.push({
                ...base,
                id: `${alloc.code}-s1`,
                duration: 1,
                sessionIndex: 0,
                totalSessionsForCourse: 1
            });
        }
    }
    return result;
}
function isSlotWithinOperatingHours(day, slotIndex, duration) {
    const endIndex = slotIndex + duration - 1;
    const maxSlotIndex = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slots"].length - 1; // 10 (17:00)
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
    for(let i = slotIndex; i <= endIndex; i++){
        if (i === 6) {
            return false; // Cannot start at or overlap through 13:00
        }
    }
    return true;
}
function isLecturerAvailableForSlot(lecturer, day, slotIndex, duration, constraints) {
    const lecturerConstraints = constraints.filter((c)=>c.lecturer === lecturer);
    for (const c of lecturerConstraints){
        if (c.kind === "Study Leave") {
            return {
                available: false,
                reason: `On Study Leave (${c.detail})`
            };
        }
        if (c.kind === "Day Off") {
            const lowerRange = c.range.toLowerCase();
            if (lowerRange.includes("wed") && day === "Wed") {
                return {
                    available: false,
                    reason: `Lecturer day off on Wednesdays`
                };
            }
            if (lowerRange.includes("fri am") && day === "Fri" && slotIndex < 6) {
                return {
                    available: false,
                    reason: `Lecturer day off on Friday mornings`
                };
            }
        }
        if (c.kind === "Adjunct") {
            const lowerRange = c.range.toLowerCase();
            if (lowerRange.includes("tue, fri") || lowerRange.includes("tue & fri")) {
                if (day !== "Tue" && day !== "Fri") {
                    return {
                        available: false,
                        reason: `Adjunct available Tue & Fri only`
                    };
                }
            } else if (lowerRange.includes("wed") && day !== "Wed") {
                return {
                    available: false,
                    reason: `Adjunct available Wed only`
                };
            }
            if (lowerRange.includes("after 14:00") && slotIndex < 7) {
                return {
                    available: false,
                    reason: `Adjunct available after 14:00 only`
                };
            }
        }
    }
    return {
        available: true
    };
}
function scoreVenueFitness(venue, classSize, departmentName = "Computer Science") {
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
function generateTimetable(allocations, availableVenues, activeConstraints, departmentName = "Computer Science") {
    const decomposed = decomposeAllocations(allocations);
    const scheduledSessions = [];
    const violations = [];
    // Data structure to track occupied slots: occupied[day][slotIndex][venueName] = lecturer / courseCode
    const occupiedVenues = {};
    const occupiedLecturers = {};
    const occupiedGroups = {};
    for (const day of __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["days"]){
        occupiedVenues[day] = {};
        occupiedLecturers[day] = {};
        occupiedGroups[day] = {};
        for(let i = 0; i < __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slots"].length; i++){
            occupiedVenues[day][i] = {};
            occupiedLecturers[day][i] = {};
            occupiedGroups[day][i] = {};
        }
    }
    // Course day tracking to ensure 3-unit multi-sessions are placed on distinct days
    const courseScheduledDays = {};
    // Sort sessions using MRV (Most Constrained Variables first)
    const sortedSessions = [
        ...decomposed
    ].sort((a, b)=>{
        const aHasConstraint = activeConstraints.some((c)=>c.lecturer === a.lecturer);
        const bHasConstraint = activeConstraints.some((c)=>c.lecturer === b.lecturer);
        if (aHasConstraint && !bHasConstraint) return -1;
        if (!aHasConstraint && bHasConstraint) return 1;
        if (b.duration !== a.duration) return b.duration - a.duration;
        return b.size - a.size;
    });
    // Filter venues with capacity >= minimum session size
    const validVenues = availableVenues.filter((v)=>v.capacity >= 30);
    for (const item of sortedSessions){
        if (!courseScheduledDays[item.code]) {
            courseScheduledDays[item.code] = new Set();
        }
        let assigned = false;
        // Rank days to achieve balanced daily workload
        const dayCounts = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["days"].map((d)=>({
                day: d,
                count: scheduledSessions.filter((s)=>s.day === d).length
            }));
        dayCounts.sort((a, b)=>a.count - b.count);
        for (const { day } of dayCounts){
            if (assigned) break;
            // Prevent multi-session courses from scheduling on the same day if possible
            if (item.totalSessionsForCourse > 1 && courseScheduledDays[item.code].has(day)) {
                continue;
            }
            // Try start slots
            for(let slotIdx = 0; slotIdx < __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slots"].length; slotIdx++){
                if (assigned) break;
                // 1. Operating hours check
                if (!isSlotWithinOperatingHours(day, slotIdx, item.duration)) {
                    continue;
                }
                // 2. Lecturer constraint check
                const lecturerCheck = isLecturerAvailableForSlot(item.lecturer, day, slotIdx, item.duration, activeConstraints);
                if (!lecturerCheck.available) {
                    continue;
                }
                // 3. Lecturer double-booking check
                let lecturerClash = false;
                for(let d = slotIdx; d < slotIdx + item.duration; d++){
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
                for(let d = slotIdx; d < slotIdx + item.duration; d++){
                    const occ = occupiedGroups[day][d];
                    if (isUnified) {
                        // Whole-cohort class: cannot overlap with ANY session of the same level
                        const levelPrefix = `${item.level || "200 Level"}-`;
                        if (Object.keys(occ).some((k)=>k.startsWith(levelPrefix))) {
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
                    for(let d = slotIdx; d < slotIdx + item.duration; d++){
                        occupiedLecturers[day][d][item.lecturer] = item.code;
                        occupiedGroups[day][d][groupKey] = item.code;
                    }
                    courseScheduledDays[item.code].add(day);
                    scheduledSessions.push({
                        code: item.code,
                        lecturer: item.lecturer,
                        venue: "Virtual / LMS",
                        day,
                        slot: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slots"][slotIdx],
                        duration: item.duration,
                        group: item.group,
                        level: item.level,
                        isVirtual: true
                    });
                    assigned = true;
                    break;
                }
                const candidateVenues = [
                    ...validVenues
                ].filter((v)=>!v.isVirtual && v.capacity >= item.size).sort((a, b)=>scoreVenueFitness(b, item.size, departmentName) - scoreVenueFitness(a, item.size, departmentName));
                for (const venue of candidateVenues){
                    // Check venue double-booking across all duration slots
                    let venueClash = false;
                    for(let d = slotIdx; d < slotIdx + item.duration; d++){
                        if (occupiedVenues[day][d][venue.name]) {
                            venueClash = true;
                            break;
                        }
                    }
                    if (venueClash) continue;
                    // Assign session!
                    for(let d = slotIdx; d < slotIdx + item.duration; d++){
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
                        slot: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slots"][slotIdx],
                        duration: item.duration,
                        group: item.group,
                        level: item.level
                    });
                    assigned = true;
                    break;
                }
            }
        }
        // Fallback: If strict CSP couldn't assign without conflict, assign with best-effort & flag conflict
        if (!assigned) {
            // Find a slot and venue and flag conflict
            for (const day of __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["days"]){
                if (assigned) break;
                for(let slotIdx = 0; slotIdx < __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slots"].length; slotIdx++){
                    if (slotIdx === 6) continue; // Skip lunch break even in fallback
                    if (day === "Fri" && slotIdx >= 6) continue;
                    const venue = validVenues[0];
                    scheduledSessions.push({
                        code: item.code,
                        lecturer: item.lecturer,
                        venue: venue ? venue.name : "LT 12",
                        day,
                        slot: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slots"][slotIdx],
                        duration: item.duration,
                        conflict: "venue"
                    });
                    violations.push({
                        code: item.code,
                        lecturer: item.lecturer,
                        venue: venue ? venue.name : "LT 12",
                        day,
                        slot: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slots"][slotIdx],
                        conflictType: "venue",
                        description: `Could not satisfy all constraints for ${item.code} — fallback assignment made with potential clash.`
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
        score: 100 - violations.length * 15
    };
}
function validateLiveSessions(rawSessions, allAllocations, allVenues, activeConstraints) {
    const conflicts = [];
    const updatedSessions = rawSessions.map((s)=>({
            ...s
        }));
    for(let i = 0; i < updatedSessions.length; i++){
        const s = updatedSessions[i];
        const slotIdx = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slots"].indexOf(s.slot);
        const dur = s.duration ?? 1;
        let conflictType = undefined;
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
            const alloc = allAllocations.find((a)=>a.code === s.code);
            const v = allVenues.find((ven)=>ven.name === s.venue);
            if (alloc && v && !("isVirtual" in v && v.isVirtual) && alloc.size > v.capacity) {
                conflictType = "capacity";
                conflictTitle = "Venue Capacity Exceeded";
                conflictDesc = `${alloc.size} students enrolled in ${s.code} exceed ${s.venue} capacity of ${v.capacity} seats.`;
            }
        }
        // 4. Venue double-booking check
        if (!conflictType && !s.isVirtual && s.venue !== "Virtual / LMS") {
            for(let j = 0; j < updatedSessions.length; j++){
                if (i === j) continue;
                const other = updatedSessions[j];
                if (other.isVirtual || other.venue === "Virtual / LMS") continue;
                if (other.venue === s.venue && other.day === s.day) {
                    const otherStart = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slots"].indexOf(other.slot);
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
            for(let j = 0; j < updatedSessions.length; j++){
                if (i === j) continue;
                const other = updatedSessions[j];
                if (other.lecturer === s.lecturer && other.day === s.day) {
                    const otherStart = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slots"].indexOf(other.slot);
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
            for(let j = 0; j < updatedSessions.length; j++){
                if (i === j) continue;
                const other = updatedSessions[j];
                if (other.level === s.level && other.day === s.day) {
                    const groupClash = !s.group || s.group === "All" || !other.group || other.group === "All" || s.group === other.group;
                    if (groupClash) {
                        const otherStart = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["slots"].indexOf(other.slot);
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
                description: conflictDesc
            });
        } else {
            delete s.conflict;
        }
    }
    return {
        validatedSessions: updatedSessions,
        conflicts
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=lib_engine_ts_219_0ul._.js.map