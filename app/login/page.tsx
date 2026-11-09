"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import LoginScreen from "@/components/LoginScreen";
import { useApp } from "@/lib/AppContext";
import type { UserAccount } from "@/lib/data";

const defaultPathByRole: Record<string, string> = {
  deptTO: "/dashboard",
  hod: "/hod-review",
  dean: "/dean-review",
  acadPlanningTO: "/academic-planning",
  superAdmin: "/academic-planning",
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = useApp();
  const redirectParam = searchParams?.get("redirect");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function handleLogin(account: UserAccount) {
    setIsLoggingIn(true);
    try {
      await context.handleLogin(account);

      const target =
        redirectParam && redirectParam !== "/login"
          ? redirectParam
          : defaultPathByRole[account.role] || "/dashboard";

      router.push(target);
    } catch {
      setIsLoggingIn(false);
    }
  }

  return (
    <div className="relative">
      <LoginScreen onLogin={handleLogin} />
      {isLoggingIn && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas/80 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-9 w-9 animate-spin text-brand" />
            <p className="text-sm font-semibold text-ink">Signing into workspace…</p>
            <p className="text-xs text-muted">Preparing timetabling dashboard</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <LoginContent />
    </Suspense>
  );
}

