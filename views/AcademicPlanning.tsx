"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Card, CardHead, Pill, Button, DataUnavailableState, Skeleton, CardSkeleton, TableSkeleton, ConfirmationModal } from "../components/ui";
import TimetableModal from "../components/TimetableModal";
import { type DeptSubmission, type AuditEntry, department, isApprovedByDean } from "../lib/data";
import { useApp } from "../lib/AppContext";
import { workflowApi } from "../lib/api";
import { CURRENT_SESSION, CURRENT_SEMESTER } from "../lib/config";
import { toast } from "../components/Toast";

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

function initials(name?: string | null) {
  if (!name) return "AP";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AP";
  return parts
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function Avatar({ name, tone = "brand" }: { name?: string | null; tone?: string }) {
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
  const context = useApp();
  const acadPlannerName = context.currentUser?.name || "Academic Planning";

  const steps = [
    { label: "Dept T.O", name: sub.deptTO || "Dept T.O", done: true },
    { label: "HOD", name: sub.hod || "HOD", done: true },
    { label: "Dean", name: sub.dean || "Dean", done: true },
    {
      label: "Acad Pl. T.O",
      name: acadPlannerName,
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
        const shortName = step.name
          ? (step.name.trim().split(/\s+/).slice(-1)[0] || step.label)
          : step.label;

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
              {shortName}
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
          <Avatar name={sub.dean || "Dean"} tone="good" />
          <div>
            <p className="text-[12.5px] font-semibold text-ink">{sub.dean || "School Dean"}</p>
            <p className="text-[11.5px] text-muted">Dean · signed {sub.deanSignedAt || "Recently"}</p>
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
          <div className="rounded-xl border border-good/20 bg-good-soft/40 px-3.5 py-3 space-y-2.5">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-good mb-0.5">
                Approved — ready to publish
              </p>
              <p className="text-[12.5px] text-subink">
                This timetable has been approved by Academic Planning. You can publish it directly to the master schedule.
              </p>
            </div>
            <Button
              variant="primary"
              className="w-full text-[12.5px] gap-2"
              onClick={() => onApprove(sub.id, true)}
            >
              <Globe size={13} /> Publish to Master Schedule
            </Button>
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

export default function AcademicPlanning(props?: {
  submissions?: DeptSubmission[];
  setSubmissions?: React.Dispatch<React.SetStateAction<DeptSubmission[]>>;
  onAuditEntry?: (entry: Omit<AuditEntry, "id" | "actor" | "at">) => void;
}) {
  const context = useApp();

  const rawSubmissions = props?.submissions ?? context.deptSubs;
  const setSubmissions = props?.setSubmissions ?? context.setDeptSubs;
  const onAuditEntry = props?.onAuditEntry ?? context.addAuditEntry;

  // Double-layer defense: Academic Planning queue displays ONLY Dean-approved schedules
  const submissions = useMemo(() => {
    return (rawSubmissions || []).filter((s) =>
      isApprovedByDean(s.rawStatus || s.status),
    );
  }, [rawSubmissions]);

  const isPlanningDashboard =
    context.dashboardData?.role === "acadPlanningTO" ||
    context.dashboardData?.role === "superAdmin";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<
    | { type: "approve"; sub: DeptSubmission; publish: boolean }
    | { type: "return"; sub: DeptSubmission; comment: string }
    | { type: "bulk"; publish: boolean; count: number }
    | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(
    !context.submissionsLoaded && !isPlanningDashboard,
  );

  useEffect(() => {
    if (context.submissionsLoaded || isPlanningDashboard) {
      setLoading(false);
      return;
    }
    setLoading(true);
    context
      .refreshSubmissions()
      .catch((e) => console.warn("Could not fetch submissions from DB:", e))
      .finally(() => setLoading(false));
  }, [context.submissionsLoaded, isPlanningDashboard, context.refreshSubmissions]);

  if (loading && !context.submissionsLoaded) {
    return (
      <div className="bp-fade flex flex-col gap-5">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <CardSkeleton count={4} />
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <Skeleton className="h-9 w-64 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
          <TableSkeleton rows={6} cols={5} />
        </div>
      </div>
    );
  }

  if (!submissions) return null;

  if (submissions.length === 0 && !context.isLoadingBackend && !loading) {
    return (
      <DataUnavailableState
        tone="neutral"
        title="No academic planning submissions received"
        description="There are currently no departmental timetable submissions awaiting review from academic units. Submissions appear here after School Dean sign-off."
      />
    );
  }

  const selected = submissions.find((s) => s.id === selectedId) ?? null;

  function handleApprove(id: string, publish: boolean) {
    const sub = submissions.find((s) => s.id === id);
    if (!sub) return;
    setConfirmDialog({ type: "approve", sub, publish });
  }

  function handleReturn(id: string, comment: string) {
    const sub = submissions.find((s) => s.id === id);
    if (!sub) return;
    setConfirmDialog({ type: "return", sub, comment });
  }

  function handleBulkAction(publish: boolean) {
    const toProcess = submissions.filter(
      (s) => selectedIds.has(s.id) && s.status === "pending",
    );
    if (toProcess.length === 0) return;
    setConfirmDialog({ type: "bulk", publish, count: toProcess.length });
  }

  async function executeConfirm() {
    if (!confirmDialog) return;
    setIsProcessing(true);

    try {
      if (confirmDialog.type === "approve") {
        const { sub, publish } = confirmDialog;
        const at = stamp();
        const newStatus = publish ? ("published" as const) : ("approved" as const);

        if (publish) {
          await workflowApi.academicPlanningApprove(sub.department, true, CURRENT_SEMESTER, CURRENT_SESSION);
          const res = await context.updateTimetableStatus("Published", undefined, sub.department, { skipBackendApi: true });
          if (!res.success) {
            return;
          }
        } else {
          await workflowApi.academicPlanningApprove(sub.department, false, CURRENT_SEMESTER, CURRENT_SESSION);
          const res = await context.updateTimetableStatus("Approved", undefined, sub.department, { skipBackendApi: true });
          if (!res.success) {
            return;
          }
        }

        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === sub.id
              ? { ...s, status: newStatus, ...(publish ? { publishedAt: at } : {}) }
              : s,
          ),
        );
        setSelectedId(null);
        await context.refreshWorkflowAndAudit();
      } else if (confirmDialog.type === "return") {
        const { sub, comment } = confirmDialog;
        const res = await context.updateTimetableStatus("Draft generated", comment, sub.department);
        if (!res.success) {
          return;
        }

        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === sub.id ? { ...s, status: "returned" as const, returnComment: comment } : s,
          ),
        );
        onAuditEntry({
          action: "returned",
          department: sub.department,
          school: sub.school,
          level: sub.level || "All Levels",
          note: comment,
        });
        setSelectedId(null);
        await context.refreshWorkflowAndAudit();
      } else if (confirmDialog.type === "bulk") {
        const { publish } = confirmDialog;
        const at = stamp();
        const newStatus = publish ? ("published" as const) : ("approved" as const);
        const toProcess = submissions.filter(
          (s) => selectedIds.has(s.id) && s.status === "pending",
        );

        const succeededIds = new Set<string>();
        const failedDepts: string[] = [];

        for (const s of toProcess) {
          try {
            await workflowApi.academicPlanningApprove(
              s.department,
              publish,
              CURRENT_SEMESTER,
              CURRENT_SESSION,
            );
            const res = await context.updateTimetableStatus(
              publish ? "Published" : "Approved",
              undefined,
              s.department,
              { skipBackendApi: true }
            );
            if (!res.success) {
              failedDepts.push(s.department);
              continue;
            }

            succeededIds.add(s.id);
          } catch (err: any) {
            console.warn(`Bulk action failed for ${s.department}:`, err);
            failedDepts.push(s.department);
          }
        }

        if (succeededIds.size > 0) {
          setSubmissions((prev) =>
            prev.map((s) =>
              succeededIds.has(s.id)
                ? { ...s, status: newStatus, ...(publish ? { publishedAt: at } : {}) }
                : s,
            ),
          );
          toast.success(
            publish
              ? `Published ${succeededIds.size} department timetable${succeededIds.size > 1 ? "s" : ""}.`
              : `Approved ${succeededIds.size} department timetable${succeededIds.size > 1 ? "s" : ""}.`
          );
        }

        if (failedDepts.length > 0) {
          toast.error(
            `Failed to ${publish ? "publish" : "approve"} ${failedDepts.length} department${failedDepts.length > 1 ? "s" : ""}: ${failedDepts.join(", ")}.`
          );
        }

        setSelectedIds((prev) => {
          const next = new Set(prev);
          succeededIds.forEach((id) => next.delete(id));
          return next;
        });
        setSelectedId(null);
        await context.refreshWorkflowAndAudit();
      }
    } catch (err: any) {
      toast.error(err?.message || "Action failed.");
    } finally {
      setIsProcessing(false);
      setConfirmDialog(null);
    }
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
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      (s.department || "").toLowerCase().includes(q) ||
      (s.school || "").toLowerCase().includes(q) ||
      (s.dean || "").toLowerCase().includes(q);
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
            {department.semester} {department.session} · {counts.pending} submission{counts.pending !== 1 ? "s" : ""} awaiting review
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
                          <Avatar name={sub.dean || "Dean"} tone="violet" />
                          <span className="text-[12px] text-muted">
                            {sub.dean || "School Dean"} · {sub.deanSignedAt || "Recently"}
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

      {/* Confirmation Modal for Academic Planning Decisions */}
      <ConfirmationModal
        isOpen={confirmDialog !== null}
        onClose={() => {
          if (!isProcessing) setConfirmDialog(null);
        }}
        onConfirm={executeConfirm}
        isLoading={isProcessing}
        title={
          confirmDialog?.type === "approve"
            ? confirmDialog.publish
              ? `Publish ${confirmDialog.sub.department} Timetable`
              : `Approve ${confirmDialog.sub.department} Timetable`
            : confirmDialog?.type === "return"
            ? `Return ${confirmDialog.sub.department} Timetable`
            : confirmDialog?.type === "bulk"
            ? `${confirmDialog.publish ? "Publish" : "Approve"} ${confirmDialog.count} Timetables`
            : "Confirm Action"
        }
        description={
          confirmDialog?.type === "approve" ? (
            confirmDialog.publish ? (
              <span>
                Are you sure you want to <strong>publish</strong> the{" "}
                <strong>{confirmDialog.sub.department}</strong> timetable to the master schedule? This will make the timetable live across the university.
              </span>
            ) : (
              <span>
                Are you sure you want to <strong>approve</strong> the{" "}
                <strong>{confirmDialog.sub.department}</strong> timetable? It will be marked as cleared by Academic Planning.
              </span>
            )
          ) : confirmDialog?.type === "return" ? (
            <span>
              Are you sure you want to return the <strong>{confirmDialog.sub.department}</strong> timetable? The department will be notified to adjust and resubmit.
            </span>
          ) : confirmDialog?.type === "bulk" ? (
            <span>
              Are you sure you want to {confirmDialog.publish ? "publish" : "approve"} all{" "}
              <strong>{confirmDialog.count}</strong> selected pending departmental submissions?
            </span>
          ) : undefined
        }
        confirmText={
          confirmDialog?.type === "approve"
            ? confirmDialog.publish
              ? "Publish to Master Schedule"
              : "Approve Timetable"
            : confirmDialog?.type === "return"
            ? "Confirm Return"
            : confirmDialog?.type === "bulk"
            ? confirmDialog.publish
              ? `Publish (${confirmDialog.count})`
              : `Approve (${confirmDialog.count})`
            : "Confirm"
        }
        variant={confirmDialog?.type === "return" ? "destructive" : "primary"}
      >
        {confirmDialog?.type === "return" && confirmDialog.comment && (
          <div className="rounded-xl border border-line bg-panel p-3 text-[13px] text-subink">
            <p className="font-semibold text-muted text-[11px] uppercase tracking-[0.06em] mb-1">Feedback note</p>
            <p className="italic">{confirmDialog.comment}</p>
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
}
