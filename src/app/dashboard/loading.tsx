import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}
