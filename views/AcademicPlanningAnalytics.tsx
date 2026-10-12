"use client";

import { BarChart2, CalendarDays, Building2, TrendingUp } from "lucide-react";
import { Card, CardHead, Pill } from "../components/ui";
import { type DeptSubmission } from "../lib/data";
import { useApp } from "../lib/AppContext";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const SLOTS = ["08:00", "10:00", "12:00", "14:00", "16:00"] as const;

export default function AcademicPlanningAnalytics(props?: {
  submissions?: DeptSubmission[];
}) {
  const context = useApp();
  const submissions = props?.submissions ?? context.deptSubs;
  if (!submissions) return null;

  const pipeline = {
    published: submissions.filter((s) => s.status === "published").length,
    approved: submissions.filter((s) => s.status === "approved").length,
    pending: submissions.filter((s) => s.status === "pending").length,
    returned: submissions.filter((s) => s.status === "returned").length,
    total: submissions.length,
  };

  const activeSubs = submissions.filter((s) => s.status !== "returned");
  const allSessions = activeSubs.flatMap((sub) => sub.sessions);

  // Venue utilization
  const venueMap = new Map<string, number>();
  for (const sess of allSessions) {
    venueMap.set(sess.venue, (venueMap.get(sess.venue) ?? 0) + 1);
  }
  const topVenues = Array.from(venueMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxVenue = Math.max(...topVenues.map((v) => v[1]), 1);

  // Time slot heatmap
  const heat: Record<string, Record<string, number>> = {};
  for (const day of DAYS) {
    heat[day] = {};
    for (const slot of SLOTS) heat[day][slot] = 0;
  }
  for (const sess of allSessions) {
    if (heat[sess.day]?.[sess.slot] !== undefined) {
      heat[sess.day][sess.slot]++;
    }
  }
  const maxHeat = Math.max(
    ...DAYS.flatMap((d) => SLOTS.map((s) => heat[d][s])),
    1,
  );

  const schools = Array.from(new Set(submissions.map((s) => s.school)));

  return (
    <div className="bp-fade grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* Left column */}
      <div className="xl:col-span-2 flex flex-col gap-5">

        {/* Pipeline */}
        <Card>
          <CardHead
            icon={<TrendingUp size={16} />}
            title="Submission pipeline"
            sub="First Semester 2025/26 — all departments"
          />
          <div className="px-5 pb-5">
            {/* Segmented progress bar */}
            <div className="mb-5 flex h-2.5 overflow-hidden rounded-full bg-line">
              {pipeline.published > 0 && (
                <div
                  className="h-full bg-brand"
                  style={{ width: `${(pipeline.published / pipeline.total) * 100}%` }}
                />
              )}
              {pipeline.approved > 0 && (
                <div
                  className="h-full bg-good"
                  style={{ width: `${(pipeline.approved / pipeline.total) * 100}%` }}
                />
              )}
              {pipeline.pending > 0 && (
                <div
                  className="h-full bg-warn"
                  style={{ width: `${(pipeline.pending / pipeline.total) * 100}%` }}
                />
              )}
              {pipeline.returned > 0 && (
                <div
                  className="h-full bg-bad/50"
                  style={{ width: `${(pipeline.returned / pipeline.total) * 100}%` }}
                />
              )}
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Published", value: pipeline.published, color: "text-brand", dot: "bg-brand" },
                { label: "Approved", value: pipeline.approved, color: "text-good", dot: "bg-good" },
                { label: "Pending", value: pipeline.pending, color: "text-warn", dot: "bg-warn" },
                { label: "Returned", value: pipeline.returned, color: "text-bad", dot: "bg-bad/50" },
              ].map(({ label, value, color, dot }) => (
                <div
                  key={label}
                  className="rounded-xl border border-line bg-white px-3.5 py-3"
                >
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    <span className="text-[11.5px] font-medium text-muted">{label}</span>
                  </div>
                  <p className={`text-[22px] font-bold leading-none tracking-[-0.02em] ${color}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Venue utilization */}
        <Card>
          <CardHead
            icon={<Building2 size={16} />}
            title="Venue utilization"
            sub={`Top ${topVenues.length} most-booked venues across active submissions`}
          />
          <div className="px-5 pb-5 space-y-3.5">
            {topVenues.length === 0 && (
              <p className="py-4 text-center text-[13px] text-muted">
                No active submissions to analyse.
              </p>
            )}
            {topVenues.map(([venue, count]) => (
              <div key={venue}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="max-w-[260px] truncate text-[12.5px] text-subink">
                    {venue}
                  </span>
                  <span className="ml-2 shrink-0 text-[12px] font-semibold text-ink">
                    {count}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-500"
                    style={{ width: `${(count / maxVenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Slot heatmap */}
        <Card>
          <CardHead
            icon={<CalendarDays size={16} />}
            title="Slot demand heatmap"
            sub="Concurrent sessions per time slot across active submissions"
          />
          <div className="px-5 pb-5">
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead>
                  <tr>
                    <th className="pb-3 pr-3 text-right text-[11.5px] font-semibold text-muted/0">
                      —
                    </th>
                    {DAYS.map((d) => (
                      <th
                        key={d}
                        className="pb-3 text-[12px] font-semibold text-muted"
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLOTS.map((slot) => (
                    <tr key={slot}>
                      <td className="py-1 pr-3 text-right text-[11.5px] font-medium text-muted">
                        {slot}
                      </td>
                      {DAYS.map((day) => {
                        const count = heat[day][slot];
                        const intensity = count / maxHeat;
                        return (
                          <td key={day} className="p-1">
                            <div
                              className="flex h-10 w-full items-center justify-center rounded-xl text-[12.5px] font-semibold transition-all"
                              style={{
                                backgroundColor:
                                  count > 0
                                    ? `rgba(47, 102, 255, ${0.08 + intensity * 0.72})`
                                    : "rgba(16, 19, 26, 0.04)",
                                color:
                                  intensity > 0.5
                                    ? "rgba(255,255,255,0.95)"
                                    : count > 0
                                      ? "#1e3a8a"
                                      : "#c0c5cc",
                              }}
                              title={`${day} ${slot}: ${count} session${count !== 1 ? "s" : ""}`}
                            >
                              {count > 0 ? count : "—"}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11.5px] text-muted">
              Darker cells = higher session volume. Returned submissions excluded.
            </p>
          </div>
        </Card>
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-5">
        <Card>
          <CardHead
            icon={<BarChart2 size={16} />}
            title="School readiness"
            sub="Progress toward full publication"
          />
          <div className="px-5 pb-5 space-y-5">
            {schools.map((school) => {
              const s = submissions.filter((sub) => sub.school === school);
              const pub = s.filter((sub) => sub.status === "published").length;
              const appr = s.filter((sub) => sub.status === "approved").length;
              const pend = s.filter((sub) => sub.status === "pending").length;
              const ret = s.filter((sub) => sub.status === "returned").length;
              const shortName = school.replace(/School of |College of /g, "");
              return (
                <div key={school}>
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <span className="text-[12.5px] font-semibold leading-tight text-ink">
                      {shortName}
                    </span>
                    <span className="shrink-0 text-[12px] text-muted">
                      {pub}/{s.length}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-good transition-all duration-500"
                      style={{ width: s.length ? `${(pub / s.length) * 100}%` : "0%" }}
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-2.5">
                    {pub > 0 && <span className="text-[10.5px] font-medium text-brand">{pub} published</span>}
                    {appr > 0 && <span className="text-[10.5px] font-medium text-good">{appr} approved</span>}
                    {pend > 0 && <span className="text-[10.5px] font-medium text-warn">{pend} pending</span>}
                    {ret > 0 && <span className="text-[10.5px] font-medium text-bad">{ret} returned</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="Department status" sub="All submissions at a glance" />
          <div className="divide-y divide-line-soft pb-2">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-ink">
                    {sub.department}
                  </p>
                  <p className="text-[11px] text-muted">{sub.level}</p>
                </div>
                <Pill
                  tone={
                    sub.status === "pending"
                      ? "warn"
                      : sub.status === "approved"
                        ? "good"
                        : sub.status === "published"
                          ? "brand"
                          : "bad"
                  }
                >
                  {sub.status}
                </Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
