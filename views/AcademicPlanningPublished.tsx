"use client";

import { useState } from "react";
import {
  Globe,
  Download,
  CalendarDays,
  BookOpen,
  Building2,
  CheckCircle2,
  Search,
  Send,
} from "lucide-react";
import { Card, CardHead, Pill, Button } from "../components/ui";
import TimetableModal, { exportTimetable } from "../components/TimetableModal";
import { type DeptSubmission, type AuditEntry } from "../lib/data";
import { useApp } from "../lib/AppContext";

function stamp() {
  const d = new Date();
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${month} ${day}, ${h}:${m}`;
}

export default function AcademicPlanningPublished(props?: {
  submissions?: DeptSubmission[];
  setSubmissions?: React.Dispatch<React.SetStateAction<DeptSubmission[]>>;
  onAuditEntry?: (entry: Omit<AuditEntry, "id" | "actor" | "at">) => void;
}) {
  const context = useApp();

  const submissions = props?.submissions ?? context.deptSubs;
  const setSubmissions = props?.setSubmissions ?? context.setDeptSubs;
  const onAuditEntry = props?.onAuditEntry ?? context.addAuditEntry;

  const [viewSub, setViewSub] = useState<DeptSubmission | null>(null);
  const [search, setSearch] = useState("");

  if (!submissions) return null;

  function handlePublish(id: string) {
    const sub = submissions.find((s) => s.id === id)!;
    const at = stamp();
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "published" as const, publishedAt: at } : s,
      ),
    );
    onAuditEntry({
      action: "published",
      department: sub.department,
      school: sub.school,
      level: sub.level,
    });
  }

  function handlePublishAll() {
    const at = stamp();
    const toPublish = submissions.filter((s) => s.status === "approved");
    setSubmissions((prev) =>
      prev.map((s) =>
        s.status === "approved"
          ? { ...s, status: "published" as const, publishedAt: at }
          : s,
      ),
    );
    toPublish.forEach((s) => {
      onAuditEntry({
        action: "published",
        department: s.department,
        school: s.school,
        level: s.level,
      });
    });
  }

  const visible = submissions.filter(
    (s) => s.status === "published" || s.status === "approved",
  );

  const filtered = visible.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.department.toLowerCase().includes(q) ||
      s.school.toLowerCase().includes(q) ||
      s.level.toLowerCase().includes(q)
    );
  });

  const publishedOnly = visible.filter((s) => s.status === "published");
  const approvedOnly = visible.filter((s) => s.status === "approved");
  const totalCourses = visible.reduce((a, s) => a + s.courses, 0);
  const schools = new Set(visible.map((s) => s.school)).size;

  return (
    <div className="bp-fade flex flex-col gap-5">
      {viewSub && (
        <TimetableModal sub={viewSub} onClose={() => setViewSub(null)} />
      )}

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        {[
          { value: publishedOnly.length, label: "Published", color: "text-brand" },
          { value: approvedOnly.length, label: "Approved (queued)", color: "text-good" },
          { value: totalCourses, label: "Total courses", color: "text-ink" },
          { value: schools, label: "Schools covered", color: "text-violet" },
        ].map(({ value, label, color }) => (
          <div key={label} className="flex-1 min-w-[120px] rounded-xl bg-panel px-4 py-3.5">
            <p className={`text-[26px] font-bold leading-none tracking-[-0.03em] ${color}`}>
              {value}
            </p>
            <p className="mt-2 text-[12.5px] font-medium text-muted">{label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHead
          icon={<Globe size={16} />}
          title="Published & Approved Timetables"
          sub={`First Semester 2025/26 · ${filtered.length} timetable${filtered.length !== 1 ? "s" : ""}`}
          action={
            <div className="flex items-center gap-2">
              {approvedOnly.length > 0 && (
                <Button
                  variant="primary"
                  className="h-8 px-3 text-[12.5px]"
                  onClick={handlePublishAll}
                >
                  <Send size={12} /> Publish all approved ({approvedOnly.length})
                </Button>
              )}
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-2.5 text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="h-8 w-36 rounded-lg border border-line bg-panel pl-7 pr-3 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          }
        />

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-[13.5px] text-muted">
            No timetables match this search.
          </div>
        )}

        {/* Mobile card list — hidden on sm+ */}
        <div className="divide-y divide-line-soft sm:hidden">
          {filtered.map((sub) => (
            <div key={sub.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">
                    {sub.department}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted">{sub.school}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">{sub.level}</p>
                </div>
                <div className="shrink-0">
                  {sub.status === "published" ? (
                    <div className="text-right">
                      <Pill tone="brand"><Globe size={10} /> Live</Pill>
                      {sub.publishedAt && (
                        <p className="mt-1 text-[11px] text-muted">{sub.publishedAt}</p>
                      )}
                    </div>
                  ) : (
                    <Pill tone="good"><CheckCircle2 size={10} /> Approved</Pill>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setViewSub(sub)}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[12px] font-semibold text-subink transition hover:border-brand/40 hover:bg-brand-soft/40 hover:text-brand-ink"
                >
                  <CalendarDays size={12} /> View
                </button>
                {sub.status === "approved" && (
                  <button
                    onClick={() => handlePublish(sub.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-good/40 bg-good-soft/60 px-2.5 py-1.5 text-[12px] font-semibold text-good transition hover:bg-good/10"
                  >
                    <Send size={12} /> Publish
                  </button>
                )}
                <button
                  onClick={() => exportTimetable(sub)}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[12px] font-semibold text-subink transition hover:bg-panel/80"
                >
                  <Download size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table — hidden below sm */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-[1fr_180px_100px_110px_80px_160px] items-center gap-4 border-b border-line px-5 pb-3 pt-1">
            {["Department", "School", "Level", "Status", "Courses", "Actions"].map((h) => (
              <span
                key={h}
                className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted last:text-right"
              >
                {h}
              </span>
            ))}
          </div>
          <div className="divide-y divide-line-soft">
            {filtered.map((sub) => (
              <div
                key={sub.id}
                className="grid grid-cols-[1fr_180px_100px_110px_80px_160px] items-center gap-4 px-5 py-4 transition hover:bg-panel/50"
              >
                <div>
                  <p className="text-[14px] font-semibold text-ink">{sub.department}</p>
                  <p className="text-[11.5px] text-muted">T.O: {sub.deptTO}</p>
                </div>
                <p className="truncate text-[12.5px] text-subink">{sub.school}</p>
                <p className="text-[12.5px] text-subink">{sub.level}</p>
                <div>
                  {sub.status === "published" ? (
                    <div>
                      <Pill tone="brand"><Globe size={10} /> Live</Pill>
                      {sub.publishedAt && (
                        <p className="mt-1 text-[11px] text-muted">{sub.publishedAt}</p>
                      )}
                    </div>
                  ) : (
                    <Pill tone="good"><CheckCircle2 size={10} /> Approved</Pill>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-subink">
                  <BookOpen size={13} className="text-muted/60" />
                  {sub.courses}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setViewSub(sub)}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[12px] font-semibold text-subink transition hover:border-brand/40 hover:bg-brand-soft/40 hover:text-brand-ink"
                  >
                    <CalendarDays size={12} /> View
                  </button>
                  {sub.status === "approved" && (
                    <button
                      onClick={() => handlePublish(sub.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-good/40 bg-good-soft/60 px-2.5 py-1.5 text-[12px] font-semibold text-good transition hover:bg-good/10"
                    >
                      <Send size={12} /> Publish
                    </button>
                  )}
                  <button
                    onClick={() => exportTimetable(sub)}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[12px] font-semibold text-subink transition hover:bg-panel/80"
                  >
                    <Download size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHead
          icon={<Building2 size={16} />}
          title="Publishing process"
          sub="How timetables reach live status"
        />
        <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-4">
          {[
            { step: "1", label: "Dept T.O submits", desc: "Draft generated and forwarded to HOD" },
            { step: "2", label: "HOD approves", desc: "Head of Department reviews and signs off" },
            { step: "3", label: "Dean approves", desc: "School-level verification and forwarding" },
            { step: "4", label: "Acad Pl. T.O publishes", desc: "Final approval and live publication" },
          ].map(({ step, label, desc }) => (
            <div key={step} className="rounded-xl bg-panel px-4 py-3.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                {step}
              </span>
              <p className="mt-2.5 text-[13px] font-semibold text-ink">{label}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
