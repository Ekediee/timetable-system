"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
  Clock,
  Layers,
  Building2,
  ShieldCheck,
  Sliders,
  Coffee,
  Calendar,
  Lock,
  Edit2,
  Search,
  ChevronDown,
  User,
} from "lucide-react";
import {
  Card,
  CardHead,
  Pill,
  Button,
  CardSkeleton,
  TableSkeleton,
  ConstraintsSkeleton,
  ConfirmationModal,
  CustomSelect,
} from "../components/ui";
import {
  type Constraint,
  type ConstraintKind,
  type ConstraintTypeDefinition,
  type DepartmentalEvent,
} from "../lib/data";
import { useApp } from "../lib/AppContext";
import { constraintsApi } from "../lib/api";
import { CURRENT_SESSION, CURRENT_SEMESTER } from "../lib/config";

interface LecturerSearchSelectProps {
  value: string;
  onChange: (lecturer: string) => void;
  options: string[];
  activeAllocatedSet?: Set<string>;
  kind?: ConstraintKind;
  includeAllFacultyOption?: boolean;
  label?: string;
  placeholder?: string;
}

function LecturerSearchSelect({
  value,
  onChange,
  options,
  activeAllocatedSet,
  kind,
  includeAllFacultyOption = false,
  label,
  placeholder = "Type to search faculty name (e.g. Adebayo, Onome)...",
}: LecturerSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((name) => name.toLowerCase().includes(q));
  }, [options, search]);

  const showAllFaculty =
    includeAllFacultyOption &&
    (!search.trim() ||
      "all faculty members".includes(search.trim().toLowerCase()));

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">
            {label}
          </span>
          <span className="text-[11px] text-muted font-medium">
            {options.length} faculty members
          </span>
        </div>
      )}

      {/* Search Input Box */}
      <div className="relative">
        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          <Search size={15} />
        </div>
        <input
          type="text"
          value={isOpen ? search : value || ""}
          onFocus={() => {
            setIsOpen(true);
            setSearch("");
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={value ? value : placeholder}
          className="w-full rounded-xl border border-line bg-panel py-2.5 pl-10 pr-9 text-[13.5px] font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isOpen && search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="p-1 text-muted hover:text-ink cursor-pointer"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="p-1 text-muted hover:text-ink cursor-pointer"
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Selected badge preview when closed */}
      {!isOpen && value && (
        <div className="flex items-center justify-between rounded-lg bg-panel/70 border border-line/60 px-3 py-1.5 text-[12px]">
          <div className="flex items-center gap-2 truncate">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand-ink">
              {value === "All Faculty"
                ? "ALL"
                : value
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase() || "FL"}
            </span>
            <span className="font-semibold text-ink truncate">{value}</span>
            {kind === "Study Leave" && activeAllocatedSet?.has(value) && (
              <span className="rounded bg-warn-soft px-1.5 py-0.2 text-[10px] font-semibold text-warn shrink-0">
                Has Active Courses
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setSearch("");
            }}
            className="text-[11px] font-semibold text-brand hover:underline cursor-pointer shrink-0 ml-2"
          >
            Change
          </button>
        </div>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="dropdown-surface absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto p-1.5">
          {showAllFaculty && (
            <button
              type="button"
              onClick={() => {
                onChange("All Faculty");
                setIsOpen(false);
                setSearch("");
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition cursor-pointer ${
                value === "All Faculty"
                  ? "bg-brand-soft text-brand-ink font-semibold"
                  : "hover:bg-panel text-ink"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-[11px] font-bold text-white">
                  ALL
                </span>
                <span>All Faculty Members (School-Wide)</span>
              </div>
              {value === "All Faculty" && (
                <Check size={14} className="text-brand shrink-0" />
              )}
            </button>
          )}

          {filteredOptions.length === 0 && !showAllFaculty ? (
            <div className="px-3 py-4 text-center text-[12.5px] text-muted">
              No faculty member matching &ldquo;{search}&rdquo;
            </div>
          ) : (
            filteredOptions.map((lec) => {
              const isSelected = value === lec;
              const hasCourses = activeAllocatedSet?.has(lec);
              const initials = lec
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase();

              return (
                <button
                  key={lec}
                  type="button"
                  onClick={() => {
                    onChange(lec);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] transition cursor-pointer ${
                    isSelected
                      ? "bg-brand-soft text-brand-ink font-semibold"
                      : "hover:bg-panel text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10.5px] font-bold ${
                        isSelected
                          ? "bg-brand text-white"
                          : "bg-panel text-muted"
                      }`}
                    >
                      {initials}
                    </span>
                    <span className="truncate">{lec}</span>
                    {kind === "Study Leave" ? (
                      hasCourses ? (
                        <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[10px] font-semibold text-warn shrink-0">
                          Active Courses
                        </span>
                      ) : (
                        <span className="rounded bg-good-soft px-1.5 py-0.5 text-[10px] font-semibold text-good shrink-0">
                          Eligible (On Leave)
                        </span>
                      )
                    ) : null}
                  </div>
                  {isSelected && (
                    <Check size={14} className="text-brand shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function AddModal({
  kind,
  typeDef,
  activeDept,
  availableLecturers,
  allDepartmentFaculty,
  activeAllocatedLecturers,
  onAdd,
  onClose,
}: {
  kind: ConstraintKind;
  typeDef?: ConstraintTypeDefinition;
  activeDept: string;
  availableLecturers: string[];
  allDepartmentFaculty: string[];
  activeAllocatedLecturers: Set<string>;
  onAdd: (c: Omit<Constraint, "id">) => void;
  onClose: () => void;
}) {
  const isCustomOrExtendedType = Boolean(typeDef);
  const dialogRef = useRef<HTMLDivElement>(null);

  // E3: Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // E3: Focus trap inside modal
  useEffect(() => {
    const dialogEl = dialogRef.current;
    if (!dialogEl) return;

    const focusable = dialogEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      dialogEl.focus();
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const elements = dialogEl.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, []);

  // Dynamic parameters state for extended/custom types
  const [formValues, setFormValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    if (typeDef?.parameters) {
      typeDef.parameters.forEach((p) => {
        initial[p.key] =
          p.defaultValue ??
          (p.type === "number"
            ? 4
            : p.type === "boolean"
              ? true
              : p.type === "lecturer_select"
                ? (kind === "Study Leave"
                    ? allDepartmentFaculty
                    : availableLecturers)[0] || ""
                : p.type === "select"
                  ? p.options?.[0] || ""
                  : p.type === "days_multi"
                    ? p.defaultValue || []
                    : p.type === "days_time_range"
                      ? p.defaultValue || { days: [], start: "", end: "" }
                      : "");
      });
    }
    return initial;
  });

  const lecturerList =
    kind === "Study Leave" ? allDepartmentFaculty : availableLecturers;
  const [lecturer, setLecturer] = useState(
    kind === "Study Leave"
      ? allDepartmentFaculty.find((l) => !activeAllocatedLecturers.has(l)) ||
          allDepartmentFaculty[0] ||
          ""
      : availableLecturers[0] || "",
  );
  // Default text inputs are left EMPTY so the placeholder is clearly seen!
  const [detail, setDetail] = useState("");
  const [range, setRange] = useState("");

  const isAssignedToActiveCourses = activeAllocatedLecturers.has(lecturer);

  function submit() {
    if (isCustomOrExtendedType && typeDef) {
      const selectedLecturer =
        formValues.lecturer ||
        lecturer ||
        availableLecturers[0] ||
        "All Faculty";
      const ruleDetail = formValues.detail || typeDef.description;
      const rangeValue = formValues.range;
      if (
        typeDef.parameters.some(
          (p) =>
            p.required &&
            p.type === "days_multi" &&
            (!Array.isArray(formValues[p.key]) ||
              formValues[p.key].length === 0),
        )
      )
        return;
      if (
        typeDef.parameters.some(
          (p) =>
            p.required &&
            p.type === "days_time_range" &&
            (!formValues[p.key]?.days?.length ||
              !formValues[p.key]?.start ||
              !formValues[p.key]?.end ||
              formValues[p.key].start > formValues[p.key].end),
        )
      )
        return;
      const ruleRange =
        rangeValue && typeof rangeValue === "object"
          ? Array.isArray(rangeValue.days)
            ? `${rangeValue.days.join(", ")} · ${rangeValue.start}-${rangeValue.end}`
            : rangeValue.join(", ")
          : rangeValue ||
            (formValues.maxHours
              ? `${formValues.maxHours} hrs/day`
              : formValues.maxConsecutive
                ? `${formValues.maxConsecutive} hrs max`
                : "Active");

      onAdd({
        kind,
        lecturer: selectedLecturer,
        detail: ruleDetail,
        range: ruleRange,
        categoryId: typeDef.id,
        params: {
          ...formValues,
          lecturer: selectedLecturer,
          detail: ruleDetail,
          range: formValues.range || ruleRange,
          archetype: typeDef.archetype,
          typeId: typeDef.id,
        },
      });
      onClose();
      return;
    }

    if (!lecturer.trim() || !detail.trim() || !range.trim()) return;
    onAdd({
      kind,
      lecturer: lecturer.trim(),
      detail: detail.trim(),
      range: range.trim(),
      categoryId: typeDef?.id,
      params: {
        typeId: typeDef?.id,
        typeName: typeDef?.name,
        lecturer: lecturer.trim(),
        detail: detail.trim(),
        range: range.trim(),
        archetype:
          kind === "Study Leave"
            ? "full_absence"
            : kind === "Day Off" || kind === "Adjunct"
              ? "time_window"
              : "custom_rule",
      },
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-constraint-title"
        tabIndex={-1}
        className="bp-fade w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 id="add-constraint-title" className="text-[16px] font-bold text-ink">Add {kind} Rule</h3>
            <p className="text-[12px] text-muted mt-0.5">
              {activeDept
                ? `Department of ${activeDept}`
                : "Department data unavailable"}{" "}
              · Lecturer Schedule & Availability
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
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
                <span className="font-semibold text-violet">Policy Note:</span>{" "}
                Lecturers assigned to active courses cannot be on study leave.
                For faculty members on leave, a substitute lecturer is assigned
                externally outside this system.
              </div>
            </div>
          </div>
        )}

        {isCustomOrExtendedType && typeDef ? (
          /* Dynamic Parameter Schema Form for Custom / Extended Constraint Types */
          <div className="space-y-4">
            {typeDef.parameters.map((p) => (
              <div key={p.key} className="space-y-1">
                <label className="block text-[12px] font-semibold text-subink">
                  {p.label} {p.required && <span className="text-bad">*</span>}
                </label>

                {p.type === "lecturer_select" ? (
                  <LecturerSearchSelect
                    value={formValues[p.key] || availableLecturers[0] || ""}
                    onChange={(selected) =>
                      setFormValues((prev) => ({ ...prev, [p.key]: selected }))
                    }
                    options={lecturerList}
                    includeAllFacultyOption={true}
                  />
                ) : p.type === "number" ? (
                  <input
                    type="number"
                    value={formValues[p.key] ?? 4}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [p.key]: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition focus:border-brand"
                  />
                ) : p.type === "select" ? (
                  <CustomSelect
                    value={formValues[p.key] || (p.options?.[0] ?? "")}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [p.key]: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
                  >
                    {(p.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </CustomSelect>
                ) : p.type === "days_multi" || p.type === "days_time_range" ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                        (day) => {
                          const value =
                            p.type === "days_time_range"
                              ? formValues[p.key]?.days || []
                              : formValues[p.key] || [];
                          const selected = value.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  [p.key]:
                                    p.type === "days_time_range"
                                      ? {
                                          ...prev[p.key],
                                          days: selected
                                            ? value.filter(
                                                (item: string) => item !== day,
                                              )
                                            : [...value, day],
                                        }
                                      : selected
                                        ? value.filter(
                                            (item: string) => item !== day,
                                          )
                                        : [...value, day],
                                }))
                              }
                              className={`rounded-lg border px-2.5 py-1 text-[12px] font-medium transition ${selected ? "border-brand bg-brand text-white" : "border-line bg-panel text-subink hover:border-brand"}`}
                            >
                              {day}
                            </button>
                          );
                        },
                      )}
                    </div>
                    {p.type === "days_time_range" && (
                      <div className="grid grid-cols-2 gap-2">
                        {(["start", "end"] as const).map((part) => (
                          <label
                            key={part}
                            className="text-[11px] font-medium text-muted"
                          >
                            {part === "start" ? "Start time" : "End time"}
                            <input
                              type="time"
                              value={formValues[p.key]?.[part] || ""}
                              onChange={(e) =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  [p.key]: {
                                    ...prev[p.key],
                                    [part]: e.target.value,
                                  },
                                }))
                              }
                              className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-[13px] text-ink"
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ) : p.type === "boolean" ? (
                  <label className="flex items-center gap-2 text-[12.5px] text-ink cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={formValues[p.key] ?? true}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          [p.key]: e.target.checked,
                        }))
                      }
                      className="rounded border-line text-brand focus:ring-brand"
                    />
                    <span>Active Policy Rule</span>
                  </label>
                ) : (
                  <input
                    type="text"
                    value={formValues[p.key] || ""}
                    placeholder={p.placeholder || "Enter value..."}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [p.key]: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition focus:border-brand"
                  />
                )}
                {p.hint && <p className="text-[11px] text-muted">{p.hint}</p>}
              </div>
            ))}
          </div>
        ) : (
          /* Standard Study Leave / Day Off / Adjunct Form */
          <div className="space-y-4">
            <LecturerSearchSelect
              label="Select Department Lecturer"
              value={lecturer}
              onChange={(selected) => {
                setLecturer(selected);
                if (
                  kind === "Study Leave" &&
                  activeAllocatedLecturers.has(selected)
                ) {
                  setDetail("Study Leave (Substitute handled externally)");
                }
              }}
              options={lecturerList}
              activeAllocatedSet={activeAllocatedLecturers}
              kind={kind}
            />

            {kind === "Study Leave" && isAssignedToActiveCourses && (
              <div className="rounded-xl border border-warn/30 bg-warn-soft/40 p-2.5 text-[11.5px] text-warn-ink flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-warn" />
                <span>
                  <strong>Notice:</strong> <em>{lecturer}</em> is currently
                  assigned to courses. Please ensure their classes are covered
                  by an approved substitute.
                </span>
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">
                Reason / Note
              </span>
              <input
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={
                  kind === "Study Leave"
                    ? "e.g. Doctoral fellowship, sabbatical, or medical leave"
                    : kind === "Day Off"
                      ? "e.g. Designated research day or clinical hospital duties"
                      : kind === "Adjunct"
                        ? "e.g. Industry practitioner, visiting guest lecturer"
                        : "e.g. Reason or policy description"
                }
                className="w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">
                  Effective Days or Date Range
                </span>
                <span className="text-[11px] text-muted">
                  {kind === "Day Off"
                    ? "e.g. Every Wed or Friday mornings"
                    : kind === "Adjunct"
                      ? "e.g. Tue, Fri or After 14:00"
                      : "e.g. 12 Jan – 28 Feb"}
                </span>
              </div>
              <input
                value={range}
                onChange={(e) => setRange(e.target.value)}
                placeholder={
                  kind === "Day Off"
                    ? "e.g. Every Wednesday, or Friday mornings"
                    : kind === "Adjunct"
                      ? "e.g. Tuesdays & Fridays, or After 14:00"
                      : "e.g. 12 Jan – 28 Feb or First Semester"
                }
                className="w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
              />
            </label>

            {/* Quick preset chips */}
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold text-muted">
                Quick examples (click to fill):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {kind === "Day Off" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRange("Every Wed");
                        setDetail("Weekly Research Day");
                      }}
                      className="rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-subink hover:border-brand transition cursor-pointer"
                    >
                      Every Wednesday
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRange("Every Fri AM");
                        setDetail("Hospital Clinic Duty");
                      }}
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
                      onClick={() => {
                        setRange("Tue, Fri");
                        setDetail("Visiting Tech Practitioner");
                      }}
                      className="rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-subink hover:border-brand transition cursor-pointer"
                    >
                      Tue & Fri Only
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRange("After 14:00");
                        setDetail("Industry Consultant (Afternoons)");
                      }}
                      className="rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-subink hover:border-brand transition cursor-pointer"
                    >
                      After 14:00 Only
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRange("Every Wed");
                        setDetail("Midweek Visiting Lecturer");
                      }}
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
                      onClick={() => {
                        setRange("12 Jan – 28 Feb");
                        setDetail("Doctoral Research Fellowship");
                      }}
                      className="rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-subink hover:border-brand transition cursor-pointer"
                    >
                      First Half of Semester
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRange("01 Mar – 30 Apr");
                        setDetail("International Sabbatical");
                      }}
                      className="rounded-lg border border-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-subink hover:border-brand transition cursor-pointer"
                    >
                      Second Half of Semester
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2 border-t border-line/60 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              isCustomOrExtendedType
                ? false
                : !lecturer.trim() || !detail.trim() || !range.trim()
            }
          >
            <Plus size={15} /> Add {kind} Rule
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditConstraintModal({
  constraint,
  activeDept,
  lecturers,
  onSave,
  onClose,
}: {
  constraint: Constraint;
  activeDept: string;
  lecturers: string[];
  onSave: (id: string, updates: Partial<Constraint>) => Promise<void>;
  onClose: () => void;
}) {
  const [lecturer, setLecturer] = useState(constraint.lecturer);
  const [detail, setDetail] = useState(constraint.detail);
  const [range, setRange] = useState(constraint.range);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!lecturer.trim() || !detail.trim() || !range.trim()) return;
    setSaving(true);
    try {
      await onSave(constraint.id, {
        kind: constraint.kind,
        lecturer: lecturer.trim(),
        detail: detail.trim(),
        range: range.trim(),
        department: activeDept,
        params: constraint.params,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bp-fade w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-bold text-ink">
              Edit {constraint.kind} Rule
            </h3>
            <p className="text-[12px] text-muted">
              Constraint type is fixed after creation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-panel cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3.5">
          <LecturerSearchSelect
            value={lecturer}
            onChange={setLecturer}
            options={lecturers}
            label="Faculty member"
          />
          <label className="block text-[12px] font-semibold text-subink">
            Rule details
            <textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-[13px] text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="block text-[12px] font-semibold text-subink">
            Range / window
            <input
              value={range}
              onChange={(event) => setRange(event.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-[13px] text-ink outline-none focus:border-brand"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={
              saving || !lecturer.trim() || !detail.trim() || !range.trim()
            }
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Add Departmental Event Modal ─────────────────────────────────────────────

function DepartmentalEventModal({
  event,
  activeDept,
  onSave,
  onClose,
}: {
  event?: DepartmentalEvent;
  activeDept: string;
  onSave: (event: Omit<DepartmentalEvent, "id">) => void | Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(event?.title || "");
  const [category, setCategory] = useState<DepartmentalEvent["category"]>(
    event?.category || "Departmental Week",
  );
  const [week, setWeek] = useState(event?.week || "Week 8");
  const [dates, setDates] = useState(event?.dates || "");
  const [venue, setVenue] = useState(event?.venue || "");
  const [description, setDescription] = useState(event?.description || "");

  function handleSubmit() {
    if (!title.trim() || !dates.trim()) return;
    onSave({
      title: title.trim(),
      department: event?.department || activeDept,
      category,
      week,
      dates: dates.trim(),
      venue: venue.trim() || undefined,
      description: description.trim() || undefined,
      exemptFromLectures: false,
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
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-[16px] font-bold text-ink">
              {event ? "Edit Departmental Event" : "Add Departmental Event"}
            </h3>
            <p className="text-[12px] text-muted">
              Department milestone (does not disrupt lecture schedule)
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-[12px] font-semibold text-subink mb-1">
              Event Title <span className="text-bad">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Computer Science Departmental Week"
              className="w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-[13px] text-ink outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-subink mb-1.5">
                Category
              </label>
              <CustomSelect
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-xl border border-line bg-card px-3 py-2 text-[13px] font-medium text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
              >
                <option value="Departmental Week">Departmental Week</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Symposium">Symposium / Colloquium</option>
                <option value="Exhibition">Project Exhibition</option>
                <option value="Social / Dinner">Annual Dinner</option>
                <option value="General">General Milestone</option>
              </CustomSelect>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-subink mb-1.5">
                Semester Week
              </label>
              <CustomSelect
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                className="w-full rounded-xl border border-line bg-card px-3 py-2 text-[13px] font-medium text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
              >
                {Array.from({ length: 15 }, (_, i) => `Week ${i + 1}`).map(
                  (w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ),
                )}
              </CustomSelect>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-subink mb-1">
              Calendar Dates <span className="text-bad">*</span>
            </label>
            <input
              type="text"
              value={dates}
              onChange={(e) => setDates(e.target.value)}
              placeholder="e.g. 15 Mar – 20 Mar"
              className="w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-[13px] text-ink outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-subink mb-1">
              Venue / Location (Optional)
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. SAT B006 or Department Hall"
              className="w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-[13px] text-ink outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-subink mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Student projects exhibition, tech symposium and networking dinner"
              className="w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-[12.5px] text-ink outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line mt-5 pt-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !dates.trim()}
          >
            <Plus size={15} /> {event ? "Update Event" : "Save Event"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Module-level in-memory cache for department faculty rosters to eliminate redundant network hits
const rosterCache = new Map<string, string[]>();

export default function Constraints(props?: {
  localConstraints?: Constraint[];
  setLocalConstraints?:
    | React.Dispatch<React.SetStateAction<Constraint[]>>
    | ((c: Constraint[]) => void);
  constraintsComplete?: boolean;
  setConstraintsComplete?:
    | React.Dispatch<React.SetStateAction<boolean>>
    | ((v: boolean) => void);
  setView?: (v: any) => void;
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

  const activeDept =
    context.currentProgram || context.currentUser?.department || "";
  const activeSchool = context.currentUser?.school || "";
  const visibleEvents = useMemo(() => {
    const schoolDepartments = new Set(
      context.departments
        .filter(
          (d) =>
            !activeSchool ||
            d.school.toLowerCase() === activeSchool.toLowerCase(),
        )
        .map((d) => d.name.toLowerCase()),
    );
    return context.departmentalEvents.filter((event) => {
      if (!event.department) return true;
      if (event.department.toLowerCase() === activeDept.toLowerCase())
        return true;
      return schoolDepartments.has(event.department.toLowerCase());
    });
  }, [
    activeDept,
    activeSchool,
    context.departments,
    context.departmentalEvents,
  ]);

  const [editingConstraint, setEditingConstraint] = useState<Constraint | null>(
    null,
  );
  const [deletingConstraint, setDeletingConstraint] =
    useState<Constraint | null>(null);
  const [editingEvent, setEditingEvent] = useState<DepartmentalEvent | null>(
    null,
  );
  const [deletingEvent, setDeletingEvent] = useState<DepartmentalEvent | null>(
    null,
  );
  const [isDeletingConstraint, setIsDeletingConstraint] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  const [rosterFaculty, setRosterFaculty] = useState<string[]>(() => {
    if (!activeDept) return [];
    if (rosterCache.has(activeDept)) {
      return rosterCache.get(activeDept)!;
    }
    const set = new Set<string>();
    allocations.forEach((a) => {
      if (a.lecturer && !a.lecturer.includes("Chapel Directorate")) {
        set.add(a.lecturer.trim());
      }
    });
    return Array.from(set).sort();
  });

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

  // Extract all department faculty roster from database allocations (including non-teaching/on-leave faculty)
  const allDepartmentFaculty: string[] = useMemo(() => {
    const set = new Set<string>(availableLecturers);
    rosterFaculty.forEach((f) => {
      if (f && !f.includes("Chapel Directorate")) {
        set.add(f.trim());
      }
    });
    return Array.from(set).sort();
  }, [availableLecturers, rosterFaculty]);

  const [tab, setTab] = useState<ConstraintKind>("Study Leave");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedLecturerFilter, setSelectedLecturerFilter] =
    useState<string>("all");
  const [loading, setLoading] = useState(
    !localConstraints || localConstraints.length === 0,
  );

  const lastLoadedDeptRef = useRef<string | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  // Unified Constraints Bootstrap: Loads constraints, complete flag, types, timeLocks, allocations, and roster in 1 single HTTP request
  useEffect(() => {
    if (!activeDept) {
      setRosterFaculty([]);
      setLoading(false);
      return;
    }

    // Skip redundant network calls if all data was already loaded for this department
    if (lastLoadedDeptRef.current === activeDept) {
      setLoading(false);
      return;
    }

    // Skip if an active bootstrap call is already in-flight for this department
    if (isFetchingRef.current) return;

    let active = true;
    isFetchingRef.current = true;
    setLoading(true);

    const abortController = new AbortController();

    // Single unified call to GET /api/v1/constraints/bootstrap
    context
      .bootstrapConstraints(activeDept, undefined, undefined, {
        signal: abortController.signal,
      })
      .then((data) => {
        if (!active || !data) return;
        lastLoadedDeptRef.current = activeDept;
        if (Array.isArray(data.roster)) {
          rosterCache.set(activeDept, data.roster);
          setRosterFaculty(data.roster);
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError" || abortController.signal.aborted) return;
        console.warn("Unified constraints bootstrap failed:", err);
      })
      .finally(() => {
        isFetchingRef.current = false;
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      abortController.abort();
      isFetchingRef.current = false;
    };
  }, [activeDept, context.bootstrapConstraints]);

  const activeConstraintTypes = useMemo(() => {
    return context.constraintTypes?.filter((t) => t.isActive) || [];
  }, [context.constraintTypes]);

  const dynamicTabs = useMemo(() => {
    return activeConstraintTypes.map((t) => {
      let Icon = ShieldCheck;
      let tone = "brand";
      if (t.archetype === "full_absence" || t.name === "Study Leave") {
        Icon = Plane;
        tone = "violet";
      } else if (t.archetype === "time_window" || t.name === "Day Off") {
        Icon = CalendarOff;
        tone = "warn";
      } else if (t.name === "Adjunct") {
        Icon = UserCog;
        tone = "brand";
      } else if (t.archetype === "daily_load_limit") {
        Icon = Layers;
        tone = "brand";
      } else if (t.archetype === "consecutive_hours") {
        Icon = Clock;
        tone = "warn";
      } else if (t.archetype === "venue_requirement") {
        Icon = Building2;
        tone = "good";
      }
      return {
        kind: t.name,
        icon: Icon,
        tone,
        typeDef: t,
      };
    });
  }, [activeConstraintTypes]);

  const currentTabKind = dynamicTabs.some((t) => t.kind === tab)
    ? tab
    : dynamicTabs[0]?.kind || "Study Leave";

  const rows = localConstraints
    .filter((c) => c.kind === currentTabKind)
    .filter(
      (c) =>
        selectedLecturerFilter === "all" ||
        c.lecturer === selectedLecturerFilter,
    );

  const active = dynamicTabs.find((t) => t.kind === currentTabKind) || {
    kind: currentTabKind,
    icon: ShieldCheck,
    tone: "brand",
    typeDef: undefined,
  };

  async function addConstraint(c: Omit<Constraint, "id">) {
    const typeDef = activeConstraintTypes.find((type) => type.name === c.kind);
    if (!typeDef || (c.params?.typeId && c.params?.typeId !== typeDef.id)) {
      throw new Error("Select a valid active constraint type before saving.");
    }
    const tempId = `c${Date.now()}`;
    const newConstraint = { ...c, id: tempId, categoryId: typeDef.id };
    setLocalConstraints([...localConstraints, newConstraint]);

    try {
      const res = await constraintsApi.createConstraint({
        categoryId: typeDef.id,
        kind: c.kind,
        lecturer: c.lecturer,
        detail: c.detail,
        range: c.range,
        department: activeDept,
        params: {
          ...c.params,
          typeId: typeDef.id,
          archetype: typeDef.archetype,
          lecturer: c.lecturer,
          range: c.params?.range ?? c.range,
          detail: c.detail,
        },
      });
      if (res && res.id) {
        setLocalConstraints(
          [...localConstraints, newConstraint].map((item) =>
            item.id === tempId ? { ...item, id: res.id, categoryId: typeDef.id } : item,
          ),
        );
      }
    } catch (err) {
      console.warn("Failed persisting constraint to backend:", err);
    }
  }

  async function updateConstraint(id: string, updates: Partial<Constraint>) {
    const targetKind = updates.kind || editingConstraint?.kind;
    const typeDef = activeConstraintTypes.find(
      (type) => type.name === targetKind,
    );
    const categoryId =
      typeDef?.id || updates.categoryId || editingConstraint?.categoryId;
    const archetype =
      typeDef?.archetype ||
      updates.params?.archetype ||
      editingConstraint?.params?.archetype;

    const payload: Partial<Constraint> = {
      ...updates,
      ...(categoryId ? { categoryId } : {}),
      department: activeDept,
      params: {
        ...editingConstraint?.params,
        ...updates.params,
        ...(categoryId ? { typeId: categoryId } : {}),
        ...(archetype ? { archetype } : {}),
        ...(updates.lecturer ? { lecturer: updates.lecturer } : {}),
        ...(updates.range ? { range: updates.range } : {}),
        ...(updates.detail ? { detail: updates.detail } : {}),
      },
    };
    const response = await constraintsApi.updateConstraint(id, payload);
    setLocalConstraints(
      localConstraints.map((item) => (item.id === id ? response : item)),
    );
    setEditingConstraint(null);
  }

  async function deleteConstraint(id: string) {
    try {
      await constraintsApi.deleteConstraint(id);
      setLocalConstraints(localConstraints.filter((c) => c.id !== id));
    } catch (err) {
      console.warn("Failed deleting constraint from backend:", err);
    }
  }

  async function toggleConstraintsComplete() {
    const nextVal = !constraintsComplete;
    setConstraintsComplete(nextVal);
    try {
      await constraintsApi.updateStatus(activeDept, nextVal, CURRENT_SESSION, CURRENT_SEMESTER);
    } catch (err) {
      console.warn("Failed updating constraint status on backend:", err);
    }
  }

  if (
    (loading || context.isLoadingBackend) &&
    (!localConstraints || localConstraints.length === 0)
  ) {
    return <ConstraintsSkeleton />;
  }

  return (
    <div className="bp-fade flex flex-col gap-6">
      {/* ── STEP 1: Institutional University-Wide Rules (Academic Planning Reference) ── */}
      <Card>
        <CardHead
          icon={<ShieldCheck size={18} className="text-violet" />}
          title="University Schedule Rules & Operating Window"
          sub="Institutional schedule rules set by the Academic Planning Directorate (Enforced across all faculties to prevent clashes)"
          action={
            <span className="flex items-center gap-1.5 rounded-full bg-violet-soft px-3 py-1 text-[11px] font-bold text-violet border border-violet/20">
              <Lock size={11} /> Academic Planning Policy (Read-Only)
            </span>
          }
        />
        <div className="grid grid-cols-1 gap-3.5 p-5 sm:grid-cols-2 lg:grid-cols-4 bg-panel/20">
          {/* Lunch Break */}
          <div className="rounded-xl border border-line bg-card p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between font-semibold text-ink">
                <span className="flex items-center gap-1.5 text-[13px]">
                  <Coffee size={15} className="text-brand" />
                  Campus Lunch Break
                </span>
                <span className="rounded bg-brand-soft border border-brand/20 px-2 py-0.5 text-[11px] font-bold text-brand">
                  {context.timeLockConfig?.lunchBreak?.slot || "13:00"} (1 hr)
                </span>
              </div>
              <p className="text-[11.5px] text-muted mt-2 leading-relaxed">
                Daily protected period across all schools. 2-hour classes cannot
                begin right before this hour.
              </p>
            </div>
          </div>

          {/* Operating Band */}
          <div className="rounded-xl border border-line bg-card p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between font-semibold text-ink">
                <span className="flex items-center gap-1.5 text-[13px]">
                  <Clock size={15} className="text-emerald-600" />
                  Teaching Hours
                </span>
                <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  {context.timeLockConfig?.operatingWindow?.startSlot ||
                    "07:00"}{" "}
                  –{" "}
                  {context.timeLockConfig?.operatingWindow?.endSlot || "17:00"}
                </span>
              </div>
              <p className="text-[11.5px] text-muted mt-2 leading-relaxed">
                Approved standard lecture and lab window for classes during
                weekdays.
              </p>
            </div>
          </div>

          {/* Early Closings */}
          <div className="rounded-xl border border-line bg-card p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between font-semibold text-ink">
                <span className="flex items-center gap-1.5 text-[13px]">
                  <Calendar size={15} className="text-amber-600" />
                  Curfew Cutoffs
                </span>
                <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                  Wed & Fri
                </span>
              </div>
              <div className="mt-2 space-y-1 text-[11.5px]">
                <div className="flex items-center justify-between text-subink">
                  <span>Wednesdays (Fellowship):</span>
                  <span className="font-semibold text-ink">
                    Cutoff at 17:00
                  </span>
                </div>
                <div className="flex items-center justify-between text-subink">
                  <span>Fridays (Sabbath Close):</span>
                  <span className="font-semibold text-ink">
                    Cutoff at 13:00
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Chapel Seminar */}
          <div className="rounded-xl border border-line bg-card p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between font-semibold text-ink">
                <span className="flex items-center gap-1.5 text-[13px]">
                  <ShieldCheck size={15} className="text-violet" />
                  Chapel Seminars
                </span>
                <span className="rounded bg-violet-soft border border-violet/20 px-2 py-0.5 text-[10.5px] font-bold text-violet">
                  Amphitheatre
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-2 text-[10.5px]">
                {Object.entries(
                  context.timeLockConfig?.chapelSeminarSchedule || {},
                ).map(([level, item]) => (
                  <div
                    key={level}
                    className="flex items-center justify-between rounded bg-panel px-1.5 py-0.5 border border-line/60"
                  >
                    <span className="font-bold text-ink">
                      {level.replace(" Level", "L")}
                    </span>
                    <span className="text-subink">
                      {item.day} {item.slot}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── STEP 2: Main Departmental Faculty Constraints Workspace ── */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3.5 bg-panel/30">
          <div className="flex flex-wrap gap-2">
            {dynamicTabs.map(({ kind, icon: Icon, tone }) => {
              const on = currentTabKind === kind;
              return (
                <button
                  key={kind}
                  onClick={() => setTab(kind)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition cursor-pointer ${
                    on
                      ? "bg-brand-soft text-brand-ink shadow-2xs border border-brand/20"
                      : "text-muted hover:bg-panel hover:text-ink"
                  }`}
                >
                  <Icon size={15} className={on ? "text-brand" : ""} />
                  {kind}
                  <span
                    className={`rounded-full px-2 py-0.2 text-[11px] font-bold ${
                      on
                        ? "bg-card text-brand-ink border border-brand/30"
                        : "bg-panel text-muted"
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
            <span className="text-[12px] font-semibold text-muted">
              Filter Lecturer:
            </span>
            <CustomSelect
              value={selectedLecturerFilter}
              onChange={(e) => setSelectedLecturerFilter(e.target.value)}
              className="h-8.5 rounded-xl border border-line bg-card px-3 text-[12px] font-semibold text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
            >
              <option value="all">
                All Department Lecturers ({availableLecturers.length})
              </option>
              {availableLecturers.map((lec) => (
                <option key={lec} value={lec}>
                  {lec}
                </option>
              ))}
            </CustomSelect>
          </div>
        </div>

        <div className="divide-y divide-line-soft px-3 py-2">
          {rows.length === 0 && (
            <div className="px-3 py-10 text-center text-muted">
              <p className="text-[13.5px] font-medium text-ink">
                No {currentTabKind.toLowerCase()} rules registered yet.
              </p>
              <p className="text-[12px] mt-1">
                Click the button below to add a {currentTabKind.toLowerCase()}{" "}
                rule for a faculty member.
              </p>
            </div>
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
                className="group flex items-center gap-3.5 rounded-xl px-3 py-3 transition hover:bg-panel"
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
                  onClick={() => setEditingConstraint(c)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand cursor-pointer"
                  title="Edit record"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setDeletingConstraint(c)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-bad-soft hover:text-bad cursor-pointer"
                  title="Delete record"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-line p-3 bg-card">
          <button
            onClick={() => setShowAdd(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-[13px] font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft/20 hover:text-brand cursor-pointer"
          >
            <Plus size={16} /> Add {currentTabKind.toLowerCase()} rule
          </button>
        </div>
      </Card>

      {/* ── STEP 3: Departmental Events & Semester Milestones ── */}
      <Card>
        <CardHead
          icon={<Calendar size={18} className="text-brand" />}
          title="Departmental Events & Semester Milestones"
          sub="Departmental Week, Hackathons, Symposiums, and Project Exhibitions scheduled across the academic semester"
          action={
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand">
                {visibleEvents.length} Events
              </span>
              <button
                onClick={() => setShowAddEvent(true)}
                className="flex h-7.5 items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 text-[12px] font-semibold text-brand hover:bg-panel transition cursor-pointer"
              >
                <Plus size={13} /> Add Event
              </button>
            </div>
          }
        />
        <div className="p-5 space-y-4">
          <p className="text-[12.5px] text-muted leading-relaxed max-w-3xl">
            Departmental events provide milestone visibility during the semester
            without disrupting regular course lecture schedules.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleEvents.map((evt) => (
              <div
                key={evt.id}
                className="group relative rounded-xl border border-line bg-panel/40 p-3 text-[12.5px] hover:border-brand/40 hover:bg-card transition shadow-2xs"
              >
                <div className="flex items-center justify-between font-semibold text-ink">
                  <span className="truncate pr-2 font-bold">{evt.title}</span>
                  <span className="rounded bg-brand-soft border border-brand/20 px-2 py-0.5 text-[10.5px] font-bold text-brand shrink-0">
                    {evt.week}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 text-[11.5px] text-muted">
                  <span>
                    {evt.category}
                    {evt.dates
                      ? ` · ${evt.dates}`
                      : evt.timeRange
                        ? ` · ${evt.timeRange}`
                        : evt.day
                          ? ` · ${evt.day}`
                          : ""}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingEvent(evt)}
                      className="rounded p-1 text-muted hover:bg-brand-soft hover:text-brand cursor-pointer"
                      title="Edit Event"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setDeletingEvent(evt)}
                      className="rounded p-1 text-muted hover:bg-bad-soft hover:text-bad cursor-pointer"
                      title="Delete Event"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {evt.venue && (
                  <p className="text-[11px] text-subink mt-1 flex items-center gap-1">
                    <Building2 size={12} className="text-muted" />
                    <span>Venue: {evt.venue}</span>
                  </p>
                )}
              </div>
            ))}
            {visibleEvents.length === 0 && (
              <div className="col-span-full py-8 text-center text-[13px] text-muted rounded-xl border border-dashed border-line">
                No departmental events registered yet. Click &quot;Add
                Event&quot; above to schedule one.
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── STEP 4: Rule Setup Status & Timetable Hand-off ── */}
      <Card className="border-brand/20 bg-gradient-to-br from-card via-card to-brand-soft/20">
        <CardHead
          icon={<ShieldCheck size={18} className="text-brand" />}
          title="Rule Setup Status & Timetable Confirmation"
          sub="Confirm all faculty leaves, days off, and availability before generating or updating the timetable"
          action={
            <span
              className={`rounded-full px-3 py-1 text-[11.5px] font-bold ${
                constraintsComplete
                  ? "bg-good-soft text-good border border-good/20"
                  : "bg-panel text-muted border border-line"
              }`}
            >
              {constraintsComplete
                ? "Rules Ready for Timetable"
                : "Setup in Progress"}
            </span>
          }
        />
        <div className="p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3 max-w-2xl">
              <p className="text-[13px] leading-relaxed text-muted">
                Mark your departmental rules as ready once all faculty leaves,
                days off, and teaching constraints are entered. The BU Pulse
                timetable scheduler guarantees 100% adherence to every active
                rule.
              </p>

              {/* Counters Pill Summary */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {dynamicTabs.map(({ kind }) => {
                  const count = localConstraints.filter(
                    (c) => c.kind === kind,
                  ).length;
                  return (
                    <span
                      key={kind}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1 text-[11.5px] font-semibold text-ink"
                    >
                      <span className="text-muted">{kind}:</span>
                      <span className="font-bold text-brand">{count}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* Ready Toggle Button */}
              <button
                onClick={toggleConstraintsComplete}
                className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition cursor-pointer ${
                  constraintsComplete
                    ? "border-good/40 bg-good-soft/60"
                    : "border-line bg-panel hover:bg-card"
                }`}
              >
                <span
                  className={`text-[13.5px] font-bold ${
                    constraintsComplete ? "text-good" : "text-subink"
                  }`}
                >
                  {constraintsComplete
                    ? "Rules Marked as Ready"
                    : "Mark Rules as Ready"}
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
            </div>
          </div>
        </div>
      </Card>

      {editingConstraint && (
        <EditConstraintModal
          constraint={editingConstraint}
          activeDept={activeDept}
          lecturers={allDepartmentFaculty}
          onSave={updateConstraint}
          onClose={() => setEditingConstraint(null)}
        />
      )}
      <ConfirmationModal
        isOpen={Boolean(deletingConstraint)}
        onClose={() => {
          if (!isDeletingConstraint) setDeletingConstraint(null);
        }}
        onConfirm={async () => {
          if (deletingConstraint) {
            setIsDeletingConstraint(true);
            try {
              await deleteConstraint(deletingConstraint.id);
              setDeletingConstraint(null);
            } finally {
              setIsDeletingConstraint(false);
            }
          }
        }}
        isLoading={isDeletingConstraint}
        title="Delete constraint?"
        description="This constraint will be removed from the departmental rules used during timetable generation."
        confirmText="Delete constraint"
        variant="destructive"
      />
      {editingEvent && (
        <DepartmentalEventModal
          event={editingEvent}
          activeDept={activeDept}
          onSave={async (updates) => {
            await context.updateDepartmentalEvent(editingEvent.id, updates);
            setEditingEvent(null);
          }}
          onClose={() => setEditingEvent(null)}
        />
      )}
      <ConfirmationModal
        isOpen={Boolean(deletingEvent)}
        onClose={() => {
          if (!isDeletingEvent) setDeletingEvent(null);
        }}
        onConfirm={async () => {
          if (deletingEvent) {
            setIsDeletingEvent(true);
            try {
              await context.deleteDepartmentalEvent(deletingEvent.id);
              setDeletingEvent(null);
            } finally {
              setIsDeletingEvent(false);
            }
          }
        }}
        isLoading={isDeletingEvent}
        title="Delete event?"
        description="This departmental event will be removed from the backend and no longer considered during timetable review."
        confirmText="Delete event"
        variant="destructive"
      />
      {showAdd && (
        <AddModal
          kind={currentTabKind}
          typeDef={active.typeDef}
          activeDept={activeDept}
          availableLecturers={availableLecturers}
          allDepartmentFaculty={allDepartmentFaculty}
          activeAllocatedLecturers={activeAllocatedLecturers}
          onAdd={addConstraint}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showAddEvent && (
        <DepartmentalEventModal
          activeDept={activeDept}
          onSave={context.addDepartmentalEvent}
          onClose={() => setShowAddEvent(false)}
        />
      )}
    </div>
  );
}
