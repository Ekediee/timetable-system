"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  BookOpen,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  Globe,
  Filter,
  Search,
  Users,
  Building2,
  CalendarDays,
  CheckSquare,
  Square,
} from "lucide-react";
import { Card, CardHead, Pill, Button } from "../components/ui";
import TimetableModal from "../components/TimetableModal";
import { type DeptSubmission, type AuditEntry } from "../lib/data";

type FilterTab = "all" | "pending" | "approved" | "returned" | "published";

const statusConfig = {
  pending: { label: "Awaiting review", tone: "warn", Icon: Clock },
  approved: { label: "Approved", tone: "good", Icon: CheckCircle2 },
  returned: { label: "Returned", tone: "bad", Icon: XCircle },
  published: { label: "Published", tone: "brand", Icon: Globe },
};

function stamp() {
  const d = new Date();
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${month} ${day}, ${h}:${m}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function Avatar({ name, tone = "brand" }: { name: string; tone?: string }) {
  const bg: Record<string, string> = {
    brand: "bg-brand-soft text-brand-ink",
    violet: "bg-violet-soft text-violet",
    warn: "bg-warn-soft text-warn",
    good: "bg-good-soft text-good",
  };
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${bg[tone] ?? bg.brand}`}
    >
      {initials(name)}
    </span>
  );
}

function StatTile({
  value,
  label,
  color = "text-ink",
}: {
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex-1 rounded-xl border border-line bg-white px-4 py-3.5 min-w-[110px]">
      <p className={`text-[26px] font-bold leading-none tracking-[-0.03em] ${color}`}>
        {value}
      </p>
      <p className="mt-2 text-[12.5px] font-medium text-muted">{label}</p>
    </div>
  );
}

function ApprovalChain({ sub }: { sub: DeptSubmission }) {
  const steps = [
    { label: "Dept T.O", name: sub.deptTO, done: true },
    { label: "HOD", name: sub.hod, done: true },
    { label: "Dean", name: sub.dean, done: true },
    {
      label: "Acad Pl. T.O",
      name: "M. Danladi",
      done: sub.status === "approved" || sub.status === "published",
      current: sub.status === "pending",
      returned: sub.status === "returned",
    },
  ];

  return (
    <div className="flex items-start gap-0">
      {steps.map((step, i) => {
        const dotClass = step.done
          ? "bg-good text-white"
          : step.returned
            ? "bg-bad text-white"
            : step.current
              ? "bg-brand text-white"
              : "bg-line text-muted";
        return (
          <div key={i} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div
                  className={`h-px flex-1 ${step.done || step.current || step.returned ? "bg-brand/30" : "bg-line"}`}
                />
              )}
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${dotClass}`}
              >
                {step.done ? (
                  <CheckCircle2 size={14} />
                ) : step.returned ? (
                  <XCircle size={14} />
                ) : step.current ? (
                  <Clock size={13} />
                ) : (
                  i + 1
                )}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`h-px flex-1 ${steps[i + 1].done || steps[i + 1].current ? "bg-brand/30" : "bg-line"}`}
                />
              )}
            </div>
            <p className="mt-1.5 text-center text-[10.5px] font-semibold text-muted">
              {step.label}
            </p>
            <p className="text-center text-[10px] text-muted/70 leading-tight max-w-[68px] truncate">
              {step.name.split(" ").slice(-1)[0]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ReviewPanel({
  sub,
  onApprove,
  onReturn,
  onClose,
}: {
  sub: DeptSubmission;
  onApprove: (id: string, publish: boolean) => void;
  onReturn: (id: string, comment: string) => void;
  onClose: () => void;
}) {
  const [returnNote, setReturnNote] = useState(sub.returnComment ?? "");
  const [mode, setMode] = useState<"idle" | "returning">("idle");
  const [showTimetable, setShowTimetable] = useState(false);
  const cfg = statusConfig[sub.status];
  const canAct = sub.status === "pending";

  return (
    <>
      {showTimetable && (
        <TimetableModal sub={sub} onClose={() => setShowTimetable(false)} />
      )}
      <div className="flex flex-col gap-4 min-h-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold tracking-[-0.01em] text-ink">
              {sub.department}
            </p>
            <p className="text-[12.5px] text-muted mt-0.5">{sub.school}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[12px] font-medium text-muted hover:text-subink transition-colors"
          >
            ✕ Close
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Pill tone={cfg.tone}>
            <cfg.Icon size={11} /> {cfg.label}
          </Pill>
          <span className="text-[12px] text-muted">{sub.level} · {sub.semester}</span>
        </div>

        <div className="rounded-xl border border-line bg-panel px-4 py-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Approval chain
          </p>
          <ApprovalChain sub={sub} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Courses", value: sub.courses },
            { label: "Units", value: sub.units },
            { label: "Conflicts", value: sub.conflicts, warn: sub.conflicts > 0 },
          ].map(({ label, value, warn }) => (
            <div
              key={label}
              className={`rounded-xl border px-3 py-2.5 text-center ${
                warn ? "border-bad/30 bg-bad-soft/40" : "border-line bg-panel"
              }`}
            >
              <p
                className={`text-[20px] font-bold leading-none tracking-[-0.02em] ${
                  warn ? "text-bad" : "text-ink"
                }`}
              >
                {value}
              </p>
              <p className="mt-1 text-[11px] text-muted">{label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowTimetable(true)}
          className="flex w-full items-center justify-between rounded-xl border border-brand/30 bg-brand-soft/40 px-3.5 py-3 text-left transition hover:bg-brand-soft/70"
        >
          <div className="flex items-center gap-2.5">
            <CalendarDays size={15} className="text-brand" />
            <span className="text-[13px] font-semibold text-brand-ink">
              View full timetable
            </span>
          </div>
          <span className="text-[12px] text-brand/70">{sub.sessions.length} sessions →</span>
        </button>

        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-panel px-3.5 py-3">
          <Avatar name={sub.dean} tone="good" />
          <div>
            <p className="text-[12.5px] font-semibold text-ink">{sub.dean}</p>
            <p className="text-[11.5px] text-muted">Dean · signed {sub.deanSignedAt}</p>
          </div>
          <CheckCircle2 size={16} className="ml-auto shrink-0 text-good" />
        </div>

        {sub.status === "returned" && sub.returnComment && (
          <div className="rounded-xl border border-bad/20 bg-bad-soft/40 px-3.5 py-3">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-bad mb-1.5">
              Return note
            </p>
            <p className="text-[13px] leading-relaxed text-subink">
              {sub.returnComment}
            </p>
          </div>
        )}

        {sub.status === "approved" && (
          <div className="rounded-xl border border-good/20 bg-good-soft/40 px-3.5 py-3">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-good mb-1">
              Approved — ready to publish
            </p>
            <p className="text-[12.5px] text-subink">
              This timetable has been approved. Visit Published Timetables to make it live.
            </p>
          </div>
        )}

        {canAct && (
          <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-line">
            {sub.conflicts > 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-warn-soft/60 px-3.5 py-3">
                <AlertTriangle size={14} className="shrink-0 text-warn mt-0.5" />
                <p className="text-[12px] leading-snug text-subink">
                  {sub.conflicts} unresolved conflict{sub.conflicts > 1 ? "s" : ""} detected. Review before approving.
                </p>
              </div>
            )}

            {mode === "returning" ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder="State the reason for returning this timetable to the HOD…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-[13px]"
                    onClick={() => setMode("idle")}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1 text-[13px] bg-bad hover:bg-red-700"
                    onClick={() => onReturn(sub.id, returnNote)}
                    disabled={!returnNote.trim()}
                  >
                    <RotateCcw size={13} /> Return to HOD
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-[12.5px]"
                  onClick={() => setMode("returning")}
                >
                  <RotateCcw size={13} /> Return
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-[12.5px] border-good/40 text-good hover:bg-good-soft"
                  onClick={() => onApprove(sub.id, false)}
                >
                  <CheckCircle2 size={13} /> Approve
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 text-[12.5px]"
                  onClick={() => onApprove(sub.id, true)}
                >
                  <Globe size={13} /> Publish
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function AcademicPlanning({
  submissions,
  setSubmissions,
  onAuditEntry,
}: {
  submissions: DeptSubmission[];
  setSubmissions: React.Dispatch<React.SetStateAction<DeptSubmission[]>>;
  onAuditEntry: (entry: Omit<AuditEntry, "id" | "actor" | "at">) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (!submissions) return null;

  const selected = submissions.find((s) => s.id === selectedId) ?? null;

  function handleApprove(id: string, publish: boolean) {
    const sub = submissions.find((s) => s.id === id)!;
    const at = stamp();
    const newStatus = publish ? "published" as const : "approved" as const;
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: newStatus, ...(publish ? { publishedAt: at } : {}) }
          : s,
      ),
    );
    onAuditEntry({
      action: publish ? "published" : "approved",
      department: sub.department,
      school: sub.school,
      level: sub.level,
    });
    setSelectedId(null);
  }

  function handleReturn(id: string, comment: string) {
    const sub = submissions.find((s) => s.id === id)!;
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "returned" as const, returnComment: comment } : s,
      ),
    );
    onAuditEntry({
      action: "returned",
      department: sub.department,
      school: sub.school,
      level: sub.level,
      note: comment,
    });
    setSelectedId(null);
  }

  function handleBulkAction(publish: boolean) {
    const at = stamp();
    const newStatus = publish ? "published" as const : "approved" as const;
    const toProcess = submissions.filter(
      (s) => selectedIds.has(s.id) && s.status === "pending",
    );
    setSubmissions((prev) =>
      prev.map((s) =>
        selectedIds.has(s.id) && s.status === "pending"
          ? { ...s, status: newStatus, ...(publish ? { publishedAt: at } : {}) }
          : s,
      ),
    );
    toProcess.forEach((s) => {
      onAuditEntry({
        action: publish ? "published" : "approved",
        department: s.department,
        school: s.school,
        level: s.level,
      });
    });
    setSelectedIds(new Set());
    setSelectedId(null);
  }

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const counts = {
    all: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    approved: submissions.filter((s) => s.status === "approved").length,
    returned: submissions.filter((s) => s.status === "returned").length,
    published: submissions.filter((s) => s.status === "published").length,
  };

  const filtered = submissions.filter((s) => {
    const matchesTab = filterTab === "all" || s.status === filterTab;
    const matchesSearch =
      !search ||
      s.department.toLowerCase().includes(search.toLowerCase()) ||
      s.school.toLowerCase().includes(search.toLowerCase()) ||
      s.dean.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingSelected = submissions.filter(
    (s) => selectedIds.has(s.id) && s.status === "pending",
  ).length;

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "published", label: "Published" },
    { id: "returned", label: "Returned" },
  ];

  return (
    <div className="bp-fade flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-bold tracking-[-0.02em] text-ink">
            Review Queue
          </h1>
          <p className="mt-0.5 text-[13px] text-muted">
            First Semester 2025/26 · {counts.pending} submission{counts.pending !== 1 ? "s" : ""} awaiting review
          </p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <StatTile value={counts.pending} label="Pending review" color="text-warn" />
        <StatTile value={counts.approved} label="Approved" color="text-good" />
        <StatTile value={counts.published} label="Published" color="text-brand" />
        <StatTile value={counts.returned} label="Returned" color="text-bad" />
      </div>

      <div className={`grid gap-5 ${selected ? "grid-cols-1 xl:grid-cols-5" : "grid-cols-1"}`}>
        <div className={selected ? "xl:col-span-3" : ""}>
          <Card>
            <CardHead
              icon={<Filter size={16} />}
              title="Submissions"
              sub={`${filtered.length} of ${submissions.length} departments`}
            />

            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
              <div className="mx-5 mb-3 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft/40 px-4 py-2.5">
                <span className="text-[13px] font-semibold text-brand-ink">
                  {selectedIds.size} selected
                  {pendingSelected > 0 && pendingSelected < selectedIds.size && (
                    <span className="ml-1 font-normal text-muted">({pendingSelected} pending)</span>
                  )}
                </span>
                <div className="ml-auto flex gap-2">
                  <Button
                    variant="outline"
                    className="h-7 px-3 text-[12px] border-good/40 text-good hover:bg-good-soft"
                    onClick={() => handleBulkAction(false)}
                    disabled={pendingSelected === 0}
                  >
                    <CheckCircle2 size={12} /> Approve {pendingSelected > 0 ? pendingSelected : ""}
                  </Button>
                  <Button
                    variant="primary"
                    className="h-7 px-3 text-[12px]"
                    onClick={() => handleBulkAction(true)}
                    disabled={pendingSelected === 0}
                  >
                    <Globe size={12} /> Publish {pendingSelected > 0 ? pendingSelected : ""}
                  </Button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-[11.5px] text-muted hover:text-subink transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Filter tabs + search */}
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 pb-3">
              <div className="flex gap-1">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterTab(t.id)}
                    className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                      filterTab === t.id
                        ? "bg-panel text-ink"
                        : "text-muted hover:text-subink"
                    }`}
                  >
                    {t.label}
                    {counts[t.id] > 0 && (
                      <span
                        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                          filterTab === t.id ? "bg-line text-subink" : "bg-line-soft text-muted"
                        }`}
                      >
                        {counts[t.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-2.5 text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="h-8 w-44 rounded-lg border border-line bg-panel pl-7 pr-3 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="divide-y divide-line-soft">
              {filtered.length === 0 && (
                <div className="px-5 py-10 text-center">
                  <p className="text-[13.5px] text-muted">No submissions match this filter.</p>
                </div>
              )}
              {filtered.map((sub) => {
                const cfg = statusConfig[sub.status];
                const isActive = selectedId === sub.id;
                const isChecked = selectedIds.has(sub.id);
                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedId(isActive ? null : sub.id)}
                    className={`group flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors ${
                      isActive
                        ? "bg-brand-soft/30"
                        : isChecked
                          ? "bg-violet-soft/20"
                          : "hover:bg-panel/70"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => toggleSelect(sub.id, e)}
                      className="mt-1 shrink-0 text-muted hover:text-brand transition-colors"
                    >
                      {isChecked ? (
                        <CheckSquare size={16} className="text-brand" />
                      ) : (
                        <Square size={16} className="opacity-40 group-hover:opacity-100" />
                      )}
                    </button>

                    {/* Status stripe */}
                    <div
                      className={`mt-1 h-8 w-1 shrink-0 rounded-full ${
                        sub.status === "pending"
                          ? "bg-warn"
                          : sub.status === "published"
                            ? "bg-brand"
                            : sub.status === "approved"
                              ? "bg-good"
                              : "bg-bad"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-ink truncate">
                            {sub.department}
                          </p>
                          <p className="text-[12px] text-muted truncate">
                            {sub.school}
                          </p>
                        </div>
                        <Pill tone={cfg.tone} className="shrink-0 mt-0.5">
                          <cfg.Icon size={10} /> {cfg.label}
                        </Pill>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <span className="flex items-center gap-1.5 text-[12px] text-muted">
                          <Users size={12} className="text-muted/60" />
                          {sub.level}
                        </span>
                        <span className="flex items-center gap-1.5 text-[12px] text-muted">
                          <BookOpen size={12} className="text-muted/60" />
                          {sub.courses} courses · {sub.units} units
                        </span>
                        {sub.conflicts > 0 && (
                          <span className="flex items-center gap-1 text-[12px] font-semibold text-bad">
                            <AlertTriangle size={12} />
                            {sub.conflicts} conflict{sub.conflicts > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Avatar name={sub.dean} tone="violet" />
                          <span className="text-[12px] text-muted">
                            {sub.dean} · {sub.deanSignedAt}
                          </span>
                        </div>
                        <ChevronRight
                          size={15}
                          className={`text-muted transition-transform ${isActive ? "rotate-90 text-brand" : "group-hover:translate-x-0.5"}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {selected && (
          <div className="xl:col-span-2">
            <Card className="sticky top-0">
              <CardHead
                icon={<Building2 size={16} />}
                title="Review submission"
                sub="Acad Pl. T.O decision"
              />
              <div className="px-5 pb-5">
                <ReviewPanel
                  sub={selected}
                  onApprove={handleApprove}
                  onReturn={handleReturn}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
