"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Plus,
  RefreshCw,
  Loader2,
  Bot,
  Search,
  Trash2,
  ArrowUpDown,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  provider: string;
  external_agent_id: string;
  status: string;
  created_at: string;
}

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
  latency?: { avg_response_time?: number } | null;
  created_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

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

const providerBadgeColors: Record<string, string> = {
  elevenlabs: "bg-purple-100 text-purple-800 border-purple-200",
  retell: "bg-blue-100 text-blue-800 border-blue-200",
  vapi: "bg-green-100 text-green-800 border-green-200",
  haptik: "bg-orange-100 text-orange-800 border-orange-200",
  bolna: "bg-pink-100 text-pink-800 border-pink-200",
  livekit: "bg-cyan-100 text-cyan-800 border-cyan-200",
  custom: "bg-gray-100 text-gray-800 border-gray-200",
  openai_realtime: "bg-emerald-100 text-emerald-800 border-emerald-200",
  synthflow: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

type Severity = "good" | "warning" | "critical" | "neutral";

const latencyDot = (ms: number | null): Severity =>
  ms === null ? "neutral" : ms < 800 ? "good" : ms < 1500 ? "warning" : "critical";
const scoreDot = (s: number | null): Severity =>
  s === null ? "neutral" : s >= 80 ? "good" : s >= 60 ? "warning" : "critical";

const dotColor: Record<Severity, string> = {
  good: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
  neutral: "bg-zinc-300",
};

const sevText: Record<Severity, string> = {
  good: "text-emerald-700",
  warning: "text-amber-700",
  critical: "text-rose-700",
  neutral: "text-zinc-500",
};

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

type SortKey = "name" | "provider" | "calls" | "latency" | "score" | "issues";
type SortDir = "asc" | "desc";

export default function MonitoringPage() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [monitoredAgents, setMonitoredAgents] = useState<MonitoredAgent[]>([]);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [calls, setCalls] = useState<ProductionCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all | healthy | issues
  const [sortKey, setSortKey] = useState<SortKey>("calls");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ─────────── Data fetching ───────────

  const fetchMonitoredAgents = useCallback(async () => {
    try {
      const token = await getToken();
      const r = await fetch(`${api.baseUrl}/api/monitoring/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setMonitoredAgents(data.agents || []);
      }
    } catch (e) {
      console.error("Error fetching monitored agents:", e);
    }
  }, [getToken]);

  const fetchCalls = useCallback(async () => {
    try {
      const token = await getToken();
      const r = await fetch(`${api.baseUrl}/api/monitoring/calls?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setCalls(data.calls || []);
      }
    } catch (e) {
      console.error("Error fetching calls:", e);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const fetchAvailableAgents = useCallback(async () => {
    setLoadingAgents(true);
    try {
      const token = await getToken();
      const r = await fetch(`${api.baseUrl}/api/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        const monitoredIds = monitoredAgents.map((a) => a.agent_id);
        setAvailableAgents((data.agents || []).filter((a: Agent) => !monitoredIds.includes(a.id)));
      }
    } finally {
      setLoadingAgents(false);
    }
  }, [getToken, monitoredAgents]);

  useEffect(() => {
    fetchMonitoredAgents();
    fetchCalls();
  }, [fetchMonitoredAgents, fetchCalls]);

  useEffect(() => {
    if (showAddModal) {
      fetchAvailableAgents();
      setSelectedAgentIds([]);
    }
  }, [showAddModal, fetchAvailableAgents]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchMonitoredAgents(), fetchCalls()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddAgents = async () => {
    if (!selectedAgentIds.length) return;
    setIsAdding(true);
    try {
      const token = await getToken();
      for (const agentId of selectedAgentIds) {
        await fetch(`${api.baseUrl}/api/monitoring/agents`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ agentId }),
        });
      }
      await fetchMonitoredAgents();
      await fetchCalls();
      setShowAddModal(false);
      setSelectedAgentIds([]);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAgent = async (monitoredId: string) => {
    try {
      const token = await getToken();
      await fetch(`${api.baseUrl}/api/monitoring/agents/${monitoredId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchMonitoredAgents();
      await fetchCalls();
    } catch (e) {
      console.error("Error removing agent:", e);
    }
  };

  const toggleAgentSelection = (id: string) =>
    setSelectedAgentIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // ─────────── Per-agent rollup ───────────

  type Row = {
    monitoredId: string;
    agentId: string;
    name: string;
    provider: string;
    totalCalls: number;
    avgLatencyMs: number | null;
    avgScore: number | null;
    issues: number;
    lastCallAt: string | null;
  };

  const rows: Row[] = useMemo(() => {
    return monitoredAgents.map((ma) => {
      const agentCalls = calls.filter((c) => c.agent_id === ma.agent_id);
      const latencyVals = agentCalls
        .map((c) => c.latency?.avg_response_time)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      const scoreVals = agentCalls
        .map((c) => c.overall_score)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      const callsTotal = Math.max(ma.total_calls || 0, agentCalls.length);
      return {
        monitoredId: ma.id,
        agentId: ma.agent_id,
        name: ma.name,
        provider: ma.provider,
        totalCalls: callsTotal,
        avgLatencyMs: latencyVals.length
          ? Math.round(latencyVals.reduce((s, v) => s + v, 0) / latencyVals.length)
          : null,
        avgScore: scoreVals.length
          ? Math.round((scoreVals.reduce((s, v) => s + v, 0) / scoreVals.length) * 10) / 10
          : null,
        issues: ma.issues_found || 0,
        lastCallAt: ma.last_call_at,
      };
    });
  }, [monitoredAgents, calls]);

  const providers = useMemo(() => {
    const set = new Set(rows.map((r) => r.provider).filter(Boolean));
    return Array.from(set);
  }, [rows]);

  const filtered: Row[] = useMemo(() => {
    let out = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (providerLabel[r.provider] || r.provider).toLowerCase().includes(q),
      );
    }
    if (providerFilter !== "all") {
      out = out.filter((r) => r.provider === providerFilter);
    }
    if (statusFilter === "healthy") {
      out = out.filter((r) => r.issues === 0 && (r.avgScore === null || r.avgScore >= 80));
    } else if (statusFilter === "issues") {
      out = out.filter((r) => r.issues > 0 || (r.avgScore !== null && r.avgScore < 80));
    }
    const sorted = [...out].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "provider":
          return a.provider.localeCompare(b.provider) * dir;
        case "calls":
          return (a.totalCalls - b.totalCalls) * dir;
        case "latency":
          return ((a.avgLatencyMs ?? Infinity) - (b.avgLatencyMs ?? Infinity)) * dir;
        case "score":
          return ((a.avgScore ?? -Infinity) - (b.avgScore ?? -Infinity)) * dir;
        case "issues":
          return (a.issues - b.issues) * dir;
      }
    });
    return sorted;
  }, [rows, search, providerFilter, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" || key === "provider" ? "asc" : "desc");
    }
  };

  // ─────────── Render ───────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Production Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track production calls per agent. Click an agent to drill into full analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agent or provider…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[170px] h-9">
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="issues">Has issues</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {rows.length} {rows.length === 1 ? "agent" : "agents"}
        </div>
      </div>

      {/* Table or empty state */}
      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <div className="font-medium mb-1">No agents being monitored yet</div>
          <div className="text-sm text-muted-foreground mb-4">
            Add an agent to start tracking its production calls.
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <Th label="Agent" sortKey="name" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Provider" sortKey="provider" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Calls" sortKey="calls" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <Th label="Avg Latency" sortKey="latency" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <Th label="Avg Score" sortKey="score" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <Th label="Issues" sortKey="issues" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <th className="px-4 py-3 text-right w-[100px]"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No agents match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const lDot = latencyDot(r.avgLatencyMs);
                    const sDot = scoreDot(r.avgScore);
                    return (
                      <tr
                        key={r.monitoredId}
                        onClick={() => router.push(`/dashboard/monitoring/agent/${r.agentId}`)}
                        className="border-t hover:bg-muted/30 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Bot className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{r.name}</div>
                              {r.lastCallAt && (
                                <div className="text-[11px] text-muted-foreground">
                                  Last call {new Date(r.lastCallAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`border ${providerBadgeColors[r.provider] || "bg-gray-100 text-gray-800"}`}
                          >
                            {providerLabel[r.provider] || r.provider}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">{r.totalCalls}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-1.5 tabular-nums ${sevText[lDot]}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${dotColor[lDot]}`} />
                            {r.avgLatencyMs === null ? "—" : `${r.avgLatencyMs} ms`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-1.5 tabular-nums ${sevText[sDot]}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${dotColor[sDot]}`} />
                            {r.avgScore === null ? "—" : `${r.avgScore}/100`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.issues > 0 ? (
                            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                              {r.issues}
                            </Badge>
                          ) : (
                            <span className="text-emerald-600 text-xs font-medium">Clean</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  aria-label="Remove agent from monitoring"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove from monitoring?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {r.name} will stop being polled. Existing call history is kept.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveAgent(r.monitoredId)}
                                    aria-label="Confirm remove"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Agents to Monitor</DialogTitle>
            <DialogDescription>
              Select agents from your connected agents to monitor their production calls.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingAgents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableAgents.length > 0 ? (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {availableAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAgentIds.includes(agent.id)
                          ? "bg-primary/5 border-primary"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleAgentSelection(agent.id)}
                    >
                      <Checkbox
                        checked={selectedAgentIds.includes(agent.id)}
                        onCheckedChange={() => toggleAgentSelection(agent.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{agent.name}</div>
                        <Badge
                          variant="outline"
                          className={`mt-1 text-xs border ${providerBadgeColors[agent.provider] || ""}`}
                        >
                          {providerLabel[agent.provider] || agent.provider}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No available agents to add.</p>
                <p className="text-sm mt-1">
                  All your agents are already being monitored or you need to{" "}
                  <Link href="/dashboard/agents" className="text-primary hover:underline">
                    connect agents
                  </Link>{" "}
                  first.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAgents} disabled={!selectedAgentIds.length || isAdding}>
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add {selectedAgentIds.length > 0 ? `(${selectedAgentIds.length})` : ""} Agent
              {selectedAgentIds.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sortable column header
// ────────────────────────────────────────────────────────────────────────────

function Th({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = current === sortKey;
  return (
    <th className={`px-4 py-3 font-medium text-${align}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
          active ? "text-foreground" : ""
        }`}
      >
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${active ? "opacity-100" : "opacity-30"} ${
            active && dir === "asc" ? "rotate-180" : ""
          }`}
        />
      </button>
    </th>
  );
}
