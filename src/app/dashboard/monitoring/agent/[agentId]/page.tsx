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
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
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
  timestamp?: number | string;
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
  latency_metrics?: LatencyMetrics;
  webhook_payload?: Record<string, unknown>;
  provider_analysis?: Record<string, unknown>;
  interruption_count?: number;
  silence_ratio?: number;
  created_at: string;
}

interface TurnLatencyMetrics {
  turn: number;
  agentIndex: number;
  responseLatencyMs: number | null;
  sttLatencyMs: number | null;
  llmLatencyMs: number | null;
  ttsLatencyMs: number | null;
}

interface AggregatedLatency {
  avgResponseMs: number | null;
  p50ResponseMs: number | null;
  p90ResponseMs: number | null;
  maxResponseMs: number | null;
  measuredTurns: number;
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

  const toTimelineMs = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;

    if (typeof value === "number" && Number.isFinite(value)) {
      if (value < 1000000) {
        // Most providers send seconds-in-call for transcript turns.
        return Math.round(value * 1000);
      }
      // Already milliseconds or epoch milliseconds.
      return Math.round(value);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;

      const asNumber = Number(trimmed);
      if (!Number.isNaN(asNumber)) {
        return asNumber < 1000000 ? Math.round(asNumber * 1000) : Math.round(asNumber);
      }

      const parsedDate = Date.parse(trimmed);
      if (!Number.isNaN(parsedDate)) return parsedDate;
    }

    return null;
  };

  const extractNumericLatency = (entry: TranscriptEntry): {
    stt: number | null;
    llm: number | null;
    tts: number | null;
  } => {
    const unknownEntry = entry as unknown as Record<string, unknown>;
    const rawLatency = (unknownEntry.latency || unknownEntry.metrics || {}) as Record<string, unknown>;

    const pick = (...values: unknown[]): number | null => {
      for (const value of values) {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string") {
          const parsed = Number(value);
          if (!Number.isNaN(parsed)) return parsed;
        }
      }
      return null;
    };

    return {
      stt: pick(
        unknownEntry.stt_latency_ms,
        unknownEntry.sttLatencyMs,
        rawLatency.stt,
        (rawLatency.stt as Record<string, unknown> | undefined)?.p50,
      ),
      llm: pick(
        unknownEntry.llm_latency_ms,
        unknownEntry.llmLatencyMs,
        rawLatency.llm,
        (rawLatency.llm as Record<string, unknown> | undefined)?.p50,
      ),
      tts: pick(
        unknownEntry.tts_latency_ms,
        unknownEntry.ttsLatencyMs,
        rawLatency.tts,
        (rawLatency.tts as Record<string, unknown> | undefined)?.p50,
      ),
    };
  };

  const percentile = (values: number[], p: number): number | null => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return Math.round(sorted[index]);
  };

  const turnLatencyMetrics = useMemo<TurnLatencyMetrics[]>(() => {
    if (!selectedCall?.transcript || selectedCall.transcript.length === 0) return [];

    let turnCounter = 0;
    let lastUserTs: number | null = null;
    const turns: TurnLatencyMetrics[] = [];

    selectedCall.transcript.forEach((entry, index) => {
      const ts = toTimelineMs(entry.timestamp);

      if (entry.role === "user") {
        if (ts !== null) lastUserTs = ts;
        return;
      }

      if (entry.role !== "agent") return;

      turnCounter += 1;
      const responseLatencyMs =
        ts !== null && lastUserTs !== null ? Math.max(0, Math.round(ts - lastUserTs)) : null;

      const extracted = extractNumericLatency(entry);
      turns.push({
        turn: turnCounter,
        agentIndex: index,
        responseLatencyMs,
        sttLatencyMs: extracted.stt,
        llmLatencyMs: extracted.llm,
        ttsLatencyMs: extracted.tts,
      });
    });

    return turns;
  }, [selectedCall]);

  const aggregatedLatency = useMemo<AggregatedLatency>(() => {
    const values = turnLatencyMetrics
      .map((turn) => turn.responseLatencyMs)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    if (values.length === 0) {
      return {
        avgResponseMs: null,
        p50ResponseMs: null,
        p90ResponseMs: null,
        maxResponseMs: null,
        measuredTurns: 0,
      };
    }

    const avgResponseMs = Math.round(values.reduce((sum, current) => sum + current, 0) / values.length);
    const maxResponseMs = Math.round(Math.max(...values));

    return {
      avgResponseMs,
      p50ResponseMs: percentile(values, 50),
      p90ResponseMs: percentile(values, 90),
      maxResponseMs,
      measuredTurns: values.length,
    };
  }, [turnLatencyMetrics]);

  const hasComponentLatency = useMemo(
    () => turnLatencyMetrics.some((t) => t.sttLatencyMs !== null || t.llmLatencyMs !== null || t.ttsLatencyMs !== null),
    [turnLatencyMetrics],
  );

  const latencyChartData = useMemo(
    () =>
      turnLatencyMetrics.map((turn) => ({
        turn: `Turn ${turn.turn}`,
        response: turn.responseLatencyMs || 0,
        stt: turn.sttLatencyMs || 0,
        llm: turn.llmLatencyMs || 0,
        tts: turn.ttsLatencyMs || 0,
      })),
    [turnLatencyMetrics],
  );

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
                    onClick={() => router.push(`/dashboard/monitoring/${call.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">
                          {call.caller_phone || call.provider_call_id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDuration(call.duration_seconds)} â€¢ {formatDate(call.started_at)}
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

        {/* Call Monitoring Tab — full-width table; row click navigates to detail page */}
        <TabsContent value="calls">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>All Production Calls</CardTitle>
                <CardDescription>{calls.length} synced — click any row to open the full call analysis</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Started</th>
                      <th className="px-4 py-3 text-left">Caller</th>
                      <th className="px-4 py-3 text-left">Conversation</th>
                      <th className="px-4 py-3 text-right">Duration</th>
                      <th className="px-4 py-3 text-right">Avg latency</th>
                      <th className="px-4 py-3 text-left">Sentiment</th>
                      <th className="px-4 py-3 text-right">Score</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {calls.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-muted-foreground">
                          No calls found. Start syncing to fetch production calls.
                        </td>
                      </tr>
                    )}
                    {calls.map((call) => {
                      const lat: any = call.latency || (call as any).latency_metrics || {};
                      const avgLat = lat.avg_response_time ?? lat.ttfb ?? lat.e2e_p50;
                      const score = (call as any).overall_score;
                      return (
                        <tr
                          key={call.id}
                          className="hover:bg-muted/40 cursor-pointer"
                          onClick={() => router.push(`/dashboard/monitoring/${call.id}`)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium">{formatDate(call.started_at)}</div>
                            <div className="text-xs text-muted-foreground">{new Date(call.started_at).toLocaleDateString()}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {call.caller_phone || <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {call.provider_call_id?.slice(0, 18) || call.id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {formatDuration(call.duration_seconds || 0)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {avgLat ? (() => {
                              const ms = Math.round(avgLat);
                              const color = ms < 800 ? 'text-green-600' : ms < 1500 ? 'text-amber-600' : 'text-red-600';
                              return <span className={`font-mono ${color}`}>{ms}ms</span>;
                            })() : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {(call as any).sentiment ? (
                              <Badge variant="outline" className={`text-xs ${sentimentColors[(call as any).sentiment] || ''}`}>
                                {(call as any).sentiment}
                              </Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {score != null ? (
                              <span className={`font-semibold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                {Math.round(Number(score))}%
                              </span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {call.analysis_status === 'completed' ? (
                              call.issues_found > 0 ? (
                                <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {call.issues_found} issues
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Clean
                                </Badge>
                              )
                            ) : call.analysis_status === 'skipped_no_credits' ? (
                              <Badge variant="outline" className="text-xs">No credits</Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600 text-xs">
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Analyzing
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
