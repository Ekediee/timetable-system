"use client";

import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { Card, CardHead, Pill } from "./ui";
import ProgrammeFilterSelect from "./ProgrammeFilterSelect";
import {
  buildProgrammeFilterOptions,
  formatProgrammeLabel,
  matchesProgrammeFilter,
  type Session,
} from "../lib/data";

interface ReviewSessionsCardProps {
  title: string;
  sessions: Session[];
  maxItems?: number;
  maxHeightClass?: string;
  approvedMode?: boolean;
  selectedProgramme?: string;
  onProgrammeChange?: (value: string) => void;
}

/** Shared timetable session table with sub-programme filtering for HOD and Dean review views. */
export default function ReviewSessionsCard({
  title,
  sessions,
  maxItems,
  maxHeightClass = "max-h-[460px]",
  approvedMode = false,
  selectedProgramme: controlledProgramme,
  onProgrammeChange,
}: ReviewSessionsCardProps) {
  const [internalProgramme, setInternalProgramme] = useState<string>("all");
  const selectedProgramme = controlledProgramme ?? internalProgramme;
  const setSelectedProgramme = onProgrammeChange ?? setInternalProgramme;

  const programmeOptions = useMemo(
    () => buildProgrammeFilterOptions(sessions),
    [sessions],
  );

  const filteredSessions = useMemo(
    () =>
      sessions.filter((s) =>
        matchesProgrammeFilter(s.programme, selectedProgramme),
      ),
    [sessions, selectedProgramme],
  );

  const visibleSessions = maxItems
    ? filteredSessions.slice(0, maxItems)
    : filteredSessions;

  const subText =
    selectedProgramme === "all"
      ? approvedMode
        ? `${sessions.length} conflict-free sessions`
        : `${sessions.length} scheduled sessions`
      : `${filteredSessions.length} of ${sessions.length} sessions`;

  return (
    <Card>
      <CardHead
        icon={<Building2 size={16} />}
        title={title}
        sub={subText}
        action={
          <ProgrammeFilterSelect
            align="right"
            value={selectedProgramme}
            onChange={setSelectedProgramme}
            options={programmeOptions}
            className="h-8 rounded-xl border border-line bg-card px-3 text-[12px] font-semibold text-ink shadow-2xs hover:border-subink/30 focus:border-brand focus:ring-2 focus:ring-brand/15 cursor-pointer transition"
          />
        }
      />
      <div className={`${maxHeightClass} overflow-y-auto px-2 pb-3`}>
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[96px_130px_1fr_140px_108px_84px] items-center gap-3 px-3 pb-2 pt-1 border-b border-line text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
            <span>Code</span>
            <span>Programme</span>
            <span>Lecturer</span>
            <span>Venue</span>
            <span>Day / Time</span>
            <span className="text-right">Status</span>
          </div>
          {visibleSessions.length === 0 ? (
            <p className="py-8 text-center text-[12.5px] text-muted">
              No scheduled sessions match the selected programme filter.
            </p>
          ) : (
            visibleSessions.map((s, i) => (
              <div
                key={`${s.code}-${s.day}-${s.slot}-${s.programme ?? "general"}-${i}`}
                className="grid grid-cols-[96px_130px_1fr_140px_108px_84px] items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-panel/50 text-[12.5px]"
              >
                <span className="font-bold text-ink">{s.code}</span>
                <span
                  title={formatProgrammeLabel(s.programme)}
                  className="truncate text-[11.5px] font-medium text-subink"
                >
                  {formatProgrammeLabel(s.programme)}
                </span>
                <span className="truncate text-muted">{s.lecturer}</span>
                <span className="truncate text-subink font-medium">
                  {s.venue}
                </span>
                <span className="text-subink">
                  {s.day} · {s.slot}
                </span>
                <div className="flex justify-end">
                  {!approvedMode && s.conflict ? (
                    <Pill tone="bad">Conflict</Pill>
                  ) : (
                    <Pill tone="good">OK</Pill>
                  )}
                </div>
              </div>
            ))
          )}
          {maxItems && filteredSessions.length > maxItems && (
            <p className="pt-2 text-center text-[12px] text-muted">
              + {filteredSessions.length - maxItems} more scheduled sessions
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
