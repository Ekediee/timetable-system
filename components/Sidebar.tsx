"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  SlidersHorizontal,
  Sparkles,
  History,
  Headset,
  ClipboardCheck,
  Inbox,
  GraduationCap,
  LogOut,
  BadgeCheck,
  Globe,
  ScrollText,
  AlertTriangle,
  BarChart2,
  X,
  ShieldCheck,
} from "lucide-react";
import { type UserAccount, type UserRole } from "../lib/data";

export type View =
  | "dashboard"
  | "allocations"
  | "venues"
  | "constraints"
  | "generate"
  | "history"
  | "acadPlanning"
  | "acadPublished"
  | "acadAudit"
  | "acadClashes"
  | "acadAnalytics"
  | "acadConstraints"
  | "hodReview"
  | "deanReview";

type NavItem = { id: View; label: string; href: string; icon: typeof Users };

export const navByRole: Record<UserRole, NavItem[]> = {
  deptTO: [
    { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { id: "allocations", label: "Allocations", href: "/allocations", icon: Users },
    { id: "venues", label: "Venues & Timeslots", href: "/venues", icon: Building2 },
    { id: "constraints", label: "Constraints", href: "/constraints", icon: SlidersHorizontal },
    { id: "generate", label: "Timetable", href: "/generate", icon: Sparkles },
    { id: "history", label: "Status & History", href: "/history", icon: History },
  ],
  hod: [
    { id: "hodReview", label: "Submissions", href: "/hod-review", icon: Inbox },
  ],
  dean: [
    { id: "deanReview", label: "School Submissions", href: "/dean-review", icon: GraduationCap },
  ],
  acadPlanningTO: [
    { id: "acadPlanning", label: "Review Queue", href: "/academic-planning", icon: ClipboardCheck },
    { id: "acadPublished", label: "Published Timetables", href: "/academic-planning/published", icon: Globe },
    { id: "acadConstraints", label: "Constraints", href: "/academic-planning/constraints", icon: ShieldCheck },
    { id: "acadClashes", label: "Venue Clashes", href: "/academic-planning/clashes", icon: AlertTriangle },
    { id: "acadAnalytics", label: "Analytics", href: "/academic-planning/analytics", icon: BarChart2 },
    { id: "acadAudit", label: "Audit Log", href: "/academic-planning/audit", icon: ScrollText },
  ],
  superAdmin: [
    { id: "acadPlanning", label: "Review Queue", href: "/academic-planning", icon: ClipboardCheck },
    { id: "acadPublished", label: "Published Timetables", href: "/academic-planning/published", icon: Globe },
    { id: "acadConstraints", label: "Constraints", href: "/academic-planning/constraints", icon: ShieldCheck },
    { id: "acadClashes", label: "Venue Clashes", href: "/academic-planning/clashes", icon: AlertTriangle },
    { id: "acadAnalytics", label: "Analytics", href: "/academic-planning/analytics", icon: BarChart2 },
    { id: "acadAudit", label: "Audit Log", href: "/academic-planning/audit", icon: ScrollText },
  ],
};

const activeColorByRole: Record<UserRole, string> = {
  deptTO: "bg-brand-soft text-brand-ink",
  hod: "bg-brand-soft text-brand-ink",
  dean: "bg-good-soft text-good",
  acadPlanningTO: "bg-violet-soft text-violet",
  superAdmin: "bg-violet-soft text-violet",
};

const activeIconByRole: Record<UserRole, string> = {
  deptTO: "text-brand",
  hod: "text-brand",
  dean: "text-good",
  acadPlanningTO: "text-violet",
  superAdmin: "text-violet",
};

const sectionLabel: Record<UserRole, string> = {
  deptTO: "Workspace",
  hod: "HOD Workspace",
  dean: "Dean Workspace",
  acadPlanningTO: "Planning Office",
  superAdmin: "Admin Workspace",
};

export default function Sidebar({
  view,
  setView,
  currentUser,
  onLogout,
  isOpen,
  onClose,
}: {
  view?: View;
  setView?: (v: View) => void;
  currentUser: UserAccount | null;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  if (!currentUser) return null;

  const navItems = navByRole[currentUser.role];
  const activeClass = activeColorByRole[currentUser.role];
  const activeIconClass = activeIconByRole[currentUser.role];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex h-full w-[264px] shrink-0 flex-col border-r border-line bg-panel
          transition-transform duration-300 ease-in-out
          lg:relative lg:z-auto lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand + mobile close */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
            <CalendarClock size={20} strokeWidth={2.2} />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-bold leading-tight tracking-[-0.02em] text-ink">
              BU Pulse
            </p>
            <p className="text-[11.5px] font-medium text-muted">Timetabling</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-line lg:hidden"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="mt-2 flex-1 overflow-y-auto px-3">
          <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {sectionLabel[currentUser.role]}
          </p>
          {navItems.map(({ id, label, href, icon: Icon }) => {
            const active = view ? view === id : pathname === href;
            return (
              <Link
                key={id}
                href={href}
                onClick={onClose}
                className={`group mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                  active ? activeClass : "text-subink hover:bg-line-soft"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.3 : 2}
                  className={
                    active ? activeIconClass : "text-muted group-hover:text-subink"
                  }
                />
                {label}
              </Link>
            );
          })}

          <p className="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Support
          </p>
          <button className="mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-subink transition-colors hover:bg-line-soft">
            <Headset size={18} strokeWidth={2} className="text-muted" />
            Help centre
          </button>
        </nav>

        {/* User + logout */}
        <div className="border-t border-line">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold
                ${currentUser.avatarTone === "violet" ? "bg-violet-soft text-violet" : ""}
                ${currentUser.avatarTone === "brand" ? "bg-brand-soft text-brand-ink" : ""}
                ${currentUser.avatarTone === "good" ? "bg-good-soft text-good" : ""}
                ${currentUser.avatarTone === "warn" ? "bg-warn-soft text-warn" : ""}
              `}
            >
              {currentUser.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-[13px] font-semibold text-ink">
                {currentUser.name}
                <BadgeCheck size={14} className="text-brand" />
              </p>
              <p className="truncate text-[11.5px] text-muted">
                {currentUser.department ? `${currentUser.department} · ` : ""}
                {currentUser.roleLabel}
              </p>
            </div>
            <button
              onClick={() => { onLogout(); onClose(); }}
              title="Sign out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-line hover:text-bad"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
