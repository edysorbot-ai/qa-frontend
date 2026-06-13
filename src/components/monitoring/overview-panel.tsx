"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Bot,
  PhoneCall,
  AlertTriangle,
  Gauge,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Timer,
  Smile,
  Frown,
  Meh,
  ShieldCheck,
  PhoneIncoming,
  PhoneOutgoing,
  Target,
  Clock,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  ComposedChart,
  RadialBarChart,
  RadialBar,
} from "recharts";

interface MonitoredAgent {
  id: string;
  agent_id: string;
  name: string;
  provider: string;
  total_calls: number;
  analyzed_calls: number;
  issues_found: number;
  last_call_at: string | null;
  polling_enabled: boolean;
  created_at: string;
}

interface ProductionCall {
  id: string;
  agent_id: string;
  provider: string;
  overall_score: number | null;
  issues_found: number | null;
  duration_seconds?: number | null;
  call_type?: string | null;
  status?: string | null;
  analysis_status?: string | null;
  sentiment?: string | null;
  latency?: { avg_response_time?: number; e2e_p50?: number; e2e_p90?: number } | null;
  analysis?: {
    sentiment?: { overall?: string };
    intent?: { detected?: string; handled?: boolean };
    compliance?: { score?: number };
  } | null;
  created_at: string;
}

interface Props {
  monitoredAgents: MonitoredAgent[];
  calls: ProductionCall[];
}

const providerLabel: Record<string, string> = {
  elevenlabs: "ElevenLabs",
  retell: "Retell",
  vapi: "Vapi",
  haptik: "Haptik",
  bolna: "Bolna",
  livekit: "LiveKit",
  custom: "Custom",
  openai_realtime: "OpenAI Realtime",
  synthflow: "Synthflow",
};

const providerColors: Record<string, string> = {
  elevenlabs: "#a855f7",
  retell: "#3b82f6",
  vapi: "#22c55e",
  haptik: "#f97316",
  bolna: "#ec4899",
  livekit: "#06b6d4",
  custom: "#6b7280",
  openai_realtime: "#10b981",
  synthflow: "#6366f1",
};

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#ec4899"];

function fmtDay(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getSentiment(c: ProductionCall): "positive" | "neutral" | "negative" | "unknown" {
  const raw = (c.sentiment || c.analysis?.sentiment?.overall || "").toLowerCase();
  if (["positive", "happy", "satisfied"].some((k) => raw.includes(k))) return "positive";
  if (["negative", "angry", "frustrated", "upset"].some((k) => raw.includes(k))) return "negative";
  if (raw === "neutral") return "neutral";
  return "unknown";
}

function getLatency(c: ProductionCall): number | null {
  const v = c.latency?.avg_response_time;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

type TimeRange = "24h" | "7d" | "14d" | "30d" | "all";
const RANGE_DAYS: Record<TimeRange, number> = {
  "24h": 1,
  "7d": 7,
  "14d": 14,
  "30d": 30,
  all: 0,
};

export function MonitoringOverviewPanel({ monitoredAgents, calls }: Props) {
  const [range, setRange] = useState<TimeRange>("14d");
  const [providerFilter, setProviderFilter] = useState<string>("all");

  // Apply time range + provider filter to calls
  const scopedCalls = useMemo(() => {
    const days = RANGE_DAYS[range];
    const cutoff = days > 0 ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
    return calls.filter((c) => {
      if (cutoff && new Date(c.created_at).getTime() < cutoff) return false;
      if (providerFilter !== "all" && c.provider !== providerFilter) return false;
      return true;
    });
  }, [calls, range, providerFilter]);

  const scopedAgents = useMemo(
    () =>
      providerFilter === "all"
        ? monitoredAgents
        : monitoredAgents.filter((a) => a.provider === providerFilter),
    [monitoredAgents, providerFilter]
  );

  // Previous period (for delta calc)
  const previousCalls = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (!days) return [] as ProductionCall[];
    const now = Date.now();
    const start = now - 2 * days * 24 * 60 * 60 * 1000;
    const end = now - days * 24 * 60 * 60 * 1000;
    return calls.filter((c) => {
      const t = new Date(c.created_at).getTime();
      if (t < start || t >= end) return false;
      if (providerFilter !== "all" && c.provider !== providerFilter) return false;
      return true;
    });
  }, [calls, range, providerFilter]);

  // KPIs
  const stats = useMemo(() => {
    const totalCalls = scopedCalls.length;
    const analyzed = scopedCalls.filter((c) => c.analysis_status === "completed" || c.overall_score !== null).length;
    const scoreVals = scopedCalls
      .map((c) => c.overall_score)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const avgScore = scoreVals.length ? scoreVals.reduce((s, v) => s + v, 0) / scoreVals.length : 0;
    const latVals = scopedCalls.map(getLatency).filter((v): v is number => v !== null);
    const avgLatency = latVals.length ? latVals.reduce((s, v) => s + v, 0) / latVals.length : 0;
    const durVals = scopedCalls
      .map((c) => c.duration_seconds)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const avgDuration = durVals.length ? durVals.reduce((s, v) => s + v, 0) / durVals.length : 0;
    const totalDuration = durVals.reduce((s, v) => s + v, 0);
    const totalIssues = scopedCalls.reduce((s, c) => s + (c.issues_found || 0), 0);
    const callsWithIssues = scopedCalls.filter((c) => (c.issues_found || 0) > 0).length;
    const issueRate = totalCalls > 0 ? (callsWithIssues / totalCalls) * 100 : 0;

    // Sentiment
    const sentiments = scopedCalls.map(getSentiment);
    const posPct = totalCalls > 0 ? (sentiments.filter((s) => s === "positive").length / totalCalls) * 100 : 0;
    const negPct = totalCalls > 0 ? (sentiments.filter((s) => s === "negative").length / totalCalls) * 100 : 0;

    // Intent handled
    const intentHandled = scopedCalls.filter((c) => c.analysis?.intent?.handled === true).length;
    const intentTotal = scopedCalls.filter((c) => c.analysis?.intent?.detected).length;
    const handleRate = intentTotal > 0 ? (intentHandled / intentTotal) * 100 : 0;

    // Compliance
    const compVals = scopedCalls
      .map((c) => c.analysis?.compliance?.score)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const avgCompliance = compVals.length ? compVals.reduce((s, v) => s + v, 0) / compVals.length : 0;

    // Prev period for delta
    const prevTotalCalls = previousCalls.length;
    const prevScoreVals = previousCalls
      .map((c) => c.overall_score)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const prevAvgScore = prevScoreVals.length ? prevScoreVals.reduce((s, v) => s + v, 0) / prevScoreVals.length : 0;
    const prevLatVals = previousCalls.map(getLatency).filter((v): v is number => v !== null);
    const prevAvgLatency = prevLatVals.length ? prevLatVals.reduce((s, v) => s + v, 0) / prevLatVals.length : 0;
    const prevIssues = previousCalls.reduce((s, c) => s + (c.issues_found || 0), 0);

    return {
      totalCalls,
      analyzed,
      avgScore,
      avgLatency,
      avgDuration,
      totalDuration,
      totalIssues,
      callsWithIssues,
      issueRate,
      posPct,
      negPct,
      handleRate,
      avgCompliance,
      deltas: {
        calls: prevTotalCalls ? ((totalCalls - prevTotalCalls) / prevTotalCalls) * 100 : null,
        score: prevAvgScore ? avgScore - prevAvgScore : null,
        latency: prevAvgLatency ? avgLatency - prevAvgLatency : null,
        issues: prevIssues ? totalIssues - prevIssues : null,
      },
    };
  }, [scopedCalls, previousCalls]);

  // Daily series (calls + issues + score) — bucket size based on range
  const dailySeries = useMemo(() => {
    const days = RANGE_DAYS[range] || 30;
    const buckets: { date: string; calls: number; issues: number; score: number; sc: number }[] = [];
    const map = new Map<string, { calls: number; issues: number; score: number; sc: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      const e = { calls: 0, issues: 0, score: 0, sc: 0 };
      map.set(key, e);
      buckets.push({ date: fmtDay(d), calls: 0, issues: 0, score: 0, sc: 0 });
    }
    scopedCalls.forEach((c) => {
      const key = new Date(c.created_at).toISOString().slice(0, 10);
      const e = map.get(key);
      if (!e) return;
      e.calls += 1;
      if ((c.issues_found || 0) > 0) e.issues += 1;
      if (typeof c.overall_score === "number") {
        e.score += c.overall_score;
        e.sc += 1;
      }
    });
    let i = 0;
    map.forEach((v) => {
      buckets[i].calls = v.calls;
      buckets[i].issues = v.issues;
      buckets[i].score = v.sc ? Math.round((v.score / v.sc) * 10) / 10 : 0;
      buckets[i].sc = v.sc;
      i++;
    });
    return buckets;
  }, [scopedCalls, range]);

  // Sentiment distribution
  const sentimentDist = useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0, unknown: 0 };
    scopedCalls.forEach((c) => {
      counts[getSentiment(c)] += 1;
    });
    return [
      { name: "Positive", value: counts.positive, fill: "#22c55e" },
      { name: "Neutral", value: counts.neutral, fill: "#94a3b8" },
      { name: "Negative", value: counts.negative, fill: "#ef4444" },
      { name: "Unknown", value: counts.unknown, fill: "#e5e7eb" },
    ].filter((d) => d.value > 0);
  }, [scopedCalls]);

  // Score distribution
  const scoreDist = useMemo(() => {
    const buckets = [
      { name: "Excellent 90-100", min: 90, max: 100.01, value: 0, fill: "#22c55e" },
      { name: "Good 80-89", min: 80, max: 90, value: 0, fill: "#84cc16" },
      { name: "Fair 60-79", min: 60, max: 80, value: 0, fill: "#f59e0b" },
      { name: "Poor <60", min: 0, max: 60, value: 0, fill: "#ef4444" },
    ];
    scopedCalls.forEach((c) => {
      const s = c.overall_score;
      if (typeof s !== "number") return;
      const b = buckets.find((b) => s >= b.min && s < b.max);
      if (b) b.value += 1;
    });
    return buckets.filter((b) => b.value > 0);
  }, [scopedCalls]);

  // Latency distribution
  const latencyDist = useMemo(() => {
    const buckets = [
      { name: "<500ms", min: 0, max: 500, value: 0, fill: "#22c55e" },
      { name: "500ms-1s", min: 500, max: 1000, value: 0, fill: "#84cc16" },
      { name: "1-2s", min: 1000, max: 2000, value: 0, fill: "#f59e0b" },
      { name: "2-5s", min: 2000, max: 5000, value: 0, fill: "#f97316" },
      { name: ">5s", min: 5000, max: Infinity, value: 0, fill: "#ef4444" },
    ];
    scopedCalls.forEach((c) => {
      const l = getLatency(c);
      if (l === null) return;
      const b = buckets.find((b) => l >= b.min && l < b.max);
      if (b) b.value += 1;
    });
    return buckets.filter((b) => b.value > 0);
  }, [scopedCalls]);

  // Duration distribution (minutes)
  const durationDist = useMemo(() => {
    const buckets = [
      { name: "<1m", min: 0, max: 60, value: 0, fill: "#a78bfa" },
      { name: "1-3m", min: 60, max: 180, value: 0, fill: "#8b5cf6" },
      { name: "3-5m", min: 180, max: 300, value: 0, fill: "#7c3aed" },
      { name: "5-10m", min: 300, max: 600, value: 0, fill: "#6d28d9" },
      { name: ">10m", min: 600, max: Infinity, value: 0, fill: "#5b21b6" },
    ];
    scopedCalls.forEach((c) => {
      const d = c.duration_seconds;
      if (typeof d !== "number") return;
      const b = buckets.find((b) => d >= b.min && d < b.max);
      if (b) b.value += 1;
    });
    return buckets.filter((b) => b.value > 0);
  }, [scopedCalls]);

  // Provider breakdown
  const providerSplit = useMemo(() => {
    const map = new Map<string, number>();
    scopedCalls.forEach((c) => map.set(c.provider, (map.get(c.provider) || 0) + 1));
    return Array.from(map.entries()).map(([k, v]) => ({
      provider: providerLabel[k] || k,
      key: k,
      count: v,
    }));
  }, [scopedCalls]);

  // Call type split
  const callTypeSplit = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    let unknown = 0;
    scopedCalls.forEach((c) => {
      const t = (c.call_type || "").toLowerCase();
      if (t === "inbound") inbound++;
      else if (t === "outbound") outbound++;
      else unknown++;
    });
    return [
      { name: "Inbound", value: inbound, fill: "#3b82f6" },
      { name: "Outbound", value: outbound, fill: "#a855f7" },
      { name: "Unknown", value: unknown, fill: "#cbd5e1" },
    ].filter((d) => d.value > 0);
  }, [scopedCalls]);

  // Hour-of-day heatmap (24 bars)
  const callsByHour = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}h`, calls: 0 }));
    scopedCalls.forEach((c) => {
      const h = new Date(c.created_at).getHours();
      arr[h].calls += 1;
    });
    return arr;
  }, [scopedCalls]);

  // Top agents
  const topAgents = useMemo(() => {
    const map = new Map<
      string,
      { name: string; provider: string; calls: number; score: number; sc: number; latency: number; lc: number; issues: number; duration: number; dc: number }
    >();
    scopedAgents.forEach((a) => {
      map.set(a.agent_id, {
        name: a.name,
        provider: a.provider,
        calls: 0,
        score: 0,
        sc: 0,
        latency: 0,
        lc: 0,
        issues: 0,
        duration: 0,
        dc: 0,
      });
    });
    scopedCalls.forEach((c) => {
      const e = map.get(c.agent_id);
      if (!e) return;
      e.calls += 1;
      e.issues += c.issues_found || 0;
      if (typeof c.overall_score === "number") {
        e.score += c.overall_score;
        e.sc += 1;
      }
      const l = getLatency(c);
      if (l !== null) {
        e.latency += l;
        e.lc += 1;
      }
      if (typeof c.duration_seconds === "number") {
        e.duration += c.duration_seconds;
        e.dc += 1;
      }
    });
    return Array.from(map.values())
      .map((e) => ({
        name: e.name,
        provider: e.provider,
        calls: e.calls,
        avgScore: e.sc ? Math.round((e.score / e.sc) * 10) / 10 : 0,
        avgLatency: e.lc ? Math.round(e.latency / e.lc) : 0,
        avgDuration: e.dc ? Math.round(e.duration / e.dc) : 0,
        issues: e.issues,
      }))
      .filter((a) => a.calls > 0)
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 6);
  }, [scopedAgents, scopedCalls]);

  // Worst-performing agents (by issues then by low score)
  const worstAgents = useMemo(() => {
    return [...topAgents]
      .filter((a) => a.avgScore > 0 || a.issues > 0)
      .sort((a, b) => {
        if (b.issues !== a.issues) return b.issues - a.issues;
        return (a.avgScore || 100) - (b.avgScore || 100);
      })
      .slice(0, 5);
  }, [topAgents]);

  // Analysis funnel (status)
  const analysisFunnel = useMemo(() => {
    let total = scopedCalls.length;
    let analyzed = 0;
    let scored = 0;
    let issuesFound = 0;
    scopedCalls.forEach((c) => {
      if (c.analysis_status === "completed") analyzed += 1;
      if (typeof c.overall_score === "number") scored += 1;
      if ((c.issues_found || 0) > 0) issuesFound += 1;
    });
    return [
      { stage: "All Calls", value: total, fill: "#3b82f6" },
      { stage: "Analyzed", value: analyzed, fill: "#22c55e" },
      { stage: "Scored", value: scored, fill: "#a855f7" },
      { stage: "With Issues", value: issuesFound, fill: "#ef4444" },
    ];
  }, [scopedCalls]);

  // Score gauge for radial
  const gaugeData = [
    {
      name: "score",
      value: Math.min(100, Math.max(0, stats.avgScore)),
      fill: stats.avgScore >= 80 ? "#22c55e" : stats.avgScore >= 60 ? "#f59e0b" : "#ef4444",
    },
  ];

  const providers = useMemo(() => {
    const set = new Set(monitoredAgents.map((a) => a.provider).filter(Boolean));
    return Array.from(set);
  }, [monitoredAgents]);

  if (monitoredAgents.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <Activity className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
        <div className="font-medium mb-1">No data yet</div>
        <div className="text-sm text-muted-foreground">
          Add agents in the Agents tab to start seeing production analytics.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 -mx-1 px-1 border-b">
        <div className="text-sm font-medium mr-2">Period:</div>
        <div className="inline-flex rounded-md border p-0.5">
          {(["24h", "7d", "14d", "30d", "all"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-xs rounded ${
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "all" ? "All time" : r.toUpperCase()}
            </button>
          ))}
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[170px] h-8 text-xs ml-2">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p} value={p}>
                {providerLabel[p] || p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          {scopedCalls.length} calls • {scopedAgents.length} agents
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <Kpi
          icon={<Bot className="h-4 w-4" />}
          title="Agents"
          value={scopedAgents.length}
          sub={`${monitoredAgents.filter((a) => a.polling_enabled).length} polling`}
          accent="blue"
        />
        <Kpi
          icon={<PhoneCall className="h-4 w-4" />}
          title="Calls"
          value={stats.totalCalls}
          sub={fmtDelta(stats.deltas.calls, "%")}
          delta={stats.deltas.calls ?? undefined}
          accent="emerald"
        />
        <Kpi
          icon={<Gauge className="h-4 w-4" />}
          title="Avg Score"
          value={stats.avgScore ? stats.avgScore.toFixed(1) : "—"}
          sub={fmtDelta(stats.deltas.score, "pts")}
          delta={stats.deltas.score ?? undefined}
          accent={stats.avgScore >= 80 ? "emerald" : stats.avgScore >= 60 ? "amber" : "rose"}
        />
        <Kpi
          icon={<Timer className="h-4 w-4" />}
          title="Avg Latency"
          value={stats.avgLatency ? `${Math.round(stats.avgLatency)}ms` : "—"}
          sub={fmtDelta(stats.deltas.latency, "ms", true)}
          delta={stats.deltas.latency ? -stats.deltas.latency : undefined}
          accent={stats.avgLatency < 800 ? "emerald" : stats.avgLatency < 1500 ? "amber" : "rose"}
        />
        <Kpi
          icon={<Clock className="h-4 w-4" />}
          title="Avg Duration"
          value={stats.avgDuration ? fmtDur(stats.avgDuration) : "—"}
          sub={`${fmtDur(stats.totalDuration)} total`}
          accent="indigo"
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Issue Rate"
          value={`${stats.issueRate.toFixed(1)}%`}
          sub={`${stats.totalIssues} issues • ${stats.callsWithIssues} calls`}
          accent={stats.issueRate > 20 ? "rose" : stats.issueRate > 5 ? "amber" : "emerald"}
        />
      </div>

      {/* Secondary KPIs - sentiment, handle rate, compliance, analysis rate */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Kpi
          icon={<Smile className="h-4 w-4" />}
          title="Positive Sentiment"
          value={`${stats.posPct.toFixed(0)}%`}
          sub={`${stats.negPct.toFixed(0)}% negative`}
          accent={stats.posPct >= 60 ? "emerald" : "amber"}
        />
        <Kpi
          icon={<Target className="h-4 w-4" />}
          title="Intent Handle Rate"
          value={`${stats.handleRate.toFixed(0)}%`}
          sub="intents resolved"
          accent={stats.handleRate >= 80 ? "emerald" : stats.handleRate >= 60 ? "amber" : "rose"}
        />
        <Kpi
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Avg Compliance"
          value={stats.avgCompliance ? `${stats.avgCompliance.toFixed(0)}` : "—"}
          sub="out of 100"
          accent={stats.avgCompliance >= 80 ? "emerald" : stats.avgCompliance >= 60 ? "amber" : "rose"}
        />
        <Kpi
          icon={<Sparkles className="h-4 w-4" />}
          title="Analysis Rate"
          value={`${stats.totalCalls ? Math.round((stats.analyzed / stats.totalCalls) * 100) : 0}%`}
          sub={`${stats.analyzed} / ${stats.totalCalls} analyzed`}
          accent="indigo"
        />
      </div>

      {/* Main trend chart - large */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Call Volume, Issues & Quality Trend
          </CardTitle>
          <CardDescription>Daily calls (bars), issues (red line), quality score (green line)</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailySeries} margin={{ top: 8, right: 20, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="calls" name="Calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Line yAxisId="left" type="monotone" dataKey="issues" name="Issues" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="score" name="Avg Score" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Score gauge + Score distribution + Sentiment */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overall Quality Gauge</CardTitle>
            <CardDescription>Average across all scored calls</CardDescription>
          </CardHeader>
          <CardContent className="h-56 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="60%" outerRadius="100%" data={gaugeData} startAngle={180} endAngle={0}>
                <RadialBar background dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
              <div className="text-4xl font-bold tabular-nums">{stats.avgScore.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">out of 100</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Score Distribution</CardTitle>
            <CardDescription>Quality buckets</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {scoreDist.length === 0 ? (
              <EmptyChart label="No scored calls yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={scoreDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2}>
                    {scoreDist.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smile className="h-4 w-4 text-emerald-500" />
              Sentiment Mix
            </CardTitle>
            <CardDescription>Caller sentiment distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {sentimentDist.length === 0 ? (
              <EmptyChart label="No sentiment data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sentimentDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2}>
                    {sentimentDist.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latency / Duration / Call type */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Latency Distribution</CardTitle>
            <CardDescription>Avg response time buckets</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {latencyDist.length === 0 ? (
              <EmptyChart label="No latency data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyDist} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {latencyDist.map((b, i) => (
                      <Cell key={i} fill={b.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Call Duration</CardTitle>
            <CardDescription>How long calls last</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {durationDist.length === 0 ? (
              <EmptyChart label="No duration data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationDist} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {durationDist.map((b, i) => (
                      <Cell key={i} fill={b.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneIncoming className="h-4 w-4 text-blue-500" />
              <PhoneOutgoing className="h-4 w-4 text-purple-500" />
              Call Type
            </CardTitle>
            <CardDescription>Inbound vs outbound</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {callTypeSplit.length === 0 ? (
              <EmptyChart label="No call type data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={callTypeSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2}>
                    {callTypeSplit.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Provider + hour of day */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Calls by Provider</CardTitle>
            <CardDescription>Volume share across providers</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {providerSplit.length === 0 ? (
              <EmptyChart label="No calls yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={providerSplit} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="provider" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {providerSplit.map((p, i) => (
                      <Cell key={i} fill={providerColors[p.key] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Calls by Hour of Day</CardTitle>
            <CardDescription>Peak activity windows</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={callsByHour} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="calls" stroke="#6366f1" fill="url(#hourGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Analysis funnel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Analysis Pipeline</CardTitle>
          <CardDescription>How calls flow from ingestion → analysis → issue detection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {analysisFunnel.map((s, i) => {
              const pct =
                analysisFunnel[0].value > 0 ? Math.round((s.value / analysisFunnel[0].value) * 100) : 0;
              return (
                <div key={s.stage} className="rounded-lg border p-3 bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.stage}</div>
                    <div className="text-xs font-medium">{pct}%</div>
                  </div>
                  <div className="text-2xl font-bold tabular-nums" style={{ color: s.fill }}>
                    {s.value}
                  </div>
                  <Progress value={pct} className="h-1.5 mt-2" />
                  {i < analysisFunnel.length - 1 && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      → {Math.max(0, analysisFunnel[i].value - analysisFunnel[i + 1].value)} drop-off
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top + Worst agents */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Top Agents by Volume
            </CardTitle>
            <CardDescription>Most active agents in this period</CardDescription>
          </CardHeader>
          <CardContent>
            {topAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No agent activity yet.</p>
            ) : (
              <div className="space-y-2">
                {topAgents.map((a, i) => (
                  <AgentRow key={a.name + i} rank={i + 1} agent={a} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-rose-500" />
              Agents Needing Attention
            </CardTitle>
            <CardDescription>Most issues / lowest scores</CardDescription>
          </CardHeader>
          <CardContent>
            {worstAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No issues to report 🎉</p>
            ) : (
              <div className="space-y-2">
                {worstAgents.map((a, i) => (
                  <AgentRow key={a.name + i} rank={i + 1} agent={a} highlight="danger" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────── Subcomponents ───────────

const ACCENTS: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-600",
  emerald: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  rose: "bg-rose-500/10 text-rose-600",
  indigo: "bg-indigo-500/10 text-indigo-600",
  purple: "bg-purple-500/10 text-purple-600",
};

function Kpi({
  icon,
  title,
  value,
  sub,
  accent = "blue",
  delta,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  sub?: string;
  accent?: string;
  delta?: number;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{title}</p>
            <p className="text-xl font-bold mt-0.5 tabular-nums">{value}</p>
            {sub && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                {typeof delta === "number" && delta !== 0 && (
                  delta > 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-rose-500 shrink-0" />
                  )
                )}
                {sub}
              </p>
            )}
          </div>
          <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${ACCENTS[accent] || ACCENTS.blue}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentRow({
  rank,
  agent,
  highlight,
}: {
  rank: number;
  agent: {
    name: string;
    provider: string;
    calls: number;
    avgScore: number;
    avgLatency: number;
    avgDuration: number;
    issues: number;
  };
  highlight?: "danger";
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${
        highlight === "danger" ? "border-rose-200 bg-rose-50/30" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
            highlight === "danger" ? "bg-rose-100 text-rose-700" : "bg-primary/10 text-primary"
          }`}
        >
          #{rank}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{agent.name}</div>
          <Badge variant="outline" className="text-[9px] mt-0.5 h-4 px-1">
            {providerLabel[agent.provider] || agent.provider}
          </Badge>
        </div>
      </div>
      <div className="hidden sm:grid grid-cols-4 gap-3 text-xs">
        <MetricCell label="Calls" value={`${agent.calls}`} />
        <MetricCell
          label="Score"
          value={agent.avgScore ? `${agent.avgScore}` : "—"}
          tone={agent.avgScore >= 80 ? "good" : agent.avgScore >= 60 ? "warn" : agent.avgScore > 0 ? "bad" : undefined}
        />
        <MetricCell
          label="Latency"
          value={agent.avgLatency ? `${agent.avgLatency}ms` : "—"}
          tone={agent.avgLatency < 800 ? "good" : agent.avgLatency < 1500 ? "warn" : agent.avgLatency > 0 ? "bad" : undefined}
        />
        <MetricCell
          label="Issues"
          value={`${agent.issues}`}
          tone={agent.issues === 0 ? "good" : agent.issues < 3 ? "warn" : "bad"}
        />
      </div>
    </div>
  );
}

function MetricCell({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  const cls =
    tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "bad" ? "text-rose-600" : "";
  return (
    <div className="text-right tabular-nums">
      <div className="text-[9px] text-muted-foreground uppercase">{label}</div>
      <div className={`font-medium ${cls}`}>{value}</div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">{label}</div>
  );
}

function fmtDur(sec: number): string {
  if (!sec || !Number.isFinite(sec)) return "—";
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60) return `${m}m${s ? ` ${s}s` : ""}`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function fmtDelta(delta: number | null | undefined, unit: string, invert = false): string {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) return "vs previous";
  const sign = delta > 0 ? "+" : "";
  const direction = (invert ? -delta : delta) > 0 ? "↑" : "↓";
  return `${direction} ${sign}${delta.toFixed(unit === "%" ? 0 : 1)}${unit} vs prev`;
}
