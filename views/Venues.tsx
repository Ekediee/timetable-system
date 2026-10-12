"use client";

import { useState } from "react";
import {
  Building2,
  Clock,
  CheckCircle2,
  Lock,
  Calendar,
  Info,
} from "lucide-react";
import { Card, CardHead, Pill } from "../components/ui";
import { venues, days, slots, type Session } from "../lib/data";
import { useApp } from "../lib/AppContext";

export default function Venues() {
  const { localSessions } = useApp();
  const [selectedVenue, setSelectedVenue] = useState<string>(
    venues[0]?.name ?? "CST Hall A",
  );

  const currentVenue =
    venues.find((v) => v.name === selectedVenue) ?? venues[0];

  // Helper to find session scheduled in selected venue at (day, slot) taking multi-hour duration into account
  function getSessionForCell(
    venueName: string,
    day: string,
    slot: string,
  ): Session | undefined {
    const slotIdx = slots.indexOf(slot as any);
    return localSessions.find((s) => {
      if (s.venue !== venueName || s.day !== day) return false;
      const startIdx = slots.indexOf(s.slot as any);
      const dur = s.duration ?? 1;
      return slotIdx >= startIdx && slotIdx < startIdx + dur;
    });
  }

  // Calculate statistics for selected venue
  let occupiedSlotsCount = 0;
  let freeSlotsCount = 0;

  days.forEach((d) => {
    slots.forEach((s) => {
      const isBreak = s === "13:00";
      const isWedOff = d === "Wed" && s === "17:00";
      const isFriOff =
        d === "Fri" &&
        (s === "13:00" ||
          s === "14:00" ||
          s === "15:00" ||
          s === "16:00" ||
          s === "17:00");
      const isSystemLocked = isBreak || isWedOff || isFriOff;

      if (!isSystemLocked) {
        const session = getSessionForCell(currentVenue.name, d, s);
        if (session) occupiedSlotsCount++;
        else freeSlotsCount++;
      }
    });
  });

  return (
    <div className="bp-fade grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Left side: Venues List */}
      <div className="lg:col-span-1">
        <Card>
          <CardHead
            icon={<Building2 size={18} />}
            title="Department Venues"
            sub="Mapped by Academic Planning (Read-only)"
          />
          <div className="space-y-2.5 px-5 pb-5">
            {venues.map((v) => {
              const active = selectedVenue === v.name;
              return (
                <button
                  key={v.name}
                  onClick={() => setSelectedVenue(v.name)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition ${
                    active
                      ? "border-brand bg-brand-soft/50 shadow-sm ring-1 ring-brand/30"
                      : "border-line bg-panel/60 hover:border-brand/20 hover:bg-panel"
                  }`}
                >
                  <div>
                    <p
                      className={`text-[13.5px] font-bold ${
                        active ? "text-brand-ink" : "text-ink"
                      }`}
                    >
                      {v.name}
                    </p>
                    <p className="text-[12px] text-muted">{v.block}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Pill tone={active ? "brand" : "neutral"}>
                      {v.capacity} seats
                    </Pill>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mx-5 mb-5 rounded-xl border border-line bg-panel/80 p-4 text-[12.5px] text-muted">
            <div className="flex items-center gap-1.5 font-semibold text-subink mb-1">
              <Info size={14} className="text-brand" /> Read-Only Venue
              Directory
            </div>
            Venue capacities and departmental mappings are maintained by
            Academic Planning. Select a venue to inspect its weekly availability
            schedule.
          </div>
        </Card>
      </div>

      {/* Right side: Read-only Availability Timetable for Selected Venue */}
      <div className="lg:col-span-2">
        <Card>
          <CardHead
            icon={<Clock size={18} />}
            title={`Availability Timetable — ${currentVenue.name}`}
            sub={`Capacity: ${currentVenue.capacity} seats · ${currentVenue.block} (Read-only)`}
            action={<Pill tone="brand">{currentVenue.capacity} Capacity</Pill>}
          />
          <div className="px-5 pb-5">
            {/* Stats summary strip */}
            <div className="mb-4 grid grid-cols-3 gap-3 rounded-xl border border-line bg-panel/40 p-3 text-center">
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted">
                  Capacity
                </p>
                <p className="text-[16px] font-bold text-ink">
                  {currentVenue.capacity} seats
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted">
                  Scheduled Hours
                </p>
                <p className="text-[16px] font-bold text-brand-ink">
                  {occupiedSlotsCount} hrs/wk
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted">
                  Available Hours
                </p>
                <p className="text-[16px] font-bold text-good">
                  {freeSlotsCount} hrs/wk
                </p>
              </div>
            </div>

            {/* Read-Only Timetable Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-2">
                  <div />
                  {days.map((d) => (
                    <div
                      key={d}
                      className="pb-2 text-center text-[12px] font-semibold uppercase tracking-wide text-muted"
                    >
                      {d}
                    </div>
                  ))}
                  {slots.map((s) => (
                    <div key={s} className="contents">
                      <div className="flex items-center text-[12px] font-medium text-muted">
                        {s}
                      </div>
                      {days.map((d) => {
                        const isBreak = s === "13:00";
                        const isWedOff = d === "Wed" && s === "17:00";
                        const isFriOff =
                          d === "Fri" &&
                          (s === "13:00" ||
                            s === "14:00" ||
                            s === "15:00" ||
                            s === "16:00" ||
                            s === "17:00");
                        const isSystemLocked = isBreak || isWedOff || isFriOff;

                        const session = getSessionForCell(
                          currentVenue.name,
                          d,
                          s,
                        );

                        if (isBreak) {
                          return (
                            <div
                              key={d + s}
                              className="flex h-11 items-center justify-center rounded-lg border border-dashed border-line bg-panel/60 text-[10.5px] font-semibold text-muted"
                            >
                              Lunch Break
                            </div>
                          );
                        }

                        if (isWedOff || isFriOff) {
                          return (
                            <div
                              key={d + s}
                              className="flex h-11 items-center justify-center rounded-lg border border-line bg-panel/30 text-[10px] font-medium text-muted/50"
                            >
                              <Lock size={11} className="mr-1 inline" /> Closed
                            </div>
                          );
                        }

                        if (session) {
                          return (
                            <div
                              key={d + s}
                              className="flex flex-col justify-center rounded-lg border border-brand/30 bg-brand-soft px-2 py-1 transition"
                            >
                              <p className="text-[11.5px] font-bold text-brand-ink truncate">
                                {session.code}
                              </p>
                              <p className="text-[9.5px] text-muted truncate">
                                {session.lecturer}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={d + s}
                            className="flex h-11 items-center justify-center rounded-lg border border-good/20 bg-good-soft/40 text-[10.5px] font-semibold text-good"
                          >
                            <CheckCircle2 size={12} className="mr-1 inline" />{" "}
                            Open
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Read-Only Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-between border-t border-line pt-3 text-[12px] text-muted">
              <div className="flex flex-wrap gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-good-soft ring-1 ring-good/20" />
                  Available Slot
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-brand-soft ring-1 ring-brand/30" />
                  Occupied (Scheduled Session)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-panel ring-1 ring-line" />
                  System Locked / Break
                </span>
              </div>
              <span className="italic text-[11.5px]">
                Read-only schedule view
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
