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
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  LineChart,
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
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

  const fetchComparison = useCallback(async () => {
    if (!ids) {
      setError("No test run IDs provided");
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(api.endpoints.testRuns.compare(ids.split(",")), {
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

  // Helper to get trend icon
  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // Helper to format change with color
  const formatChange = (change: number, suffix: string = "") => {
    const color = change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-500";
    const prefix = change > 0 ? "+" : "";
    return <span className={`font-medium ${color}`}>{prefix}{change.toFixed(1)}{suffix}</span>;
  };

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
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
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
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GitCompare className="h-6 w-6" />
              Compare Test Runs
            </h1>
            <p className="text-muted-foreground">
              Comparing {comparison.runMetrics.length} test runs across {comparison.totalTestCases} test cases
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
          <TabsTrigger value="trends">
            <TrendingUp className="mr-2 h-4 w-4" />
            Trends & Improvements
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparison.runMetrics.map((metrics, idx) => (
              <Card key={metrics.runId} className={idx === comparison.runMetrics.length - 1 ? "border-primary" : ""}>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    {idx === 0 && <Badge variant="secondary">Oldest</Badge>}
                    {idx === comparison.runMetrics.length - 1 && <Badge>Latest</Badge>}
                    <span className="text-xs">
                      {new Date(metrics.runDate).toLocaleDateString()}
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
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="text-green-600 font-medium">{metrics.passed}</p>
                        <p className="text-xs text-muted-foreground">Passed</p>
                      </div>
                      <div>
                        <p className="text-red-600 font-medium">{metrics.failed}</p>
                        <p className="text-xs text-muted-foreground">Failed</p>
                      </div>
                      <div>
                        <p className="font-medium">{metrics.total}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Avg Score</span>
                      <span className="font-medium">{metrics.avgScore.toFixed(1)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Improvements Summary */}
          {comparison.improvements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Progress Summary</CardTitle>
                <CardDescription>
                  Changes between consecutive test runs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comparison.improvements.map((imp, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <span className="text-muted-foreground">{imp.from}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{imp.to}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          {getTrendIcon(imp.passRateChange)}
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Pass Rate</p>
                            {formatChange(imp.passRateChange, "%")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(imp.avgScoreChange)}
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Avg Score</p>
                            {formatChange(imp.avgScoreChange)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(imp.passedChange)}
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Tests Passed</p>
                            {formatChange(imp.passedChange)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Visual Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Pass Rate Comparison</CardTitle>
              <CardDescription>Visual comparison of pass rates across runs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comparison.runMetrics.map((metrics, idx) => (
                  <div key={metrics.runId} className="flex items-center gap-4">
                    <div className="w-32 truncate text-sm font-medium" title={metrics.runName}>
                      {metrics.runName || `Run #${idx + 1}`}
                    </div>
                    <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          metrics.passRate >= 70 ? 'bg-green-500' : 
                          metrics.passRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${metrics.passRate}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                        {metrics.passRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-24 text-right text-sm text-muted-foreground">
                      {metrics.passed}/{metrics.total}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Cases Tab */}
        <TabsContent value="testcases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Case Results Comparison</CardTitle>
              <CardDescription>
                See how each test case performed across different runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/70 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Test Case
                        </th>
                        {comparison.runMetrics.map((metrics, idx) => (
                          <th 
                            key={metrics.runId}
                            className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[120px]"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span>{metrics.runName || `Run #${idx + 1}`}</span>
                              <span className="text-[10px] text-muted-foreground/70">
                                {new Date(metrics.runDate).toLocaleDateString()}
                              </span>
                            </div>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">
                          Trend
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Object.entries(comparison.testCaseComparison).map(([testCaseName, results]) => {
                        // Calculate trend (first vs last)
                        const firstResult = results.find(r => r !== null);
                        const lastResult = [...results].reverse().find(r => r !== null);
                        const firstPassed = firstResult?.passed;
                        const lastPassed = lastResult?.passed;
                        
                        let trendIcon = <Minus className="h-4 w-4 text-gray-400" />;
                        if (firstPassed === false && lastPassed === true) {
                          trendIcon = <ArrowUpRight className="h-4 w-4 text-green-500" />;
                        } else if (firstPassed === true && lastPassed === false) {
                          trendIcon = <ArrowDownRight className="h-4 w-4 text-red-500" />;
                        }

                        return (
                          <tr key={testCaseName} className="hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <span className="font-medium text-sm">{testCaseName}</span>
                            </td>
                            {results.map((result, idx) => (
                              <td key={idx} className="px-4 py-3 text-center">
                                {result === null ? (
                                  <span className="text-muted-foreground text-sm">—</span>
                                ) : (
                                  <div className="flex flex-col items-center gap-1">
                                    {result.passed ? (
                                      <CheckCircle className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <XCircle className="h-5 w-5 text-red-500" />
                                    )}
                                    {result.score > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        Score: {result.score.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-center">
                              {trendIcon}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {/* Overall Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Performance Trend</CardTitle>
              <CardDescription>
                How your agent has improved over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {comparison.runMetrics.length >= 2 ? (
                <div className="space-y-6">
                  {/* First vs Last comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-2">Pass Rate Change</p>
                      <div className="flex items-center justify-center gap-2">
                        {getTrendIcon(
                          comparison.runMetrics[comparison.runMetrics.length - 1].passRate - 
                          comparison.runMetrics[0].passRate
                        )}
                        <span className="text-3xl font-bold">
                          {formatChange(
                            comparison.runMetrics[comparison.runMetrics.length - 1].passRate - 
                            comparison.runMetrics[0].passRate,
                            "%"
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {comparison.runMetrics[0].passRate.toFixed(1)}% → {comparison.runMetrics[comparison.runMetrics.length - 1].passRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center p-6 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-2">Tests Passed Change</p>
                      <div className="flex items-center justify-center gap-2">
                        {getTrendIcon(
                          comparison.runMetrics[comparison.runMetrics.length - 1].passed - 
                          comparison.runMetrics[0].passed
                        )}
                        <span className="text-3xl font-bold">
                          {formatChange(
                            comparison.runMetrics[comparison.runMetrics.length - 1].passed - 
                            comparison.runMetrics[0].passed
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {comparison.runMetrics[0].passed} → {comparison.runMetrics[comparison.runMetrics.length - 1].passed} tests
                      </p>
                    </div>
                    <div className="text-center p-6 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-2">Avg Score Change</p>
                      <div className="flex items-center justify-center gap-2">
                        {getTrendIcon(
                          comparison.runMetrics[comparison.runMetrics.length - 1].avgScore - 
                          comparison.runMetrics[0].avgScore
                        )}
                        <span className="text-3xl font-bold">
                          {formatChange(
                            comparison.runMetrics[comparison.runMetrics.length - 1].avgScore - 
                            comparison.runMetrics[0].avgScore
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {comparison.runMetrics[0].avgScore.toFixed(1)} → {comparison.runMetrics[comparison.runMetrics.length - 1].avgScore.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
                    <div className="space-y-6">
                      {comparison.runMetrics.map((metrics, idx) => (
                        <div key={metrics.runId} className="relative pl-10">
                          <div className={`absolute left-2 w-5 h-5 rounded-full border-2 ${
                            idx === comparison.runMetrics.length - 1 
                              ? 'bg-primary border-primary' 
                              : 'bg-background border-muted-foreground'
                          }`} />
                          <Card>
                            <CardContent className="py-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{metrics.runName || `Run #${idx + 1}`}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(metrics.runDate).toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                  <div className="text-center">
                                    <p className="text-muted-foreground">Pass Rate</p>
                                    <p className={`font-bold ${
                                      metrics.passRate >= 70 ? 'text-green-600' : 
                                      metrics.passRate >= 40 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {metrics.passRate.toFixed(1)}%
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-muted-foreground">Passed</p>
                                    <p className="font-bold">{metrics.passed}/{metrics.total}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-muted-foreground">Avg Score</p>
                                    <p className="font-bold">{metrics.avgScore.toFixed(1)}</p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Need at least 2 test runs to show trends
                </p>
              )}
            </CardContent>
          </Card>

          {/* Test Cases That Improved/Regressed */}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
