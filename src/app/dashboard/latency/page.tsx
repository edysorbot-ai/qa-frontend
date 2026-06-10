"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { Activity, Gauge, PhoneCall, Loader2 } from "lucide-react";

interface StackProfile {
  name: string;
  stt: string;
  llm: string;
  tts: string;
  region?: string;
}

interface ProfileReport {
  profile: StackProfile;
  totals: { sttMs: number; llmMs: number; ttsMs: number; networkMs: number; totalMs: number };
  p50TotalMs: number;
  p95TotalMs: number;
  p99TotalMs: number;
  avgTotalMs: number;
}

interface TestRunLite {
  id: string;
  name?: string;
  status?: string;
  created_at?: string;
}

const REGIONS = [
  { value: "", label: "No geo (datacentre-local)" },
  { value: "us-east", label: "US East" },
  { value: "us-west", label: "US West" },
  { value: "eu-west", label: "EU West" },
  { value: "eu-central", label: "EU Central" },
  { value: "ap-south", label: "Asia Pacific (South / India)" },
  { value: "ap-southeast", label: "Asia Pacific (Southeast)" },
  { value: "ap-northeast", label: "Asia Pacific (Northeast)" },
  { value: "sa-east", label: "South America (East)" },
];

function ms(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `${Math.round(n)} ms`;
}

export default function LatencyLabPage() {
  const { getToken } = useAuth();

  // Simulation state
  const [runs, setRuns] = useState<TestRunLite[]>([]);
  const [selectedRun, setSelectedRun] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [profiles, setProfiles] = useState<StackProfile[]>([]);
  const [reports, setReports] = useState<ProfileReport[]>([]);
  const [turnsAnalysed, setTurnsAnalysed] = useState<number | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  // Telephony state
  const [toNumber, setToNumber] = useState("");
  const [telLoading, setTelLoading] = useState(false);
  const [telError, setTelError] = useState<string | null>(null);
  const [telResult, setTelResult] = useState<{
    finalStatus: string;
    timings: { apiSubmitMs: number; ringToAnswerMs: number | null; totalCallMs: number | null };
    verdict: string;
  } | null>(null);

  // Call RCA state (t13)
  const [rcaCallId, setRcaCallId] = useState("");
  const [rcaLoading, setRcaLoading] = useState(false);
  const [rcaError, setRcaError] = useState<string | null>(null);
  const [rca, setRca] = useState<{
    totals?: Record<string, number>;
    worstComponent?: { component: string; totalMs: number } | null;
    recommendations?: string[];
    providerSourceShare?: number;
  } | null>(null);

  const runRca = async () => {
    if (!rcaCallId.trim()) return;
    setRcaLoading(true);
    setRcaError(null);
    setRca(null);
    try {
      const token = await getToken();
      const res = await fetch(`${api.baseUrl}/api/monitoring/calls/${rcaCallId.trim()}/latency-rca`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setRca(data);
      else setRcaError(data.error || "RCA failed.");
    } catch (e) {
      setRcaError(e instanceof Error ? e.message : "RCA failed.");
    } finally {
      setRcaLoading(false);
    }
  };

  const loadInitial = useCallback(async () => {
    try {
      const token = await getToken();
      const [runsRes, profRes] = await Promise.all([
        fetch(`${api.baseUrl}/api/test-execution/runs`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${api.baseUrl}/api/latency-simulation/profiles`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (runsRes.ok) {
        const d = await runsRes.json();
        setRuns(d.runs || []);
      }
      if (profRes.ok) {
        const d = await profRes.json();
        setProfiles(d.profiles || []);
      }
    } catch {
      /* ignore */
    }
  }, [getToken]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const runSimulation = async () => {
    if (!selectedRun) {
      setSimError("Select a completed test run first.");
      return;
    }
    setSimLoading(true);
    setSimError(null);
    setReports([]);
    try {
      const token = await getToken();
      const withRegion = profiles.map((p) => ({ ...p, region: region || undefined }));
      const res = await fetch(`${api.baseUrl}/api/latency-simulation/run/${selectedRun}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(withRegion.length ? { profiles: withRegion } : {}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReports(data.reports || []);
        setTurnsAnalysed(data.agentTurnsAnalysed ?? null);
        if ((data.agentTurnsAnalysed ?? 0) === 0) {
          setSimError("This run has no captured agent turns to simulate. Pick a completed run with a transcript.");
        }
      } else {
        setSimError(data.error || "Simulation failed.");
      }
    } catch (e) {
      setSimError(e instanceof Error ? e.message : "Simulation failed.");
    } finally {
      setSimLoading(false);
    }
  };

  const runTelephony = async () => {
    if (!toNumber.trim()) {
      setTelError("Enter a destination number in E.164 format (e.g. +14155550123).");
      return;
    }
    setTelLoading(true);
    setTelError(null);
    setTelResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${api.baseUrl}/api/telephony/latency-test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ toNumber: toNumber.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTelResult({ finalStatus: data.finalStatus, timings: data.timings, verdict: data.verdict });
      } else {
        setTelError(data.error || "Telephony test failed.");
      }
    } catch (e) {
      setTelError(e instanceof Error ? e.message : "Telephony test failed.");
    } finally {
      setTelLoading(false);
    }
  };

  const verdictColor: Record<string, string> = {
    fast: "text-green-600",
    acceptable: "text-amber-600",
    slow: "text-red-600",
    not_answered: "text-gray-500",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gauge className="h-6 w-6" /> Latency Lab
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Compare STT/TTS/LLM stacks, model geo-residency network cost, and measure real telephony latency.
        </p>
      </div>

      {/* Stack + geo simulation (t05 + t03) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Activity className="h-5 w-5" /> Stack &amp; Geo Latency Simulation
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Replays a completed run&apos;s agent turns across STT/TTS/LLM profiles and adds the network round-trip for a
          caller in the chosen region.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Test run</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={selectedRun}
              onChange={(e) => setSelectedRun(e.target.value)}
            >
              <option value="">Select a completed run…</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {(r.name || r.id.slice(0, 8)) + (r.status ? ` (${r.status})` : "")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Caller geo-residency</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={runSimulation}
              disabled={simLoading}
              className="w-full bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {simLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Run Simulation
            </button>
          </div>
        </div>

        {simError && <p className="text-sm text-red-600 mb-3">{simError}</p>}
        {turnsAnalysed !== null && !simError && (
          <p className="text-xs text-muted-foreground mb-3">Analysed {turnsAnalysed} agent turn(s).</p>
        )}

        {reports.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Profile</th>
                  <th className="py-2 pr-4">Stack</th>
                  <th className="py-2 pr-4">p50</th>
                  <th className="py-2 pr-4">p95</th>
                  <th className="py-2 pr-4">p99</th>
                  <th className="py-2 pr-4">Avg/turn</th>
                  <th className="py-2 pr-4">Network total</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((rep, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{rep.profile.name}</td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {rep.profile.stt} · {rep.profile.llm} · {rep.profile.tts}
                    </td>
                    <td className="py-2 pr-4">{ms(rep.p50TotalMs)}</td>
                    <td className="py-2 pr-4">{ms(rep.p95TotalMs)}</td>
                    <td className="py-2 pr-4">{ms(rep.p99TotalMs)}</td>
                    <td className="py-2 pr-4 font-medium">{ms(rep.avgTotalMs)}</td>
                    <td className="py-2 pr-4 text-xs">{ms(rep.totals.networkMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-2">
              Estimates use published typical component latencies; geo-residency adds per-turn network round-trip.
            </p>
          </div>
        )}
      </div>

      {/* Telephony latency (t04) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <PhoneCall className="h-5 w-5" /> Telephony Latency Test
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Places a real probe call via Twilio and measures API-submit, ring-to-answer and total call time. Requires
          Twilio env configuration on the backend.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <input
            type="text"
            placeholder="+14155550123"
            value={toNumber}
            onChange={(e) => setToNumber(e.target.value)}
            className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
          />
          <button
            onClick={runTelephony}
            disabled={telLoading}
            className="bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {telLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Run Probe Call
          </button>
        </div>
        {telError && <p className="text-sm text-red-600">{telError}</p>}
        {telResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <div>
              <p className="text-xs text-muted-foreground">API submit</p>
              <p className="font-medium">{ms(telResult.timings.apiSubmitMs)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ring → answer</p>
              <p className="font-medium">{ms(telResult.timings.ringToAnswerMs)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total call</p>
              <p className="font-medium">{ms(telResult.timings.totalCallMs)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Verdict</p>
              <p className={`font-medium capitalize ${verdictColor[telResult.verdict] || ""}`}>
                {telResult.verdict.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Real-time call latency RCA (t13) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Activity className="h-5 w-5" /> Call Latency RCA
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          Fragment a monitored production call&apos;s latency into STT / LLM / Tool / TTS components, find the dominant
          cause and get fix recommendations.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs text-muted-foreground">Production call ID</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="call id (from Monitoring → Calls)"
              value={rcaCallId}
              onChange={(e) => setRcaCallId(e.target.value)}
            />
          </div>
          <button
            onClick={runRca}
            disabled={rcaLoading || !rcaCallId.trim()}
            className="bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {rcaLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Analyse RCA
          </button>
        </div>
        {rcaError && <p className="text-sm text-red-600 mt-2">{rcaError}</p>}
        {rca && (
          <div className="mt-4 space-y-3">
            {rca.totals && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(rca.totals).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-muted-foreground uppercase">{k.replace(/Ms$/, "")}</p>
                    <p className="font-medium">{ms(v)}</p>
                  </div>
                ))}
              </div>
            )}
            {rca.worstComponent && (
              <p className="text-sm">
                Dominant component:{" "}
                <span className="font-semibold">{rca.worstComponent.component}</span> ({ms(rca.worstComponent.totalMs)})
              </p>
            )}
            {typeof rca.providerSourceShare === "number" && (
              <p className="text-xs text-muted-foreground">
                Provider-sourced timing share: {Math.round(rca.providerSourceShare * 100)}%
              </p>
            )}
            {rca.recommendations && rca.recommendations.length > 0 && (
              <ul className="text-sm list-disc pl-5 space-y-1">
                {rca.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
