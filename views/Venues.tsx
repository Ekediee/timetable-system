"use client";

import { useState } from "react";
import { Building2, Clock, CheckCircle2, Ban } from "lucide-react";
import { Card, CardHead, Pill } from "../components/ui";
import { venues, days, slots } from "../lib/data";

const defaultBlocked = new Set([
  "Mon-08:00",
  "Wed-12:00",
  "Fri-16:00",
  "Thu-16:00",
]);

export default function Venues() {
  const [blocked, setBlocked] = useState(new Set(defaultBlocked));
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);

  function toggleSlot(key: string) {
    setBlocked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const openCount = days.length * slots.length - blocked.size;

  return (
    <div className="bp-fade grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardHead
            icon={<Building2 size={18} />}
            title="Department venues"
            sub="Mapped by Academic Planning"
          />
          <div className="space-y-2.5 px-5 pb-5">
            {venues.map((v) => {
              const active = selectedVenue === v.name;
              return (
                <button
                  key={v.name}
                  onClick={() =>
                    setSelectedVenue(active ? null : v.name)
                  }
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-brand/40 bg-brand-soft/50"
                      : "border-line bg-panel/60 hover:border-brand/20 hover:bg-panel"
                  }`}
                >
                  <div>
                    <p
                      className={`text-[13.5px] font-semibold ${
                        active ? "text-brand-ink" : "text-ink"
                      }`}
                    >
                      {v.name}
                    </p>
                    <p className="text-[12px] text-muted">{v.block}</p>
                  </div>
                  <Pill tone={active ? "brand" : "neutral"}>
                    {v.capacity} seats
                  </Pill>
                </button>
              );
            })}
          </div>
          {selectedVenue && (
            <div className="mx-5 mb-5 rounded-xl border border-brand/20 bg-brand-soft/30 px-4 py-3 text-[12.5px] text-brand-ink">
              Showing{" "}
              <span className="font-semibold">{selectedVenue}</span> — capacity{" "}
              <span className="font-semibold">
                {venues.find((v) => v.name === selectedVenue)?.capacity}
              </span>{" "}
              seats. Click a venue again to deselect.
            </div>
          )}
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHead
            icon={<Clock size={18} />}
            title="Timeslot availability"
            sub="Click any cell to toggle blocked / open for this department"
          />
          <div className="px-5 pb-5">
            <div className="overflow-x-auto">
              <div className="min-w-[520px]">
                <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-2">
                  <div />
                  {days.map((d) => (
                    <div
                      key={d}
                      className="pb-2 text-center text-[12px] font-semibold text-muted"
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
                        const key = `${d}-${s}`;
                        const off = blocked.has(key);
                        return (
                          <button
                            key={key}
                            onClick={() => toggleSlot(key)}
                            title={off ? "Click to open this slot" : "Click to block this slot"}
                            className={`flex h-11 items-center justify-center rounded-lg border text-[11px] font-semibold transition active:scale-95 ${
                              off
                                ? "border-line bg-panel text-muted hover:border-bad/30 hover:bg-bad-soft/40 hover:text-bad"
                                : "border-good/20 bg-good-soft text-good hover:bg-good/15 hover:border-good/40"
                            }`}
                          >
                            {off ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-5 text-[12px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-good-soft ring-1 ring-good/20" />
                  Open ({openCount})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-panel ring-1 ring-line" />
                  Blocked ({blocked.size})
                </span>
              </div>
              <button
                onClick={() => setBlocked(new Set(defaultBlocked))}
                className="text-[12px] font-semibold text-muted transition hover:text-brand"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
