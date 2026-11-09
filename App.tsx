"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar, { type View, navByRole } from "./components/Sidebar";
import TopBar from "./components/TopBar";
import { ToastContainer } from "./components/Toast";
import { useApp } from "./lib/AppContext";
import {
  department,
  type UserAccount,
  type UserRole,
} from "./lib/data";

const defaultViewByRole: Record<UserRole, View> = {
  deptTO: "dashboard",
  hod: "hodReview",
  dean: "deanReview",
  acadPlanningTO: "acadPlanning",
  superAdmin: "acadPlanning",
};

const topBarTitleByView: Record<View, string> = {
  dashboard: "Overview Dashboard",
  allocations: "Course Allocations",
  venues: "Venues & Room Schedules",
  constraints: "Lecturer Scheduling Rules",
  generate: "Timetable Schedule",
  history: "Status & History",
  hodReview: "Submissions",
  deanReview: "School Submissions",
  acadPlanning: "Academic Planning Office",
  acadPublished: "Published Timetables",
  acadAudit: "Audit Log",
  acadConstraints: "Scheduling Rules & Templates",
  acadClashes: "Venue Clash Detection",
  acadAnalytics: "Analytics",
};

const viewByPath: Record<string, View> = {
  "/dashboard": "dashboard",
  "/allocations": "allocations",
  "/venues": "venues",
  "/constraints": "constraints",
  "/generate": "generate",
  "/history": "history",
  "/hod-review": "hodReview",
  "/dean-review": "deanReview",
  "/academic-planning": "acadPlanning",
  "/academic-planning/published": "acadPublished",
  "/academic-planning/audit": "acadAudit",
  "/academic-planning/clashes": "acadClashes",
  "/academic-planning/analytics": "acadAnalytics",
  "/academic-planning/constraints": "acadConstraints",
};

const pathByView: Record<View, string> = {
  dashboard: "/dashboard",
  allocations: "/allocations",
  venues: "/venues",
  constraints: "/constraints",
  generate: "/generate",
  history: "/history",
  hodReview: "/hod-review",
  deanReview: "/dean-review",
  acadPlanning: "/academic-planning",
  acadPublished: "/academic-planning/published",
  acadAudit: "/academic-planning/audit",
  acadClashes: "/academic-planning/clashes",
  acadAnalytics: "/academic-planning/analytics",
  acadConstraints: "/academic-planning/constraints",
};

export default function App({ children }: { children?: ReactNode }) {
  const context = useApp();
  const currentUser = context.currentUser;
  const router = useRouter();
  const pathname = usePathname();
  const normalizedPath =
    pathname?.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;
  const routeView = viewByPath[normalizedPath] || null;

  const [view, setView] = useState<View>(() => {
    if (routeView) {
      if (context.currentUser) {
        const allowedViews =
          navByRole[context.currentUser.role]?.map((item) => item.id) || [];
        if (allowedViews.includes(routeView)) {
          return routeView;
        }
      } else {
        return routeView;
      }
    }
    if (context.currentUser) {
      return defaultViewByRole[context.currentUser.role] || "dashboard";
    }
    return "dashboard";
  });

  const handleSetView = useCallback(
    (nextView: View) => {
      setView(nextView);
      const targetPath = pathByView[nextView];
      if (targetPath && targetPath !== normalizedPath) {
        router.push(targetPath);
      }
    },
    [normalizedPath, router],
  );

  // Sync view when route changes via browser navigation or Next.js Link
  useEffect(() => {
    if (routeView) {
      if (currentUser) {
        const allowedViews =
          navByRole[currentUser.role]?.map((item) => item.id) || [];
        if (allowedViews.includes(routeView)) {
          setView(routeView);
        }
      } else {
        setView(routeView);
      }
    }
  }, [routeView, currentUser]);

  // Keep view strictly in sync with user role
  useEffect(() => {
    if (currentUser) {
      const allowedViews =
        navByRole[currentUser.role]?.map((item) => item.id) || [];
      if (!allowedViews.includes(view)) {
        handleSetView(defaultViewByRole[currentUser.role]);
      }
    }
  }, [currentUser, view, handleSetView]);

  const sidebarOpen = context.sidebarOpen;
  const setSidebarOpen = context.setSidebarOpen;
  const status = context.status;

  async function handleLogout() {
    await context.handleLogout();
  }

  // Redirect to login if unauthenticated once auth check has finished
  useEffect(() => {
    if (!context.isAuthLoading && !currentUser && pathname !== "/login") {
      router.replace("/login");
    }
  }, [context.isAuthLoading, currentUser, pathname, router]);

  // Standalone login route renders without the app sidebar and top bar
  if (pathname === "/login") {
    return (
      <>
        {children}
        <ToastContainer />
      </>
    );
  }

  // Loading state while restoring session on initial app load
  if (context.isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-xs font-semibold text-muted">Loading BU Pulse session…</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const showStatus =
    currentUser.role === "deptTO" && status !== "Draft generated"
      ? status
      : undefined;
  const userDept = currentUser.department || department.name;
  const userSchool = currentUser.school || department.school;
  const currentSubtitle =
    currentUser.role === "deptTO"
      ? `${userDept} — ${department.session}, ${department.semester}`
      : currentUser.role === "hod"
        ? `Head of Department · ${userDept}`
        : currentUser.role === "dean"
          ? userSchool
          : `Babcock University · ${department.semester} ${department.session}`;

  return (
    <div className="flex h-full w-full overflow-hidden bg-canvas">
      <Sidebar
        view={view}
        setView={handleSetView}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={topBarTitleByView[view] || "Timetable Management"}
          subtitle={currentSubtitle}
          status={showStatus}
          onMenuClick={() => setSidebarOpen(true)}
          setView={handleSetView}
        />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
