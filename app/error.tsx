"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bad-soft text-bad">
        <AlertCircle size={28} />
      </div>
      <h2 className="text-[20px] font-bold text-ink">Something went wrong</h2>
      <p className="mt-2 max-w-md text-[14px] text-muted">
        {error.message || "An unexpected error occurred while loading this view."}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={() => reset()}>
          <RotateCcw size={15} /> Try again
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}

