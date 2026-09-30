"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  RotateCcw,
  X,
  BookOpen,
  Building2,
  Users,
  MessageSquare,
} from "lucide-react";
import { Card, CardHead, Pill, Button } from "../components/ui";
import {
  allocations,
  department,
  type Status,
  type Session,
  type TimelineStep,
} from "../lib/data";

export default function HODReview({
  status,
  setStatus,
  localSessions,
  localTimeline,
  setLocalTimeline,
}: {
  status: Status;
  setStatus: (s: Status) => void;
  localSessions: Session[];
  localTimeline: TimelineStep[];
  setLocalTimeline: (t: TimelineStep[]) => void;
}) {
  const [returnNote, setReturnNote] = useState("");
  const [mode, setMode] = useState<"idle" | "returning">("idle");
  const [confirmed, setConfirmed] = useState(false);

  const conflicts = localSessions.filter((s) => s.conflict);
  const hasSubmission = status === "Submitted to HOD";
  const isApproved =
    status === "Submitted to Dean" ||
    status === "Submitted to Acad Pl. T.O" ||
    status === "Published";
  const isReturned = status === "Draft generated" || status === "Constraints in progress";

  function handleApprove() {
    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    setStatus("Submitted to Dean");
    setLocalTimeline(
      localTimeline.map((step) => {
        if (step.role === "HOD" && step.state === "current") {
          return { ...step, action: "Approved & forwarded to Dean", at: now, state: "done" as const };
        }
        if (step.role === "Dean" && step.state === "pending") {
          return { ...step, action: "Reviewing submission", at: "Pending", state: "current" as const };
        }
        return step;
      }),
    );
    setConfirmed(true);
  }

  function handleReturn() {
    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    setStatus("Draft generated");
    setLocalTimeline(
      localTimeline.map((step) => {
        if (step.role === "HOD" && step.state === "current") {
          return {
            ...step,
            action: "Returned with comment",
            at: now,
            state: "rejected" as const,
            comment: returnNote,
          };
        }
        if (step.role === "Dept T.O" && step.state === "done") {
          return { ...step, action: "Revising draft", at: "In progress", state: "current" as const };
        }
        return step;
      }),
    );
    setMode("idle");
    setReturnNote("");
  }

  if (confirmed || isApproved) {
    return (
      <div className="bp-fade flex flex-col gap-5">
        <Card className="border-good/30 bg-good-soft/40">
          <div className="flex gap-4 p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-good-soft text-good">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[15px] font-bold text-ink">
                Submission approved — forwarded to Dean
              </p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-subink">
                The Computer Science 200-level timetable has been signed off and sent to{" "}
                <strong>Prof. E. Bassey</strong> for school-level approval.
              </p>
            </div>
          </div>
        </Card>
        <div className="text-center py-8 text-[13px] text-muted">
          No further action required at this stage.
        </div>
      </div>
    );
  }

  if (!hasSubmission) {
    return (
      <div className="bp-fade">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-panel">
            <Clock size={24} className="text-muted" />
          </div>
          <p className="text-[15px] font-semibold text-ink">No submissions pending</p>
          <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted">
            {isReturned
              ? "The timetable was returned to the Departmental T.O for revision."
              : "Waiting for the Departmental T.O to submit a draft for review."}
          </p>
          <div className="mt-5 rounded-xl border border-line bg-card px-5 py-4 text-left max-w-sm">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted mb-2">
              Current status
            </p>
            <p className="text-[14px] font-semibold text-ink">{status}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bp-fade grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* Main: submission detail */}
      <div className="flex flex-col gap-5 xl:col-span-2">
        {/* Submission header */}
        <Card>
          <CardHead
            icon={<Send size={16} />}
            title="Incoming submission"
            sub={`${department.name} · ${department.level} · ${department.semester}`}
            action={<Pill tone="warn"><Clock size={11} /> Awaiting HOD review</Pill>}
          />
          <div className="flex gap-3 flex-wrap px-5 pb-5">
            {[
              { label: "Courses", value: String(allocations.length), Icon: BookOpen },
              { label: "Sessions", value: String(localSessions.length), Icon: Clock },
              { label: "Submitted by", value: "Yakubu Onome", Icon: Users },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="flex flex-1 min-w-[120px] items-center gap-3 rounded-xl bg-panel px-4 py-3">
                <Icon size={16} className="shrink-0 text-muted" />
                <div>
                  <p className="text-[12px] text-muted">{label}</p>
                  <p className="text-[13.5px] font-semibold text-ink">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <Card className="border-bad/30 bg-bad-soft/40">
            <CardHead
              icon={<AlertTriangle size={16} className="text-bad" />}
              title={`${conflicts.length} conflict${conflicts.length > 1 ? "s" : ""} flagged`}
              sub="These must be resolved before final approval"
            />
            <div className="space-y-2 px-5 pb-5">
              {conflicts.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3"
                >
                  <Pill tone="bad">
                    {c.conflict === "capacity" ? "Capacity" : "Venue clash"}
                  </Pill>
                  <span className="text-[13.5px] font-semibold text-ink">{c.code}</span>
                  <span className="text-[13px] text-muted">
                    {c.venue} · {c.day} {c.slot}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Session list */}
        <Card>
          <CardHead
            icon={<Building2 size={16} />}
            title="Scheduled sessions"
            sub={`${localSessions.length} sessions across ${department.level}`}
          />
          <div className="px-2 pb-3">
            <div className="grid grid-cols-[88px_1fr_140px_108px_90px] items-center gap-3 px-3 pb-2 pt-1">
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
              <div
                key={i}
                className="grid grid-cols-[88px_1fr_140px_108px_90px] items-center gap-3 rounded-xl px-3 py-3"
              >
                <span className="text-[13px] font-bold text-ink">{s.code}</span>
                <span className="truncate text-[13px] text-muted">{s.lecturer}</span>
                <span className="truncate text-[13px] text-subink">{s.venue}</span>
                <span className="text-[13px] text-subink">{s.day} · {s.slot}</span>
                <div className="flex justify-end">
                  {s.conflict ? (
                    <Pill tone="bad">Conflict</Pill>
                  ) : (
                    <Pill tone="good">OK</Pill>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right: approval action */}
      <div className="flex flex-col gap-5">
        {/* Dept TO note from timeline */}
        {localTimeline.find((t) => t.role === "Dept T.O" && t.state === "done") && (
          <Card>
            <CardHead title="Submission note" sub="From Departmental T.O" />
            <div className="px-5 pb-5">
              <div className="flex items-start gap-3 rounded-xl bg-panel px-4 py-3.5">
                <MessageSquare size={15} className="mt-0.5 shrink-0 text-muted" />
                <div>
                  <p className="text-[13px] font-semibold text-ink">Yakubu Onome</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-subink">
                    Draft revised as directed — capacity and venue conflicts resolved. Resubmitting for HOD sign-off.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Action card */}
        <Card>
          <CardHead title="Your decision" sub="As Head of Department" />
          <div className="px-5 pb-5">
            {conflicts.length > 0 && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-warn-soft/60 px-3.5 py-3">
                <AlertTriangle size={14} className="shrink-0 text-warn mt-0.5" />
                <p className="text-[12px] leading-snug text-subink">
                  {conflicts.length} unresolved conflict{conflicts.length > 1 ? "s" : ""} still present. Consider returning for revision.
                </p>
              </div>
            )}

            {mode === "returning" ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-ink">Return note</p>
                  <button onClick={() => setMode("idle")} className="text-muted hover:text-subink">
                    <X size={15} />
                  </button>
                </div>
                <textarea
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder="State the reason for returning this draft to the Dept T.O…"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                />
                <Button
                  className="w-full bg-bad hover:bg-red-700"
                  onClick={handleReturn}
                  disabled={!returnNote.trim()}
                >
                  <RotateCcw size={13} /> Return to Dept T.O
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setMode("idle")}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Button className="w-full" onClick={handleApprove}>
                  <CheckCircle2 size={15} /> Approve — forward to Dean
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setMode("returning")}
                >
                  <RotateCcw size={13} /> Return to Dept T.O
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Routing info */}
        <Card>
          <CardHead title="Approval routing" sub="What happens next" />
          <div className="space-y-2 px-5 pb-5 text-[13px]">
            {[
              ["Approve", "Forwarded to Dean for school-level sign-off", "good"],
              ["Return", "Draft returned to Dept T.O for revision", "bad"],
            ].map(([a, b, tone]) => (
              <div key={a} className="rounded-xl border border-line bg-panel px-4 py-3">
                <Pill tone={tone} className="mb-1.5">{a}</Pill>
                <p className="text-[12.5px] leading-snug text-muted">{b}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
