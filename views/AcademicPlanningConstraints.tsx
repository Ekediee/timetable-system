"use client";

import { useState } from "react";
import {
  Building2,
  Clock,
  MapPin,
  UserCheck,
  Calendar,
  Search,
  Plus,
  X,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  ChevronRight,
  BookOpen,
  Users,
} from "lucide-react";
import { Card, CardHead, Button, Pill } from "../components/ui";
import {
  venueRecords as VENUE_SEED,
  adjunctRecords as ADJUNCT_SEED,
  globalDaysOff as DAYS_OFF_SEED,
  globalStudyLeaves as STUDY_LEAVE_SEED,
  type VenueRecord,
  type AdjunctRecord,
  type GlobalDayOff,
  type GlobalStudyLeave,
} from "../lib/data";

type Tab = "venues" | "time";
type TimeTab = "adjuncts" | "studyleave" | "daysoff";

const DEPARTMENTS = [
  { name: "Computer Science", school: "School of Computing & Engineering" },
  { name: "Electrical Engineering", school: "School of Computing & Engineering" },
  { name: "Mechanical Engineering", school: "School of Computing & Engineering" },
  { name: "Mass Communication", school: "School of Social Sciences" },
  { name: "Business Administration", school: "School of Management Sciences" },
  { name: "Accounting", school: "School of Management Sciences" },
  { name: "Law", school: "School of Law" },
  { name: "Nursing Science", school: "College of Health Sciences" },
];

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const VENUE_TYPE_COLORS: Record<string, string> = {
  "Lecture Hall": "warn",
  "Lab": "brand",
  "Seminar Room": "violet",
  "Auditorium": "good",
};

// ── Venues Tab ────────────────────────────────────────────────────────────────

function VenuesTab() {
  const [venues, setVenues] = useState<VenueRecord[]>(VENUE_SEED);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [assignFilter, setAssignFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  function assignVenue(id: string, deptName: string | null) {
    const dept = DEPARTMENTS.find((d) => d.name === deptName) ?? null;
    setVenues((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, assignedDept: deptName, school: dept?.school ?? null }
          : v,
      ),
    );
    setEditingId(null);
  }

  const filtered = venues.filter((v) => {
    if (
      search &&
      !v.name.toLowerCase().includes(search.toLowerCase()) &&
      !(v.assignedDept ?? "").toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (typeFilter !== "all" && v.type !== typeFilter) return false;
    if (assignFilter === "assigned" && !v.assignedDept) return false;
    if (assignFilter === "unassigned" && v.assignedDept) return false;
    return true;
  });

  const assigned = venues.filter((v) => v.assignedDept).length;
  const unassigned = venues.length - assigned;
  const schools = new Set(venues.filter((v) => v.school).map((v) => v.school)).size;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { value: venues.length, label: "Total venues", color: "text-ink" },
          { value: assigned, label: "Assigned", color: "text-good" },
          { value: unassigned, label: "Unassigned (shared pool)", color: "text-warn" },
          { value: schools, label: "Schools served", color: "text-violet" },
        ].map(({ value, label, color }) => (
          <div key={label} className="rounded-xl border border-line bg-white px-4 py-3.5">
            <p className={`text-[26px] font-bold leading-none tracking-[-0.03em] ${color}`}>
              {value}
            </p>
            <p className="mt-2 text-[12.5px] font-medium text-muted">{label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHead
          icon={<MapPin size={16} />}
          title="Venue — Department Assignments"
          sub={`${filtered.length} venue${filtered.length !== 1 ? "s" : ""} · click Assign to change department`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-8 rounded-lg border border-line bg-panel px-2.5 text-[12px] text-subink focus:border-brand focus:outline-none"
              >
                <option value="all">All types</option>
                <option value="Lecture Hall">Lecture Hall</option>
                <option value="Lab">Lab</option>
                <option value="Seminar Room">Seminar Room</option>
                <option value="Auditorium">Auditorium</option>
              </select>
              <select
                value={assignFilter}
                onChange={(e) => setAssignFilter(e.target.value)}
                className="h-8 rounded-lg border border-line bg-panel px-2.5 text-[12px] text-subink focus:border-brand focus:outline-none"
              >
                <option value="all">All status</option>
                <option value="assigned">Assigned only</option>
                <option value="unassigned">Unassigned only</option>
              </select>
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-2.5 text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search venues…"
                  className="h-8 w-40 rounded-lg border border-line bg-panel pl-7 pr-3 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          }
        />

        {/* Desktop table header */}
        <div className="hidden grid-cols-[1.4fr_120px_80px_1.4fr_130px] items-center gap-4 border-b border-line px-5 pb-3 pt-1 sm:grid">
          {["Venue", "Type", "Cap.", "Assigned Department", "Actions"].map(
            (h) => (
              <span
                key={h}
                className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted last:text-right"
              >
                {h}
              </span>
            ),
          )}
        </div>

        <div className="divide-y divide-line-soft">
          {filtered.map((venue) => (
            <div key={venue.id}>
              {/* Desktop row */}
              <div className="hidden grid-cols-[1.4fr_120px_80px_1.4fr_130px] items-center gap-4 px-5 py-3.5 transition hover:bg-panel/40 sm:grid">
                <div className="flex min-w-0 items-center gap-2">
                  <MapPin size={12} className="shrink-0 text-muted/60" />
                  <span className="truncate text-[13.5px] font-semibold text-ink">
                    {venue.name}
                  </span>
                </div>
                <div>
                  <Pill tone={VENUE_TYPE_COLORS[venue.type] ?? "warn"}>
                    {venue.type}
                  </Pill>
                </div>
                <span className="text-[12.5px] text-subink">
                  {venue.capacity.toLocaleString()}
                </span>

                {/* Assignment cell */}
                <div>
                  {editingId === venue.id ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={venue.assignedDept ?? ""}
                        onChange={(e) =>
                          assignVenue(venue.id, e.target.value || null)
                        }
                        autoFocus
                        className="h-7 flex-1 rounded-lg border border-brand bg-white px-2 text-[12.5px] text-ink focus:outline-none"
                      >
                        <option value="">— Unassigned (shared pool) —</option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d.name} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted hover:border-bad/40 hover:text-bad"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : venue.assignedDept ? (
                    <div>
                      <p className="text-[13px] font-semibold text-ink">
                        {venue.assignedDept}
                      </p>
                      <p className="text-[11px] text-muted">{venue.school}</p>
                    </div>
                  ) : (
                    <span className="text-[12px] italic text-muted/60">
                      Shared pool — unassigned
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() =>
                      setEditingId(editingId === venue.id ? null : venue.id)
                    }
                    className="flex items-center gap-1 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[11.5px] font-semibold text-subink transition hover:border-brand/40 hover:text-brand-ink"
                  >
                    <Edit2 size={11} /> Assign
                  </button>
                  {venue.assignedDept && (
                    <button
                      onClick={() => assignVenue(venue.id, null)}
                      title="Clear assignment"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-panel text-muted transition hover:border-bad/40 hover:text-bad"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile card */}
              <div className="px-4 py-4 sm:hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">
                      {venue.name}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      {venue.type} · {venue.capacity} seats
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setEditingId(editingId === venue.id ? null : venue.id)
                    }
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[11.5px] font-semibold text-subink"
                  >
                    <Edit2 size={11} /> Assign
                  </button>
                </div>

                {editingId === venue.id ? (
                  <select
                    value={venue.assignedDept ?? ""}
                    onChange={(e) =>
                      assignVenue(venue.id, e.target.value || null)
                    }
                    autoFocus
                    className="mt-2.5 h-8 w-full rounded-lg border border-brand bg-white px-2.5 text-[12.5px] text-ink focus:outline-none"
                  >
                    <option value="">— Unassigned (shared pool) —</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1.5">
                    {venue.assignedDept ? (
                      <p className="text-[12px] text-subink">
                        <span className="font-semibold text-ink">
                          {venue.assignedDept}
                        </span>{" "}
                        · {venue.school}
                      </p>
                    ) : (
                      <p className="text-[12px] italic text-muted/60">
                        Shared pool — not assigned to a department
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-10 text-center text-[13.5px] text-muted">
              No venues match this filter.
            </div>
          )}
        </div>
      </Card>

      {/* Legend card */}
      <Card>
        <CardHead
          icon={<Building2 size={16} />}
          title="Assignment rules"
          sub="How venue assignments govern department scheduling"
        />
        <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-3">
          {[
            {
              label: "Department-assigned venues",
              desc: "Only the assigned department may schedule against this venue. The system blocks other departments from booking it.",
            },
            {
              label: "Shared pool venues",
              desc: "Unassigned venues (typically central lecture theatres) are accessible to all departments for GST or overflow scheduling.",
            },
            {
              label: "Cross-dept clash risk",
              desc: "Shared pool venues are where cross-department venue clashes most commonly occur. Monitor the Venue Clashes view after each submission cycle.",
            },
          ].map(({ label, desc }) => (
            <div key={label} className="rounded-xl border border-line bg-white px-4 py-3.5">
              <p className="text-[13px] font-semibold text-ink">{label}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

// ── Adjuncts Section ─────────────────────────────────────────────────────────

function AdjunctsSection() {
  const [adjuncts, setAdjuncts] = useState<AdjunctRecord[]>(ADJUNCT_SEED);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    department: "",
    courses: "",
    availableDays: [] as string[],
    note: "",
  });

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      availableDays: f.availableDays.includes(day)
        ? f.availableDays.filter((d) => d !== day)
        : [...f.availableDays, day],
    }));
  }

  function handleAdd() {
    if (!form.name.trim() || !form.department) return;
    const dept = DEPARTMENTS.find((d) => d.name === form.department)!;
    const entry: AdjunctRecord = {
      id: `adj${Date.now()}`,
      name: form.name.trim(),
      department: form.department,
      school: dept?.school ?? "",
      courses: form.courses
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      availableDays: form.availableDays,
      note: form.note.trim(),
    };
    setAdjuncts((prev) => [entry, ...prev]);
    setForm({ name: "", department: "", courses: "", availableDays: [], note: "" });
    setShowForm(false);
  }

  return (
    <Card>
      <CardHead
        icon={<UserCheck size={16} />}
        title="Adjunct Lecturer Roster"
        sub={`${adjuncts.length} adjunct${adjuncts.length !== 1 ? "s" : ""} registered institution-wide`}
        action={
          <Button
            variant="primary"
            className="h-8 px-3 text-[12.5px]"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus size={12} /> Add adjunct
          </Button>
        }
      />

      {/* Add form */}
      {showForm && (
        <div className="mx-5 mb-4 rounded-xl border border-brand/30 bg-brand-soft/20 px-4 py-4">
          <p className="mb-3 text-[13px] font-semibold text-ink">New adjunct lecturer</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                Full name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Nguyen A.K"
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                Department
              </label>
              <select
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value }))
                }
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink focus:border-brand focus:outline-none"
              >
                <option value="">Select department…</option>
                <option value="General Studies">General Studies (GST)</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                Courses taught (comma-separated)
              </label>
              <input
                value={form.courses}
                onChange={(e) =>
                  setForm((f) => ({ ...f, courses: e.target.value }))
                }
                placeholder="e.g. BU-GST 201, COSC 268"
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                Note / restriction
              </label>
              <input
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
                placeholder="e.g. Evenings only, after 14:00"
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11.5px] font-semibold text-muted">
                Available days
              </label>
              <div className="flex gap-2">
                {ALL_DAYS.map((day) => {
                  const on = form.availableDays.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`flex h-8 w-12 items-center justify-center rounded-lg border text-[12px] font-semibold transition ${
                        on
                          ? "border-brand bg-brand text-white"
                          : "border-line bg-white text-muted hover:border-brand/40"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              className="h-8 px-4 text-[12.5px]"
              onClick={handleAdd}
            >
              Save adjunct
            </Button>
            <Button
              variant="ghost"
              className="h-8 px-3 text-[12.5px]"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="divide-y divide-line-soft pb-1">
        {adjuncts.map((adj) => (
          <div
            key={adj.id}
            className="flex items-start gap-4 px-5 py-4 transition hover:bg-panel/40"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-soft text-[11px] font-bold text-violet">
              {adj.name
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13.5px] font-semibold text-ink">{adj.name}</p>
                <span className="text-[11.5px] text-muted">·</span>
                <p className="text-[12px] text-subink">{adj.department}</p>
              </div>
              {adj.courses.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {adj.courses.map((c) => (
                    <span
                      key={c}
                      className="flex items-center gap-1 rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-ink"
                    >
                      <BookOpen size={10} /> {c}
                    </span>
                  ))}
                </div>
              )}
              {adj.note && (
                <p className="mt-1.5 text-[11.5px] text-muted">{adj.note}</p>
              )}
              {adj.availableDays.length > 0 && (
                <div className="mt-2 flex gap-1.5">
                  {ALL_DAYS.map((day) => (
                    <span
                      key={day}
                      className={`flex h-6 w-9 items-center justify-center rounded-md text-[10.5px] font-semibold ${
                        adj.availableDays.includes(day)
                          ? "bg-good/10 text-good"
                          : "bg-line text-muted/50"
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setAdjuncts((p) => p.filter((a) => a.id !== adj.id))}
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:border-bad/40 hover:text-bad"
              title="Remove adjunct"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {adjuncts.length === 0 && (
          <div className="py-10 text-center text-[13.5px] text-muted">
            No adjunct lecturers registered.
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Study Leave Section ───────────────────────────────────────────────────────

function StudyLeaveSection() {
  const [entries, setEntries] = useState<GlobalStudyLeave[]>(STUDY_LEAVE_SEED);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    lecturer: "",
    department: "",
    from: "",
    to: "",
    reason: "",
  });

  function handleAdd() {
    if (!form.lecturer.trim() || !form.department || !form.from || !form.to)
      return;
    setEntries((prev) => [
      {
        id: `sl${Date.now()}`,
        lecturer: form.lecturer.trim(),
        department: form.department,
        from: form.from,
        to: form.to,
        reason: form.reason.trim(),
      },
      ...prev,
    ]);
    setForm({ lecturer: "", department: "", from: "", to: "", reason: "" });
    setShowForm(false);
  }

  return (
    <Card>
      <CardHead
        icon={<Calendar size={16} />}
        title="Study Leave — Institution-wide"
        sub={`${entries.length} active leave record${entries.length !== 1 ? "s" : ""} across all departments`}
        action={
          <Button
            variant="primary"
            className="h-8 px-3 text-[12.5px]"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus size={12} /> Add leave
          </Button>
        }
      />

      {showForm && (
        <div className="mx-5 mb-4 rounded-xl border border-brand/30 bg-brand-soft/20 px-4 py-4">
          <p className="mb-3 text-[13px] font-semibold text-ink">New study leave entry</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                Lecturer name
              </label>
              <input
                value={form.lecturer}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lecturer: e.target.value }))
                }
                placeholder="e.g. Adebayo F.O"
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                Department
              </label>
              <select
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value }))
                }
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink focus:border-brand focus:outline-none"
              >
                <option value="">Select department…</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                From
              </label>
              <input
                value={form.from}
                onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
                placeholder="e.g. 12 Jan 2026"
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                To
              </label>
              <input
                value={form.to}
                onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                placeholder="e.g. 28 Feb 2026"
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                Reason
              </label>
              <input
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
                placeholder="e.g. Doctoral fieldwork — University of Lagos"
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              className="h-8 px-4 text-[12.5px]"
              onClick={handleAdd}
            >
              Save
            </Button>
            <Button
              variant="ghost"
              className="h-8 px-3 text-[12.5px]"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="divide-y divide-line-soft pb-1">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-4 px-5 py-4 transition hover:bg-panel/40"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warn-soft text-[11px] font-bold text-warn">
              {entry.lecturer
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="text-[13.5px] font-semibold text-ink">
                  {entry.lecturer}
                </p>
                <span className="text-[11.5px] text-muted">·</span>
                <p className="text-[12px] text-subink">{entry.department}</p>
              </div>
              <p className="mt-1 text-[12.5px] font-medium text-warn">
                {entry.from} → {entry.to}
              </p>
              {entry.reason && (
                <p className="mt-0.5 text-[11.5px] text-muted">{entry.reason}</p>
              )}
            </div>
            <button
              onClick={() =>
                setEntries((p) => p.filter((e) => e.id !== entry.id))
              }
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:border-bad/40 hover:text-bad"
              title="Remove entry"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="py-10 text-center text-[13.5px] text-muted">
            No study leave records.
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Days Off Section ──────────────────────────────────────────────────────────

function DaysOffSection() {
  const [entries, setEntries] = useState<GlobalDayOff[]>(DAYS_OFF_SEED);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    lecturer: "",
    department: "",
    date: "",
    reason: "",
    recurring: false,
  });

  function handleAdd() {
    if (!form.lecturer.trim() || !form.department || !form.date) return;
    setEntries((prev) => [
      {
        id: `do${Date.now()}`,
        lecturer: form.lecturer.trim(),
        department: form.department,
        date: form.date.trim(),
        reason: form.reason.trim(),
        recurring: form.recurring,
      },
      ...prev,
    ]);
    setForm({ lecturer: "", department: "", date: "", reason: "", recurring: false });
    setShowForm(false);
  }

  return (
    <Card>
      <CardHead
        icon={<Clock size={16} />}
        title="Days Off — Institution-wide"
        sub={`${entries.length} record${entries.length !== 1 ? "s" : ""} · one-off and recurring`}
        action={
          <Button
            variant="primary"
            className="h-8 px-3 text-[12.5px]"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus size={12} /> Add day off
          </Button>
        }
      />

      {showForm && (
        <div className="mx-5 mb-4 rounded-xl border border-brand/30 bg-brand-soft/20 px-4 py-4">
          <p className="mb-3 text-[13px] font-semibold text-ink">New day-off record</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                Lecturer name
              </label>
              <input
                value={form.lecturer}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lecturer: e.target.value }))
                }
                placeholder="e.g. Johnson R.T"
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                Department
              </label>
              <select
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value }))
                }
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink focus:border-brand focus:outline-none"
              >
                <option value="">Select department…</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                Date / schedule
              </label>
              <input
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                placeholder="e.g. Every Wednesday · Mar 15, 2026"
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                Reason
              </label>
              <input
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
                placeholder="e.g. Research day"
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <button
                onClick={() => setForm((f) => ({ ...f, recurring: !f.recurring }))}
                className="text-muted transition hover:text-brand"
              >
                {form.recurring ? (
                  <CheckSquare size={16} className="text-brand" />
                ) : (
                  <Square size={16} />
                )}
              </button>
              <span className="text-[12.5px] text-subink">
                Recurring (repeats every week)
              </span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              className="h-8 px-4 text-[12.5px]"
              onClick={handleAdd}
            >
              Save
            </Button>
            <Button
              variant="ghost"
              className="h-8 px-3 text-[12.5px]"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="divide-y divide-line-soft pb-1">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-4 px-5 py-4 transition hover:bg-panel/40"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bad-soft text-[11px] font-bold text-bad">
              {entry.lecturer
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="text-[13.5px] font-semibold text-ink">
                  {entry.lecturer}
                </p>
                <span className="text-[11.5px] text-muted">·</span>
                <p className="text-[12px] text-subink">{entry.department}</p>
                {entry.recurring && (
                  <Pill tone="warn">Recurring</Pill>
                )}
              </div>
              <p className="mt-1 text-[12.5px] font-medium text-subink">
                {entry.date}
              </p>
              {entry.reason && (
                <p className="mt-0.5 text-[11.5px] text-muted">{entry.reason}</p>
              )}
            </div>
            <button
              onClick={() =>
                setEntries((p) => p.filter((e) => e.id !== entry.id))
              }
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:border-bad/40 hover:text-bad"
              title="Remove entry"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="py-10 text-center text-[13.5px] text-muted">
            No day-off records.
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AcademicPlanningConstraints() {
  const [tab, setTab] = useState<Tab>("venues");
  const [timeTab, setTimeTab] = useState<TimeTab>("adjuncts");

  const timeTabs: { id: TimeTab; label: string; Icon: typeof Users }[] = [
    { id: "adjuncts", label: "Adjunct Lecturers", Icon: UserCheck },
    { id: "studyleave", label: "Study Leave", Icon: Calendar },
    { id: "daysoff", label: "Days Off", Icon: Clock },
  ];

  return (
    <div className="bp-fade flex flex-col gap-5">
      {/* Primary tab bar */}
      <div className="flex w-fit gap-1 rounded-xl border border-line bg-panel p-1">
        {(
          [
            { id: "venues" as const, label: "Venue Assignments", Icon: Building2 },
            { id: "time" as const, label: "Time Constraints", Icon: Clock },
          ]
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
              tab === id ? "bg-white text-ink" : "text-muted hover:text-subink"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Venues tab */}
      {tab === "venues" && <VenuesTab />}

      {/* Time tab */}
      {tab === "time" && (
        <>
          {/* Secondary sub-tabs */}
          <div className="flex w-fit gap-1 rounded-xl border border-line bg-panel p-1">
            {timeTabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTimeTab(id)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
                  timeTab === id
                    ? "bg-white text-ink"
                    : "text-muted hover:text-subink"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {timeTab === "adjuncts" && <AdjunctsSection />}
          {timeTab === "studyleave" && <StudyLeaveSection />}
          {timeTab === "daysoff" && <DaysOffSection />}
        </>
      )}
    </div>
  );
}
