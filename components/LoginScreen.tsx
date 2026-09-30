"use client";

import { CalendarClock, ArrowRight } from "lucide-react";
import { accounts, type UserAccount } from "../lib/data";

const toneClasses: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  brand: {
    bg: "bg-brand-soft",
    text: "text-brand-ink",
    border: "border-brand/30",
    dot: "bg-brand",
  },
  violet: {
    bg: "bg-violet-soft",
    text: "text-violet",
    border: "border-violet/30",
    dot: "bg-violet",
  },
  good: {
    bg: "bg-good-soft",
    text: "text-good",
    border: "border-good/30",
    dot: "bg-good",
  },
  warn: {
    bg: "bg-warn-soft",
    text: "text-warn",
    border: "border-warn/30",
    dot: "bg-warn",
  },
};

const roleDescriptions: Record<string, string> = {
  deptTO: "Create and submit department timetables",
  hod: "Review and approve departmental drafts",
  dean: "Sign off school-level submissions",
  acadPlanningTO: "Final approval and publishing",
};

function AccountCard({
  account,
  onSelect,
}: {
  account: UserAccount;
  onSelect: (a: UserAccount) => void;
}) {
  const tone = toneClasses[account.avatarTone];

  return (
    <button
      onClick={() => onSelect(account)}
      className="group flex w-full items-start gap-4 rounded-2xl border border-line bg-card p-5 text-left transition-all duration-150 hover:border-brand/40 hover:bg-brand-soft/20"
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold ${tone.bg} ${tone.text}`}
      >
        {account.initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[14px] font-semibold text-ink">{account.name}</p>
          <ArrowRight
            size={15}
            className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
          />
        </div>
        <p className="mt-0.5 text-[12px] font-semibold text-muted">{account.roleLabel}</p>
        {account.department && (
          <p className="mt-0.5 truncate text-[11.5px] text-muted/70">
            {account.department}
          </p>
        )}
        {!account.department && account.school && (
          <p className="mt-0.5 truncate text-[11.5px] text-muted/70">
            {account.school}
          </p>
        )}
        <p className="mt-2 text-[11.5px] leading-snug text-muted/80">
          {roleDescriptions[account.role]}
        </p>
      </div>
    </button>
  );
}

export default function LoginScreen({
  onLogin,
}: {
  onLogin: (account: UserAccount) => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand">
          <CalendarClock size={28} strokeWidth={2} className="text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-ink">
            BU Pulse
          </h1>
          <p className="text-[13px] text-muted">Timetabling System</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-[520px] rounded-3xl border border-line bg-card p-8">
        <div className="mb-6 text-center">
          <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">
            Sign in to your workspace
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Babcock University · First Semester 2025/26
          </p>
        </div>

        <div className="mb-2">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Select your account
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onSelect={onLogin}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center gap-2 text-[12px] text-muted/60">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full bg-good`}
        />
        <span>Babcock University Academic Planning Portal</span>
        <span>·</span>
        <span>2025/26</span>
      </div>
    </div>
  );
}
