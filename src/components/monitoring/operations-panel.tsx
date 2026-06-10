"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { Activity, Loader2, RefreshCw } from "lucide-react";

type Tab = "outage" | "consumption" | "sampling" | "tools" | "feedback";

interface AgentLite { id: string; name: string }
interface OutageResult { id: string; provider: string; status: string; httpStatus?: number; latencyMs?: number; reason?: string }
interface Analytics {
  windowDays: number;
  total_calls: number;
  inbound: number;
  outbound: number;
  total_seconds: number;
  avg_seconds: number;
  active_agents: number;
  perDay: { day: string; calls: number; seconds: number }[];
}
interface ToolAnalytics {
  totalDecisions: number;
  averageConfidence: number;
  toolUsageBreakdown: { tool: string; count: number; percentage: number }[];
  decisionsByTurn: { turnNumber: number; count: number }[];
  lowConfidenceDecisions: { selectedTool?: string; confidence: number; reasoning?: string }[];
}
interface CallLite { id: string; agent_name?: string; call_type?: string; duration_seconds?: number; status?: string; created_at?: string }

const TABS: { id: Tab; label: string }[] = [
  { id: "outage", label: "Outage Status" },
  { id: "consumption", label: "Consumption & Analytics" },
  { id: "sampling", label: "Sampling & Signals" },
  { id: "tools", label: "Tool Analytics" },
  { id: "feedback", label: "Feedback (RLHF)" },
];

export default function OperationsPage() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState<Tab>("outage");
  const [agents, setAgents] = useState<AgentLite[]>([]);
  const [agentId, setAgentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [outage, setOutage] = useState<OutageResult[] | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [days, setDays] = useState("30");
  const [samplingRate, setSamplingRate] = useState("1");
  const [keywords, setKeywords] = useState("");
  const [tools, setTools] = useState<ToolAnalytics | null>(null);
  const [calls, setCalls] = useState<CallLite[]>([]);

  const authHeaders = useCallback(async () => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }, [getToken]);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(api.endpoints.agents.list, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const list: AgentLite[] = Array.isArray(data) ? data : data.agents || [];
        setAgents(list);
        if (list.length > 0) setAgentId(list[0].id);
      } catch { /* non-fatal */ }
    })();
  }, [getToken]);

  const runOutage = async () => {
    setLoading(true); setError(null); setOutage(null);
    try {
      const res = await fetch(`${api.baseUrl}/api/monitoring/outage-test`, { method: "POST", headers: await authHeaders(), body: "{}" });
      const data = await res.json();
      if (res.ok && data.success) setOutage(data.results || []);
      else setError(data.error || "Outage test failed.");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed."); } finally { setLoading(false); }
  };

  const runAnalytics = async () => {
    setLoading(true); setError(null); setAnalytics(null);
    try {
      const q = new URLSearchParams({ days });
      if (agentId) q.set("agentId", agentId);
      const res = await fetch(`${api.baseUrl}/api/monitoring/analytics?${q.toString()}`, { headers: await authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setAnalytics(data);
      else setError(data.error || "Failed to load analytics.");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed."); } finally { setLoading(false); }
  };

  const saveSampling = async () => {
    setLoading(true); setError(null); setNotice(null);
    try {
      const body = {
        sampling_rate: Number(samplingRate),
        signal_filters: { keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean) },
      };
      const res = await fetch(`${api.baseUrl}/api/monitoring/agents/${agentId}/sampling`, { method: "PUT", headers: await authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success) setNotice("Sampling configuration saved.");
      else setError(data.error || "Could not save. Agent must be under monitoring first.");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed."); } finally { setLoading(false); }
  };

  const runTools = async () => {
    setLoading(true); setError(null); setTools(null);
    try {
      const res = await fetch(`${api.baseUrl}/api/test-runs/agents/${agentId}/tool-analytics`, { headers: await authHeaders() });
      const data = await res.json();
      if (res.ok && data.analytics) setTools(data.analytics);
      else setError(data.error || "Failed to load tool analytics.");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed."); } finally { setLoading(false); }
  };

  const loadCalls = async () => {
    setLoading(true); setError(null);
    try {
      const q = new URLSearchParams({ limit: "25" });
      if (agentId) q.set("agentId", agentId);
      const res = await fetch(`${api.baseUrl}/api/monitoring/calls?${q.toString()}`, { headers: await authHeaders() });
      const data = await res.json();
      setCalls(data.calls || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed."); } finally { setLoading(false); }
  };

  const sendFeedback = async (callId: string, rating: number, label: string) => {
    try {
      const res = await fetch(`${api.baseUrl}/api/monitoring/calls/${callId}/feedback`, { method: "POST", headers: await authHeaders(), body: JSON.stringify({ rating, label }) });
      if (res.ok) setNotice(`Feedback saved for call ${callId.slice(0, 8)}.`);
      else setError("Could not save feedback.");
    } catch { setError("Could not save feedback."); }
  };

  const field = "border rounded-md px-3 py-2 text-sm bg-background";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6" /> Operations</h1>
        <p className="text-muted-foreground text-sm mt-1">Provider outage checks, consumption analytics, low-cost monitoring sampling, tool-call success and human feedback (RLHF).</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setError(null); setNotice(null); }} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? "border-[#1A5253] text-[#1A5253]" : "border-transparent text-muted-foreground"}`}>{t.label}</button>
        ))}
      </div>

      {(tab === "consumption" || tab === "sampling" || tab === "tools" || tab === "feedback") && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Agent</label>
          <select className={field} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            {agents.length === 0 && <option value="">No agents</option>}
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {tab === "consumption" && (
            <>
              <label className="text-sm font-medium ml-2">Window (days)</label>
              <input className={`${field} w-24`} value={days} onChange={(e) => setDays(e.target.value)} />
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-green-600">{notice}</p>}

      {tab === "outage" && (
        <div className="space-y-3">
          <button onClick={runOutage} disabled={loading} className="bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Run outage check
          </button>
          {outage && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border divide-y">
              {outage.length === 0 && <p className="p-4 text-sm text-muted-foreground">No provider integrations configured.</p>}
              {outage.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 text-sm">
                  <span className="font-medium capitalize">{r.provider}</span>
                  <span className="flex items-center gap-3">
                    {r.latencyMs !== undefined && <span className="text-muted-foreground text-xs">{r.latencyMs}ms</span>}
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.status === "up" ? "bg-green-100 text-green-800" : r.status === "down" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700"}`}>{r.status.toUpperCase()}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "consumption" && (
        <div className="space-y-3">
          <button onClick={runAnalytics} disabled={loading} className="bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Load analytics</button>
          {analytics && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Total calls", value: analytics.total_calls },
                { label: "Inbound", value: analytics.inbound },
                { label: "Outbound", value: analytics.outbound },
                { label: "Active agents", value: analytics.active_agents },
                { label: "Total minutes", value: Math.round((analytics.total_seconds || 0) / 60) },
                { label: "Avg call (s)", value: Math.round(analytics.avg_seconds || 0) },
              ].map((m) => (
                <div key={m.label} className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                  <div className="text-2xl font-bold">{m.value}</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "sampling" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 space-y-3 max-w-lg">
          <p className="text-sm text-muted-foreground">Reduce monitoring cost: sample a fraction of calls and prioritise ones matching signal keywords (errors, refunds, escalations…). Requires the agent to be under monitoring.</p>
          <div>
            <label className="text-xs text-muted-foreground">Sampling rate (0–1)</label>
            <input className={`${field} w-full`} value={samplingRate} onChange={(e) => setSamplingRate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Priority signal keywords (comma-separated)</label>
            <input className={`${field} w-full`} placeholder="refund, angry, cancel, error" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          </div>
          <button onClick={saveSampling} disabled={loading || !agentId} className="bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Save sampling config</button>
        </div>
      )}

      {tab === "tools" && (
        <div className="space-y-3">
          <button onClick={runTools} disabled={loading || !agentId} className="bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Load tool analytics</button>
          {tools && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 space-y-4">
              <div className="flex gap-6 text-sm">
                <div><span className="text-2xl font-bold">{tools.totalDecisions}</span><div className="text-xs text-muted-foreground">Tool decisions</div></div>
                <div><span className="text-2xl font-bold">{tools.averageConfidence}</span><div className="text-xs text-muted-foreground">Avg confidence</div></div>
                <div><span className="text-2xl font-bold">{tools.lowConfidenceDecisions.length}</span><div className="text-xs text-muted-foreground">Low-confidence (drop-off risk)</div></div>
              </div>
              {tools.toolUsageBreakdown.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm mb-2">Tool usage</h3>
                  <div className="space-y-1">
                    {tools.toolUsageBreakdown.map((t) => (
                      <div key={t.tool} className="flex items-center gap-2 text-sm">
                        <span className="w-40 truncate">{t.tool}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded h-3"><div className="bg-[#1A5253] h-3 rounded" style={{ width: `${t.percentage}%` }} /></div>
                        <span className="text-xs text-muted-foreground w-16 text-right">{t.count} ({t.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tools.lowConfidenceDecisions.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm mb-2">Low-confidence decisions (possible drop-offs)</h3>
                  <ul className="text-xs space-y-1">
                    {tools.lowConfidenceDecisions.map((d, i) => (
                      <li key={i} className="border-l-2 border-amber-300 pl-2">{d.selectedTool || "(no tool)"} · conf {d.confidence}{d.reasoning ? ` — ${d.reasoning}` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "feedback" && (
        <div className="space-y-3">
          <button onClick={loadCalls} disabled={loading} className="bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Load recent calls</button>
          {calls.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border divide-y">
              {calls.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 text-sm gap-3 flex-wrap">
                  <div>
                    <span className="font-medium">{c.agent_name || "Agent"}</span>
                    <span className="text-xs text-muted-foreground ml-2">{c.call_type} · {c.duration_seconds ?? 0}s · {c.status}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => sendFeedback(c.id, 5, "good")} className="px-2 py-1 rounded border text-xs hover:bg-green-50">👍 Good</button>
                    <button onClick={() => sendFeedback(c.id, 1, "bad")} className="px-2 py-1 rounded border text-xs hover:bg-red-50">👎 Bad</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
