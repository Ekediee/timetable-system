"use client";

import { useState, useEffect } from "react";
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
  ShieldCheck,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card, CardHead, Pill, Button, DataUnavailableState, HODReviewSkeleton, ConfirmationModal } from "../components/ui";
import {
  department,
  accounts,
  getParentSchool,
  type Status,
  type Session,
  type TimelineStep,
} from "../lib/data";
import { useApp } from "../lib/AppContext";
import { workflowApi, timetableApi } from "../lib/api";
import { CURRENT_SESSION, CURRENT_SEMESTER } from "../lib/config";
import ReviewRequirements from "../components/ReviewRequirements";
import { toast } from "../components/Toast";

export default function HODReview(props?: {
  status?: Status;
  setStatus?: (s: Status) => void;
  localSessions?: Session[];
  localTimeline?: TimelineStep[];
  setLocalTimeline?: (t: TimelineStep[]) => void;
}) {
  const context = useApp();
  const selectedDept = context.currentUser?.department || "";
  const hodDashboard =
    context.dashboardData?.role === "hod" ? context.dashboardData : null;

  const [loading, setLoading] = useState(!hodDashboard);
  const [returnNote, setReturnNote] = useState("");
  const [mode, setMode] = useState<"idle" | "returning">("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "return" | null>(null);

  const [liveSessions, setLiveSessions] = useState<Session[]>(
    hodDashboard?.submission?.sessions || [],
  );
  const [liveStatus, setLiveStatus] = useState<Status | null>(
    hodDashboard?.submission?.status || null,
  );
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineStep[]>(
    hodDashboard?.timeline || [],
  );

  useEffect(() => {
    if (!selectedDept) {
      setLoading(false);
      return;
    }

    // Unified GET /api/v1/dashboard provides submission & timeline in 1 call.
    // Skip redundant network calls when dashboard payload is already hydrated.
    if (
      hodDashboard &&
      hodDashboard.department?.toLowerCase() === selectedDept.toLowerCase() &&
      hodDashboard.submission
    ) {
      setLiveSessions(hodDashboard.submission.sessions || []);
      setLiveStatus(hodDashboard.submission.status || null);
      setSelectedTimeline(hodDashboard.timeline || []);
      setLoading(false);
      return;
    }

    if (!hodDashboard) {
      setLoading(true);
    }
    Promise.all([
      timetableApi.getCurrent(selectedDept, CURRENT_SEMESTER, CURRENT_SESSION).catch(() => null),
      workflowApi.getTimeline(selectedDept).catch(() => null),
    ])
      .then(([tRes, tlRes]) => {
        if (tRes && Array.isArray(tRes.sessions)) {
          setLiveSessions(tRes.sessions);
          if (tRes.status) setLiveStatus(tRes.status as Status);
        }
        if (tlRes && Array.isArray(tlRes.timeline)) {
          setSelectedTimeline(tlRes.timeline);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedDept, hodDashboard]);

  // Retrieve data specifically for selected department
  const isCurrentDept = selectedDept === context.currentProgram;
  const deptEntry = context.getDepartmentTimetable(selectedDept);

  const deptStatus: Status =
    liveStatus ?? (deptEntry?.status ?? (isCurrentDept ? context.status : "Draft generated"));
  const deptSessions: Session[] =
    liveSessions.length > 0
      ? liveSessions
      : (deptEntry?.sessions ?? (isCurrentDept ? context.localSessions : []));
  const deptTimeline: TimelineStep[] =
    selectedTimeline.length > 0 ? selectedTimeline : (deptEntry?.timeline ?? context.localTimeline);

  const conflicts = deptSessions.filter((s) => s.conflict);
  const hasSubmission = deptStatus === "Submitted to HOD";
  const isApproved =
    deptStatus === "Submitted to Dean" ||
    deptStatus === "Submitted to Acad Pl. T.O" ||
    deptStatus === "Published";
  const isReturned = deptStatus === "Draft generated" || deptStatus === "Constraints in progress";

  const matchingTO = accounts.find(
    (a) => a.role === "deptTO" && a.department?.toLowerCase() === selectedDept.toLowerCase()
  );
  const deptTO =
    hodDashboard?.deptTO?.name ||
    matchingTO?.name ||
    "Departmental Technical Officer";

  const deptSchool = getParentSchool(selectedDept);
  const matchingDean = accounts.find(
    (a) => a.role === "dean" && (a.school === deptSchool || a.school?.includes(deptSchool))
  );
  const deanName = matchingDean?.name || "the School Dean";

  async function handleApprove() {
    setIsProcessing(true);
    try {
      await workflowApi.hodApprove(selectedDept, CURRENT_SEMESTER, CURRENT_SESSION);
      await context.updateTimetableStatus("Submitted to Dean", undefined, selectedDept);
      setLiveStatus("Submitted to Dean");
      setConfirmAction(null);
      const tlRes = await workflowApi.getTimeline(selectedDept);
      if (tlRes && Array.isArray(tlRes.timeline)) setSelectedTimeline(tlRes.timeline);
    } catch (err: any) {
      toast.error(err?.message || "Failed approving submission as HOD.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleReturn() {
    if (!returnNote.trim()) {
      toast.error("Please provide a note explaining why this timetable is being returned.");
      return;
    }
    setIsProcessing(true);
    try {
      await workflowApi.hodReject(selectedDept, returnNote, CURRENT_SEMESTER, CURRENT_SESSION);
      await context.updateTimetableStatus("Draft generated", returnNote, selectedDept);
      setLiveStatus("Draft generated");
      setMode("idle");
      setReturnNote("");
      setConfirmAction(null);
      const tlRes = await workflowApi.getTimeline(selectedDept);
      if (tlRes && Array.isArray(tlRes.timeline)) setSelectedTimeline(tlRes.timeline);
    } catch (err: any) {
      toast.error(err?.message || "Failed returning submission as HOD.");
    } finally {
      setIsProcessing(false);
    }
  }

  if (!selectedDept) {
    return (
      <DataUnavailableState
        tone="warn"
        title="No Department Assigned"
        description="Your Head of Department account is not currently assigned to an academic department. HODs can only review timetable submissions for their designated department."
      />
    );
  }

  if (loading) {
    return <HODReviewSkeleton />;
  }

  return (
    <div className="bp-fade flex flex-col gap-5">
      {/* Department Scoped Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-xs">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-bold text-ink">
                Department of {selectedDept}
              </h2>
              <Pill tone={hasSubmission ? "warn" : isApproved ? "good" : "neutral"}>
                {deptStatus}
              </Pill>
            </div>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Head of Department Review · {deptSchool} · {department.session}, {department.semester}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pr-1 text-[12px] text-muted">
          <span>
            Assigned T.O: <strong className="text-ink font-medium">{deptTO}</strong>
          </span>
        </div>
      </div>

      {isApproved ? (
        <div className="flex flex-col gap-5">
          <Card className="border-good/30 bg-good-soft/40">
            <div className="flex gap-4 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-good-soft text-good">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-ink">
                  {selectedDept} submission approved — forwarded to Dean
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-subink">
                  The {selectedDept} timetable has been signed off and forwarded to{" "}
                  <strong>{deanName}</strong> for school-level approval.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Pill tone="good">
                    <CheckCircle2 size={11} /> {deptStatus}
                  </Pill>
                  <span className="text-[12px] text-muted">
                    {deptSessions.length} sessions · 0 conflicts
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick preview of approved schedule */}
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
              {deptSessions.length > 30 && (
                <p className="pt-2 text-center text-[12px] text-muted">
                  + {deptSessions.length - 30} more scheduled sessions
                </p>
              )}
            </div>
          </Card>
        </div>
      ) : !hasSubmission ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-panel">
            <Clock size={24} className="text-muted" />
          </div>
          <p className="text-[16px] font-semibold text-ink">
            No submissions pending for {selectedDept}
          </p>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
            {isReturned
              ? `The ${selectedDept} timetable was returned to the Departmental T.O (${deptTO}) for revision.`
              : `Waiting for the Departmental T.O (${deptTO}) to submit a draft for HOD review.`}
          </p>
          <div className="mt-5 rounded-xl border border-line bg-card px-5 py-4 text-left max-w-sm w-full">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted mb-1">
              Current pipeline status
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-ink">{deptStatus}</span>
              <Pill tone={isReturned ? "bad" : "warn"}>{deptStatus}</Pill>
            </div>
            <p className="mt-2 text-[12px] text-muted">
              Submitted by: {deptTO}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Main: submission detail */}
          <div className="flex flex-col gap-5 xl:col-span-2">
            {/* Submission header */}
            <Card>
              <CardHead
                icon={<Send size={16} />}
                title={`Incoming submission: ${selectedDept}`}
                sub={`${department.level} · Academic period unavailable`}
                action={
                  <Pill tone="warn">
                    <Clock size={11} /> Awaiting HOD review
                  </Pill>
                }
              />
              <div className="flex gap-3 flex-wrap px-5 pb-5">
                {[
                  {
                    label: "Courses",
                    value: String(
                      new Set(deptSessions.map((s) => s.code)).size
                    ),
                    Icon: BookOpen,
                  },
                  {
                    label: "Sessions",
                    value: String(deptSessions.length),
                    Icon: Clock,
                  },
                  {
                    label: "Submitted by",
                    value: deptTO,
                    Icon: Users,
                  },
                ].map(({ label, value, Icon }) => (
                  <div
                    key={label}
                    className="flex flex-1 min-w-[120px] items-center gap-3 rounded-xl bg-panel px-4 py-3"
                  >
                    <Icon size={16} className="shrink-0 text-muted" />
                    <div>
                      <p className="text-[12px] text-muted">{label}</p>
                      <p className="text-[13.5px] font-semibold text-ink">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <ReviewRequirements department={selectedDept} />

            {/* Conflicts banner */}
            {conflicts.length > 0 ? (
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
                        {c.conflict === "capacity"
                          ? "Capacity"
                          : c.conflict === "lecturer"
                          ? "Lecturer double-booking"
                          : c.conflict === "availability"
                          ? "Availability"
                          : "Venue clash"}
                      </Pill>
                      <span className="text-[13.5px] font-semibold text-ink">{c.code}</span>
                      <span className="text-[13px] text-muted">
                        {c.venue} · {c.day} {c.slot}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-good/30 bg-good-soft/30 px-5 py-4">
                <CheckCircle2 size={18} className="text-good shrink-0" />
                <p className="text-[13px] font-medium text-subink">
                  <strong>Timetable Verification Complete:</strong> All {deptSessions.length} classes have valid classrooms, free lecturers, and zero schedule clashes.
                </p>
              </div>
            )}

            {/* Session list */}
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

          {/* Right: decision and approval actions */}
          <div className="flex flex-col gap-5">
            <Card>
              <CardHead title="Submission note" sub={`From ${deptTO}`} />
              <div className="px-5 pb-5">
                <div className="flex items-start gap-3 rounded-xl bg-panel px-4 py-3.5">
                  <MessageSquare size={15} className="mt-0.5 shrink-0 text-muted" />
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{deptTO}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-subink">
                      Timetable generated and verified with 0 clashes. Resubmitting {selectedDept} draft for HOD review.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardHead title="Your decision" sub="As Head of Department" />
              <div className="px-5 pb-5">
                {conflicts.length > 0 && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl bg-warn-soft/60 px-3.5 py-3">
                    <AlertTriangle size={14} className="shrink-0 text-warn mt-0.5" />
                    <p className="text-[12px] leading-snug text-subink">
                      {conflicts.length} unresolved conflict{conflicts.length > 1 ? "s" : ""} present. Resolve before approval.
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
                      className="w-full bg-bad hover:bg-red-700 cursor-pointer"
                      onClick={() => setConfirmAction("return")}
                      disabled={!returnNote.trim() || isProcessing}
                    >
                      {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Confirm Return to {deptTO}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full cursor-pointer"
                      onClick={() => setMode("idle")}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <Button className="w-full cursor-pointer" onClick={() => setConfirmAction("approve")} disabled={isProcessing}>
                      {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Approve & forward to Dean
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full cursor-pointer"
                      onClick={() => setMode("returning")}
                      disabled={isProcessing}
                    >
                      <RotateCcw size={13} /> Return to Dept T.O
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHead title="Approval routing" sub="Governance lifecycle" />
              <div className="space-y-2 px-5 pb-5 text-[13px]">
                {[
                  ["Approve", `Forwarded to ${deanName} (Dean) for school sign-off`, "good"],
                  ["Return", `Draft returned to ${deptTO} for adjustments`, "bad"],
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

      {/* Confirmation Modals for HOD Decisions */}
      <ConfirmationModal
        isOpen={confirmAction === "approve"}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleApprove}
        isLoading={isProcessing}
        title={`Approve ${selectedDept} Timetable`}
        description={`Are you sure you want to approve this timetable? As Head of Department, your sign-off forwards the schedule to ${deanName} (Dean) for school approval.`}
        confirmText="Approve & Forward"
        variant="primary"
      />

      <ConfirmationModal
        isOpen={confirmAction === "return"}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleReturn}
        isLoading={isProcessing}
        title={`Return ${selectedDept} Timetable`}
        description={`Are you sure you want to return this draft to ${deptTO}? The Departmental T.O will be notified to adjust the schedule based on your feedback.`}
        confirmText="Confirm Return"
        variant="destructive"
      >
        {returnNote.trim() && (
          <div className="rounded-xl border border-line bg-panel p-3 text-[13px] text-subink">
            <p className="font-semibold text-muted text-[11px] uppercase tracking-[0.06em] mb-1">Return note</p>
            <p className="italic">{returnNote}</p>
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
}
