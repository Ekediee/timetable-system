"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import Dashboard from "@/views/Dashboard";

const defaultPathByRole: Record<string, string> = {
  deptTO: "/dashboard",
  hod: "/hod-review",
  dean: "/dean-review",
  acadPlanningTO: "/academic-planning",
  superAdmin: "/academic-planning",
};

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser } = useApp();

  useEffect(() => {
    if (currentUser && currentUser.role !== "deptTO") {
      const target = defaultPathByRole[currentUser.role] || "/academic-planning";
      router.replace(target);
    }
  }, [currentUser, router]);

  if (currentUser && currentUser.role !== "deptTO") {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return <Dashboard />;
}
