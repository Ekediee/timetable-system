"use client";

import { X, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { type DeptSubmission } from "../lib/data";
import { Pill } from "./ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const SLOTS = ["08:00", "10:00", "12:00", "14:00", "16:00"] as const;

export function exportTimetable(sub: DeptSubmission) {
  const rows = sub.sessions.map(
    (s) => `${s.day}\t${s.slot}\t${s.code}\t${s.lecturer}\t${s.venue}${s.conflict ? "\tCONFLICT" : ""}`,
  );
  const blob = new Blob(
    ["Day\tTime\tCode\tLecturer\tVenue\tNote\n" + rows.join("\n")],
    { type: "text/plain" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BUPulse-${sub.department.replace(/ /g, "-")}-${sub.level.replace(/ /g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TimetableModal({
  sub,
  onClose,
}: {
  sub: DeptSubmission;
  onClose: () => void;
}) {
  const conflicts = sub.sessions.filter((s) => s.conflict);

  function cell(day: string, slot: string) {
    return sub.sessions.filter((s) => s.day === day && s.slot === slot);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bp-fade flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">
              {sub.department} — {sub.level}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted">
              {sub.school} · {sub.semester}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {conflicts.length > 0 && (
              <Pill tone="bad">
                <AlertTriangle size={11} /> {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""}
              </Pill>
            )}
            {conflicts.length === 0 && (
              <Pill tone="good">
                <CheckCircle2 size={11} /> Conflict-free
              </Pill>
            )}
            <button
              onClick={() => exportTimetable(sub)}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-[12.5px] font-semibold text-subink transition hover:bg-line"
            >
              <Download size={13} /> Export
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-5">
          <div className="min-w-[700px]">
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: "64px repeat(5, 1fr)" }}
            >
              {/* Day headers */}
              <div />
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="pb-2 text-center text-[11.5px] font-bold uppercase tracking-widest text-muted"
                >
                  {d}
                </div>
              ))}

              {/* Rows */}
              {SLOTS.map((slot) => (
                <div key={slot} className="contents">
                  <div className="flex items-start pt-2 text-[11.5px] font-semibold text-muted">
                    {slot}
                  </div>
                  {DAYS.map((day) => {
                    const items = cell(day, slot);
                    return (
                      <div
                        key={day + slot}
                        className="min-h-[72px] rounded-xl border border-line-soft bg-panel/50 p-1.5"
                      >
                        {items.map((it, k) => (
                          <div
                            key={k}
                            className={`mb-1.5 rounded-lg border px-2.5 py-1.5 last:mb-0 ${
                              it.conflict
                                ? "border-bad/40 bg-bad-soft"
                                : "border-brand/20 bg-brand-soft"
                            }`}
                          >
                            <p
                              className={`text-[12px] font-bold leading-tight ${
                                it.conflict ? "text-bad" : "text-brand-ink"
                              }`}
                            >
                              {it.code}
                              {it.conflict && (
                                <AlertTriangle size={10} className="ml-1 inline" />
                              )}
                            </p>
                            <p className="mt-0.5 truncate text-[10.5px] leading-tight text-muted">
                              {it.venue}
                            </p>
                            <p className="truncate text-[10px] leading-tight text-muted/70">
                              {it.lecturer}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer summary */}
        <div className="flex items-center justify-between gap-4 border-t border-line px-6 py-3">
          <div className="flex gap-4 text-[12.5px] text-muted">
            <span><b className="text-ink">{sub.courses}</b> courses</span>
            <span><b className="text-ink">{sub.units}</b> units</span>
            <span><b className="text-ink">{sub.sessions.length}</b> sessions</span>
            {conflicts.length > 0 && (
              <span className="font-semibold text-bad">
                <b>{conflicts.length}</b> conflict{conflicts.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted">
            Dept T.O: {sub.deptTO} · HOD: {sub.hod} · Dean: {sub.dean}
          </p>
        </div>
      </div>
    </div>
  );
}
