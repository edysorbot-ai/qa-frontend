"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { ShieldCheck, AlertTriangle, ArrowUpCircle, Loader2 } from "lucide-react";

interface GateVerdict {
  stage: "development" | "qa" | "uat" | "production";
  policy: string;
  stats: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    securityTotal: number;
    securityPassed: number;
    securityFailed: number;
  };
  passed: boolean;
  blocksPromotion: boolean;
  promotable: boolean;
  nextStage: "development" | "qa" | "uat" | "production" | null;
  failureSeverity: "none" | "low" | "medium" | "high";
  reasons: string[];
}

const STAGE_LABEL: Record<string, string> = {
  development: "In Development",
  qa: "QA",
  uat: "UAT",
  production: "Production",
};

export function LifecycleGateCard({ testRunId }: { testRunId: string }) {
  const { getToken } = useAuth();
  const [verdict, setVerdict] = useState<GateVerdict | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${api.baseUrl}/api/test-execution/runs/${testRunId}/lifecycle-gate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerdict(data.verdict);
        setAgentId(data.agentId);
      } else {
        setError(data.error || null);
      }
    } catch {
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [getToken, testRunId]);

  useEffect(() => {
    load();
  }, [load]);

  const promote = async () => {
    if (!verdict?.nextStage || !agentId) return;
    setPromoting(true);
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.agents.update(agentId), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycle_stage: verdict.nextStage }),
      });
      if (res.ok) await load();
    } finally {
      setPromoting(false);
    }
  };

  if (loading) return null;
  if (error || !verdict || verdict.stats.total === 0) return null;

  const sev = verdict.failureSeverity;
  const tone = verdict.passed
    ? "border-green-200 bg-green-50 dark:bg-green-950/20"
    : sev === "high"
    ? "border-red-200 bg-red-50 dark:bg-red-950/20"
    : "border-amber-200 bg-amber-50 dark:bg-amber-950/20";

  return (
    <div className={`rounded-lg border p-4 mb-6 ${tone}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          {verdict.passed ? (
            <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
          ) : (
            <AlertTriangle className={`h-5 w-5 mt-0.5 ${sev === "high" ? "text-red-600" : "text-amber-600"}`} />
          )}
          <div>
            <div className="font-semibold text-sm">
              Lifecycle Gate · {STAGE_LABEL[verdict.stage]} —{" "}
              {verdict.passed ? "PASSED" : "NOT MET"}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{verdict.policy}</p>
            <ul className="text-xs mt-2 space-y-0.5 list-disc pl-4">
              {verdict.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <div className="text-xs text-muted-foreground mt-2">
              Pass rate {verdict.stats.passRate}% ({verdict.stats.passed}/{verdict.stats.total})
              {verdict.stats.securityTotal > 0 && (
                <> · Security {verdict.stats.securityPassed}/{verdict.stats.securityTotal}</>
              )}
            </div>
          </div>
        </div>
        {verdict.nextStage && (
          <div className="text-right">
            {verdict.promotable ? (
              <button
                onClick={promote}
                disabled={promoting}
                className="bg-[#1A5253] text-white rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
              >
                {promoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
                Promote to {STAGE_LABEL[verdict.nextStage]}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">
                {verdict.blocksPromotion ? "Promotion blocked by failures" : `Not yet ready for ${STAGE_LABEL[verdict.nextStage]}`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LifecycleGateCard;
