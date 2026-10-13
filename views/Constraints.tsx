"use client";

import { useState, useMemo } from "react";
import {
  CalendarOff,
  Plane,
  UserCog,
  Plus,
  Check,
  Trash2,
  X,
  AlertCircle,
  Info,
} from "lucide-react";
import { Card, CardHead, Pill, Button } from "../components/ui";
import { type Constraint, type ConstraintKind, universityAllocations } from "../lib/data";
import { useApp } from "../lib/AppContext";

const tabs: { kind: ConstraintKind; icon: typeof Plane; tone: string }[] = [
  { kind: "Study Leave", icon: Plane, tone: "violet" },
  { kind: "Day Off", icon: CalendarOff, tone: "warn" },
  { kind: "Adjunct", icon: UserCog, tone: "brand" },
];

function AddModal({
  kind,
  availableLecturers,
  allDepartmentFaculty,
  activeAllocatedLecturers,
  onAdd,
  onClose,
}: {
  kind: ConstraintKind;
  availableLecturers: string[];
  allDepartmentFaculty: string[];
  activeAllocatedLecturers: Set<string>;
  onAdd: (c: Omit<Constraint, "id">) => void;
  onClose: () => void;
}) {
  const lecturerList = kind === "Study Leave" ? allDepartmentFaculty : availableLecturers;
  const [lecturer, setLecturer] = useState(
    kind === "Study Leave"
      ? (allDepartmentFaculty.find((l) => !activeAllocatedLecturers.has(l)) || allDepartmentFaculty[0] || "")
      : (availableLecturers[0] || "")
  );
  const [detail, setDetail] = useState(
    kind === "Study Leave"
      ? "Doctoral research fellowship (Substitute handled externally)"
      : kind === "Day Off"
        ? "Research day"
        : "Industry practitioner"
  );
  const [range, setRange] = useState(
    kind === "Study Leave"
      ? "12 Jan – 28 Feb"
      : kind === "Day Off"
        ? "Every Wed"
        : "Tue, Fri"
  );

  const isAssignedToActiveCourses = activeAllocatedLecturers.has(lecturer);

  function submit() {
    if (!lecturer.trim() || !detail.trim() || !range.trim()) return;
    onAdd({
      kind,
      lecturer: lecturer.trim(),
      detail: detail.trim(),
      range: range.trim(),
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bp-fade w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-bold text-ink">Add {kind} record</h3>
            <p className="text-[12px] text-muted mt-0.5">
              Department of Computer Science · Lecturer Availability Constraint
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {kind === "Study Leave" && (
          <div className="mb-4 rounded-xl border border-violet/30 bg-violet-soft/30 p-3 text-[12px] leading-relaxed text-ink">
            <div className="flex items-start gap-2">
              <Info size={15} className="mt-0.5 shrink-0 text-violet" />
              <div>
                <span className="font-semibold text-violet">Policy Note:</span> Lecturers assigned to active courses cannot be on study leave. For faculty members on leave, a substitute lecturer is assigned externally outside this system.
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">
                Select Department Lecturer
              </span>
              <span className="text-[11px] text-muted font-medium">
                {lecturerList.length} faculty members
              </span>
            </div>
            <select
              autoFocus
              value={lecturer}
              onChange={(e) => {
                const selected = e.target.value;
                setLecturer(selected);
                if (kind === "Study Leave" && activeAllocatedLecturers.has(selected)) {
                  setDetail("Study Leave (Substitute handled externally)");
                }
              }}
              className="w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13.5px] font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
            >
              {kind === "Study Leave" ? (
                <>
                  <optgroup label="Non-Teaching / On-Leave Faculty (Eligible)">
                    {allDepartmentFaculty
                      .filter((lec) => !activeAllocatedLecturers.has(lec))
                      .map((lec) => (
                        <option key={lec} value={lec}>
                          {lec} (On Leave / Substituted Externally)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Active Teaching Lecturers (Requires External Substitute)">
                    {allDepartmentFaculty
                      .filter((lec) => activeAllocatedLecturers.has(lec))
                      .map((lec) => (
                        <option key={lec} value={lec}>
                          {lec} [Has Active Courses]
                        </option>
                      ))}
                  </optgroup>
                </>
              ) : (
                availableLecturers.map((lec) => (
                  <option key={lec} value={lec}>
                    {lec}
                  </option>
                ))
              )}
            </select>
          </label>

          {kind === "Study Leave" && isAssignedToActiveCourses && (
            <div className="rounded-xl border border-warn/30 bg-warn-soft/40 p-2.5 text-[11.5px] text-warn-ink flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-warn" />
              <span>
                <strong>Notice:</strong> <em>{lecturer}</em> currently has courses allocated. Their classes must be covered by a substitute lecturer designated outside this system.
              </span>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">
              Detail / reason
            </span>
            <input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="e.g. Doctoral fieldwork, Research day, Sabbatical"
              className="w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">
                Date / Time Window
              </span>
              <span className="text-[11px] text-muted">
                {kind === "Day Off" ? "e.g. Every Wed, Every Fri AM" : kind === "Adjunct" ? "e.g. Tue, Fri  or  After 14:00" : "e.g. 12 Jan – 28 Feb"}
              </span>
            </div>
            <input
              value={range}
              onChange={(e) => setRange(e.target.value)}
              placeholder="e.g. Every Wed  or  Tue, Fri"
              className="w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
            />
          </label>

          {/* Quick preset chips */}
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-muted">
              Quick presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {kind === "Day Off" && (
                <>
                  <button
                    type="button"
                    onClick={() => { setRange("Every Wed"); setDetail("Weekly Research Day"); }}
                    className="rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-subink hover:border-brand transition cursor-pointer"
                  >
                    Every Wednesday
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRange("Every Fri AM"); setDetail("Hospital Clinic Duty"); }}
                    className="rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-subink hover:border-brand transition cursor-pointer"
                  >
                    Every Friday AM
                  </button>
                </>
              )}
              {kind === "Adjunct" && (
                <>
                  <button
                    type="button"
                    onClick={() => { setRange("Tue, Fri"); setDetail("Visiting Tech Practitioner"); }}
                    className="rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-subink hover:border-brand transition cursor-pointer"
                  >
                    Tue & Fri Only
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRange("After 14:00"); setDetail("Industry Consultant (Afternoons)"); }}
                    className="rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-subink hover:border-brand transition cursor-pointer"
                  >
                    After 14:00 Only
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRange("Every Wed"); setDetail("Midweek Visiting Lecturer"); }}
                    className="rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-subink hover:border-brand transition cursor-pointer"
                  >
                    Wednesdays Only
                  </button>
                </>
              )}
              {kind === "Study Leave" && (
                <>
                  <button
                    type="button"
                    onClick={() => { setRange("12 Jan – 28 Feb"); setDetail("Doctoral Research Fellowship"); }}
                    className="rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-subink hover:border-brand transition cursor-pointer"
                  >
                    Semester First Half (Jan–Feb)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRange("01 Mar – 30 Apr"); setDetail("International Sabbatical"); }}
                    className="rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-subink hover:border-brand transition cursor-pointer"
                  >
                    Semester Second Half (Mar–Apr)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-line/60 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!lecturer.trim() || !detail.trim() || !range.trim()}
          >
            <Plus size={15} /> Add {kind}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Constraints(props?: {
  localConstraints?: Constraint[];
  setLocalConstraints?:
    | React.Dispatch<React.SetStateAction<Constraint[]>>
    | ((c: Constraint[]) => void);
  constraintsComplete?: boolean;
  setConstraintsComplete?:
    | React.Dispatch<React.SetStateAction<boolean>>
    | ((v: boolean) => void);
}) {
  const context = useApp();

  const localConstraints = props?.localConstraints ?? context.localConstraints;
  const setLocalConstraints =
    props?.setLocalConstraints ?? context.setLocalConstraints;
  const constraintsComplete =
    props?.constraintsComplete ?? context.constraintsComplete;
  const setConstraintsComplete =
    props?.setConstraintsComplete ?? context.setConstraintsComplete;
  const allocations = context.localAllocations;

  // Extract all unique lecturers currently assigned to active department course allocations
  const activeAllocatedLecturers: Set<string> = useMemo(() => {
    const set = new Set<string>();
    allocations.forEach((a) => {
      if (a.lecturer && !a.lecturer.includes("Chapel Directorate")) {
        set.add(a.lecturer.trim());
      }
    });
    return set;
  }, [allocations]);

  const availableLecturers: string[] = useMemo(() => {
    return Array.from(activeAllocatedLecturers).sort();
  }, [activeAllocatedLecturers]);

  // Extract all School of Computing faculty roster (including non-teaching/on-leave faculty)
  const allDepartmentFaculty: string[] = useMemo(() => {
    const set = new Set<string>(availableLecturers);
    const computingDepts = [
      "Computer Science",
      "Software Engineering",
      "Information Technology",
      "Cyber Security",
      "Information Systems",
      "Computer Science (Technology)",
      "Computer Science (Information Systems)",
    ];
    for (const dept of computingDepts) {
      const deptAllocs = universityAllocations[dept];
      if (deptAllocs) {
        deptAllocs.forEach((a) => {
          if (a.lecturer && !a.lecturer.includes("Chapel Directorate")) {
            set.add(a.lecturer.trim());
          }
        });
      }
    }
    return Array.from(set).sort();
  }, [availableLecturers]);

  const [tab, setTab] = useState<ConstraintKind>("Study Leave");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLecturerFilter, setSelectedLecturerFilter] = useState<string>("all");

  const rows = localConstraints
    .filter((c) => c.kind === tab)
    .filter((c) => selectedLecturerFilter === "all" || c.lecturer === selectedLecturerFilter);
  const active = tabs.find((t) => t.kind === tab)!;

  function addConstraint(c: Omit<Constraint, "id">) {
    const newId = `c${Date.now()}`;
    setLocalConstraints([...localConstraints, { ...c, id: newId }]);
  }

  function deleteConstraint(id: string) {
    setLocalConstraints(localConstraints.filter((c) => c.id !== id));
  }

  return (
    <div className="bp-fade grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
            <div className="flex flex-wrap gap-2">
              {tabs.map(({ kind, icon: Icon, tone }) => {
                const on = tab === kind;
                return (
                  <button
                    key={kind}
                    onClick={() => setTab(kind)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition cursor-pointer ${
                      on
                        ? "bg-brand-soft text-brand-ink"
                        : "text-muted hover:bg-panel"
                    }`}
                  >
                    <Icon size={15} className={on ? "text-brand" : ""} />
                    {kind}
                    <span
                      className={`rounded-full px-1.5 text-[11px] ${
                        on ? "bg-card text-brand-ink" : "bg-panel"
                      }`}
                    >
                      {localConstraints.filter((c) => c.kind === kind).length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filter by lecturer dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-muted">Filter:</span>
              <select
                value={selectedLecturerFilter}
                onChange={(e) => setSelectedLecturerFilter(e.target.value)}
                className="h-8.5 rounded-xl border border-line bg-card px-2.5 text-[12px] font-semibold text-ink outline-none transition focus:border-brand"
              >
                <option value="all">All Department Lecturers ({availableLecturers.length})</option>
                {availableLecturers.map((lec) => (
                  <option key={lec} value={lec}>
                    {lec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="divide-y divide-line-soft px-2 py-2">
            {rows.length === 0 && (
              <p className="px-3 py-8 text-center text-[13.5px] text-muted">
                No {tab.toLowerCase()} records yet.
              </p>
            )}
            {rows.map((c) => {
              const toneClass =
                active.tone === "violet"
                  ? "bg-violet-soft text-violet"
                  : active.tone === "warn"
                    ? "bg-warn-soft text-warn"
                    : "bg-brand-soft text-brand-ink";

              return (
                <div
                  key={c.id}
                  className="group flex items-center gap-3 rounded-xl px-3 py-3.5 transition hover:bg-panel"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClass}`}
                  >
                    <active.icon size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink">
                      {c.lecturer}
                    </p>
                    <p className="text-[12.5px] text-muted">{c.detail}</p>
                  </div>
                  <Pill tone="neutral">{c.range}</Pill>
                  <button
                    onClick={() => deleteConstraint(c.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted opacity-0 transition hover:bg-bad-soft hover:text-bad group-hover:opacity-100"
                    title="Delete record"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-line p-3">
            <button
              onClick={() => setShowAdd(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-[13px] font-semibold text-muted transition hover:border-brand/40 hover:text-brand"
            >
              <Plus size={16} /> Add {tab.toLowerCase()} record
            </button>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardHead title="Completion" sub="Confirm before generating" />
          <div className="px-5 pb-5">
            <p className="mb-4 text-[13px] leading-relaxed text-muted">
              Mark constraints complete once study leave, days off and adjunct
              availability have all been captured. The generator honours every
              active record.
            </p>
            <button
              onClick={() => setConstraintsComplete(!constraintsComplete)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 transition ${
                constraintsComplete
                  ? "border-good/30 bg-good-soft"
                  : "border-line bg-panel"
              }`}
            >
              <span
                className={`text-[13.5px] font-semibold ${
                  constraintsComplete ? "text-good" : "text-subink"
                }`}
              >
                {constraintsComplete
                  ? "Constraints complete"
                  : "Mark constraints complete"}
              </span>
              <span
                className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${
                  constraintsComplete
                    ? "bg-good justify-end"
                    : "bg-line justify-start"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
                  {constraintsComplete && (
                    <Check size={12} className="text-good" />
                  )}
                </span>
              </span>
            </button>

            <div className="mt-4 space-y-2 text-[13px]">
              {tabs.map(({ kind }) => (
                <div
                  key={kind}
                  className="flex justify-between border-b border-line-soft pb-2 last:border-0"
                >
                  <span className="text-muted">{kind}</span>
                  <span className="font-semibold text-ink">
                    {localConstraints.filter((c) => c.kind === kind).length}{" "}
                    records
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {showAdd && (
        <AddModal
          kind={tab}
          availableLecturers={availableLecturers}
          allDepartmentFaculty={allDepartmentFaculty}
          activeAllocatedLecturers={activeAllocatedLecturers}
          onAdd={addConstraint}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
