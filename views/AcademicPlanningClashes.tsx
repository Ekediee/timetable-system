"use client";

import { AlertTriangle, Building2, Clock, CheckCircle2, MapPin } from "lucide-react";
import { Card, CardHead, Pill } from "../components/ui";
import { type DeptSubmission } from "../lib/data";

type Booking = {
  dept: string;
  school: string;
  code: string;
  lecturer: string;
  status: string;
};

type ClashEntry = {
  venue: string;
  day: string;
  slot: string;
  bookings: Booking[];
};

const statusTone: Record<string, string> = {
  pending: "warn",
  approved: "good",
  published: "brand",
  returned: "bad",
};

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function detectClashes(submissions: DeptSubmission[]): ClashEntry[] {
  const active = submissions.filter((s) => s.status !== "returned");
  const map = new Map<string, Booking[]>();

  for (const sub of active) {
    for (const sess of sub.sessions) {
      const key = `${sess.venue}::${sess.day}::${sess.slot}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({
        dept: sub.department,
        school: sub.school,
        code: sess.code,
        lecturer: sess.lecturer,
        status: sub.status,
      });
    }
  }

  const clashes: ClashEntry[] = [];
  for (const [key, bookings] of map.entries()) {
    const depts = new Set(bookings.map((b) => b.dept));
    if (depts.size > 1) {
      const [venue, day, slot] = key.split("::");
      clashes.push({ venue, day, slot, bookings });
    }
  }

  return clashes.sort((a, b) => {
    const v = a.venue.localeCompare(b.venue);
    if (v !== 0) return v;
    const d = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (d !== 0) return d;
    return a.slot.localeCompare(b.slot);
  });
}

function deptAbbr(name: string) {
  return name
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function AcademicPlanningClashes({
  submissions,
}: {
  submissions: DeptSubmission[];
}) {
  if (!submissions) return null;

  const clashes = detectClashes(submissions);

  const byVenue = new Map<string, ClashEntry[]>();
  for (const clash of clashes) {
    if (!byVenue.has(clash.venue)) byVenue.set(clash.venue, []);
    byVenue.get(clash.venue)!.push(clash);
  }

  const deptsAffected = new Set(
    clashes.flatMap((c) => c.bookings.map((b) => b.dept)),
  ).size;

  const activeSubs = submissions.filter((s) => s.status !== "returned").length;

  return (
    <div className="bp-fade flex flex-col gap-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            value: clashes.length,
            label: "Conflicts detected",
            color: clashes.length > 0 ? "text-bad" : "text-good",
          },
          { value: byVenue.size, label: "Venues affected", color: "text-ink" },
          { value: deptsAffected, label: "Departments involved", color: "text-ink" },
          { value: activeSubs, label: "Active submissions", color: "text-ink" },
        ].map(({ value, label, color }) => (
          <div
            key={label}
            className="rounded-xl border border-line bg-white px-4 py-3.5"
          >
            <p className={`text-[26px] font-bold leading-none tracking-[-0.03em] ${color}`}>
              {value}
            </p>
            <p className="mt-2 text-[12.5px] font-medium text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* All clear */}
      {clashes.length === 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-good-soft">
              <CheckCircle2 size={28} className="text-good" />
            </div>
            <p className="text-[15px] font-bold text-ink">No cross-department clashes</p>
            <p className="max-w-[380px] text-center text-[13px] text-muted">
              All active submissions use unique venue assignments across departments.
            </p>
          </div>
        </Card>
      )}

      {/* Clash list */}
      {clashes.length > 0 && (
        <Card>
          <CardHead
            icon={<AlertTriangle size={16} className="text-bad" />}
            title="Cross-department venue conflicts"
            sub={`${clashes.length} time slot${clashes.length !== 1 ? "s" : ""} with double-booked venues`}
          />

          <div className="divide-y divide-line px-5 pb-2">
            {Array.from(byVenue.entries()).map(([venue, vClashes]) => (
              <div key={venue} className="py-5 first:pt-2">
                {/* Venue header */}
                <div className="mb-3 flex items-center gap-2">
                  <MapPin size={13} className="shrink-0 text-muted" />
                  <p className="text-[13.5px] font-bold text-ink">{venue}</p>
                  <span className="ml-auto text-[11.5px] font-semibold text-bad">
                    {vClashes.length} conflict{vClashes.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {vClashes.map((clash, i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-xl border border-line"
                    >
                      {/* Slot row */}
                      <div className="flex items-center gap-2 border-b border-line bg-panel px-4 py-2.5">
                        <Clock size={12} className="shrink-0 text-bad" />
                        <p className="text-[12.5px] font-semibold text-ink">
                          {clash.day}, {clash.slot}
                        </p>
                        <span className="ml-auto rounded-full bg-bad-soft px-2 py-0.5 text-[10.5px] font-semibold text-bad">
                          {clash.bookings.length} departments
                        </span>
                      </div>

                      {/* Bookings */}
                      <div className="divide-y divide-line-soft bg-white">
                        {clash.bookings.map((b, j) => (
                          <div key={j} className="flex items-center gap-3 px-4 py-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bad-soft text-[10.5px] font-bold text-bad">
                              {deptAbbr(b.dept)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold text-ink">
                                {b.code}
                                <span className="ml-2 text-[12px] font-normal text-muted">
                                  {b.dept}
                                </span>
                              </p>
                              <p className="truncate text-[11.5px] text-muted">
                                {b.lecturer}
                              </p>
                            </div>
                            <Pill tone={statusTone[b.status] ?? "warn"}>
                              {b.status}
                            </Pill>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardHead
          icon={<Building2 size={16} />}
          title="About cross-department clash detection"
          sub="Detection scope and resolution"
        />
        <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-3">
          {[
            {
              label: "What is detected",
              desc: "Two or more departments booking the same venue in the same time slot — even when neither flagged an internal conflict.",
            },
            {
              label: "What is excluded",
              desc: "Returned submissions are not scanned since they are under active revision. Only pending, approved, and published timetables are checked.",
            },
            {
              label: "How to resolve",
              desc: "Return the affected submission from the Review Queue with a note so the Dept T.O can reassign to a non-clashing venue.",
            },
          ].map(({ label, desc }) => (
            <div key={label} className="rounded-xl border border-line bg-white px-4 py-3.5">
              <p className="text-[13px] font-semibold text-ink">{label}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
