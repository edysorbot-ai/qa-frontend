"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { ShieldAlert, Loader2, Wand2 } from "lucide-react";

type Tab = "sanitize-prompt" | "sanitize-response" | "llm-change";

interface SanFinding {
  rule: string;
  category: string;
  severity: "low" | "medium" | "high";
  evidence: string;
}
interface SanResult {
  verdict: "allow" | "flag" | "block";
  findings: SanFinding[];
  redactedText: string;
  modified: boolean;
}
interface Adjustment {
  section: string;
  issue: string;
  suggestion: string;
  severity: "low" | "medium" | "high";
}

interface AgentLite {
  id: string;
  name: string;
  prompt?: string;
  system_prompt?: string;
}

const sevColor: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-gray-100 text-gray-700",
};
const verdictColor: Record<string, string> = {
  allow: "bg-green-100 text-green-800",
  flag: "bg-amber-100 text-amber-800",
  block: "bg-red-100 text-red-800",
};

const MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "claude-3-5-sonnet", "claude-3-opus", "gemini-1.5-pro", "gemini-2.0-flash", "llama-3.1-70b"];

export default function RecommendationsPage() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState<Tab>("sanitize-prompt");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [systemPromptHint, setSystemPromptHint] = useState("");
  const [san, setSan] = useState<SanResult | null>(null);

  const [agents, setAgents] = useState<AgentLite[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [fromModel, setFromModel] = useState("gpt-4o");
  const [toModel, setToModel] = useState("claude-3-5-sonnet");
  const [adjustments, setAdjustments] = useState<Adjustment[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(api.endpoints.agents.list, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setAgents(Array.isArray(data) ? data : data.agents || []);
      } catch {
        /* non-fatal */
      }
    })();
  }, [getToken]);

  const runSanitize = async (which: "sanitize-prompt" | "sanitize-response") => {
    setLoading(true);
    setError(null);
    setSan(null);
    try {
      const token = await getToken();
      const url = which === "sanitize-prompt" ? api.endpoints.recommendations.sanitizePrompt : api.endpoints.recommendations.sanitizeResponse;
      const body = which === "sanitize-prompt" ? { text } : { text, systemPromptHint: systemPromptHint || undefined };
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) setSan(data);
      else setError(data.error || "Request failed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  const runLlmChange = async () => {
    setLoading(true);
    setError(null);
    setAdjustments(null);
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.recommendations.llmChange, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ currentPrompt, fromModel, toModel }),
      });
      const data = await res.json();
      if (res.ok && data.success) setAdjustments(data.adjustments || []);
      else setError(data.error || "Request failed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  const field = "w-full border rounded-md px-3 py-2 text-sm bg-background";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" /> Recommendations
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sanitize prompts &amp; responses (Model-Armor style) and get prompt-readjustment guidance when you switch the underlying LLM.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b">
        {[
          { id: "sanitize-prompt", label: "Sanitize Prompt" },
          { id: "sanitize-response", label: "Sanitize Response" },
          { id: "llm-change", label: "LLM Change" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id as Tab);
              setError(null);
              setSan(null);
              setAdjustments(null);
            }}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? "border-[#1A5253] text-[#1A5253]" : "border-transparent text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 space-y-3">
        {tab === "sanitize-prompt" && (
          <>
            <p className="text-sm text-muted-foreground">Check a user/system prompt for prompt-injection, jailbreak and PII before sending it to a model.</p>
            <textarea className={field} rows={6} placeholder="Prompt text…" value={text} onChange={(e) => setText(e.target.value)} />
            <button onClick={() => runSanitize("sanitize-prompt")} disabled={loading || !text} className="bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sanitize
            </button>
          </>
        )}
        {tab === "sanitize-response" && (
          <>
            <p className="text-sm text-muted-foreground">Check an agent response for system-prompt echo, tool-definition leaks and sensitive data.</p>
            <textarea className={field} rows={6} placeholder="Agent response text…" value={text} onChange={(e) => setText(e.target.value)} />
            <input className={field} placeholder="System prompt hint (optional, improves leak detection)" value={systemPromptHint} onChange={(e) => setSystemPromptHint(e.target.value)} />
            <button onClick={() => runSanitize("sanitize-response")} disabled={loading || !text} className="bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sanitize
            </button>
          </>
        )}
        {tab === "llm-change" && (
          <>
            <p className="text-sm text-muted-foreground">Switching models? Get the concrete prompt edits needed to keep the same behaviour.</p>
            <select
              className={field}
              onChange={(e) => {
                const a = agents.find((x) => x.id === e.target.value);
                if (a) setCurrentPrompt(a.system_prompt || a.prompt || "");
              }}
              defaultValue=""
            >
              <option value="">— Load prompt from agent (optional) —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <textarea className={field} rows={6} placeholder="Current system prompt…" value={currentPrompt} onChange={(e) => setCurrentPrompt(e.target.value)} />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">From model</label>
                <select className={field} value={fromModel} onChange={(e) => setFromModel(e.target.value)}>
                  {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">To model</label>
                <select className={field} value={toModel} onChange={(e) => setToModel(e.target.value)}>
                  {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <button onClick={runLlmChange} disabled={loading || !currentPrompt} className="bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Get adjustments
            </button>
          </>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {san && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Verdict</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${verdictColor[san.verdict]}`}>{san.verdict}</span>
            {san.modified && <span className="text-xs text-muted-foreground">(text was modified)</span>}
          </div>
          {san.findings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issues found.</p>
          ) : (
            <ul className="space-y-2">
              {san.findings.map((f, i) => (
                <li key={i} className="text-sm border-l-2 border-amber-300 pl-3">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase mr-2 ${sevColor[f.severity]}`}>{f.severity}</span>
                  <span className="font-medium">{f.category}</span> — {f.rule}
                  <div className="text-xs text-muted-foreground mt-0.5">Evidence: {f.evidence}</div>
                </li>
              ))}
            </ul>
          )}
          <div>
            <span className="font-medium text-sm">Redacted text</span>
            <pre className="text-xs bg-gray-50 dark:bg-gray-900 rounded p-3 mt-1 whitespace-pre-wrap">{san.redactedText}</pre>
          </div>
        </div>
      )}

      {adjustments && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 space-y-3">
          <h2 className="font-semibold text-sm">Recommended prompt adjustments ({fromModel} → {toModel})</h2>
          {adjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes needed — the prompt should port cleanly.</p>
          ) : (
            <ul className="space-y-3">
              {adjustments.map((a, i) => (
                <li key={i} className="border rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${sevColor[a.severity]}`}>{a.severity}</span>
                    <span className="font-medium text-sm">{a.section}</span>
                  </div>
                  <p className="text-sm mt-1"><span className="text-muted-foreground">Issue:</span> {a.issue}</p>
                  <p className="text-sm mt-0.5"><span className="text-muted-foreground">Fix:</span> {a.suggestion}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
