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
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Card, CardHead, Pill, Button } from "../components/ui";
import { department, type Status, type Session, type TimelineStep } from "../lib/data";
import { useApp } from "../lib/AppContext";

import { accounts } from "../lib/data";

const COMPUTING_DEPARTMENTS = [
  "Computer Science",
  "Software Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
];

const MANAGEMENT_DEPARTMENTS = [
  "Information Resource Management",
  "Accounting",
  "Business Administration and Marketing",
  "Finance",
];

export default function DeanReview(props?: {
  status?: Status;
  setStatus?: (s: Status) => void;
  localSessions?: Session[];
  localTimeline?: TimelineStep[];
  setLocalTimeline?: (t: TimelineStep[]) => void;
}) {
  const context = useApp();
  const isManagementSchool =
    context.currentUser?.school?.toLowerCase().includes("management");

  const schoolDepartments = isManagementSchool
    ? MANAGEMENT_DEPARTMENTS
    : [...COMPUTING_DEPARTMENTS, ...MANAGEMENT_DEPARTMENTS];

  const [selectedDept, setSelectedDept] = useState<string>(
    isManagementSchool ? "Accounting" : "Computer Science"
  );
  const [returnNote, setReturnNote] = useState("");
  const [mode, setMode] = useState<"idle" | "returning">("idle");

  const isCurrentDept = selectedDept === context.currentProgram;
  const deptEntry = context.getDepartmentTimetable(selectedDept);

  const deptStatus: Status = deptEntry?.status ?? (isCurrentDept ? context.status : "Draft generated");
  const deptSessions: Session[] = deptEntry?.sessions ?? (isCurrentDept ? context.localSessions : []);
  const deptTimeline: TimelineStep[] = deptEntry?.timeline ?? context.localTimeline;

  const hasSubmission = deptStatus === "Submitted to Dean";
  const isForwarded =
    deptStatus === "Submitted to Acad Pl. T.O" || deptStatus === "Published";

  const hodStep = deptTimeline.find((t) => t.role === "HOD" && t.state === "done");
  const matchingTO = accounts.find(
    (a) => a.role === "deptTO" && a.department?.toLowerCase() === selectedDept.toLowerCase()
  );
  const matchingHOD = accounts.find(
    (a) => a.role === "hod" && a.department?.toLowerCase() === selectedDept.toLowerCase()
  );
  const deptTO = matchingTO?.name || (selectedDept === "Software Engineering" ? "Flourence Adeyemi" : "Yakubu Onome");
  const hodName = matchingHOD?.name || "Dr. A. Olumide";

  function handleApprove() {
    context.updateTimetableStatus("Submitted to Acad Pl. T.O", undefined, selectedDept);
  }

  function handleReturn() {
    context.updateTimetableStatus("Draft generated", returnNote, selectedDept);
    setMode("idle");
    setReturnNote("");
  }

  return (
    <div className="bp-fade flex flex-col gap-5">
      {/* School Department Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-2">
            School Departments:
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {schoolDepartments.map((dept) => {
              const entry = context.getDepartmentTimetable(dept);
              const statusVal = entry?.status ?? (dept === context.currentProgram ? context.status : "Draft generated");
              const isSelected = selectedDept === dept;
              const isReadyForDean = statusVal === "Submitted to Dean";
              const isApproved = statusVal === "Submitted to Acad Pl. T.O" || statusVal === "Published";

              return (
                <button
                  key={dept}
                  onClick={() => {
                    setSelectedDept(dept);
                    setMode("idle");
                  }}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition ${
                    isSelected
                      ? "bg-brand text-white shadow-xs"
                      : "bg-panel text-ink hover:bg-line-soft"
                  }`}
                >
                  <span>{dept}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : isReadyForDean
                        ? "bg-brand-soft text-brand-ink"
                        : isApproved
                        ? "bg-good-soft text-good"
                        : "bg-line text-muted"
                    }`}
                  >
                    {isReadyForDean ? "Ready for Dean" : isApproved ? "Approved" : "In Progress"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 pr-2 text-[12px] text-muted">
          <GraduationCap size={15} className="text-good" />
          <span>Dean Review · School of Computing & Engineering</span>
        </div>
      </div>

      {isForwarded ? (
        <div className="flex flex-col gap-5">
          <Card className="border-good/30 bg-good-soft/40">
            <div className="flex gap-4 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-good-soft text-good">
                <Globe size={20} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-ink">
                  {selectedDept} submission approved — forwarded to Academic Planning Office
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-subink">
                  The {selectedDept} timetable has received school-level sign-off from{" "}
                  <strong>Prof. E. Bassey</strong> and is now with{" "}
                  <strong>M. Danladi</strong> for final institutional publishing.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Pill tone="good">
                    <CheckCircle2 size={11} /> {deptStatus}
                  </Pill>
                  <span className="text-[12px] text-muted">
                    {deptSessions.length} sessions · Conflict-free
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Sessions summary */}
          <Card>
            <CardHead
              icon={<Building2 size={16} />}
              title={`Approved sessions (${selectedDept})`}
              sub={`${deptSessions.length} conflict-free sessions`}
            />
            <div className="max-h-[340px] overflow-y-auto px-2 pb-3">
              <div className="grid grid-cols-[88px_1fr_140px_108px_90px] items-center gap-3 px-3 pb-2 pt-1 border-b border-line text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                <span>Code</span>
                <span>Lecturer</span>
                <span>Venue</span>
                <span>Day / Time</span>
                <span className="text-right">Status</span>
              </div>
              {deptSessions.slice(0, 30).map((s, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[88px_1fr_140px_108px_90px] items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-panel/50 text-[12.5px]"
                >
                  <span className="font-bold text-ink">{s.code}</span>
                  <span className="truncate text-muted">{s.lecturer}</span>
                  <span className="truncate text-subink font-medium">{s.venue}</span>
                  <span className="text-subink">{s.day} · {s.slot}</span>
                  <div className="flex justify-end">
                    <Pill tone="good">OK</Pill>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : !hasSubmission ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-panel">
            <Clock size={24} className="text-muted" />
          </div>
          <p className="text-[16px] font-semibold text-ink">
            Awaiting HOD sign-off for {selectedDept}
          </p>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
            The {selectedDept} submission will appear here once the Head of Department reviews and approves it.
          </p>
          <div className="mt-5 rounded-xl border border-line bg-card px-5 py-4 text-left max-w-sm w-full">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted mb-1">
              Current stage
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-ink">{deptStatus}</span>
              <Pill tone="warn">{deptStatus}</Pill>
            </div>
            <p className="mt-2 text-[12px] text-muted">
              Dept T.O: {deptTO} · HOD: Dr. A. Olumide
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Main: submission overview */}
          <div className="flex flex-col gap-5 xl:col-span-2">
            <Card>
              <CardHead
                icon={<GraduationCap size={16} />}
                title={`HOD-approved submission: ${selectedDept}`}
                sub={`${department.level} · First Semester 2026/27`}
                action={
                  <Pill tone="brand">
                    <CheckCircle2 size={11} /> HOD signed off
                  </Pill>
                }
              />
              <div className="flex gap-3 flex-wrap px-5 pb-5">
                {[
                  {
                    label: "Courses",
                    value: String(new Set(deptSessions.map((s) => s.code)).size),
                    Icon: BookOpen,
                  },
                  {
                    label: "Sessions",
                    value: String(deptSessions.length),
                    Icon: Clock,
                  },
                  { label: "Dept T.O", value: deptTO, Icon: Users },
                  { label: "HOD", value: "Dr. A. Olumide", Icon: Building2 },
                ].map(({ label, value, Icon }) => (
                  <div
                    key={label}
                    className="flex flex-1 min-w-[130px] items-center gap-3 rounded-xl bg-panel px-4 py-3"
                  >
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
            <Card className="border-good/30">
              <CardHead title="HOD sign-off note" sub="Dr. A. Olumide" />
              <div className="flex items-start gap-3 px-5 pb-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-bold text-brand-ink">
                  AO
                </div>
                <div className="flex-1 rounded-xl bg-good-soft/50 px-4 py-3">
                  <p className="text-[13px] font-semibold text-ink">Dr. A. Olumide (HOD)</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-subink">
                    Reviewed and confirmed conflict-free for {selectedDept}. Venue assignments and lecturer constraints are satisfied. Forwarding to the Dean for school-level sign-off.
                  </p>
                </div>
              </div>
            </Card>

            {/* Session summary list */}
            <Card>
              <CardHead
                icon={<Building2 size={16} />}
                title="Scheduled sessions"
                sub={`${deptSessions.length} scheduled sessions`}
              />
              <div className="max-h-[460px] overflow-y-auto px-2 pb-3">
                <div className="grid grid-cols-[88px_1fr_140px_108px_90px] items-center gap-3 px-3 pb-2 pt-1 border-b border-line text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                  <span>Code</span>
                  <span>Lecturer</span>
                  <span>Venue</span>
                  <span>Day / Time</span>
                  <span className="text-right">Status</span>
                </div>
                {deptSessions.map((s, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[88px_1fr_140px_108px_90px] items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-panel/50 text-[12.5px]"
                  >
                    <span className="font-bold text-ink">{s.code}</span>
                    <span className="truncate text-muted">{s.lecturer}</span>
                    <span className="truncate text-subink font-medium">{s.venue}</span>
                    <span className="text-subink">{s.day} · {s.slot}</span>
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

          {/* Right: Dean action */}
          <div className="flex flex-col gap-5">
            <Card>
              <CardHead title="Your decision" sub="As Dean — school sign-off" />
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
                      <RotateCcw size={13} /> Confirm Return to HOD
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => setMode("idle")}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <Button className="w-full" onClick={handleApprove}>
                      <Globe size={15} /> Approve & forward to Acad Pl. T.O
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => setMode("returning")}>
                      <RotateCcw size={13} /> Return to HOD with comments
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHead title="Routing" sub="Governance lifecycle" />
              <div className="space-y-2 px-5 pb-5">
                {[
                  ["Approve", "Sent to M. Danladi (Academic Planning) for final publishing", "good"],
                  ["Return", "Returned to Dr. A. Olumide (HOD) for revision", "bad"],
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
      )}
    </div>
  );
}
