"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  PlayCircle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  Clock,
  XCircle,
  Loader2,
  BarChart3,
  Zap,
  Target,
  Activity
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

interface DashboardStats {
  totalAgents: number;
  totalTestCases: number;
  totalTestRuns: number;
  passRate: number;
  recentTestRuns: {
    id: string;
    name: string;
    status: string;
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
    created_at: string;
    completed_at: string | null;
    agent_name: string;
  }[];
  topAgents: {
    id: string;
    name: string;
    provider: string;
    test_run_count: number;
    total_passed: number;
    total_tests: number;
  }[];
}

export default function DashboardPage() {
  const { getToken, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        // Retry after a short delay if token not available yet
        setTimeout(() => fetchDashboardStats(), 500);
        return;
      }

      const response = await fetch(api.endpoints.users.dashboard, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded) {
      fetchDashboardStats();
    }
  }, [fetchDashboardStats, isLoaded]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "running":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "failed":
        return "bg-red-100 text-red-700 border-red-200";
      case "pending":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case "vapi":
        return "bg-purple-100 text-purple-700";
      case "retell":
        return "bg-blue-100 text-blue-700";
      case "elevenlabs":
        return "bg-emerald-100 text-emerald-700";
      case "bolna":
        return "bg-emerald-100 text-emerald-700";
      case "livekit":
        return "bg-blue-100 text-blue-700";
      case "haptik":
        return "bg-orange-100 text-orange-700";
      case "custom":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.firstName || "User"}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your voice agent testing dashboard.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-[#0A2E2F] dark:to-[#0F3D3E]">
          <div className="absolute top-0 right-0 w-20 h-20 bg-teal-200/50 dark:bg-teal-700/30 rounded-full -mr-10 -mt-10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Agents</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-[#0F3D3E] dark:bg-teal-200 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white dark:text-[#0F3D3E]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalAgents || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Connected voice agents
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-[#0A2E2F] dark:to-[#0F3D3E]">
          <div className="absolute top-0 right-0 w-20 h-20 bg-teal-200/50 dark:bg-teal-700/30 rounded-full -mr-10 -mt-10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Test Cases</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-[#1A5253] dark:bg-teal-300 flex items-center justify-center">
              <Target className="h-5 w-5 text-white dark:text-[#0F3D3E]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalTestCases || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total test scenarios
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-[#0A2E2F] dark:to-[#0F3D3E]">
          <div className="absolute top-0 right-0 w-20 h-20 bg-teal-200/50 dark:bg-teal-700/30 rounded-full -mr-10 -mt-10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Test Runs</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-[#10B981] dark:bg-emerald-400 flex items-center justify-center">
              <Activity className="h-5 w-5 text-white dark:text-[#0F3D3E]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalTestRuns || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed test runs
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-[#0A2E2F] dark:to-[#0F3D3E]">
          <div className="absolute top-0 right-0 w-20 h-20 bg-teal-200/50 dark:bg-teal-700/30 rounded-full -mr-10 -mt-10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pass Rate</CardTitle>
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
              (stats?.passRate || 0) >= 80 
                ? 'bg-green-600' 
                : (stats?.passRate || 0) >= 50 
                  ? 'bg-yellow-500' 
                  : 'bg-slate-400'
            }`}>
              {(stats?.passRate || 0) >= 80 ? (
                <TrendingUp className="h-5 w-5 text-white" />
              ) : (stats?.passRate || 0) >= 50 ? (
                <BarChart3 className="h-5 w-5 text-white" />
              ) : (
                <TrendingDown className="h-5 w-5 text-white" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.passRate !== undefined ? `${stats.passRate}%` : '--%'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Test Runs - Takes 2 columns */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Test Runs</CardTitle>
              <CardDescription>
                Your latest test execution results
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/test-runs" className="flex items-center gap-1">
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!stats?.recentTestRuns || stats.recentTestRuns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <PlayCircle className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-1">No test runs yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add an agent and create your first test run
                </p>
                <Button asChild size="sm">
                  <Link href="/dashboard/agents">
                    <Bot className="h-4 w-4 mr-2" />
                    Add Voice Agent
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentTestRuns.map((run) => {
                  const passRate = run.total_tests > 0 
                    ? Math.round((run.passed_tests / run.total_tests) * 100) 
                    : 0;
                  
                  return (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/dashboard/test-runs/${run.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          run.status === 'completed' && passRate >= 80 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : run.status === 'completed' 
                              ? 'bg-yellow-100 dark:bg-yellow-900/30'
                              : run.status === 'running'
                                ? 'bg-blue-100 dark:bg-blue-900/30'
                                : 'bg-slate-100 dark:bg-slate-700'
                        }`}>
                          {run.status === 'completed' ? (
                            passRate >= 80 ? (
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            )
                          ) : run.status === 'running' ? (
                            <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                          ) : (
                            <Clock className="h-5 w-5 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm group-hover:text-primary transition-colors">
                            {run.name || `Test Run #${run.id.slice(0, 8)}`}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{run.agent_name}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{formatDate(run.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {run.status === 'completed' && (
                          <div className="text-right">
                            <p className="text-sm font-semibold">{passRate}%</p>
                            <p className="text-xs text-muted-foreground">
                              {run.passed_tests}/{run.total_tests} passed
                            </p>
                          </div>
                        )}
                        <Badge className={getStatusColor(run.status)} variant="outline">
                          {run.status}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/agents">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-teal-200 dark:border-[#0F3D3E] hover:border-teal-300 dark:hover:border-[#1A5253] hover:bg-teal-50 dark:hover:bg-[#0A2E2F] cursor-pointer transition-all group">
                <div className="h-10 w-10 rounded-lg bg-[#0F3D3E] dark:bg-teal-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Bot className="h-5 w-5 text-white dark:text-[#0F3D3E]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Add Voice Agent</p>
                  <p className="text-xs text-muted-foreground">Connect ElevenLabs, Retell, VAPI, Bolna, or LiveKit</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

            <Link href="/dashboard/agents">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-teal-200 dark:border-[#0F3D3E] hover:border-teal-300 dark:hover:border-[#1A5253] hover:bg-teal-50 dark:hover:bg-[#0A2E2F] cursor-pointer transition-all group">
                <div className="h-10 w-10 rounded-lg bg-[#1A5253] dark:bg-teal-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Zap className="h-5 w-5 text-white dark:text-[#0F3D3E]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Generate Test Cases</p>
                  <p className="text-xs text-muted-foreground">Auto-create tests from agent config</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

            <Link href="/dashboard/test-runs/new">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-teal-200 dark:border-[#0F3D3E] hover:border-teal-300 dark:hover:border-[#1A5253] hover:bg-teal-50 dark:hover:bg-[#0A2E2F] cursor-pointer transition-all group">
                <div className="h-10 w-10 rounded-lg bg-[#10B981] dark:bg-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <PlayCircle className="h-5 w-5 text-white dark:text-[#0F3D3E]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Run Test Suite</p>
                  <p className="text-xs text-muted-foreground">Execute all test cases</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Top Agents Section */}
      {stats?.topAgents && stats.topAgents.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Your Agents</CardTitle>
              <CardDescription>
                Voice agents and their performance
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/agents" className="flex items-center gap-1">
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.topAgents.map((agent) => {
                const agentPassRate = agent.total_tests > 0 
                  ? Math.round((agent.total_passed / agent.total_tests) * 100) 
                  : null;
                
                return (
                  <div
                    key={agent.id}
                    className="p-4 rounded-xl border border-teal-200 dark:border-[#0F3D3E] hover:border-teal-300 dark:hover:border-[#1A5253] hover:shadow-sm transition-all cursor-pointer group"
                    onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-[#0A2E2F] flex items-center justify-center">
                          <Bot className="h-5 w-5 text-[#0F3D3E] dark:text-teal-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm group-hover:text-primary transition-colors">{agent.name}</p>
                          <Badge className={getProviderColor(agent.provider)} variant="secondary">
                            {agent.provider}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-muted-foreground">Test Runs</p>
                        <p className="font-semibold">{agent.test_run_count}</p>
                      </div>
                      {agentPassRate !== null && (
                        <div className="text-right">
                          <p className="text-muted-foreground">Pass Rate</p>
                          <p className={`font-semibold ${
                            agentPassRate >= 80 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : agentPassRate >= 50 
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-red-600 dark:text-red-400'
                          }`}>{agentPassRate}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
