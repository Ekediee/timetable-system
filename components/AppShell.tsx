"use client";

import { usePathname, useRouter } from "next/navigation";
import { useApp } from "../lib/AppContext";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import LoginScreen from "./LoginScreen";
import { department, type UserAccount, type UserRole } from "../lib/data";

const defaultRouteByRole: Record<UserRole, string> = {
  deptTO: "/dashboard",
  hod: "/hod-review",
  dean: "/dean-review",
  acadPlanningTO: "/academic-planning",
};

const topBarSubtitleByRole: Partial<Record<UserRole, string>> = {
  deptTO: `${department.name} — ${department.session}, ${department.semester}`,
  hod: `Head of Department · ${department.name}`,
  dean: department.school,
  acadPlanningTO: "Babcock University · First Semester 2025/26",
};

const topBarTitleByPath: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/allocations": "Allocations",
  "/venues": "Venues & Timeslots",
  "/constraints": "Constraints",
  "/generate": "Generated Timetable",
  "/history": "Status & History",
  "/hod-review": "Submissions",
  "/dean-review": "School Submissions",
  "/academic-planning": "Academic Planning Office",
  "/academic-planning/published": "Published Timetables",
  "/academic-planning/constraints": "Constraints Management",
  "/academic-planning/clashes": "Venue Clash Detection",
  "/academic-planning/analytics": "Analytics",
  "/academic-planning/audit": "Audit Log",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const {
    currentUser,
    handleLogin: contextLogin,
    handleLogout: contextLogout,
    sidebarOpen,
    setSidebarOpen,
    status,
  } = useApp();

  const pathname = usePathname();
  const router = useRouter();

  function onLogin(account: UserAccount) {
    contextLogin(account);
    const target = defaultRouteByRole[account.role] || "/dashboard";
    router.push(target);
  }

  function onLogout() {
    contextLogout();
    router.push("/");
  }

  if (!currentUser) {
    return <LoginScreen onLogin={onLogin} />;
  }

  const title = topBarTitleByPath[pathname] || "BU Pulse";
  const subtitle = topBarSubtitleByRole[currentUser.role];
  const showStatus = currentUser.role === "deptTO" ? status : undefined;

  return (
    <div className="flex h-full w-full overflow-hidden bg-canvas">
      <Sidebar
        currentUser={currentUser}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          subtitle={subtitle}
          status={showStatus}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
