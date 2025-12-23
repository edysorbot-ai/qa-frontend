"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Minus,
  BarChart3,
  LineChart,
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";

interface TestRunMetrics {
  runId: string;
  runName: string;
  runDate: string;
  passed: number;
  failed: number;
  total: number;
  passRate: number;
  avgScore: number;
}

interface TestCaseResult {
  runId: string;
  runName: string;
  runDate: string;
  passed: boolean | null;
  score: number;
  metrics: Record<string, unknown>;
  actualResponse?: string;
  errorMessage?: string;
  expectedBehavior?: string;
  scenario?: string;
}

interface Improvement {
  from: string;
  to: string;
  passRateChange: number;
  avgScoreChange: number;
  passedChange: number;
}

interface ComparisonData {
  runMetrics: TestRunMetrics[];
  testCaseComparison: Record<string, (TestCaseResult | null)[]>;
  improvements: Improvement[];
  totalTestCases: number;
}

interface TestRun {
  id: string;
  name: string;
  status: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  created_at: string;
  completed_at?: string;
  results?: unknown[];
}

export default function CompareTestRunsPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ids = searchParams.get("ids");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (testCaseName: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testCaseName)) {
        newSet.delete(testCaseName);
      } else {
        newSet.add(testCaseName);
      }
      return newSet;
    });
  };

  const fetchComparison = useCallback(async () => {
    if (!ids) {
      setError("No test run IDs provided");
      setIsLoading(false);
      return;
    }

    // Limit to exactly 2 test runs
    const runIds = ids.split(",").slice(0, 2);
    if (runIds.length < 2) {
      setError("Please select exactly 2 test runs to compare");
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(api.endpoints.testRuns.compare(runIds), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setComparison(data.comparison);
        setTestRuns(data.testRuns);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch comparison data");
      }
    } catch (error) {
      console.error("Error fetching comparison:", error);
      setError("Failed to fetch comparison data");
    } finally {
      setIsLoading(false);
    }
  }, [ids, getToken]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/test-runs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Compare Test Runs</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/test-runs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GitCompare className="h-6 w-6" />
              Compare Test Runs
            </h1>
            <p className="text-muted-foreground">
              Comparing 2 test runs across {comparison.totalTestCases} test cases
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="testcases">
            <LineChart className="mr-2 h-4 w-4" />
            Test Cases
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Simplified Summary Cards - Only 2 test runs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comparison.runMetrics.slice(0, 2).map((metrics, idx) => (
              <Card key={metrics.runId} className={idx === 1 ? "border-primary" : ""}>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    {idx === 0 && <Badge variant="secondary">Oldest</Badge>}
                    {idx === 1 && <Badge>Latest</Badge>}
                    <span className="text-xs">
                      {new Date(metrics.runDate).toLocaleDateString()} {new Date(metrics.runDate).toLocaleTimeString()}
                    </span>
                  </CardDescription>
                  <CardTitle className="text-lg truncate" title={metrics.runName}>
                    {metrics.runName || `Run #${metrics.runId.slice(0, 8)}`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pass Rate</span>
                      <span className={`text-2xl font-bold ${
                        metrics.passRate >= 70 ? 'text-green-600' : 
                        metrics.passRate >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {metrics.passRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          metrics.passRate >= 70 ? 'bg-green-500' : 
                          metrics.passRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${metrics.passRate}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      {metrics.passed} of {metrics.total} test cases passed
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Improved and Regressed Test Cases - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-700 flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5" />
                  Improved Test Cases
                </CardTitle>
                <CardDescription>
                  Tests that went from failing to passing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(comparison.testCaseComparison)
                    .filter(([, results]) => {
                      const first = results.find(r => r !== null);
                      const last = [...results].reverse().find(r => r !== null);
                      return first?.passed === false && last?.passed === true;
                    })
                    .map(([name]) => (
                      <div key={name} className="flex items-center gap-2 p-2 rounded bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{name}</span>
                      </div>
                    ))}
                  {Object.entries(comparison.testCaseComparison)
                    .filter(([, results]) => {
                      const first = results.find(r => r !== null);
                      const last = [...results].reverse().find(r => r !== null);
                      return first?.passed === false && last?.passed === true;
                    }).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No improved test cases
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <ArrowDownRight className="h-5 w-5" />
                  Regressed Test Cases
                </CardTitle>
                <CardDescription>
                  Tests that went from passing to failing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(comparison.testCaseComparison)
                    .filter(([, results]) => {
                      const first = results.find(r => r !== null);
                      const last = [...results].reverse().find(r => r !== null);
                      return first?.passed === true && last?.passed === false;
                    })
                    .map(([name]) => (
                      <div key={name} className="flex items-center gap-2 p-2 rounded bg-red-50">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">{name}</span>
                      </div>
                    ))}
                  {Object.entries(comparison.testCaseComparison)
                    .filter(([, results]) => {
                      const first = results.find(r => r !== null);
                      const last = [...results].reverse().find(r => r !== null);
                      return first?.passed === true && last?.passed === false;
                    }).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No regressed test cases
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pass/Fail Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Test Results Comparison
              </CardTitle>
              <CardDescription>
                Detailed comparison of test execution results between the two runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const oldest = comparison.runMetrics[0];
                const latest = comparison.runMetrics[1];
                const passedDiff = latest.passed - oldest.passed;
                const failedDiff = latest.failed - oldest.failed;
                const rateDiff = latest.passRate - oldest.passRate;
                
                return (
                  <div className="space-y-6">
                    {/* Two Column Comparison */}
                    <div className="grid grid-cols-2 gap-6">
                      {/* Oldest Run Column */}
                      <div className="space-y-4 border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">Baseline Run</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(oldest.runDate).toLocaleDateString()} {new Date(oldest.runDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">{oldest.runName}</p>
                        
                        {/* Circular Progress */}
                        <div className="flex items-center gap-4">
                          <div className="relative w-24 h-24">
                            <svg className="w-24 h-24 -rotate-90">
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-muted"
                              />
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-foreground"
                                strokeDasharray={`${oldest.passRate * 2.51} 251`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg font-bold">{oldest.passRate.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Passed</span>
                              <span className="font-medium">{oldest.passed}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Failed</span>
                              <span className="font-medium">{oldest.failed}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm border-t pt-2">
                              <span className="text-muted-foreground">Total</span>
                              <span className="font-bold">{oldest.total}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress Bars */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Passed</span>
                              <span>{oldest.passRate.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-foreground rounded-full transition-all"
                                style={{ width: `${oldest.passRate}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Failed</span>
                              <span>{(100 - oldest.passRate).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-foreground/50 rounded-full transition-all"
                                style={{ width: `${100 - oldest.passRate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Latest Run Column */}
                      <div className="space-y-4 border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">Current Run</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(latest.runDate).toLocaleDateString()} {new Date(latest.runDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">{latest.runName}</p>
                        
                        {/* Circular Progress */}
                        <div className="flex items-center gap-4">
                          <div className="relative w-24 h-24">
                            <svg className="w-24 h-24 -rotate-90">
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-muted"
                              />
                              <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-foreground"
                                strokeDasharray={`${latest.passRate * 2.51} 251`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg font-bold">{latest.passRate.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Passed</span>
                              <span className="font-medium">{latest.passed}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Failed</span>
                              <span className="font-medium">{latest.failed}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm border-t pt-2">
                              <span className="text-muted-foreground">Total</span>
                              <span className="font-bold">{latest.total}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress Bars */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Passed</span>
                              <span>{latest.passRate.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-foreground rounded-full transition-all"
                                style={{ width: `${latest.passRate}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Failed</span>
                              <span>{(100 - latest.passRate).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-foreground/50 rounded-full transition-all"
                                style={{ width: `${100 - latest.passRate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Change Summary */}
                    <div className="border-t pt-6">
                      <h4 className="text-sm font-medium mb-4">Changes from Baseline to Current</h4>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="border rounded-lg p-4">
                          <p className="text-xs text-muted-foreground mb-1">Pass Rate Change</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">
                              {rateDiff >= 0 ? '+' : ''}{rateDiff.toFixed(1)}%
                            </span>
                            {rateDiff !== 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded border">
                                {rateDiff >= 0 ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <p className="text-xs text-muted-foreground mb-1">Tests Passed</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{oldest.passed} → {latest.passed}</span>
                            <span className="text-sm text-muted-foreground">
                              ({passedDiff >= 0 ? '+' : ''}{passedDiff})
                            </span>
                          </div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <p className="text-xs text-muted-foreground mb-1">Tests Failed</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{oldest.failed} → {latest.failed}</span>
                            <span className="text-sm text-muted-foreground">
                              ({failedDiff >= 0 ? '+' : ''}{failedDiff})
                            </span>
                          </div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <p className="text-xs text-muted-foreground mb-1">Total Tests</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{oldest.total}</span>
                            {oldest.total !== latest.total && (
                              <span className="text-sm text-muted-foreground">→ {latest.total}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Visual Comparison Bar */}
                    <div className="border-t pt-6">
                      <h4 className="text-sm font-medium mb-4">Side-by-Side Comparison</h4>
                      <div className="space-y-6">
                        {/* Passed Comparison */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Passed Tests</span>
                            <span className="text-xs text-muted-foreground">
                              {passedDiff >= 0 ? '+' : ''}{passedDiff}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-muted-foreground">Baseline</span>
                                <span className="text-xs font-medium">{oldest.passed} / {oldest.total}</span>
                              </div>
                              <div className="h-6 bg-muted rounded overflow-hidden">
                                <div 
                                  className="h-full bg-foreground/80 flex items-center justify-end pr-2"
                                  style={{ width: `${(oldest.passed / oldest.total) * 100}%` }}
                                >
                                  {(oldest.passed / oldest.total) > 0.15 && (
                                    <span className="text-xs font-medium text-background">{oldest.passed}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="relative">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-muted-foreground">Current</span>
                                <span className="text-xs font-medium">{latest.passed} / {latest.total}</span>
                              </div>
                              <div className="h-6 bg-muted rounded overflow-hidden">
                                <div 
                                  className="h-full bg-foreground flex items-center justify-end pr-2"
                                  style={{ width: `${(latest.passed / latest.total) * 100}%` }}
                                >
                                  {(latest.passed / latest.total) > 0.15 && (
                                    <span className="text-xs font-medium text-background">{latest.passed}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Failed Comparison */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Failed Tests</span>
                            <span className="text-xs text-muted-foreground">
                              {failedDiff >= 0 ? '+' : ''}{failedDiff}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-muted-foreground">Baseline</span>
                                <span className="text-xs font-medium">{oldest.failed} / {oldest.total}</span>
                              </div>
                              <div className="h-6 bg-muted rounded overflow-hidden">
                                <div 
                                  className="h-full bg-foreground/50 flex items-center justify-end pr-2"
                                  style={{ width: `${(oldest.failed / oldest.total) * 100}%` }}
                                >
                                  {(oldest.failed / oldest.total) > 0.15 && (
                                    <span className="text-xs font-medium text-background">{oldest.failed}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="relative">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-muted-foreground">Current</span>
                                <span className="text-xs font-medium">{latest.failed} / {latest.total}</span>
                              </div>
                              <div className="h-6 bg-muted rounded overflow-hidden">
                                <div 
                                  className="h-full bg-foreground/70 flex items-center justify-end pr-2"
                                  style={{ width: `${(latest.failed / latest.total) * 100}%` }}
                                >
                                  {(latest.failed / latest.total) > 0.15 && (
                                    <span className="text-xs font-medium text-background">{latest.failed}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Cases Tab */}
        <TabsContent value="testcases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Case Results Comparison</CardTitle>
              <CardDescription>
                See how each test case performed across different runs. Click on a row to see details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="border rounded-lg overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-[minmax(250px,1fr)_150px_150px_80px] bg-muted/70 sticky top-0 z-10">
                    <div className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Test Case
                    </div>
                    {comparison.runMetrics.slice(0, 2).map((metrics, idx) => (
                      <div key={metrics.runId} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <div className="truncate">{idx === 0 ? 'Oldest' : 'Latest'}</div>
                        <div className="text-[10px] text-muted-foreground/70 truncate">
                          {new Date(metrics.runDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                    <div className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Trend
                    </div>
                  </div>

                  {/* Test Case Rows */}
                  <div className="divide-y">
                    {Object.entries(comparison.testCaseComparison).map(([testCaseName, results]) => {
                      // Calculate trend (first vs last)
                      const firstResult = results[0] as TestCaseResult | null;
                      const lastResult = results[1] as TestCaseResult | null;
                      const firstPassed = firstResult?.passed;
                      const lastPassed = lastResult?.passed;
                      const isExpanded = expandedRows.has(testCaseName);
                      
                      let trendIcon = <Minus className="h-4 w-4 text-gray-400" />;
                      if (firstPassed === false && lastPassed === true) {
                        trendIcon = <ArrowUpRight className="h-4 w-4 text-green-500" />;
                      } else if (firstPassed === true && lastPassed === false) {
                        trendIcon = <ArrowDownRight className="h-4 w-4 text-red-500" />;
                      }

                      // Check if any result has details to show
                      const hasDetails = results.slice(0, 2).some(r => 
                        r && (r.errorMessage || r.actualResponse || r.expectedBehavior || r.scenario)
                      );

                      return (
                        <Collapsible key={testCaseName} open={isExpanded} onOpenChange={() => toggleRowExpansion(testCaseName)}>
                          <CollapsibleTrigger asChild>
                            <div className={`grid grid-cols-[minmax(250px,1fr)_150px_150px_80px] hover:bg-muted/30 cursor-pointer transition-colors ${isExpanded ? 'bg-muted/20' : ''}`}>
                              <div className="px-4 py-3 flex items-center gap-2">
                                {hasDetails ? (
                                  isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )
                                ) : (
                                  <div className="w-4 flex-shrink-0" />
                                )}
                                <span className="font-medium text-sm">{testCaseName}</span>
                              </div>
                              <div className="px-4 py-3 flex justify-center items-center">
                                {firstResult === null ? (
                                  <span className="text-muted-foreground text-sm">—</span>
                                ) : firstResult.passed ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                              <div className="px-4 py-3 flex justify-center items-center">
                                {lastResult === null ? (
                                  <span className="text-muted-foreground text-sm">—</span>
                                ) : lastResult.passed ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                              <div className="px-4 py-3 flex justify-center items-center">
                                {trendIcon}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 py-4 bg-muted/10 border-t">
                              <div className="grid grid-cols-2 gap-6">
                                {results.slice(0, 2).map((result, idx) => (
                                  <div key={idx} className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant={idx === 0 ? "secondary" : "default"}>
                                        {idx === 0 ? "Oldest Run" : "Latest Run"}
                                      </Badge>
                                      {result?.passed ? (
                                        <Badge className="bg-green-100 text-green-800">Passed</Badge>
                                      ) : result?.passed === false ? (
                                        <Badge className="bg-red-100 text-red-800">Failed</Badge>
                                      ) : (
                                        <Badge variant="outline">Not Run</Badge>
                                      )}
                                    </div>
                                    
                                    {result ? (
                                      <div className="space-y-3 text-sm">
                                        {result.scenario && (
                                          <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Scenario</p>
                                            <p className="text-foreground bg-background p-2 rounded border">{result.scenario}</p>
                                          </div>
                                        )}
                                        
                                        {result.expectedBehavior && (
                                          <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Expected Behavior</p>
                                            <p className="text-foreground bg-background p-2 rounded border">{result.expectedBehavior}</p>
                                          </div>
                                        )}
                                        
                                        {result.actualResponse && (
                                          <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Actual Response</p>
                                            <p className="text-foreground bg-background p-2 rounded border max-h-32 overflow-y-auto">{result.actualResponse}</p>
                                          </div>
                                        )}
                                        
                                        {result.errorMessage && (
                                          <div>
                                            <p className="text-xs font-semibold text-red-600 uppercase mb-1">Error / Failure Reason</p>
                                            <p className="text-red-700 bg-red-50 p-2 rounded border border-red-200">{result.errorMessage}</p>
                                          </div>
                                        )}
                                        
                                        {!result.passed && !result.errorMessage && !result.actualResponse && (
                                          <p className="text-muted-foreground italic">No detailed failure information available</p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-muted-foreground text-sm italic">Test case was not executed in this run</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
