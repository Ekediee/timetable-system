"use client";

import { useState, useRef, useEffect } from "react";
import {
  User,
  Menu,
  X,
  MessageSquare,
  LogOut,
  BadgeCheck,
} from "lucide-react";
import { type Status } from "../lib/data";
import { StatusBadge } from "./ui";
import { useApp } from "../lib/AppContext";
import type { View } from "./Sidebar";

const toneClasses: Record<string, string> = {
  violet: "bg-violet-soft text-violet",
  brand: "bg-brand-soft text-brand-ink",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
};

export default function TopBar({
  title,
  subtitle,
  status,
  onMenuClick,
  setView,
}: {
  title: string;
  subtitle?: string;
  status?: Status;
  onMenuClick: () => void;
  setView?: (v: View) => void;
}) {
  const context = useApp();
  const currentUser = context.currentUser;
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfile(false);
      }
    }
    if (showProfile) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfile]);

  const rejection = context.localTimeline.find((t) => t.state === "rejected");
  const flaggedCourse = rejection?.comment?.match(
    /\b[A-Z]{2,6}(?:-[A-Z]{2,4})?\s+\d{3}\b/i,
  )?.[0];
  const isSubmitted =
    status === "Submitted to HOD" ||
    status === "Submitted to Dean" ||
    status === "Submitted to Acad Pl. T.O" ||
    status === "Published";

  function handleFixFlagged(code?: string, day?: string, slot?: string) {
    if (code) {
      context.setActiveRevisionTarget({ code, day, slot });
    } else {
      context.setActiveRevisionTarget(null);
    }
    setShowProfile(false);
    if (setView) setView("generate");
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-canvas/80 px-4 py-3.5 backdrop-blur-md sm:gap-4 sm:px-6 lg:px-8 lg:py-4">
      <div className="flex min-w-0 items-center gap-3">
        {/* Hamburger — mobile/tablet only */}
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-subink transition hover:bg-panel lg:hidden"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold tracking-[-0.02em] text-ink sm:text-[20px]">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden truncate text-[12px] font-medium text-muted sm:block lg:text-[13.5px]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {status && status !== "Draft generated" && <StatusBadge status={status} />}

        {/* User Profile Button with Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile((prev) => !prev)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-card text-subink transition hover:bg-panel hover:text-ink focus:outline-none"
            aria-label="User profile"
            title={currentUser ? `${currentUser.name} (${currentUser.roleLabel})` : "User profile"}
          >
            <User size={17} />
            {rejection && !isSubmitted && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-card bg-bad" />
            )}
          </button>

          {showProfile && (
            <div className="dropdown-surface absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-xs p-4 sm:w-80">
              {/* Header with user info */}
              <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      currentUser?.avatarTone && toneClasses[currentUser.avatarTone]
                        ? toneClasses[currentUser.avatarTone]
                        : "bg-brand-soft text-brand-ink"
                    }`}
                  >
                    <User size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate text-[13.5px] font-bold text-ink">
                      {currentUser?.name || "User"}
                      <BadgeCheck size={14} className="text-brand shrink-0" />
                    </p>
                    <p className="truncate text-[11.5px] text-muted">
                      {currentUser?.email || ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfile(false)}
                  className="rounded-lg p-1 text-muted transition hover:bg-panel hover:text-ink shrink-0"
                  aria-label="Close user profile"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Role & Context Details */}
              <div className="space-y-1.5 py-3 text-[12px]">
                <div className="flex items-center justify-between rounded-lg bg-panel/60 px-3 py-2 border border-line">
                  <span className="font-medium text-muted">Role</span>
                  <span className="font-semibold text-ink">
                    {currentUser?.roleLabel || "User"}
                  </span>
                </div>
                {currentUser?.department && (
                  <div className="flex items-center justify-between rounded-lg bg-panel/60 px-3 py-2 border border-line">
                    <span className="font-medium text-muted">Department</span>
                    <span className="font-semibold text-ink truncate max-w-[170px]" title={currentUser.department}>
                      {currentUser.department}
                    </span>
                  </div>
                )}
                {currentUser?.school && (
                  <div className="flex items-center justify-between rounded-lg bg-panel/60 px-3 py-2 border border-line">
                    <span className="font-medium text-muted">School</span>
                    <span className="font-semibold text-ink truncate max-w-[170px]" title={currentUser.school}>
                      {currentUser.school}
                    </span>
                  </div>
                )}
              </div>

              {/* Pending Rejection / Revision Banner if any */}
              {rejection && !isSubmitted && (
                <div className="mb-3 rounded-xl border border-bad/30 bg-bad-soft/40 p-3 text-[12px]">
                  <div className="flex items-start gap-2">
                    <MessageSquare size={15} className="text-bad shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">
                        Returned by {rejection.actor} ({rejection.role})
                      </p>
                      <p className="mt-1 text-subink leading-snug line-clamp-2">
                        &ldquo;{rejection.comment}&rdquo;
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          onClick={() => handleFixFlagged(flaggedCourse)}
                          className="rounded-lg bg-bad px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-bad/90 transition"
                        >
                          {flaggedCourse ? `Fix ${flaggedCourse} →` : "Revise Timetable →"}
                        </button>
                        {setView && (
                          <button
                            onClick={() => {
                              setShowProfile(false);
                              setView("history");
                            }}
                            className="text-[11px] font-medium text-muted hover:text-ink hover:underline"
                          >
                            Audit trail
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sign out button */}
              <div className="pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    void context.handleLogout();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-[12.5px] font-semibold text-subink transition hover:bg-bad-soft hover:text-bad hover:border-bad/30"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={15} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
