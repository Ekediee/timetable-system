"use client";

import { useState, useMemo } from "react";
import {
  Building2,
  Clock,
  CheckCircle2,
  Lock,
  Calendar,
  Info,
  Search,
} from "lucide-react";
import { Card, CardHead, Pill } from "../components/ui";
import { venues as defaultVenues, days, slots, type Session, type Venue } from "../lib/data";
import { useApp } from "../lib/AppContext";

export default function Venues() {
  const context = useApp();
  const { localSessions, localVenues, externalBookings, timeLockConfig } = context;
  const venueList = localVenues?.length ? localVenues : defaultVenues;
  const [selectedVenue, setSelectedVenue] = useState<string>(
    venueList[0]?.name ?? "BUC_LAB1",
  );
  const [search, setSearch] = useState("");

  const filteredVenues = useMemo(() => {
    if (!search.trim()) return venueList;
    const q = search.toLowerCase();
    return venueList.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.block.toLowerCase().includes(q) ||
        (v.floor && v.floor.toLowerCase().includes(q)),
    );
  }, [venueList, search]);

  const currentVenue =
    venueList.find((v) => v.name === selectedVenue) ??
    filteredVenues[0] ??
    venueList[0];

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

  // Helper to find external department booking in selected venue at (day, slot)
  function getExternalBookingForCell(
    venueName: string,
    day: string,
    slot: string,
  ) {
    if (!externalBookings || externalBookings.length === 0) return undefined;
    const slotIdx = slots.indexOf(slot as any);
    return externalBookings.find((b) => {
      if (b.venue !== venueName || b.day !== day) return false;
      const startIdx = slots.indexOf(b.slot as any);
      const dur = b.duration ?? 1;
      return slotIdx >= startIdx && slotIdx < startIdx + dur;
    });
  }

  // Calculate statistics for selected venue using dynamic time lock configuration
  let occupiedSlotsCount = 0;
  let freeSlotsCount = 0;
  const cfg = context.timeLockConfig;

  days.forEach((d) => {
    slots.forEach((s) => {
      const isBreak = cfg?.lunchBreak?.enabled && s === cfg.lunchBreak.slot;
      const earlyClosing = cfg?.earlyClosings?.find(
        (ec) => ec.enabled && ec.day === d && slots.indexOf(s as any) >= slots.indexOf(ec.cutoffSlot)
      );
      const isSystemLocked = isBreak || !!earlyClosing;

      if (!isSystemLocked) {
        const session = getSessionForCell(currentVenue?.name ?? "", d, s);
        const external = getExternalBookingForCell(currentVenue?.name ?? "", d, s);
        if (session || external) occupiedSlotsCount++;
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
            sub={`Mapped by Academic Planning · ${venueList.length} venues`}
          />
          <div className="px-5 pb-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="text"
                placeholder="Search venue name, block, floor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-line bg-panel/70 py-2 pl-9 pr-3 text-[12.5px] text-ink placeholder-muted outline-none transition focus:border-brand focus:bg-card"
              />
            </div>
          </div>

          <div className="space-y-2 px-5 pb-5 max-h-[580px] overflow-y-auto">
            {filteredVenues.map((v) => {
              const active = currentVenue?.name === v.name;
              return (
                <button
                  key={v.name}
                  onClick={() => setSelectedVenue(v.name)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition ${
                    active
                      ? "border-brand bg-brand-soft/50 shadow-sm ring-1 ring-brand/30"
                      : "border-line bg-panel/60 hover:border-brand/20 hover:bg-panel"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p
                      className={`text-[13px] font-bold truncate ${
                        active ? "text-brand-ink" : "text-ink"
                      }`}
                    >
                      {v.name}
                    </p>
                    <p className="text-[11.5px] text-muted truncate">
                      {v.block} {v.floor ? `· ${v.floor}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Pill tone={active ? "brand" : "neutral"}>
                      {v.capacity} seats
                    </Pill>
                  </div>
                </button>
              );
            })}
            {filteredVenues.length === 0 && (
              <div className="py-8 text-center text-[12.5px] text-muted">
                No venues found matching &ldquo;{search}&rdquo;
              </div>
            )}
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
                        const isBreak = cfg?.lunchBreak?.enabled && s === cfg.lunchBreak.slot;
                        const earlyClosing = cfg?.earlyClosings?.find(
                          (ec) => ec.enabled && ec.day === d && slots.indexOf(s as any) >= slots.indexOf(ec.cutoffSlot)
                        );
                        const isSystemLocked = isBreak || !!earlyClosing;

                        const session = getSessionForCell(
                          currentVenue.name,
                          d,
                          s,
                        );
                        const external = getExternalBookingForCell(
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

                        if (earlyClosing) {
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

                        if (external) {
                          return (
                            <div
                              key={d + s}
                              className="flex flex-col justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 transition"
                              title={`Reserved by ${external.booked_by_department} for ${external.course_code} (${external.lecturer})`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 truncate">
                                  {external.course_code}
                                </p>
                                <span className="shrink-0 text-[8px] font-semibold uppercase px-1 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200">
                                  Locked
                                </span>
                              </div>
                              <p className="text-[9px] text-muted truncate">
                                {external.booked_by_department}
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
                  Occupied (Your Dept)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-amber-500/20 border border-amber-500/40" />
                  Locked (Other Dept)
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
