"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Phone,
  Clock,
  Target,
  Zap,
  Activity,
  AlertTriangle,
  Smile,
  Frown,
  Meh,
  Play,
  Pause,
  TrendingUp,
  Users,
  ShieldCheck,
  MessageSquare,
  ChevronRight,
  Hash,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
  PolarAngleAxis,
} from "recharts";

interface ProductionCall {
  id: string;
  agent_id: string;
  provider: string;
  provider_call_id: string | null;
  status: string;
  call_type: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  overall_score: number | null;
  issues_found: number | null;
  analysis_status: string | null;
  sentiment: string | null;
  recording_url: string | null;
  interruption_count?: number | null;
  silence_ratio?: number | null;
  latency?: { avg_response_time?: number; e2e_p50?: number; e2e_p90?: number } | null;
  analysis?: {
    summary?: string;
    metrics?: Record<string, number>;
    sentiment?: { user?: string; agent?: string; overall?: string };
    intent?: { detected?: string; handled?: boolean };
    issues?: { severity?: string; category?: string; description?: string }[];
    compliance?: { score?: number; flags?: any[] };
    toolUsage?: { toolsCalled?: any[] };
    conversationDynamics?: { interruptionCount?: number };
  } | null;
  transcript?: any[] | null;
  created_at: string;
}

interface MonitoredAgent {
  id: string;
  name: string;
  provider: string;
  provider_agent_id: string;
  polling_enabled?: boolean;
  total_calls?: number;
  avg_score?: number;
}

const formatDuration = (s: number | null | undefined) => {
  if (!s || s <= 0) return "—";
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};

const fmtNum = (n: number | null | undefined, d = 0) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : Number(n).toFixed(d);

// Hamming-style threshold severity
const sevColor = (status: "good" | "warning" | "critical" | "neutral") =>
  ({
    good: "#10b981",
    warning: "#f59e0b",
    critical: "#ef4444",
    neutral: "#71717a",
  }[status]);

const sevBg = (status: "good" | "warning" | "critical" | "neutral") =>
  ({
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    critical: "bg-rose-50 text-rose-700 border-rose-200",
    neutral: "bg-zinc-50 text-zinc-600 border-zinc-200",
  }[status]);

// Hamming thresholds
const latencySeverity = (ms: number | null) =>
  ms === null ? "neutral" : ms < 800 ? "good" : ms < 1500 ? "warning" : "critical";
const scoreSeverity = (s: number | null) =>
  s === null ? "neutral" : s >= 80 ? "good" : s >= 60 ? "warning" : "critical";
const containmentSeverity = (p: number | null) =>
  p === null ? "neutral" : p >= 70 ? "good" : p >= 60 ? "warning" : "critical";
const hallucinationSeverity = (p: number | null) =>
  p === null ? "neutral" : p < 1 ? "good" : p < 3 ? "warning" : "critical";

const providerLabel: Record<string, string> = {
  elevenlabs: "ElevenLabs",
  retell: "Retell",
  vapi: "Vapi",
  haptik: "Haptik",
  bolna: "Bolna",
  livekit: "LiveKit",
  custom: "Custom",
};

export default function AgentMonitoringPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const router = useRouter();
  const { getToken } = useAuth();

  const [agent, setAgent] = useState<MonitoredAgent | null>(null);
  const [calls, setCalls] = useState<ProductionCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [windowDays, setWindowDays] = useState(30);

  const fetchAgent = useCallback(async () => {
    const token = await getToken();
    const r = await fetch(`${api.baseUrl}/api/monitoring/agents/${agentId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) {
      const d = await r.json();
      setAgent(d.agent);
    }
  }, [agentId, getToken]);

  const fetchCalls = useCallback(async () => {
    const token = await getToken();
    const r = await fetch(`${api.baseUrl}/api/monitoring/calls?agentId=${agentId}&limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      const d = await r.json();
      setCalls(d.calls || []);
    }
    setLoading(false);
  }, [agentId, getToken]);

  const fetchPolling = useCallback(async () => {
    const token = await getToken();
    const r = await fetch(`${api.baseUrl}/api/monitoring/polling/${agentId}/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      const d = await r.json();
      setPolling(d);
    }
  }, [agentId, getToken]);

  useEffect(() => {
    fetchAgent();
    fetchCalls();
    fetchPolling();
  }, [fetchAgent, fetchCalls, fetchPolling]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const token = await getToken();
      await fetch(`${api.baseUrl}/api/monitoring/polling/${agentId}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchCalls();
      await fetchPolling();
    } finally {
      setSyncing(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const token = await getToken();
      await fetch(`${api.baseUrl}/api/monitoring/calls/${agentId}/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setTimeout(() => fetchCalls(), 2500);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTogglePolling = async () => {
    setSyncing(true);
    try {
      const token = await getToken();
      const enabled = polling?.session?.polling_enabled;
      const url = enabled
        ? `${api.baseUrl}/api/monitoring/polling/${agentId}/disable`
        : `${api.baseUrl}/api/monitoring/polling/${agentId}/enable`;
      await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: enabled ? undefined : JSON.stringify({ intervalSeconds: 30 }),
      });
      await fetchPolling();
    } finally {
      setSyncing(false);
    }
  };

  // ----- Derived Analytics -----
  const windowedCalls = useMemo(() => {
    if (!calls.length) return [];
    const cutoff = Date.now() - windowDays * 24 * 3600 * 1000;
    return calls.filter((c) => {
      const t = new Date(c.created_at || c.started_at || 0).getTime();
      return t >= cutoff;
    });
  }, [calls, windowDays]);

  const analytics = useMemo(() => {
    const list = windowedCalls;
    const total = list.length;
    const durations = list.map((c) => c.duration_seconds || 0).filter((d) => d > 0);
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    const avgDuration = durations.length ? totalDuration / durations.length : null;

    const scores = list.map((c) => c.overall_score).filter((s): s is number => typeof s === "number");
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    // Per-call avg response latency: from analysis.latency, latency_metrics, or derive from transcript
    const callLatencies: number[] = [];
    for (const c of list) {
      const l =
        c.latency?.avg_response_time ||
        (c as any).latency_metrics?.avg_response_time ||
        null;
      if (typeof l === "number" && l > 0 && l < 30000) callLatencies.push(l);
    }
    const avgLatency = callLatencies.length
      ? callLatencies.reduce((a, b) => a + b, 0) / callLatencies.length
      : null;

    // Containment: completed calls with no escalation flag (proxy: status=completed AND no critical issues)
    const handled = list.filter((c) => c.status === "completed" || c.status === "ended" || c.ended_at);
    const escalated = handled.filter((c) => {
      const issues = c.analysis?.issues || [];
      return issues.some((i) => (i.category || "").toLowerCase().includes("escalat"));
    });
    const containmentRate = handled.length ? ((handled.length - escalated.length) / handled.length) * 100 : null;

    // Hallucination rate: count calls with at least one issue tagged hallucination
    const halluc = list.filter((c) => {
      const issues = c.analysis?.issues || [];
      return issues.some((i) => (i.category || "").toLowerCase().includes("halluc") || (i.description || "").toLowerCase().includes("halluc"));
    }).length;
    const hallucinationRate = list.length ? (halluc / list.length) * 100 : null;

    // Sentiment distribution
    const sentBuckets: Record<string, number> = { positive: 0, neutral: 0, negative: 0, frustrated: 0, confused: 0, unknown: 0 };
    for (const c of list) {
      const s = (c.sentiment || c.analysis?.sentiment?.overall || "unknown").toLowerCase();
      if (s in sentBuckets) sentBuckets[s] += 1;
      else sentBuckets.unknown += 1;
    }

    // Status / outcome
    const statusBuckets: Record<string, number> = {};
    for (const c of list) {
      const s = c.status || "unknown";
      statusBuckets[s] = (statusBuckets[s] || 0) + 1;
    }

    // Score distribution buckets
    const scoreBuckets = [
      { range: "0-20", count: 0, color: "#ef4444" },
      { range: "20-40", count: 0, color: "#f97316" },
      { range: "40-60", count: 0, color: "#f59e0b" },
      { range: "60-80", count: 0, color: "#84cc16" },
      { range: "80-100", count: 0, color: "#10b981" },
    ];
    for (const s of scores) {
      const idx = Math.min(4, Math.floor(s / 20));
      scoreBuckets[idx].count += 1;
    }

    // Latency distribution
    const latBuckets = [
      { range: "<500ms", count: 0, color: "#10b981" },
      { range: "500-800", count: 0, color: "#84cc16" },
      { range: "800-1500", count: 0, color: "#f59e0b" },
      { range: "1500-3000", count: 0, color: "#f97316" },
      { range: ">3000", count: 0, color: "#ef4444" },
    ];
    for (const l of callLatencies) {
      if (l < 500) latBuckets[0].count += 1;
      else if (l < 800) latBuckets[1].count += 1;
      else if (l < 1500) latBuckets[2].count += 1;
      else if (l < 3000) latBuckets[3].count += 1;
      else latBuckets[4].count += 1;
    }

    // Calls per day (last `windowDays`)
    const dayMap = new Map<string, { date: string; calls: number; avgScore: number; scoreSum: number; scoreN: number }>();
    const today = new Date();
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { date: key, calls: 0, avgScore: 0, scoreSum: 0, scoreN: 0 });
    }
    for (const c of list) {
      const t = new Date(c.created_at || c.started_at || 0);
      const key = t.toISOString().slice(0, 10);
      const row = dayMap.get(key);
      if (!row) continue;
      row.calls += 1;
      if (typeof c.overall_score === "number") {
        row.scoreSum += c.overall_score;
        row.scoreN += 1;
      }
    }
    const daySeries = Array.from(dayMap.values()).map((d) => ({
      ...d,
      avgScore: d.scoreN ? Math.round(d.scoreSum / d.scoreN) : null,
      label: d.date.slice(5),
    }));

    // Hour-of-day x day-of-week heatmap (7x24)
    const heat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const c of list) {
      const t = new Date(c.created_at || c.started_at || 0);
      if (Number.isNaN(t.getTime())) continue;
      heat[t.getDay()][t.getHours()] += 1;
    }

    // Top issues frequency
    const issueMap = new Map<string, { label: string; count: number; severity: string }>();
    for (const c of list) {
      for (const issue of c.analysis?.issues || []) {
        const k = (issue.category || issue.description || "Other").slice(0, 60);
        const prev = issueMap.get(k);
        if (prev) prev.count += 1;
        else issueMap.set(k, { label: k, count: 1, severity: issue.severity || "minor" });
      }
    }
    const topIssues = Array.from(issueMap.values()).sort((a, b) => b.count - a.count).slice(0, 8);

    // Interruption / barge-in
    const interruptions = list.map((c) => c.interruption_count || c.analysis?.conversationDynamics?.interruptionCount || 0);
    const avgInterruptions = interruptions.length ? interruptions.reduce((a, b) => a + b, 0) / interruptions.length : null;

    // Duration distribution buckets (sec)
    const durBuckets = [
      { range: "<30s", count: 0 },
      { range: "30s-1m", count: 0 },
      { range: "1-3m", count: 0 },
      { range: "3-5m", count: 0 },
      { range: ">5m", count: 0 },
    ];
    for (const d of durations) {
      if (d < 30) durBuckets[0].count += 1;
      else if (d < 60) durBuckets[1].count += 1;
      else if (d < 180) durBuckets[2].count += 1;
      else if (d < 300) durBuckets[3].count += 1;
      else durBuckets[4].count += 1;
    }

    // Pending analysis count
    const pending = list.filter((c) => c.analysis_status === "pending" || c.analysis_status === "analyzing").length;

    return {
      total,
      totalDuration,
      avgDuration,
      avgScore,
      avgLatency,
      callLatencies,
      containmentRate,
      hallucinationRate,
      sentBuckets,
      statusBuckets,
      scoreBuckets,
      latBuckets,
      daySeries,
      heat,
      topIssues,
      avgInterruptions,
      durBuckets,
      pending,
    };
  }, [windowedCalls, windowDays]);

  if (loading) {
    return (
      <div className="px-4 py-12 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading agent dashboard…</span>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="px-4 py-12">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <p className="text-sm text-zinc-500 mt-6">Agent not found.</p>
      </div>
    );
  }

  const isPolling = !!polling?.session?.polling_enabled;

  return (
    <div className="px-2 pb-12 text-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{agent.name}</h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                {providerLabel[agent.provider] || agent.provider}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${isPolling ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-zinc-50 text-zinc-600 border-zinc-200"}`}>
                {isPolling ? "Live Polling" : "Polling Off"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Agent Performance Intelligence · {agent.provider_agent_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="border border-zinc-200 rounded-md px-2 py-1 text-xs bg-white h-8"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button size="sm" variant="outline" onClick={handleTogglePolling} disabled={syncing}>
            {isPolling ? <Pause className="h-3.5 w-3.5 mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
            {isPolling ? "Pause Polling" : "Start Polling"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Sync
          </Button>
          {analytics.pending > 0 && (
            <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              Analyze {analytics.pending} pending
            </Button>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <KpiCard
          label="Total Calls"
          value={analytics.total.toLocaleString()}
          caption={`${windowDays}-day window`}
          icon={Phone}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <KpiCard
          label="Avg Score"
          value={
            <span>
              {analytics.avgScore !== null ? Math.round(analytics.avgScore) : "—"}
              {analytics.avgScore !== null && <span className="text-base font-normal text-zinc-400"> /100</span>}
            </span>
          }
          caption={
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${sevBg(scoreSeverity(analytics.avgScore))}`}>
              {scoreSeverity(analytics.avgScore) === "good" ? "Healthy" : scoreSeverity(analytics.avgScore) === "warning" ? "Watch" : analytics.avgScore === null ? "No data" : "Critical"}
            </span>
          }
          icon={Target}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
        />
        <KpiCard
          label="Avg Response"
          value={
            <span>
              {analytics.avgLatency !== null ? Math.round(analytics.avgLatency) : "—"}
              {analytics.avgLatency !== null && <span className="text-base font-normal text-zinc-400"> ms</span>}
            </span>
          }
          caption={
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${sevBg(latencySeverity(analytics.avgLatency))}`}>
              Hamming target &lt;800ms
            </span>
          }
          icon={Zap}
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
        />
        <KpiCard
          label="Avg Duration"
          value={formatDuration(analytics.avgDuration)}
          caption={`${Math.round(analytics.totalDuration / 60)} min total`}
          icon={Clock}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
        />
        <KpiCard
          label="Containment"
          value={
            <span>
              {analytics.containmentRate !== null ? Math.round(analytics.containmentRate) : "—"}
              {analytics.containmentRate !== null && <span className="text-base font-normal text-zinc-400">%</span>}
            </span>
          }
          caption={
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${sevBg(containmentSeverity(analytics.containmentRate))}`}>
              Target &gt;70%
            </span>
          }
          icon={ShieldCheck}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-500"
        />
        <KpiCard
          label="Hallucination"
          value={
            <span>
              {analytics.hallucinationRate !== null ? analytics.hallucinationRate.toFixed(1) : "—"}
              {analytics.hallucinationRate !== null && <span className="text-base font-normal text-zinc-400">%</span>}
            </span>
          }
          caption={
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${sevBg(hallucinationSeverity(analytics.hallucinationRate))}`}>
              Target &lt;1%
            </span>
          }
          icon={AlertTriangle}
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
        />
      </div>

      {/* Row 2: Call Volume Trend (wide) + Sentiment Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <Panel
          title="Call Volume & Quality Trend"
          tooltip="Daily call count and average quality score over the selected window."
          className="lg:col-span-2"
        >
          {analytics.daySeries.every((d) => d.calls === 0) ? (
            <EmptyChart label="No calls in this window yet." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics.daySeries} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#71717a" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#71717a" }} domain={[0, 100]} />
                <ReTooltip
                  contentStyle={{ fontSize: 11, border: "1px solid #e4e4e7", borderRadius: 6 }}
                  formatter={(value: any, name: any) => [value, name]}
                />
                <Area yAxisId="left" type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} fill="url(#callGrad)" name="Calls" />
                <Line yAxisId="right" type="monotone" dataKey="avgScore" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} name="Avg Score" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Sentiment Mix" tooltip="Distribution of overall call sentiment for this window.">
          <SentimentDonut buckets={analytics.sentBuckets} />
        </Panel>
      </div>

      {/* Row 3: Score distribution + Latency distribution + Duration distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <Panel title="Score Distribution" tooltip="How many calls fell into each quality band (0–100).">
          <DistChart data={analytics.scoreBuckets} dataKey="count" labelKey="range" />
        </Panel>
        <Panel title="Response Latency Distribution" tooltip="Per-call average response latency, bucketed against Hamming production thresholds.">
          {analytics.latBuckets.every((b) => b.count === 0) ? (
            <EmptyChart label="No latency data captured yet." />
          ) : (
            <DistChart data={analytics.latBuckets} dataKey="count" labelKey="range" />
          )}
        </Panel>
        <Panel title="Call Duration Distribution" tooltip="How long calls last for this agent.">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.durBuckets} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#71717a" }} />
              <YAxis tick={{ fontSize: 10, fill: "#71717a" }} />
              <ReTooltip contentStyle={{ fontSize: 11, border: "1px solid #e4e4e7", borderRadius: 6 }} />
              <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Row 4: Heatmap (wide) + Top Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <Panel title="Activity Heatmap" tooltip="Calls by hour of day × day of week. Identifies peak load periods." className="lg:col-span-2">
          <Heatmap matrix={analytics.heat} />
        </Panel>
        <Panel title="Top Issue Categories" tooltip="Most frequent issues detected across calls in this window.">
          {analytics.topIssues.length === 0 ? (
            <EmptyChart label="No issues flagged 🎉" />
          ) : (
            <div className="space-y-2">
              {analytics.topIssues.map((it) => {
                const max = analytics.topIssues[0].count;
                const pct = (it.count / max) * 100;
                const color =
                  it.severity === "critical" ? "#ef4444" : it.severity === "major" ? "#f59e0b" : "#3b82f6";
                return (
                  <div key={it.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-700 truncate max-w-[180px]" title={it.label}>{it.label}</span>
                      <span className="font-bold tabular-nums text-zinc-900">{it.count}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Row 5: Recent Calls Table (full width) */}
      <Panel title={`Recent Calls (${windowedCalls.length})`} tooltip="Click a row to open the call intelligence dashboard.">
        {windowedCalls.length === 0 ? (
          <EmptyChart label="No calls in this window. Click Sync to pull from the provider." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 border-b border-zinc-200">
                  <th className="text-left px-2 py-2 font-semibold">When</th>
                  <th className="text-left px-2 py-2 font-semibold">Direction</th>
                  <th className="text-left px-2 py-2 font-semibold">Duration</th>
                  <th className="text-left px-2 py-2 font-semibold">Score</th>
                  <th className="text-left px-2 py-2 font-semibold">Avg Latency</th>
                  <th className="text-left px-2 py-2 font-semibold">Sentiment</th>
                  <th className="text-left px-2 py-2 font-semibold">Issues</th>
                  <th className="text-left px-2 py-2 font-semibold">Status</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {windowedCalls.slice(0, 25).map((c) => {
                  const lat = c.latency?.avg_response_time || (c as any).latency_metrics?.avg_response_time || null;
                  const sev = scoreSeverity(c.overall_score);
                  const sent = (c.sentiment || c.analysis?.sentiment?.overall || "").toLowerCase();
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/dashboard/monitoring/${c.id}`)}
                      className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer"
                    >
                      <td className="px-2 py-2 text-xs text-zinc-600 font-mono tabular-nums">
                        {c.created_at ? new Date(c.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-2 py-2 text-xs text-zinc-700 capitalize">{c.call_type || "—"}</td>
                      <td className="px-2 py-2 text-xs text-zinc-700 tabular-nums">{formatDuration(c.duration_seconds)}</td>
                      <td className="px-2 py-2 text-xs">
                        {c.overall_score !== null ? (
                          <span className="inline-flex items-center gap-1 font-bold tabular-nums" style={{ color: sevColor(sev) }}>
                            {c.overall_score}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {lat !== null && lat > 0 ? (
                          <span className="font-bold tabular-nums" style={{ color: sevColor(latencySeverity(lat)) }}>
                            {Math.round(lat)} ms
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        <SentBadge sentiment={sent} />
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {c.issues_found ? (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-semibold tabular-nums">
                            <AlertTriangle className="h-3 w-3" />
                            {c.issues_found}
                          </span>
                        ) : (
                          <span className="text-zinc-400">0</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          c.analysis_status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : c.analysis_status === "analyzing"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}>
                          {c.analysis_status || "—"}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ============ Reusable sub-components ============

function Panel({ title, tooltip, className, children }: { title: string; tooltip?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-4 ${className || ""}`}>
      <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-700 font-semibold flex items-center gap-1.5 mb-3">
        {title}
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  caption,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  icon: any;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-semibold">{label}</span>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
      </div>
      <div className="text-xl font-bold tabular-nums leading-tight">{value}</div>
      {caption && <div className="mt-1">{caption}</div>}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[180px] flex items-center justify-center text-xs text-zinc-400">{label}</div>
  );
}

function DistChart({ data, dataKey, labelKey }: { data: any[]; dataKey: string; labelKey: string }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
        <XAxis dataKey={labelKey} tick={{ fontSize: 10, fill: "#71717a" }} />
        <YAxis tick={{ fontSize: 10, fill: "#71717a" }} />
        <ReTooltip contentStyle={{ fontSize: 11, border: "1px solid #e4e4e7", borderRadius: 6 }} />
        <Bar dataKey={dataKey} radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color || "#3b82f6"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function SentimentDonut({ buckets }: { buckets: Record<string, number> }) {
  const colors: Record<string, string> = {
    positive: "#10b981",
    neutral: "#a1a1aa",
    negative: "#ef4444",
    frustrated: "#f97316",
    confused: "#f59e0b",
    unknown: "#d4d4d8",
  };
  const data = Object.entries(buckets)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v, fill: colors[k] || "#a1a1aa" }));
  const total = data.reduce((a, b) => a + b.value, 0);
  if (total === 0) return <EmptyChart label="No sentiment data yet." />;
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[160px] w-[160px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={2}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
            <ReTooltip contentStyle={{ fontSize: 11, border: "1px solid #e4e4e7", borderRadius: 6 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-2xl font-bold tabular-nums">{total}</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Calls</div>
        </div>
      </div>
      <div className="flex-1 space-y-1.5 text-xs">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: d.fill }} />
              <span className="text-zinc-700 capitalize">{d.name}</span>
            </span>
            <span className="font-semibold tabular-nums text-zinc-900">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SentBadge({ sentiment }: { sentiment: string }) {
  const s = sentiment || "unknown";
  const map: Record<string, { c: string; Icon: any }> = {
    positive: { c: "text-emerald-600", Icon: Smile },
    neutral: { c: "text-zinc-500", Icon: Meh },
    negative: { c: "text-rose-600", Icon: Frown },
    frustrated: { c: "text-orange-600", Icon: Frown },
    confused: { c: "text-amber-600", Icon: Meh },
  };
  const cfg = map[s] || { c: "text-zinc-400", Icon: Meh };
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1 capitalize ${cfg.c}`}>
      <Icon className="h-3 w-3" />
      {s}
    </span>
  );
}

function Heatmap({ matrix }: { matrix: number[][] }) {
  // matrix[day][hour]
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let max = 0;
  for (const row of matrix) for (const v of row) if (v > max) max = v;
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Hour labels */}
        <div className="flex items-center text-[9px] text-zinc-500 mb-1 pl-9">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="w-5 text-center">{h % 3 === 0 ? h : ""}</div>
          ))}
        </div>
        {matrix.map((row, day) => (
          <div key={day} className="flex items-center mb-0.5">
            <div className="w-9 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{dayLabels[day]}</div>
            {row.map((v, h) => {
              const intensity = max ? v / max : 0;
              const bg = v === 0 ? "#f4f4f5" : `rgba(59, 130, 246, ${0.15 + intensity * 0.75})`;
              return (
                <div
                  key={h}
                  className="w-5 h-5 mr-0.5 rounded-sm flex items-center justify-center"
                  style={{ background: bg }}
                  title={`${dayLabels[day]} ${h}:00 — ${v} call${v === 1 ? "" : "s"}`}
                >
                  {v > 0 && intensity > 0.5 && (
                    <span className="text-[8px] font-bold text-white tabular-nums">{v}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-500">
          <span>Less</span>
          {[0.15, 0.35, 0.55, 0.75, 0.95].map((a) => (
            <div key={a} className="w-4 h-3 rounded-sm" style={{ background: `rgba(59, 130, 246, ${a})` }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
