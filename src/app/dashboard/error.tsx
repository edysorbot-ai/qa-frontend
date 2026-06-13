"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[dashboard] render error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
      <div className="p-3 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          {error?.message || "An unexpected error occurred while rendering this page."}
        </p>
        {error?.digest && (
          <p className="text-[11px] text-muted-foreground/70 mt-2 font-mono">
            ref: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={reset} size="sm">
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Try again
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
    </div>
  );
}
