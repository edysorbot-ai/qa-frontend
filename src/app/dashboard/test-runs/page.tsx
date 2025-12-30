"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PlayCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TestRun {
  id: string;
  name: string;
  status: "running" | "completed" | "cancelled" | "failed";
  createdAt: string;
  stats: {
    total: number;
    completed: number;
    passed: number;
    failed: number;
  };
}

const statusColors: Record<string, string> = {
  running: "bg-slate-200 text-slate-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-700",
  failed: "bg-red-100 text-red-800",
};

const statusIcons: Record<string, React.ReactNode> = {
  running: <Loader2 className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  cancelled: <Clock className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
};

export default function TestRunsPage() {
  const { getToken } = useAuth();
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [runToDelete, setRunToDelete] = useState<TestRun | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTestRuns = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${api.baseUrl}/api/test-execution/runs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTestRuns(data.runs || []);
      } else {
        setError("Failed to fetch test runs");
      }
    } catch (err) {
      console.error("Error fetching test runs:", err);
      setError("Failed to fetch test runs");
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchTestRuns();
  }, [fetchTestRuns]);

  // Poll for updates if there are running tests
  useEffect(() => {
    if (testRuns.some((r) => r.status === "running")) {
      const interval = setInterval(fetchTestRuns, 3000);
      return () => clearInterval(interval);
    }
  }, [testRuns, fetchTestRuns]);

  const handleDeleteClick = (e: React.MouseEvent, run: TestRun) => {
    e.preventDefault();
    e.stopPropagation();
    setRunToDelete(run);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!runToDelete) return;

    setIsDeleting(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${api.baseUrl}/api/test-runs/${runToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setTestRuns(testRuns.filter(r => r.id !== runToDelete.id));
        setDeleteDialogOpen(false);
        setRunToDelete(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete test run");
      }
    } catch (err) {
      console.error("Error deleting test run:", err);
      setError("Failed to delete test run");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Test Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your test execution history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTestRuns}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/dashboard/test-runs/new">
            <Button size="sm">
              Start New Run
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>
      )}

      {testRuns.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <h3 className="font-medium text-lg mb-2">No Test Runs</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Run your test suite to see execution results here. Test runs will show detailed results including pass/fail status, audio transcripts, and latency metrics.
          </p>
          <Link href="/dashboard/test-runs/new">
            <Button>Run Your First Test</Button>
          </Link>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3">Test Run</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-center">Total</th>
                <th className="px-6 py-3 text-center">Passed</th>
                <th className="px-6 py-3 text-center">Failed</th>
                <th className="px-6 py-3">Progress</th>
                <th className="px-6 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {testRuns.map((run) => (
                <tr 
                  key={run.id} 
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/dashboard/test-runs/${run.id}`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">{run.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(run.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      className={`${statusColors[run.status]} flex items-center gap-1.5 w-fit`}
                    >
                      {statusIcons[run.status]}
                      {run.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold">{run.stats.total}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-green-600">{run.stats.passed}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-red-600">{run.stats.failed}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-32">
                      <Progress
                        value={
                          run.stats.total > 0
                            ? (run.stats.completed / run.stats.total) * 100
                            : 0
                        }
                        className="h-1.5"
                      />
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {run.stats.completed} / {run.stats.total} completed
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteClick(e, run)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Run?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{runToDelete?.name}&quot;? This action cannot be undone.
              All test results and recordings associated with this run will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
