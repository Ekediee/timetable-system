import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[450px] flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Compass size={28} />
      </div>
      <h2 className="text-[22px] font-bold text-ink">Page Not Found</h2>
      <p className="mt-2 max-w-sm text-[14px] text-muted">
        The timetable route or page you are trying to access does not exist.
      </p>
      <div className="mt-6">
        <Link href="/dashboard">
          <Button>
            <ArrowLeft size={15} /> Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

