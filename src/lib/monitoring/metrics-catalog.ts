/**
 * Monitoring metrics catalog — the canonical 4-screen, 55-metric spec.
 * Drives info-tooltips across all monitoring pages.
 */

export type MetricTier = "Observability" | "Overview" | "L0" | "L1" | "L2";

export type MetricSource =
  | "Provider API"
  | "Python Module"
  | "LLM Eval"
  | "Security Module"
  | "Internal/Derived"
  | "Health Check"
  | "Alert Engine"
  | "Provider API / Python";

export interface MetricSpec {
  id: string;
  label: string;
  captures: string;
  source: MetricSource;
  viz: string;
  notes?: string;
  tier: MetricTier;
}

export const S1_OBSERVABILITY: MetricSpec[] = [
  { id: "s1.agent_status", tier: "Observability", label: "Agent Status", captures: "Current operational state: Active / Degraded / Down for each agent in the fleet.", source: "Health Check", viz: "Status Badge Grid", notes: "Alert if Degraded >5 min; page on Down >2 min" },
  { id: "s1.uptime", tier: "Observability", label: "Uptime % (30-day rolling)", captures: "% of time agent was fully operational over a rolling 30-day window.", source: "Provider API", viz: "Metric Block + Sparkline", notes: "Target >99.5%" },
  { id: "s1.active_incidents", tier: "Observability", label: "Active Incidents", captures: "Open issues with P0/P1/P2 severity tags and time-to-resolve estimate.", source: "Alert Engine", viz: "Alert Panel", notes: "Page on P0; Slack on P1" },
  { id: "s1.downtime_log", tier: "Observability", label: "Downtime Event Log", captures: "History of outages: start, end, duration, root cause (provider vs config vs model).", source: "Alert Engine", viz: "Incident Timeline + Table", notes: "Last 30 days" },
  { id: "s1.error_rate", tier: "Observability", label: "Error Rate %", captures: "% of calls with system-level errors — 5xx, timeouts, API failures, telephony drops.", source: "Provider API", viz: "Metric Block + Line Chart", notes: "Alert if >2%" },
  { id: "s1.p90_latency", tier: "Observability", label: "P90 Latency Trend", captures: "90th-percentile end-to-end turn latency over time — detects gradual performance drift.", source: "Provider API", viz: "Time Series", notes: "Alert if drift >2σ from hourly baseline" },
  { id: "s1.mttr", tier: "Observability", label: "MTTR (Mean Time to Recovery)", captures: "Average time from incident detection to full resolution.", source: "Alert Engine", viz: "Metric Block", notes: "Target <15 min" },
  { id: "s1.sla", tier: "Observability", label: "SLA Compliance Rate", captures: "% of time all defined SLAs (latency, uptime, error rate) are being met simultaneously.", source: "Internal/Derived", viz: "Metric + Gauge", notes: "Target >99%" },
  { id: "s1.concurrent_calls", tier: "Observability", label: "Concurrent Active Calls", captures: "Live count of calls in progress right now — capacity and load signal.", source: "Provider API", viz: "Live Metric Block" },
  { id: "s1.throughput", tier: "Observability", label: "Throughput (Calls / hr)", captures: "Hourly call volume trend — spots traffic spikes and drops.", source: "Provider API", viz: "Line Chart" },
  { id: "s1.component_health", tier: "Observability", label: "Component Health Grid", captures: "Operational status of each pipeline layer: VAD → ASR → LLM → TTS → STT → Telephony.", source: "Provider API", viz: "Health Matrix" },
  { id: "s1.prompt_version", tier: "Observability", label: "Prompt & Model Version", captures: "Active prompt version, LLM model, TTS voice, last deployed timestamp.", source: "Internal/Derived", viz: "Info Card" },
  { id: "s1.alert_history", tier: "Observability", label: "Alert History", captures: "Past alerts: type, severity, trigger value, duration, resolution status.", source: "Alert Engine", viz: "Table" },
  { id: "s1.provider_dep", tier: "Observability", label: "Provider Dependency Status", captures: "Health of 3rd-party providers: ElevenLabs, Retell, VAPI, LiveKit, Synthflow, NICE, etc.", source: "Health Check", viz: "Status Strip" },
];

export const S2_L0_EXEC: MetricSpec[] = [
  { id: "s2.l0.total_calls", tier: "L0", label: "Total Calls", captures: "Count of all calls in the selected period across all agents.", source: "Provider API", viz: "Metric Block + Δ%" },
  { id: "s2.l0.total_min", tier: "L0", label: "Total Call Duration (min)", captures: "Sum of all call minutes — proxy for AI workload and cost.", source: "Provider API", viz: "Metric Block" },
  { id: "s2.l0.avg_min", tier: "L0", label: "Avg Call Duration (min)", captures: "Mean call length — benchmark varies by use case (support: 3–8 min).", source: "Provider API", viz: "Metric Block" },
  { id: "s2.l0.unique_customers", tier: "L0", label: "Total Unique Customers", captures: "Distinct callers / users served — proxy for AI reach.", source: "Provider API", viz: "Metric Block" },
  { id: "s2.l0.issues", tier: "L0", label: "Total Calls with Issues", captures: "Calls flagged by any issue detector at any tier.", source: "Internal/Derived", viz: "Metric Block" },
  { id: "s2.l0.critical_pct", tier: "L0", label: "% Calls with Critical Issues", captures: "Critical-severity issue calls / total calls × 100.", source: "Internal/Derived", viz: "Metric Block (red)", notes: "Alert >5%" },
  { id: "s2.l0.success_pct", tier: "L0", label: "% Successful Calls (No Issues)", captures: "Zero-issue calls / total calls — headline success rate.", source: "Internal/Derived", viz: "Metric Block (green)" },
  { id: "s2.l0.in_out", tier: "L0", label: "Inbound vs Outbound Volume", captures: "Split of call direction across the full fleet.", source: "Provider API", viz: "Donut Chart" },
  { id: "s2.l0.active_agents", tier: "L0", label: "Active Agents Count", captures: "Number of live / deployed agents in the period.", source: "Internal/Derived", viz: "Metric Block" },
  { id: "s2.l0.daily_volume", tier: "L0", label: "Daily Call Volume Trend", captures: "Calls per day (or per hour) over the selected period.", source: "Provider API", viz: "Bar + Line overlay" },
];

export const S2_L1_OPS: MetricSpec[] = [
  { id: "s2.l1.issue_rate_agent", tier: "L1", label: "Issue Rate by Agent", captures: "% of calls with issues per agent, ranked worst-first.", source: "Internal/Derived", viz: "Ranked Bar" },
  { id: "s2.l1.issue_count_agent", tier: "L1", label: "Issue Count by Agent", captures: "Raw count of detected issues per agent.", source: "Internal/Derived", viz: "Bar Chart" },
  { id: "s2.l1.calls_agent", tier: "L1", label: "Call Volume by Agent", captures: "Number of calls handled by each agent.", source: "Provider API", viz: "Bar Chart" },
  { id: "s2.l1.minutes_agent", tier: "L1", label: "Call Minutes by Agent", captures: "Total talk-time minutes per agent.", source: "Provider API", viz: "Bar Chart" },
  { id: "s2.l1.issue_split", tier: "L1", label: "Issue Type Split", captures: "Distribution of issue categories: Latency / ASR Failure / Sentiment / Compliance / Security.", source: "Internal/Derived", viz: "Donut + Stacked Bar" },
  { id: "s2.l1.turn_latency", tier: "L1", label: "Avg Turn Latency (platform-wide)", captures: "Mean end-to-end turn response time across all agents.", source: "Provider API", viz: "Metric + Sparkline", notes: "Target <800ms" },
  { id: "s2.l1.success_trend", tier: "L1", label: "Call Success Rate Trend", captures: "% successful calls over time — primary platform health signal.", source: "Internal/Derived", viz: "Line Chart" },
  { id: "s2.l1.escalation", tier: "L1", label: "Escalation / Transfer Rate", captures: "% of calls handed off to a human agent.", source: "Provider API", viz: "Metric Block", notes: "Target <15%" },
  { id: "s2.l1.abandonment", tier: "L1", label: "Abandonment Rate", captures: "% of calls ended prematurely by the user before resolution.", source: "Provider API", viz: "Metric Block", notes: "Target <8%" },
  { id: "s2.l1.containment", tier: "L1", label: "Containment Rate", captures: "% of calls fully handled by AI with no human escalation.", source: "Internal/Derived", viz: "Metric Block", notes: "Target >80%" },
  { id: "s2.l1.sentiment_trend", tier: "L1", label: "Avg Sentiment Trend", captures: "Mean call-sentiment score over time across all agents.", source: "LLM Eval", viz: "Line Chart" },
  { id: "s2.l1.traffic_heatmap", tier: "L1", label: "Call Traffic Heatmap", captures: "Call volume by hour of day × day of week.", source: "Provider API", viz: "Heatmap" },
];

export const S2_L2_DEEP: MetricSpec[] = [
  { id: "s2.l2.p95_agent", tier: "L2", label: "P95 Turn Latency by Agent", captures: "95th-percentile response time per agent. P95 = experience of 1-in-20 turns; matters more than average.", source: "Provider API", viz: "Ranked Bar" },
  { id: "s2.l2.pipeline_health", tier: "L2", label: "VAD–ASR–LLM–TTS–STT Health", captures: "Error rate and latency per pipeline component across all agents.", source: "Provider API", viz: "RAG Grid" },
  { id: "s2.l2.worst_calls", tier: "L2", label: "Worst Calls (Cross-Agent)", captures: "Top-N calls with highest issue severity / count across the full fleet.", source: "Internal/Derived", viz: "Table → drill-down" },
  { id: "s2.l2.best_calls", tier: "L2", label: "Best Calls (Cross-Agent)", captures: "Top-N zero-issue, high-score calls for benchmarking and golden examples.", source: "Internal/Derived", viz: "Table → drill-down" },
  { id: "s2.l2.sentiment_agent", tier: "L2", label: "Avg Sentiment by Agent", captures: "Mean call-sentiment score per agent over the period.", source: "LLM Eval", viz: "Bar Chart" },
  { id: "s2.l2.ai_detection", tier: "L2", label: "AI Detection Likelihood", captures: "Avg probability callers identified they were speaking to an AI, per agent.", source: "LLM Eval", viz: "Bar Chart" },
  { id: "s2.l2.intent_accuracy", tier: "L2", label: "Intent Accuracy by Agent", captures: "% of user turns where intent was correctly classified by the agent.", source: "LLM Eval", viz: "Bar Chart", notes: "Target >90%" },
  { id: "s2.l2.hallucination", tier: "L2", label: "Hallucination Rate", captures: "% of agent responses containing fabricated or incorrect information.", source: "LLM Eval", viz: "Metric + Trend", notes: "Alert >2%" },
  { id: "s2.l2.prompt_compliance", tier: "L2", label: "Prompt Compliance Rate", captures: "% of turns where agent followed its system prompt instructions.", source: "LLM Eval", viz: "Bar Chart" },
  { id: "s2.l2.wer", tier: "L2", label: "WER (Word Error Rate)", captures: "ASR accuracy: % of words incorrectly transcribed, by agent.", source: "Provider API / Python", viz: "Bar Chart", notes: "Target <8%" },
  { id: "s2.l2.task_completion", tier: "L2", label: "Task Completion Rate", captures: "% of calls where the user's intended goal was fully achieved.", source: "LLM Eval", viz: "Bar Chart", notes: "Target >85%" },
  { id: "s2.l2.security_rate", tier: "L2", label: "Security Incident Rate", captures: "% of calls with prompt injection / jailbreak / personality override attempts detected.", source: "Security Module", viz: "Metric + Trend", notes: "Alert >0.5%" },
];

export const S3_OVERVIEW: MetricSpec[] = [
  { id: "s3.identity", tier: "Overview", label: "Agent Identity", captures: "Name, type (Voice / Chat / Both), platform, environment (Prod / Staging).", source: "Internal/Derived", viz: "Info Card" },
  { id: "s3.status", tier: "Overview", label: "Current Status", captures: "Active / Degraded / Down — right now.", source: "Health Check", viz: "Status Badge" },
  { id: "s3.live_calls", tier: "Overview", label: "Active Calls (Live)", captures: "Calls currently in progress for this agent.", source: "Provider API", viz: "Live Metric Block" },
  { id: "s3.version", tier: "Overview", label: "Prompt & Model Version", captures: "Active prompt version, LLM model, TTS voice, last deployed timestamp.", source: "Internal/Derived", viz: "Info Card" },
];

export const S3_L0: MetricSpec[] = [
  { id: "s3.l0.total", tier: "L0", label: "Total Calls (this agent)", captures: "Calls handled by this agent in the selected period.", source: "Provider API", viz: "Metric + Δ" },
  { id: "s3.l0.duration", tier: "L0", label: "Total / Avg Duration", captures: "Sum and mean call length for this agent.", source: "Provider API", viz: "Two Metric Blocks" },
  { id: "s3.l0.customers", tier: "L0", label: "Unique Customers Served", captures: "Distinct callers served by this agent.", source: "Provider API", viz: "Metric Block" },
  { id: "s3.l0.issues", tier: "L0", label: "Calls with Issues", captures: "Issue-flagged call count for this agent.", source: "Internal/Derived", viz: "Metric Block" },
  { id: "s3.l0.critical", tier: "L0", label: "% Critical Issue Calls", captures: "Critical-severity issues / total for this agent.", source: "Internal/Derived", viz: "Metric (red)", notes: "Alert >5%" },
  { id: "s3.l0.success", tier: "L0", label: "% Successful Calls", captures: "Zero-issue calls / total for this agent.", source: "Internal/Derived", viz: "Metric (green)" },
  { id: "s3.l0.direction", tier: "L0", label: "Inbound vs Outbound", captures: "Call direction split for this agent.", source: "Provider API", viz: "Donut" },
];

export const S4_PER_CALL: MetricSpec[] = [
  { id: "s4.transcript", tier: "L2", label: "Full Transcript", captures: "Time-aligned turn-by-turn transcript with speaker labels.", source: "Provider API", viz: "Transcript View" },
  { id: "s4.recording", tier: "L2", label: "Call Recording", captures: "Audio playback synced to the transcript.", source: "Provider API", viz: "Audio Player" },
  { id: "s4.turn_latency", tier: "L2", label: "Per-Turn Latency Breakdown", captures: "VAD → ASR → LLM → TTS → STT latency per turn.", source: "Provider API", viz: "Stacked Bar per turn" },
  { id: "s4.sentiment", tier: "L2", label: "Sentiment Timeline", captures: "Caller sentiment over the call's duration.", source: "LLM Eval", viz: "Line Chart" },
  { id: "s4.intent", tier: "L2", label: "Detected Intent per Turn", captures: "Intent classification for each user turn + confidence.", source: "LLM Eval", viz: "Table" },
  { id: "s4.compliance", tier: "L2", label: "Compliance Flags", captures: "PII / PCI / PHI exposure, policy violations detected in this call.", source: "Security Module", viz: "Flag List" },
  { id: "s4.security", tier: "L2", label: "Security Findings", captures: "Prompt injection / jailbreak / personality override attempts in this call.", source: "Security Module", viz: "Findings Panel" },
  { id: "s4.outcome", tier: "L2", label: "Outcome / Resolution", captures: "Was the user's intent fulfilled? Was the call escalated, abandoned, or completed?", source: "LLM Eval", viz: "Outcome Card" },
];

export const METRICS_INDEX: Record<string, MetricSpec> = Object.fromEntries(
  [
    ...S1_OBSERVABILITY,
    ...S2_L0_EXEC,
    ...S2_L1_OPS,
    ...S2_L2_DEEP,
    ...S3_OVERVIEW,
    ...S3_L0,
    ...S4_PER_CALL,
  ].map(m => [m.id, m]),
);

export function metric(id: string): MetricSpec | undefined {
  return METRICS_INDEX[id];
}

export function metricTooltip(id: string): { text: string; meta: string } {
  const m = METRICS_INDEX[id];
  if (!m) return { text: id, meta: "" };
  const meta = [`Source: ${m.source}`, m.notes].filter(Boolean).join(" · ");
  return { text: m.captures, meta };
}
