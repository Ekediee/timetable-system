"use client";

import { useState } from "react";
import {
  Search,
  Bell,
  Menu,
  X,
  ArrowUpRight,
  MessageSquare,
  Lock,
  ChevronDown,
  Check,
  UserCheck,
} from "lucide-react";
import { accounts, type Status, type UserAccount } from "../lib/data";
import { StatusBadge, Button, Pill } from "./ui";
import { useApp } from "../lib/AppContext";
import type { View } from "./Sidebar";

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
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  const currentUser = context.currentUser;
  const rejection = context.localTimeline.find((t) => t.state === "rejected");
  const isSubmitted =
    status === "Submitted to HOD" ||
    status === "Submitted to Dean" ||
    status === "Submitted to Acad Pl. T.O" ||
    status === "Published";

  function handleFixFlagged(code: string, day?: string, slot?: string) {
    context.setActiveRevisionTarget({ code, day, slot });
    setShowNotifications(false);
    if (setView) setView("generate");
  }

  function handleSwitchAccount(acc: UserAccount) {
    context.handleLogin(acc);
    setShowAccountSwitcher(false);
    if (setView) {
      if (acc.role === "deptTO") setView("generate");
      else if (acc.role === "hod") setView("hodReview");
      else if (acc.role === "dean") setView("deanReview");
      else if (acc.role === "acadPlanningTO") setView("acadPlanning");
    }
  }

  const extBookingsCount = context.externalBookings.length;

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
        {/* External Bookings Indicator */}
        {extBookingsCount > 0 && (
          <button
            onClick={() => setView && setView("venues")}
            title={`${extBookingsCount} venues locked by external approved department schedules`}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 transition"
          >
            <Lock size={12} className="text-amber-600" />
            <span>{extBookingsCount} External Bookings</span>
          </button>
        )}

        {status && <StatusBadge status={status} />}

        <div className="relative hidden lg:block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            placeholder="Search courses, venues…"
            className="w-52 rounded-xl border border-line bg-card py-2 pl-9 pr-3 text-[13px] text-ink placeholder:text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
          />
        </div>

        {/* Quick Role & Account Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowAccountSwitcher(!showAccountSwitcher);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-line bg-card px-2.5 py-1.5 text-left text-[12.5px] font-medium transition hover:bg-panel"
            aria-label="Switch User Role"
          >
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold
                ${currentUser?.avatarTone === "violet" ? "bg-violet-soft text-violet" : ""}
                ${currentUser?.avatarTone === "brand" ? "bg-brand-soft text-brand-ink" : ""}
                ${currentUser?.avatarTone === "good" ? "bg-good-soft text-good" : ""}
                ${currentUser?.avatarTone === "warn" ? "bg-warn-soft text-warn" : ""}
              `}
            >
              {currentUser?.initials || "YO"}
            </div>
            <div className="hidden md:block leading-tight text-left">
              <p className="font-semibold text-ink truncate max-w-[110px]">
                {currentUser?.name.split(" ")[0]}
              </p>
              <p className="text-[10px] text-muted truncate max-w-[110px]">
                {currentUser?.roleLabel.split("(")[0]}
              </p>
            </div>
            <ChevronDown size={13} className="text-muted" />
          </button>

          {showAccountSwitcher && (
            <div className="absolute right-0 mt-2 w-80 max-h-[480px] overflow-y-auto rounded-2xl border border-line bg-card p-3 shadow-xl z-50 bp-fade">
              <div className="sticky top-0 bg-card z-10 flex items-center justify-between pb-2.5 border-b border-line mb-2">
                <div>
                  <span className="text-[12.5px] font-bold text-ink">Switch Test Account</span>
                  <p className="text-[11px] text-muted">Test multi-role governance flow</p>
                </div>
                <button
                  onClick={() => setShowAccountSwitcher(false)}
                  className="rounded-lg p-1 text-muted hover:bg-panel hover:text-ink"
                >
                  <X size={14} />
                </button>
              </div>

              {/* School of Management Sciences */}
              <div className="mb-3">
                <p className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-muted bg-panel/60 rounded-md mb-1">
                  School of Management Sciences
                </p>
                <div className="space-y-0.5">
                  {accounts
                    .filter((a) => a.school?.includes("Management"))
                    .map((acc) => {
                      const isCurrent = currentUser?.id === acc.id;
                      return (
                        <button
                          key={acc.id}
                          onClick={() => handleSwitchAccount(acc)}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition ${
                            isCurrent
                              ? "bg-brand-soft/70 text-brand-ink"
                              : "hover:bg-panel text-ink"
                          }`}
                        >
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold
                              ${acc.avatarTone === "violet" ? "bg-violet-soft text-violet" : ""}
                              ${acc.avatarTone === "brand" ? "bg-brand-soft text-brand-ink" : ""}
                              ${acc.avatarTone === "good" ? "bg-good-soft text-good" : ""}
                              ${acc.avatarTone === "warn" ? "bg-warn-soft text-warn" : ""}
                            `}
                          >
                            {acc.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold truncate">{acc.name}</p>
                            <p className="text-[10.5px] text-muted truncate">{acc.roleLabel}</p>
                          </div>
                          {isCurrent && <Check size={13} className="text-brand shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* School of Computing & Engineering */}
              <div className="mb-3">
                <p className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-muted bg-panel/60 rounded-md mb-1">
                  School of Computing & Engineering
                </p>
                <div className="space-y-0.5">
                  {accounts
                    .filter((a) => a.school?.includes("Computing") || a.department === "Computer Science" || a.department === "Software Engineering")
                    .map((acc) => {
                      const isCurrent = currentUser?.id === acc.id;
                      return (
                        <button
                          key={acc.id}
                          onClick={() => handleSwitchAccount(acc)}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition ${
                            isCurrent
                              ? "bg-brand-soft/70 text-brand-ink"
                              : "hover:bg-panel text-ink"
                          }`}
                        >
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold
                              ${acc.avatarTone === "violet" ? "bg-violet-soft text-violet" : ""}
                              ${acc.avatarTone === "brand" ? "bg-brand-soft text-brand-ink" : ""}
                              ${acc.avatarTone === "good" ? "bg-good-soft text-good" : ""}
                              ${acc.avatarTone === "warn" ? "bg-warn-soft text-warn" : ""}
                            `}
                          >
                            {acc.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold truncate">{acc.name}</p>
                            <p className="text-[10.5px] text-muted truncate">{acc.roleLabel}</p>
                          </div>
                          {isCurrent && <Check size={13} className="text-brand shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Governance & Institutional Planning */}
              <div>
                <p className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-muted bg-panel/60 rounded-md mb-1">
                  Institutional Governance
                </p>
                <div className="space-y-0.5">
                  {accounts
                    .filter((a) => a.role === "acadPlanningTO")
                    .map((acc) => {
                      const isCurrent = currentUser?.id === acc.id;
                      return (
                        <button
                          key={acc.id}
                          onClick={() => handleSwitchAccount(acc)}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition ${
                            isCurrent
                              ? "bg-brand-soft/70 text-brand-ink"
                              : "hover:bg-panel text-ink"
                          }`}
                        >
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold
                              ${acc.avatarTone === "violet" ? "bg-violet-soft text-violet" : ""}
                              ${acc.avatarTone === "brand" ? "bg-brand-soft text-brand-ink" : ""}
                              ${acc.avatarTone === "good" ? "bg-good-soft text-good" : ""}
                              ${acc.avatarTone === "warn" ? "bg-warn-soft text-warn" : ""}
                            `}
                          >
                            {acc.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold truncate">{acc.name}</p>
                            <p className="text-[10.5px] text-muted truncate">{acc.roleLabel}</p>
                          </div>
                          {isCurrent && <Check size={13} className="text-brand shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell with Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowAccountSwitcher(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-card text-subink transition hover:bg-panel"
            aria-label="Notifications"
          >
            <Bell size={17} />
            {rejection && !isSubmitted && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-card bg-bad" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-line bg-card p-4 shadow-xl z-50 bp-fade">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <span className="text-[13px] font-bold text-ink">Notifications</span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="rounded-lg p-1 text-muted hover:bg-panel hover:text-ink"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="py-2.5">
                {rejection && !isSubmitted ? (
                  <div className="rounded-xl border border-bad/30 bg-bad-soft/40 p-3 text-[12.5px]">
                    <div className="flex items-start gap-2">
                      <MessageSquare size={16} className="text-bad shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-ink">
                          Returned by {rejection.actor} ({rejection.role})
                        </p>
                        <p className="mt-1 text-subink leading-snug line-clamp-3">
                          &ldquo;{rejection.comment}&rdquo;
                        </p>
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            onClick={() => handleFixFlagged("BU-GST 205")}
                            className="rounded-lg bg-bad px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-bad/90"
                          >
                            Fix BU-GST 205 →
                          </button>
                          <button
                            onClick={() => {
                              setShowNotifications(false);
                              if (setView) setView("history");
                            }}
                            className="text-[11.5px] font-medium text-muted hover:text-ink hover:underline"
                          >
                            View audit trail
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="py-4 text-center text-[12.5px] text-muted">
                    No pending alerts or revision requests.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
