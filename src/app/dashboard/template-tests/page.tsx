"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { BookOpen, Loader2, Plus, Check } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  is_security_test: boolean;
  security_test_type?: string;
  persona_type?: string;
  slot_count: number;
}

interface AgentLite {
  id: string;
  name: string;
}

interface FilledTestCase {
  name: string;
  description: string;
  scenario: string;
  expected_behavior: string;
  key_topic: string;
  test_type: string;
  persona_type?: string;
  voice_accent?: string;
  behavior_modifiers?: string[];
  is_security_test: boolean;
  security_test_type?: string;
  sensitive_data_types?: string[];
}

export default function TemplateTestsPage() {
  const { getToken } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [agents, setAgents] = useState<AgentLite[]>([]);
  const [agentId, setAgentId] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("rag_factual");
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{ templateId: string; testCase: FilledTestCase } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [tplRes, agRes] = await Promise.all([
          fetch(api.endpoints.testExecution.testCaseTemplates, { headers }),
          fetch(api.endpoints.agents.list, { headers }),
        ]);
        const tplData = await tplRes.json();
        const agData = await agRes.json();
        setTemplates(tplData.templates || []);
        const agList: AgentLite[] = Array.isArray(agData) ? agData : agData.agents || [];
        setAgents(agList);
        if (agList.length > 0) setAgentId(agList[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  const categories = useMemo(() => {
    const set = new Set(templates.map((t) => t.category));
    return ["all", ...Array.from(set).sort()];
  }, [templates]);

  const visible = useMemo(
    () => (categoryFilter === "all" ? templates : templates.filter((t) => t.category === categoryFilter)),
    [templates, categoryFilter],
  );

  const generate = async (templateId: string) => {
    if (!agentId) {
      setError("Select an agent first.");
      return;
    }
    setGeneratingId(templateId);
    setError(null);
    setPreview(null);
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.testExecution.generateFromTemplate, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, agentId }),
      });
      const data = await res.json();
      if (res.ok && data.success) setPreview({ templateId, testCase: data.testCase });
      else setError(data.error || "Generation failed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGeneratingId(null);
    }
  };

  const addToAgent = async () => {
    if (!preview) return;
    setSavingId(preview.templateId);
    setError(null);
    try {
      const token = await getToken();
      const tc = preview.testCase;
      const res = await fetch(api.endpoints.testCases.create, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, ...tc }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setSavedIds((prev) => new Set(prev).add(preview.templateId));
        setPreview(null);
      } else {
        setError(data.error || "Could not add test case.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add test case.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading templates…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Knowledge &amp; Template Tests
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate RAG knowledge-base and other curated test cases. Slots are auto-filled for your agent&apos;s domain by an LLM
          (the test construct is never changed). Preview, then add to the agent.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Agent</label>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
          {agents.length === 0 && <option value="">No agents</option>}
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <label className="text-sm font-medium ml-4">Category</label>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((t) => (
          <div key={t.id} className="bg-white dark:bg-gray-800 rounded-lg border p-4 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm">{t.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
              </div>
              {savedIds.has(t.id) && <Check className="h-4 w-4 text-green-600 shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] uppercase tracking-wide bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5">{t.category}</span>
              {t.is_security_test && <span className="text-[10px] uppercase bg-red-100 text-red-700 rounded px-1.5 py-0.5">security</span>}
              <span className="text-[10px] text-muted-foreground">{t.slot_count} slot(s)</span>
            </div>
            <button
              onClick={() => generate(t.id)}
              disabled={generatingId === t.id || !agentId}
              className="mt-3 self-start text-sm border border-[#1A5253] text-[#1A5253] rounded-md px-3 py-1.5 disabled:opacity-50 flex items-center gap-1.5"
            >
              {generatingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Generate
            </button>
          </div>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setPreview(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Preview test case</h2>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {preview.testCase.name}</div>
              <div><span className="font-medium">Scenario:</span><p className="text-muted-foreground mt-0.5 whitespace-pre-wrap">{preview.testCase.scenario}</p></div>
              <div><span className="font-medium">Expected behavior:</span><p className="text-muted-foreground mt-0.5 whitespace-pre-wrap">{preview.testCase.expected_behavior}</p></div>
              <div><span className="font-medium">Topic:</span> {preview.testCase.key_topic} · <span className="font-medium">Type:</span> {preview.testCase.test_type}</div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={addToAgent} disabled={savingId === preview.templateId} className="bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {savingId === preview.templateId && <Loader2 className="h-4 w-4 animate-spin" />} Add to agent
              </button>
              <button onClick={() => setPreview(null)} className="border rounded-md px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
