"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-canvas p-6 text-center font-sans">
        <div className="max-w-md rounded-2xl border border-line bg-card p-8 shadow-xl">
          <h2 className="text-[22px] font-bold text-ink">Application Error</h2>
          <p className="mt-2 text-[14px] text-muted">
            {error.message || "A critical application error occurred."}
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 rounded-xl bg-brand px-5 py-2.5 text-[14px] font-semibold text-white cursor-pointer hover:bg-brand/90 transition"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}

