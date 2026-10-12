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
    setForm({
      name: "",
      department: "",
      courses: "",
      availableDays: [],
      note: "",
    });
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
          <p className="mb-3 text-[13px] font-semibold text-ink">
            New adjunct lecturer
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-muted">
                Full name
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
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
            <button
              onClick={() =>
                setAdjuncts((p) => p.filter((a) => a.id !== adj.id))
              }
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
          <p className="mb-3 text-[13px] font-semibold text-ink">
            New study leave entry
          </p>
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, from: e.target.value }))
                }
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
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {entry.reason}
                </p>
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
    setForm({
      lecturer: "",
      department: "",
      date: "",
      reason: "",
      recurring: false,
    });
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
          <p className="mb-3 text-[13px] font-semibold text-ink">
            New day-off record
          </p>
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
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
                onClick={() =>
                  setForm((f) => ({ ...f, recurring: !f.recurring }))
                }
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
        {[
          {
            id: "venues" as const,
            label: "Venue Assignments",
            Icon: Building2,
          },
          { id: "time" as const, label: "Time Constraints", Icon: Clock },
        ].map(({ id, label, Icon }) => (
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
