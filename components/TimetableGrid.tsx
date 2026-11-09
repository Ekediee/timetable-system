"use client";

import React from "react";
import {
  GripVertical,
  Ban,
  Check,
  ArrowLeftRight,
  AlertTriangle,
  Pencil,
  User,
  Globe,
} from "lucide-react";
import {
  days,
  slots,
  defaultTimeLockConfig,
  type Session,
  type Constraint,
  type DynamicTimeLockConfig,
} from "../lib/data";

export function getEndSlot(slot: string, duration: number = 1): string {
  const idx = slots.indexOf(slot as any);
  if (idx !== -1 && idx + duration < slots.length) {
    return slots[idx + duration];
  }
  const [h, m] = slot.split(":").map(Number);
  const endH = h + duration;
  return `${String(endH).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}

// Dynamically check if a lecturer has day-level leave or restrictions
export function getLecturerDayRestriction(
  lecturer: string,
  day: (typeof days)[number],
  constraintsList: Constraint[],
): { isOff: boolean; label?: string } {
  if (lecturer === "all") return { isOff: false };
  const lecturerConstraints = constraintsList.filter(
    (c) => c.lecturer === lecturer,
  );
  for (const c of lecturerConstraints) {
    if (c.kind === "Study Leave") {
      if (
        c.detail.toLowerCase().includes("substituted externally") ||
        c.detail.toLowerCase().includes("substitute")
      ) {
        continue;
      }
      return { isOff: true, label: "On Study Leave" };
    }
    const lowerRange = c.range.toLowerCase();
    if (c.kind === "Day Off") {
      if (lowerRange.includes("wed") && day === "Wed") {
        return { isOff: true, label: "Day Off" };
      }
      if (lowerRange.includes("fri am") && day === "Fri") {
        return { isOff: true, label: "Clinic AM Off" };
      }
      if (lowerRange.includes(day.toLowerCase())) {
        return { isOff: true, label: "Day Off" };
      }
    }
    if (c.kind === "Adjunct") {
      if (
        (lowerRange.includes("tue, fri") || lowerRange.includes("tue & fri")) &&
        day !== "Tue" &&
        day !== "Fri"
      ) {
        return { isOff: true, label: "Adjunct Off" };
      }
      if (lowerRange.includes("wed") && day !== "Wed") {
        return { isOff: true, label: "Adjunct Off" };
      }
    }
  }
  return { isOff: false };
}

// Dynamically check if a lecturer is restricted in a specific slot
export function getLecturerSlotRestriction(
  lecturer: string,
  day: (typeof days)[number],
  slot: (typeof slots)[number],
  constraintsList: Constraint[],
): { isRestricted: boolean; reason?: string } {
  if (lecturer === "all") return { isRestricted: false };
  const lecturerConstraints = constraintsList.filter(
    (c) => c.lecturer === lecturer,
  );
  for (const c of lecturerConstraints) {
    const lowerRange = c.range.toLowerCase();
    if (c.kind === "Day Off") {
      if (lowerRange.includes("fri am") && day === "Fri") {
        const slotHour = parseInt(slot.split(":")[0], 10);
        if (slotHour < 12) {
          return { isRestricted: true, reason: "Clinic Duties" };
        }
      }
    }
    if (c.kind === "Time Lock") {
      if (
        lowerRange.includes("past 16:00") ||
        lowerRange.includes("after 4pm")
      ) {
        const slotHour = parseInt(slot.split(":")[0], 10);
        if (slotHour >= 16) {
          return { isRestricted: true, reason: "Commute Window" };
        }
      }
      if (
        lowerRange.includes("before 10:00") ||
        lowerRange.includes("no early")
      ) {
        const slotHour = parseInt(slot.split(":")[0], 10);
        if (slotHour < 10) {
          return { isRestricted: true, reason: "Morning Restriction" };
        }
      }
    }
  }
  return { isRestricted: false };
}

export interface TimetableGridProps {
  topScrollRef: React.RefObject<HTMLDivElement | null>;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
  handleTopScroll: () => void;
  handleMainScroll: () => void;
  handleContainerDragLeave: (e: React.DragEvent) => void;
  scrollWidth: number;
  keyboardPickedSession: { session: Session; globalIndex: number } | null;
  handleCancelKeyboardMove: () => void;
  perspective: "cohort" | "lecturer" | "course";
  selectedLecturer: string;
  localConstraints: Constraint[];
  timeLockConfig?: DynamicTimeLockConfig;
  highlightCell: { day: string; slot: string } | null;
  cell: (day: string, slot: string) => Session[];
  dragOverTarget: { day: string; slot: string } | null;
  draggedSession: { session: Session; globalIndex: number } | null;
  currentDropFeasibility: any;
  viewDensity: "compact" | "normal";
  sessionIndexMap: Map<string, number>;
  handleDragEnter: (e: React.DragEvent, day: any, slot: any) => void;
  handleDragOver: (e: React.DragEvent, day: any, slot: any) => void;
  handleDrop: (e: React.DragEvent, day: any, slot: any) => void;
  handleDragStart: (
    e: React.DragEvent,
    session: Session,
    globalIdx: number,
  ) => void;
  handleDragEnd: (e: React.DragEvent) => void;
  handleGridCellKeyDown: (e: React.KeyboardEvent, day: any, slot: any) => void;
  handleSessionItemKeyDown: (
    e: React.KeyboardEvent,
    item: Session,
    globalIdx: number,
    day: any,
    slot: any,
  ) => void;
  setCellDetail: (s: Session | null) => void;
  handleOpenEdit: (idx: number) => void;
  onCellFocus?: (
    day: (typeof days)[number],
    slot: (typeof slots)[number],
  ) => void;
}

export default function TimetableGrid({
  topScrollRef,
  tableContainerRef,
  handleTopScroll,
  handleMainScroll,
  handleContainerDragLeave,
  scrollWidth,
  keyboardPickedSession,
  handleCancelKeyboardMove,
  perspective,
  selectedLecturer,
  localConstraints,
  timeLockConfig,
  highlightCell,
  cell,
  dragOverTarget,
  draggedSession,
  currentDropFeasibility,
  viewDensity,
  sessionIndexMap,
  handleDragEnter,
  handleDragOver,
  handleDrop,
  handleDragStart,
  handleDragEnd,
  handleGridCellKeyDown,
  handleSessionItemKeyDown,
  setCellDetail,
  handleOpenEdit,
  onCellFocus,
}: TimetableGridProps) {
  return (
    <div>
      {/* Top synchronized horizontal scrollbar for easy navigation */}
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        className="overflow-x-auto border-b border-line/40 bg-panel/30 px-3 py-1 text-[11px] text-muted select-none"
        style={{ scrollbarWidth: "thin" }}
      >
        <div
          className="flex items-center justify-between text-[10.5px] font-medium text-muted/80 pb-0.5"
          style={{ minWidth: 700 }}
        >
          <span className="flex items-center gap-1.5 text-brand">
            <GripVertical size={12} className="shrink-0" />
            <span className="font-semibold">
              Drag & drop or use keyboard (Space/Enter to select, Arrows to
              move, Enter to drop/swap)
            </span>
          </span>
          <span className="text-[10px] text-muted/60">
            Showing all 5 days (Mon–Fri)
          </span>
        </div>
        <div style={{ width: scrollWidth || "100%", height: 1 }} />
      </div>

      {keyboardPickedSession && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-3 border-b border-brand/30 bg-brand-soft/80 px-4 py-2 text-[12px] text-brand-ink"
        >
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-brand animate-ping" />
            <span className="font-bold">
              Picked up {keyboardPickedSession.session.code}:
            </span>
            <span>
              Use Arrow keys to choose a target slot, press Enter or Space to
              place or swap, Esc to cancel.
            </span>
          </div>
          <button
            onClick={handleCancelKeyboardMove}
            className="rounded px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 underline cursor-pointer"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      <div
        ref={tableContainerRef}
        onScroll={handleMainScroll}
        onDragLeave={handleContainerDragLeave}
        className="overflow-x-auto p-2 sm:p-3"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="w-full min-w-[720px]">
          <div className="grid grid-cols-[72px_repeat(5,1fr)] gap-2 sm:gap-2.5">
            <div className="sticky -left-3 z-20 flex items-center justify-center bg-card pb-2 text-[10.5px] font-bold uppercase tracking-wider text-muted/60 border-r border-line/60">
              Time
            </div>
            {days.map((d) => {
              const dayRestriction =
                perspective === "lecturer"
                  ? getLecturerDayRestriction(
                      selectedLecturer,
                      d,
                      localConstraints,
                    )
                  : { isOff: false };

              return (
                <div
                  key={d}
                  className="pb-2 text-center text-[11.5px] font-bold uppercase tracking-wider text-ink border-b border-line/60"
                >
                  {d}
                  {dayRestriction.isOff && (
                    <span className="block text-[9px] text-warn font-semibold">
                      ({dayRestriction.label})
                    </span>
                  )}
                </div>
              );
            })}
            {slots.map((s) => (
              <div key={s} className="contents">
                <div className="sticky -left-3 z-10 flex items-start justify-center bg-card pt-2 text-[11px] font-semibold text-muted border-r border-line/60">
                  {s}
                </div>
                {days.map((d) => {
                  const items = cell(d, s);
                  const isHighlighted =
                    highlightCell?.day === d && highlightCell?.slot === s;

                  // Dynamic Time Lock evaluation
                  const lunchCfg = timeLockConfig?.lunchBreak;
                  const isBreak =
                    !!lunchCfg?.enabled && s === (lunchCfg.slot || "13:00");

                  const earlyClosings = timeLockConfig?.earlyClosings || [];
                  const activeClosing = earlyClosings.find(
                    (ec) =>
                      ec.enabled &&
                      ec.day === d &&
                      slots.indexOf(s as any) >=
                        slots.indexOf((ec.cutoffSlot || "17:00") as any),
                  );
                  const isEarlyClosingOff = !!activeClosing;

                  const opWin =
                    timeLockConfig?.operatingWindow ||
                    defaultTimeLockConfig.operatingWindow;
                  const startWinIdx = slots.indexOf(
                    (opWin.startSlot || "07:00") as any,
                  );
                  const endWinIdx = slots.indexOf(
                    (opWin.endSlot || "17:00") as any,
                  );
                  const currentIdx = slots.indexOf(s as any);
                  const isOutsideOperatingHours =
                    (startWinIdx !== -1 && currentIdx < startWinIdx) ||
                    (endWinIdx !== -1 && currentIdx > endWinIdx);

                  // Dynamic slot restriction for selected lecturer
                  const slotRestriction =
                    perspective === "lecturer"
                      ? getLecturerSlotRestriction(
                          selectedLecturer,
                          d,
                          s,
                          localConstraints,
                        )
                      : { isRestricted: false };

                  const isHoveredBreak =
                    dragOverTarget?.day === d && dragOverTarget?.slot === s;

                  if (isOutsideOperatingHours) {
                    return (
                      <div
                        key={d + s}
                        id={`grid-cell-${d}-${s}`}
                        tabIndex={0}
                        role="gridcell"
                        aria-label={`${d} ${s}, outside operating hours`}
                        onKeyDown={(e) => handleGridCellKeyDown(e, d, s)}
                        onFocus={() => {
                          onCellFocus?.(d, s);
                        }}
                        onDragEnter={(e) => handleDragEnter(e, d, s)}
                        onDragOver={(e) => handleDragOver(e, d, s)}
                        onDrop={(e) => handleDrop(e, d, s)}
                        className={`flex min-h-[48px] items-center justify-center rounded-lg border p-1 text-[9.5px] font-medium text-center transition focus:outline-none focus:ring-2 focus:ring-brand ${
                          isHoveredBreak
                            ? "border-red-400 bg-red-500/15 text-red-700 ring-2 ring-red-400/40 cursor-not-allowed"
                            : "border-line bg-panel/30 text-muted/50"
                        }`}
                      >
                        {isHoveredBreak ? (
                          <span className="flex items-center gap-1 text-[9.5px] font-bold text-red-700">
                            <Ban size={11} /> Outside Window
                          </span>
                        ) : (
                          "Outside Hours"
                        )}
                      </div>
                    );
                  }

                  if (isBreak) {
                    return (
                      <div
                        key={d + s}
                        id={`grid-cell-${d}-${s}`}
                        tabIndex={0}
                        role="gridcell"
                        aria-label={`${d} ${s}, lunch break`}
                        onKeyDown={(e) => handleGridCellKeyDown(e, d, s)}
                        onFocus={() => {
                          onCellFocus?.(d, s);
                        }}
                        onDragEnter={(e) => handleDragEnter(e, d, s)}
                        onDragOver={(e) => handleDragOver(e, d, s)}
                        onDrop={(e) => handleDrop(e, d, s)}
                        className={`flex min-h-[48px] items-center justify-center rounded-lg border border-dashed p-1 text-[10px] font-semibold text-center transition focus:outline-none focus:ring-2 focus:ring-brand ${
                          isHoveredBreak
                            ? "border-red-400 bg-red-500/15 text-red-700 ring-2 ring-red-400/40 cursor-not-allowed"
                            : "border-line bg-panel/60 text-muted"
                        }`}
                      >
                        {isHoveredBreak ? (
                          <span className="flex items-center gap-1 text-[9.5px] font-bold text-red-700">
                            <Ban size={11} /> Lunch Break
                          </span>
                        ) : (
                          "Lunch Break"
                        )}
                      </div>
                    );
                  }

                  if (isEarlyClosingOff) {
                    return (
                      <div
                        key={d + s}
                        id={`grid-cell-${d}-${s}`}
                        tabIndex={0}
                        role="gridcell"
                        aria-label={`${d} ${s}, ${activeClosing.label || "Closed"}`}
                        onKeyDown={(e) => handleGridCellKeyDown(e, d, s)}
                        onFocus={() => {
                          onCellFocus?.(d, s);
                        }}
                        onDragEnter={(e) => handleDragEnter(e, d, s)}
                        onDragOver={(e) => handleDragOver(e, d, s)}
                        onDrop={(e) => handleDrop(e, d, s)}
                        className={`flex min-h-[48px] items-center justify-center rounded-lg border p-1 text-[9.5px] font-medium text-center transition focus:outline-none focus:ring-2 focus:ring-brand ${
                          isHoveredBreak
                            ? "border-red-400 bg-red-500/15 text-red-700 ring-2 ring-red-400/40 cursor-not-allowed"
                            : "border-line bg-panel/30 text-muted/60"
                        }`}
                      >
                        {isHoveredBreak ? (
                          <span className="flex items-center gap-1 text-[9.5px] font-bold text-red-700">
                            <Ban size={11} /> {activeClosing.label || "Closed"}
                          </span>
                        ) : (
                          activeClosing.label || "Closed"
                        )}
                      </div>
                    );
                  }

                  const isTargetCell =
                    dragOverTarget?.day === d && dragOverTarget?.slot === s;
                  const isSecondHourOfTarget =
                    draggedSession &&
                    (draggedSession.session.duration ?? 1) === 2 &&
                    dragOverTarget?.day === d &&
                    getEndSlot(dragOverTarget.slot, 1) === s;
                  const isDropPreview = isTargetCell || isSecondHourOfTarget;

                  const dropFeasibility = isDropPreview
                    ? currentDropFeasibility
                    : null;

                  const isHomeOfDragged =
                    draggedSession &&
                    draggedSession.session.day === d &&
                    (draggedSession.session.slot === s ||
                      ((draggedSession.session.duration ?? 1) === 2 &&
                        getEndSlot(draggedSession.session.slot, 1) === s));

                  const cellBorderClass =
                    isDropPreview && dropFeasibility
                      ? dropFeasibility.status === "valid"
                        ? "border-2 border-emerald-500 bg-emerald-500/15 ring-3 ring-emerald-500/25 shadow-md"
                        : dropFeasibility.status === "swap"
                          ? "border-2 border-indigo-500 bg-indigo-500/15 ring-3 ring-indigo-500/25 shadow-md"
                          : dropFeasibility.status === "warning"
                            ? "border-2 border-amber-500 bg-amber-500/15 ring-3 ring-amber-500/25 shadow-md"
                            : "border-2 border-red-500 bg-red-500/15 ring-3 ring-red-500/25 cursor-not-allowed shadow-md"
                      : isHighlighted
                        ? "border-brand bg-brand-soft/70 shadow-sm ring-3 ring-brand/40 animate-pulse"
                        : isHomeOfDragged
                          ? "border-2 border-dashed border-brand/50 bg-brand-soft/20"
                          : draggedSession
                            ? "border-dashed border-line/80 bg-panel/30 hover:border-brand/40 hover:bg-card/70"
                            : slotRestriction.isRestricted
                              ? "border-warn/30 bg-warn-soft/20"
                              : "border-line/70 bg-panel/30 hover:border-line";

                  return (
                    <div
                      key={d + s}
                      id={`grid-cell-${d}-${s}`}
                      tabIndex={0}
                      role="gridcell"
                      aria-label={`${d} ${s}${items.length > 0 ? `, ${items.map((i) => i.code).join(", ")}` : ", empty slot"}`}
                      onKeyDown={(e) => handleGridCellKeyDown(e, d, s)}
                      onFocus={() => {
                        onCellFocus?.(d, s);
                      }}
                      onDragEnter={(e) => handleDragEnter(e, d, s)}
                      onDragOver={(e) => handleDragOver(e, d, s)}
                      onDrop={(e) => handleDrop(e, d, s)}
                      className={`rounded-lg border p-1 focus:outline-none focus:ring-2 focus:ring-brand ${draggedSession ? "transition-none" : "transition-colors duration-75"} ${
                        viewDensity === "compact"
                          ? "min-h-[58px]"
                          : "min-h-[72px]"
                      } ${cellBorderClass}`}
                    >
                      {isDropPreview && dropFeasibility && (
                        <div
                          className={`mb-1.5 flex items-center justify-between gap-1 rounded-md px-1.5 py-1 text-left border shadow-2xs ${
                            dropFeasibility.status === "valid"
                              ? "border-emerald-400 bg-emerald-50/95 text-emerald-900"
                              : dropFeasibility.status === "swap"
                                ? "border-indigo-400 bg-indigo-50/95 text-indigo-900"
                                : dropFeasibility.status === "warning"
                                  ? "border-amber-400 bg-amber-50/95 text-amber-900"
                                  : "border-red-400 bg-red-50/95 text-red-900"
                          }`}
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            {dropFeasibility.status === "valid" && (
                              <Check
                                size={11}
                                className="text-emerald-600 shrink-0"
                              />
                            )}
                            {dropFeasibility.status === "swap" && (
                              <ArrowLeftRight
                                size={11}
                                className="text-indigo-600 shrink-0"
                              />
                            )}
                            {dropFeasibility.status === "warning" && (
                              <AlertTriangle
                                size={11}
                                className="text-amber-600 shrink-0"
                              />
                            )}
                            {dropFeasibility.status === "blocked" && (
                              <Ban
                                size={11}
                                className="text-red-600 shrink-0"
                              />
                            )}
                            <span className="text-[9.5px] font-bold truncate">
                              {isSecondHourOfTarget
                                ? "Hour 2 block"
                                : dropFeasibility.status === "swap"
                                  ? `Swap ⇄ ${dropFeasibility.swapWith?.code}`
                                  : dropFeasibility.status === "valid"
                                    ? `Drop ${draggedSession?.session.code}`
                                    : dropFeasibility.reason}
                            </span>
                          </div>
                          <span className="text-[8px] font-bold opacity-70 shrink-0">
                            {isSecondHourOfTarget
                              ? "2nd hr"
                              : (draggedSession?.session.duration ?? 1) > 1
                                ? "2h"
                                : "1h"}
                          </span>
                        </div>
                      )}
                      {slotRestriction.isRestricted &&
                        items.length === 0 &&
                        !isDropPreview && (
                          <div className="flex h-full min-h-[48px] flex-col items-center justify-center rounded border border-dashed border-warn/30 bg-card/60 p-1 text-center">
                            <span className="text-[9.5px] font-bold text-warn">
                              Unavailable
                            </span>
                            <span className="text-[8px] text-muted truncate max-w-[85px] mt-0.5">
                              {slotRestriction.reason}
                            </span>
                          </div>
                        )}
                      {items.map((it, k) => {
                        // Fast O(1) global index in localSessions
                        const globalIdx =
                          sessionIndexMap.get(
                            `${it.code}|${it.day}|${it.slot}|${it.venue}`,
                          ) ?? -1;

                        const isStartSlot = s === it.slot;
                        const dur = it.duration ?? 1;

                        const isBeingDragged =
                          draggedSession?.globalIndex === globalIdx;

                        // If this cell represents a continuation hour (e.g. Hour 2 of a 2-hour class)
                        if (!isStartSlot) {
                          return (
                            <div
                              key={k}
                              tabIndex={0}
                              role="button"
                              aria-label={`${it.code} Hour 2, ${it.venue}, ${it.lecturer}`}
                              onKeyDown={(e) =>
                                handleSessionItemKeyDown(e, it, globalIdx, d, s)
                              }
                              draggable={true}
                              onDragStart={(e) =>
                                handleDragStart(e, it, globalIdx)
                              }
                              onDragEnd={handleDragEnd}
                              onClick={() => setCellDetail(it)}
                              className={`group relative mb-1 w-full rounded-md border border-dashed px-1.5 py-1 text-left select-none cursor-grab active:cursor-grabbing hover:shadow-xs transition-colors duration-75 focus:outline-none focus:ring-2 focus:ring-brand ${
                                isBeingDragged
                                  ? "opacity-30 border-brand ring-2 ring-brand/40"
                                  : it.conflict
                                    ? "border-bad/40 bg-bad-soft/50"
                                    : "border-brand/30 bg-card/80 hover:border-brand/50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1 min-w-0">
                                  <GripVertical
                                    size={10}
                                    className="text-muted/40 group-hover:text-muted shrink-0"
                                  />
                                  <p className="text-[10px] font-bold text-subink truncate">
                                    {it.code}
                                  </p>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <span className="rounded bg-brand/10 px-1 py-0.2 text-[8px] font-semibold text-brand-ink">
                                    Hr 2
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (globalIdx !== -1)
                                        handleOpenEdit(globalIdx);
                                    }}
                                    title="Line edit venue & time"
                                    className="rounded p-0.5 text-muted hover:bg-card hover:text-brand transition cursor-pointer"
                                  >
                                    <Pencil size={9} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-[8.5px] text-muted truncate mt-0.5">
                                {it.venue}
                              </p>
                              {(perspective === "cohort" ||
                                (perspective === "lecturer" &&
                                  selectedLecturer === "all")) && (
                                <p className="truncate text-[8.5px] font-medium text-brand truncate">
                                  {it.lecturer}
                                </p>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={k}
                            tabIndex={0}
                            role="button"
                            aria-label={`${it.code}, ${dur} hour session, ${it.venue}, ${it.lecturer}`}
                            onKeyDown={(e) =>
                              handleSessionItemKeyDown(e, it, globalIdx, d, s)
                            }
                            draggable={true}
                            onDragStart={(e) =>
                              handleDragStart(e, it, globalIdx)
                            }
                            onDragEnd={handleDragEnd}
                            className={`group relative mb-1 w-full rounded-md border px-1.5 py-1 text-left last:mb-0 select-none cursor-grab active:cursor-grabbing hover:shadow-xs transition-colors duration-75 focus:outline-none focus:ring-2 focus:ring-brand ${
                              isBeingDragged
                                ? "opacity-30 border-brand ring-2 ring-brand/40"
                                : it.conflict
                                  ? "border-bad/40 bg-bad-soft"
                                  : "border-brand/25 bg-brand-soft/70 hover:bg-brand-soft hover:border-brand/50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <GripVertical
                                  size={10}
                                  className="text-muted/40 group-hover:text-muted shrink-0"
                                />
                                <p
                                  className={`text-[10.5px] font-bold truncate leading-tight ${
                                    it.conflict ? "text-bad" : "text-brand-ink"
                                  }`}
                                >
                                  {it.code}
                                </p>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {it.isVirtual && (
                                  <span className="rounded bg-violet-soft px-1 py-0.2 text-[8px] font-bold text-violet">
                                    Online
                                  </span>
                                )}
                                {it.group && it.group !== "All" && (
                                  <span className="rounded bg-brand/15 px-1 py-0.2 text-[8px] font-bold text-brand-ink">
                                    {it.group.replace("Group ", "Gr.")}
                                  </span>
                                )}
                                {dur > 1 && (
                                  <span className="rounded bg-brand/15 px-1 py-0.2 text-[8px] font-bold text-brand-ink">
                                    {dur}h
                                  </span>
                                )}
                                {/* Line Edit trigger button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (globalIdx !== -1)
                                      handleOpenEdit(globalIdx);
                                  }}
                                  title="Line edit venue & time"
                                  className="ml-0.5 rounded p-0.5 text-muted hover:bg-card hover:text-brand transition cursor-pointer"
                                >
                                  <Pencil size={9} />
                                </button>
                              </div>
                            </div>

                            <div
                              onClick={() => setCellDetail(it)}
                              className="cursor-pointer mt-0.5"
                            >
                              <p className="truncate text-[9px] text-subink font-medium leading-tight">
                                {it.venue}
                              </p>
                              {/* In Cohort perspective OR when viewing All Lecturers: display lecturer name with badge */}
                              {(perspective === "cohort" ||
                                (perspective === "lecturer" &&
                                  selectedLecturer === "all")) && (
                                <div className="flex items-center gap-0.5 truncate text-[8.5px] font-semibold text-brand leading-tight mt-0.5">
                                  <User size={8.5} className="shrink-0" />
                                  <span className="truncate">
                                    {it.lecturer}
                                  </span>
                                </div>
                              )}
                              {/* In specific Lecturer perspective: display student group and level */}
                              {perspective === "lecturer" &&
                                selectedLecturer !== "all" && (
                                  <p className="truncate text-[8.5px] text-subink font-medium leading-tight mt-0.5">
                                    {it.level ?? "200 Level"} ·{" "}
                                    {it.group ?? "Unified"}
                                  </p>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
