"use client";

import { useState, useRef } from "react";
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
  Upload,
  Download,
  Copy,
  Check,
  AlertCircle,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  CheckCheck,
  ShieldCheck,
  Lock,
  Settings2,
  Sliders,
  CalendarOff,
  UserCog,
  Plane,
  Eye,
  HelpCircle,
  CheckCircle,
  Hash,
  Type,
  ListFilter,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Info,
} from "lucide-react";
import { Card, CardHead, Button, Pill } from "../components/ui";
import {
  venueRecords as VENUE_SEED,
  adjunctRecords as ADJUNCT_SEED,
  globalDaysOff as DAYS_OFF_SEED,
  globalStudyLeaves as STUDY_LEAVE_SEED,
  days,
  slots,
  type VenueRecord,
  type AdjunctRecord,
  type GlobalDayOff,
  type GlobalStudyLeave,
  type ConstraintTypeDefinition,
  type ConstraintRuleArchetype,
  type ConstraintParameterField,
  type ParameterFieldType,
  constraintArchetypeTemplates,
  defaultConstraintTypes,
  type Constraint,
} from "../lib/data";
import { useApp } from "../lib/AppContext";

type Tab = "venues" | "time" | "types";
type TimeTab = "adjuncts" | "studyleave" | "daysoff" | "timelocks";

const DEPARTMENTS = [
  { name: "Computer Science", school: "School of Computing & Engineering" },
  {
    name: "Electrical Engineering",
    school: "School of Computing & Engineering",
  },
  {
    name: "Mechanical Engineering",
    school: "School of Computing & Engineering",
  },
  { name: "Mass Communication", school: "School of Social Sciences" },
  { name: "Business Administration", school: "School of Management Sciences" },
  { name: "Accounting", school: "School of Management Sciences" },
  { name: "Law", school: "School of Law" },
  { name: "Nursing Science", school: "College of Health Sciences" },
  { name: "Central Administration", school: "University Central Services" },
  { name: "Academic Planning Office", school: "Vice-Chancellor's Office" },
];

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const VENUE_TYPE_COLORS: Record<string, string> = {
  "Lecture Hall": "warn",
  Lab: "brand",
  "Seminar Room": "violet",
  Auditorium: "good",
};

// ── CSV Parsing & N/A Normalization Helper ───────────────────────────────────

function isNAOrUnknown(val: string | undefined | null): boolean {
  if (!val) return true;
  const s = val.trim().toLowerCase();
  return (
    s === "" ||
    s === "n/a" ||
    s === "na" ||
    s === "n.a" ||
    s === "n.a." ||
    s === "unknown" ||
    s === "unk" ||
    s === "none" ||
    s === "null" ||
    s === "nil" ||
    s === "-" ||
    s === "--" ||
    s === "?" ||
    s === "undefined"
  );
}

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuote && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (char === "," && !inQuote) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

export type ParsedVenueItem = {
  id: string;
  raw: {
    deptOwner: string;
    venue: string;
    capacity: string;
    floor: string;
    spaceType: string;
  };
  name: string;
  capacity: number;
  type: "Lecture Hall" | "Seminar Room" | "Lab" | "Auditorium";
  assignedDept: string | null;
  school: string | null;
  floor: string;
  spaceType: "shared" | "exclusive";
  flags: {
    deptResolvedFromNA: boolean;
    venueNameFallback: boolean;
    capacityDefaulted: boolean;
    floorUnspecified: boolean;
    spaceTypeInferred: boolean;
    spaceTypeConflict: boolean;
  };
};

function normalizeFloor(raw: string): { floor: string; wasUnspecified: boolean } {
  if (isNAOrUnknown(raw)) {
    return { floor: "Unspecified", wasUnspecified: true };
  }
  const s = raw.trim();
  if (/^(0|g|ground|ground\s*floor|gf)$/i.test(s)) return { floor: "Ground Floor", wasUnspecified: false };
  if (/^(1|1st|first|1st\s*floor|f1)$/i.test(s)) return { floor: "1st Floor", wasUnspecified: false };
  if (/^(2|2nd|second|2nd\s*floor|f2)$/i.test(s)) return { floor: "2nd Floor", wasUnspecified: false };
  if (/^(3|3rd|third|3rd\s*floor|f3)$/i.test(s)) return { floor: "3rd Floor", wasUnspecified: false };
  if (/^(b|basement|lower)$/i.test(s)) return { floor: "Basement", wasUnspecified: false };
  return { floor: s, wasUnspecified: false };
}

function inferVenueType(name: string, cap: number): VenueRecord["type"] {
  const n = name.toLowerCase();
  if (/lab|laboratory|workshop|studio|clinic/i.test(n)) return "Lab";
  if (/auditorium|amphitheatre/i.test(n) || cap >= 500) return "Auditorium";
  if (/seminar|boardroom|conference/i.test(n) || cap <= 40) return "Seminar Room";
  return "Lecture Hall";
}

function processVenueRow(
  rawDept: string,
  rawVenue: string,
  rawCap: string,
  rawFloor: string,
  rawSpace: string,
  rowIdx: number
): ParsedVenueItem {
  // 1. Department Owner
  let assignedDept: string | null = null;
  let school: string | null = null;
  let deptResolvedFromNA = false;

  const deptTrimmed = (rawDept || "").trim();
  const deptLower = deptTrimmed.toLowerCase();
  if (isNAOrUnknown(deptTrimmed) || deptLower === "shared" || deptLower === "all" || deptLower === "unassigned") {
    assignedDept = null;
    school = null;
    deptResolvedFromNA = true;
  } else {
    const matched = DEPARTMENTS.find(
      (d) => d.name.toLowerCase() === deptLower
    );
    if (matched) {
      assignedDept = matched.name;
      school = matched.school;
    } else {
      assignedDept = deptTrimmed;
      school = "Departmental / Faculty Pool";
    }
  }

  // 2. Venue Name
  let name = rawVenue ? rawVenue.trim() : "";
  let venueNameFallback = false;
  if (isNAOrUnknown(name)) {
    name = `Unassigned Venue #${rowIdx + 1}`;
    venueNameFallback = true;
  }

  // 3. Capacity
  let capacity = 50;
  let capacityDefaulted = false;
  if (isNAOrUnknown(rawCap)) {
    capacityDefaulted = true;
    capacity = 50;
  } else {
    const num = parseInt(rawCap.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num) || num <= 0) {
      capacityDefaulted = true;
      capacity = 50;
    } else {
      capacity = num;
    }
  }

  // 4. Floor
  const { floor, wasUnspecified: floorUnspecified } = normalizeFloor(rawFloor);

  // 5. Space Type (shared / exclusive)
  let spaceType: "shared" | "exclusive" = "shared";
  let spaceTypeInferred = false;
  let spaceTypeConflict = false;

  if (!isNAOrUnknown(rawSpace)) {
    const s = rawSpace.trim().toLowerCase();
    if (s.includes("exclusive") || s.includes("dept") || s.includes("departmental")) {
      spaceType = "exclusive";
      if (!assignedDept) {
        spaceTypeConflict = true;
      }
    } else {
      spaceType = "shared";
    }
  } else {
    // Intelligent arrangement for N/A or Unknown space type:
    spaceTypeInferred = true;
    if (assignedDept) {
      spaceType = "exclusive";
    } else {
      spaceType = "shared";
    }
  }

  const type = inferVenueType(name, capacity);

  return {
    id: `up-${Date.now()}-${rowIdx}-${Math.random().toString(36).slice(2, 6)}`,
    raw: {
      deptOwner: rawDept,
      venue: rawVenue,
      capacity: rawCap,
      floor: rawFloor,
      spaceType: rawSpace,
    },
    name,
    capacity,
    type,
    assignedDept,
    school,
    floor,
    spaceType,
    flags: {
      deptResolvedFromNA,
      venueNameFallback,
      capacityDefaulted,
      floorUnspecified,
      spaceTypeInferred,
      spaceTypeConflict,
    },
  };
}

const SAMPLE_CSV_CONTENT = `Department owner, venue, capacity, floor, space type(shared / exclusive)
Computer Science, Lab 6 — Cyber Security, 55, 2nd Floor, exclusive
Electrical Engineering, Eng Hall E, 150, Ground Floor, exclusive
Computer Science, LT 12, 120, 2nd Floor, shared
Nursing Science, LT 5, 300, Ground Floor, shared
Law, LT 8, 280, Ground Floor, shared
Central Administration, Main Auditorium, 1200, Ground Floor, shared
Mass Communication, Studio 2 — Broadcast, 45, 3rd Floor, exclusive
N/A, Seminar Room C, 35, N/A, shared
Unknown, Unknown, unknown, unknown, unknown`;

// ── Upload Venues Modal Component ─────────────────────────────────────────────

function UploadVenuesModal({
  isOpen,
  onClose,
  onImport,
  currentCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (venues: VenueRecord[], mode: "append" | "replace") => void;
  currentCount: number;
}) {
  const [csvText, setCsvText] = useState("");
  const [items, setItems] = useState<ParsedVenueItem[]>([]);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  function parseInput(rawContent: string) {
    const lines = rawContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));

    if (lines.length === 0) {
      setItems([]);
      return;
    }

    // Determine header
    const firstLineCols = parseCsvLine(lines[0]);
    const isHeader =
      firstLineCols.some((col) =>
        /department|dept|owner|venue|room|hall|capacity|cap|floor|space/i.test(col)
      );

    let deptCol = 0;
    let venueCol = 1;
    let capCol = 2;
    let floorCol = 3;
    let spaceCol = 4;

    if (isHeader) {
      firstLineCols.forEach((col, idx) => {
        if (/department|dept|owner/i.test(col)) deptCol = idx;
        else if (/venue|room|hall|name/i.test(col)) venueCol = idx;
        else if (/capacity|cap|seats|size/i.test(col)) capCol = idx;
        else if (/floor|level|storey|story/i.test(col)) floorCol = idx;
        else if (/space|type|sharing/i.test(col)) spaceCol = idx;
      });
    }

    const dataLines = isHeader ? lines.slice(1) : lines;
    const parsed = dataLines.map((line, idx) => {
      const cols = parseCsvLine(line);
      return processVenueRow(
        cols[deptCol] ?? "",
        cols[venueCol] ?? "",
        cols[capCol] ?? "",
        cols[floorCol] ?? "",
        cols[spaceCol] ?? "",
        idx
      );
    });

    setItems(parsed);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseInput(content);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseInput(content);
    };
    reader.readAsText(file);
  }

  function handleLoadSample() {
    setCsvText(SAMPLE_CSV_CONTENT);
    parseInput(SAMPLE_CSV_CONTENT);
    setActiveTab("paste");
  }

  function handleDownloadSample() {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "bupulse_venues_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCopySample() {
    navigator.clipboard.writeText(SAMPLE_CSV_CONTENT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function updateItem(id: string, updates: Partial<ParsedVenueItem>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        // Recalculate type if name or capacity changed
        if (updates.name || updates.capacity) {
          updated.type = inferVenueType(updated.name, updated.capacity);
        }
        return updated;
      })
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleConfirmImport() {
    const converted: VenueRecord[] = items.map((i) => ({
      id: i.id,
      name: i.name,
      capacity: i.capacity,
      type: i.type,
      assignedDept: i.assignedDept,
      school: i.school,
      floor: i.floor,
      spaceType: i.spaceType,
    }));
    onImport(converted, importMode);
    onClose();
  }

  // Statistics on parsed items
  const totalParsed = items.length;
  const naResolved = items.filter(
    (i) =>
      i.flags.deptResolvedFromNA ||
      i.flags.capacityDefaulted ||
      i.flags.floorUnspecified ||
      i.flags.spaceTypeInferred
  ).length;
  const sharedCount = items.filter((i) => i.spaceType === "shared").length;
  const exclusiveCount = items.filter((i) => i.spaceType === "exclusive").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-line bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-soft text-violet">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-ink">
                Upload Venues via CSV
              </h2>
              <p className="text-[12px] text-muted">
                Academic Planning Office · Batch venue ingestion & space assignment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-bad/40 hover:text-bad"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Format Guidance & N/A arrangements notice */}
          <div className="mb-5 rounded-xl border border-violet/20 bg-violet-soft/30 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-bold text-violet">
                  Expected CSV Format Details:
                </p>
                <p className="mt-1 font-mono text-[11.5px] font-semibold text-ink">
                  Department owner, venue, capacity, floor, space type(shared / exclusive)
                </p>
                <div className="mt-2.5 grid grid-cols-1 gap-2 text-[11.5px] text-subink sm:grid-cols-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-good" />
                    <span><strong>N/A / Unknown Owner:</strong> Routes to Central Shared Pool</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-good" />
                    <span><strong>N/A / Unknown Capacity:</strong> Defaults safely to 50 seats</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-good" />
                    <span><strong>N/A / Unknown Floor:</strong> Marked as &quot;Unspecified&quot;</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-good" />
                    <span><strong>N/A / Unknown Space Type:</strong> Auto-inferred from Owner</span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                <button
                  onClick={handleDownloadSample}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-subink shadow-xs transition hover:border-brand/40 hover:text-brand-ink"
                >
                  <Download size={12} /> Template
                </button>
                <button
                  onClick={handleCopySample}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-subink shadow-xs transition hover:border-brand/40 hover:text-brand-ink"
                >
                  {copied ? <Check size={12} className="text-good" /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          {/* Input Method Switcher */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-1 rounded-lg border border-line bg-panel p-1">
              <button
                onClick={() => setActiveTab("file")}
                className={`rounded-md px-3 py-1 text-[12px] font-semibold transition ${
                  activeTab === "file" ? "bg-white text-ink shadow-xs" : "text-muted hover:text-subink"
                }`}
              >
                File Upload (.csv)
              </button>
              <button
                onClick={() => setActiveTab("paste")}
                className={`rounded-md px-3 py-1 text-[12px] font-semibold transition ${
                  activeTab === "paste" ? "bg-white text-ink shadow-xs" : "text-muted hover:text-subink"
                }`}
              >
                Paste CSV Text
              </button>
            </div>
            <button
              onClick={handleLoadSample}
              className="text-[12px] font-semibold text-brand underline decoration-brand/30 underline-offset-2 hover:text-brand-ink"
            >
              Load sample dataset with N/A & Unknown fields
            </button>
          </div>

          {/* Tab 1: File Dropzone */}
          {activeTab === "file" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="mb-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-panel/50 px-6 py-8 text-center transition hover:border-brand/40 hover:bg-brand-soft/10"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileSpreadsheet size={32} className="text-muted" />
              <p className="mt-2 text-[13.5px] font-semibold text-ink">
                Drag and drop your venues CSV file here
              </p>
              <p className="mt-1 text-[12px] text-muted">
                or click to browse from your computer (.csv, .txt)
              </p>
            </div>
          )}

          {/* Tab 2: Paste Raw Text */}
          {activeTab === "paste" && (
            <div className="mb-5">
              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  parseInput(e.target.value);
                }}
                rows={6}
                placeholder="Paste CSV lines here... (Department owner, venue, capacity, floor, space type)"
                className="w-full rounded-xl border border-line bg-panel/30 p-3 font-mono text-[12px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>
          )}

          {/* Parsed Results Section */}
          {items.length > 0 && (
            <div className="space-y-4">
              {/* Stats Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel/60 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
                  <span className="font-bold text-ink">
                    {totalParsed} venue{totalParsed !== 1 ? "s" : ""} parsed
                  </span>
                  <span className="text-muted">·</span>
                  <span className="text-violet font-semibold">
                    {exclusiveCount} Exclusive
                  </span>
                  <span className="text-muted">·</span>
                  <span className="text-brand font-semibold">
                    {sharedCount} Shared Pool
                  </span>
                  {naResolved > 0 && (
                    <>
                      <span className="text-muted">·</span>
                      <span className="flex items-center gap-1 font-semibold text-warn">
                        <AlertTriangle size={13} />
                        {naResolved} with N/A / Unknown resolved
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    setCsvText("");
                    setItems([]);
                  }}
                  className="text-[11.5px] text-muted hover:text-bad"
                >
                  Clear all
                </button>
              </div>

              {/* Review & Edit Table */}
              <div className="max-h-64 overflow-y-auto rounded-xl border border-line bg-white">
                <table className="w-full text-left text-[12px]">
                  <thead className="sticky top-0 border-b border-line bg-panel text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <tr>
                      <th className="py-2.5 pl-3 pr-2">Venue Name</th>
                      <th className="px-2 py-2.5">Dept Owner</th>
                      <th className="px-2 py-2.5">Cap.</th>
                      <th className="px-2 py-2.5">Floor</th>
                      <th className="px-2 py-2.5">Space Type</th>
                      <th className="px-2 py-2.5">Flags & Normalization</th>
                      <th className="py-2.5 pl-2 pr-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {items.map((item) => (
                      <tr key={item.id} className="transition hover:bg-panel/30">
                        {/* Venue Name */}
                        <td className="py-2 pl-3 pr-2 font-medium">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, { name: e.target.value })}
                            className={`h-7 w-36 rounded-md border px-2 text-[12px] font-semibold ${
                              item.flags.venueNameFallback
                                ? "border-warn bg-warn-soft/20 text-ink"
                                : "border-line bg-white text-ink focus:border-brand"
                            } focus:outline-none`}
                          />
                        </td>

                        {/* Dept Owner */}
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={item.assignedDept ?? ""}
                            placeholder="— Shared Pool (Unassigned) —"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val.trim() || isNAOrUnknown(val)) {
                                updateItem(item.id, {
                                  assignedDept: null,
                                  school: null,
                                });
                              } else {
                                const matched = DEPARTMENTS.find(
                                  (d) => d.name.toLowerCase() === val.trim().toLowerCase()
                                );
                                updateItem(item.id, {
                                  assignedDept: val,
                                  school: matched?.school ?? "Departmental / Faculty Pool",
                                });
                              }
                            }}
                            className={`h-7 w-40 rounded-md border px-2 text-[12px] font-medium ${
                              !item.assignedDept
                                ? "border-line bg-panel/50 italic text-muted placeholder:italic placeholder:text-muted/60"
                                : "border-line bg-white text-ink focus:border-brand"
                            } focus:outline-none`}
                            title={
                              item.assignedDept
                                ? `Department Owner: ${item.assignedDept} (${item.school ?? "Department"})`
                                : "Shared pool — unassigned"
                            }
                          />
                        </td>

                        {/* Capacity */}
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={item.capacity}
                            onChange={(e) =>
                              updateItem(item.id, {
                                capacity: Math.max(1, parseInt(e.target.value, 10) || 50),
                              })
                            }
                            className={`h-7 w-16 rounded-md border px-2 text-[12px] ${
                              item.flags.capacityDefaulted
                                ? "border-warn bg-warn-soft/20 font-semibold text-warn"
                                : "border-line bg-white text-ink"
                            } focus:border-brand focus:outline-none`}
                          />
                        </td>

                        {/* Floor */}
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={item.floor}
                            onChange={(e) => updateItem(item.id, { floor: e.target.value })}
                            className={`h-7 w-24 rounded-md border px-2 text-[11.5px] ${
                              item.flags.floorUnspecified
                                ? "border-line bg-panel text-muted"
                                : "border-line bg-white text-ink"
                            } focus:border-brand focus:outline-none`}
                          />
                        </td>

                        {/* Space Type */}
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.id, {
                                spaceType: item.spaceType === "exclusive" ? "shared" : "exclusive",
                              })
                            }
                            className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase transition ${
                              item.spaceType === "exclusive"
                                ? "bg-violet-soft text-violet hover:bg-violet-soft/80"
                                : "bg-good-soft text-good hover:bg-good-soft/80"
                            }`}
                          >
                            {item.spaceType}
                          </button>
                        </td>

                        {/* Flags */}
                        <td className="px-2 py-2 text-[11px]">
                          <div className="flex flex-wrap gap-1">
                            {item.flags.deptResolvedFromNA && (
                              <span className="rounded bg-brand-soft/80 px-1.5 py-0.5 text-[10px] font-medium text-brand-ink">
                                Owner N/A → Shared
                              </span>
                            )}
                            {item.flags.capacityDefaulted && (
                              <span className="rounded bg-warn-soft/80 px-1.5 py-0.5 text-[10px] font-medium text-warn">
                                Cap: 50 (was N/A)
                              </span>
                            )}
                            {item.flags.floorUnspecified && (
                              <span className="rounded bg-panel px-1.5 py-0.5 text-[10px] text-muted">
                                Floor: Unspecified
                              </span>
                            )}
                            {item.flags.spaceTypeInferred && (
                              <span className="rounded bg-violet-soft px-1.5 py-0.5 text-[10px] text-violet">
                                Inferred Space
                              </span>
                            )}
                            {!item.flags.deptResolvedFromNA &&
                              !item.flags.capacityDefaulted &&
                              !item.flags.floorUnspecified &&
                              !item.flags.spaceTypeInferred && (
                                <span className="rounded bg-good-soft px-1.5 py-0.5 text-[10px] text-good">
                                  Clean row
                                </span>
                              )}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-2 pl-2 pr-3 text-right">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-muted hover:text-bad"
                            title="Remove row"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel/30 px-6 py-4">
          <div className="flex items-center gap-4 text-[12.5px]">
            <span className="font-semibold text-muted">Import strategy:</span>
            <label className="flex cursor-pointer items-center gap-1.5 text-ink">
              <input
                type="radio"
                name="importMode"
                value="append"
                checked={importMode === "append"}
                onChange={() => setImportMode("append")}
                className="text-brand"
              />
              <span>Append to existing ({currentCount} current)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-ink">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
                className="text-brand"
              />
              <span>Replace entire inventory</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} className="h-9 px-4 text-[12.5px]">
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={items.length === 0}
              onClick={handleConfirmImport}
              className="h-9 px-5 text-[12.5px]"
            >
              Confirm & Import ({items.length} Venues)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Venues Tab ────────────────────────────────────────────────────────────────

function VenuesTab() {
  const [venues, setVenues] = useState<VenueRecord[]>(VENUE_SEED);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [spaceFilter, setSpaceFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  function assignVenue(id: string, deptName: string | null) {
    const dept = DEPARTMENTS.find(
      (d) => d.name.toLowerCase() === (deptName ?? "").toLowerCase()
    );
    setVenues((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              assignedDept: deptName,
              school: dept?.school ?? (deptName ? "Departmental / Faculty Pool" : null),
            }
          : v
      )
    );
    setEditingId(null);
  }

  const allKnownDepts = Array.from(
    new Set([
      ...DEPARTMENTS.map((d) => d.name),
      ...(venues.map((v) => v.assignedDept).filter(Boolean) as string[]),
    ])
  );

  function toggleVenueSpaceType(id: string) {
    setVenues((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              spaceType: v.spaceType === "exclusive" ? "shared" : "exclusive",
            }
          : v
      )
    );
  }

  function handleImportVenues(imported: VenueRecord[], mode: "append" | "replace") {
    if (mode === "replace") {
      setVenues(imported);
      setImportNotice(
        `Replaced inventory with ${imported.length} venues. All N/A & unknown fields successfully resolved.`
      );
    } else {
      setVenues((prev) => [...prev, ...imported]);
      setImportNotice(
        `Appended ${imported.length} new venues (total inventory: ${
          venues.length + imported.length
        } venues).`
      );
    }
    setTimeout(() => setImportNotice(null), 6000);
  }

  const filtered = venues.filter((v) => {
    if (
      search &&
      !v.name.toLowerCase().includes(search.toLowerCase()) &&
      !(v.assignedDept ?? "").toLowerCase().includes(search.toLowerCase()) &&
      !(v.floor ?? "").toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (typeFilter !== "all" && v.type !== typeFilter) return false;
    if (spaceFilter === "exclusive" && v.spaceType !== "exclusive") return false;
    if (spaceFilter === "shared" && v.spaceType !== "shared") return false;
    return true;
  });

  const exclusiveCount = venues.filter((v) => v.spaceType === "exclusive").length;
  const sharedCount = venues.filter((v) => v.spaceType === "shared").length;
  const totalSeats = venues.reduce((sum, v) => sum + v.capacity, 0);
  const schools = new Set(venues.filter((v) => v.school).map((v) => v.school)).size;

  return (
    <>
      {/* Upload Venues Modal */}
      <UploadVenuesModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onImport={handleImportVenues}
        currentCount={venues.length}
      />

      {/* Success Notification Banner */}
      {importNotice && (
        <div className="flex items-center justify-between rounded-xl border border-good/30 bg-good-soft px-4 py-3 text-[13px] text-good">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span className="font-medium">{importNotice}</span>
          </div>
          <button
            onClick={() => setImportNotice(null)}
            className="text-good/80 hover:text-good"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { value: venues.length, label: "Total venues", color: "text-ink" },
          { value: exclusiveCount, label: "Department Exclusive", color: "text-violet" },
          {
            value: sharedCount,
            label: "Shared pool (Central)",
            color: "text-brand",
          },
          { value: totalSeats.toLocaleString(), label: "Total capacity (seats)", color: "text-good" },
        ].map(({ value, label, color }) => (
          <div
            key={label}
            className="rounded-xl border border-line bg-white px-4 py-3.5"
          >
            <p
              className={`text-[26px] font-bold leading-none tracking-[-0.03em] ${color}`}
            >
              {value}
            </p>
            <p className="mt-2 text-[12.5px] font-medium text-muted">{label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHead
          icon={<MapPin size={16} />}
          title="Venue Inventory & Allocations"
          sub={`${filtered.length} venue${filtered.length !== 1 ? "s" : ""} · departmental & shared central venues`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                onClick={() => setUploadModalOpen(true)}
                className="flex h-8 items-center gap-1.5 px-3 text-[12px] font-semibold"
              >
                <Upload size={13} />
                <span>Upload CSV</span>
              </Button>
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
                value={spaceFilter}
                onChange={(e) => setSpaceFilter(e.target.value)}
                className="h-8 rounded-lg border border-line bg-panel px-2.5 text-[12px] text-subink focus:border-brand focus:outline-none"
              >
                <option value="all">All space types</option>
                <option value="exclusive">Exclusive only</option>
                <option value="shared">Shared pool only</option>
              </select>
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-2.5 text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search venues, depts, floors…"
                  className="h-8 w-44 rounded-lg border border-line bg-panel pl-7 pr-3 text-[12.5px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          }
        />

        {/* Desktop table header */}
        <div className="hidden grid-cols-[1.3fr_110px_100px_70px_110px_1.4fr_110px] items-center gap-4 border-b border-line px-5 pb-3 pt-1 sm:grid">
          {["Venue", "Type", "Floor", "Cap.", "Space Type", "Department Owner", "Actions"].map(
            (h) => (
              <span
                key={h}
                className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted last:text-right"
              >
                {h}
              </span>
            )
          )}
        </div>

        <div className="divide-y divide-line-soft">
          {filtered.map((venue) => (
            <div key={venue.id}>
              {/* Desktop row */}
              <div className="hidden grid-cols-[1.3fr_110px_100px_70px_110px_1.4fr_110px] items-center gap-4 px-5 py-3.5 transition hover:bg-panel/40 sm:grid">
                {/* Venue Name */}
                <div className="flex min-w-0 items-center gap-2">
                  <MapPin size={12} className="shrink-0 text-muted/60" />
                  <span className="truncate text-[13.5px] font-semibold text-ink">
                    {venue.name}
                  </span>
                  {venue.isVirtual && (
                    <span className="rounded bg-violet-soft px-1.5 py-0.5 text-[10px] font-bold text-violet">
                      Online
                    </span>
                  )}
                </div>

                {/* Type */}
                <div>
                  <Pill tone={VENUE_TYPE_COLORS[venue.type] ?? "warn"}>
                    {venue.type}
                  </Pill>
                </div>

                {/* Floor */}
                <div>
                  <span className="text-[12px] font-medium text-subink">
                    {venue.floor ?? "Ground Floor"}
                  </span>
                </div>

                {/* Capacity */}
                <span className="text-[12.5px] font-semibold text-subink">
                  {venue.capacity.toLocaleString()}
                </span>

                {/* Space Type */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleVenueSpaceType(venue.id)}
                    title="Click to toggle between Exclusive and Shared"
                    className="cursor-pointer transition hover:opacity-80"
                  >
                    {venue.spaceType === "exclusive" ? (
                      <Pill tone="violet">Exclusive</Pill>
                    ) : (
                      <Pill tone="brand">Shared</Pill>
                    )}
                  </button>
                </div>

                {/* Department Owner cell */}
                <div>
                  {editingId === venue.id ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={venue.assignedDept ?? ""}
                        onChange={(e) =>
                          assignVenue(venue.id, e.target.value || null)
                        }
                        autoFocus
                        className="h-7 flex-1 rounded-lg border border-brand bg-white px-2 text-[12px] text-ink focus:outline-none"
                      >
                        <option value="">— Unassigned (Central Pool) —</option>
                        {allKnownDepts.map((dName) => (
                          <option key={dName} value={dName}>
                            {dName}
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
                      <p className="text-[11px] text-muted">
                        {venue.school ?? "Department"}
                        {venue.spaceType === "shared" && (
                          <span className="ml-1 font-medium text-brand">· Shared Host</span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[12px] italic text-muted/60">
                      Central pool — unassigned
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
                      title="Clear assignment to shared pool"
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
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Pill tone={VENUE_TYPE_COLORS[venue.type] ?? "warn"}>
                        {venue.type}
                      </Pill>
                      <span className="text-[11.5px] text-muted">
                        · {venue.capacity} seats
                      </span>
                      <span className="text-[11.5px] text-muted">
                        · {venue.floor ?? "Ground Floor"}
                      </span>
                      {venue.spaceType === "exclusive" ? (
                        <Pill tone="violet">Exclusive</Pill>
                      ) : (
                        <Pill tone="brand">Shared</Pill>
                      )}
                    </div>
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
                    <option value="">— Unassigned (Shared Pool) —</option>
                    {allKnownDepts.map((dName) => (
                      <option key={dName} value={dName}>
                        {dName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-2">
                    {venue.assignedDept ? (
                      <p className="text-[12px] text-subink">
                        <span className="font-semibold text-ink">
                          {venue.assignedDept}
                        </span>{" "}
                        · {venue.school}
                        {venue.spaceType === "shared" && (
                          <span className="ml-1 font-medium text-brand">(Shared Host)</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-[12px] italic text-muted/60">
                        Central pool — not assigned to a department
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
          title="Space Policy & Rules"
          sub="How venue ownership, floors, and space types govern timetable allocation"
        />
        <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-3">
          {[
            {
              label: "Exclusive Department Spaces",
              desc: "Assigned solely to the department owner. The timetable engine blocks all other departments from allocating classes here.",
            },
            {
              label: "Shared Pool Venues",
              desc: "Unassigned central rooms (e.g. large LTs, auditoriums) open to all faculties for general courses (GST) or large lectures.",
            },
            {
              label: "CSV Ingestion Protocol",
              desc: "N/A or unknown owners automatically route to the Shared Pool, unknown capacities default to 50 seats, and unspecified floors are flagged for review.",
            },
          ].map(({ label, desc }) => (
            <div
              key={label}
              className="rounded-xl border border-line bg-white px-4 py-3.5"
            >
              <p className="text-[13px] font-semibold text-ink">{label}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

// ── Adjuncts Section (Read-Only Audit for Academic Planning) ────────────────

function AdjunctsSection() {
  const [adjuncts] = useState<AdjunctRecord[]>(ADJUNCT_SEED);
  const [filterDept, setFilterDept] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = adjuncts.filter((a) => {
    if (filterDept !== "all" && a.department !== filterDept) return false;
    if (
      search &&
      !a.name.toLowerCase().includes(search.toLowerCase()) &&
      !a.department.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <Card>
      <CardHead
        icon={<UserCheck size={16} />}
        title="Departmental Adjunct Rosters"
        sub={`${adjuncts.length} adjunct${adjuncts.length !== 1 ? "s" : ""} registered across departments · Read-only audit view`}
        action={
          <span className="rounded-full bg-panel border border-line px-2.5 py-1 text-[11px] font-semibold text-muted flex items-center gap-1.5">
            <Lock size={11} className="text-muted" /> Managed by Departmental TOs
          </span>
        }
      />

      <div className="mx-5 mb-4 rounded-xl border border-line/80 bg-panel/30 px-3.5 py-2.5 text-[12px] text-muted flex items-start gap-2.5">
        <Info size={15} className="text-brand shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-ink font-semibold">Institutional Audit View:</strong> Departmental Timetable Officers register and update their adjunct lecturers' teaching windows. Academic Planning defines the underlying constraint categories and audits adherence.
        </p>
      </div>

      {/* Filter and search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 pb-3">
        <div className="flex items-center gap-2">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="h-8 rounded-lg border border-line bg-card px-2.5 text-[12px] font-medium text-ink focus:border-brand focus:outline-none cursor-pointer"
          >
            <option value="all">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search adjuncts…"
            className="h-8 w-48 rounded-lg border border-line bg-card pl-8 pr-2.5 text-[12px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      <div className="divide-y divide-line-soft pb-1">
        {filtered.map((adj) => (
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
                <p className="text-[13.5px] font-semibold text-ink">
                  {adj.name}
                </p>
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
            <span className="rounded bg-panel/80 border border-line/60 px-2 py-0.5 text-[10.5px] font-medium text-muted">
              Audited
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-10 text-center text-[13.5px] text-muted">
            No adjunct lecturers registered.
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Study Leave Section (Read-Only Audit for Academic Planning) ───────────────

function StudyLeaveSection() {
  const [entries] = useState<GlobalStudyLeave[]>(STUDY_LEAVE_SEED);
  const [filterDept, setFilterDept] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = entries.filter((e) => {
    if (filterDept !== "all" && e.department !== filterDept) return false;
    if (
      search &&
      !e.lecturer.toLowerCase().includes(search.toLowerCase()) &&
      !e.department.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <Card>
      <CardHead
        icon={<Calendar size={16} />}
        title="Departmental Study Leave Submissions"
        sub={`${entries.length} active leave record${entries.length !== 1 ? "s" : ""} across departments · Read-only audit view`}
        action={
          <span className="rounded-full bg-panel border border-line px-2.5 py-1 text-[11px] font-semibold text-muted flex items-center gap-1.5">
            <Lock size={11} className="text-muted" /> Managed by Departmental TOs
          </span>
        }
      />

      <div className="mx-5 mb-4 rounded-xl border border-line/80 bg-panel/30 px-3.5 py-2.5 text-[12px] text-muted flex items-start gap-2.5">
        <Info size={15} className="text-brand shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-ink font-semibold">Institutional Audit View:</strong> Faculty study leave entries are registered by Departmental Timetable Officers. Academic Planning defines the Study Leave constraint category and audits semester coverage.
        </p>
      </div>

      {/* Filter and search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 pb-3">
        <div className="flex items-center gap-2">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="h-8 rounded-lg border border-line bg-card px-2.5 text-[12px] font-medium text-ink focus:border-brand focus:outline-none cursor-pointer"
          >
            <option value="all">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search faculty…"
            className="h-8 w-48 rounded-lg border border-line bg-card pl-8 pr-2.5 text-[12px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      <div className="divide-y divide-line-soft pb-1">
        {filtered.map((entry) => (
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
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {entry.reason}
                </p>
              )}
            </div>
            <span className="rounded bg-panel/80 border border-line/60 px-2 py-0.5 text-[10.5px] font-medium text-muted">
              Audited
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-10 text-center text-[13.5px] text-muted">
            No study leave records match criteria.
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Days Off Section (Read-Only Audit for Academic Planning) ──────────────────

function DaysOffSection() {
  const [entries] = useState<GlobalDayOff[]>(DAYS_OFF_SEED);
  const [filterDept, setFilterDept] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = entries.filter((e) => {
    if (filterDept !== "all" && e.department !== filterDept) return false;
    if (
      search &&
      !e.lecturer.toLowerCase().includes(search.toLowerCase()) &&
      !e.department.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <Card>
      <CardHead
        icon={<Clock size={16} />}
        title="Departmental Days Off Approvals"
        sub={`${entries.length} record${entries.length !== 1 ? "s" : ""} institution-wide · Read-only audit view`}
        action={
          <span className="rounded-full bg-panel border border-line px-2.5 py-1 text-[11px] font-semibold text-muted flex items-center gap-1.5">
            <Lock size={11} className="text-muted" /> Managed by Departmental TOs
          </span>
        }
      />

      <div className="mx-5 mb-4 rounded-xl border border-line/80 bg-panel/30 px-3.5 py-2.5 text-[12px] text-muted flex items-start gap-2.5">
        <Info size={15} className="text-brand shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-ink font-semibold">Institutional Audit View:</strong> Research, clinical, and administrative days off are assigned by Departmental Timetable Officers following Academic Planning category rules.
        </p>
      </div>

      {/* Filter and search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 pb-3">
        <div className="flex items-center gap-2">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="h-8 rounded-lg border border-line bg-card px-2.5 text-[12px] font-medium text-ink focus:border-brand focus:outline-none cursor-pointer"
          >
            <option value="all">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lecturer…"
            className="h-8 w-48 rounded-lg border border-line bg-card pl-8 pr-2.5 text-[12px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      <div className="divide-y divide-line-soft pb-1">
        {filtered.map((entry) => (
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
                {entry.recurring && <Pill tone="warn">Recurring</Pill>}
              </div>
              <p className="mt-1 text-[12.5px] font-medium text-subink">
                {entry.date}
              </p>
              {entry.reason && (
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {entry.reason}
                </p>
              )}
            </div>
            <span className="rounded bg-panel/80 border border-line/60 px-2 py-0.5 text-[10.5px] font-medium text-muted">
              Audited
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-10 text-center text-[13.5px] text-muted">
            No day-off records match criteria.
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Time Locks Section (Academic Planning Authority) ─────────────────────────

function TimeLocksSection() {
  const context = useApp();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [showAddLock, setShowAddLock] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDay, setNewDay] = useState<(typeof days)[number]>("Thu");
  const [newSlot, setNewSlot] = useState<(typeof slots)[number]>("12:00");
  const [newDuration, setNewDuration] = useState(1);
  const [newLevel, setNewLevel] = useState("All Levels");
  const [newReason, setNewReason] = useState("");

  const wedClosing = context.timeLockConfig.earlyClosings.find((c) => c.day === "Wed");
  const friClosing = context.timeLockConfig.earlyClosings.find((c) => c.day === "Fri");

  return (
    <div className="space-y-5">
      {/* Institutional Hours & Breaks Card */}
      <Card>
        <CardHead
          icon={<Clock size={17} />}
          title="Campus Operational Hours & Mandatory Breaks"
          sub="Institutional schedule rules enforced across all faculties and departments during timetable generation"
          action={
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand">
              Academic Planning Directorate
            </span>
          }
        />

        {toastMessage && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-[12px] font-semibold text-emerald-800">
            <CheckSquare size={14} className="text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 bg-panel/30">
          {/* Lunch Break */}
          <div className="rounded-xl border border-line bg-card p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 uppercase">
                  Daily Break
                </span>
                <button
                  onClick={() => {
                    context.toggleLunchBreak();
                    showToast(context.timeLockConfig.lunchBreak.enabled ? "Lunch break disabled" : "Lunch break activated");
                  }}
                  className={`rounded px-2 py-0.5 text-[10.5px] font-bold uppercase transition cursor-pointer ${
                    context.timeLockConfig.lunchBreak.enabled
                      ? "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25"
                      : "bg-panel text-muted hover:bg-line"
                  }`}
                >
                  {context.timeLockConfig.lunchBreak.enabled ? "Active" : "Disabled"}
                </button>
              </div>
              <h4 className="mt-2 text-[14px] font-bold text-ink">University Lunch Break</h4>
              <p className="mt-1 text-[12px] text-muted leading-relaxed">
                Daily period strictly locked across all schools. 2-hour classes cannot begin right before this hour.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
              <span className="font-semibold text-muted">Break Hour:</span>
              <select
                value={context.timeLockConfig.lunchBreak.slot}
                onChange={(e) => {
                  context.updateLunchBreak(e.target.value as any);
                  showToast(`Lunch break updated to ${e.target.value}`);
                }}
                className="rounded-md border border-line bg-card px-2 py-0.5 text-[11px] font-bold text-amber-800 outline-none cursor-pointer"
              >
                <option value="12:00">12:00 – 1:00 PM</option>
                <option value="13:00">1:00 PM – 2:00 PM</option>
                <option value="14:00">2:00 PM – 3:00 PM</option>
              </select>
            </div>
          </div>

          {/* Wednesday Early Closing */}
          <div className="rounded-xl border border-line bg-card p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-bold text-blue-700 uppercase">
                  Wednesday
                </span>
                <button
                  onClick={() => {
                    context.toggleEarlyClosing("wed-closing");
                    showToast(wedClosing?.enabled ? "Wednesday closing disabled" : "Wednesday closing activated");
                  }}
                  className={`rounded px-2 py-0.5 text-[10.5px] font-bold uppercase transition cursor-pointer ${
                    wedClosing?.enabled
                      ? "bg-blue-500/15 text-blue-700 hover:bg-blue-500/25"
                      : "bg-panel text-muted hover:bg-line"
                  }`}
                >
                  {wedClosing?.enabled ? "Active" : "Disabled"}
                </button>
              </div>
              <h4 className="mt-2 text-[14px] font-bold text-ink">Midweek Fellowship Closing</h4>
              <p className="mt-1 text-[12px] text-muted leading-relaxed">
                Lectures conclude early on Wednesdays for student fellowship, chapel life, and sports.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
              <span className="font-semibold text-muted">Concludes by:</span>
              <select
                value={wedClosing?.cutoffSlot || "17:00"}
                onChange={(e) => {
                  context.updateEarlyClosing("wed-closing", e.target.value as any);
                  showToast(`Wednesday curfew set to ${e.target.value}`);
                }}
                className="rounded-md border border-line bg-card px-2 py-0.5 text-[11px] font-bold text-blue-800 outline-none cursor-pointer"
              >
                <option value="16:00">4:00 PM (16:00)</option>
                <option value="17:00">5:00 PM (17:00)</option>
              </select>
            </div>
          </div>

          {/* Friday Early Closing */}
          <div className="rounded-xl border border-line bg-card p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[10.5px] font-bold text-violet uppercase">
                  Friday
                </span>
                <button
                  onClick={() => {
                    context.toggleEarlyClosing("fri-closing");
                    showToast(friClosing?.enabled ? "Friday closing disabled" : "Friday closing activated");
                  }}
                  className={`rounded px-2 py-0.5 text-[10.5px] font-bold uppercase transition cursor-pointer ${
                    friClosing?.enabled
                      ? "bg-violet-soft text-violet hover:bg-violet-soft/80"
                      : "bg-panel text-muted hover:bg-line"
                  }`}
                >
                  {friClosing?.enabled ? "Active" : "Disabled"}
                </button>
              </div>
              <h4 className="mt-2 text-[14px] font-bold text-ink">Friday Sabbath Closing</h4>
              <p className="mt-1 text-[12px] text-muted leading-relaxed">
                Academic activities conclude early on Fridays in preparation for the Sabbath and weekend transition.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
              <span className="font-semibold text-muted">Concludes by:</span>
              <select
                value={friClosing?.cutoffSlot || "13:00"}
                onChange={(e) => {
                  context.updateEarlyClosing("fri-closing", e.target.value as any);
                  showToast(`Friday closing set to ${e.target.value}`);
                }}
                className="rounded-md border border-line bg-card px-2 py-0.5 text-[11px] font-bold text-violet outline-none cursor-pointer"
              >
                <option value="12:00">12:00 PM</option>
                <option value="13:00">1:00 PM (13:00)</option>
                <option value="14:00">2:00 PM</option>
              </select>
            </div>
          </div>

          {/* Daily Operating Window (Dynamic & Editable by Academic Planning) */}
          <div className="rounded-xl border border-line bg-card p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 uppercase">
                  Mon – Thu
                </span>
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">
                  {context.timeLockConfig?.operatingWindow?.startSlot || "07:00"} – {context.timeLockConfig?.operatingWindow?.endSlot || "17:00"}
                </span>
              </div>
              <h4 className="mt-2 text-[14px] font-bold text-ink">Standard Teaching Hours</h4>
              <p className="mt-1 text-[12px] text-muted leading-relaxed">
                Standard university operating window. Regular class lectures and practicals are scheduled dynamically within these approved hours.
              </p>
            </div>
            <div className="mt-3 border-t border-line/60 pt-2">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-semibold text-muted">Operating Band:</span>
                <span className="font-mono text-[10.5px] font-bold text-emerald-700">
                  {context.timeLockConfig?.operatingWindow?.startSlot || "07:00"} – {context.timeLockConfig?.operatingWindow?.endSlot || "17:00"}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                <select
                  value={context.timeLockConfig?.operatingWindow?.startSlot || "07:00"}
                  onChange={(e) => {
                    const newStart = e.target.value as any;
                    const end = context.timeLockConfig?.operatingWindow?.endSlot || "17:00";
                    context.updateOperatingWindow(newStart, end);
                    showToast(`Standard teaching hours updated to ${newStart} – ${end} (Saved)`);
                  }}
                  className="w-full rounded-md border border-line bg-card px-1.5 py-1 text-[11px] font-bold text-emerald-800 outline-none cursor-pointer text-center"
                >
                  <option value="07:00">07:00 AM</option>
                  <option value="08:00">08:00 AM</option>
                  <option value="09:00">09:00 AM</option>
                </select>
                <span className="text-muted font-bold text-[10px]">to</span>
                <select
                  value={context.timeLockConfig?.operatingWindow?.endSlot || "17:00"}
                  onChange={(e) => {
                    const newEnd = e.target.value as any;
                    const start = context.timeLockConfig?.operatingWindow?.startSlot || "07:00";
                    context.updateOperatingWindow(start, newEnd);
                    showToast(`Standard teaching hours updated to ${start} – ${newEnd} (Saved)`);
                  }}
                  className="w-full rounded-md border border-line bg-card px-1.5 py-1 text-[11px] font-bold text-emerald-800 outline-none cursor-pointer text-center"
                >
                  <option value="16:00">04:00 PM</option>
                  <option value="17:00">05:00 PM</option>
                  <option value="18:00">06:00 PM</option>
                  <option value="19:00">07:00 PM</option>
                  <option value="20:00">08:00 PM</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* University Chapel Seminar Configuration */}
      <Card>
        <CardHead
          icon={<ShieldCheck size={17} />}
          title="Schoolwide Chapel Seminar & Citizenship Orientation"
          sub="Synchronized weekly seminar held in the University Amphitheatre with Pastor Chilaka Uzoma"
          action={
            <span className="rounded-full bg-good-soft px-2.5 py-0.5 text-[11px] font-bold text-good">
              4 Academic Levels
            </span>
          }
        />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["100 Level", "200 Level", "300 Level", "400 Level"] as const).map((lvl, index) => {
              const colors = ["bg-brand", "bg-blue-500", "bg-violet", "bg-emerald-500"];
              const textColors = ["text-brand", "text-blue-600", "text-violet", "text-emerald-600"];
              const item = context.timeLockConfig.chapelSeminarSchedule[lvl];
              const activeDay = item?.day || (index === 0 ? "Mon" : index === 1 ? "Tue" : index === 2 ? "Wed" : "Thu");
              const activeSlot = item?.slot || "09:00";

              return (
                <div key={lvl} className="rounded-xl border border-line bg-card p-4 relative overflow-hidden flex flex-col justify-between">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${colors[index]}`} />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-ink">{lvl}</span>
                      <span className={`rounded bg-panel px-2 py-0.5 text-[11px] font-bold ${textColors[index]}`}>
                        {activeDay} {activeSlot}
                      </span>
                    </div>
                    <p className="mt-2 text-[12.5px] font-bold text-ink">{item?.code || "BU-GST Seminar"}</p>
                    <p className="text-[11.5px] text-muted">{item?.title || "Chapel Seminar"}</p>
                    <div className="mt-3 space-y-1 text-[11px] text-subink pt-2 border-t border-line">
                      <p>📍 {item?.venue || "University Amphitheatre"}</p>
                      <p>👤 {item?.lecturer || "Pastor Chilaka Uzoma"}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-semibold text-muted">Adjust Slot:</span>
                    <div className="flex items-center gap-1">
                      <select
                        value={activeDay}
                        onChange={(e) => context.updateChapelSlot(lvl, e.target.value as any, activeSlot)}
                        className="rounded border border-line bg-panel px-1.5 py-0.5 text-[10.5px] font-semibold text-ink cursor-pointer"
                      >
                        <option value="Mon">Mon</option>
                        <option value="Tue">Tue</option>
                        <option value="Wed">Wed</option>
                        <option value="Thu">Thu</option>
                      </select>
                      <select
                        value={activeSlot}
                        onChange={(e) => context.updateChapelSlot(lvl, activeDay, e.target.value as any)}
                        className="rounded border border-line bg-panel px-1.5 py-0.5 text-[10.5px] font-semibold text-ink cursor-pointer"
                      >
                        <option value="08:00">08:00</option>
                        <option value="09:00">09:00</option>
                        <option value="10:00">10:00</option>
                        <option value="11:00">11:00</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Institutional Custom Locked Periods */}
      <Card>
        <CardHead
          icon={<Lock size={17} />}
          title="Institutional Custom Locked Periods & Blackouts"
          sub="Reserve recurring campus-wide time blocks for university assemblies, convocations, or Senate meetings"
          action={
            <Button variant="outline" onClick={() => setShowAddLock(true)}>
              <Plus size={14} /> Add University Lock
            </Button>
          }
        />
        <div className="p-5">
          {context.timeLockConfig.customTimeLocks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-8 text-center text-muted">
              <Lock size={24} className="mx-auto mb-2 text-muted/50" />
              <p className="text-[13px] font-semibold text-subink">No custom institutional locks active</p>
              <p className="text-[12px] text-muted mt-0.5">
                Lock recurring times for Senate meetings, convocation rehearsals, or all-university assemblies.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {context.timeLockConfig.customTimeLocks.map((lock) => (
                <div key={lock.id} className="rounded-xl border border-line bg-card p-3.5 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-ink">{lock.title}</span>
                      <button
                        onClick={() => context.toggleCustomTimeLock(lock.id)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase transition cursor-pointer ${
                          lock.enabled ? "bg-good-soft text-good" : "bg-panel text-muted"
                        }`}
                      >
                        {lock.enabled ? "Active" : "Off"}
                      </button>
                    </div>
                    <p className="text-[12px] text-muted mt-1 leading-relaxed">
                      {lock.reason || "Reserved university time period"}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-subink">
                    <span>
                      <strong>{lock.day}</strong> at <strong>{lock.slot}</strong> ({lock.duration}h) · {lock.level || "All"}
                    </span>
                    <button
                      onClick={() => context.deleteCustomTimeLock(lock.id)}
                      className="text-muted hover:text-bad transition cursor-pointer p-1"
                      title="Remove locked period"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Add Custom Lock Modal */}
      {showAddLock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs"
          onClick={() => setShowAddLock(false)}
        >
          <div
            className="bp-fade w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet text-white shadow-xs">
                  <Lock size={18} />
                </span>
                <div>
                  <h3 className="text-[17px] font-bold text-ink">Add University Time Lock</h3>
                  <p className="text-[12px] text-muted">
                    Lock a recurring time block across departments
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddLock(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-subink">
                  Title / Reason *
                </label>
                <input
                  type="text"
                  placeholder="e.g. University Senate Meeting or Convocation"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-[13px] font-medium text-ink outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-subink">
                    Day of Week
                  </label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value as any)}
                    className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-[12.5px] font-medium text-ink outline-none focus:border-brand"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-subink">
                    Start Slot
                  </label>
                  <select
                    value={newSlot}
                    onChange={(e) => setNewSlot(e.target.value as any)}
                    className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-[12.5px] font-medium text-ink outline-none focus:border-brand"
                  >
                    {slots.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-subink">
                    Duration
                  </label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-[12.5px] font-medium text-ink outline-none focus:border-brand"
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-subink">
                    Target Cohort
                  </label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-[12.5px] font-medium text-ink outline-none focus:border-brand"
                  >
                    <option value="All Levels">All Levels (Campus-wide)</option>
                    <option value="100 Level">100 Level</option>
                    <option value="200 Level">200 Level</option>
                    <option value="300 Level">300 Level</option>
                    <option value="400 Level">400 Level</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-subink">
                  Description / Operational Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. All lectures halted for monthly university academic assembly"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-[12.5px] font-medium text-ink outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-line/60 pt-4">
              <Button variant="outline" onClick={() => setShowAddLock(false)}>
                Cancel
              </Button>
              <Button
                disabled={!newTitle.trim()}
                onClick={() => {
                  context.addCustomTimeLock({
                    title: newTitle.trim(),
                    day: newDay,
                    slot: newSlot,
                    duration: newDuration,
                    level: newLevel,
                    department: "All",
                    reason: newReason.trim() || undefined,
                    enabled: true,
                  });
                  setNewTitle("");
                  setNewReason("");
                  setShowAddLock(false);
                }}
              >
                <Plus size={15} /> Save University Lock
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Constraint Types & Schema Registry (Academic Planning Exclusive) ──────────

function getArchetypeIcon(archetype: ConstraintRuleArchetype) {
  switch (archetype) {
    case "full_absence":
      return Plane;
    case "time_window":
      return CalendarOff;
    case "daily_load_limit":
      return Layers;
    case "consecutive_hours":
      return Clock;
    case "venue_requirement":
      return Building2;
    case "custom_rule":
    default:
      return ShieldCheck;
  }
}

function getArchetypeColor(archetype: ConstraintRuleArchetype): "brand" | "violet" | "warn" | "good" | "neutral" {
  switch (archetype) {
    case "full_absence":
      return "violet";
    case "time_window":
      return "warn";
    case "daily_load_limit":
      return "brand";
    case "consecutive_hours":
      return "warn";
    case "venue_requirement":
      return "good";
    case "custom_rule":
    default:
      return "neutral";
  }
}

interface DefineConstraintTypeModalProps {
  initialArchetype?: ConstraintRuleArchetype;
  existingType?: ConstraintTypeDefinition;
  onSave: (typeDef: Omit<ConstraintTypeDefinition, "id">) => void;
  onClose: () => void;
}

function DefineConstraintTypeModal({
  initialArchetype = "time_window",
  existingType,
  onSave,
  onClose,
}: DefineConstraintTypeModalProps) {
  const [selectedArchetype, setSelectedArchetype] = useState<ConstraintRuleArchetype>(
    existingType?.archetype || initialArchetype
  );
  // Default text values are left EMPTY so the placeholder is clearly seen!
  const [name, setName] = useState(existingType?.name || "");
  const [category, setCategory] = useState<ConstraintTypeDefinition["category"]>(
    existingType?.category || "Faculty Availability"
  );
  const [description, setDescription] = useState(existingType?.description || "");
  const [parameters, setParameters] = useState<ConstraintParameterField[]>(() => {
    if (existingType?.parameters && existingType.parameters.length > 0) {
      return [...existingType.parameters];
    }
    const tpl = constraintArchetypeTemplates.find((t) => t.archetype === initialArchetype);
    return tpl ? [...tpl.suggestedParameters] : [];
  });

  const [activeWizardTab, setActiveWizardTab] = useState<"template" | "details" | "parameters" | "preview">("template");

  // Switch template and pre-populate parameters
  function handleSelectTemplate(arch: ConstraintRuleArchetype) {
    setSelectedArchetype(arch);
    const tpl = constraintArchetypeTemplates.find((t) => t.archetype === arch);
    if (tpl) {
      setParameters([...tpl.suggestedParameters]);
    }
  }

  function addCustomParameter() {
    const newKey = `field_${Date.now()}`;
    setParameters([
      ...parameters,
      {
        key: newKey,
        label: "",
        type: "text",
        required: true,
        placeholder: "Enter details here...",
      },
    ]);
  }

  function updateParameter(index: number, updates: Partial<ConstraintParameterField>) {
    setParameters((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }

  function removeParameter(index: number) {
    setParameters((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      category,
      description: description.trim() || `Applies ${name.trim()} policy guidelines during timetable scheduling.`,
      archetype: selectedArchetype,
      parameters,
      isActive: true,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bp-fade flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-ink">
                {existingType ? "Edit Scheduling Rule" : "Create New Scheduling Rule"}
              </h3>
              <p className="text-[12px] text-muted">
                Academic Planning Guidelines · Step-by-Step Policy Builder
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

        {/* Wizard Steps Navigation */}
        <div className="flex border-b border-line bg-panel/50 px-6 pt-2">
          {[
            { id: "template" as const, label: "1. Choose Template", icon: Layers },
            { id: "details" as const, label: "2. Rule Name & Category", icon: FileText },
            { id: "parameters" as const, label: "3. Form Questions", icon: Sliders },
            { id: "preview" as const, label: "4. Preview Form", icon: Eye },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setActiveWizardTab(st.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[12.5px] font-semibold transition ${
                activeWizardTab === st.id
                  ? "border-brand text-brand"
                  : "border-transparent text-muted hover:text-subink"
              }`}
            >
              <st.icon size={14} />
              {st.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: ARCHETYPE TEMPLATE SELECTION */}
          {activeWizardTab === "template" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-[14px] font-bold text-ink">Choose a Starting Template</h4>
                <p className="text-[12px] text-muted">
                  Pick the pattern that best matches what you want to achieve. Each template already includes the most helpful form fields.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {constraintArchetypeTemplates.map((tpl) => {
                  const Icon = getArchetypeIcon(tpl.archetype);
                  const isSelected = selectedArchetype === tpl.archetype;
                  return (
                    <div
                      key={tpl.archetype}
                      onClick={() => handleSelectTemplate(tpl.archetype)}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        isSelected
                          ? "border-brand bg-brand-soft/20 ring-2 ring-brand/30"
                          : "border-line bg-panel/60 hover:border-muted hover:bg-panel"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              isSelected ? "bg-brand text-white" : "bg-card text-subink"
                            }`}
                          >
                            <Icon size={16} />
                          </div>
                          <span className="text-[13.5px] font-bold text-ink">{tpl.title}</span>
                        </div>
                        {isSelected && <CheckCircle size={16} className="text-brand shrink-0" />}
                      </div>
                      <p className="mt-2 text-[12px] leading-relaxed text-subink">{tpl.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {tpl.suggestedParameters.map((p) => (
                          <span
                            key={p.key}
                            className="inline-flex items-center rounded-md bg-card px-2 py-0.5 text-[10.5px] text-muted border border-line"
                          >
                            {p.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="primary" onClick={() => setActiveWizardTab("details")}>
                  Continue to Details <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: TYPE IDENTITY */}
          {activeWizardTab === "details" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-[14px] font-bold text-ink">Rule Name & Purpose</h4>
                <p className="text-[12px] text-muted">
                  Give this rule a clear, everyday name that lecturers and time officers will immediately recognize.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Rule Name <span className="text-bad">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Parental & Maternity Leave, Daily Teaching Cap, Sabbatical Duty"
                    className="w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wider text-muted mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft font-medium"
                    >
                      <option value="Faculty Availability">Faculty Availability & Leaves</option>
                      <option value="Workload & Pacing">Teaching Hours & Rest Breaks</option>
                      <option value="Venue & Space">Special Room Requirements</option>
                      <option value="Institutional">General University Policy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wider text-muted mb-1.5">
                      Rule Pattern
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13px] text-subink font-medium">
                      <span className="font-semibold text-ink capitalize">{selectedArchetype.replace("_", " ")}</span>
                      <span className="text-muted text-[11px]">(Selected in Step 1)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Guideline / Note for Officers
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain in plain words when this rule applies and how it affects lecturer schedules..."
                    className="w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[13px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setActiveWizardTab("template")}>
                  ← Back to Templates
                </Button>
                <Button variant="primary" onClick={() => setActiveWizardTab("parameters")}>
                  Configure Form Questions ({parameters.length}) <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: PARAMETER SCHEMA BUILDER */}
          {activeWizardTab === "parameters" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[14px] font-bold text-ink">Information to Collect</h4>
                  <p className="text-[12px] text-muted">
                    Choose what questions departmental officers need to answer when applying this rule to a lecturer.
                  </p>
                </div>
                <Button variant="outline" className="px-3 py-1.5 text-[12px]" onClick={addCustomParameter}>
                  <Plus size={14} /> Add Another Question / Field
                </Button>
              </div>

              <div className="space-y-3">
                {parameters.map((param, idx) => (
                  <div
                    key={param.key || idx}
                    className="rounded-xl border border-line bg-panel/60 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-card text-[11px] font-bold text-muted border border-line">
                          {idx + 1}
                        </span>
                        <span className="text-[13px] font-bold text-ink">
                          {param.label || "New Question"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-[11.5px] text-subink cursor-pointer font-medium">
                          <input
                            type="checkbox"
                            checked={param.required ?? true}
                            onChange={(e) => updateParameter(idx, { required: e.target.checked })}
                            className="rounded border-line text-brand focus:ring-brand"
                          />
                          Required
                        </label>
                        <button
                          type="button"
                          onClick={() => removeParameter(idx)}
                          className="text-muted hover:text-bad p-1 rounded transition cursor-pointer"
                          title="Remove Question"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                          Question Label (what users see)
                        </label>
                        <input
                          type="text"
                          value={param.label}
                          onChange={(e) => updateParameter(idx, { label: e.target.value })}
                          className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-brand"
                          placeholder="e.g. Daily Maximum Hours or Date Period"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                          Answer Type
                        </label>
                        <select
                          value={param.type}
                          onChange={(e) =>
                            updateParameter(idx, { type: e.target.value as ParameterFieldType })
                          }
                          className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-brand"
                        >
                          <option value="lecturer_select">Select Lecturer from List</option>
                          <option value="text">Short Text (e.g. Reason, Date, or Note)</option>
                          <option value="number">Number of Hours</option>
                          <option value="select">Dropdown Choice List</option>
                          <option value="days_multi">Select Days of the Week</option>
                          <option value="time_slot">Time of Day</option>
                          <option value="boolean">Yes / No Checkbox</option>
                        </select>
                      </div>
                    </div>

                    {param.type === "select" && (
                      <div>
                        <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                          Choices (separated by comma)
                        </label>
                        <input
                          type="text"
                          value={param.options?.join(", ") || ""}
                          onChange={(e) =>
                            updateParameter(idx, {
                              options: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="e.g. Option 1, Option 2, Option 3"
                          className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-brand"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                          Placeholder / Example Text
                        </label>
                        <input
                          type="text"
                          value={param.placeholder || ""}
                          onChange={(e) =>
                            updateParameter(idx, {
                              placeholder: e.target.value,
                            })
                          }
                          placeholder="e.g. e.g. 12 Jan – 28 Feb or Every Wednesday"
                          className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-brand"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                          Helpful Hint (optional)
                        </label>
                        <input
                          type="text"
                          value={param.hint || ""}
                          onChange={(e) => updateParameter(idx, { hint: e.target.value })}
                          placeholder="Small tip displayed under the input"
                          className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-brand"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setActiveWizardTab("details")}>
                  ← Back to Details
                </Button>
                <Button variant="primary" onClick={() => setActiveWizardTab("preview")}>
                  Preview Form <Eye size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: LIVE FORM PREVIEW */}
          {activeWizardTab === "preview" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-panel/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={16} className="text-brand" />
                  <h4 className="text-[13.5px] font-bold text-ink">Form Preview: What Officers Will See</h4>
                </div>
                <p className="text-[12px] text-muted">
                  This is the exact screen that departmental officers will see when adding a lecturer under <strong>&ldquo;{name || "Untitled Rule"}&rdquo;</strong>.
                </p>
              </div>

              {/* Simulated Form Container */}
              <div className="rounded-2xl border border-line bg-card p-6 shadow-sm space-y-4">
                <div className="border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-ink">Add {name || "New Rule"}</span>
                    <Pill tone={getArchetypeColor(selectedArchetype)}>{category}</Pill>
                  </div>
                  <p className="mt-1 text-[12px] text-subink">{description || "No description provided."}</p>
                </div>

                <div className="space-y-3.5">
                  {parameters.map((p) => (
                    <div key={p.key} className="space-y-1">
                      <label className="block text-[12px] font-semibold text-subink">
                        {p.label || "Untitled Field"} {p.required && <span className="text-bad">*</span>}
                      </label>
                      {p.type === "lecturer_select" ? (
                        <select className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-[13px] text-ink">
                          <option>ADEGBENJO Aderonke (Computer Science)</option>
                          <option>Ayankoya Folashade (Computer Science)</option>
                          <option>Akande Oyebola (Computer Science)</option>
                          <option>All Faculty Members</option>
                        </select>
                      ) : p.type === "number" ? (
                        <input
                          type="number"
                          defaultValue={p.defaultValue || 4}
                          className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-[13px] text-ink"
                        />
                      ) : p.type === "select" ? (
                        <select className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-[13px] text-ink">
                          {(p.options && p.options.length > 0
                            ? p.options
                            : ["Option A", "Option B", "Option C"]
                          ).map((opt) => (
                            <option key={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : p.type === "boolean" ? (
                        <label className="flex items-center gap-2 text-[12.5px] text-ink cursor-pointer pt-1">
                          <input type="checkbox" defaultChecked={p.defaultValue !== false} className="rounded" />
                          <span>Approved and active</span>
                        </label>
                      ) : p.type === "days_multi" ? (
                        <div className="flex gap-1.5 pt-1">
                          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                            <button
                              key={d}
                              type="button"
                              className="rounded-lg border border-line bg-panel px-2.5 py-1 text-[12px] font-medium text-subink hover:border-brand"
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder={p.placeholder || "Enter details here..."}
                          className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-[13px] text-ink"
                        />
                      )}
                      {p.hint && <p className="text-[11px] text-muted">{p.hint}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setActiveWizardTab("parameters")}>
                  ← Back to Questions
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                  <Check size={14} /> Save & Activate Rule
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Constraint Types Section ─────────────────────────────────────────────

function ConstraintTypesSection() {
  const context = useApp();
  const {
    constraintTypes,
    addConstraintType,
    updateConstraintType,
    deleteConstraintType,
    toggleConstraintType,
    resetConstraintTypesToDefault,
    localConstraints,
  } = context;

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ConstraintTypeDefinition | null>(null);
  const [selectedTemplateForModal, setSelectedTemplateForModal] = useState<ConstraintRuleArchetype | undefined>(
    undefined
  );

  const filteredTypes = constraintTypes.filter((t) => {
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.archetype.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Context Summary */}
      <Card>
        <div className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Sliders size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold text-ink">
                    Timetable Rules & Policy Templates
                  </h3>
                  <Pill tone="brand">{constraintTypes.filter((t) => t.isActive).length} Active Rules</Pill>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-subink max-w-2xl">
                  Set up university-wide teaching guidelines, leaves, and lecture hour limits.
                  Any rule created here is automatically followed when departments schedule their timetables.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="px-3 py-1.5 text-[12px]"
                onClick={() => {
                  if (confirm("Restore standard Babcock University rules and templates?")) {
                    resetConstraintTypesToDefault();
                  }
                }}
              >
                <RotateCcw size={14} /> Restore Standard Rules
              </Button>
              <Button
                variant="primary"
                className="px-3 py-1.5 text-[12px]"
                onClick={() => {
                  setEditingType(null);
                  setSelectedTemplateForModal(undefined);
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus size={15} /> Create New Rule
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Policy Templates Quick Creator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-[14px] font-bold text-ink flex items-center gap-2">
              <Layers size={16} className="text-brand" />
              Start from a Policy Template
            </h4>
            <p className="text-[12px] text-muted">
              Pick a template below to quickly set up a new rule for your faculty:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {constraintArchetypeTemplates.map((tpl) => {
            const Icon = getArchetypeIcon(tpl.archetype);
            const tone = getArchetypeColor(tpl.archetype);
            return (
              <div
                key={tpl.archetype}
                className="group relative flex flex-col justify-between rounded-xl border border-line bg-card p-4 transition hover:border-brand/50 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel text-brand">
                        <Icon size={16} />
                      </div>
                      <span className="text-[13px] font-bold text-ink">{tpl.title}</span>
                    </div>
                    <Pill tone={tone}>{tpl.archetype.replace("_", " ")}</Pill>
                  </div>
                  <p className="text-[12px] text-subink leading-relaxed line-clamp-2">
                    {tpl.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-[11px] text-muted font-medium">
                    {tpl.suggestedParameters.length} standard fields
                  </span>
                  <button
                    onClick={() => {
                      setEditingType(null);
                      setSelectedTemplateForModal(tpl.archetype);
                      setIsCreateModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-[12px] font-bold text-brand hover:underline cursor-pointer"
                  >
                    Use This Template →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Rules Registry List */}
      <Card>
        <CardHead
          title="Active University Rules"
          sub="Rules currently available for departmental scheduling"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <div className="flex rounded-lg border border-line bg-panel p-0.5">
                {["all", "Faculty Availability", "Workload & Pacing", "Venue & Space", "Institutional"].map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition ${
                        categoryFilter === cat
                          ? "bg-white text-ink shadow-xs"
                          : "text-muted hover:text-subink"
                      }`}
                    >
                      {cat === "all" ? "All Categories" : cat}
                    </button>
                  )
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 rounded-lg border border-line bg-panel pl-8 pr-3 text-[12px] text-ink outline-none focus:border-brand"
                />
              </div>
            </div>
          }
        />

        <div className="divide-y divide-line">
          {filteredTypes.map((typeDef) => {
            const Icon = getArchetypeIcon(typeDef.archetype);
            const activeInstanceCount = localConstraints.filter((c) => c.kind === typeDef.name).length;

            return (
              <div
                key={typeDef.id}
                className={`p-4 transition ${
                  typeDef.isActive ? "bg-card hover:bg-panel/40" : "bg-panel/20 opacity-70"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left info */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        typeDef.isActive ? "bg-brand-soft text-brand" : "bg-panel text-muted"
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-bold text-ink">{typeDef.name}</span>
                        <Pill tone={getArchetypeColor(typeDef.archetype)}>{typeDef.category}</Pill>
                        {typeDef.isSystemDefault ? (
                          <span className="rounded-md bg-panel px-2 py-0.5 text-[10.5px] font-medium text-subink">
                            Standard Rule
                          </span>
                        ) : (
                          <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10.5px] font-bold text-brand">
                            Custom Policy
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[12px] text-subink">{typeDef.description}</p>

                      {/* Information Required */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-muted uppercase tracking-wider mr-1">
                          Information required ({typeDef.parameters.length}):
                        </span>
                        {typeDef.parameters.map((p) => (
                          <span
                            key={p.key}
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-panel px-2 py-0.5 text-[11px] text-subink"
                          >
                            <span className="font-semibold text-ink">{p.label}</span>
                            {p.required && <span className="text-bad font-bold">*</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 shrink-0">
                    {/* Active Instances Count */}
                    <div className="text-right mr-2">
                      <span className="text-[13px] font-bold text-ink">{activeInstanceCount}</span>
                      <span className="block text-[10.5px] text-muted">Dept instances</span>
                    </div>

                    {/* Toggle Active */}
                    <button
                      onClick={() => toggleConstraintType(typeDef.id)}
                      className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold transition cursor-pointer ${
                        typeDef.isActive
                          ? "border-good/30 bg-good-soft/30 text-good-ink"
                          : "border-line bg-panel text-muted"
                      }`}
                    >
                      {typeDef.isActive ? (
                        <>
                          <Check size={13} /> Active
                        </>
                      ) : (
                        "Disabled"
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => {
                        setEditingType(typeDef);
                        setSelectedTemplateForModal(typeDef.archetype);
                        setIsCreateModalOpen(true);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-card text-subink hover:border-brand hover:text-brand transition cursor-pointer"
                      title="Edit Category & Parameters"
                    >
                      <Edit2 size={13} />
                    </button>

                    {/* Delete (custom only) */}
                    {!typeDef.isSystemDefault && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to delete the "${typeDef.name}" rule?`
                            )
                          ) {
                            deleteConstraintType(typeDef.id);
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-card text-muted hover:border-bad hover:text-bad transition cursor-pointer"
                        title="Delete Custom Rule"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredTypes.length === 0 && (
            <div className="py-12 text-center text-muted">
              <Sliders size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-[13px] font-medium text-ink">No rules match your search</p>
              <p className="text-[12px]">Adjust your filter or click Create New Rule</p>
            </div>
          )}
        </div>
      </Card>

      {/* Define / Edit Modal */}
      {isCreateModalOpen && (
        <DefineConstraintTypeModal
          initialArchetype={selectedTemplateForModal || "time_window"}
          existingType={editingType || undefined}
          onSave={(typeDef) => {
            if (editingType) {
              updateConstraintType(editingType.id, typeDef);
            } else {
              addConstraintType(typeDef);
            }
          }}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingType(null);
            setSelectedTemplateForModal(undefined);
          }}
        />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AcademicPlanningConstraints() {
  const [tab, setTab] = useState<Tab>("types");
  const [timeTab, setTimeTab] = useState<TimeTab>("timelocks");
  const { constraintTypes } = useApp();

  const timeTabs: { id: TimeTab; label: string; Icon: typeof Users }[] = [
    { id: "timelocks", label: "Campus Time Locks & Rules", Icon: ShieldCheck },
    { id: "adjuncts", label: "Adjunct Rosters (Audit)", Icon: UserCheck },
    { id: "studyleave", label: "Study Leave (Audit)", Icon: Calendar },
    { id: "daysoff", label: "Days Off (Audit)", Icon: Clock },
  ];

  const activeTypesCount = constraintTypes.filter((t) => t.isActive).length;

  return (
    <div className="bp-fade flex flex-col gap-5">
      {/* Primary tab bar */}
      <div className="flex w-fit gap-1 rounded-xl border border-line bg-panel p-1">
        {[
          {
            id: "types" as const,
            label: "Constraint Categories & Policy",
            Icon: Sliders,
            badge: `${activeTypesCount}`,
          },
          { id: "time" as const, label: "Time Locks & Audit", Icon: Clock },
          {
            id: "venues" as const,
            label: "Venue Assignments",
            Icon: Building2,
          },
        ].map(({ id, label, Icon, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors cursor-pointer ${
              tab === id ? "bg-white text-ink shadow-xs" : "text-muted hover:text-subink"
            }`}
          >
            <Icon size={14} />
            {label}
            {badge && (
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10.5px] font-bold ${
                  tab === id ? "bg-brand text-white" : "bg-panel text-muted border border-line"
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Venues tab */}
      {tab === "venues" && <VenuesTab />}

      {/* Constraint Types & Templates tab */}
      {tab === "types" && <ConstraintTypesSection />}

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
          {timeTab === "timelocks" && <TimeLocksSection />}
        </>
      )}
    </div>
  );
}
