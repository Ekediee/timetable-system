"use client";

import { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  List,
  ArrowRight,
  ShieldCheck,
  X,
  Send,
  Loader2,
  Building2,
  BookOpen,
  Users,
  SlidersHorizontal,
  Clock,
  ArrowLeft,
  Eye,
  Calendar,
  Check,
  Globe,
} from "lucide-react";
import { Card, CardHead, Pill, Button } from "../components/ui";
import {
  days,
  slots,
  allocations,
  venues,
  type Session,
  type Status,
  type TimelineStep,
} from "../lib/data";
import type { View } from "../components/Sidebar";
import { useRouter } from "next/navigation";
import { useApp } from "../lib/AppContext";

const conflictLabel: Record<string, string> = {
  venue: "Venue double-booking",
  capacity: "Capacity overage",
  lecturer: "Lecturer double-booking",
  availability: "Lecturer unavailable",
};

export default function Generate(props?: {
  localSessions?: Session[];
  setLocalSessions?: (s: Session[]) => void;
  constraintsComplete?: boolean;
  status?: Status;
  setStatus?: (s: Status) => void;
  setLocalTimeline?: (t: TimelineStep[]) => void;
  setView?: (v: View) => void;
}) {
  const router = useRouter();
  const context = useApp();

  const localSessions = props?.localSessions ?? context.localSessions;
  const setLocalSessions = props?.setLocalSessions ?? context.setLocalSessions;
  const constraintsComplete =
    props?.constraintsComplete ?? context.constraintsComplete;
  const status = props?.status ?? context.status;
  const setStatus = props?.setStatus ?? context.setStatus;
  const setLocalTimeline = props?.setLocalTimeline ?? context.setLocalTimeline;
  const localConstraints = context.localConstraints;

  // Screen flow: "snapshot" (Generate Timetable screen) -> "generated" (Generated Timetable screen)
  const [screenMode, setScreenMode] = useState<"snapshot" | "generated">(
    status === "Submitted to HOD" ? "generated" : "snapshot"
  );

  const [mode, setMode] = useState<"grid" | "list">("grid");
  const [submitModal, setSubmitModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [highlightCell, setHighlightCell] = useState<{
    day: string;
    slot: string;
  } | null>(null);
  const [cellDetail, setCellDetail] = useState<Session | null>(null);

  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const conflicts = localSessions.filter((s) => s.conflict);
  const cleared = conflicts.length === 0;
  const isSubmitted = status === "Submitted to HOD";

  const totalCapacity = venues.reduce((sum, v) => sum + v.capacity, 0);
  const totalUnits = allocations.reduce((sum, a) => sum + a.units, 0);

  const filteredSessions = localSessions.filter((s) => {
    if (selectedLevel !== "all" && s.level && s.level !== selectedLevel)
      return false;
    if (
      selectedGroup !== "all" &&
      s.group &&
      s.group !== "All" &&
      s.group !== selectedGroup
    )
      return false;
    return true;
  });

  const cell = (d: string, s: string) => {
    const slotIdx = slots.indexOf(s as any);
    return filteredSessions.filter((x) => {
      if (x.day !== d) return false;
      const startIdx = slots.indexOf(x.slot as any);
      const dur = x.duration ?? 1;
      return slotIdx >= startIdx && slotIdx < startIdx + dur;
    });
  };

  function handleProceedToGenerate() {
    setIsRegenerating(true);
    setHighlightCell(null);

    setTimeout(() => {
      import("../lib/engine").then(({ generateTimetable }) => {
        const result = generateTimetable(
          allocations,
          venues,
          context.localConstraints,
        );
        setLocalSessions(result.sessions);
        setIsRegenerating(false);
        setScreenMode("generated");
      });
    }, 1200);
  }

  function handleRegenerate() {
    setIsRegenerating(true);
    setHighlightCell(null);

    setTimeout(() => {
      import("../lib/engine").then(({ generateTimetable }) => {
        const result = generateTimetable(
          allocations,
          venues,
          context.localConstraints,
        );
        setLocalSessions(result.sessions);
        setIsRegenerating(false);
      });
    }, 1000);
  }

  function jumpToCell(day: string, slot: string) {
    setMode("grid");
    setHighlightCell({ day, slot });
    setTimeout(() => setHighlightCell(null), 2800);
  }

  function handleSubmit() {
    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    setStatus("Submitted to HOD");
    setLocalTimeline([
      {
        actor: "Yakubu Onome",
        role: "Dept T.O",
        action: "Draft generated & submitted",
        at: "Mar 04, 09:12",
        state: "done",
      },
      {
        actor: "Dr. A. Olumide",
        role: "HOD",
        action: "Rejected with comment",
        at: "Mar 04, 15:40",
        state: "rejected",
        comment:
          "BU-GST 205 exceeds LT 12 capacity — relocate to CST Hall A. Also resolve the Thu 12:00 venue clash in CST Hall A before resubmitting.",
      },
      {
        actor: "Yakubu Onome",
        role: "Dept T.O",
        action: "Revised & resubmitted",
        at: now,
        state: "done",
      },
      {
        actor: "Dr. A. Olumide",
        role: "HOD",
        action: "Reviewing revised draft",
        at: "Pending",
        state: "current",
      },
      {
        actor: "Prof. E. Bassey",
        role: "Dean",
        action: "School-level approval",
        at: "Pending",
        state: "pending",
      },
      {
        actor: "M. Danladi",
        role: "Acad Pl. T.O",
        action: "Final approval & publish",
        at: "Pending",
        state: "pending",
      },
    ]);
    setSubmitModal(false);
    if (props?.setView) {
      props.setView("history");
    } else {
      router.push("/history");
    }
  }

  function navigateToView(viewName: View, path: string) {
    if (props?.setView) {
      props.setView(viewName);
    } else {
      router.push(path);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCREEN 1: PRE-GENERATION SNAPSHOT SCREEN
  // ───────────────────────────────────────────────────────────────────────────
  if (screenMode === "snapshot") {
    return (
      <div className="bp-fade flex flex-col gap-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[20px] font-bold tracking-tight text-ink">
                Generate Timetable
              </h2>
              <Pill tone="brand">Input Snapshot Review</Pill>
            </div>
            <p className="mt-1 text-[13.5px] text-muted">
              Verify venue capacity, course allocations, and active constraints before running the generation engine.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {localSessions.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setScreenMode("generated")}
              >
                <Eye size={15} /> View Current Schedule
              </Button>
            )}
            <Button
              onClick={handleProceedToGenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Proceed to Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Generating Overlay Card */}
        {isRegenerating && (
          <Card className="border-brand/30 bg-brand-soft/30 p-6">
            <div className="flex items-start gap-4">
              <Loader2 size={24} className="mt-0.5 animate-spin text-brand" />
              <div className="space-y-1.5">
                <p className="text-[15px] font-bold text-brand-ink">
                  Constraint Satisfaction Engine Running…
                </p>
                <p className="text-[13px] text-muted leading-relaxed">
                  Evaluating {venues.length} venues, {allocations.length} course allocations, and {localConstraints.length} active constraints.
                  Splitting 3-unit courses (2h + 1h), resolving multi-group non-overlap, and eliminating room clashes.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 3 Snapshots Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Snapshot 1: Venue Availability */}
          <Card className="flex flex-col">
            <CardHead
              icon={<Building2 size={17} />}
              title="Venue Availability"
              sub={`${venues.length} rooms mapped · ${totalCapacity} total capacity`}
              action={
                <Pill tone="brand">{venues.length} Venues</Pill>
              }
            />
            <div className="flex-1 space-y-3 px-5 pb-5">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-panel/70 p-3 text-center">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted">Total Seats</p>
                  <p className="text-[17px] font-bold text-ink">{totalCapacity}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted">Time Grid</p>
                  <p className="text-[13px] font-semibold text-subink mt-0.5">7am – 6pm</p>
                </div>
              </div>

              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                Mapped Department Venues
              </p>
              <div className="space-y-2">
                {venues.map((v) => (
                  <div
                    key={v.name}
                    className="flex items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2.5 text-[12.5px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink truncate">{v.name}</p>
                      <p className="text-[11px] text-muted truncate">{v.block}</p>
                    </div>
                    <Pill tone="neutral">{v.capacity} seats</Pill>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-line bg-panel/50 p-2.5 text-[11.5px] text-muted">
                <span className="font-semibold text-subink">Locked Windows:</span> 1–2pm Lunch Break, Wed 5pm cutoff, Fri 1pm cutoff.
              </div>
            </div>

            <div className="border-t border-line px-5 py-3.5">
              <button
                onClick={() => navigateToView("venues", "/venues")}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
              >
                Inspect Venue Availability Timetable →
              </button>
            </div>
          </Card>

          {/* Snapshot 2: Course Allocations */}
          <Card className="flex flex-col">
            <CardHead
              icon={<BookOpen size={17} />}
              title="Course Allocations"
              sub={`${allocations.length} courses to schedule (${totalUnits} units)`}
              action={
                <Pill tone="neutral">{totalUnits} Units</Pill>
              }
            />
            <div className="flex-1 space-y-3 px-5 pb-5">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-panel/70 p-3 text-center">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted">Levels</p>
                  <p className="text-[14px] font-bold text-ink">100L – 400L</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted">Sub-groups</p>
                  <p className="text-[14px] font-bold text-subink">A, B, C, D, All</p>
                </div>
              </div>

              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                Allocation Samples ({allocations.length} Total)
              </p>
              <div className="space-y-2">
                {allocations.slice(0, 5).map((a) => (
                  <div
                    key={a.code}
                    className="flex items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2 text-[12.5px]"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{a.code}</span>
                        <span className="text-[11px] text-muted truncate">
                          {a.lecturer}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-muted">{a.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-ink">
                        {a.group ?? "Group A"}
                      </span>
                      <Pill tone="neutral">{a.units}u</Pill>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11.5px] text-muted text-center italic">
                +{allocations.length - 5} more multi-level allocations
              </p>
            </div>

            <div className="border-t border-line px-5 py-3.5">
              <button
                onClick={() => navigateToView("allocations", "/allocations")}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
              >
                Review Full Allocations List →
              </button>
            </div>
          </Card>

          {/* Snapshot 3: Active Constraints */}
          <Card className="flex flex-col">
            <CardHead
              icon={<SlidersHorizontal size={17} />}
              title="Active Constraints"
              sub={`${localConstraints.length} lecturer rules + institutional policies`}
              action={
                <Pill tone={constraintsComplete ? "good" : "warn"}>
                  {constraintsComplete ? "Verified" : "Active"}
                </Pill>
              }
            />
            <div className="flex-1 space-y-3 px-5 pb-5">
              <div className="rounded-xl border border-line bg-panel/70 p-3 text-[12px] space-y-1.5">
                <p className="font-semibold text-ink">Institutional Policies Enforced:</p>
                <div className="space-y-1 text-muted text-[11.5px]">
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-good shrink-0" />
                    <span>Daily Break: 1:00 PM – 2:00 PM locked</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-good shrink-0" />
                    <span>Wed 5:00 PM & Fri 1:00 PM early cutoffs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-good shrink-0" />
                    <span>3-unit split: 2hr + 1hr on distinct days</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-good shrink-0" />
                    <span>Group non-overlap & cross-level venue locks</span>
                  </div>
                </div>
              </div>

              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                Active Lecturer Rules ({localConstraints.length})
              </p>
              <div className="space-y-2">
                {localConstraints.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2 text-[12.5px]"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-semibold text-ink truncate">{c.lecturer}</p>
                      <p className="text-[11px] text-muted truncate">{c.detail}</p>
                    </div>
                    <Pill tone="warn">{c.kind}</Pill>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-line px-5 py-3.5">
              <button
                onClick={() => navigateToView("constraints", "/constraints")}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
              >
                Manage Department Constraints →
              </button>
            </div>
          </Card>
        </div>

        {/* Bottom Readiness & Action Banner */}
        <Card className="border-brand/30 bg-gradient-to-r from-brand-soft/40 via-card to-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-sm shrink-0">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-ink">
                  Ready to Run Constraint Satisfaction Engine
                </h3>
                <p className="mt-0.5 text-[13px] text-muted">
                  All {venues.length} venues, {allocations.length} course allocations across 100L–400L, and {localConstraints.length} active constraints will be synthesized into a conflict-free master schedule.
                </p>
              </div>
            </div>
            <Button
              className="px-5 py-3 text-[14px]"
              onClick={handleProceedToGenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Solving Constraints…
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Proceed to Generate Timetable <ArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCREEN 2: POST-GENERATION SCHEDULE SCREEN
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="bp-fade flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Pill tone={cleared ? "good" : "bad"}>
            {cleared ? (
              <>
                <CheckCircle2 size={13} /> No conflicts
              </>
            ) : (
              <>
                <AlertTriangle size={13} /> {conflicts.length} conflicts
              </>
            )}
          </Pill>
          <span className="text-[13px] text-muted">
            {isSubmitted
              ? "Submitted — awaiting HOD decision"
              : `Draft · ${localSessions.length} sessions scheduled`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Level and Group Filter Selectors */}
          <div className="flex items-center gap-1.5 border-r border-line pr-2">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="h-8 rounded-lg border border-line bg-card px-2.5 text-[12px] font-semibold text-ink outline-none focus:border-brand"
            >
              <option value="all">All Levels</option>
              <option value="100 Level">100 Level</option>
              <option value="200 Level">200 Level</option>
              <option value="300 Level">300 Level</option>
              <option value="400 Level">400 Level</option>
            </select>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="h-8 rounded-lg border border-line bg-card px-2.5 text-[12px] font-semibold text-ink outline-none focus:border-brand"
            >
              <option value="all">All Sub-groups</option>
              <option value="Group A">Group A</option>
              <option value="Group B">Group B</option>
              <option value="Group C">Group C</option>
              <option value="Group D">Group D</option>
            </select>
          </div>

          {/* Calendar vs List Mode */}
          <div className="flex rounded-xl border border-line bg-card p-1">
            {(["grid", "list"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold capitalize transition ${
                  mode === m ? "bg-brand-soft text-brand-ink" : "text-muted"
                }`}
              >
                {m === "grid" ? <LayoutGrid size={14} /> : <List size={14} />}
                {m === "grid" ? "Calendar" : "List"}
              </button>
            ))}
          </div>

          {/* Switch back to pre-generation snapshot */}
          <Button
            variant="outline"
            onClick={() => setScreenMode("snapshot")}
            title="Review input snapshots and setup"
          >
            <SlidersHorizontal size={14} /> Input Snapshots
          </Button>

          {!isSubmitted && (
            <>
              <Button
                variant="outline"
                disabled={isRegenerating}
                onClick={handleRegenerate}
              >
                {isRegenerating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Regenerating…
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Regenerate
                  </>
                )}
              </Button>
              <Button
                disabled={!cleared || isRegenerating}
                onClick={() => setSubmitModal(true)}
              >
                Submit to HOD <ArrowRight size={15} />
              </Button>
            </>
          )}
          {isSubmitted && (
            <Pill tone="good">
              <Send size={12} /> Submitted to HOD
            </Pill>
          )}
        </div>
      </div>

      {/* Conflict banner */}
      {!cleared && !isSubmitted && (
        <Card className="border-bad/30 bg-bad-soft/40">
          <div className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={17} className="text-bad" />
              <p className="text-[14px] font-semibold text-ink">
                Resolve {conflicts.length} conflict
                {conflicts.length > 1 ? "s" : ""} before submission · use
                Regenerate to auto-fix
              </p>
            </div>
            <div className="space-y-2">
              {conflicts.map((c, i) => {
                const alloc = allocations.find((a) => a.code === c.code);
                const cap =
                  venues.find((v) => v.name === c.venue)?.capacity ?? 0;
                return (
                  <div
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Pill tone="bad">Hard block</Pill>
                      <span className="text-[13.5px] font-semibold text-ink">
                        {c.code}
                      </span>
                      <span className="text-[13px] text-muted">
                        {conflictLabel[c.conflict!]} ·{" "}
                        {c.conflict === "capacity"
                          ? `${alloc?.size} students in ${c.venue} (cap ${cap})`
                          : `${c.venue}, ${c.day} ${c.slot}`}
                      </span>
                    </div>
                    <button
                      onClick={() => jumpToCell(c.day, c.slot)}
                      className="text-[12.5px] font-semibold text-brand hover:underline"
                    >
                      Jump to cell →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Regenerating overlay */}
      {isRegenerating && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand-soft/40 px-5 py-4">
          <Loader2 size={18} className="animate-spin text-brand" />
          <span className="text-[13.5px] font-semibold text-brand-ink">
            Regenerating against {constraintsComplete ? "all" : "active"}{" "}
            constraints — resolving venue clashes and capacity issues…
          </span>
        </div>
      )}

      {/* Grid or list */}
      <Card className="overflow-hidden">
        {mode === "grid" ? (
          <div className="overflow-x-auto p-4">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[72px_repeat(5,1fr)] gap-2">
                <div />
                {days.map((d) => (
                  <div
                    key={d}
                    className="pb-2 text-center text-[12px] font-semibold uppercase tracking-wide text-muted"
                  >
                    {d}
                  </div>
                ))}
                {slots.map((s) => (
                  <div key={s} className="contents">
                    <div className="flex items-start pt-2 text-[12px] font-medium text-muted">
                      {s}
                    </div>
                    {days.map((d) => {
                      const items = cell(d, s);
                      const isHighlighted =
                        highlightCell?.day === d && highlightCell?.slot === s;

                      const isBreak = s === "13:00";
                      const isWedOff = d === "Wed" && s === "17:00";
                      const isFriOff =
                        d === "Fri" &&
                        (s === "13:00" ||
                          s === "14:00" ||
                          s === "15:00" ||
                          s === "16:00" ||
                          s === "17:00");

                      if (isBreak) {
                        return (
                          <div
                            key={d + s}
                            className="flex min-h-[56px] items-center justify-center rounded-xl border border-dashed border-line bg-panel/60 p-1.5 text-[11px] font-semibold text-muted"
                          >
                            Lunch Break (1-2pm)
                          </div>
                        );
                      }

                      if (isWedOff) {
                        return (
                          <div
                            key={d + s}
                            className="flex min-h-[56px] items-center justify-center rounded-xl border border-line bg-panel/30 p-1.5 text-[10.5px] font-medium text-muted/60"
                          >
                            Wed 5pm End
                          </div>
                        );
                      }

                      if (isFriOff) {
                        return (
                          <div
                            key={d + s}
                            className="flex min-h-[56px] items-center justify-center rounded-xl border border-line bg-panel/30 p-1.5 text-[10.5px] font-medium text-muted/60"
                          >
                            Fri Afternoon Off
                          </div>
                        );
                      }

                      return (
                        <div
                          key={d + s}
                          className={`min-h-[76px] rounded-xl border p-1.5 transition-all duration-500 ${
                            isHighlighted
                              ? "border-brand bg-brand-soft/60 shadow-sm ring-2 ring-brand/30"
                              : "border-line-soft bg-panel/40"
                          }`}
                        >
                          {items.map((it, k) => (
                            <button
                              key={k}
                              onClick={() => setCellDetail(it)}
                              className={`mb-1.5 w-full cursor-pointer rounded-lg border px-2.5 py-1.5 text-left last:mb-0 transition hover:shadow-sm ${
                                it.conflict
                                  ? "border-bad/40 bg-bad-soft hover:bg-bad/10"
                                  : "border-brand/20 bg-brand-soft hover:bg-brand/10"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <p
                                  className={`text-[12px] font-bold ${
                                    it.conflict ? "text-bad" : "text-brand-ink"
                                  }`}
                                >
                                  {it.code}
                                </p>
                                <div className="flex items-center gap-1">
                                  {it.isVirtual && (
                                    <span className="flex items-center gap-0.5 rounded bg-violet-soft px-1 py-0.2 text-[9px] font-semibold text-violet">
                                      <Globe size={9} /> Virtual
                                    </span>
                                  )}
                                  {it.group && it.group !== "All" && (
                                    <span className="rounded bg-brand/15 px-1 py-0.2 text-[9px] font-semibold text-brand-ink">
                                      {it.group}
                                    </span>
                                  )}
                                  {it.duration && it.duration > 1 && (
                                    <span className="rounded bg-brand/10 px-1 py-0.2 text-[9.5px] font-semibold text-brand-ink">
                                      {it.duration}h
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="truncate text-[10.5px] text-muted">
                                {it.venue}
                              </p>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-2 py-2">
            <div className="grid grid-cols-[100px_1fr_140px_120px_110px] items-center gap-3 px-3 pb-2 pt-1">
              {["Code", "Lecturer", "Venue", "Day / Time", "Status"].map(
                (h) => (
                  <span
                    key={h}
                    className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted last:text-right"
                  >
                    {h}
                  </span>
                ),
              )}
            </div>
            {filteredSessions.map((s, i) => (
              <button
                key={i}
                onClick={() => setCellDetail(s)}
                className="grid w-full grid-cols-[100px_1fr_140px_120px_110px] items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] transition hover:bg-panel"
              >
                <div>
                  <span className="font-bold text-ink">{s.code}</span>
                  {s.group && s.group !== "All" && (
                    <span className="ml-1.5 text-[10px] text-brand font-semibold">
                      {s.group}
                    </span>
                  )}
                  {s.isVirtual && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-violet-soft px-1 py-0.2 text-[9.5px] font-semibold text-violet">
                      <Globe size={9} /> Virtual
                    </span>
                  )}
                </div>
                <span className="truncate text-muted">{s.lecturer}</span>
                <span className="truncate text-subink">{s.venue}</span>
                <span className="text-subink">
                  {s.day} · {s.slot} {s.duration && s.duration > 1 ? `(${s.duration}h)` : ""}
                </span>
                <div className="flex justify-end">
                  {s.conflict ? (
                    <Pill tone="bad">Conflict</Pill>
                  ) : (
                    <Pill tone="good">OK</Pill>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Cell detail popover */}
      {cellDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4 backdrop-blur-sm"
          onClick={() => setCellDetail(null)}
        >
          <div
            className="bp-fade w-full max-w-xs rounded-2xl border border-line bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Session detail
                </p>
                <h3 className="mt-0.5 text-[18px] font-bold tracking-[-0.02em] text-ink">
                  {cellDetail.code}
                </h3>
              </div>
              <button
                onClick={() => setCellDetail(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 text-[13px]">
              {[
                ["Lecturer", cellDetail.lecturer],
                ["Venue", cellDetail.venue],
                ["Level", cellDetail.level ?? "200 Level"],
                ["Group", cellDetail.group ?? "All Groups"],
                ["Day", cellDetail.day],
                ["Time", cellDetail.slot],
                ["Duration", `${cellDetail.duration ?? 1} hour(s)`],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between border-b border-line-soft pb-2 last:border-0"
                >
                  <span className="text-muted">{k}</span>
                  <span className="font-semibold text-ink">{v}</span>
                </div>
              ))}
            </div>
            {cellDetail.conflict && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-bad-soft px-3 py-2 text-[12.5px] font-semibold text-bad">
                <AlertTriangle size={13} />
                {conflictLabel[cellDetail.conflict]} detected
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit modal */}
      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="bp-fade w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-good-soft text-good">
                  <ShieldCheck size={18} />
                </span>
                <h3 className="text-[16px] font-bold text-ink">
                  Submit for approval
                </h3>
              </div>
              <button
                onClick={() => setSubmitModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mb-5 rounded-xl bg-good-soft/60 px-4 py-3 text-[13px] text-good">
              <CheckCircle2 size={15} className="mr-1.5 inline" />
              Final constraint check passed — no hard blocks detected.
            </div>
            <p className="mb-5 text-[13.5px] leading-relaxed text-muted">
              This draft will move to{" "}
              <b className="text-subink">Dr. A. Olumide (HOD)</b> and its status
              becomes <b className="text-subink">Submitted to HOD</b>. You'll be
              notified of the decision.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSubmitModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                <Send size={15} /> Confirm submission
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
