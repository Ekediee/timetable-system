"use client";

import {
  Users,
  Building2,
  SlidersHorizontal,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Info,
  CalendarClock,
  Send,
} from "lucide-react";
import { Card, CardHead, Pill, Button } from "../components/ui";
import {
  allocations,
  venues,
  department,
  type Status,
  type Session,
  type Constraint,
  type TimelineStep,
} from "../lib/data";
import type { View } from "../components/Sidebar";

function Stat({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  const color =
    tone === "brand" ? "text-brand" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="flex-1 rounded-xl bg-panel px-4 py-3.5">
      <p className={`text-[26px] font-bold leading-none tracking-[-0.03em] ${color}`}>
        {value}
      </p>
      <p className="mt-2 text-[13px] font-semibold text-subink">{label}</p>
      <p className="mt-0.5 text-[12px] text-muted">{hint}</p>
    </div>
  );
}

export default function Dashboard({
  setView,
  status,
  localSessions,
  localConstraints,
  constraintsComplete,
  localTimeline,
}: {
  setView: (v: View) => void;
  status: Status;
  localSessions: Session[];
  localConstraints: Constraint[];
  constraintsComplete: boolean;
  localTimeline: TimelineStep[];
}) {
  const conflicts = localSessions.filter((s) => s.conflict);
  const rejection = localTimeline.find((t) => t.state === "rejected");
  const submitted =
    status === "Submitted to HOD" ||
    status === "Submitted to Dean" ||
    status === "Submitted to Acad Pl. T.O" ||
    status === "Published";

  const approvalPct = submitted ? 50 : 22;
  const approvalLabel = submitted
    ? "Step 2 of 4 · awaiting HOD decision"
    : "Step 1 of 4 · draft in progress";

  return (
    <div className="bp-fade grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* Left / main column */}
      <div className="flex flex-col gap-5 xl:col-span-2">
        <Card>
          <CardHead
            icon={<CalendarClock size={18} />}
            title="Timetable readiness"
            sub={`${department.name} · ${department.level} · ${department.semester}`}
            action={
              submitted ? (
                <Pill tone="good">
                  <Send size={12} /> Submitted
                </Pill>
              ) : (
                <Button onClick={() => setView("generate")}>
                  <Sparkles size={16} /> Open draft
                </Button>
              )
            }
          />
          <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row">
            <Stat label="Courses allocated" value={String(allocations.length)} hint="9 lecturers assigned" />
            <Stat
              label="Constraints active"
              value={String(localConstraints.length)}
              hint={constraintsComplete ? "Marked complete" : "Study leave, days off, adjuncts"}
              tone="brand"
            />
            <Stat
              label="Open conflicts"
              value={String(conflicts.length)}
              hint={conflicts.length === 0 ? "All clear" : "Blocking submission"}
              tone={conflicts.length === 0 ? "ink" : "bad"}
            />
          </div>
          <div className="mx-5 mb-5 rounded-xl border border-line bg-panel px-4 py-3.5">
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <span className="font-semibold text-subink">Approval progress</span>
              <span className="text-muted">{approvalLabel}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-brand transition-all duration-700"
                style={{ width: `${approvalPct}%` }}
              />
            </div>
          </div>
        </Card>

        {!submitted && rejection && (
          <Card className="border-bad/30 bg-bad-soft/40">
            <div className="flex gap-3 p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bad-soft text-bad">
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-semibold text-ink">
                    Returned by HOD — {rejection.actor}
                  </p>
                  <Pill tone="bad">Action required</Pill>
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-subink">
                  "{rejection.comment}"
                </p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => setView("generate")}
                >
                  Revise timetable <ArrowUpRight size={15} />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {submitted && (
          <Card className="border-good/30 bg-good-soft/40">
            <div className="flex gap-3 p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-good-soft text-good">
                <CheckCircle2 size={18} />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-ink">
                  Timetable submitted to HOD
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-subink">
                  Awaiting review by Dr. A. Olumide. You will be notified of the decision.
                </p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => setView("history")}
                >
                  View submission status <ArrowUpRight size={15} />
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <CardHead title="Quick actions" sub="Jump back into your workflow" />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-4">
            {[
              { label: "Allocations", icon: Users, v: "allocations" as View },
              { label: "Venues", icon: Building2, v: "venues" as View },
              { label: "Constraints", icon: SlidersHorizontal, v: "constraints" as View },
              { label: "Generate", icon: Sparkles, v: "generate" as View },
            ].map(({ label, icon: Icon, v }) => (
              <button
                key={label}
                onClick={() => setView(v)}
                className="flex flex-col items-center gap-2.5 rounded-xl border border-line bg-panel/60 px-3 py-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:bg-brand-soft/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-brand border border-line">
                  <Icon size={19} />
                </span>
                <span className="text-[12.5px] font-semibold text-subink">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-5">
        <Card>
          <CardHead title="Approval chain" sub="Live status of this submission" />
          <div className="px-5 pb-5">
            {localTimeline.map((s, i) => {
              const dot =
                s.state === "done"
                  ? "bg-good text-white"
                  : s.state === "rejected"
                    ? "bg-bad text-white"
                    : s.state === "current"
                      ? "bg-brand text-white"
                      : "bg-line text-muted";
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${dot}`}
                    >
                      {s.state === "done" ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    {i < localTimeline.length - 1 && (
                      <span className="my-0.5 w-px flex-1 bg-line" />
                    )}
                  </div>
                  <div className={`pb-4 ${i === localTimeline.length - 1 ? "pb-0" : ""}`}>
                    <p className="text-[13.5px] font-semibold text-ink">
                      {s.action}
                    </p>
                    <p className="text-[12px] text-muted">
                      {s.role} · {s.at}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="Resource snapshot" />
          <div className="space-y-2.5 px-5 pb-5 text-[13px]">
            {[
              ["Venues available", `${venues.length}`],
              ["Total seat capacity", `${venues.reduce((a, v) => a + v.capacity, 0)}`],
              ["Largest cohort", `${Math.max(...allocations.map((a) => a.size))} students`],
              ["Total teaching units", `${allocations.reduce((a, c) => a + c.units, 0)}`],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between border-b border-line-soft pb-2.5 last:border-0 last:pb-0"
              >
                <span className="text-muted">{k}</span>
                <span className="font-semibold text-ink">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-brand-soft/40">
          <div className="flex gap-3 p-5">
            <Info size={18} className="shrink-0 text-brand" />
            <p className="text-[13px] leading-relaxed text-subink">
              The constraint engine re-checks at every approval gate. Clear all
              hard blocks before resubmitting to the HOD.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
