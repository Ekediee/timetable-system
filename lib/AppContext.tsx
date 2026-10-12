"use client";

import React, { createContext, useContext, useState } from "react";
import {
  sessions,
  constraints,
  timeline,
  deptSubmissions,
  auditLog,
  type Status,
  type Session,
  type Constraint,
  type TimelineStep,
  type UserAccount,
  type DeptSubmission,
  type AuditEntry,
} from "./data";

function nowLabel() {
  const d = new Date();
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${month} ${day}, ${h}:${m}`;
}

interface AppContextType {
  currentUser: UserAccount | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  status: Status;
  setStatus: React.Dispatch<React.SetStateAction<Status>>;
  constraintsComplete: boolean;
  setConstraintsComplete: React.Dispatch<React.SetStateAction<boolean>>;
  localSessions: Session[];
  setLocalSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  localConstraints: Constraint[];
  setLocalConstraints: React.Dispatch<React.SetStateAction<Constraint[]>>;
  localTimeline: TimelineStep[];
  setLocalTimeline: React.Dispatch<React.SetStateAction<TimelineStep[]>>;
  deptSubs: DeptSubmission[];
  setDeptSubs: React.Dispatch<React.SetStateAction<DeptSubmission[]>>;
  auditEntries: AuditEntry[];
  setAuditEntries: React.Dispatch<React.SetStateAction<AuditEntry[]>>;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  addAuditEntry: (partial: Omit<AuditEntry, "id" | "actor" | "at">) => void;
  handleLogin: (account: UserAccount) => void;
  handleLogout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [status, setStatus] = useState<Status>("Draft generated");
  const [constraintsComplete, setConstraintsComplete] = useState(false);
  const [localSessions, setLocalSessions] = useState<Session[]>(sessions);
  const [localConstraints, setLocalConstraints] = useState<Constraint[]>(constraints);
  const [localTimeline, setLocalTimeline] = useState<TimelineStep[]>(timeline);
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
  }

  function handleLogout() {
    setCurrentUser(null);
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        status,
        setStatus,
        constraintsComplete,
        setConstraintsComplete,
        localSessions,
        setLocalSessions,
        localConstraints,
        setLocalConstraints,
        localTimeline,
        setLocalTimeline,
        deptSubs,
        setDeptSubs,
        auditEntries,
        setAuditEntries,
        sidebarOpen,
        setSidebarOpen,
        addAuditEntry,
        handleLogin,
        handleLogout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    return {
      currentUser: null,
      setCurrentUser: () => {},
      status: "Draft generated" as Status,
      setStatus: () => {},
      constraintsComplete: false,
      setConstraintsComplete: () => {},
      localSessions: sessions,
      setLocalSessions: () => {},
      localConstraints: constraints,
      setLocalConstraints: () => {},
      localTimeline: timeline,
      setLocalTimeline: () => {},
      deptSubs: deptSubmissions,
      setDeptSubs: () => {},
      auditEntries: auditLog,
      setAuditEntries: () => {},
      sidebarOpen: false,
      setSidebarOpen: () => {},
      addAuditEntry: () => {},
      handleLogin: () => {},
      handleLogout: () => {},
    };
  }
  return context;
}
