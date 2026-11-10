"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Card, CardHead, Pill, Button, CardSkeleton, TableSkeleton } from "../components/ui";
import {
  department,
  accounts,
  getParentSchool,
  type Status,
  type Session,
  type Constraint,
  type TimelineStep,
  deduplicateTimeline,
} from "../lib/data";
import { useApp } from "../lib/AppContext";

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

export default function Dashboard(props?: {
  setView?: (v: any) => void;
  status?: Status;
  localSessions?: Session[];
  localConstraints?: Constraint[];
  constraintsComplete?: boolean;
  localTimeline?: TimelineStep[];
}) {
  const router = useRouter();
  const context = useApp();

  const status = props?.status ?? context.status;
  const localSessions = props?.localSessions ?? context.localSessions;
  const localConstraints = props?.localConstraints ?? context.localConstraints;
  const constraintsComplete = props?.constraintsComplete ?? context.constraintsComplete;
  const localTimeline = deduplicateTimeline(props?.localTimeline ?? context.localTimeline);
  const allocations = context.localAllocations || [];
  const venues = context.localVenues || [];
  const deptName = context.currentUser?.department || context.currentProgram || department.name;
  const hydratedDeptRef = useRef<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);

  const isDeptTODashboard = context.dashboardData?.role === "deptTO";
  const deptTOData =
    context.dashboardData?.role === "deptTO" ? context.dashboardData : null;

  const allocatedCount =
    allocations.length > 0
      ? allocations.length
      : deptTOData
      ? deptTOData.allocationsSummary.allocatedCount
      : 0;

  const totalCourses =
    deptTOData
      ? deptTOData.allocationsSummary.totalCourses
      : allocations.length;

  const conflictCount =
    localSessions.length > 0
      ? localSessions.filter((s) => s.conflict).length
      : deptTOData
      ? deptTOData.timetable?.conflictsCount ?? 0
      : 0;

  const hasSessions =
    localSessions.length > 0 ||
    Boolean(deptTOData && (deptTOData.timetable?.sessionsCount ?? 0) > 0);

  const conflicts = localSessions.filter((s) => s.conflict);
  const rejection = localTimeline.find((t) => t.state === "rejected");
  const submitted =
    status === "Submitted to HOD" ||
    status === "Submitted to Dean" ||
    status === "Submitted to Acad Pl. T.O" ||
    status === "Published";

  const matchingHOD = accounts.find(
    (a) => a.role === "hod" && a.department?.toLowerCase() === deptName.toLowerCase()
  );
  const hodName = matchingHOD?.name || "the Department Head";

  const parentSchool = getParentSchool(deptName);
  const matchingDean = accounts.find(
    (a) => a.role === "dean" && (a.school === parentSchool || a.school?.includes(parentSchool))
  );
  const deanName = matchingDean?.name || "the School Dean";

  const approvalPct =
    status === "Published"
      ? 100
      : status === "Submitted to Acad Pl. T.O"
      ? 75
      : status === "Submitted to Dean"
      ? 50
      : status === "Submitted to HOD"
      ? 25
      : hasSessions
      ? 15
      : 0;

  const approvalLabel =
    status === "Published"
      ? "Step 4 of 4 · Master schedule published"
      : status === "Submitted to Acad Pl. T.O"
      ? "Step 3 of 4 · Awaiting Academic Planning publication"
      : status === "Submitted to Dean"
      ? `Step 2 of 4 · Awaiting ${deanName} (Dean)`
      : status === "Submitted to HOD"
      ? `Step 1 of 4 · Awaiting ${hodName} (HOD)`
      : hasSessions
      ? "Step 0 of 4 · Draft in progress"
      : "Step 0 of 4 · Timetable not yet generated";

  useEffect(() => {
    if (context.currentUser?.role !== "deptTO") return;
    if (!deptName) return;
    if (hydratedDeptRef.current === deptName) return;

    const needsHydration =
      allocations.length === 0 ||
      venues.length === 0 ||
      localConstraints.length === 0;
    if (!needsHydration) return;

    hydratedDeptRef.current = deptName;
    setIsHydrating(true);
    Promise.allSettled([
      context.refreshAllocations(deptName),
      context.refreshVenues(deptName),
      context.refreshConstraints(deptName),
    ]).finally(() => {
      setIsHydrating(false);
    });
  }, [
    context,
    deptName,
    allocations.length,
    venues.length,
    localConstraints.length,
  ]);

  if (context.isLoadingBackend && !hasSessions && allocations.length === 0 && !context.dashboardData) {
    return (
      <div className="space-y-4">
        <CardSkeleton count={4} />
        <TableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  return (
    <div className="bp-fade grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* Left / main column */}
      <div className="flex flex-col gap-5 xl:col-span-2">
        <Card>
          <CardHead
            icon={<CalendarClock size={18} />}
            title="Timetable readiness"
            sub={
              <span className="flex items-center gap-2">
                <span>{`${deptName} · ${department.level} · ${department.semester}`}</span>
                {isHydrating && (
                  <span className="inline-flex items-center gap-1.5 text-brand">
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand"
                      aria-hidden="true"
                    />
                    Syncing latest data…
                  </span>
                )}
              </span>
            }
            action={
              submitted ? (
                <Pill tone="good">
                  <Send size={12} /> Submitted
                </Pill>
              ) : (
                <Button onClick={() => (props?.setView ? props.setView("generate") : router.push("/generate"))}>
                  <Sparkles size={16} /> {hasSessions ? "Open draft" : "Generate timetable"}
                </Button>
              )
            }
          />
          <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row">
            <Stat
              label="Courses allocated"
              value={String(allocatedCount)}
              hint={totalCourses > 0 ? `${totalCourses} total courses` : "Allocations live"}
            />
            <Stat
              label="Scheduling rules active"
              value={String(localConstraints.length)}
              hint={constraintsComplete ? "Rules marked ready" : "Leaves, days off & teaching rules"}
              tone="brand"
            />
            <Stat
              label="Open conflicts"
              value={String(conflictCount)}
              hint={conflictCount === 0 ? "All clear" : "Blocking submission"}
              tone={conflictCount === 0 ? "ink" : "bad"}
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      if (props?.setView) props.setView("generate");
                      else router.push("/generate");
                    }}
                  >
                    Revise Timetable <ArrowUpRight size={15} />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => (props?.setView ? props.setView("history") : router.push("/history"))}
                  >
                    View audit trail
                  </Button>
                </div>
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
                  {status === "Published"
                    ? "Timetable Published"
                    : status === "Submitted to Acad Pl. T.O"
                    ? "Approved by Dean — Forwarded to Academic Planning"
                    : status === "Submitted to Dean"
                    ? "Approved by HOD — Forwarded to Dean"
                    : "Timetable Submitted to HOD"}
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-subink">
                  {status === "Published"
                    ? "The master timetable is approved, locked, and active campus-wide."
                    : status === "Submitted to Acad Pl. T.O"
                    ? "The schedule has passed school review and is awaiting final master publication by Academic Planning."
                    : status === "Submitted to Dean"
                    ? `The timetable has been approved by ${hodName} and is currently under school-level review by ${deanName}.`
                    : `Awaiting review and sign-off by ${hodName}. You will be notified of the decision.`}
                </p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => (props?.setView ? props.setView("history") : router.push("/history"))}
                >
                  View submission history <ArrowUpRight size={15} />
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <CardHead title="Quick actions" sub="Jump back into your workflow" />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-4">
            {[
              { label: "Allocations", icon: Users, href: "/allocations", id: "allocations" as const },
              { label: "Venues", icon: Building2, href: "/venues", id: "venues" as const },
              { label: "Constraints", icon: SlidersHorizontal, href: "/constraints", id: "constraints" as const },
              { label: "Generate", icon: Sparkles, href: "/generate", id: "generate" as const },
            ].map(({ label, icon: Icon, href, id }) => (
              <button
                key={label}
                onClick={() => (props?.setView ? props.setView(id) : router.push(href))}
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
            {localTimeline.length > 0 ? (
              localTimeline.map((s, i) => {
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
                        {s.state === "done" ? <CheckCircle2 size={14} /> : i + 1}
                      </span>
                      {i < localTimeline.length - 1 && <span className="my-0.5 w-px flex-1 bg-line" />}
                    </div>
                    <div className={`pb-4 ${i === localTimeline.length - 1 ? "pb-0" : ""}`}>
                      <p className="text-[13.5px] font-semibold text-ink">{s.action}</p>
                      <p className="text-[12px] text-muted">
                        {s.actor ? `${s.actor} · ` : ""}{s.role} · {s.at}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              [
                {
                  tier: "1. Formulation",
                  role: "Dept T.O",
                  actor: context.currentUser?.name || "Departmental T.O",
                  state: hasSessions ? ("current" as const) : ("pending" as const),
                  desc: hasSessions ? "Draft in progress" : "Not yet generated",
                },
                {
                  tier: "2. Sign-Off",
                  role: "HOD",
                  actor: hodName,
                  state: "pending" as const,
                  desc: "Awaiting submission",
                },
                {
                  tier: "3. Verification",
                  role: "Dean",
                  actor: deanName,
                  state: "pending" as const,
                  desc: "School-level review",
                },
                {
                  tier: "4. Master Publication",
                  role: "Acad Pl. T.O",
                  actor: "Academic Planning",
                  state: "pending" as const,
                  desc: "Campus master lock",
                },
              ].map((tier, i) => {
                const dot =
                  tier.state === "current"
                    ? "bg-brand text-white"
                    : "bg-line text-muted";
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${dot}`}
                      >
                        {i + 1}
                      </span>
                      {i < 3 && <span className="my-0.5 w-px flex-1 bg-line" />}
                    </div>
                    <div className={`pb-4 ${i === 3 ? "pb-0" : ""}`}>
                      <p className="text-[13.5px] font-semibold text-ink">{tier.tier}</p>
                      <p className="text-[12px] text-muted">
                        {tier.actor} · {tier.desc}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <CardHead title="Resource snapshot" />
          <div className="space-y-2.5 px-5 pb-5 text-[13px]">
            {[
              ["Venues available", `${(context.localVenues || []).length}`],
              [
                "Total seat capacity",
                `${venues.reduce((a, v) => a + v.capacity, 0)}`,
              ],
              [
                "Largest cohort",
                `${allocations.length > 0 ? Math.max(...allocations.map((a) => a.size)) : 0} students`,
              ],
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
