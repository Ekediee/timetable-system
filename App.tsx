"use client";

import { useState } from "react";
import Sidebar, { type View } from "./components/Sidebar";
import TopBar from "./components/TopBar";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./views/Dashboard";
import Allocations from "./views/Allocations";
import Venues from "./views/Venues";
import Constraints from "./views/Constraints";
import Generate from "./views/Generate";
import History from "./views/History";
import HODReview from "./views/HODReview";
import DeanReview from "./views/DeanReview";
import AcademicPlanning from "./views/AcademicPlanning";
import AcademicPlanningPublished from "./views/AcademicPlanningPublished";
import AcademicPlanningAudit from "./views/AcademicPlanningAudit";
import AcademicPlanningClashes from "./views/AcademicPlanningClashes";
import AcademicPlanningAnalytics from "./views/AcademicPlanningAnalytics";
import AcademicPlanningConstraints from "./views/AcademicPlanningConstraints";
import {
  sessions,
  constraints,
  timeline,
  department,
  accounts,
  deptSubmissions,
  auditLog,
  type Status,
  type Session,
  type Constraint,
  type TimelineStep,
  type UserAccount,
  type UserRole,
  type DeptSubmission,
  type AuditEntry,
} from "./lib/data";

const defaultViewByRole: Record<UserRole, View> = {
  deptTO: "dashboard",
  hod: "hodReview",
  dean: "deanReview",
  acadPlanningTO: "acadPlanning",
};

const topBarSubtitleByRole: Partial<Record<UserRole, string>> = {
  deptTO: `${department.name} — ${department.session}, ${department.semester}`,
  hod: `Head of Department · ${department.name}`,
  dean: department.school,
  acadPlanningTO: "Babcock University · First Semester 2025/26",
};

const topBarTitleByView: Record<View, string> = {
  dashboard: "Dashboard",
  allocations: "Allocations",
  venues: "Venues & Timeslots",
  constraints: "Constraints",
  generate: "Generated Timetable",
  history: "Status & History",
  hodReview: "Submissions",
  deanReview: "School Submissions",
  acadPlanning: "Academic Planning Office",
  acadPublished: "Published Timetables",
  acadAudit: "Audit Log",
  acadConstraints: "Constraints Management",
  acadClashes: "Venue Clash Detection",
  acadAnalytics: "Analytics",
};

function nowLabel() {
  const d = new Date();
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${month} ${day}, ${h}:${m}`;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [status, setStatus] = useState<Status>("Draft generated");
  const [constraintsComplete, setConstraintsComplete] = useState(false);
  const [localSessions, setLocalSessions] = useState<Session[]>(sessions);
  const [localConstraints, setLocalConstraints] = useState<Constraint[]>(constraints);
  const [localTimeline, setLocalTimeline] = useState<TimelineStep[]>(timeline);

  // Shared Acad Planning state — lifted so all three views stay in sync
  const [deptSubs, setDeptSubs] = useState<DeptSubmission[]>(deptSubmissions);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(auditLog);

  function addAuditEntry(partial: Omit<AuditEntry, "id" | "actor" | "at">) {
    const entry: AuditEntry = {
      ...partial,
      id: `a${Date.now()}`,
      actor: "M. Danladi",
      at: nowLabel(),
    };
    setAuditEntries((prev) => [entry, ...prev]);
  }

  function handleLogin(account: UserAccount) {
    setCurrentUser(account);
    setView(defaultViewByRole[account.role]);
  }

  function handleLogout() {
    setCurrentUser(null);
    setView("dashboard");
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const showStatus = currentUser.role === "deptTO" ? status : undefined;

  return (
    <div className="flex h-full w-full overflow-hidden bg-canvas">
      <Sidebar
        view={view}
        setView={setView}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={topBarTitleByView[view]}
          subtitle={topBarSubtitleByRole[currentUser.role]}
          status={showStatus}
          onMenuClick={() => setSidebarOpen(true)}
          setView={setView}
        />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div className="mx-auto max-w-[1200px]">
            {/* Dept T.O views */}
            {view === "dashboard" && (
              <Dashboard
                setView={setView}
                status={status}
                localSessions={localSessions}
                localConstraints={localConstraints}
                constraintsComplete={constraintsComplete}
                localTimeline={localTimeline}
              />
            )}
            {view === "allocations" && <Allocations />}
            {view === "venues" && <Venues />}
            {view === "constraints" && (
              <Constraints
                localConstraints={localConstraints}
                setLocalConstraints={setLocalConstraints}
                constraintsComplete={constraintsComplete}
                setConstraintsComplete={setConstraintsComplete}
              />
            )}
            {view === "generate" && (
              <Generate
                localSessions={localSessions}
                setLocalSessions={setLocalSessions}
                constraintsComplete={constraintsComplete}
                status={status}
                setStatus={setStatus}
                setLocalTimeline={setLocalTimeline}
                setView={setView}
              />
            )}
            {view === "history" && (
              <History
                status={status}
                localTimeline={localTimeline}
                setView={setView}
              />
            )}

            {/* HOD view */}
            {view === "hodReview" && (
              <HODReview
                status={status}
                setStatus={setStatus}
                localSessions={localSessions}
                localTimeline={localTimeline}
                setLocalTimeline={setLocalTimeline}
              />
            )}

            {/* Dean view */}
            {view === "deanReview" && (
              <DeanReview
                status={status}
                setStatus={setStatus}
                localSessions={localSessions}
                localTimeline={localTimeline}
                setLocalTimeline={setLocalTimeline}
              />
            )}

            {/* Academic Planning T.O views */}
            {view === "acadPlanning" && (
              <AcademicPlanning
                submissions={deptSubs}
                setSubmissions={setDeptSubs}
                onAuditEntry={addAuditEntry}
              />
            )}
            {view === "acadPublished" && (
              <AcademicPlanningPublished
                submissions={deptSubs}
                setSubmissions={setDeptSubs}
                onAuditEntry={addAuditEntry}
              />
            )}
            {view === "acadClashes" && (
              <AcademicPlanningClashes submissions={deptSubs} />
            )}
            {view === "acadAnalytics" && (
              <AcademicPlanningAnalytics submissions={deptSubs} />
            )}
            {view === "acadConstraints" && <AcademicPlanningConstraints />}
            {view === "acadAudit" && (
              <AcademicPlanningAudit
                submissions={deptSubs}
                auditEntries={auditEntries}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
