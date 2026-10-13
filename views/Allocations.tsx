"use client";

import { useState, useMemo, useRef } from "react";
import {
  Search,
  Users,
  X,
  GraduationCap,
  BookOpen,
  Hash,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Globe,
  Layers,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, Pill, Button } from "../components/ui";
import {
  allocations as defaultAllocations,
  universityAllocations,
  type Allocation,
} from "../lib/data";
import { useApp } from "../lib/AppContext";
import { extractSubgroups } from "../lib/engine";

const typeTone: Record<string, "brand" | "violet" | "warn" | "neutral"> = {
  Core: "brand",
  Elective: "violet",
  GST: "warn",
};

const typeFilters = ["All", "Core", "Elective", "GST"] as const;
const levelFilters = ["All", "100 Level", "200 Level", "300 Level", "400 Level"] as const;
const groupFilters = ["All", "Group A", "Group B", "Group C", "Group D", "Group E", "Group F", "Direct Entry", "Unified / All"] as const;

function DetailModal({
  alloc,
  onClose,
}: {
  alloc: Allocation;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bp-fade w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Course detail
              </span>
              {alloc.isVirtual && (
                <span className="flex items-center gap-0.5 rounded bg-violet-soft px-1.5 py-0.2 text-[9.5px] font-semibold text-violet">
                  <Globe size={10} /> Virtual
                </span>
              )}
            </div>
            <h3 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-ink">
              {alloc.code}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3.5">
          <div className="rounded-xl bg-panel px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
              Title
            </p>
            <p className="mt-1 text-[14px] font-semibold text-ink leading-snug">
              {alloc.title}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-panel px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Lecturer
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-ink truncate">
                <Users size={13} className="text-brand shrink-0" />
                <span className="truncate">{alloc.lecturer}</span>
              </p>
            </div>
            <div className="rounded-xl bg-panel px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Type
              </p>
              <p className="mt-1.5">
                <Pill tone={typeTone[alloc.type] ?? "neutral"}>{alloc.type}</Pill>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-panel px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Level
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[13.5px] font-bold text-ink">
                <GraduationCap size={13} className="text-brand" />
                {alloc.level ? alloc.level.replace(" Level", "L") : "200L"}
              </p>
            </div>
            <div className="rounded-xl bg-panel px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Group
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[13px] font-bold text-ink">
                <Layers size={13} className="text-brand" />
                {alloc.group || "Unified"}
              </p>
            </div>
            <div className="rounded-xl bg-panel px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                Units
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[14px] font-bold text-brand">
                <BookOpen size={13} />
                {alloc.units}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Upload / Import Allocations Modal ─────────────────────────────────────────

function UploadModal({
  onClose,
  onApply,
  currentProgram,
}: {
  onClose: () => void;
  onApply: (newAllocs: Allocation[], programName: string) => void;
  currentProgram: string;
}) {
  const [sourceMode, setSourceMode] = useState<"master" | "file">("master");
  const [availablePrograms, setAvailablePrograms] = useState<Record<string, Allocation[]>>(
    universityAllocations
  );
  const [selectedProgram, setSelectedProgram] = useState<string>(
    universityAllocations[currentProgram] ? currentProgram : "Computer Science"
  );
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(
    "2026_2027_first_semester_allocation.xlsx"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewList = useMemo(() => {
    return availablePrograms[selectedProgram] || [];
  }, [availablePrograms, selectedProgram]);

  const previewUnits = useMemo(() => {
    return previewList.reduce((sum, a) => sum + a.units, 0);
  }, [previewList]);

  const previewLecturers = useMemo(() => {
    return new Set(previewList.map((a) => a.lecturer)).size;
  }, [previewList]);

  async function handleFileUpload(file: File) {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (file.name.endsWith(".csv")) {
        // Parse CSV client-side
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const parsed: Allocation[] = [];

        for (let i = 0; i < lines.length; i++) {
          const row = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
          // Look for row with course code
          if (row.length >= 4 && (row[0].toLowerCase().includes("code") || row[2].toLowerCase().includes("code"))) {
            continue; // header line
          }

          let code = "";
          let title = "";
          let units = 2;
          let group = "Group A";
          let lecturer = "Unassigned";

          if (row.length >= 7) {
            // Full format: Semester, Program, Course Code, Course Title, Unit, Group, Lecturer
            code = row[2];
            title = row[3];
            units = parseInt(row[4]) || 2;
            group = row[5] || "Group A";
            lecturer = row[6] || "Unassigned";
          } else if (row.length >= 5) {
            code = row[0];
            title = row[1];
            units = parseInt(row[2]) || 2;
            group = row[3] || "Group A";
            lecturer = row[4] || "Unassigned";
          }

          if (code) {
            const digits = code.match(/\d+/);
            let level = "200 Level";
            if (digits) {
              const num = parseInt(digits[0]);
              if (num >= 100 && num < 200) level = "100 Level";
              else if (num >= 200 && num < 300) level = "200 Level";
              else if (num >= 300 && num < 400) level = "300 Level";
              else if (num >= 400) level = "400 Level";
            }

            parsed.push({
              code,
              title,
              lecturer,
              units: Math.max(1, units),
              size: group === "All" ? 180 : 55,
              type: code.includes("GST") || code.includes("GEDS") ? "GST" : "Core",
              group,
              level,
              isVirtual: code.includes("GST") || code.includes("GEDS"),
            });
          }
        }

        if (parsed.length > 0) {
          const progName = file.name.replace(/\.[^/.]+$/, "");
          setAvailablePrograms((prev) => ({ ...prev, [progName]: parsed }));
          setSelectedProgram(progName);
          setUploadedFileName(file.name);
          setSourceMode("file");
        } else {
          setErrorMessage("No valid course allocations found in CSV file.");
        }
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        // Upload to API parser
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload-allocations", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.programs) {
          setAvailablePrograms(data.programs);
          const firstKey = Object.keys(data.programs)[0] || "Imported Program";
          setSelectedProgram(data.programs["Computer Science"] ? "Computer Science" : firstKey);
          setUploadedFileName(file.name);
          setSourceMode("file");
        } else {
          setErrorMessage(data.error || "Failed to parse Excel file.");
        }
      } else {
        setErrorMessage("Please upload an .xlsx, .xls, or .csv file.");
      }
    } catch (err: any) {
      setErrorMessage(`Error parsing file: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bp-fade flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-ink">
                Upload & Import Course Allocations
              </h3>
              <p className="text-[12px] text-muted">
                Import official university course allocation spreadsheets (.xlsx, .csv)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Tabs */}
          <div className="flex rounded-xl border border-line bg-panel p-1">
            <button
              onClick={() => setSourceMode("master")}
              className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition cursor-pointer ${
                sourceMode === "master"
                  ? "bg-card text-brand-ink shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              2026/2027 University Allocation Master (50 Programs)
            </button>
            <button
              onClick={() => setSourceMode("file")}
              className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition cursor-pointer ${
                sourceMode === "file"
                  ? "bg-card text-brand-ink shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              Upload Custom File (.xlsx / .csv)
            </button>
          </div>

          {/* Mode 1: Custom File Drag & Drop */}
          {sourceMode === "file" && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line-soft bg-panel/50 p-6 text-center transition hover:border-brand hover:bg-brand-soft/20 cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand mb-2">
                {isProcessing ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <Upload size={22} />
                )}
              </div>
              <p className="text-[14px] font-bold text-ink">
                {isProcessing ? "Parsing spreadsheet data…" : "Click or drag spreadsheet file here"}
              </p>
              <p className="text-[12px] text-muted mt-1">
                Supports official allocation Excel (.xlsx) and CSV exports
              </p>
              {uploadedFileName && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-card border border-line px-3 py-1 text-[12px] font-semibold text-brand">
                  <FileText size={13} />
                  <span>{uploadedFileName}</span>
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-bad-soft p-3 text-[12.5px] text-bad">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Program Selector */}
          <div className="rounded-xl border border-line bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className="text-[12px] font-bold uppercase tracking-wider text-muted block">
                  Select Department Program
                </label>
                <p className="text-[12.5px] text-subink mt-0.5">
                  Choose which department's course allocations to activate for timetabling:
                </p>
              </div>

              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="h-10 rounded-xl border border-line bg-panel px-3.5 text-[13px] font-bold text-ink outline-none focus:border-brand"
              >
                {Object.keys(availablePrograms)
                  .sort()
                  .map((prog) => (
                    <option key={prog} value={prog}>
                      {prog} ({availablePrograms[prog]?.length || 0} courses)
                    </option>
                  ))}
              </select>
            </div>

            {/* Program Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center text-[12px]">
              <div className="rounded-lg bg-panel p-2.5">
                <span className="text-muted block text-[11px] font-semibold uppercase">Total Courses</span>
                <span className="text-[16px] font-bold text-ink">{previewList.length}</span>
              </div>
              <div className="rounded-lg bg-panel p-2.5">
                <span className="text-muted block text-[11px] font-semibold uppercase">Total Units</span>
                <span className="text-[16px] font-bold text-brand">{previewUnits}</span>
              </div>
              <div className="rounded-lg bg-panel p-2.5">
                <span className="text-muted block text-[11px] font-semibold uppercase">Assigned Lecturers</span>
                <span className="text-[16px] font-bold text-ink">{previewLecturers}</span>
              </div>
              <div className="rounded-lg bg-panel p-2.5">
                <span className="text-muted block text-[11px] font-semibold uppercase">Covered Levels</span>
                <span className="text-[16px] font-bold text-subink">100L – 400L</span>
              </div>
            </div>
          </div>

          {/* Allocation Preview Table */}
          <div className="rounded-xl border border-line bg-card overflow-hidden">
            <div className="border-b border-line px-4 py-2.5 bg-panel/50 flex items-center justify-between">
              <span className="text-[12px] font-bold text-ink uppercase tracking-wider">
                Preview: {selectedProgram} ({previewList.length} Courses)
              </span>
              <span className="text-[11px] text-muted">First 15 courses previewed</span>
            </div>
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead className="sticky top-0 bg-panel text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-line">
                  <tr>
                    <th className="px-3.5 py-2">Code</th>
                    <th className="px-3.5 py-2">Title</th>
                    <th className="px-3.5 py-2">Lecturer</th>
                    <th className="px-3.5 py-2">Units</th>
                    <th className="px-3.5 py-2">Group</th>
                    <th className="px-3.5 py-2">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {previewList.slice(0, 15).map((a, idx) => (
                    <tr key={idx} className="hover:bg-panel/40">
                      <td className="px-3.5 py-2 font-bold text-ink whitespace-nowrap">{a.code}</td>
                      <td className="px-3.5 py-2 text-subink truncate max-w-[200px]">{a.title}</td>
                      <td className="px-3.5 py-2 text-muted whitespace-nowrap">{a.lecturer}</td>
                      <td className="px-3.5 py-2 font-semibold text-brand">{a.units}u</td>
                      <td className="px-3.5 py-2 text-muted">{a.group || "Unified"}</td>
                      <td className="px-3.5 py-2 text-muted">{a.level ?? "200L"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-line bg-panel/40 px-6 py-4">
          <p className="text-[12px] text-muted">
            Applying replaces current active course allocations across all views.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={previewList.length === 0 || isProcessing}
              onClick={() => onApply(previewList, selectedProgram)}
            >
              <Check size={15} /> Apply & Replace Allocations ({previewList.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Allocations Component ───────────────────────────────────────────────

export default function Allocations() {
  const context = useApp();
  const currentAllocations = context.localAllocations ?? defaultAllocations;
  const currentProgram = context.currentProgram ?? "Computer Science";

  const [q, setQ] = useState("");
  const [levelFilter, setLevelFilter] = useState<(typeof levelFilters)[number]>("All");
  const [typeFilter, setTypeFilter] = useState<(typeof typeFilters)[number]>("All");
  const [groupFilter, setGroupFilter] = useState<(typeof groupFilters)[number]>("All");
  const [selected, setSelected] = useState<Allocation | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const totalUnits = useMemo(() => {
    return currentAllocations.reduce((acc, a) => acc + a.units, 0);
  }, [currentAllocations]);

  const uniqueLecturers = useMemo(() => {
    return new Set(currentAllocations.map((a) => a.lecturer)).size;
  }, [currentAllocations]);

  const rows = useMemo(() => {
    return currentAllocations.filter((a) => {
      const matchQ =
        a.code.toLowerCase().includes(q.toLowerCase()) ||
        a.title.toLowerCase().includes(q.toLowerCase()) ||
        a.lecturer.toLowerCase().includes(q.toLowerCase());
      const matchType = typeFilter === "All" || a.type === typeFilter;
      const matchLevel = levelFilter === "All" || (a.level && a.level === levelFilter);
      const matchGroup =
        groupFilter === "All" ||
        (groupFilter === "Unified / All"
          ? !a.group || a.group === "All"
          : extractSubgroups(a.group).includes(groupFilter) || a.group === groupFilter);

      return matchQ && matchType && matchLevel && matchGroup;
    });
  }, [currentAllocations, q, typeFilter, levelFilter, groupFilter]);

  function handleApplyAllocations(newAllocs: Allocation[], programName: string) {
    context.setLocalAllocations(newAllocs);
    context.setCurrentProgram(programName);
    setShowUploadModal(false);
    setToastMessage(`Successfully activated ${newAllocs.length} allocations for ${programName}!`);
    setTimeout(() => setToastMessage(null), 4000);
  }

  return (
    <div className="bp-fade space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-brand/30 bg-card px-4 py-3 text-[13px] font-semibold text-ink shadow-2xl bp-fade">
          <CheckCircle2 size={16} className="text-brand shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Program Summary & Action Header Card */}
      <Card className="p-4 sm:p-5 border-brand/20 bg-gradient-to-r from-card via-card to-brand-soft/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white shadow-xs shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-ink">
                  {currentProgram} Course Allocations
                </h2>
                <Pill tone="brand">First Semester 2026/2027</Pill>
              </div>
              <p className="text-[12px] text-muted mt-0.5">
                Active dataset from official university allocation spreadsheet ·{" "}
                <span className="font-semibold text-subink">{currentAllocations.length} courses</span> ·{" "}
                <span className="font-semibold text-subink">{totalUnits} units</span> ·{" "}
                <span className="font-semibold text-subink">{uniqueLecturers} lecturers assigned</span>
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px]"
          >
            <Upload size={14} /> Upload / Import Excel
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {/* Filters bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Level Filter */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="h-8 rounded-lg border border-line bg-card px-2.5 text-[12px] font-semibold text-ink outline-none focus:border-brand"
            >
              {levelFilters.map((l) => (
                <option key={l} value={l}>
                  {l === "All" ? "All Levels" : l}
                </option>
              ))}
            </select>

            {/* Sub-group Filter */}
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value as any)}
              className="h-8 rounded-lg border border-line bg-card px-2.5 text-[12px] font-semibold text-ink outline-none focus:border-brand"
            >
              {groupFilters.map((g) => (
                <option key={g} value={g}>
                  {g === "All" ? "All Groups" : g}
                </option>
              ))}
            </select>

            {/* Type buttons */}
            <div className="flex gap-1 border-l border-line pl-2">
              {typeFilters.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition cursor-pointer ${
                    typeFilter === t
                      ? "bg-brand-soft text-brand-ink"
                      : "text-muted hover:bg-panel"
                  }`}
                >
                  {t}
                  {t !== "All" && (
                    <span className="ml-1 text-[10.5px] opacity-60">
                      ({currentAllocations.filter((a) => a.type === t).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search box & course count */}
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-muted">
              {rows.length} of {currentAllocations.length} courses
            </span>
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search courses or lecturers…"
                className="w-60 rounded-xl border border-line bg-panel py-1.5 pl-8 pr-3 text-[12.5px] outline-none transition focus:border-brand focus:bg-card focus:ring-2 focus:ring-brand-soft"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="px-2 pb-3">
          {/* Header */}
          <div className="grid grid-cols-[110px_1fr_160px_80px_70px_76px_74px] items-center gap-3 px-3 pb-2 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Code</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Course Title</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Lecturer</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Group</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Level</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Type</span>
            <span className="text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">Units</span>
          </div>

          {rows.map((a, i) => (
            <button
              key={a.code + a.group + i}
              onClick={() => setSelected(a)}
              className="group grid w-full grid-cols-[110px_1fr_160px_80px_70px_76px_74px] items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-panel cursor-pointer border-b border-line-soft last:border-0"
            >
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[13.5px] font-bold tracking-[-0.01em] text-ink truncate">
                  {a.code}
                </span>
                {a.isVirtual && (
                  <span title="Virtual Course" className="text-violet shrink-0">
                    <Globe size={11} />
                  </span>
                )}
              </div>
              <span className="truncate text-[13px] font-medium text-subink" title={a.title}>
                {a.title}
              </span>
              <span className="truncate text-[12.5px] text-muted" title={a.lecturer}>
                {a.lecturer}
              </span>
              <div>
                <span className="rounded bg-panel px-1.5 py-0.5 text-[10.5px] font-semibold text-subink">
                  {a.group || "Unified"}
                </span>
              </div>
              <div>
                <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-brand">
                  {a.level ? a.level.replace(" Level", "L") : "200L"}
                </span>
              </div>
              <div>
                <Pill tone={typeTone[a.type] ?? "neutral"}>{a.type}</Pill>
              </div>
              <div className="flex justify-end">
                <span className="rounded bg-panel px-2 py-0.5 text-[11px] font-bold text-ink">
                  {a.units}u
                </span>
              </div>
            </button>
          ))}

          {rows.length === 0 && (
            <p className="px-3 py-12 text-center text-[13px] text-muted">
              No course allocations match your search or active filters.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[12.5px] text-muted">
          <span>
            Showing {rows.length} of {currentAllocations.length} allocations
          </span>
          <span className="text-[11.5px]">Click any course row to view full details</span>
        </div>
      </Card>

      {/* Course Detail Modal */}
      {selected && (
        <DetailModal alloc={selected} onClose={() => setSelected(null)} />
      )}

      {/* Upload & Import Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onApply={handleApplyAllocations}
          currentProgram={currentProgram}
        />
      )}
    </div>
  );
}
