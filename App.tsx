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
import { useApp } from "./lib/AppContext";
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
  deptTO: "generate",
  hod: "hodReview",
  dean: "deanReview",
  acadPlanningTO: "acadPlanning",
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

export default function App() {
  const context = useApp();
  const currentUser = context.currentUser;
  const [view, setView] = useState<View>("generate");
  const sidebarOpen = context.sidebarOpen;
  const setSidebarOpen = context.setSidebarOpen;
  const status = context.status;
  const setStatus = context.setStatus;
  const constraintsComplete = context.constraintsComplete;
  const setConstraintsComplete = context.setConstraintsComplete;
  const localSessions = context.localSessions;
  const setLocalSessions = context.setLocalSessions;
  const localConstraints = context.localConstraints;
  const setLocalConstraints = context.setLocalConstraints;
  const localTimeline = context.localTimeline;
  const setLocalTimeline = context.setLocalTimeline;
  const deptSubs = context.deptSubs;
  const setDeptSubs = context.setDeptSubs;
  const auditEntries = context.auditEntries;
  const addAuditEntry = context.addAuditEntry;

  function handleLogin(account: UserAccount) {
    context.handleLogin(account);
    setView(defaultViewByRole[account.role]);
  }

  function handleLogout() {
    context.handleLogout();
    setView("dashboard");
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const showStatus = currentUser.role === "deptTO" ? status : undefined;
  const userDept = currentUser.department || department.name;
  const userSchool = currentUser.school || department.school;
  const currentSubtitle =
    currentUser.role === "deptTO"
      ? `${userDept} — ${department.session}, ${department.semester}`
      : currentUser.role === "hod"
      ? `Head of Department · ${userDept}`
      : currentUser.role === "dean"
      ? userSchool
      : "Babcock University · First Semester 2025/26";

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
          subtitle={currentSubtitle}
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
                setView={setView}
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
