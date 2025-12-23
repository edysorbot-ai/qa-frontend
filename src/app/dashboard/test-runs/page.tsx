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
  running: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
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
          <h1 className="text-3xl font-bold tracking-tight">Test Runs</h1>
          <p className="text-muted-foreground">
            View and manage your test execution history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTestRuns}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Link href="/dashboard/test-runs/new">
            <Button>
              <PlayCircle className="mr-2 h-4 w-4" />
              Start New Run
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      )}

      {testRuns.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Test Runs</CardTitle>
            <CardDescription>
              Run your test suite to see execution results here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Test runs will show detailed results including pass/fail status,
              audio transcripts, latency metrics, and conversation analysis.
            </p>
            <Link href="/dashboard/test-runs/new">
              <Button>
                <PlayCircle className="mr-2 h-4 w-4" />
                Run Your First Test
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {testRuns.map((run) => (
            <Card key={run.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Link href={`/dashboard/test-runs/${run.id}`} className="flex-1 cursor-pointer">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{run.name}</h3>
                        <Badge
                          className={`${statusColors[run.status]} flex items-center gap-1`}
                        >
                          {statusIcons[run.status]}
                          {run.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(run.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-8">
                    <Link href={`/dashboard/test-runs/${run.id}`} className="flex items-center gap-8 cursor-pointer">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {run.stats.total}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {run.stats.passed}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Passed
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {run.stats.failed}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Failed
                        </div>
                      </div>
                      <div className="w-32">
                        <Progress
                          value={
                            run.stats.total > 0
                              ? (run.stats.completed / run.stats.total) * 100
                              : 0
                          }
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1 text-center">
                          {run.stats.completed} / {run.stats.total} completed
                        </div>
                      </div>
                    </Link>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteClick(e, run)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
