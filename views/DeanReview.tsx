"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
  Loader2,
} from "lucide-react";
import {
  Card,
  CardHead,
  Pill,
  Button,
  ConfirmationModal,
  DataUnavailableState,
  DeanReviewSkeleton,
} from "../components/ui";
import {
  department,
  accounts,
  DEPARTMENT_SCHOOL_MAP,
  isApprovedByHOD,
  type Status,
  type Session,
  type TimelineStep,
  deduplicateTimeline,
} from "../lib/data";
import { useApp } from "../lib/AppContext";
import { workflowApi } from "../lib/api";
import { CURRENT_SESSION, CURRENT_SEMESTER } from "../lib/config";
import ReviewRequirements from "../components/ReviewRequirements";
import { toast } from "../components/Toast";

export default function DeanReview(props?: {
  status?: Status;
  setStatus?: (s: Status) => void;
  localSessions?: Session[];
  localTimeline?: TimelineStep[];
  setLocalTimeline?: (t: TimelineStep[]) => void;
}) {
  const context = useApp();
  const userSchool = context.currentUser?.school || "";
  const deanDashboard =
    context.dashboardData?.role === "dean" ? context.dashboardData : null;

  const [liveSubmissions, setLiveSubmissions] = useState<any[]>(() => {
    if (deanDashboard?.departments) {
      return deanDashboard.departments.map((dept) => ({
        id: dept.department,
        department: dept.department,
        school: deanDashboard.school,
        level: "All Levels",
        semester: CURRENT_SEMESTER,
        deptTO: dept.deptTO?.name || "",
        hod: dept.hod?.name || "",
        dean: context.currentUser?.name || "",
        deanSignedAt: "",
        courses: dept.coursesCount,
        units: dept.coursesCount * 3,
        conflicts: dept.conflictsCount,
        status:
          dept.stage === "approved"
            ? "approved"
            : dept.stage === "ready_for_dean"
            ? "pending"
            : "returned",
        rawStatus: dept.status,
        sessions: dept.sessions || [],
      }));
    }
    return [];
  });
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineStep[]>(() => {
    if (deanDashboard?.departments?.[0]?.timeline) {
      return deanDashboard.departments[0].timeline;
    }
    return [];
  });
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(
    !deanDashboard?.departments || deanDashboard.departments.length === 0,
  );
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  const loadLiveSubmissions = useCallback(
    async (silent = false) => {
      // Unified GET /api/v1/dashboard provides full department submissions & timelines.
      // Use pre-aggregated data to eliminate redundant network calls.
      if (deanDashboard?.departments && deanDashboard.departments.length > 0) {
        setLiveSubmissions(deanDashboard.departments);
        setIsLoadingSubmissions(false);
        return;
      }
      if (!silent) setIsLoadingSubmissions(true);
      setSubmissionsError(null);
      try {
        const res = await workflowApi.getSubmissions(
          CURRENT_SESSION,
          CURRENT_SEMESTER,
        );
        if (res && Array.isArray(res.submissions)) {
          setLiveSubmissions(res.submissions);
        } else if (!deanDashboard?.departments) {
          setLiveSubmissions([]);
        }
      } catch (e) {
        console.warn("Could not fetch submissions for Dean:", e);
        if (!deanDashboard?.departments) {
          setLiveSubmissions([]);
          setSubmissionsError(
            "The Dean review submissions could not be loaded from the backend.",
          );
        }
      } finally {
        setIsLoadingSubmissions(false);
      }
    },
    [deanDashboard],
  );

  useEffect(() => {
    if (deanDashboard?.departments && deanDashboard.departments.length > 0) {
      setLiveSubmissions(deanDashboard.departments);
      setIsLoadingSubmissions(false);
      return;
    }
    loadLiveSubmissions(Boolean(deanDashboard?.departments));
  }, [loadLiveSubmissions, deanDashboard]);

  const schoolDepartments = useMemo(() => {
    // If backend Dean bootstrap data is present, trust its department list
    if (deanDashboard?.departments && deanDashboard.departments.length > 0) {
      return deanDashboard.departments.map((d) => d.department);
    }

    const norm = (str?: string | null) => (str || "").toLowerCase().trim();
    const currentSchool = norm(userSchool);

    // Departments from backend master list strictly matching Dean's school
    const deptsFromBackend = (context.departments || [])
      .filter((d) => norm(d.school) === currentSchool)
      .map((d) => d.name);

    // Departments from local mapping strictly matching Dean's school
    const deptsFromMap = Object.entries(DEPARTMENT_SCHOOL_MAP)
      .filter(([_, sch]) => norm(sch) === currentSchool)
      .map(([d]) => d);

    // Filter live submissions belonging to Dean's school
    const deptsFromSubs = liveSubmissions
      .filter((s) => s.school && norm(s.school) === currentSchool)
      .map((s) => s.department);

    const merged = Array.from(
      new Set([...deptsFromBackend, ...deptsFromSubs, ...deptsFromMap]),
    );

    return merged.length > 0
      ? merged
      : currentSchool.includes("computing")
        ? ["Computer Science", "Software Engineering", "Information Technology"]
        : [];
  }, [userSchool, liveSubmissions, context.departments, deanDashboard]);

  const [selectedDept, setSelectedDept] = useState<string>(() => {
    if (deanDashboard?.departments?.[0]?.department) {
      return deanDashboard.departments[0].department;
    }
    const norm = (str?: string | null) => (str || "").toLowerCase().trim();
    const currentSchool = norm(userSchool);
    const match = (context.departments || []).find(
      (d) => norm(d.school) === currentSchool,
    );
    return match?.name || (currentSchool.includes("computing") ? "Computer Science" : "");
  });
  const [returnNote, setReturnNote] = useState("");
  const [mode, setMode] = useState<"idle" | "returning">("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "return" | null>(null);

  // Ensure selectedDept is in schoolDepartments once loaded
  useEffect(() => {
    if (schoolDepartments.length > 0 && (!selectedDept || !schoolDepartments.includes(selectedDept))) {
      setSelectedDept(schoolDepartments[0]);
    }
  }, [schoolDepartments, selectedDept]);

  useEffect(() => {
    if (!selectedDept) return;
    const match = deanDashboard?.departments?.find(
      (d) => d.department.toLowerCase() === selectedDept.toLowerCase(),
    );
    if (match?.timeline && match.timeline.length > 0) {
      setSelectedTimeline(match.timeline);
      return;
    }
    workflowApi
      .getTimeline(selectedDept)
      .then((res) => {
        if (res && Array.isArray(res.timeline)) {
          setSelectedTimeline(res.timeline);
        }
      })
      .catch(() => {});
  }, [selectedDept, deanDashboard]);

  if (!userSchool) {
    return (
      <DataUnavailableState
        title="No School Assigned"
        description="Your Dean account is not assigned to a school, so there are no departments that can be reviewed."
      />
    );
  }

  if (isLoadingSubmissions) {
    return <DeanReviewSkeleton />;
  }

  if (submissionsError || schoolDepartments.length === 0 || !selectedDept) {
    return (
      <DataUnavailableState
        title="Dean review data unavailable"
        description={
          submissionsError ||
          `No departments or submissions were returned for ${userSchool}.`
        }
        action={
          <Button variant="outline" onClick={() => loadLiveSubmissions()}>
            Retry Connection
          </Button>
        }
      />
    );
  }

  const isCurrentDept = selectedDept === context.currentProgram;
  const deptEntry = context.getDepartmentTimetable(selectedDept);
  const matchingSub = liveSubmissions.find(
    (s) => s.department?.toLowerCase() === selectedDept.toLowerCase()
  );

  const deptStatus: Status = matchingSub?.rawStatus
    ? (matchingSub.rawStatus as Status)
    : (deptEntry?.status ?? (isCurrentDept ? context.status : "Draft generated"));

  // Dean should not see anything about the timetable until HOD has approved
  const isHodApproved = isApprovedByHOD(deptStatus);

  const deptSessions: Session[] = isHodApproved
    ? matchingSub && Array.isArray(matchingSub.sessions) && matchingSub.sessions.length > 0
      ? matchingSub.sessions
      : (deptEntry?.sessions ?? (isCurrentDept ? context.localSessions : []))
    : [];

  const deptTimeline: TimelineStep[] = isHodApproved
    ? deduplicateTimeline(selectedTimeline.length > 0 ? selectedTimeline : (deptEntry?.timeline ?? context.localTimeline))
    : [];

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
  const deptTO = matchingSub?.deptTO || matchingTO?.name || "Not assigned";
  const hodName = matchingSub?.hod || matchingHOD?.name || "Not assigned";

  async function handleApprove() {
    setIsProcessing(true);
    try {
      await workflowApi.deanApprove(selectedDept, CURRENT_SEMESTER, CURRENT_SESSION);
      await context.updateTimetableStatus("Submitted to Acad Pl. T.O", undefined, selectedDept, { skipBackendApi: true });
      setConfirmAction(null);
      await loadLiveSubmissions();
      const tlRes = await workflowApi.getTimeline(selectedDept);
      if (tlRes && Array.isArray(tlRes.timeline)) setSelectedTimeline(deduplicateTimeline(tlRes.timeline));
    } catch (err: any) {
      toast.error(err?.message || "Failed approving submission as Dean.");
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
      await workflowApi.deanReject(selectedDept, returnNote, CURRENT_SEMESTER, CURRENT_SESSION);
      await context.updateTimetableStatus("Draft generated", returnNote, selectedDept, { skipBackendApi: true });
      setMode("idle");
      setReturnNote("");
      setConfirmAction(null);
      await loadLiveSubmissions();
      const tlRes = await workflowApi.getTimeline(selectedDept);
      if (tlRes && Array.isArray(tlRes.timeline)) setSelectedTimeline(deduplicateTimeline(tlRes.timeline));
    } catch (err: any) {
      toast.error(err?.message || "Failed returning submission as Dean.");
    } finally {
      setIsProcessing(false);
    }
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
              const sub = liveSubmissions.find((s) => s.department?.toLowerCase() === dept.toLowerCase());
              const entry = context.getDepartmentTimetable(dept);
              const statusVal = sub?.rawStatus || entry?.status || (dept === context.currentProgram ? context.status : "Draft generated");
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
                    {isReadyForDean ? "Ready for Dean" : isApproved ? "Approved" : "Awaiting HOD"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 pr-2 text-[12px] text-muted">
          <GraduationCap size={15} className="text-good" />
          <span>Dean Review · {userSchool}</span>
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
                  <strong>{context.currentUser?.name || "the Dean"}</strong> and is now with{" "}
                  <strong>Academic Planning</strong> for final institutional publishing.
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
              Dept T.O: {deptTO} · HOD: {hodName}
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
                sub={`${matchingSub?.level || department.level} · ${matchingSub?.semester || "Academic period unavailable"}`}
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
                  { label: "HOD", value: hodName, Icon: Building2 },
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

            <ReviewRequirements department={selectedDept} />

            {/* HOD approval note */}
            <Card className="border-good/30">
              <CardHead title="HOD sign-off note" sub={hodName} />
              <div className="flex items-start gap-3 px-5 pb-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-bold text-brand-ink">
                  AO
                </div>
                <div className="flex-1 rounded-xl bg-good-soft/50 px-4 py-3">
                  <p className="text-[13px] font-semibold text-ink">{hodName} (HOD)</p>
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
                      className="w-full bg-bad hover:bg-red-700 cursor-pointer"
                      onClick={() => setConfirmAction("return")}
                      disabled={!returnNote.trim() || isProcessing}
                    >
                      {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Confirm Return to HOD
                    </Button>
                    <Button variant="outline" className="w-full cursor-pointer" onClick={() => setMode("idle")} disabled={isProcessing}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <Button className="w-full cursor-pointer" onClick={() => setConfirmAction("approve")} disabled={isProcessing}>
                      {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />} Approve & forward to Acad Pl. T.O
                    </Button>
                    <Button variant="outline" className="w-full cursor-pointer" onClick={() => setMode("returning")} disabled={isProcessing}>
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
                  ["Return", `Returned to ${hodName} (HOD) for revision`, "bad"],
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

      {/* Confirmation Modals for Dean Decisions */}
      <ConfirmationModal
        isOpen={confirmAction === "approve"}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleApprove}
        isLoading={isProcessing}
        title={`Approve ${selectedDept} Timetable`}
        description={`Are you sure you want to sign off on this timetable? As School Dean, your approval forwards the schedule to the Academic Planning Office for institutional publishing.`}
        confirmText="Sign Off & Forward"
        variant="primary"
      />

      <ConfirmationModal
        isOpen={confirmAction === "return"}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleReturn}
        isLoading={isProcessing}
        title={`Return ${selectedDept} Timetable`}
        description={`Are you sure you want to return this submission to ${hodName} (Head of Department)?`}
        confirmText="Confirm Return"
        variant="destructive"
      >
        {returnNote.trim() && (
          <div className="rounded-xl border border-line bg-panel p-3 text-[13px] text-subink">
            <p className="font-semibold text-muted text-[11px] uppercase tracking-[0.06em] mb-1">Return reason</p>
            <p className="italic">{returnNote}</p>
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
}
