"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Bot,
  User,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  Play,
  Pause,
  Target,
  Clock,
  MessageSquare,
  Zap,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  Shield,
  ShieldCheck,
  Mic,
  Activity,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Phone,
  Smile,
  Frown,
  Meh,
  Calendar,
  Hash,
} from "lucide-react";
import { api } from "@/lib/api";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

interface TranscriptEntry {
  role: "user" | "agent" | "system";
  content: string;
  timestamp?: string | number;
  latency_ms?: number;
  latencyMs?: number;
  duration_ms?: number;
  durationMs?: number;
  response_latency_ms?: number;
  conversation_turn_metrics?: { metrics?: Record<string, number | undefined> };
  metrics?: Record<string, number | undefined>;
}

interface TurnLatency {
  turn: number;
  agentIndex: number;
  responseLatencyMs: number | null;
  source: "provider" | "estimated" | null;
}

interface Issue {
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  transcript_context?: string;
  suggestion: string;
}

interface Metrics {
  responseQuality?: number;
  promptAdherence?: number;
  conversationFlow?: number;
  informationAccuracy?: number;
  userSatisfaction?: number;
  empathy?: number;
  clarity?: number;
  efficiency?: number;
}

interface Analysis {
  overallScore: number;
  summary: string;
  issues: Issue[];
  strengths: Array<{ description: string; example?: string }>;
  promptSuggestions: string[];
  metrics: Metrics;
  analyzedAt: string;
  sentiment?: { user?: string; agent?: string; overall?: string };
  intent?: { detected?: string; handled?: boolean };
  compliance?: { score?: number; flags?: Array<{ type: string; severity: string }> };
  toolUsage?: {
    toolsCalled?: Array<{ toolName: string; callCount?: number; success?: boolean; timing?: string }>;
  };
  conversationDynamics?: { interruptionCount?: number };
  dataCapture?: {
    fields: Array<{
      fieldType: string;
      fieldLabel: string;
      userSaid: string;
      asrCaptured: string;
      agentConfirmed: string;
      match: boolean;
      severity: "critical" | "major" | "minor";
      userTurnIndex?: number;
      agentTurnIndex?: number;
      explanation: string;
    }>;
    totalChecked: number;
    mismatchCount: number;
    validationScore: number;
  };
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
  transcript: TranscriptEntry[];
  recording_url: string | null;
  overall_score: number | null;
  issues_found: number;
  prompt_suggestions: string[];
  analysis: Analysis | null;
  analysis_status: string;
  raw_webhook_data: Record<string, unknown>;
  latency?: { e2e_p50?: number; e2e_p90?: number; llm_p50?: number; tts_p50?: number };
  webhook_payload?: Record<string, any>;
  tool_calls?: Array<{ name: string; arguments?: any; result?: string }>;
  created_at: string;
  agent_system_prompt?: string;
  agent_provider_agent_id?: string;
}

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

const moodEmoji = (s?: string) => {
  const v = (s || "").toLowerCase();
  if (["positive", "happy", "satisfied"].includes(v)) return { label: "Happy", icon: Smile, color: "text-green-600", bg: "bg-green-50", chip: "bg-green-100 text-green-700" };
  if (["frustrated", "angry", "negative"].includes(v)) return { label: "Frustrated", icon: Frown, color: "text-red-600", bg: "bg-red-50", chip: "bg-red-100 text-red-700" };
  if (["confused"].includes(v)) return { label: "Confused", icon: Meh, color: "text-amber-600", bg: "bg-amber-50", chip: "bg-amber-100 text-amber-700" };
  if (v) return { label: v.charAt(0).toUpperCase() + v.slice(1), icon: Meh, color: "text-zinc-600", bg: "bg-zinc-50", chip: "bg-zinc-100 text-zinc-700" };
  return null;
};

// â”€â”€â”€ KPI Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function KpiCard({
  label,
  value,
  caption,
  icon: Icon,
  iconBg,
  iconColor,
  tooltip,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  caption?: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  tooltip?: string;
  trend?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 font-semibold flex items-center gap-1">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
          </div>
          <div className="mt-1.5 text-2xl font-bold tabular-nums text-zinc-900 leading-tight">{value}</div>
          {caption && <div className="text-xs text-zinc-500 mt-0.5">{caption}</div>}
        </div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
      {trend && <div className="mt-2">{trend}</div>}
    </div>
  );
}

// â”€â”€â”€ Panel Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Panel({
  title,
  tooltip,
  className = "",
  children,
}: {
  title: string;
  tooltip?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-5 ${className}`}>
      <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-700 font-semibold flex items-center gap-1.5 mb-4">
        {title}
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      {children}
    </div>
  );
}

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const callId = params.callId as string;

  const [call, setCall] = useState<ProductionCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [showRecording, setShowRecording] = useState(false);
  const [audioMetrics, setAudioMetrics] = useState<any>(null);
  const [audioAnalyzing, setAudioAnalyzing] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [speakerFilter, setSpeakerFilter] = useState<"all" | "agent" | "user">("all");
  const [transcriptSearch, setTranscriptSearch] = useState("");

  const toTimelineMs = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" && Number.isFinite(value)) {
      return value < 1000000 ? Math.round(value * 1000) : Math.round(value);
    }
    if (typeof value === "string") {
      const t = value.trim();
      if (!t) return null;
      const n = Number(t);
      if (!Number.isNaN(n)) return n < 1000000 ? Math.round(n * 1000) : Math.round(n);
      const d = Date.parse(t);
      if (!Number.isNaN(d)) return d;
    }
    return null;
  };

  const extractProviderLatencyMs = (e: TranscriptEntry): number | null => {
    const direct = e.latency_ms ?? e.latencyMs ?? e.response_latency_ms ?? e.duration_ms ?? e.durationMs;
    if (typeof direct === "number" && Number.isFinite(direct) && direct >= 0) {
      return direct < 30 ? Math.round(direct * 1000) : Math.round(direct);
    }
    const ctm = e.conversation_turn_metrics?.metrics || e.metrics;
    if (ctm) {
      for (const v of [ctm.convai_llm_service_ttf_sentence, ctm.convai_llm_service_ttfb, ctm.ttfb, ctm.ttf_sentence]) {
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v < 30 ? Math.round(v * 1000) : Math.round(v);
      }
    }
    return null;
  };

  const turnLatencies = useMemo<TurnLatency[]>(() => {
    if (!call?.transcript || call.transcript.length === 0) return [];
    const turns: TurnLatency[] = [];
    let turnCounter = 0;
    let lastUserTs: number | null = null;
    call.transcript.forEach((entry, index) => {
      const ts = toTimelineMs(entry.timestamp);
      if (entry.role === "user") {
        if (ts !== null) lastUserTs = ts;
        return;
      }
      if (entry.role !== "agent") return;
      turnCounter += 1;
      const provider = extractProviderLatencyMs(entry);
      let latency: number | null = provider;
      let source: TurnLatency["source"] = provider !== null ? "provider" : null;
      if (latency === null && ts !== null && lastUserTs !== null) {
        const gap = Math.max(0, Math.round(ts - lastUserTs));
        if (gap > 0 && gap <= 5000) {
          latency = gap;
          source = "estimated";
        }
      }
      turns.push({ turn: turnCounter, agentIndex: index, responseLatencyMs: latency, source });
    });
    return turns;
  }, [call]);

  const latencyStats = useMemo(() => {
    const vals = turnLatencies.map((t) => t.responseLatencyMs).filter((v): v is number => typeof v === "number");
    if (!vals.length) return { avg: null, max: null, min: null, count: 0 } as any;
    return {
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      max: Math.max(...vals),
      min: Math.min(...vals),
      count: vals.length,
    };
  }, [turnLatencies]);

  const talkTime = useMemo(() => {
    const t = call?.transcript || [];
    let userMs = 0, agentMs = 0, hasDuration = false;
    const ts = (e: TranscriptEntry) => toTimelineMs(e.timestamp);
    for (let i = 0; i < t.length; i++) {
      const e = t[i];
      const dur = e.duration_ms ?? e.durationMs;
      let d: number | null = null;
      if (typeof dur === "number" && Number.isFinite(dur)) {
        d = dur < 30 ? Math.round(dur * 1000) : Math.round(dur);
        hasDuration = true;
      } else {
        const next = t[i + 1];
        const a = ts(e), b = next ? ts(next) : null;
        if (a !== null && b !== null && b > a) d = b - a;
      }
      if (d === null || d < 0) continue;
      if (e.role === "user") userMs += d;
      else if (e.role === "agent") agentMs += d;
    }
    return { userMs, agentMs, source: hasDuration ? "provider" : "estimated" };
  }, [call]);

  const callOverview = useMemo(() => {
    const wd: any = call?.raw_webhook_data || call?.webhook_payload || {};
    const intent = call?.analysis?.intent?.detected || wd?.call_analysis?.custom_data?.intent || wd?.call_analysis?.intent || null;
    const language = wd?.language || wd?.detected_language || wd?.conversation_initiation_metadata_event?.language || null;
    const outcomeSuccess = call?.analysis?.intent?.handled ?? wd?.call_analysis?.successful ?? wd?.call_successful ?? null;
    return {
      intent,
      language: typeof language === "string" ? language : null,
      direction: call?.call_type || null,
      outcomeSuccess,
    };
  }, [call]);

  const fetchCall = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.monitoring.call(callId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const c = data.call;
        if (c) {
          if (c.analysis && typeof c.analysis === "string") {
            try { c.analysis = JSON.parse(c.analysis); } catch { c.analysis = null; }
          }
          if (c.analysis) {
            const sevMap: Record<string, "low" | "medium" | "high"> = {
              low: "low", minor: "low", info: "low",
              medium: "medium", moderate: "medium", warning: "medium",
              high: "high", major: "high", critical: "high", severe: "high",
            };
            c.analysis.issues = (Array.isArray(c.analysis.issues) ? c.analysis.issues : []).map((i: any) => ({
              type: String(i?.type || i?.category || "issue"),
              severity: sevMap[String(i?.severity || "").toLowerCase()] || "medium",
              description: String(i?.description || ""),
              transcript_context: i?.transcript_context,
              suggestion: String(i?.suggestion || ""),
            }));
            c.analysis.strengths = (Array.isArray(c.analysis.strengths) ? c.analysis.strengths : []).map((s: any) =>
              typeof s === "string" ? { description: s } : { description: String(s?.description || s?.text || ""), example: s?.example }
            );
            c.analysis.promptSuggestions = (Array.isArray(c.analysis.promptSuggestions) ? c.analysis.promptSuggestions : []).map((p: any) => {
              if (typeof p === "string") return p;
              if (p && typeof p === "object") return p.suggestedChange || p.suggestion || p.reasoning || JSON.stringify(p);
              return String(p ?? "");
            });
            c.analysis.metrics = c.analysis.metrics && typeof c.analysis.metrics === "object" ? c.analysis.metrics : {};
            if (typeof c.analysis.overallScore !== "number") c.analysis.overallScore = 0;
          }
          c.transcript = Array.isArray(c.transcript) ? c.transcript : [];
        }
        setCall(c);
      }
    } catch (e) {
      console.error("fetchCall", e);
    } finally {
      setLoading(false);
    }
  }, [getToken, callId]);

  useEffect(() => { fetchCall(); }, [fetchCall]);

  useEffect(() => {
    if (!call?.id || !call.recording_url) { setRecordingUrl(null); return; }
    let cancelled = false;
    let revoke: string | null = null;
    (async () => {
      try {
        setRecordingError(null);
        const token = await getToken();
        const r = await fetch(api.endpoints.monitoring.recording(call.id), { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) throw new Error(`Recording fetch failed (${r.status})`);
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        revoke = url;
        if (!cancelled) setRecordingUrl(url);
      } catch (e: any) {
        if (!cancelled) setRecordingError(e?.message || "Failed to load recording");
      }
    })();
    return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke); };
  }, [call?.id, call?.recording_url, getToken]);

  useEffect(() => {
    if (call?.analysis && (call.analysis as any).audioMetrics) {
      setAudioMetrics((call.analysis as any).audioMetrics);
    }
  }, [call]);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      const token = await getToken();
      const r = await fetch(api.endpoints.monitoring.reanalyze(callId), { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const poll = async () => {
          const t = await getToken();
          const rr = await fetch(api.endpoints.monitoring.call(callId), { headers: { Authorization: `Bearer ${t}` } });
          if (rr.ok) {
            const d = await rr.json();
            setCall(d.call);
            if (d.call?.analysis_status === "analyzing") setTimeout(poll, 2000);
            else setReanalyzing(false);
          } else setReanalyzing(false);
        };
        setTimeout(poll, 2000);
      }
    } catch { setReanalyzing(false); }
  };

  const handleAnalyzeAudio = async () => {
    if (!call?.id) return;
    setAudioAnalyzing(true);
    setAudioError(null);
    try {
      const token = await getToken();
      const r = await fetch(api.endpoints.monitoring.analyzeAudio(call.id), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error(`Audio analysis failed (${r.status})`);
      const data = await r.json();
      setAudioMetrics(data.audioMetrics);
    } catch (e: any) {
      setAudioError(e?.message || "Failed to analyze audio");
    } finally {
      setAudioAnalyzing(false);
    }
  };

  const handleCopyTranscript = () => {
    if (!call?.transcript) return;
    const text = call.transcript.map((t) => `${t.role === "agent" ? "Agent" : "User"}: ${t.content}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-zinc-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading callâ€¦</div>;
  }
  if (!call) {
    return (
      <div className="py-24 text-center">
        <p className="text-zinc-600 mb-4">Call not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Go back</Button>
      </div>
    );
  }

  const a = call.analysis;
  const flags = a?.compliance?.flags || [];
  const issues = a?.issues || [];
  const has = (...types: string[]) =>
    flags.some((f) => types.includes((f.type || "").toLowerCase())) ||
    issues.some((i) => types.includes((i.type || "").toLowerCase()));
  const securityFlags = [
    { label: "Jailbreak / Prompt Injection", tripped: has("jailbreak", "prompt_injection", "prompt-injection") },
    { label: "PII Leakage Risk", tripped: has("pii_exposure", "pii", "pii-leak") },
    { label: "Hallucination Check", tripped: has("hallucination") },
    { label: "Persona Override", tripped: has("persona_override", "off_script", "off-script") },
  ];

  const totalTalk = talkTime.userMs + talkTime.agentMs;
  const userPct = totalTalk > 0 ? Math.round((talkTime.userMs / totalTalk) * 100) : 0;
  const agentPct = totalTalk > 0 ? 100 - userPct : 0;
  const talkDonut = [
    { name: "Customer", value: talkTime.userMs, fill: "#3b82f6" },
    { name: "Agent", value: talkTime.agentMs, fill: "#10b981" },
  ];

  const specScores: Array<{ key: keyof Metrics; label: string }> = [
    { key: "promptAdherence", label: "Prompt Compliance" },
    { key: "informationAccuracy", label: "Information Accuracy" },
    { key: "responseQuality", label: "Response Quality" },
    { key: "conversationFlow", label: "Workflow Adherence" },
    { key: "userSatisfaction", label: "User Satisfaction" },
  ];

  const scoreColor = (v: number) => (v >= 80 ? "#10b981" : v >= 60 ? "#f59e0b" : "#ef4444");

  const latencyChartData = turnLatencies
    .filter((t) => t.responseLatencyMs !== null)
    .map((t) => ({ turn: `T${t.turn}`, latency: t.responseLatencyMs as number }));

  const overallScore = call.overall_score !== null ? Math.round(call.overall_score) : (a?.overallScore || 0);
  const overallSentimentLabel = a?.sentiment?.overall ? a.sentiment.overall.charAt(0).toUpperCase() + a.sentiment.overall.slice(1) : "â€”";
  const userMood = moodEmoji(a?.sentiment?.user);
  const outcomeSuccess = callOverview.outcomeSuccess;

  // Transcript filtering
  const filteredTranscript = call.transcript
    .map((e, idx) => ({ ...e, _idx: idx }))
    .filter((e) => {
      if (speakerFilter !== "all" && e.role !== speakerFilter) return false;
      if (transcriptSearch && !e.content.toLowerCase().includes(transcriptSearch.toLowerCase())) return false;
      return true;
    });

  // Per-turn timestamp helper (mm:ss from call start)
  const startMs = call.started_at ? new Date(call.started_at).getTime() : null;
  const turnRelTime = (entry: TranscriptEntry, idx: number) => {
    const ts = toTimelineMs(entry.timestamp);
    if (ts === null) return "â€”";
    let sec: number;
    if (ts < 100000) sec = Math.round(ts / 1000); // already a relative offset
    else if (startMs) sec = Math.max(0, Math.round((ts - startMs) / 1000));
    else sec = Math.round(ts / 1000);
    return formatDuration(sec);
  };

  return (
    <div className="px-2 pb-12 text-zinc-900">
      {/* Top header bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Call Intelligence Dashboard</h1>
            <p className="text-xs text-zinc-500">Monitor and analyze agent conversations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReanalyze} disabled={reanalyzing}>
            {reanalyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Re-analyze
          </Button>
        </div>
      </div>

      {/* Call ID + Recording bar */}
      <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-xl px-4 py-2.5 mb-4">
        <div className="text-xs text-zinc-600 flex items-center gap-2">
          <Hash className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-zinc-500">Call ID:</span>
          <span className="font-mono text-zinc-900">{call.provider_call_id || call.id}</span>
        </div>
        {call.recording_url && (
          <Button variant="outline" size="sm" onClick={() => setShowRecording((v) => !v)}>
            <Play className="h-3.5 w-3.5 mr-1.5" />
            {showRecording ? "Hide Recording" : "View Recording"}
          </Button>
        )}
      </div>

      {showRecording && call.recording_url && (
        <div className="bg-white border border-zinc-200 rounded-xl p-3 mb-4">
          {recordingUrl ? (
            <audio src={recordingUrl} controls className="w-full h-8" />
          ) : recordingError ? (
            <p className="text-xs text-zinc-500">{recordingError}</p>
          ) : (
            <p className="text-xs text-zinc-500 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loadingâ€¦</p>
          )}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KpiCard
          label="Overall Score"
          value={
            <span>
              {overallScore}
              <span className="text-base font-normal text-zinc-400"> /100</span>
            </span>
          }
          caption={overallScore >= 80 ? "Excellent" : overallScore >= 60 ? "Neutral" : overallScore >= 40 ? "Needs Work" : "Critical"}
          icon={Target}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          tooltip="Composite quality score (0-100) from the LLM judge."
          trend={
            <svg viewBox="0 0 100 14" className="w-full h-3 mt-1">
              <path d="M0,8 Q15,3 30,7 T60,5 T90,9 T100,6" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            </svg>
          }
        />
        <KpiCard
          label="Duration"
          value={call.duration_seconds ? formatDuration(call.duration_seconds) : "â€”"}
          caption="mm:ss"
          icon={Clock}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <KpiCard
          label="Turns"
          value={call.transcript?.length || 0}
          caption="Total Turns"
          icon={MessageSquare}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
        />
        <KpiCard
          label="Interruptions"
          value={a?.conversationDynamics?.interruptionCount ?? "â€”"}
          caption="Total Interruptions"
          icon={Activity}
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
        />
        <KpiCard
          label="Avg Latency"
          value={latencyStats.avg !== null ? (latencyStats.avg < 1000 ? `${latencyStats.avg}ms` : `${(latencyStats.avg / 1000).toFixed(1)}s`) : "â€”"}
          caption="Average per turn"
          icon={Zap}
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
          tooltip="Mean response latency from when the user stopped speaking to when the agent began speaking."
        />
      </div>

      {/* Conversation Analytics + Call Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <Panel title="Conversation Analytics" tooltip="How talk time is distributed between the customer and the agent.">
          <p className="text-[11px] text-zinc-500 mb-3">Talk Time Distribution</p>
          {totalTalk > 0 ? (
            <div className="grid grid-cols-[170px_1fr] gap-5 items-center">
              <div className="relative h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={talkDonut} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                      {talkDonut.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-2xl font-bold tabular-nums">{(totalTalk / 1000).toFixed(0)}s</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Talk Time</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    Customer Talk Time
                  </span>
                  <span className="font-semibold tabular-nums">{(talkTime.userMs / 1000).toFixed(1)}s ({userPct}%)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Agent Talk Time
                  </span>
                  <span className="font-semibold tabular-nums">{(talkTime.agentMs / 1000).toFixed(1)}s ({agentPct}%)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100">
                  <div className="bg-blue-50 rounded-lg p-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Customer Talk</div>
                    <div className="text-sm font-bold mt-0.5 tabular-nums">{(talkTime.userMs / 1000).toFixed(1)}s <span className="text-zinc-400 font-normal text-xs">{userPct}%</span></div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Agent Talk Time</div>
                    <div className="text-sm font-bold mt-0.5 tabular-nums">{(talkTime.agentMs / 1000).toFixed(1)}s <span className="text-zinc-400 font-normal text-xs">{agentPct}%</span></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No talk-time data available.</p>
          )}
        </Panel>

        <Panel title="Call Information">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <InfoRow icon={Bot} label="Agent" value={call.agent_name} />
            <InfoRow
              icon={Smile}
              label="Sentiment"
              value={
                <span className={`px-2 py-0.5 rounded text-xs ${
                  a?.sentiment?.overall === "positive" ? "bg-emerald-100 text-emerald-700" :
                  a?.sentiment?.overall === "negative" ? "bg-red-100 text-red-700" :
                  "bg-zinc-100 text-zinc-700"
                }`}>{overallSentimentLabel}</span>
              }
            />
            <InfoRow icon={Phone} label="Provider" value={<span className="capitalize">{call.provider}</span>} />
            <InfoRow
              icon={userMood?.icon || Meh}
              label="User Mood"
              value={
                userMood ? (
                  <span className={`px-2 py-0.5 rounded text-xs ${userMood.chip}`}>{userMood.label}</span>
                ) : <span className="text-zinc-400">â€”</span>
              }
            />
            <InfoRow
              icon={CheckCircle2}
              label="Outcome"
              value={
                outcomeSuccess === null ? <span className="text-zinc-400">â€”</span> :
                outcomeSuccess
                  ? <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">Success</span>
                  : <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">Failure</span>
              }
            />
            <InfoRow icon={Hash} label="Direction" value={<span className="capitalize">{(call.call_type || "â€”").replace(/_/g, " ")}</span>} />
            <InfoRow icon={Target} label="Intent" value={callOverview.intent || <span className="text-zinc-400">â€”</span>} />
            <InfoRow icon={Calendar} label="Date & Time" value={new Date(call.created_at).toLocaleString()} />
          </div>
        </Panel>
      </div>

      {/* Quality Scores + Latency Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <Panel title="Quality Score Breakdown" tooltip="LLM-judged sub-scores (0-100). Green â‰¥80, Amber 60-79, Red <60.">
          {a ? (
            <div className="space-y-3">
              {[...specScores
                .filter((s) => typeof (a.metrics as any)[s.key] === "number")
                .map((s) => ({ label: s.label, value: (a.metrics as any)[s.key] as number })),
                { label: "Overall Score", value: a.overallScore, isOverall: true } as any,
              ].map((r: any) => (
                <div key={r.label} className="grid grid-cols-[150px_1fr_40px] items-center gap-3 text-sm">
                  <div className={`truncate ${r.isOverall ? "font-semibold text-zinc-900" : "text-zinc-700"}`}>{r.label}</div>
                  <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${r.value}%`, background: scoreColor(r.value) }}
                    />
                  </div>
                  <div className="text-right font-semibold tabular-nums text-sm">{r.value}</div>
                </div>
              ))}
              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 pl-[150px] pr-[40px]">
                <span>0</span><span>50</span><span>100</span>
              </div>
            </div>
          ) : <p className="text-sm text-zinc-500">No analysis yet.</p>}
        </Panel>

        <Panel title="Turn-by-Turn Response Latency" tooltip="Per-turn latency. Time between user stop and agent start.">
          {latencyStats.count > 0 ? (
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Average Latency</div>
                  <div className="text-xl font-bold tabular-nums mt-0.5">{(latencyStats.avg / 1000).toFixed(1)}s</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Max Latency</div>
                  <div className="text-xl font-bold tabular-nums mt-0.5">{(latencyStats.max / 1000).toFixed(1)}s</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Min Latency</div>
                  <div className="text-xl font-bold tabular-nums mt-0.5">{(latencyStats.min / 1000).toFixed(1)}s</div>
                </div>
              </div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={latencyChartData} margin={{ top: 20, right: 8, left: 0, bottom: 16 }}>
                    <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="turn" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      label={{ value: "Latency (ms)", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#64748b" } }}
                    />
                    <ReTooltip
                      cursor={{ fill: "#f1f5f9" }}
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}
                      formatter={(v: any) => [`${v} ms`, "Latency"]}
                    />
                    <Bar dataKey="latency" radius={[3, 3, 0, 0]} fill="#3b82f6" label={{ position: "top", fontSize: 10, fill: "#475569", formatter: (v: any) => `${v} ms` }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : <p className="text-sm text-zinc-500">No latency data.</p>}
        </Panel>
      </div>

      {/* Issues + AI Recs + Security */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <Panel title="Top Issues Detected" tooltip="Issues the LLM judge flagged in this call.">
          {issues.length === 0 ? (
            <p className="text-sm text-zinc-500">No issues detected.</p>
          ) : (
            <div className="space-y-2">
              {issues.slice(0, 4).map((it, i) => {
                const bg = it.severity === "high" ? "bg-red-50 border-red-100" : it.severity === "medium" ? "bg-amber-50 border-amber-100" : "bg-zinc-50 border-zinc-100";
                const SevIcon = it.severity === "high" ? AlertCircle : AlertTriangle;
                const sevCol = it.severity === "high" ? "text-red-500" : it.severity === "medium" ? "text-amber-500" : "text-zinc-500";
                const sevPill = it.severity === "high" ? "bg-red-500 text-white" : it.severity === "medium" ? "bg-amber-500 text-white" : "bg-zinc-400 text-white";
                return (
                  <div key={i} className={`rounded-lg border p-3 ${bg}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${sevPill}`}>{it.severity}</span>
                      <SevIcon className={`h-3.5 w-3.5 ${sevCol}`} />
                      <span className="text-xs font-semibold capitalize">{it.type.replace(/[_-]/g, " ")}</span>
                    </div>
                    <p className="text-xs text-zinc-700 leading-snug">{it.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="AI Recommendations" tooltip="Suggestions from the LLM to improve this agent.">
          {a && a.promptSuggestions.length > 0 ? (
            <ul className="space-y-2.5">
              {a.promptSuggestions.slice(0, 5).map((p, i) => (
                <li key={i} className="flex gap-2 text-xs text-zinc-700 leading-snug">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-zinc-500">No recommendations.</p>}
        </Panel>

        <Panel title="Security & Compliance Checks" tooltip="Guardrail checks by the LLM judge.">
          <div className="grid grid-cols-2 gap-2">
            {securityFlags.map((f) => (
              <div
                key={f.label}
                className={`rounded-lg border p-2.5 flex flex-col items-center text-center ${
                  f.tripped ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
                }`}
              >
                <div className="text-[10px] font-semibold text-zinc-700 leading-tight mb-1.5 min-h-[24px] flex items-center justify-center">
                  {f.label}
                </div>
                {f.tripped ? (
                  <XCircle className="h-6 w-6 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                )}
                <div className={`text-[10px] font-bold mt-1 ${f.tripped ? "text-red-600" : "text-emerald-600"}`}>
                  {f.tripped ? "Flagged" : "Clean"}
                </div>
              </div>
            ))}
          </div>
          {typeof a?.compliance?.score === "number" && (
            <div className="mt-3 pt-3 border-t border-zinc-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-600">Policy Compliance Score</span>
                <span className="font-bold tabular-nums">{a.compliance.score}/100</span>
              </div>
              <div className="h-1.5 bg-zinc-100 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${a.compliance.score}%`, background: scoreColor(a.compliance.score) }} />
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Data Capture Validation - phone/date/currency/card/email mismatches */}
      {a?.dataCapture && (a.dataCapture.totalChecked > 0 || a.dataCapture.fields.length > 0) && (
        <Panel
          title="Data Capture Validation"
          tooltip="Compares what the user said vs what the agent confirmed back for structured fields (phone, date, currency, card, email, OTP, etc)."
        >
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold tabular-nums ${
                a.dataCapture.validationScore >= 90 ? "text-emerald-600" :
                a.dataCapture.validationScore >= 70 ? "text-amber-600" : "text-red-600"
              }`}>
                {a.dataCapture.validationScore}<span className="text-sm text-zinc-400">/100</span>
              </div>
              <div className="text-xs text-zinc-600 leading-tight">
                <div><span className="font-semibold">{a.dataCapture.totalChecked}</span> fields checked</div>
                <div className={a.dataCapture.mismatchCount > 0 ? "text-red-600 font-semibold" : "text-emerald-600"}>
                  {a.dataCapture.mismatchCount} mismatch{a.dataCapture.mismatchCount === 1 ? "" : "es"}
                </div>
              </div>
            </div>
          </div>
          {a.dataCapture.fields.length === 0 ? (
            <p className="text-sm text-zinc-500">No structured values confirmed back in this call.</p>
          ) : (
            <div className="space-y-2">
              {a.dataCapture.fields.map((f, i) => {
                const ok = f.match;
                const sevPill = !ok
                  ? (f.severity === "critical" ? "bg-red-500" : f.severity === "major" ? "bg-amber-500" : "bg-zinc-400")
                  : "bg-emerald-500";
                return (
                  <div key={i} className={`rounded-lg border p-3 ${ok ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded text-white ${sevPill}`}>
                        {ok ? "Match" : f.severity}
                      </span>
                      <span className="text-xs font-semibold capitalize">{f.fieldLabel || f.fieldType}</span>
                      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-white/70 rounded p-2 border border-zinc-100">
                        <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">1. User said</div>
                        <div className="text-zinc-800 font-mono break-all">{f.userSaid || "—"}</div>
                      </div>
                      <div className="bg-white/70 rounded p-2 border border-zinc-100">
                        <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">2. ASR captured</div>
                        <div className="text-zinc-800 font-mono break-all">{f.asrCaptured || "—"}</div>
                      </div>
                      <div className={`bg-white/70 rounded p-2 border ${ok ? "border-emerald-200" : "border-red-200"}`}>
                        <div className={`text-[9px] uppercase tracking-wider font-semibold mb-0.5 ${ok ? "text-emerald-600" : "text-red-600"}`}>3. Agent confirmed</div>
                        <div className={`font-mono break-all ${ok ? "text-emerald-800" : "text-red-700 font-bold"}`}>{f.agentConfirmed || "—"}</div>
                      </div>
                    </div>
                    {!ok && f.explanation && (
                      <p className="text-[11px] text-red-700 mt-2 leading-snug">{f.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {/* Voice Quality Analytics */}
      <Panel title="Voice Quality Analytics" tooltip="Audio-derived metrics. Click Analyze Audio to compute from the recording.">
        {!call.recording_url ? (
          <p className="text-sm text-zinc-500">Recording not available for this call.</p>
        ) : !audioMetrics ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">{audioError || "Click Analyze Audio to compute voice-quality metrics from the recording."}</p>
            <Button size="sm" variant="outline" onClick={handleAnalyzeAudio} disabled={audioAnalyzing}>
              {audioAnalyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Mic className="h-3.5 w-3.5 mr-1.5" />}
              Analyze Audio
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3 items-center">
            {/* Pitch gauge */}
            <GaugeStat label="Pitch Consistency" value={audioMetrics.pitch?.consistencyScore || 0} max={100} color="#8b5cf6" suffix="/100" />
            {/* TTS gauge */}
            <GaugeStat label="TTS Naturalness" value={audioMetrics.tts?.score || 0} max={100} color="#10b981" suffix="/100" />
            <MiniStat label="Mean Centroid" value={`${Math.round(audioMetrics.pitch?.meanCentroidHz || 0)} Hz`} />
            <MiniStat label="Stddev" value={`${Math.round(audioMetrics.pitch?.stddevCentroidHz || 0)} Hz`} />
            <MiniStat label="Speaking Rate" value={`${audioMetrics.tts?.signals?.wordsPerMinute || "â€”"} WPM`} />
            <MiniStat label="Pause Segments" value={audioMetrics.tts?.signals?.pauseSegments ?? "â€”"} />
            <MiniStat label="Avg Sentence Length" value={`${audioMetrics.tts?.signals?.averageSegmentChars || "â€”"} chars`} />
          </div>
        )}
      </Panel>

      {/* Conversation Timeline (horizontal player + transcript below) */}
      <Panel title="Conversation Timeline" tooltip="Horizontal dual-lane waveform (agent above, user below). Purple markers show response latency between consecutive speakers. Transcript shown below the player.">
        {!call.recording_url ? (
          <p className="text-sm text-zinc-500">Recording not available for this call.</p>
        ) : !recordingUrl ? (
          <p className="text-xs text-zinc-500 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading recordingâ€¦</p>
        ) : (
          <HorizontalConversationTimeline
            recordingUrl={recordingUrl}
            transcript={call.transcript}
            callStartMs={startMs}
            durationSeconds={call.duration_seconds || 0}
            toTimelineMs={toTimelineMs}
          />
        )}
      </Panel>
    </div>
  );
}

function TranscriptLane({
  turnIntervals,
  totalH,
  yAt,
  fmt,
}: {
  turnIntervals: { role: "user" | "agent"; start: number; end: number; entry: TranscriptEntry }[];
  totalH: number;
  yAt: (t: number) => number;
  fmt: (s: number) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [positions, setPositions] = useState<{ top: number; anchor: number }[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      const heights = cardRefs.current.map((el) => (el ? el.offsetHeight : 36));
      const GAP = 6;
      const anchors = turnIntervals.map((iv) => yAt(iv.start));
      const tops: number[] = [];
      let lastBottom = 0;
      for (let i = 0; i < turnIntervals.length; i++) {
        const ideal = anchors[i];
        const top = Math.max(ideal, lastBottom + GAP);
        tops.push(top);
        lastBottom = top + heights[i];
      }
      const next = tops.map((t, i) => ({ top: t, anchor: anchors[i] }));
      // Avoid infinite update loop: only set if changed
      setPositions((prev) => {
        if (prev.length !== next.length) return next;
        for (let i = 0; i < next.length; i++) {
          if (Math.abs(prev[i].top - next[i].top) > 0.5) return next;
        }
        return prev;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    cardRefs.current.forEach((el) => el && ro.observe(el));
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [turnIntervals, yAt]);

  const laneH = Math.max(
    totalH,
    positions.length ? positions[positions.length - 1].top + 80 : totalH
  );

  return (
    <div ref={containerRef} className="relative" style={{ height: laneH }}>
      <svg
        width="100%"
        height={laneH}
        className="absolute inset-0 pointer-events-none"
        style={{ overflow: "visible" }}
      >
        {positions.map((p, i) => {
          if (Math.abs(p.top - p.anchor) < 2) return null;
          return (
            <line
              key={i}
              x1={8}
              y1={p.anchor}
              x2={16}
              y2={p.top + 14}
              stroke="#d4d4d8"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          );
        })}
      </svg>

      {turnIntervals.map((iv, i) => {
        const isAgent = iv.role === "agent";
        const top = positions[i]?.top ?? yAt(iv.start);
        return (
          <div
            key={i}
            ref={(el) => { cardRefs.current[i] = el; }}
            className="absolute left-0 right-0 px-4"
            style={{ top }}
          >
            <div
              className={`rounded-md border px-3 py-2 ${
                isAgent
                  ? "border-emerald-100 bg-emerald-50/40"
                  : "border-blue-100 bg-blue-50/40"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isAgent ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {isAgent ? <Bot className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                  {isAgent ? "AGENT" : "USER"}
                </span>
                <span className="text-[10px] font-mono tabular-nums text-zinc-500">
                  {fmt(iv.start)}
                </span>
                <span className="text-[10px] text-zinc-400">
                  Â· {(iv.end - iv.start).toFixed(1)}s
                </span>
              </div>
              <p className="text-sm text-zinc-800 leading-snug">{iv.entry.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalConversationTimeline({
  recordingUrl,
  transcript,
  callStartMs,
  durationSeconds,
  toTimelineMs,
}: {
  recordingUrl: string;
  transcript: TranscriptEntry[];
  callStartMs: number | null;
  durationSeconds: number;
  toTimelineMs: (v: unknown) => number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [containerW, setContainerW] = useState(800);

  const NUM_BUCKETS = 1600;

  useEffect(() => {
    if (!recordingUrl) return;
    let cancelled = false;
    setDecoding(true);
    setDecodeError(null);
    (async () => {
      try {
        const res = await fetch(recordingUrl);
        const buf = await res.arrayBuffer();
        const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) throw new Error("Web Audio API not supported");
        const ctx = new Ctx();
        const audio = await ctx.decodeAudioData(buf.slice(0));
        const channels = audio.numberOfChannels;
        const len = audio.length;
        const mono = new Float32Array(len);
        for (let c = 0; c < channels; c++) {
          const ch = audio.getChannelData(c);
          for (let i = 0; i < len; i++) mono[i] += ch[i] / channels;
        }
        const bucketSize = Math.max(1, Math.floor(len / NUM_BUCKETS));
        const p = new Float32Array(NUM_BUCKETS);
        for (let i = 0; i < NUM_BUCKETS; i++) {
          let sum = 0;
          const s = i * bucketSize;
          const e = Math.min(s + bucketSize, len);
          for (let j = s; j < e; j++) sum += mono[j] * mono[j];
          p[i] = Math.sqrt(sum / Math.max(1, e - s));
        }
        let max = 0;
        for (let i = 0; i < p.length; i++) if (p[i] > max) max = p[i];
        if (max > 0) for (let i = 0; i < p.length; i++) p[i] = p[i] / max;
        if (!cancelled) {
          setPeaks(p);
          setAudioDuration(audio.duration);
        }
        ctx.close();
      } catch (e: any) {
        if (!cancelled) setDecodeError(e?.message || "Failed to decode audio");
      } finally {
        if (!cancelled) setDecoding(false);
      }
    })();
    return () => { cancelled = true; };
  }, [recordingUrl]);

  // Measure available width
  useEffect(() => {
    if (!wrapRef.current) return;
    const measure = () => setContainerW(Math.max(320, wrapRef.current!.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Build turn intervals with timestamp interpolation
  const { turnIntervals, totalDur } = useMemo(() => {
    const startMs = callStartMs;
    const toSec = (ts: unknown): number | null => {
      const ms = toTimelineMs(ts);
      if (ms === null) return null;
      if (ms < 100000) return Math.max(0, ms / 1000);
      if (startMs) return Math.max(0, (ms - startMs) / 1000);
      return ms / 1000;
    };
    const raw = transcript
      .map((t, i) => ({ entry: t, role: t.role, startSec: toSec(t.timestamp), idx: i }))
      .filter((t) => t.role === "user" || t.role === "agent");

    const dur =
      audioDuration ||
      durationSeconds ||
      (raw.length ? Math.max(...raw.map((t) => t.startSec ?? 0)) + 3 : 0);

    const filled: { entry: TranscriptEntry; role: "user" | "agent"; startSec: number; idx: number }[] = [];
    let lastKnown = 0;
    let lastKnownIdx = -1;
    for (let i = 0; i < raw.length; i++) {
      const cur = raw[i];
      if (cur.startSec !== null) {
        lastKnown = cur.startSec;
        lastKnownIdx = i;
        filled.push({ entry: cur.entry, role: cur.role as any, startSec: cur.startSec, idx: cur.idx });
        continue;
      }
      let nextIdx = -1;
      let nextVal = dur;
      for (let j = i + 1; j < raw.length; j++) {
        if (raw[j].startSec !== null) { nextIdx = j; nextVal = raw[j].startSec as number; break; }
      }
      const gap = nextIdx === -1 ? dur - lastKnown : nextVal - lastKnown;
      const slots = (nextIdx === -1 ? raw.length : nextIdx) - lastKnownIdx;
      const offset = (i - lastKnownIdx) / Math.max(1, slots);
      const interp = Math.max(0, lastKnown + gap * offset);
      filled.push({ entry: cur.entry, role: cur.role as any, startSec: interp, idx: cur.idx });
    }
    filled.sort((a, b) => a.startSec - b.startSec);
    const intervals = filled.map((t, i) => ({
      role: t.role,
      start: t.startSec,
      end: i + 1 < filled.length ? filled[i + 1].startSec : dur,
      entry: t.entry,
      idx: t.idx,
    }));
    return { turnIntervals: intervals, totalDur: dur };
  }, [transcript, callStartMs, audioDuration, durationSeconds, toTimelineMs]);

  // Audio-VAD voiced regions
  const voicedRegions = useMemo(() => {
    if (!peaks || totalDur <= 0) return [] as { start: number; end: number }[];
    const N = peaks.length;
    const dt = totalDur / N;
    const sorted = Array.from(peaks).filter((v) => v > 0.005).sort((a, b) => a - b);
    const thresh = sorted.length ? Math.max(0.04, sorted[Math.floor(sorted.length * 0.4)] * 0.55) : 0.05;
    const minRun = Math.max(2, Math.round(0.15 / dt));
    const gapMerge = Math.max(2, Math.round(0.25 / dt));
    const out: { start: number; end: number }[] = [];
    let i = 0;
    while (i < N) {
      if (peaks[i] >= thresh) {
        let j = i;
        while (j < N) {
          if (peaks[j] >= thresh) { j++; continue; }
          let k = j;
          while (k < N && peaks[k] < thresh) k++;
          if (k - j <= gapMerge && k < N) { j = k; continue; }
          break;
        }
        if (j - i >= minRun) out.push({ start: i * dt, end: j * dt });
        i = j;
      } else i++;
    }
    return out;
  }, [peaks, totalDur]);

  const latencyMarkers = useMemo(() => {
    if (!voicedRegions.length || !turnIntervals.length) return [] as { from: "agent" | "user"; to: "agent" | "user"; tStart: number; tEnd: number; latencyMs: number }[];
    const roleAt = (t: number): "user" | "agent" | null => {
      for (const iv of turnIntervals) if (t >= iv.start && t < iv.end) return iv.role;
      return null;
    };
    const labeled = voicedRegions.map((r) => {
      const mid = (r.start + r.end) / 2;
      const role = roleAt(mid) || roleAt(r.start) || roleAt(r.end);
      return { ...r, role };
    });
    const out: { from: "agent" | "user"; to: "agent" | "user"; tStart: number; tEnd: number; latencyMs: number }[] = [];
    for (let k = 1; k < labeled.length; k++) {
      const prev = labeled[k - 1];
      const cur = labeled[k];
      if (!prev.role || !cur.role || prev.role === cur.role) continue;
      const lat = (cur.start - prev.end) * 1000;
      if (lat < 50 || lat > 8000) continue;
      out.push({
        from: prev.role as any,
        to: cur.role as any,
        tStart: prev.end,
        tEnd: cur.start,
        latencyMs: Math.round(lat),
      });
    }
    return out;
  }, [voicedRegions, turnIntervals]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play().catch(() => {});
  };
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onPause);
    };
  }, [recordingUrl]);

  // Layout
  const safeDur = totalDur || 1;
  // try to fit; allow horizontal scroll if call is too long for nice resolution
  const minPxPerSec = 30;
  const desiredPxPerSec = Math.max(minPxPerSec, Math.min(80, containerW / safeDur));
  const innerW = Math.max(containerW, Math.round(safeDur * desiredPxPerSec));
  const TOP_PAD = 18;
  const AGENT_H = 70;
  const GAP_LANE = 26; // space for latency arrows
  const USER_H = 70;
  const BOT_PAD = 22; // time ruler
  const totalH = TOP_PAD + AGENT_H + GAP_LANE + USER_H + BOT_PAD;
  const AGENT_CY = TOP_PAD + AGENT_H / 2;
  const USER_CY = TOP_PAD + AGENT_H + GAP_LANE + USER_H / 2;
  const AGENT_BOTTOM = TOP_PAD + AGENT_H;
  const USER_TOP = TOP_PAD + AGENT_H + GAP_LANE;
  const LANE_HALF = 30;

  const xAt = (t: number) => Math.max(0, Math.min(innerW, (t / safeDur) * innerW));

  const speakerAt = (t: number): "user" | "agent" | null => {
    for (const iv of turnIntervals) if (t >= iv.start && t < iv.end) return iv.role;
    return null;
  };

  const bucketCols = peaks
    ? Array.from({ length: peaks.length }, (_, i) => {
        const t = (i / peaks.length) * safeDur;
        const next = ((i + 1) / peaks.length) * safeDur;
        return { t, x: xAt(t), w: Math.max(1, xAt(next) - xAt(t)), amp: peaks[i] };
      })
    : [];

  const tickStep = safeDur > 300 ? 60 : safeDur > 120 ? 20 : safeDur > 60 ? 10 : safeDur > 30 ? 5 : 2;
  const ticks: number[] = [];
  for (let t = 0; t <= safeDur; t += tickStep) ticks.push(t);

  const seekX = (clientX: number, rectLeft: number) => {
    const a = audioRef.current;
    if (!a) return;
    const ratio = (clientX - rectLeft) / innerW;
    a.currentTime = Math.max(0, Math.min(safeDur, ratio * safeDur));
  };

  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const avgLatency = latencyMarkers.length
    ? Math.round(latencyMarkers.reduce((s, m) => s + m.latencyMs, 0) / latencyMarkers.length)
    : null;

  // Auto-scroll horizontally so playhead stays in view
  useEffect(() => {
    if (!scrollRef.current || !playing) return;
    const sc = scrollRef.current;
    const x = xAt(currentTime);
    const left = sc.scrollLeft;
    const vw = sc.clientWidth;
    if (x < left + 60 || x > left + vw - 120) {
      sc.scrollTo({ left: Math.max(0, x - vw / 2), behavior: "smooth" });
    }
  }, [currentTime, playing, innerW]);

  return (
    <div ref={wrapRef} className="w-full min-w-0 max-w-full overflow-hidden">
      <audio ref={audioRef} src={recordingUrl} preload="metadata" className="hidden" />

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Button size="sm" variant="outline" onClick={togglePlay} disabled={!peaks} className="h-8 px-3">
          {playing ? <Pause className="h-3.5 w-3.5 mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
          {playing ? "Pause" : "Play"}
        </Button>
        <div className="text-xs text-zinc-600 font-mono tabular-nums">
          {fmt(currentTime)} <span className="text-zinc-400">/</span> {fmt(safeDur)}
        </div>
        <div className="flex items-center gap-3 text-[11px] ml-2">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" />
            <span className="text-zinc-600">Agent</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-blue-500" />
            <span className="text-zinc-600">User</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-violet-500" />
            <span className="text-zinc-600">Response Latency</span>
          </span>
        </div>
        {avgLatency !== null && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">Avg Response</span>
            <span className="font-bold tabular-nums text-violet-600 text-sm">{avgLatency} ms</span>
            <span className="text-zinc-400">Â·</span>
            <span className="text-zinc-500 tabular-nums">{latencyMarkers.length} gaps</span>
          </div>
        )}
      </div>

      {decoding && (
        <p className="text-xs text-zinc-500 flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Decoding audio for waveformâ€¦
        </p>
      )}
      {decodeError && <p className="text-xs text-rose-500">{decodeError}</p>}

      {peaks && (
        <div
          ref={scrollRef}
          className="rounded-lg border border-zinc-200 bg-white overflow-x-auto overflow-y-hidden"
        >
          <svg
            width={innerW}
            height={totalH}
            onClick={(e) => seekX(e.clientX, (e.currentTarget as SVGSVGElement).getBoundingClientRect().left)}
            style={{ display: "block", cursor: "pointer" }}
          >
            <defs>
              <marker id="hctArrL" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M10,0 L0,5 L10,10 Z" fill="#7c3aed" />
              </marker>
              <marker id="hctArrR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#7c3aed" />
              </marker>
            </defs>

            {/* Lane backgrounds */}
            <rect x={0} y={TOP_PAD} width={innerW} height={AGENT_H} fill="#f0fdf4" />
            <rect x={0} y={USER_TOP} width={innerW} height={USER_H} fill="#eff6ff" />

            {/* Lane labels */}
            <text x={6} y={TOP_PAD + 11} fontSize={10} fontWeight={700} fill="#047857">AGENT</text>
            <text x={6} y={USER_TOP + 11} fontSize={10} fontWeight={700} fill="#1d4ed8">USER</text>

            {/* Lane center lines */}
            <line x1={0} y1={AGENT_CY} x2={innerW} y2={AGENT_CY} stroke="#86efac" strokeWidth={1} />
            <line x1={0} y1={USER_CY} x2={innerW} y2={USER_CY} stroke="#93c5fd" strokeWidth={1} />

            {/* Waveform bars (mirrored vertically per lane) */}
            {bucketCols.map((b, i) => {
              const sp = speakerAt(b.t);
              if (!sp) return null;
              if (b.amp < 0.04) return null;
              const h = b.amp * LANE_HALF;
              const cy = sp === "agent" ? AGENT_CY : USER_CY;
              const color = sp === "agent" ? "#10b981" : "#3b82f6";
              return <rect key={i} x={b.x} y={cy - h} width={b.w} height={h * 2} fill={color} />;
            })}

            {/* Latency markers between lanes (diagonal connector) */}
            {latencyMarkers.map((m, i) => {
              const x1 = xAt(m.tStart);
              const x2 = xAt(m.tEnd);
              const xMid = (x1 + x2) / 2;
              const yMid = (AGENT_BOTTOM + USER_TOP) / 2;
              const fromAgent = m.from === "agent";
              const yStart = fromAgent ? AGENT_BOTTOM : USER_TOP;
              const yEnd = fromAgent ? USER_TOP : AGENT_BOTTOM;
              return (
                <g key={i}>
                  <line x1={x1} y1={yStart} x2={x1} y2={yMid} stroke="#7c3aed" strokeWidth={1} strokeDasharray="3 3" />
                  <line x1={x2} y1={yMid} x2={x2} y2={yEnd} stroke="#7c3aed" strokeWidth={1} strokeDasharray="3 3" />
                  <line
                    x1={x1 + 1}
                    y1={yMid}
                    x2={x2 - 1}
                    y2={yMid}
                    stroke="#7c3aed"
                    strokeWidth={1.6}
                    markerStart="url(#hctArrL)"
                    markerEnd="url(#hctArrR)"
                  />
                  <rect x={xMid - 24} y={yMid - 8} width={48} height={14} rx={3} fill="#faf5ff" stroke="#7c3aed" strokeWidth={0.6} />
                  <text x={xMid} y={yMid + 3} textAnchor="middle" fontSize={9} fill="#6d28d9" fontWeight={700}>
                    {m.latencyMs} ms
                  </text>
                </g>
              );
            })}

            {/* Time ruler */}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={xAt(t)} y1={totalH - BOT_PAD} x2={xAt(t)} y2={totalH - BOT_PAD + 4} stroke="#d4d4d8" />
                <text x={xAt(t) + 2} y={totalH - 6} fontSize={9} fill="#71717a">{t}s</text>
              </g>
            ))}

            {/* Playhead */}
            <line x1={xAt(currentTime)} y1={0} x2={xAt(currentTime)} y2={totalH} stroke="#ef4444" strokeWidth={1.5} />
            <circle cx={xAt(currentTime)} cy={4} r={3} fill="#ef4444" />
          </svg>
        </div>
      )}

      {/* Transcript section below the player */}
      <div className="mt-4 rounded-lg border border-zinc-200 bg-white">
        <div className="px-4 py-2 border-b border-zinc-200 flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Transcript</span>
          <span className="text-[10px] text-zinc-400">{turnIntervals.length} turns</span>
        </div>
        <div className="divide-y divide-zinc-100 max-h-[480px] overflow-y-auto">
          {turnIntervals.length === 0 && (
            <div className="px-4 py-6 text-sm text-zinc-500">No transcript available.</div>
          )}
          {turnIntervals.map((iv, i) => {
            const isAgent = iv.role === "agent";
            const isActive = currentTime >= iv.start && currentTime < iv.end;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const a = audioRef.current;
                  if (a) a.currentTime = iv.start;
                }}
                className={`w-full text-left px-4 py-3 transition-colors hover:bg-zinc-50 ${
                  isActive ? (isAgent ? "bg-emerald-50/60" : "bg-blue-50/60") : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isAgent ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isAgent ? <Bot className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                    {isAgent ? "AGENT" : "USER"}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-zinc-500">{fmt(iv.start)}</span>
                  <span className="text-[10px] text-zinc-400">Â· {(iv.end - iv.start).toFixed(1)}s</span>
                </div>
                <p className="text-sm text-zinc-800 leading-snug">{iv.entry.content}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function VerticalConversationTimeline({
  recordingUrl,
  transcript,
  callStartMs,
  durationSeconds,
  toTimelineMs,
}: {
  recordingUrl: string;
  transcript: TranscriptEntry[];
  callStartMs: number | null;
  durationSeconds: number;
  toTimelineMs: (v: unknown) => number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const NUM_BUCKETS = 1200;

  useEffect(() => {
    if (!recordingUrl) return;
    let cancelled = false;
    setDecoding(true);
    setDecodeError(null);
    (async () => {
      try {
        const res = await fetch(recordingUrl);
        const buf = await res.arrayBuffer();
        const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) throw new Error("Web Audio API not supported");
        const ctx = new Ctx();
        const audio = await ctx.decodeAudioData(buf.slice(0));
        // Average all channels into mono for amplitude
        const channels = audio.numberOfChannels;
        const len = audio.length;
        const mono = new Float32Array(len);
        for (let c = 0; c < channels; c++) {
          const ch = audio.getChannelData(c);
          for (let i = 0; i < len; i++) mono[i] += ch[i] / channels;
        }
        const bucketSize = Math.max(1, Math.floor(len / NUM_BUCKETS));
        const p = new Float32Array(NUM_BUCKETS);
        for (let i = 0; i < NUM_BUCKETS; i++) {
          let sum = 0;
          const s = i * bucketSize;
          const e = Math.min(s + bucketSize, len);
          for (let j = s; j < e; j++) sum += mono[j] * mono[j];
          p[i] = Math.sqrt(sum / Math.max(1, e - s));
        }
        let max = 0;
        for (let i = 0; i < p.length; i++) if (p[i] > max) max = p[i];
        if (max > 0) for (let i = 0; i < p.length; i++) p[i] = p[i] / max;
        if (!cancelled) {
          setPeaks(p);
          setAudioDuration(audio.duration);
        }
        ctx.close();
      } catch (e: any) {
        if (!cancelled) setDecodeError(e?.message || "Failed to decode audio");
      } finally {
        if (!cancelled) setDecoding(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recordingUrl]);

  // Build turn intervals with timestamp interpolation
  const { turnIntervals, totalDur } = useMemo(() => {
    const startMs = callStartMs;
    const toSec = (ts: unknown): number | null => {
      const ms = toTimelineMs(ts);
      if (ms === null) return null;
      if (ms < 100000) return Math.max(0, ms / 1000);
      if (startMs) return Math.max(0, (ms - startMs) / 1000);
      return ms / 1000;
    };
    const raw = transcript
      .map((t, i) => ({ entry: t, role: t.role, startSec: toSec(t.timestamp), idx: i }))
      .filter((t) => t.role === "user" || t.role === "agent");

    const dur =
      audioDuration ||
      durationSeconds ||
      (raw.length ? Math.max(...raw.map((t) => t.startSec ?? 0)) + 3 : 0);

    const filled: { entry: TranscriptEntry; role: "user" | "agent"; startSec: number; idx: number }[] = [];
    let lastKnown = 0;
    let lastKnownIdx = -1;
    for (let i = 0; i < raw.length; i++) {
      const cur = raw[i];
      if (cur.startSec !== null) {
        lastKnown = cur.startSec;
        lastKnownIdx = i;
        filled.push({ entry: cur.entry, role: cur.role as any, startSec: cur.startSec, idx: cur.idx });
        continue;
      }
      let nextIdx = -1;
      let nextVal = dur;
      for (let j = i + 1; j < raw.length; j++) {
        if (raw[j].startSec !== null) { nextIdx = j; nextVal = raw[j].startSec as number; break; }
      }
      const gap = nextIdx === -1 ? dur - lastKnown : nextVal - lastKnown;
      const slots = (nextIdx === -1 ? raw.length : nextIdx) - lastKnownIdx;
      const offset = (i - lastKnownIdx) / Math.max(1, slots);
      const interp = Math.max(0, lastKnown + gap * offset);
      filled.push({ entry: cur.entry, role: cur.role as any, startSec: interp, idx: cur.idx });
    }
    filled.sort((a, b) => a.startSec - b.startSec);
    const intervals = filled.map((t, i) => ({
      role: t.role,
      start: t.startSec,
      end: i + 1 < filled.length ? filled[i + 1].startSec : dur,
      entry: t.entry,
      idx: t.idx,
    }));
    return { turnIntervals: intervals, totalDur: dur };
  }, [transcript, callStartMs, audioDuration, durationSeconds, toTimelineMs]);

  // Audio-VAD voiced regions for accurate latency
  const voicedRegions = useMemo(() => {
    if (!peaks || totalDur <= 0) return [] as { start: number; end: number }[];
    const N = peaks.length;
    const dt = totalDur / N;
    const sorted = Array.from(peaks).filter((v) => v > 0.005).sort((a, b) => a - b);
    const thresh = sorted.length ? Math.max(0.04, sorted[Math.floor(sorted.length * 0.4)] * 0.55) : 0.05;
    const minRun = Math.max(2, Math.round(0.15 / dt));
    const gapMerge = Math.max(2, Math.round(0.25 / dt));
    const out: { start: number; end: number }[] = [];
    let i = 0;
    while (i < N) {
      if (peaks[i] >= thresh) {
        let j = i;
        while (j < N) {
          if (peaks[j] >= thresh) { j++; continue; }
          let k = j;
          while (k < N && peaks[k] < thresh) k++;
          if (k - j <= gapMerge && k < N) { j = k; continue; }
          break;
        }
        if (j - i >= minRun) out.push({ start: i * dt, end: j * dt });
        i = j;
      } else i++;
    }
    return out;
  }, [peaks, totalDur]);

  // Latency markers: silence gap between consecutive voiced regions belonging to
  // different speakers (per transcript role lookup at region midpoint).
  const latencyMarkers = useMemo(() => {
    if (!voicedRegions.length || !turnIntervals.length) return [] as { from: "agent" | "user"; to: "agent" | "user"; tStart: number; tEnd: number; latencyMs: number }[];
    const roleAt = (t: number): "user" | "agent" | null => {
      for (const iv of turnIntervals) if (t >= iv.start && t < iv.end) return iv.role;
      return null;
    };
    const labeled = voicedRegions.map((r) => {
      const mid = (r.start + r.end) / 2;
      const role = roleAt(mid) || roleAt(r.start) || roleAt(r.end);
      return { ...r, role };
    });
    const out: { from: "agent" | "user"; to: "agent" | "user"; tStart: number; tEnd: number; latencyMs: number }[] = [];
    for (let k = 1; k < labeled.length; k++) {
      const prev = labeled[k - 1];
      const cur = labeled[k];
      if (!prev.role || !cur.role || prev.role === cur.role) continue;
      const lat = (cur.start - prev.end) * 1000;
      if (lat < 50 || lat > 8000) continue;
      out.push({
        from: prev.role as any,
        to: cur.role as any,
        tStart: prev.end,
        tEnd: cur.start,
        latencyMs: Math.round(lat),
      });
    }
    return out;
  }, [voicedRegions, turnIntervals]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play().catch(() => {});
  };
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onPause);
    };
  }, [recordingUrl]);

  // Vertical scale: pxPerSec; clamp total height
  const safeDur = totalDur || 1;
  const pxPerSec = Math.max(18, Math.min(48, 900 / safeDur));
  const totalH = Math.max(560, Math.round(safeDur * pxPerSec));
  const yAt = (t: number) => Math.max(0, Math.min(totalH, t * pxPerSec));

  // SVG layout for left timeline column
  const AGENT_W = 56;
  const USER_W = 56;
  const GAP = 24;
  const LEFT_PAD = 36; // ruler labels
  const RIGHT_PAD = 10;
  const SVG_W = LEFT_PAD + AGENT_W + GAP + USER_W + RIGHT_PAD;
  const AGENT_CX = LEFT_PAD + AGENT_W / 2;
  const USER_CX = LEFT_PAD + AGENT_W + GAP + USER_W / 2;
  const LANE_HALF = 22;

  // Bucket -> position
  const bucketRows = peaks
    ? Array.from({ length: peaks.length }, (_, i) => {
        const t = (i / peaks.length) * safeDur;
        const next = ((i + 1) / peaks.length) * safeDur;
        return { t, y: yAt(t), h: Math.max(1, yAt(next) - yAt(t)), amp: peaks[i] };
      })
    : [];

  const speakerAt = (t: number): "user" | "agent" | null => {
    for (const iv of turnIntervals) if (t >= iv.start && t < iv.end) return iv.role;
    return null;
  };

  const ticks: number[] = [];
  const tickStep = safeDur > 300 ? 60 : safeDur > 120 ? 20 : safeDur > 60 ? 10 : safeDur > 30 ? 5 : 2;
  for (let t = 0; t <= safeDur; t += tickStep) ticks.push(t);

  const seekY = (clientY: number, rectTop: number) => {
    const a = audioRef.current;
    if (!a) return;
    const ratio = (clientY - rectTop) / totalH;
    a.currentTime = Math.max(0, Math.min(safeDur, ratio * safeDur));
  };

  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const avgLatency = latencyMarkers.length
    ? Math.round(latencyMarkers.reduce((s, m) => s + m.latencyMs, 0) / latencyMarkers.length)
    : null;

  // Auto-scroll so playhead stays in view
  useEffect(() => {
    if (!scrollRef.current || !playing) return;
    const sc = scrollRef.current;
    const y = yAt(currentTime);
    const top = sc.scrollTop;
    const vh = sc.clientHeight;
    if (y < top + 40 || y > top + vh - 80) {
      sc.scrollTo({ top: Math.max(0, y - vh / 2), behavior: "smooth" });
    }
  }, [currentTime, playing]);

  return (
    <div>
      <audio ref={audioRef} src={recordingUrl} preload="metadata" className="hidden" />

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Button size="sm" variant="outline" onClick={togglePlay} disabled={!peaks} className="h-8 px-3">
          {playing ? <Pause className="h-3.5 w-3.5 mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
          {playing ? "Pause" : "Play"}
        </Button>
        <div className="text-xs text-zinc-600 font-mono tabular-nums">
          {fmt(currentTime)} <span className="text-zinc-400">/</span> {fmt(safeDur)}
        </div>
        <div className="flex items-center gap-3 text-[11px] ml-2">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" />
            <span className="text-zinc-600">Agent</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-blue-500" />
            <span className="text-zinc-600">User</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-violet-500" />
            <span className="text-zinc-600">Response Latency</span>
          </span>
        </div>
        {avgLatency !== null && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">Avg Response</span>
            <span className="font-bold tabular-nums text-violet-600 text-sm">{avgLatency} ms</span>
            <span className="text-zinc-400">Â·</span>
            <span className="text-zinc-500 tabular-nums">{latencyMarkers.length} gaps</span>
          </div>
        )}
      </div>

      {decoding && (
        <p className="text-xs text-zinc-500 flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Decoding audio for waveformâ€¦
        </p>
      )}
      {decodeError && <p className="text-xs text-rose-500">{decodeError}</p>}

      {peaks && (
        <div ref={scrollRef} className="rounded-lg border border-zinc-200 bg-white max-h-[640px] overflow-y-auto">
          <div className="flex" style={{ minHeight: totalH }}>
            {/* Left column: vertical SVG timeline */}
            <div className="relative shrink-0 border-r border-zinc-200 bg-zinc-50/30" style={{ width: SVG_W }}>
              {/* Sticky lane headers */}
              <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-2 py-1.5 flex items-center" style={{ width: SVG_W }}>
                <div style={{ width: LEFT_PAD }} />
                <div style={{ width: AGENT_W }} className="text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Agent</span>
                </div>
                <div style={{ width: GAP }} />
                <div style={{ width: USER_W }} className="text-center">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">User</span>
                </div>
              </div>
              <svg
                width={SVG_W}
                height={totalH}
                onClick={(e) => seekY(e.clientY, (e.currentTarget as SVGSVGElement).getBoundingClientRect().top)}
                style={{ display: "block", cursor: "pointer" }}
              >
                <defs>
                  <marker id="vctArrU" viewBox="0 0 10 10" refX="5" refY="1" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M0,10 L5,0 L10,10 Z" fill="#7c3aed" />
                  </marker>
                  <marker id="vctArrD" viewBox="0 0 10 10" refX="5" refY="9" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M0,0 L5,10 L10,0 Z" fill="#7c3aed" />
                  </marker>
                </defs>

                {/* Lane center lines */}
                <line x1={AGENT_CX} y1={0} x2={AGENT_CX} y2={totalH} stroke="#86efac" strokeWidth={1} />
                <line x1={USER_CX} y1={0} x2={USER_CX} y2={totalH} stroke="#93c5fd" strokeWidth={1} />

                {/* Time ruler ticks */}
                {ticks.map((t) => (
                  <g key={t}>
                    <line x1={0} y1={yAt(t)} x2={LEFT_PAD - 4} y2={yAt(t)} stroke="#d4d4d8" />
                    <text x={LEFT_PAD - 6} y={yAt(t) + 3} fontSize={9} fill="#71717a" textAnchor="end">
                      {t}s
                    </text>
                  </g>
                ))}

                {/* Waveform bars */}
                {bucketRows.map((b, i) => {
                  const sp = speakerAt(b.t);
                  if (!sp) return null;
                  if (b.amp < 0.04) return null;
                  const w = b.amp * LANE_HALF;
                  const cx = sp === "agent" ? AGENT_CX : USER_CX;
                  const color = sp === "agent" ? "#10b981" : "#3b82f6";
                  return <rect key={i} x={cx - w} y={b.y} width={w * 2} height={b.h} fill={color} />;
                })}

                {/* Latency markers between lanes */}
                {latencyMarkers.map((m, i) => {
                  const y1 = yAt(m.tStart);
                  const y2 = yAt(m.tEnd);
                  const yMid = (y1 + y2) / 2;
                  const xMid = (AGENT_CX + USER_CX) / 2;
                  return (
                    <g key={i}>
                      <line x1={AGENT_CX} y1={y1} x2={USER_CX} y2={y1} stroke="#7c3aed" strokeWidth={1} strokeDasharray="3 3" />
                      <line x1={AGENT_CX} y1={y2} x2={USER_CX} y2={y2} stroke="#7c3aed" strokeWidth={1} strokeDasharray="3 3" />
                      <line
                        x1={xMid}
                        y1={y1 + 1}
                        x2={xMid}
                        y2={y2 - 1}
                        stroke="#7c3aed"
                        strokeWidth={1.6}
                        markerStart="url(#vctArrU)"
                        markerEnd="url(#vctArrD)"
                      />
                      <rect x={xMid - 22} y={yMid - 7} width={44} height={14} rx={3} fill="#faf5ff" stroke="#7c3aed" strokeWidth={0.6} />
                      <text x={xMid} y={yMid + 3} textAnchor="middle" fontSize={9} fill="#6d28d9" fontWeight={700}>
                        {m.latencyMs} ms
                      </text>
                    </g>
                  );
                })}

                {/* Playhead */}
                <line x1={0} y1={yAt(currentTime)} x2={SVG_W} y2={yAt(currentTime)} stroke="#ef4444" strokeWidth={1.5} />
                <circle cx={SVG_W - 4} cy={yAt(currentTime)} r={3} fill="#ef4444" />
              </svg>
            </div>

            {/* Right column: transcript aligned by time */}
            <div className="relative flex-1 bg-white" style={{ minHeight: totalH }}>
              <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-4 py-1.5">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Transcript</span>
              </div>
              <TranscriptLane
                turnIntervals={turnIntervals}
                totalH={totalH}
                yAt={yAt}
                fmt={fmt}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DualWaveformPlayer({
  recordingUrl,
  transcript,
  callStartMs,
  durationSeconds,
  toTimelineMs,
  extractProviderLatencyMs,
}: {
  recordingUrl: string;
  transcript: TranscriptEntry[];
  callStartMs: number | null;
  durationSeconds: number;
  toTimelineMs: (v: unknown) => number | null;
  extractProviderLatencyMs: (e: TranscriptEntry) => number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [peaksUser, setPeaksUser] = useState<Float32Array | null>(null);
  const [peaksAgent, setPeaksAgent] = useState<Float32Array | null>(null);
  const [isStereo, setIsStereo] = useState(false);
  const [swapChannels, setSwapChannels] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const NUM_BUCKETS = 720;

  const computePeaks = (data: Float32Array, buckets: number): Float32Array => {
    const bucketSize = Math.max(1, Math.floor(data.length / buckets));
    const p = new Float32Array(buckets);
    for (let i = 0; i < buckets; i++) {
      let sum = 0;
      const start = i * bucketSize;
      const end = Math.min(start + bucketSize, data.length);
      for (let j = start; j < end; j++) sum += data[j] * data[j];
      p[i] = Math.sqrt(sum / Math.max(1, end - start));
    }
    return p;
  };

  useEffect(() => {
    if (!recordingUrl) return;
    let cancelled = false;
    setDecoding(true);
    setDecodeError(null);
    (async () => {
      try {
        const res = await fetch(recordingUrl);
        const buf = await res.arrayBuffer();
        const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) throw new Error("Web Audio API not supported");
        const ctx = new Ctx();
        const audio = await ctx.decodeAudioData(buf.slice(0));
        const stereo = audio.numberOfChannels >= 2;
        let pA: Float32Array;
        let pB: Float32Array;
        if (stereo) {
          pA = computePeaks(audio.getChannelData(0), NUM_BUCKETS);
          pB = computePeaks(audio.getChannelData(1), NUM_BUCKETS);
        } else {
          pA = computePeaks(audio.getChannelData(0), NUM_BUCKETS);
          pB = new Float32Array(NUM_BUCKETS);
        }
        const allPeaks = stereo ? [...Array.from(pA), ...Array.from(pB)] : Array.from(pA);
        let max = 0;
        for (const v of allPeaks) if (v > max) max = v;
        if (max > 0) {
          for (let i = 0; i < pA.length; i++) pA[i] = pA[i] / max;
          for (let i = 0; i < pB.length; i++) pB[i] = pB[i] / max;
        }
        if (!cancelled) {
          setIsStereo(stereo);
          setPeaksUser(pA);
          setPeaksAgent(pB);
          setAudioDuration(audio.duration);
        }
        ctx.close();
      } catch (e: any) {
        if (!cancelled) setDecodeError(e?.message || "Failed to decode audio");
      } finally {
        if (!cancelled) setDecoding(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recordingUrl]);

  const { turnIntervals, totalDur } = useMemo(() => {
    const startMs = callStartMs;
    const toSec = (ts: unknown): number | null => {
      const ms = toTimelineMs(ts);
      if (ms === null) return null;
      if (ms < 100000) return Math.max(0, ms / 1000);
      if (startMs) return Math.max(0, (ms - startMs) / 1000);
      return ms / 1000;
    };

    const raw = transcript
      .map((t) => ({ entry: t, role: t.role, startSec: toSec(t.timestamp) }))
      .filter((t) => t.role === "user" || t.role === "agent");

    const dur =
      audioDuration ||
      durationSeconds ||
      (raw.length
        ? Math.max(...raw.map((t) => t.startSec ?? 0)) + 3
        : 0);

    // Fill missing timestamps by interpolation between known anchors.
    const filled: { entry: TranscriptEntry; role: "user" | "agent"; startSec: number }[] = [];
    let lastKnown = 0;
    let lastKnownIdx = -1;
    for (let i = 0; i < raw.length; i++) {
      const cur = raw[i];
      if (cur.startSec !== null) {
        lastKnown = cur.startSec;
        lastKnownIdx = i;
        filled.push({ entry: cur.entry, role: cur.role as any, startSec: cur.startSec });
        continue;
      }
      // find next known
      let nextIdx = -1;
      let nextVal = dur;
      for (let j = i + 1; j < raw.length; j++) {
        if (raw[j].startSec !== null) {
          nextIdx = j;
          nextVal = raw[j].startSec as number;
          break;
        }
      }
      const gap = nextIdx === -1 ? dur - lastKnown : nextVal - lastKnown;
      const slots = (nextIdx === -1 ? raw.length : nextIdx) - lastKnownIdx;
      const offset = (i - lastKnownIdx) / Math.max(1, slots);
      const interp = Math.max(0, lastKnown + gap * offset);
      filled.push({ entry: cur.entry, role: cur.role as any, startSec: interp });
    }
    filled.sort((a, b) => a.startSec - b.startSec);

    const intervals = filled.map((t, i) => ({
      role: t.role,
      start: t.startSec,
      end: i + 1 < filled.length ? filled[i + 1].startSec : dur,
      entry: t.entry,
    }));

    return { turnIntervals: intervals, totalDur: dur };
  }, [transcript, callStartMs, audioDuration, durationSeconds, toTimelineMs]);

  const speakerAt = useCallback(
    (t: number): "user" | "agent" | null => {
      for (const iv of turnIntervals) {
        if (t >= iv.start && t < iv.end) return iv.role;
      }
      return null;
    },
    [turnIntervals]
  );

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play().catch(() => {});
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onPause);
    };
  }, [recordingUrl]);

  const W = 1000;
  const H_RULER = 26;
  const H_LANE = 56;
  const H_MID = 76;
  const PAD_L = 64;
  const PAD_R = 16;
  const innerW = W - PAD_L - PAD_R;
  const Y_USER_TOP = H_RULER;
  const Y_USER_BOT = Y_USER_TOP + H_LANE;
  const Y_USER_MID = Y_USER_TOP + H_LANE / 2;
  const Y_AGENT_TOP = Y_USER_BOT + H_MID;
  const Y_AGENT_BOT = Y_AGENT_TOP + H_LANE;
  const Y_AGENT_MID = Y_AGENT_TOP + H_LANE / 2;
  const totalH = Y_AGENT_BOT + 12;

  const safeDur = totalDur || 1;
  const xAt = (t: number) => PAD_L + (Math.min(Math.max(t, 0), safeDur) / safeDur) * innerW;

  const autoSwap = useMemo(() => {
    if (!isStereo || !peaksUser || !peaksAgent || turnIntervals.length === 0) return false;
    let ch0Agent = 0, ch1Agent = 0, ch0User = 0, ch1User = 0;
    for (const iv of turnIntervals) {
      const i0 = Math.floor((iv.start / safeDur) * peaksUser.length);
      const i1 = Math.ceil((iv.end / safeDur) * peaksUser.length);
      for (let i = i0; i < i1 && i < peaksUser.length; i++) {
        if (iv.role === "agent") { ch0Agent += peaksUser[i]; ch1Agent += peaksAgent[i]; }
        else { ch0User += peaksUser[i]; ch1User += peaksAgent[i]; }
      }
    }
    // ch0 mapped to user lane; if ch0 has more energy during AGENT turns than during USER turns
    // (relative to ch1), channels are swapped.
    const ch0AgentRatio = ch0Agent / Math.max(0.0001, ch0Agent + ch0User);
    const ch1AgentRatio = ch1Agent / Math.max(0.0001, ch1Agent + ch1User);
    return ch0AgentRatio > ch1AgentRatio;
  }, [isStereo, peaksUser, peaksAgent, turnIntervals, safeDur]);

  const effectiveSwap = swapChannels !== autoSwap;
  const userLanePeaks = isStereo ? (effectiveSwap ? peaksAgent : peaksUser) : null;
  const agentLanePeaks = isStereo ? (effectiveSwap ? peaksUser : peaksAgent) : null;
  const monoPeaks = !isStereo ? peaksUser : null;

  // Audio-driven response latency: detect contiguous voiced regions per channel,
  // then for every agent-speech onset find the nearest preceding user-speech offset.
  const latencyMarkers = useMemo(() => {
    if (!isStereo || !userLanePeaks || !agentLanePeaks || totalDur <= 0) return [] as { userEnd: number; agentStart: number; latencyMs: number }[];
    const uCh = userLanePeaks;
    const aCh = agentLanePeaks;
    const N = uCh.length;
    const dt = totalDur / N;
    const thr = (ch: Float32Array) => {
      const sorted = Array.from(ch).filter((v) => v > 0.005).sort((a, b) => a - b);
      if (!sorted.length) return 0.05;
      const p40 = sorted[Math.floor(sorted.length * 0.4)];
      return Math.max(0.04, p40 * 0.6);
    };
    const tU = thr(uCh);
    const tA = thr(aCh);
    type Region = { start: number; end: number };
    const regions = (ch: Float32Array, thresh: number): Region[] => {
      const minRunBuckets = Math.max(2, Math.round(0.15 / dt));
      const gapMergeBuckets = Math.max(2, Math.round(0.25 / dt));
      const out: Region[] = [];
      let i = 0;
      while (i < N) {
        if (ch[i] >= thresh) {
          let j = i;
          while (j < N) {
            if (ch[j] >= thresh) { j++; continue; }
            let k = j;
            while (k < N && ch[k] < thresh) k++;
            if (k - j <= gapMergeBuckets && k < N) { j = k; continue; }
            break;
          }
          if (j - i >= minRunBuckets) out.push({ start: i * dt, end: j * dt });
          i = j;
        } else i++;
      }
      return out;
    };
    const userRegions = regions(uCh, tU);
    const agentRegions = regions(aCh, tA);
    if (!userRegions.length || !agentRegions.length) return [];
    const out: { userEnd: number; agentStart: number; latencyMs: number }[] = [];
    for (const ar of agentRegions) {
      let prev: Region | null = null;
      for (const ur of userRegions) {
        if (ur.end <= ar.start) prev = ur;
        else break;
      }
      if (!prev) continue;
      const lat = (ar.start - prev.end) * 1000;
      if (lat < 50 || lat > 8000) continue;
      out.push({ userEnd: prev.end, agentStart: ar.start, latencyMs: Math.round(lat) });
    }
    return out;
  }, [isStereo, userLanePeaks, agentLanePeaks, totalDur]);

  // Mono fallback: use voiced regions from the single waveform + transcript
  // role labels to figure out which side of each silence is user vs agent.
  const monoLatencyMarkers = useMemo(() => {
    if (isStereo || !monoPeaks || totalDur <= 0 || turnIntervals.length === 0) return [] as { userEnd: number; agentStart: number; latencyMs: number }[];
    const ch = monoPeaks;
    const N = ch.length;
    const dt = totalDur / N;
    const sorted = Array.from(ch).filter((v) => v > 0.005).sort((a, b) => a - b);
    const thresh = sorted.length ? Math.max(0.04, sorted[Math.floor(sorted.length * 0.4)] * 0.6) : 0.05;
    const minRun = Math.max(2, Math.round(0.15 / dt));
    const gapMerge = Math.max(2, Math.round(0.25 / dt));
    type Region = { start: number; end: number };
    const regs: Region[] = [];
    let i = 0;
    while (i < N) {
      if (ch[i] >= thresh) {
        let j = i;
        while (j < N) {
          if (ch[j] >= thresh) { j++; continue; }
          let k = j;
          while (k < N && ch[k] < thresh) k++;
          if (k - j <= gapMerge && k < N) { j = k; continue; }
          break;
        }
        if (j - i >= minRun) regs.push({ start: i * dt, end: j * dt });
        i = j;
      } else i++;
    }
    // Assign each voiced region a role using the dominant speakerAt() within it.
    const labeled = regs.map((r) => {
      const midT = (r.start + r.end) / 2;
      const role = speakerAt(midT) || speakerAt(r.start) || speakerAt(r.end);
      return { ...r, role };
    });
    const markers: { userEnd: number; agentStart: number; latencyMs: number }[] = [];
    for (let k = 1; k < labeled.length; k++) {
      const prev = labeled[k - 1];
      const cur = labeled[k];
      if (prev.role !== "user" || cur.role !== "agent") continue;
      const lat = (cur.start - prev.end) * 1000;
      if (lat < 50 || lat > 8000) continue;
      markers.push({ userEnd: prev.end, agentStart: cur.start, latencyMs: Math.round(lat) });
    }
    return markers;
  }, [isStereo, monoPeaks, totalDur, turnIntervals, speakerAt]);

  const activeLatencyMarkers = isStereo ? latencyMarkers : monoLatencyMarkers;

  const ready = !!peaksUser;

  const monoBars = monoPeaks
    ? Array.from({ length: monoPeaks.length }, (_, i) => {
        const t = (i / monoPeaks.length) * safeDur;
        const speaker = speakerAt(t);
        return { t, x: xAt(t), ampNorm: monoPeaks[i], speaker };
      })
    : [];
  const stereoBars =
    userLanePeaks && agentLanePeaks
      ? Array.from({ length: userLanePeaks.length }, (_, i) => {
          const t = (i / userLanePeaks.length) * safeDur;
          return { t, x: xAt(t), userAmp: userLanePeaks[i], agentAmp: agentLanePeaks[i] };
        })
      : [];
  const barW = ready ? Math.max(1, innerW / (peaksUser as Float32Array).length - 0.4) : 0;
  const maxHalf = H_LANE / 2 - 2;

  const seek = (e: React.MouseEvent<SVGRectElement>) => {
    const a = audioRef.current;
    if (!a) return;
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    a.currentTime = Math.max(0, Math.min(safeDur, ratio * safeDur));
  };

  const tickStep = safeDur > 300 ? 60 : safeDur > 120 ? 30 : safeDur > 60 ? 10 : safeDur > 30 ? 5 : 2;
  const ticks: number[] = [];
  for (let t = 0; t <= safeDur; t += tickStep) ticks.push(t);

  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const avgLatency = activeLatencyMarkers.length
    ? Math.round(activeLatencyMarkers.reduce((s, m) => s + m.latencyMs, 0) / activeLatencyMarkers.length)
    : null;

  return (
    <div>
      <audio ref={audioRef} src={recordingUrl} preload="metadata" className="hidden" />

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Button size="sm" variant="outline" onClick={togglePlay} disabled={!ready} className="h-8 px-3">
          {playing ? <Pause className="h-3.5 w-3.5 mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
          {playing ? "Pause" : "Play"}
        </Button>
        <div className="text-xs text-zinc-600 font-mono tabular-nums">
          {fmt(currentTime)} <span className="text-zinc-400">/</span> {fmt(safeDur)}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-blue-500" />
            <span className="text-zinc-600">User</span>
          </span>
          <span className="inline-flex items-center gap-1 ml-2">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" />
            <span className="text-zinc-600">Agent</span>
          </span>
          <span className="inline-flex items-center gap-1 ml-2">
            <span className="h-2 w-2 rounded-sm bg-violet-500" />
            <span className="text-zinc-600">Response Latency</span>
          </span>
        </div>
        {isStereo && (
          <button
            type="button"
            onClick={() => setSwapChannels((v) => !v)}
            className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            title="Swap which channel is User vs Agent"
          >
            Swap Channels
          </button>
        )}
        {avgLatency !== null && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">Avg Response</span>
            <span className="font-bold tabular-nums text-violet-600 text-sm">{avgLatency} ms</span>
            <span className="text-zinc-400">Â·</span>
            <span className="text-zinc-500 tabular-nums">{activeLatencyMarkers.length} transitions</span>
          </div>
        )}
      </div>

      {decoding && (
        <p className="text-xs text-zinc-500 flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Decoding audio for waveformâ€¦
        </p>
      )}
      {decodeError && <p className="text-xs text-rose-500">{decodeError}</p>}

      {peaksUser && (
        <div className="rounded-lg border border-zinc-100 bg-zinc-50/40 p-2 overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full" style={{ minHeight: 260 }}>
            <defs>
              <marker id="dwpArrR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#7c3aed" />
              </marker>
              <marker id="dwpArrL" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M10,0 L0,5 L10,10 Z" fill="#7c3aed" />
              </marker>
              <marker id="dwpTime" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#52525b" />
              </marker>
            </defs>

            <text x={PAD_L + innerW / 2} y={10} textAnchor="middle" fontSize={10} fill="#52525b" fontWeight={600}>
              Time
            </text>
            <line
              x1={PAD_L}
              y1={H_RULER - 8}
              x2={W - PAD_R}
              y2={H_RULER - 8}
              stroke="#52525b"
              strokeWidth={1}
              markerEnd="url(#dwpTime)"
            />
            {ticks.map((t) => (
              <g key={t}>
                <line x1={xAt(t)} y1={H_RULER - 8} x2={xAt(t)} y2={H_RULER - 3} stroke="#71717a" />
                <text x={xAt(t)} y={H_RULER + 7} textAnchor="middle" fontSize={9} fill="#71717a">
                  {t}s
                </text>
              </g>
            ))}

            <g transform={`translate(6, ${Y_USER_MID})`}>
              <circle cx={14} cy={-2} r={11} fill="#dbeafe" />
              <text x={14} y={2} textAnchor="middle" fontSize={11} fill="#1d4ed8" fontWeight={700}>
                U
              </text>
              <text x={14} y={20} textAnchor="middle" fontSize={9} fill="#1d4ed8" fontWeight={600}>
                User
              </text>
            </g>
            <g transform={`translate(6, ${Y_AGENT_MID})`}>
              <circle cx={14} cy={-2} r={11} fill="#dcfce7" />
              <text x={14} y={2} textAnchor="middle" fontSize={11} fill="#15803d" fontWeight={700}>
                A
              </text>
              <text x={14} y={20} textAnchor="middle" fontSize={9} fill="#15803d" fontWeight={600}>
                Agent
              </text>
            </g>

            <line x1={PAD_L} y1={Y_USER_MID} x2={W - PAD_R} y2={Y_USER_MID} stroke="#93c5fd" strokeWidth={1} />
            <line x1={PAD_L} y1={Y_AGENT_MID} x2={W - PAD_R} y2={Y_AGENT_MID} stroke="#86efac" strokeWidth={1} />

            {isStereo
              ? stereoBars.map((b, i) => {
                  const hu = b.userAmp * maxHalf;
                  if (hu < 0.15) return null;
                  return <rect key={`u${i}`} x={b.x} y={Y_USER_MID - hu} width={barW} height={hu * 2} fill="#3b82f6" />;
                })
              : monoBars.map((b, i) => {
                  if (b.speaker !== "user") return null;
                  const h = b.ampNorm * maxHalf;
                  if (h < 0.15) return null;
                  return <rect key={`u${i}`} x={b.x} y={Y_USER_MID - h} width={barW} height={h * 2} fill="#3b82f6" />;
                })}
            {isStereo
              ? stereoBars.map((b, i) => {
                  const ha = b.agentAmp * maxHalf;
                  if (ha < 0.15) return null;
                  return <rect key={`a${i}`} x={b.x} y={Y_AGENT_MID - ha} width={barW} height={ha * 2} fill="#10b981" />;
                })
              : monoBars.map((b, i) => {
                  if (b.speaker !== "agent") return null;
                  const h = b.ampNorm * maxHalf;
                  if (h < 0.15) return null;
                  return <rect key={`a${i}`} x={b.x} y={Y_AGENT_MID - h} width={barW} height={h * 2} fill="#10b981" />;
                })}

            {activeLatencyMarkers.map((m, i) => {
              const xs = xAt(m.userEnd);
              const xe = xAt(m.agentStart);
              const yMid = (Y_USER_MID + Y_AGENT_MID) / 2;
              return (
                <g key={i}>
                  <line x1={xs} y1={Y_USER_MID} x2={xs} y2={Y_AGENT_MID} stroke="#3b82f6" strokeWidth={1.2} strokeDasharray="3 3" />
                  <line x1={xe} y1={Y_USER_MID} x2={xe} y2={Y_AGENT_MID} stroke="#10b981" strokeWidth={1.2} strokeDasharray="3 3" />
                  <line
                    x1={xs + 1}
                    y1={yMid}
                    x2={xe - 1}
                    y2={yMid}
                    stroke="#7c3aed"
                    strokeWidth={1.6}
                    markerStart="url(#dwpArrL)"
                    markerEnd="url(#dwpArrR)"
                  />
                  <text x={(xs + xe) / 2} y={yMid - 6} textAnchor="middle" fontSize={10} fill="#7c3aed" fontWeight={700}>
                    {Math.round(m.latencyMs)} ms
                  </text>
                  <text x={(xs + xe) / 2} y={yMid + 14} textAnchor="middle" fontSize={8} fill="#7c3aed">
                    Response
                  </text>
                </g>
              );
            })}

            <rect
              x={PAD_L}
              y={Y_USER_TOP}
              width={innerW}
              height={Y_AGENT_BOT - Y_USER_TOP}
              fill="transparent"
              onClick={seek}
              style={{ cursor: "pointer" }}
            />

            {currentTime >= 0 && (
              <line
                x1={xAt(currentTime)}
                y1={Y_USER_TOP - 6}
                x2={xAt(currentTime)}
                y2={Y_AGENT_BOT + 6}
                stroke="#ef4444"
                strokeWidth={1.6}
              />
            )}
          </svg>
        </div>
      )}

      {!peaksUser && !decoding && !decodeError && (
        <p className="text-xs text-zinc-500">Waveform unavailable.</p>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-zinc-600">
        <Icon className="h-3.5 w-3.5 text-zinc-400" />
        {label}
      </span>
      <span className="text-zinc-900 font-medium text-right truncate max-w-[180px]">{value}</span>
    </div>
  );
}

function GaugeStat({ label, value, max, color, suffix }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const data = [{ name: label, value, fill: color }];
  return (
    <div className="flex flex-col items-center">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold text-center mb-1">{label}</div>
      <div className="relative h-[80px] w-[80px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={data} startAngle={210} endAngle={-30}>
            <PolarAngleAxis type="number" domain={[0, max]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: "#f1f5f9" }} dataKey="value" cornerRadius={4} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-lg font-bold tabular-nums leading-none">{value}</div>
          {suffix && <div className="text-[9px] text-zinc-400">{suffix}</div>}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{label}</div>
      <div className="text-base font-bold tabular-nums mt-1">{value}</div>
    </div>
  );
}
