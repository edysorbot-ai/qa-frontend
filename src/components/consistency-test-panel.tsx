'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  RefreshCw,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Layers,
  Percent,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ResponseCluster {
  clusterId: string;
  count: number;
  representativeResponse: string;
  avgSimilarity: number;
}

interface IterationResult {
  iteration: number;
  response: string;
  similarityToBaseline: number;
  isOutlier: boolean;
  latencyMs: number;
}

interface ConsistencyRun {
  id: string;
  testCaseId: string;
  testCaseName?: string;
  agentId: string;
  iterations: number;
  consistencyScore: number;
  semanticVariance: number;
  outlierCount: number;
  responseClusters: ResponseCluster[];
  status: string;
  createdAt: string;
  completedAt: string | null;
  iterationResults?: IterationResult[];
}

interface ConsistencySummary {
  avgConsistencyScore: number;
  totalRuns: number;
  completedRuns: number;
  testCasesWithLowConsistency: Array<{ testCaseId: string; testCaseName: string; score: number }>;
  trend: Array<{ date: string; avgScore: number }>;
}

interface TestCase {
  id: string;
  name: string;
  category: string;
}

interface ConsistencyTestPanelProps {
  agentId: string;
}

export function ConsistencyTestPanel({ agentId }: ConsistencyTestPanelProps) {
  const { getToken } = useAuth();
  const [runs, setRuns] = useState<ConsistencyRun[]>([]);
  const [summary, setSummary] = useState<ConsistencySummary | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState<string>('');
  const [iterations, setIterations] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [runsRes, summaryRes, testCasesRes] = await Promise.all([
        fetch(api.endpoints.consistencyTests.list(agentId), { headers }),
        fetch(api.endpoints.consistencyTests.summary(agentId), { headers }),
        fetch(`${api.endpoints.agents.testCases(agentId)}`, { headers }),
      ]);

      if (runsRes.ok) {
        const data = await runsRes.json();
        setRuns(data.runs || []);
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
      if (testCasesRes.ok) {
        const data = await testCasesRes.json();
        setTestCases(data.testCases || []);
        if (data.testCases?.length > 0 && !selectedTestCase) {
          setSelectedTestCase(data.testCases[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading consistency data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const runConsistencyTest = async () => {
    if (!selectedTestCase) return;

    try {
      setRunning(true);
      const token = await getToken();
      
      const res = await fetch(api.endpoints.consistencyTests.start(agentId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCaseId: selectedTestCase,
          iterations,
        }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error running consistency test:', error);
    } finally {
      setRunning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 90) return 'default';
    if (score >= 80) return 'secondary';
    return 'destructive';
  };

  const toggleRunExpansion = (runId: string) => {
    setExpandedRun(expandedRun === runId ? null : runId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Consistency</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(summary?.avgConsistencyScore || 0)}`}>
              {(summary?.avgConsistencyScore || 0).toFixed(1)}%
            </div>
            <Progress value={summary?.avgConsistencyScore || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalRuns || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.completedRuns || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Consistency</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary?.testCasesWithLowConsistency?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              test cases &lt; 85%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {summary?.trend && summary.trend.length > 1
                ? (summary.trend[summary.trend.length - 1].avgScore > summary.trend[0].avgScore ? '↑ Improving' : '↓ Declining')
                : 'Not enough data'}
            </div>
            <p className="text-xs text-muted-foreground">
              last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Consistency Warning */}
      {summary?.testCasesWithLowConsistency && summary.testCasesWithLowConsistency.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Test Cases Need Attention</AlertTitle>
          <AlertDescription>
            The following test cases have consistency scores below 85%:{' '}
            {summary.testCasesWithLowConsistency.map(tc => `${tc.testCaseName || tc.testCaseId} (${tc.score.toFixed(1)}%)`).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Run New Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Run Consistency Test
          </CardTitle>
          <CardDescription>
            Test how consistently your agent responds to the same input
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label>Test Case</Label>
              <Select value={selectedTestCase} onValueChange={setSelectedTestCase}>
                <SelectTrigger>
                  <SelectValue placeholder="Select test case" />
                </SelectTrigger>
                <SelectContent>
                  {testCases.map((tc) => (
                    <SelectItem key={tc.id} value={tc.id}>
                      {tc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32 space-y-2">
              <Label>Iterations</Label>
              <Select value={iterations.toString()} onValueChange={(v) => setIterations(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={runConsistencyTest}
              disabled={running || !selectedTestCase}
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Test History
          </CardTitle>
          <CardDescription>
            Previous consistency test runs and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No Consistency Tests Yet</h3>
              <p className="text-sm text-muted-foreground">
                Run a consistency test to measure how reliably your agent responds.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div key={run.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleRunExpansion(run.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {run.status === 'completed' ? (
                          run.consistencyScore >= 85 ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          )
                        ) : run.status === 'running' ? (
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <div className="font-medium">{run.testCaseName || 'Consistency Test'}</div>
                          <div className="text-sm text-muted-foreground">
                            {run.iterations} iterations • {new Date(run.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {run.status === 'completed' && (
                          <>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${getScoreColor(run.consistencyScore)}`}>
                                {run.consistencyScore.toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {run.outlierCount} outliers
                              </div>
                            </div>
                            <Badge variant={getScoreBadgeVariant(run.consistencyScore)}>
                              {run.consistencyScore >= 90 ? 'Excellent' : run.consistencyScore >= 80 ? 'Good' : 'Needs Work'}
                            </Badge>
                          </>
                        )}
                        {expandedRun === run.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedRun === run.id && run.status === 'completed' && (
                    <div className="px-4 pb-4 pt-0 border-t bg-muted/20">
                      <div className="grid gap-4 md:grid-cols-2 mt-4">
                        {/* Metrics */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Metrics</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="p-2 bg-background rounded">
                              <div className="text-muted-foreground">Consistency Score</div>
                              <div className={`font-bold ${getScoreColor(run.consistencyScore)}`}>
                                {run.consistencyScore.toFixed(2)}%
                              </div>
                            </div>
                            <div className="p-2 bg-background rounded">
                              <div className="text-muted-foreground">Semantic Variance</div>
                              <div className="font-bold">{run.semanticVariance.toFixed(4)}</div>
                            </div>
                            <div className="p-2 bg-background rounded">
                              <div className="text-muted-foreground">Outliers</div>
                              <div className="font-bold text-yellow-600">{run.outlierCount}</div>
                            </div>
                            <div className="p-2 bg-background rounded">
                              <div className="text-muted-foreground">Clusters</div>
                              <div className="font-bold">{run.responseClusters?.length || 0}</div>
                            </div>
                          </div>
                        </div>

                        {/* Response Clusters */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Response Clusters
                          </h4>
                          {run.responseClusters && run.responseClusters.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {run.responseClusters.map((cluster, idx) => (
                                <div key={idx} className="p-2 bg-background rounded text-sm">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium">{cluster.clusterId}</span>
                                    <Badge variant="outline">{cluster.count} responses</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {cluster.representativeResponse}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No cluster data available</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Compact badge for displaying consistency score
export function ConsistencyBadge({ score }: { score: number }) {
  const getVariant = (): 'default' | 'secondary' | 'destructive' => {
    if (score >= 90) return 'default';
    if (score >= 80) return 'secondary';
    return 'destructive';
  };

  return (
    <Badge variant={getVariant()} className="gap-1">
      <Activity className="h-3 w-3" />
      {score.toFixed(0)}%
    </Badge>
  );
}
