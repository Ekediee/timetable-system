"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";

const defaultPathByRole: Record<string, string> = {
  deptTO: "/dashboard",
  hod: "/hod-review",
  dean: "/dean-review",
  acadPlanningTO: "/academic-planning",
  superAdmin: "/academic-planning",
};

export default function Home() {
  const router = useRouter();
  const { currentUser } = useApp();

  useEffect(() => {
    if (currentUser) {
      const target = defaultPathByRole[currentUser.role] || "/dashboard";
      router.replace(target);
    } else {
      router.replace("/login");
    }
  }, [currentUser, router]);

  return null;
}
