"use client";

import { useState } from "react";
import {
  Globe,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  Clock,
} from "lucide-react";
import { Card, CardHead, Pill } from "../components/ui";
import { type AuditEntry, type DeptSubmission } from "../lib/data";
import { useApp } from "../lib/AppContext";

type AuditFilter = "all" | "approved" | "returned" | "published";

const actionConfig = {
  published: { label: "Published", tone: "brand", Icon: Globe },
  approved: { label: "Approved", tone: "good", Icon: CheckCircle2 },
  returned: { label: "Returned", tone: "bad", Icon: RotateCcw },
};

export default function AcademicPlanningAudit(props?: {
  submissions?: DeptSubmission[];
  auditEntries?: AuditEntry[];
}) {
  const context = useApp();
  const submissions = props?.submissions ?? context.deptSubs;
  const auditEntries = props?.auditEntries ?? context.auditEntries;
  const [filter, setFilter] = useState<AuditFilter>("all");

  if (!submissions || !auditEntries) return null;

  const counts = {
    all: auditEntries.length,
    approved: auditEntries.filter((e) => e.action === "approved").length,
    returned: auditEntries.filter((e) => e.action === "returned").length,
    published: auditEntries.filter((e) => e.action === "published").length,
  };

  const filtered =
    filter === "all" ? auditEntries : auditEntries.filter((e) => e.action === filter);

  const tabs: { id: AuditFilter; label: string }[] = [
    { id: "all", label: "All decisions" },
    { id: "published", label: "Published" },
    { id: "approved", label: "Approved" },
    { id: "returned", label: "Returned" },
  ];

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <div className="bp-fade grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* Main: decision log */}
      <div className="xl:col-span-2 flex flex-col gap-5">
        <Card>
          <CardHead
            icon={<Clock size={16} />}
            title="Decision log"
            sub={`${auditEntries.length} decision${auditEntries.length !== 1 ? "s" : ""} recorded this semester`}
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
              const cfg = actionConfig[entry.action];
              return (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                        ${entry.action === "published" ? "bg-brand-soft text-brand" : ""}
                        ${entry.action === "approved" ? "bg-good-soft text-good" : ""}
                        ${entry.action === "returned" ? "bg-bad-soft text-bad" : ""}
                      `}
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
                      <p className="text-[14px] font-semibold text-ink">
                        {entry.department}
                      </p>
                      <span className="text-[13px] text-muted">{entry.level}</span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {entry.actor} · {entry.school} · {entry.at}
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
          <CardHead title="Decision summary" sub="First Semester 2025/26" />
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
