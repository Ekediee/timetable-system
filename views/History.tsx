"use client";

import { CheckCircle2, XCircle, Clock, MessageSquare, ArrowLeft, Download } from "lucide-react";
import { Card, CardHead, Pill, Button } from "../components/ui";
import { type Status, type TimelineStep } from "../lib/data";
import type { View } from "../components/Sidebar";
import { useRouter } from "next/navigation";
import { useApp } from "../lib/AppContext";

export default function History(props?: {
  status?: Status;
  localTimeline?: TimelineStep[];
  setView?: (v: View) => void;
}) {
  const router = useRouter();
  const context = useApp();

  const status = props?.status ?? context.status;
  const localTimeline = props?.localTimeline ?? context.localTimeline;

  function navigateToGenerate() {
    if (props?.setView) {
      props.setView("generate");
    } else {
      router.push("/generate");
    }
  }

  function handleReviseFlagged(code: string, day?: string, slot?: string) {
    context.setActiveRevisionTarget({ code, day, slot });
    navigateToGenerate();
  }
  const rejection = localTimeline.find((t) => t.state === "rejected");

  const isSubmitted =
    status === "Submitted to HOD" ||
    status === "Submitted to Dean" ||
    status === "Submitted to Acad Pl. T.O" ||
    status === "Published";

  return (
    <div className="bp-fade space-y-5">
      {/* Pinned Rejection Banner at Top (Story A10 / Screen 10) */}
      {rejection && !isSubmitted && (
        <div className="rounded-2xl border-2 border-bad/30 bg-bad-soft/50 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bad text-canvas shadow-sm">
                <XCircle size={22} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-bad">
                    Timetable Returned for Revision
                  </span>
                  <Pill tone="bad">Action Required</Pill>
                </div>
                <h3 className="mt-0.5 text-[15px] font-bold text-ink">
                  Reviewer note from {rejection.actor} ({rejection.role})
                </h3>
                <div className="mt-2 rounded-xl border border-bad/20 bg-card/80 p-3 text-[13.5px] leading-relaxed text-subink shadow-xs">
                  <span className="font-semibold text-bad">Feedback: </span>
                  &ldquo;{rejection.comment}&rdquo;
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              <Button
                onClick={() => handleReviseFlagged("BU-GST 205")}
                className="w-full sm:w-auto text-[13px] bg-bad hover:bg-bad/90 text-white"
              >
                Revise BU-GST 205 →
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReviseFlagged("COSC 204", "Thu", "10:00")}
                className="w-full sm:w-auto text-[12.5px] border-bad/30 text-bad hover:bg-bad-soft"
              >
                Revise CST Hall A Clash →
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHead
              title="Submission timeline"
              sub="Full audit trail for this timetable"
            action={
              <Button
                variant="outline"
                className="text-[12px] px-3 py-2"
                onClick={() => {
                  const rows = localTimeline.map(
                    (t) => `${t.at}\t${t.role}\t${t.actor}\t${t.action}${t.comment ? `\t"${t.comment}"` : ""}`,
                  );
                  const blob = new Blob(
                    ["Date\tRole\tActor\tAction\tComment\n" + rows.join("\n")],
                    { type: "text/plain" },
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "BUPulse-timeline.txt";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={13} /> Export
              </Button>
            }
          />
          <div className="px-5 pb-6">
            {localTimeline.map((s, i) => {
              const Icon =
                s.state === "done"
                  ? CheckCircle2
                  : s.state === "rejected"
                    ? XCircle
                    : Clock;
              const color =
                s.state === "done"
                  ? "text-good bg-good-soft"
                  : s.state === "rejected"
                    ? "text-bad bg-bad-soft"
                    : s.state === "current"
                      ? "text-brand bg-brand-soft"
                      : "text-muted bg-panel";
              return (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}
                    >
                      <Icon size={17} />
                    </span>
                    {i < localTimeline.length - 1 && (
                      <span className="my-1 w-px flex-1 bg-line" />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-semibold text-ink">
                        {s.action}
                      </p>
                      {s.state === "current" && <Pill tone="brand">Now</Pill>}
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {s.actor} · {s.role} · {s.at}
                    </p>
                    {s.comment && (
                      <div className="mt-2.5 flex gap-2 rounded-xl border border-bad/20 bg-bad-soft/40 px-3.5 py-3">
                        <MessageSquare size={15} className="mt-0.5 shrink-0 text-bad" />
                        <p className="text-[13px] leading-relaxed text-subink">
                          {s.comment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="lg:col-span-1 flex flex-col gap-5">
        <Card>
          <CardHead title="Current status" />
          <div className="px-5 pb-5">
            <div
              className={`rounded-xl px-4 py-3.5 ${
                isSubmitted
                  ? "bg-brand-soft"
                  : "bg-panel"
              }`}
            >
              <p
                className={`text-[14px] font-bold ${
                  isSubmitted ? "text-brand-ink" : "text-ink"
                }`}
              >
                {status}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                {isSubmitted
                  ? "Awaiting HOD decision"
                  : "Draft in progress — resolve conflicts to submit"}
              </p>
            </div>
            {!isSubmitted && (
              <Button
                className="mt-3 w-full"
                onClick={navigateToGenerate}
              >
                <ArrowLeft size={15} /> Back to timetable
              </Button>
            )}
          </div>
        </Card>

        {rejection && (
          <Card className="border-bad/30">
            <CardHead title="Latest reviewer note" />
            <div className="px-5 pb-5">
              <p className="text-[13px] font-semibold text-ink">
                {rejection.actor}{" "}
                <span className="font-normal text-muted">· {rejection.role}</span>
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-subink">
                "{rejection.comment}"
              </p>
              {!isSubmitted && (
                <button
                  onClick={() => handleReviseFlagged("BU-GST 205")}
                  className="mt-3 text-[12.5px] font-semibold text-brand hover:underline"
                >
                  Revise timetable on flagged class →
                </button>
              )}
            </div>
          </Card>
        )}

        <Card>
          <CardHead title="Rejection routing" sub="Where a bounce-back lands" />
          <div className="space-y-2.5 px-5 pb-5 text-[13px]">
            {[
              ["HOD rejects", "→ Dept T.O", "brand"],
              ["Dean rejects", "→ HOD", "warn"],
              ["Acad Pl. T.O rejects", "→ HOD", "violet"],
            ].map(([a, b, tone]) => (
              <div
                key={a}
                className="flex items-center justify-between border-b border-line-soft pb-2.5 last:border-0 last:pb-0"
              >
                <span className="text-muted">{a}</span>
                <Pill tone={tone}>{b}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  </div>
  );
}
