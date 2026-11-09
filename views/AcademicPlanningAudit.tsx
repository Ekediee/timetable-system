"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Globe,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  Clock,
  Building2,
  Calendar,
  FileText,
  Sliders,
} from "lucide-react";
import { Card, CardHead, Pill, DataUnavailableState, Skeleton, CardSkeleton, TableSkeleton, TimelineSkeleton } from "../components/ui";
import { type AuditEntry, type DeptSubmission, department, isApprovedByDean, deduplicateAuditEntries } from "../lib/data";
import { useApp } from "../lib/AppContext";

type AuditFilter = "all" | "approved" | "returned" | "published";

type ActionConfig = {
  label: string;
  tone: "brand" | "good" | "bad" | "warn" | "violet" | "muted";
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const actionConfig: Record<string, ActionConfig> = {
  published: { label: "Published", tone: "brand", Icon: Globe },
  approved: { label: "Approved", tone: "good", Icon: CheckCircle2 },
  returned: { label: "Returned", tone: "bad", Icon: RotateCcw },
  created_venue: { label: "Venue Added", tone: "brand", Icon: Building2 },
  updated_venue: { label: "Venue Configured", tone: "violet", Icon: Building2 },
  deleted_venue: { label: "Venue Removed", tone: "bad", Icon: Building2 },
  created_departmental_event: { label: "Event Milestone", tone: "warn", Icon: Calendar },
  updated_time_locks: { label: "Time Locks Updated", tone: "warn", Icon: Sliders },
};

const toneClasses: Record<string, string> = {
  brand: "bg-brand-soft text-brand",
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  warn: "bg-warn-soft text-warn",
  violet: "bg-violet-soft text-violet",
  muted: "bg-panel text-muted",
};

function getActionConfig(action?: string): ActionConfig {
  if (!action) {
    return { label: "Activity", tone: "muted", Icon: FileText };
  }
  const key = action.toLowerCase();
  if (actionConfig[key]) {
    return actionConfig[key];
  }

  const label = action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  if (key.includes("venue")) {
    return { label, tone: key.includes("delete") ? "bad" : "brand", Icon: Building2 };
  }
  if (key.includes("event") || key.includes("calendar")) {
    return { label, tone: "warn", Icon: Calendar };
  }
  if (key.includes("time") || key.includes("lock")) {
    return { label, tone: "warn", Icon: Sliders };
  }
  if (key.includes("approve")) {
    return { label, tone: "good", Icon: CheckCircle2 };
  }
  if (key.includes("return") || key.includes("reject")) {
    return { label, tone: "bad", Icon: RotateCcw };
  }
  if (key.includes("publish")) {
    return { label, tone: "brand", Icon: Globe };
  }

  return { label, tone: "muted", Icon: FileText };
}

export default function AcademicPlanningAudit(props?: {
  submissions?: DeptSubmission[];
  auditEntries?: AuditEntry[];
}) {
  const context = useApp();
  const submissions = props?.submissions ?? context.deptSubs;
  const auditEntries = deduplicateAuditEntries(props?.auditEntries ?? context.auditEntries);
  const [filter, setFilter] = useState<AuditFilter>("all");
  const [loading, setLoading] = useState(!context.auditLogsLoaded);

  useEffect(() => {
    if (!context.auditLogsLoaded) {
      setLoading(true);
      context
        .refreshAuditLogs()
        .catch((e) => console.warn("Could not fetch audit logs:", e))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [context.auditLogsLoaded, context.refreshAuditLogs]);

  // Academic Planning only receives audit logs that concern Academic Planning directly.
  // Internal departmental/HOD approval lifecycle before reaching Academic Planning is excluded.
  const approvedDeptSet = useMemo(() => {
    return new Set(
      (submissions || [])
        .filter((s) => isApprovedByDean(s.rawStatus || s.status))
        .map((s) => s.department.toLowerCase().trim()),
    );
  }, [submissions]);

  const visibleAuditEntries = useMemo(() => {
    return (auditEntries || []).filter((entry) => {
      const note = (entry.note || "").toLowerCase();
      const action = (entry.action || "").toLowerCase();
      const actor = (entry.actor || "").toLowerCase();
      const dept = (entry.department || "").toLowerCase().trim();

      // 1. Exclude all internal approval processes that occurred before reaching Academic Planning:
      // (Dept TO draft generation, submission to HOD, HOD review, HOD return, submission to Dean)
      if (
        note.includes("submitted to hod") ||
        note.includes("submitted to dean") ||
        note.includes("draft generated") ||
        note.includes("draft submitted") ||
        note.includes("hod review") ||
        note.includes("hod approved") ||
        note.includes("returned to dept") ||
        note.includes("returned to hod")
      ) {
        return false;
      }

      // 2. Central institutional configurations (venues, campus time locks, constraint types)
      if (!dept || dept.includes("academic planning")) {
        return true;
      }

      // 3. For departmental logs, department must have reached Academic Planning (Dean-approved / published)
      if (approvedDeptSet.size > 0 && !approvedDeptSet.has(dept)) {
        return false;
      }

      // 4. Submission arrival at Academic Planning (Dean sign-off forwarded to Academic Planning)
      if (
        note.includes("submitted to acad pl") ||
        note.includes("academic planning") ||
        note.includes("forwarded to academic planning") ||
        note.includes("dean sign-off") ||
        note.includes("dean approved")
      ) {
        return true;
      }

      // 5. Final publishing decisions
      if (action === "published") {
        return true;
      }

      // 6. Returns from Academic Planning
      if (action === "returned") {
        return (
          actor.includes("academic planning") ||
          actor.includes("planning") ||
          actor.includes("admin") ||
          note.includes("academic planning") ||
          note.includes("acad pl")
        );
      }

      // 7. Any action performed by Academic Planning or Admin actors
      if (
        actor.includes("academic planning") ||
        actor.includes("planning") ||
        actor.includes("admin")
      ) {
        return true;
      }

      // If generic "approved", only show if it relates to Academic Planning approval
      if (action === "approved") {
        return note.includes("acad") || note.includes("planning");
      }

      return false;
    });
  }, [auditEntries, approvedDeptSet]);

  if (loading && !context.auditLogsLoaded) {
    return (
      <div className="bp-fade flex flex-col gap-5">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <CardSkeleton count={4} />
        <TimelineSkeleton count={6} />
      </div>
    );
  }

  if (!submissions || !auditEntries) return null;

  if (visibleAuditEntries.length === 0 && !context.isLoadingBackend && !loading) {
    return (
      <DataUnavailableState
        tone="neutral"
        title="Audit trail empty"
        description="No timetable governance decisions concerning Academic Planning have been recorded yet."
      />
    );
  }

  const counts = {
    all: visibleAuditEntries.length,
    approved: visibleAuditEntries.filter((e) => e.action === "approved").length,
    returned: visibleAuditEntries.filter((e) => e.action === "returned").length,
    published: visibleAuditEntries.filter((e) => e.action === "published").length,
  };

  const filtered =
    filter === "all" ? visibleAuditEntries : visibleAuditEntries.filter((e) => e.action === filter);

  const tabs: { id: AuditFilter; label: string }[] = [
    { id: "all", label: "All decisions" },
    { id: "published", label: "Published" },
    { id: "approved", label: "Approved" },
    { id: "returned", label: "Returned" },
  ];

  const pendingCount = submissions.filter(
    (s) => s.status === "pending" && isApprovedByDean(s.rawStatus || s.status),
  ).length;

  return (
    <div className="bp-fade grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* Main: decision log */}
      <div className="xl:col-span-2 flex flex-col gap-5">
        <Card>
          <CardHead
            icon={<Clock size={16} />}
            title="Decision log"
            sub={`${visibleAuditEntries.length} decision${visibleAuditEntries.length !== 1 ? "s" : ""} recorded this semester`}
          />

          <div className="flex gap-1 border-b border-line px-5 pb-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  filter === t.id ? "bg-panel text-ink" : "text-muted hover:text-subink"
                }`}
              >
                {t.label}
                {counts[t.id] > 0 && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                      filter === t.id ? "bg-line text-subink" : "bg-line-soft text-muted"
                    }`}
                  >
                    {counts[t.id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="px-5 py-4">
            {filtered.length === 0 && (
              <p className="py-8 text-center text-[13.5px] text-muted">
                No decisions of this type yet.
              </p>
            )}
            {filtered.map((entry, i) => {
              const cfg = getActionConfig(entry.action);
              const toneClass = toneClasses[cfg.tone] || toneClasses.muted;
              return (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}
                    >
                      <cfg.Icon size={16} />
                    </span>
                    {i < filtered.length - 1 && (
                      <span className="my-1 w-px flex-1 bg-line" />
                    )}
                  </div>

                  <div className="flex-1 pb-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={cfg.tone}>
                        <cfg.Icon size={10} /> {cfg.label}
                      </Pill>
                      {entry.department && (
                        <p className="text-[14px] font-semibold text-ink">
                          {entry.department}
                        </p>
                      )}
                      {entry.level && (
                        <span className="text-[13px] text-muted">{entry.level}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {entry.actor || "Official"} · {entry.school || "University"} · {entry.at || "Recently"}
                    </p>
                    {entry.note && (
                      <div className="mt-2.5 flex gap-2 rounded-xl border border-line bg-panel px-3.5 py-3">
                        <MessageSquare size={13} className="mt-0.5 shrink-0 text-muted" />
                        <p className="text-[12.5px] leading-relaxed text-subink">
                          {entry.note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Right: summary sidebar */}
      <div className="flex flex-col gap-5">
        <Card>
          <CardHead
            title="Decision summary"
            sub={`${department.semester} ${department.session}`}
          />
          <div className="space-y-2.5 px-5 pb-5">
            {[
              { label: "Timetables published", value: counts.published, color: "text-brand" },
              { label: "Approved (not published)", value: counts.approved, color: "text-good" },
              { label: "Returned for revision", value: counts.returned, color: "text-bad" },
              { label: "Pending review", value: pendingCount, color: "text-warn" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-line-soft pb-2.5 last:border-0 last:pb-0"
              >
                <span className="text-[13px] text-muted">{label}</span>
                <span className={`text-[15px] font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="Semester progress" sub="Departments processed" />
          <div className="px-5 pb-5">
            <div className="mb-2 flex justify-between text-[12.5px]">
              <span className="text-muted">Published</span>
              <span className="font-semibold text-ink">
                {counts.published} of {submissions.length}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-brand transition-all duration-700"
                style={{
                  width: submissions.length
                    ? `${(counts.published / submissions.length) * 100}%`
                    : "0%",
                }}
              />
            </div>
            <p className="mt-2 text-[11.5px] text-muted">
              {submissions.length - counts.published} departments remaining
            </p>

            <div className="mt-4 space-y-2">
              {Array.from(new Set(submissions.map((s) => s.school))).map((school) => {
                const schoolSubs = submissions.filter((s) => s.school === school);
                const done = schoolSubs.filter((s) => s.status === "published").length;
                const shortName = school
                  .replace("School of ", "")
                  .replace("College of ", "");
                return (
                  <div key={school}>
                    <div className="mb-1 flex justify-between text-[11.5px]">
                      <span className="truncate text-muted max-w-[160px]">{shortName}</span>
                      <span className="font-semibold text-subink">
                        {done}/{schoolSubs.length}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-good transition-all"
                        style={{
                          width: schoolSubs.length
                            ? `${(done / schoolSubs.length) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="Return routing" sub="Where a return goes" />
          <div className="space-y-2.5 px-5 pb-5 text-[13px]">
            {[
              ["Acad Pl. T.O returns", "→ HOD for re-review", "warn"],
              ["HOD returns", "→ Dept T.O to revise", "bad"],
              ["Dean returns", "→ HOD for re-review", "brand"],
            ].map(([a, b, tone]) => (
              <div
                key={String(a)}
                className="flex items-center justify-between border-b border-line-soft pb-2.5 last:border-0 last:pb-0"
              >
                <span className="text-muted">{a}</span>
                <Pill tone={tone}>{b}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
