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
} from "lucide-react";
import { Card, Pill, Button } from "../components/ui";
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

const conflictLabel: Record<string, string> = {
  venue: "Venue double-booking",
  capacity: "Capacity overage",
  lecturer: "Lecturer double-booking",
};

export default function Generate({
  localSessions,
  setLocalSessions,
  constraintsComplete,
  status,
  setStatus,
  setLocalTimeline,
  setView,
}: {
  localSessions: Session[];
  setLocalSessions: (s: Session[]) => void;
  constraintsComplete: boolean;
  status: Status;
  setStatus: (s: Status) => void;
  setLocalTimeline: (t: TimelineStep[]) => void;
  setView: (v: View) => void;
}) {
  const [mode, setMode] = useState<"grid" | "list">("grid");
  const [submitModal, setSubmitModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [highlightCell, setHighlightCell] = useState<{ day: string; slot: string } | null>(null);
  const [cellDetail, setCellDetail] = useState<Session | null>(null);

  const conflicts = localSessions.filter((s) => s.conflict);
  const cleared = conflicts.length === 0;
  const isSubmitted = status === "Submitted to HOD";

  const cell = (d: string, s: string) =>
    localSessions.filter((x) => x.day === d && x.slot === s);

  function handleRegenerate() {
    setIsRegenerating(true);
    setHighlightCell(null);
    setTimeout(() => {
      setLocalSessions(localSessions.map((s) => ({ ...s, conflict: undefined })));
      setIsRegenerating(false);
    }, 1600);
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
    setView("history");
  }

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
        <div className="flex items-center gap-2">
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
                Resolve {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} before submission · use Regenerate to auto-fix
              </p>
            </div>
            <div className="space-y-2">
              {conflicts.map((c, i) => {
                const alloc = allocations.find((a) => a.code === c.code);
                const cap = venues.find((v) => v.name === c.venue)?.capacity ?? 0;
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
            Regenerating against {constraintsComplete ? "all" : "active"} constraints — resolving venue clashes and capacity issues…
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
                              <p
                                className={`text-[12px] font-bold ${
                                  it.conflict ? "text-bad" : "text-brand-ink"
                                }`}
                              >
                                {it.code}
                              </p>
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
              {["Code", "Lecturer", "Venue", "Day / Time", "Status"].map((h) => (
                <span
                  key={h}
                  className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted last:text-right"
                >
                  {h}
                </span>
              ))}
            </div>
            {localSessions.map((s, i) => (
              <button
                key={i}
                onClick={() => setCellDetail(s)}
                className="grid w-full grid-cols-[100px_1fr_140px_120px_110px] items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] transition hover:bg-panel"
              >
                <span className="font-bold text-ink">{s.code}</span>
                <span className="truncate text-muted">{s.lecturer}</span>
                <span className="truncate text-subink">{s.venue}</span>
                <span className="text-subink">
                  {s.day} · {s.slot}
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
                ["Day", cellDetail.day],
                ["Time", cellDetail.slot],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-line-soft pb-2 last:border-0">
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
