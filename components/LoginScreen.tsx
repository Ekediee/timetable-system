"use client";

import { useState } from "react";
import {
  CalendarClock,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { accounts, type UserAccount } from "../lib/data";
import { authApi } from "../lib/api";

const toneClasses: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
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

export default function LoginScreen({
  onLogin,
}: {
  onLogin: (account: UserAccount) => Promise<void> | void;
}) {
  // Mode toggle: "api" (live login against Laravel backend for Dept T.O) vs "quick" (instant test switch)
  const [authMode, setAuthMode] = useState<"api" | "quick">("api");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApiLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setLoadingAccount("api");
    setError(null);

    try {
      const res = await authApi.login(email.trim(), password);
      const u = res.user as any;
      await onLogin({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        roleLabel: u.roleLabel || u.role_label || "Departmental T.O",
        department: u.department,
        school: u.school,
        avatarTone: u.avatarTone || u.avatar_tone || "violet",
        initials: u.initials || "YO",
      });
    } catch (err: any) {
      console.error("API login failed:", err);
      setError(
        err?.message ||
          "Authentication failed. Please verify that the backend server is running.",
      );
    } finally {
      setLoading(false);
      setLoadingAccount(null);
    }
  }

  async function handleQuickLogin(account: UserAccount) {
    setLoading(true);
    setLoadingAccount(account.id);
    setError(null);

    try {
      const res = await authApi.login(account.email, "password123");
      const u = res.user as any;
      await onLogin({
        id: u.id || account.id,
        name: u.name || account.name,
        email: u.email || account.email,
        role: u.role || account.role,
        roleLabel: u.roleLabel || u.role_label || account.roleLabel,
        department: u.department !== undefined ? u.department : account.department,
        school: u.school !== undefined ? u.school : account.school,
        avatarTone: u.avatarTone || account.avatarTone,
        initials: u.initials || account.initials,
      });
    } catch (err: any) {
      console.warn("Quick login live exchange failed, falling back to local:", err);
      await onLogin(account);
    } finally {
      setLoading(false);
      setLoadingAccount(null);
    }
  }

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

      {/* Main Container Card */}
      <div className="w-full max-w-115 rounded-3xl border border-line bg-card p-7 sm:p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h2 className="text-[18px] font-bold tracking-[-0.02em] text-ink">
            Sign in to your workspace
          </h2>
        </div>

        {/* Tab Switcher: Live Backend Login vs Mock Role Switcher */}
        <div className="mb-6 flex rounded-xl border border-line bg-panel p-1 text-[12.5px] font-semibold">
          <button
            type="button"
            onClick={() => {
              setAuthMode("api");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 transition cursor-pointer ${
              authMode === "api"
                ? "bg-card text-brand font-bold shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            Live Backend API Login
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("quick");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 transition cursor-pointer ${
              authMode === "quick"
                ? "bg-card text-brand font-bold shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            Quick Role Switcher (Mock)
          </button>
        </div>

        {/* Option 1: Live API Login for Departmental T.O / Users */}
        {authMode === "api" ? (
          <form onSubmit={handleApiLogin} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-bad/30 bg-bad-soft/40 p-3 text-[12.5px] text-bad">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="login-email"
                className="block mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted cursor-pointer"
              >
                Institutional Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. onomey@babacock.edu.ng"
                  required
                  className="w-full rounded-xl border border-line bg-panel/40 py-2.5 pl-10 pr-3 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted cursor-pointer"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-xl border border-line bg-panel/40 py-2.5 pl-10 pr-3 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-[14px] font-bold text-white shadow-sm transition hover:bg-brand/90 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Authenticating…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Option 2: Mock Role Switcher (Preserved for HOD, Dean, Acad Planning) */
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Select testing profile:
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {accounts.map((account) => {
                const tone = toneClasses[account.avatarTone];
                const isCurrentLoading = loadingAccount === account.id;
                return (
                  <button
                    key={account.id}
                    disabled={loading}
                    onClick={() => handleQuickLogin(account)}
                    className={`group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition cursor-pointer disabled:opacity-60 ${
                      isCurrentLoading
                        ? "border-brand bg-brand-soft/30 shadow-xs"
                        : "border-line bg-card hover:border-brand/40 hover:bg-brand-soft/20"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold ${tone.bg} ${tone.text}`}
                    >
                      {isCurrentLoading ? (
                        <Loader2 size={18} className="animate-spin text-brand" />
                      ) : (
                        account.initials
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink">
                        {account.name}
                      </p>
                      <p className="text-[11.5px] text-muted">
                        {isCurrentLoading ? "Signing in…" : account.roleLabel}
                      </p>
                    </div>
                    {isCurrentLoading && (
                      <Loader2 size={16} className="animate-spin text-brand shrink-0 self-center" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {/* <div className="mt-8 flex items-center gap-2 text-[12px] text-muted/60">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-good" />
        <span>Babcock University Academic Planning Portal</span>
        <span>·</span>
        <span>2026/27</span>
      </div> */}
    </div>
  );
}
