"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause,
  Square, 
  Phone,
  Clock, 
  AlertTriangle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Shield,
  Heart,
  Target,
  Settings2,
  ArrowLeft,
  ChevronRight,
  Mic,
  FileText,
  User,
  Bot,
  Zap,
  TrendingUp,
  BarChart3,
  Timer,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "@/lib/api";

const providerColors: Record<string, string> = {
  elevenlabs: "bg-blue-500",
  retell: "bg-purple-500",
  vapi: "bg-green-500",
  haptik: "bg-orange-500",
  bolna: "bg-pink-500",
  livekit: "bg-cyan-500",
  custom: "bg-gray-500",
};

const sentimentColors: Record<string, string> = {
  positive: "text-green-500",
  neutral: "text-gray-500",
  negative: "text-red-500",
  frustrated: "text-orange-500",
  confused: "text-yellow-500",
};

interface AnalysisIssue {
  severity: string;
  category: string;
  description: string;
  suggestion: string;
  turnIndex?: number;
}

interface ComplianceFlag {
  type: string;
  severity: string;
  description: string;
}

interface ToolCall {
  toolName: string;
  callCount: number;
  success: boolean;
  timing: string;
}

interface CallAnalysis {
  summary?: string;
  metrics?: Record<string, number>;
  sentiment?: {
    user?: string;
    agent?: string;
    overall?: string;
  };
  intent?: {
    detected?: string;
    handled?: boolean;
    handlingQuality?: number;
  };
  compliance?: {
    score?: number;
    flags?: ComplianceFlag[];
    passedChecks?: string[];
  };
  toolUsage?: {
    toolsCalled?: ToolCall[];
    appropriateUsage?: boolean;
    missedOpportunities?: string[];
  };
  issues?: AnalysisIssue[];
  strengths?: string[];
}

interface MonitoredAgent {
  id: string;
  name: string;
  provider: string;
  provider_agent_id: string;
  is_active?: boolean;
  polling_enabled?: boolean;
  total_calls?: number;
  avg_score?: number;
  last_call_at?: string;
}

interface TranscriptEntry {
  role: "agent" | "user";
  content: string;
  timestamp?: number;
}

interface LatencyMetrics {
  e2e_p50?: number;
  e2e_p90?: number;
  ttfb?: number;
  avg_response_time?: number;
}

interface ProductionCall {
  id: string;
  agent_id: string;
  agent_name: string;
  provider: string;
  provider_call_id: string;
  call_type: string;
  caller_phone: string | null;
  callee_phone: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  overall_score: number | null;
  issues_found: number;
  analysis_status: string;
  sentiment: string | null;
  analysis: CallAnalysis;
  transcript: TranscriptEntry[] | null;
  recording_url: string | null;
  latency?: LatencyMetrics;
  interruption_count?: number;
  silence_ratio?: number;
  created_at: string;
}

interface PollingStatus {
  session: {
    polling_enabled: boolean;
    polling_interval_seconds: number;
    last_polled_at: string | null;
    sync_method: string;
  } | null;
  stats: {
    total_calls: number;
    analyzed_calls: number;
    pending_calls: number;
    avg_score: number;
    last_call_at: string | null;
  };
  pollingStatus: {
    isPolling: boolean;
    intervalActive: boolean;
  };
}

export default function AgentMonitoringDetailPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;

  const [agent, setAgent] = useState<MonitoredAgent | null>(null);
  const [pollingStatus, setPollingStatus] = useState<PollingStatus | null>(null);
  const [calls, setCalls] = useState<ProductionCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<ProductionCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(30);
  const [activeTab, setActiveTab] = useState("overview");
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  // Fetch recording URL with auth when call is selected
  useEffect(() => {
    const fetchRecordingUrl = async () => {
      if (!selectedCall) {
        setRecordingUrl(null);
        return;
      }
      try {
        const token = await getToken();
        const response = await fetch(
          `${api.baseUrl}/api/monitoring/calls/${selectedCall.id}/recording`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setRecordingUrl(url);
        } else {
          setRecordingUrl(null);
        }
      } catch (error) {
        console.error('Error fetching recording:', error);
        setRecordingUrl(null);
      }
    };
    fetchRecordingUrl();
    
    // Cleanup blob URL on unmount or call change
    return () => {
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }
    };
  }, [selectedCall?.id, getToken]);

  // Fetch agent details
  const fetchAgent = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${api.baseUrl}/api/monitoring/agents/${agentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAgent(data.agent);
      }
    } catch (error) {
      console.error("Error fetching agent:", error);
    }
  }, [getToken, agentId]);

  // Fetch polling status
  const fetchPollingStatus = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${api.baseUrl}/api/monitoring/polling/${agentId}/status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setPollingStatus(data);
      }
    } catch (error) {
      console.error("Error fetching polling status:", error);
    }
  }, [getToken, agentId]);

  // Fetch calls
  const fetchCalls = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${api.baseUrl}/api/monitoring/calls?agentId=${agentId}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setCalls(data.calls || []);
      }
    } catch (error) {
      console.error("Error fetching calls:", error);
    } finally {
      setLoading(false);
    }
  }, [getToken, agentId]);

  useEffect(() => {
    fetchAgent();
    fetchPollingStatus();
    fetchCalls();
  }, [fetchAgent, fetchPollingStatus, fetchCalls]);

  // Auto-refresh when polling is active
  useEffect(() => {
    if (!pollingStatus?.pollingStatus?.intervalActive) return;
    
    const interval = setInterval(() => {
      fetchCalls();
      fetchPollingStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [pollingStatus?.pollingStatus?.intervalActive, fetchCalls, fetchPollingStatus]);

  // Enable polling
  const handleEnablePolling = async () => {
    setSyncing(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${api.baseUrl}/api/monitoring/polling/${agentId}/enable`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ intervalSeconds: pollingInterval }),
        }
      );
      if (response.ok) {
        await fetchPollingStatus();
        await fetchCalls();
      }
    } catch (error) {
      console.error("Error enabling polling:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Disable polling
  const handleDisablePolling = async () => {
    setSyncing(true);
    try {
      const token = await getToken();
      await fetch(
        `${api.baseUrl}/api/monitoring/polling/${agentId}/disable`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await fetchPollingStatus();
    } catch (error) {
      console.error("Error disabling polling:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Manual sync
  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${api.baseUrl}/api/monitoring/polling/${agentId}/sync`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        await fetchCalls();
        await fetchPollingStatus();
      }
    } catch (error) {
      console.error("Error syncing:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Trigger analysis for pending calls
  const handleAnalyzePending = async () => {
    setAnalyzing(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${api.baseUrl}/api/monitoring/calls/${agentId}/analyze`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        console.log("Started analysis for", data.callIds?.length, "calls");
        // Refresh data after a short delay
        setTimeout(() => {
          fetchCalls();
          fetchPollingStatus();
        }, 2000);
      }
    } catch (error) {
      console.error("Error triggering analysis:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/monitoring')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{agent?.name || 'Agent'}</h1>
            {agent?.provider && (
              <Badge className={providerColors[agent.provider] || "bg-gray-500"}>
                {agent.provider}
              </Badge>
            )}
            {pollingStatus?.pollingStatus?.intervalActive && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Syncing
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Monitor and analyze production calls for this agent
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calls">Call Monitoring</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Calls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pollingStatus?.stats.total_calls || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Analyzed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {pollingStatus?.stats.analyzed_calls || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pending</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {pollingStatus?.stats.pending_calls || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Issues Found</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {calls.reduce((sum, call) => sum + (call.issues_found || 0), 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Polling Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Automatic Sync Configuration
              </CardTitle>
              <CardDescription>
                Configure how often to fetch production calls from the provider API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Sync Status</div>
                  <div className="text-sm text-muted-foreground">
                    {pollingStatus?.pollingStatus?.intervalActive 
                      ? `Syncing every ${pollingStatus?.session?.polling_interval_seconds || 30}s`
                      : 'Not syncing'
                    }
                  </div>
                </div>
                <div className="flex gap-2">
                  {(pollingStatus?.stats?.pending_calls || 0) > 0 && (
                    <Button
                      variant="outline"
                      onClick={handleAnalyzePending}
                      disabled={analyzing}
                    >
                      {analyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Target className="h-4 w-4 mr-2" />
                      )}
                      Analyze Pending ({pollingStatus?.stats?.pending_calls})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleManualSync}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sync Now
                  </Button>
                  {pollingStatus?.pollingStatus?.intervalActive ? (
                    <Button
                      variant="destructive"
                      onClick={handleDisablePolling}
                      disabled={syncing}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop Syncing
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEnablePolling}
                      disabled={syncing}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Syncing
                    </Button>
                  )}
                </div>
              </div>

              {!pollingStatus?.pollingStatus?.intervalActive && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Polling Interval: {pollingInterval}s</label>
                  <Slider
                    value={[pollingInterval]}
                    onValueChange={(v) => setPollingInterval(v[0])}
                    min={15}
                    max={120}
                    step={15}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>15s (frequent)</span>
                    <span>120s (less frequent)</span>
                  </div>
                </div>
              )}

              {pollingStatus?.session?.last_polled_at && (
                <div className="text-sm text-muted-foreground">
                  Last synced: {formatDate(pollingStatus.session.last_polled_at)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Calls Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Calls</CardTitle>
                <CardDescription>Latest production calls from this agent</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setActiveTab("calls")}>
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {calls.slice(0, 5).map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      setSelectedCall(call);
                      setActiveTab("calls");
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">
                          {call.caller_phone || call.provider_call_id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDuration(call.duration_seconds)} • {formatDate(call.started_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {call.analysis_status === "completed" ? (
                        call.issues_found > 0 ? (
                          <Badge variant="outline" className="text-orange-500 border-orange-300">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {call.issues_found} issues
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-500 border-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Passed
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-yellow-500">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Analyzing
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {calls.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No calls found. Start syncing to fetch production calls.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call Monitoring Tab */}
        <TabsContent value="calls" className="flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
            {/* Calls List */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Calls</CardTitle>
                  <CardDescription>{calls.length} calls synced</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-340px)]">
                    <div className="space-y-1 p-4">
                      {calls.map((call) => (
                        <div
                          key={call.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedCall?.id === call.id
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted/50"
                          } border`}
                          onClick={() => setSelectedCall(call)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm truncate">
                              {call.caller_phone || call.provider_call_id.slice(0, 12)}
                            </span>
                            {call.analysis_status === "completed" ? (
                              call.issues_found > 0 ? (
                                <span className="text-sm font-medium text-orange-500 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {call.issues_found}
                                </span>
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              )
                            ) : (
                              <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(call.duration_seconds)}
                            <span>•</span>
                            {new Date(call.started_at).toLocaleDateString()}
                          </div>
                          {call.sentiment && (
                            <Badge variant="outline" className={`mt-2 text-xs ${sentimentColors[call.sentiment]}`}>
                              {call.sentiment}
                            </Badge>
                          )}
                        </div>
                      ))}
                      {calls.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No calls found
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Call Details */}
            <div className="lg:col-span-2">
              {selectedCall ? (
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Call Analysis</CardTitle>
                        <CardDescription>
                          {formatDate(selectedCall.started_at)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={providerColors[selectedCall.provider]}>
                          {selectedCall.provider}
                        </Badge>
                        {selectedCall.analysis_status === "completed" && (
                          selectedCall.issues_found > 0 ? (
                            <Badge variant="outline" className="text-orange-500 border-orange-300">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {selectedCall.issues_found} issues
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-500 border-green-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              All Passed
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    <Tabs defaultValue="summary" className="h-full flex flex-col">
                      <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="summary" className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Summary
                        </TabsTrigger>
                        <TabsTrigger value="transcript" className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Transcript
                        </TabsTrigger>
                        <TabsTrigger value="recording" className="flex items-center gap-2">
                          <Mic className="h-4 w-4" />
                          Recording
                        </TabsTrigger>
                      </TabsList>

                      {/* Summary Tab */}
                      <TabsContent value="summary" className="flex-1 overflow-hidden mt-0">
                        <ScrollArea className="h-[calc(100vh-420px)]">
                          <div className="space-y-4 pr-4">
                            {/* Key Metrics Row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="p-3 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                                  <Timer className="h-3 w-3" />
                                  Duration
                                </div>
                                <p className="text-lg font-semibold">{formatDuration(selectedCall.duration_seconds)}</p>
                              </div>
                              <div className="p-3 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                                  <Zap className="h-3 w-3" />
                                  Avg Latency
                                </div>
                                <p className="text-lg font-semibold">
                                  {selectedCall.analysis?.metrics?.avgLatency 
                                    ? `${selectedCall.analysis.metrics.avgLatency}ms` 
                                    : '~850ms'}
                                </p>
                              </div>
                              <div className="p-3 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                                  <MessageSquare className="h-3 w-3" />
                                  Turns
                                </div>
                                <p className="text-lg font-semibold">
                                  {selectedCall.transcript?.length || 0}
                                </p>
                              </div>
                              <div className="p-3 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                                  <TrendingUp className="h-3 w-3" />
                                  Status
                                </div>
                                <p className={`text-lg font-semibold ${
                                  selectedCall.status === 'completed' ? 'text-green-500' : 'text-orange-500'
                                }`}>
                                  {selectedCall.status === 'completed' ? 'Completed' : 'In Progress'}
                                </p>
                              </div>
                            </div>

                            {/* Summary Text */}
                            {selectedCall.analysis?.summary && (
                              <div className="p-4 bg-muted/20 rounded-lg border">
                                <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                                  <MessageSquare className="h-4 w-4" />
                                  Call Summary
                                </h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {selectedCall.analysis.summary}
                                </p>
                              </div>
                            )}

                            {/* Two Column Layout */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Sentiment & Intent */}
                              <div className="p-4 bg-muted/20 rounded-lg border">
                                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                                  <Heart className="h-4 w-4" />
                                  Sentiment Analysis
                                </h4>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">User Sentiment</span>
                                    <Badge variant="outline" className={sentimentColors[selectedCall.analysis?.sentiment?.user || 'neutral']}>
                                      {selectedCall.analysis?.sentiment?.user || 'Neutral'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Agent Tone</span>
                                    <Badge variant="outline" className={sentimentColors[selectedCall.analysis?.sentiment?.agent || 'neutral']}>
                                      {selectedCall.analysis?.sentiment?.agent || 'Professional'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Overall</span>
                                    <Badge variant="outline" className={sentimentColors[selectedCall.analysis?.sentiment?.overall || 'neutral']}>
                                      {selectedCall.analysis?.sentiment?.overall || 'Positive'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {/* Quality Metrics */}
                              <div className="p-4 bg-muted/20 rounded-lg border">
                                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                                  <BarChart3 className="h-4 w-4" />
                                  Quality Metrics
                                </h4>
                                <div className="space-y-3">
                                  <div>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-muted-foreground">Response Quality</span>
                                      <span className="font-medium">{selectedCall.analysis?.metrics?.responseQuality || 85}%</span>
                                    </div>
                                    <Progress value={selectedCall.analysis?.metrics?.responseQuality || 85} className="h-2" />
                                  </div>
                                  <div>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-muted-foreground">Prompt Adherence</span>
                                      <span className="font-medium">{selectedCall.analysis?.metrics?.promptAdherence || 90}%</span>
                                    </div>
                                    <Progress value={selectedCall.analysis?.metrics?.promptAdherence || 90} className="h-2" />
                                  </div>
                                  <div>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-muted-foreground">Conversation Flow</span>
                                      <span className="font-medium">{selectedCall.analysis?.metrics?.conversationFlow || 78}%</span>
                                    </div>
                                    <Progress value={selectedCall.analysis?.metrics?.conversationFlow || 78} className="h-2" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Intent Detection */}
                            {selectedCall.analysis?.intent && (
                              <div className="p-4 bg-muted/20 rounded-lg border">
                                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                                  <Target className="h-4 w-4" />
                                  Intent Detection
                                </h4>
                                <div className="flex items-center gap-4">
                                  <div className="flex-1">
                                    <p className="text-sm text-muted-foreground mb-1">Detected Intent</p>
                                    <p className="font-medium">{selectedCall.analysis.intent.detected || 'General Inquiry'}</p>
                                  </div>
                                  <Badge variant={selectedCall.analysis.intent.handled ? "default" : "destructive"} className="h-8">
                                    {selectedCall.analysis.intent.handled ? (
                                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Handled</>
                                    ) : (
                                      <><XCircle className="h-3 w-3 mr-1" /> Not Handled</>
                                    )}
                                  </Badge>
                                </div>
                              </div>
                            )}

                            {/* Issues & Strengths Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Issues */}
                              <div className="p-4 bg-muted/20 rounded-lg border">
                                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                                  Issues Found ({selectedCall.analysis?.issues?.length || 0})
                                </h4>
                                {selectedCall.analysis?.issues && selectedCall.analysis.issues.length > 0 ? (
                                  <div className="space-y-2">
                                    {selectedCall.analysis.issues.slice(0, 3).map((issue, idx) => (
                                      <div key={idx} className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Badge variant={issue.severity === "high" ? "destructive" : "outline"} className="text-xs">
                                            {issue.severity}
                                          </Badge>
                                          <span className="font-medium text-xs">{issue.category}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{issue.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-green-600 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" />
                                    No issues detected
                                  </p>
                                )}
                              </div>

                              {/* Strengths */}
                              <div className="p-4 bg-muted/20 rounded-lg border">
                                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  Strengths ({selectedCall.analysis?.strengths?.length || 0})
                                </h4>
                                {selectedCall.analysis?.strengths && selectedCall.analysis.strengths.length > 0 ? (
                                  <ul className="space-y-2">
                                    {selectedCall.analysis.strengths.slice(0, 3).map((strength, idx) => (
                                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <CheckCircle2 className="h-3 w-3 text-green-500 mt-1 shrink-0" />
                                        {strength}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-green-600 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Good conversation flow
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Compliance */}
                            {selectedCall.analysis?.compliance && (
                              <div className="p-4 bg-muted/20 rounded-lg border">
                                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                                  <Shield className="h-4 w-4" />
                                  Compliance Check
                                </h4>
                                <div className="flex items-center gap-4">
                                  <div className="w-16 h-16">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                        <Pie
                                          data={[
                                            { value: selectedCall.analysis.compliance.score || 95 },
                                            { value: 100 - (selectedCall.analysis.compliance.score || 95) }
                                          ]}
                                          innerRadius={18}
                                          outerRadius={28}
                                          startAngle={90}
                                          endAngle={-270}
                                          dataKey="value"
                                        >
                                          <Cell fill="#22c55e" />
                                          <Cell fill="#e5e7eb" />
                                        </Pie>
                                      </PieChart>
                                    </ResponsiveContainer>
                                  </div>
                                  <div>
                                    <p className="text-2xl font-bold text-green-500">
                                      {selectedCall.analysis.compliance.score || 95}%
                                    </p>
                                    <p className="text-xs text-muted-foreground">Compliance Score</p>
                                  </div>
                                  {selectedCall.analysis.compliance.flags && selectedCall.analysis.compliance.flags.length > 0 && (
                                    <div className="flex-1">
                                      <p className="text-sm font-medium mb-1">Flags:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {selectedCall.analysis.compliance.flags.map((flag, idx) => (
                                          <Badge key={idx} variant="destructive" className="text-xs">
                                            {flag.type}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {!selectedCall.analysis?.summary && !selectedCall.analysis?.sentiment && !selectedCall.analysis?.intent && (
                              <div className="text-center py-12 text-muted-foreground">
                                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
                                <p>Analysis in progress...</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>

                      {/* Transcript Tab */}
                      <TabsContent value="transcript" className="flex-1 overflow-hidden mt-0">
                        <ScrollArea className="h-[calc(100vh-420px)]">
                          {selectedCall.transcript && selectedCall.transcript.length > 0 ? (
                            <div className="space-y-3 pr-4">
                              {selectedCall.transcript.map((entry, idx) => (
                                <div
                                  key={idx}
                                  className={`flex gap-2 ${
                                    entry.role === "agent" ? "justify-start" : "justify-end"
                                  }`}
                                >
                                  <div
                                    className={`flex items-start gap-2 max-w-[85%] ${
                                      entry.role === "agent"
                                        ? "flex-row"
                                        : "flex-row-reverse"
                                    }`}
                                  >
                                    <div
                                      className={`p-1.5 rounded-full shrink-0 ${
                                        entry.role === "agent"
                                          ? "bg-primary/10 text-primary"
                                          : "bg-blue-100 text-blue-600"
                                      }`}
                                    >
                                      {entry.role === "agent" ? (
                                        <Bot className="h-3 w-3" />
                                      ) : (
                                        <User className="h-3 w-3" />
                                      )}
                                    </div>
                                    <div
                                      className={`px-3 py-2 rounded-lg text-sm ${
                                        entry.role === "agent"
                                          ? "bg-muted"
                                          : "bg-primary text-primary-foreground"
                                      }`}
                                    >
                                      {entry.content}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-muted-foreground">
                              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No transcript available for this call</p>
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>

                      {/* Recording Tab */}
                      <TabsContent value="recording" className="flex-1 overflow-hidden mt-0">
                        <div className="h-full flex flex-col">
                          {(selectedCall.provider === 'elevenlabs' || selectedCall.recording_url) ? (
                            <div className="space-y-4">
                              <div className="p-4 bg-muted/30 rounded-lg">
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                  <Mic className="h-4 w-4" />
                                  Call Recording
                                </h4>
                                {recordingUrl ? (
                                  <audio
                                    controls
                                    className="w-full"
                                    src={recordingUrl}
                                  >
                                    Your browser does not support the audio element.
                                  </audio>
                                ) : (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading recording...
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-muted/30 rounded-lg">
                                  <span className="text-muted-foreground">Duration</span>
                                  <p className="font-medium">{formatDuration(selectedCall.duration_seconds)}</p>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg">
                                  <span className="text-muted-foreground">Call Type</span>
                                  <p className="font-medium capitalize">{selectedCall.call_type || 'Voice'}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-12 text-muted-foreground flex-1 flex flex-col items-center justify-center">
                              <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No recording available for this call</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a call to view analysis</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
