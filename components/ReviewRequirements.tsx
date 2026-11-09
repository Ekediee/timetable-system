"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardList } from "lucide-react";
import { Card, CardHead, Pill, Skeleton } from "./ui";
import { constraintsApi, departmentalEventsApi } from "../lib/api";
import { CURRENT_SESSION, CURRENT_SEMESTER } from "../lib/config";
import type { Constraint, DepartmentalEvent } from "../lib/data";
import type { ReactNode } from "react";

// Fast in-memory cache per department so tab / department switches are instant
const requirementsCache = new Map<
  string,
  { constraints: Constraint[]; events: DepartmentalEvent[] }
>();

function RequirementsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, col) => (
        <div
          key={col}
          className="rounded-xl border border-line bg-panel/30 p-3.5 space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-md" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, row) => (
              <div
                key={row}
                className="rounded-lg border border-line bg-card/60 p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReviewRequirements({ department }: { department: string }) {
  const cacheKey = `${(department || "").trim().toLowerCase()}_${CURRENT_SESSION}_${CURRENT_SEMESTER}`;
  const cachedData = requirementsCache.get(cacheKey);

  const [constraints, setConstraints] = useState<Constraint[]>(() => cachedData?.constraints || []);
  const [events, setEvents] = useState<DepartmentalEvent[]>(() => cachedData?.events || []);
  const [loading, setLoading] = useState(!cachedData && Boolean(department?.trim()));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!department || !department.trim()) {
      setLoading(false);
      setConstraints([]);
      setEvents([]);
      return;
    }

    if (requirementsCache.has(cacheKey)) {
      const cached = requirementsCache.get(cacheKey)!;
      setConstraints(cached.constraints);
      setEvents(cached.events);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      constraintsApi.getConstraints(department, CURRENT_SESSION, CURRENT_SEMESTER),
      departmentalEventsApi.getEvents(department),
    ])
      .then(([constraintResponse, eventResponse]) => {
        if (!active) return;
        const loadedConstraints = Array.isArray(constraintResponse?.constraints)
          ? constraintResponse.constraints
          : [];
        const loadedEvents = Array.isArray(eventResponse?.events)
          ? eventResponse.events
          : [];

        requirementsCache.set(cacheKey, {
          constraints: loadedConstraints,
          events: loadedEvents,
        });

        setConstraints(loadedConstraints);
        setEvents(loadedEvents);
      })
      .catch(() => {
        if (active) {
          setError("Constraints and departmental events could not be loaded from the backend.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [department, cacheKey]);

  return (
    <Card className="border-brand/20">
      <CardHead
        icon={<ClipboardList size={16} />}
        title="Review requirements"
        sub={department ? `Live constraints and departmental events for ${department}` : "Select a department to view requirements"}
      />
      <div className="px-5 pb-5">
        {loading ? (
          <RequirementsSkeleton />
        ) : error ? (
          <div className="flex items-start gap-2 rounded-xl border border-bad/30 bg-bad-soft/40 px-4 py-3 text-[13px] text-bad">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error} Approval should not be treated as complete until these records are available.</span>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <RequirementList
              title="Faculty constraints"
              icon={<ClipboardList size={15} />}
              empty="No departmental constraints were returned."
              items={constraints.map((constraint) => ({
                id: constraint.id,
                title: constraint.kind,
                detail: [constraint.lecturer, constraint.detail, constraint.range]
                  .filter(Boolean)
                  .join(" · "),
              }))}
            />
            <RequirementList
              title="Departmental events"
              icon={<CalendarDays size={15} />}
              empty="No departmental events were returned."
              items={events.map((event) => ({
                id: event.id,
                title: event.title,
                detail: [
                  event.category,
                  event.week,
                  event.day && event.day !== "All Week" ? event.day : "",
                  event.timeRange,
                  event.venue,
                ]
                  .filter(Boolean)
                  .join(" · "),
              }))}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function RequirementList({
  title,
  icon,
  empty,
  items,
}: {
  title: string;
  icon: ReactNode;
  empty: string;
  items: { id: string; title: string; detail: string }[];
}) {
  return (
    <div className="rounded-xl border border-line bg-panel/40 p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
          <span className="text-brand">{icon}</span>
          {title}
        </div>
        <Pill tone={items.length > 0 ? "brand" : "neutral"}>
          {items.length} {items.length === 1 ? "item" : "items"}
        </Pill>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-2 py-2 text-[12px] text-muted">
          <CheckCircle2 size={14} className="text-good" />
          {empty}
        </div>
      ) : (
        <div className="max-h-44 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-line bg-card px-3 py-2">
              <p className="text-[12px] font-semibold text-ink">{item.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                {item.detail || "Details unavailable"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
