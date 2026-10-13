"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  X,
  GraduationCap,
  Users,
  BookOpen,
  Building2,
  Globe,
} from "lucide-react";
import { Card, CardHead, Pill, Button } from "../components/ui";
import { allocations, department, type Status, type Session, type TimelineStep } from "../lib/data";
import { useApp } from "../lib/AppContext";

export default function DeanReview(props?: {
  status?: Status;
  setStatus?: (s: Status) => void;
  localSessions?: Session[];
  localTimeline?: TimelineStep[];
  setLocalTimeline?: (t: TimelineStep[]) => void;
}) {
  const context = useApp();

  const status = props?.status ?? context.status;
  const setStatus = props?.setStatus ?? context.setStatus;
  const localSessions = props?.localSessions ?? context.localSessions;
  const localTimeline = props?.localTimeline ?? context.localTimeline;
  const setLocalTimeline = props?.setLocalTimeline ?? context.setLocalTimeline;
  const [returnNote, setReturnNote] = useState("");
  const [mode, setMode] = useState<"idle" | "returning">("idle");
  const [confirmed, setConfirmed] = useState(false);

  const hasSubmission = status === "Submitted to Dean";
  const isForwarded =
    status === "Submitted to Acad Pl. T.O" || status === "Published";

  const hodStep = localTimeline.find((t) => t.role === "HOD" && t.state === "done");

  function handleApprove() {
    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    setStatus("Submitted to Acad Pl. T.O");
    setLocalTimeline(
      localTimeline.map((step) => {
        if (step.role === "Dean" && step.state === "current") {
          return { ...step, action: "Approved & forwarded to Acad Pl. T.O", at: now, state: "done" as const };
        }
        if (step.role === "Acad Pl. T.O" && step.state === "pending") {
          return { ...step, action: "Final review in progress", at: "Pending", state: "current" as const };
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
    setStatus("Submitted to HOD");
    setLocalTimeline(
      localTimeline.map((step) => {
        if (step.role === "Dean" && step.state === "current") {
          return {
            ...step,
            action: "Returned to HOD with comment",
            at: now,
            state: "rejected" as const,
            comment: returnNote,
          };
        }
        if (step.role === "HOD" && step.state === "done") {
          return { ...step, action: "Reviewing Dean return", at: "In progress", state: "current" as const };
        }
        return step;
      }),
    );
    setMode("idle");
    setReturnNote("");
  }

  if (confirmed || isForwarded) {
    return (
      <div className="bp-fade flex flex-col gap-5">
        <Card className="border-good/30 bg-good-soft/40">
          <div className="flex gap-4 p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-good-soft text-good">
              <Globe size={20} />
            </div>
            <div>
              <p className="text-[15px] font-bold text-ink">
                Forwarded to Academic Planning Office
              </p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-subink">
                The Computer Science 200-level timetable has been school-approved and sent to{" "}
                <strong>M. Danladi</strong> for final review and publishing.
              </p>
            </div>
          </div>
        </Card>
        <div className="text-center py-8 text-[13px] text-muted">
          Awaiting final approval from the Academic Planning Office.
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
          <p className="text-[15px] font-semibold text-ink">Nothing to review yet</p>
          <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted">
            Submissions will appear here once the HOD has reviewed and approved them.
          </p>
          <div className="mt-5 rounded-xl border border-line bg-card px-5 py-4 text-left max-w-sm w-full">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted mb-2">
              Pipeline status
            </p>
            <p className="text-[14px] font-semibold text-ink">{status}</p>
            <p className="mt-1 text-[12.5px] text-muted">
              Computer Science · 200 Level · First Semester 2025/26
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bp-fade grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* Main: submission overview */}
      <div className="flex flex-col gap-5 xl:col-span-2">
        <Card>
          <CardHead
            icon={<GraduationCap size={16} />}
            title="HOD-approved submission"
            sub={`${department.name} · ${department.level} · ${department.semester}`}
            action={<Pill tone="brand"><CheckCircle2 size={11} /> HOD signed off</Pill>}
          />
          <div className="flex gap-3 flex-wrap px-5 pb-5">
            {[
              { label: "Courses", value: String(context.localAllocations.length), Icon: BookOpen },
              { label: "Sessions", value: String(localSessions.length), Icon: Clock },
              { label: "Dept T.O", value: "Yakubu Onome", Icon: Users },
              { label: "HOD", value: "Dr. A. Olumide", Icon: Building2 },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="flex flex-1 min-w-[130px] items-center gap-3 rounded-xl bg-panel px-4 py-3">
                <Icon size={15} className="shrink-0 text-muted" />
                <div>
                  <p className="text-[12px] text-muted">{label}</p>
                  <p className="text-[13px] font-semibold text-ink">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* HOD approval note */}
        {hodStep && (
          <Card className="border-good/30">
            <CardHead title="HOD sign-off" sub={hodStep.at} />
            <div className="flex items-start gap-3 px-5 pb-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-bold text-brand-ink">
                AO
              </div>
              <div className="flex-1 rounded-xl bg-good-soft/50 px-4 py-3">
                <p className="text-[13px] font-semibold text-ink">Dr. A. Olumide</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-subink">
                  Reviewed and confirmed conflict-free. Course allocations, venue assignments, and lecturer constraints are satisfied. Forwarding to the Dean for school-level approval.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Session summary (compact) */}
        <Card>
          <CardHead
            icon={<Building2 size={16} />}
            title="Session summary"
            sub={`${localSessions.length} scheduled sessions`}
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
                  {s.conflict ? <Pill tone="bad">Conflict</Pill> : <Pill tone="good">OK</Pill>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right: Dean action */}
      <div className="flex flex-col gap-5">
        <Card>
          <CardHead title="Your decision" sub="As Dean — school-level sign-off" />
          <div className="px-5 pb-5">
            <div className="mb-4 rounded-xl bg-brand-soft/40 px-4 py-3.5 text-[13px] text-brand-ink">
              <CheckCircle2 size={14} className="mr-1.5 inline text-good" />
              HOD has reviewed and cleared this submission.
            </div>

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
                  placeholder="State the reason for returning to the HOD…"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                />
                <Button
                  className="w-full bg-bad hover:bg-red-700"
                  onClick={handleReturn}
                  disabled={!returnNote.trim()}
                >
                  <RotateCcw size={13} /> Return to HOD
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setMode("idle")}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Button className="w-full" onClick={handleApprove}>
                  <Globe size={15} /> Approve — send to Acad Pl. T.O
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setMode("returning")}>
                  <RotateCcw size={13} /> Return to HOD
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHead title="Routing" sub="What your decision triggers" />
          <div className="space-y-2 px-5 pb-5">
            {[
              ["Approve", "Sent to Acad Pl. T.O for final approval and publishing", "good"],
              ["Return", "Returned to HOD — flagged for re-review", "bad"],
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
