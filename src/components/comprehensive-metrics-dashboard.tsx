"use client";

import { useState } from "react";
import {
  MessageSquare,
  FileCheck,
  Target,
  Mic,
  Zap,
  Heart,
  AlertTriangle,
  BarChart,
  DollarSign,
  Shield,
  Brain,
  Lightbulb,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ComprehensiveTestMetrics,
  getScoreColor,
  getScoreBgColor,
  formatMetricValue,
} from "@/types/metrics";

interface ComprehensiveMetricsDashboardProps {
  metrics: ComprehensiveTestMetrics;
}

// Metric Bar Component
function MetricBar({
  label,
  value,
  description,
  inverted = false,
}: {
  label: string;
  value: number | undefined;
  description?: string;
  inverted?: boolean;
}) {
  const displayValue = value ?? 0;
  const color = getScoreBgColor(displayValue, inverted);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1">
          {label}
          {description && (
            <span title={description} className="cursor-help">
              <Info className="h-3 w-3 text-muted-foreground/50" />
            </span>
          )}
        </span>
        <span className={`font-medium ${getScoreColor(displayValue, inverted)}`}>
          {value !== undefined ? `${Math.round(displayValue)}%` : "N/A"}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${displayValue}%` }}
        />
      </div>
    </div>
  );
}

// Count Metric Component
function CountMetric({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: number | undefined;
  icon?: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-semibold">{value ?? "N/A"}</span>
        {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
        {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
      </div>
    </div>
  );
}

// Category Score Card
function CategoryScoreCard({
  title,
  score,
  icon: Icon,
  color,
  isActive,
  onClick,
}: {
  title: string;
  score: number | undefined;
  icon: React.ElementType;
  color: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const colorClasses: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    yellow: "from-yellow-500 to-yellow-600",
    pink: "from-pink-500 to-pink-600",
    red: "from-red-500 to-red-600",
    indigo: "from-indigo-500 to-indigo-600",
    emerald: "from-emerald-500 to-emerald-600",
    slate: "from-slate-500 to-slate-600",
    cyan: "from-cyan-500 to-cyan-600",
    amber: "from-amber-500 to-amber-600",
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all hover:shadow-md ${
        isActive
          ? "border-primary ring-2 ring-primary/20"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className={`text-2xl font-bold ${getScoreColor(score ?? 0)}`}>
            {score !== undefined ? `${Math.round(score)}%` : "N/A"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

// Severity Badge
function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <Badge className={colors[severity] || colors.info}>
      {severity.toUpperCase()}
    </Badge>
  );
}

export default function ComprehensiveMetricsDashboard({
  metrics,
}: ComprehensiveMetricsDashboardProps) {
  const [activeCategory, setActiveCategory] = useState("overview");

  const categories = [
    {
      id: "overview",
      title: "Overview",
      icon: BarChart,
      color: "indigo",
      score: metrics.overallScore,
    },
    {
      id: "conversationQuality",
      title: "Conversation Quality",
      icon: MessageSquare,
      color: "blue",
      score: metrics.categoryScores?.conversationQuality,
    },
    {
      id: "promptCompliance",
      title: "Prompt Compliance",
      icon: FileCheck,
      color: "purple",
      score: metrics.categoryScores?.promptCompliance,
    },
    {
      id: "outcomeEffectiveness",
      title: "Outcome Effectiveness",
      icon: Target,
      color: "green",
      score: metrics.categoryScores?.outcomeEffectiveness,
    },
    {
      id: "voicePerformance",
      title: "Voice Performance",
      icon: Mic,
      color: "orange",
      score: metrics.categoryScores?.voicePerformance,
    },
    {
      id: "systemPerformance",
      title: "System Performance",
      icon: Zap,
      color: "yellow",
      score: metrics.categoryScores?.systemPerformance,
    },
    {
      id: "userExperience",
      title: "User Experience",
      icon: Heart,
      color: "pink",
      score: metrics.categoryScores?.userExperience,
    },
    {
      id: "errorDetection",
      title: "Error Detection",
      icon: AlertTriangle,
      color: "red",
      score: undefined,
    },
    {
      id: "costEfficiency",
      title: "Cost Efficiency",
      icon: DollarSign,
      color: "emerald",
      score: undefined,
    },
    {
      id: "complianceSafety",
      title: "Compliance & Safety",
      icon: Shield,
      color: "slate",
      score: metrics.categoryScores?.complianceSafety,
    },
    {
      id: "evaluatorMetrics",
      title: "Evaluator Intelligence",
      icon: Brain,
      color: "cyan",
      score: undefined,
    },
    {
      id: "actionableInsights",
      title: "Actionable Insights",
      icon: Lightbulb,
      color: "amber",
      score: undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Category Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {categories.map((cat) => (
          <CategoryScoreCard
            key={cat.id}
            title={cat.title}
            score={cat.score}
            icon={cat.icon}
            color={cat.color}
            isActive={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
          />
        ))}
      </div>

      {/* Category Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        {/* Overview Tab */}
        {activeCategory === "overview" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Overall Performance Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {metrics.categoryScores &&
                Object.entries(metrics.categoryScores).map(([key, value]) => (
                  <div
                    key={key}
                    className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <p className="text-sm text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <div className="flex items-end gap-2">
                      <span
                        className={`text-3xl font-bold ${getScoreColor(value)}`}
                      >
                        {Math.round(value)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getScoreBgColor(value)} transition-all duration-500`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Conversation Quality */}
        {activeCategory === "conversationQuality" &&
          metrics.conversationQuality && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                Conversation Quality Metrics
              </h3>

              <Tabs defaultValue="intent" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="intent">Intent Handling</TabsTrigger>
                  <TabsTrigger value="context">Context</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                  <TabsTrigger value="linguistic">Linguistic</TabsTrigger>
                </TabsList>

                <TabsContent value="intent" className="space-y-4 mt-4">
                  <MetricBar
                    label="Intent Detection Accuracy"
                    value={metrics.conversationQuality.intentDetectionAccuracy}
                    description="How accurately the agent detected user intent"
                  />
                  <MetricBar
                    label="Intent Confidence Score"
                    value={metrics.conversationQuality.intentConfidenceScore}
                  />
                  <MetricBar
                    label="Multi-Intent Handling Success"
                    value={
                      metrics.conversationQuality.multiIntentHandlingSuccessRate
                    }
                  />
                  <MetricBar
                    label="Ambiguous Intent Resolution"
                    value={
                      metrics.conversationQuality.ambiguousIntentResolutionScore
                    }
                  />
                  <CountMetric
                    label="Missed Intent Instances"
                    value={metrics.conversationQuality.missedIntentInstances}
                    icon={AlertCircle}
                  />
                  <CountMetric
                    label="Wrong Classifications"
                    value={
                      metrics.conversationQuality.wrongIntentClassificationRate
                    }
                    icon={XCircle}
                  />
                </TabsContent>

                <TabsContent value="context" className="space-y-4 mt-4">
                  <MetricBar
                    label="Context Retention Score"
                    value={metrics.conversationQuality.contextRetentionScore}
                  />
                  <MetricBar
                    label="Long Conversation Coherence"
                    value={
                      metrics.conversationQuality.longConversationCoherenceScore
                    }
                  />
                  <MetricBar
                    label="Follow-up Relevance"
                    value={metrics.conversationQuality.followUpRelevanceScore}
                  />
                  <CountMetric
                    label="Context Loss Incidents"
                    value={metrics.conversationQuality.contextLossIncidents}
                    icon={AlertTriangle}
                  />
                  <MetricBar
                    label="Repetition Rate (Context Failure)"
                    value={
                      metrics.conversationQuality
                        .repetitionRateDueToContextFailure
                    }
                    inverted
                  />
                </TabsContent>

                <TabsContent value="response" className="space-y-4 mt-4">
                  <MetricBar
                    label="Response Relevance"
                    value={metrics.conversationQuality.responseRelevanceScore}
                  />
                  <MetricBar
                    label="Hallucination Frequency"
                    value={metrics.conversationQuality.hallucinationFrequency}
                    inverted
                  />
                  <MetricBar
                    label="Off-Script Response Rate"
                    value={metrics.conversationQuality.offScriptResponseRate}
                    inverted
                  />
                  <MetricBar
                    label="Over-Verbose Rate"
                    value={metrics.conversationQuality.overVerboseResponseRate}
                    inverted
                  />
                  <MetricBar
                    label="Under-Informative Rate"
                    value={
                      metrics.conversationQuality.underInformativeResponseRate
                    }
                    inverted
                  />
                  <CountMetric
                    label="Policy Violations"
                    value={
                      metrics.conversationQuality.unsafeOrPolicyViolatingResponses
                    }
                    icon={Shield}
                  />
                </TabsContent>

                <TabsContent value="linguistic" className="space-y-4 mt-4">
                  <MetricBar
                    label="Grammar Accuracy"
                    value={metrics.conversationQuality.grammarAccuracy}
                  />
                  <MetricBar
                    label="Pronunciation Clarity"
                    value={metrics.conversationQuality.pronunciationClarity}
                  />
                  <MetricBar
                    label="Accent Consistency"
                    value={metrics.conversationQuality.accentConsistency}
                  />
                  <MetricBar
                    label="Tone Alignment"
                    value={metrics.conversationQuality.toneAlignmentScore}
                  />
                  <MetricBar
                    label="Empathy Score"
                    value={metrics.conversationQuality.empathyScore}
                  />
                  <MetricBar
                    label="Naturalness"
                    value={metrics.conversationQuality.naturalnessScore}
                  />
                  <MetricBar
                    label="Speech Disfluency Rate"
                    value={metrics.conversationQuality.speechDisfluencyRate}
                    inverted
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

        {/* Prompt Compliance */}
        {activeCategory === "promptCompliance" && metrics.promptCompliance && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-purple-500" />
              Prompt Compliance Metrics
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Prompt Adherence
                </h4>
                <MetricBar
                  label="System Prompt Compliance"
                  value={
                    metrics.promptCompliance.systemPromptComplianceScore
                  }
                />
                <CountMetric
                  label="Instruction Violations"
                  value={metrics.promptCompliance.instructionViolationCount}
                  icon={XCircle}
                />
                <CountMetric
                  label="Missing Mandatory Steps"
                  value={metrics.promptCompliance.missingMandatorySteps}
                  icon={AlertCircle}
                />
                <CountMetric
                  label="Incorrect Flow Execution"
                  value={metrics.promptCompliance.incorrectFlowExecution}
                  icon={AlertTriangle}
                />
                <CountMetric
                  label="Incorrect Escalation Handling"
                  value={metrics.promptCompliance.incorrectEscalationHandling}
                  icon={AlertTriangle}
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Rule Violations
                </h4>
                <CountMetric
                  label="Forbidden Phrase Usage"
                  value={metrics.promptCompliance.forbiddenPhraseUsage}
                  icon={XCircle}
                />
                <CountMetric
                  label="Missing Compliance Statements"
                  value={
                    metrics.promptCompliance.missingComplianceStatements
                  }
                  icon={AlertCircle}
                />
                <CountMetric
                  label="Wrong Fallback Behavior"
                  value={metrics.promptCompliance.wrongFallbackBehavior}
                  icon={AlertTriangle}
                />
                <CountMetric
                  label="Improper Handover Phrasing"
                  value={metrics.promptCompliance.improperHandoverPhrasing}
                  icon={AlertTriangle}
                />
                <CountMetric
                  label="Invalid Data Collection"
                  value={
                    metrics.promptCompliance.invalidDataCollectionAttempts
                  }
                  icon={Shield}
                />
              </div>
            </div>
          </div>
        )}

        {/* Outcome Effectiveness */}
        {activeCategory === "outcomeEffectiveness" &&
          metrics.outcomeEffectiveness && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                Outcome Effectiveness Metrics
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Goal Completion
                  </h4>
                  <MetricBar
                    label="Goal Completion Rate"
                    value={metrics.outcomeEffectiveness.goalCompletionRate}
                  />
                  <MetricBar
                    label="Partial Completion Rate"
                    value={metrics.outcomeEffectiveness.partialCompletionRate}
                  />
                  <MetricBar
                    label="Failed Completion Rate"
                    value={metrics.outcomeEffectiveness.failedCompletionRate}
                    inverted
                  />
                  <MetricBar
                    label="Abandoned Conversation Rate"
                    value={
                      metrics.outcomeEffectiveness.abandonedConversationRate
                    }
                    inverted
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Funnel Performance
                  </h4>
                  <MetricBar
                    label="Lead Qualification Accuracy"
                    value={
                      metrics.outcomeEffectiveness.leadQualificationAccuracy
                    }
                  />
                  <MetricBar
                    label="Data Capture Completeness"
                    value={
                      metrics.outcomeEffectiveness.dataCaptureCompleteness
                    }
                  />
                  <MetricBar
                    label="Appointment Booking Success"
                    value={
                      metrics.outcomeEffectiveness.appointmentBookingSuccessRate
                    }
                  />
                  <MetricBar
                    label="Escalation Success Rate"
                    value={metrics.outcomeEffectiveness.escalationSuccessRate}
                  />
                  <MetricBar
                    label="Callback Scheduling Accuracy"
                    value={
                      metrics.outcomeEffectiveness.callbackSchedulingAccuracy
                    }
                  />
                </div>
              </div>
            </div>
          )}

        {/* Voice Performance */}
        {activeCategory === "voicePerformance" && metrics.voicePerformance && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Mic className="h-5 w-5 text-orange-500" />
              Voice Performance Metrics
            </h3>

            <Tabs defaultValue="audio" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="audio">Audio Quality</TabsTrigger>
                <TabsTrigger value="speech">Speech Dynamics</TabsTrigger>
                <TabsTrigger value="tts">TTS Performance</TabsTrigger>
              </TabsList>

              <TabsContent value="audio" className="space-y-4 mt-4">
                <MetricBar
                  label="Audio Clarity Score"
                  value={metrics.voicePerformance.audioClarityScore}
                />
                <MetricBar
                  label="Background Noise Interference"
                  value={metrics.voicePerformance.backgroundNoiseInterference}
                  inverted
                />
                <CountMetric
                  label="Latency Spikes"
                  value={metrics.voicePerformance.latencySpikes}
                  icon={Zap}
                />
                <CountMetric
                  label="Audio Cutoff Incidents"
                  value={metrics.voicePerformance.audioCutoffIncidents}
                  icon={AlertTriangle}
                />
                <CountMetric
                  label="Voice Overlap Incidents"
                  value={metrics.voicePerformance.voiceOverlapIncidents}
                  icon={AlertCircle}
                />
              </TabsContent>

              <TabsContent value="speech" className="space-y-4 mt-4">
                <MetricBar
                  label="Speech Speed Consistency"
                  value={metrics.voicePerformance.speechSpeedConsistency}
                />
                <MetricBar
                  label="Pause Appropriateness"
                  value={metrics.voicePerformance.pauseAppropriatenessScore}
                />
                <MetricBar
                  label="Turn-Taking Accuracy"
                  value={metrics.voicePerformance.turnTakingAccuracy}
                />
                <MetricBar
                  label="Interruption Rate"
                  value={metrics.voicePerformance.interruptionRate}
                  inverted
                />
                <CountMetric
                  label="Silence Threshold Violations"
                  value={metrics.voicePerformance.silenceThresholdViolations}
                  icon={AlertTriangle}
                />
              </TabsContent>

              <TabsContent value="tts" className="space-y-4 mt-4">
                <MetricBar
                  label="Voice Stability Score"
                  value={metrics.voicePerformance.voiceStabilityScore}
                />
                <MetricBar
                  label="Emotion Modulation Accuracy"
                  value={metrics.voicePerformance.emotionModulationAccuracy}
                />
                <MetricBar
                  label="Pronunciation Error Rate"
                  value={metrics.voicePerformance.pronunciationErrorRate}
                  inverted
                />
                <CountMetric
                  label="Mispronounced Entities"
                  value={metrics.voicePerformance.mispronouncedEntityCount}
                  icon={AlertCircle}
                />
                <CountMetric
                  label="Voice Reset Incidents"
                  value={metrics.voicePerformance.voiceResetIncidents}
                  icon={AlertTriangle}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* System Performance */}
        {activeCategory === "systemPerformance" &&
          metrics.systemPerformance && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                System Performance Metrics
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Response Timing
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        First Response
                      </p>
                      <p className="text-2xl font-bold">
                        {formatMetricValue(
                          metrics.systemPerformance.firstResponseLatencyMs,
                          "ms"
                        )}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        Avg Response
                      </p>
                      <p className="text-2xl font-bold">
                        {formatMetricValue(
                          metrics.systemPerformance.averageResponseLatencyMs,
                          "ms"
                        )}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">P95 Latency</p>
                      <p className="text-2xl font-bold">
                        {formatMetricValue(
                          metrics.systemPerformance.p95LatencyMs,
                          "ms"
                        )}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">P99 Latency</p>
                      <p className="text-2xl font-bold">
                        {formatMetricValue(
                          metrics.systemPerformance.p99LatencyMs,
                          "ms"
                        )}
                      </p>
                    </div>
                  </div>
                  <CountMetric
                    label="Timeout Frequency"
                    value={metrics.systemPerformance.timeoutFrequency}
                    icon={AlertTriangle}
                  />
                  <CountMetric
                    label="Retry Occurrences"
                    value={metrics.systemPerformance.retryOccurrences}
                    icon={AlertCircle}
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Platform Stability
                  </h4>
                  <MetricBar
                    label="API Failure Rate"
                    value={metrics.systemPerformance.apiFailureRate}
                    inverted
                  />
                  <MetricBar
                    label="Retry Success Rate"
                    value={metrics.systemPerformance.retrySuccessRate}
                  />
                  <MetricBar
                    label="Session Crash Rate"
                    value={metrics.systemPerformance.sessionCrashRate}
                    inverted
                  />

                  {metrics.systemPerformance.providerSpecificFailureRates && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">
                        Provider Failure Rates
                      </p>
                      <div className="space-y-2">
                        {Object.entries(
                          metrics.systemPerformance.providerSpecificFailureRates
                        ).map(([provider, rate]) => (
                          <div
                            key={provider}
                            className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded"
                          >
                            <span className="text-sm capitalize">
                              {provider}
                            </span>
                            <span
                              className={`text-sm font-medium ${getScoreColor(
                                100 - rate,
                                false
                              )}`}
                            >
                              {rate}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* User Experience */}
        {activeCategory === "userExperience" && metrics.userExperience && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              User Experience Metrics
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Engagement
                </h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    Speaking Time Distribution
                  </p>
                  <div className="flex gap-2 h-6 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500"
                      style={{
                        width: `${metrics.userExperience.userSpeakingTimeRatio || 50}%`,
                      }}
                    />
                    <div
                      className="bg-purple-500"
                      style={{
                        width: `${metrics.userExperience.agentSpeakingTimeRatio || 50}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>
                      User:{" "}
                      {Math.round(
                        metrics.userExperience.userSpeakingTimeRatio || 0
                      )}
                      %
                    </span>
                    <span>
                      Agent:{" "}
                      {Math.round(
                        metrics.userExperience.agentSpeakingTimeRatio || 0
                      )}
                      %
                    </span>
                  </div>
                </div>
                <CountMetric
                  label="User Interruptions"
                  value={metrics.userExperience.userInterruptionFrequency}
                  icon={AlertCircle}
                />
                <CountMetric
                  label="Frustration Indicators"
                  value={metrics.userExperience.frustrationIndicators}
                  icon={AlertTriangle}
                />
                <MetricBar
                  label="Drop-off Sentiment"
                  value={metrics.userExperience.dropOffSentimentScore}
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Satisfaction Proxies
                </h4>
                <MetricBar
                  label="Conversational Smoothness"
                  value={metrics.userExperience.conversationalSmoothnessScore}
                />
                <MetricBar
                  label="Repetition Annoyance"
                  value={metrics.userExperience.repetitionAnnoyanceScore}
                  inverted
                />
                <CountMetric
                  label="Clarification Requests"
                  value={metrics.userExperience.clarificationRequestsCount}
                  icon={MessageSquare}
                />
                <CountMetric
                  label="User Corrections"
                  value={metrics.userExperience.userCorrectionFrequency}
                  icon={AlertCircle}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Detection */}
        {activeCategory === "errorDetection" && metrics.errorDetection && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Error Detection & Root Cause Analysis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Error Categories
                </h4>
                <CountMetric
                  label="ASR Errors"
                  value={metrics.errorDetection.asrErrors}
                  icon={Mic}
                />
                <CountMetric
                  label="NLU Errors"
                  value={metrics.errorDetection.nluErrors}
                  icon={Brain}
                />
                <CountMetric
                  label="Prompt Logic Errors"
                  value={metrics.errorDetection.promptLogicErrors}
                  icon={FileCheck}
                />
                <CountMetric
                  label="Tool Invocation Errors"
                  value={metrics.errorDetection.toolInvocationErrors}
                  icon={Zap}
                />
                <CountMetric
                  label="Integration Errors"
                  value={metrics.errorDetection.integrationErrors}
                  icon={AlertCircle}
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Root Cause Attribution
                </h4>
                <CountMetric
                  label="Model Limitations"
                  value={metrics.errorDetection.modelLimitationErrors}
                  icon={Brain}
                />
                <CountMetric
                  label="Prompt Design Flaws"
                  value={metrics.errorDetection.promptDesignFlawErrors}
                  icon={FileCheck}
                />
                <CountMetric
                  label="Provider Latency Issues"
                  value={metrics.errorDetection.providerLatencyErrors}
                  icon={Zap}
                />
                <CountMetric
                  label="Tool API Failures"
                  value={metrics.errorDetection.toolApiFailureErrors}
                  icon={AlertTriangle}
                />
                <CountMetric
                  label="User Behavior Anomalies"
                  value={metrics.errorDetection.userBehaviorAnomalyErrors}
                  icon={Heart}
                />
              </div>
            </div>

            {/* Error Details Table */}
            {metrics.errorDetection.errorCategories &&
              metrics.errorDetection.errorCategories.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">
                    Detailed Error Breakdown
                  </h4>
                  <div className="space-y-2">
                    {metrics.errorDetection.errorCategories.map(
                      (error, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <SeverityBadge severity={error.severity} />
                            <div>
                              <p className="text-sm font-medium">{error.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {error.rootCause}
                              </p>
                            </div>
                          </div>
                          <span className="text-lg font-semibold">
                            {error.count}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Cost Efficiency */}
        {activeCategory === "costEfficiency" && metrics.costEfficiency && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Cost & Efficiency Metrics
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Cost/Completed Conversation
                </p>
                <p className="text-3xl font-bold text-emerald-600">
                  {formatMetricValue(
                    metrics.costEfficiency.costPerCompletedConversation,
                    "currency"
                  )}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Cost/Qualified Lead
                </p>
                <p className="text-3xl font-bold text-emerald-600">
                  {formatMetricValue(
                    metrics.costEfficiency.costPerQualifiedLead,
                    "currency"
                  )}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Cost/Escalation</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {formatMetricValue(
                    metrics.costEfficiency.costPerEscalation,
                    "currency"
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Token Usage
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <CountMetric
                    label="Total Tokens"
                    value={metrics.costEfficiency.totalTokensUsed}
                  />
                  <CountMetric
                    label="Input Tokens"
                    value={metrics.costEfficiency.inputTokens}
                  />
                  <CountMetric
                    label="Output Tokens"
                    value={metrics.costEfficiency.outputTokens}
                  />
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Token/Outcome Ratio
                    </p>
                    <p className="font-semibold">
                      {metrics.costEfficiency.tokenToOutcomeRatio?.toFixed(2) ||
                        "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Optimization Indicators
                </h4>
                <MetricBar
                  label="Voice Minute Waste"
                  value={metrics.costEfficiency.voiceMinuteWastePercentage}
                  inverted
                />
                <MetricBar
                  label="Over-Talking Cost Loss"
                  value={metrics.costEfficiency.overTalkingCostLoss}
                  inverted
                />
                <MetricBar
                  label="Redundant Token Usage"
                  value={metrics.costEfficiency.redundantTokenUsage}
                  inverted
                />
                <MetricBar
                  label="Silence Cost Ratio"
                  value={metrics.costEfficiency.silenceCostRatio}
                  inverted
                />
              </div>
            </div>
          </div>
        )}

        {/* Compliance & Safety */}
        {activeCategory === "complianceSafety" && metrics.complianceSafety && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-500" />
              Compliance & Safety Metrics
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CountMetric
                label="Sensitive Data Leakage"
                value={metrics.complianceSafety.sensitiveDataLeakageIncidents}
                icon={AlertTriangle}
              />
              <CountMetric
                label="PII Handling Violations"
                value={metrics.complianceSafety.piiHandlingViolations}
                icon={Shield}
              />
              <MetricBar
                label="Consent Handling Accuracy"
                value={metrics.complianceSafety.consentHandlingAccuracy}
              />
              <MetricBar
                label="Compliance Script Adherence"
                value={metrics.complianceSafety.complianceScriptAdherence}
              />
              <MetricBar
                label="Risk Exposure Score"
                value={metrics.complianceSafety.riskExposureScore}
                inverted
              />
            </div>

            {/* Violations List */}
            {metrics.complianceSafety.violations &&
              metrics.complianceSafety.violations.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">
                    Detailed Violations
                  </h4>
                  <div className="space-y-2">
                    {metrics.complianceSafety.violations.map(
                      (violation, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                        >
                          <SeverityBadge severity={violation.severity} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {violation.type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {violation.description}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Evaluator Metrics */}
        {activeCategory === "evaluatorMetrics" && metrics.evaluatorMetrics && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-cyan-500" />
              Evaluator Intelligence Metrics
            </h3>

            <p className="text-sm text-muted-foreground">
              Metrics about how reliable the evaluator&apos;s assessments are.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Evaluation Confidence
                </p>
                <p className="text-3xl font-bold text-cyan-600">
                  {metrics.evaluatorMetrics.evaluationConfidenceScore !== undefined
                    ? `${Math.round(metrics.evaluatorMetrics.evaluationConfidenceScore)}%`
                    : "N/A"}
                </p>
              </div>
              <MetricBar
                label="False Positive Rate"
                value={metrics.evaluatorMetrics.falsePositiveRate}
                inverted
              />
              <MetricBar
                label="False Negative Rate"
                value={metrics.evaluatorMetrics.falseNegativeRate}
                inverted
              />
              <CountMetric
                label="Manual Override Frequency"
                value={metrics.evaluatorMetrics.manualOverrideFrequency}
                icon={AlertCircle}
              />
              <MetricBar
                label="Agreement with Human QA"
                value={
                  metrics.evaluatorMetrics.evaluatorAgreementScoreWithHumanQA
                }
              />
            </div>
          </div>
        )}

        {/* Actionable Insights */}
        {activeCategory === "actionableInsights" &&
          metrics.actionableInsights && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Actionable Insights & Recommendations
              </h3>

              {/* Prompt Improvement Suggestions */}
              {metrics.actionableInsights.autoPromptImprovementSuggestions &&
                metrics.actionableInsights.autoPromptImprovementSuggestions
                  .length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                      <FileCheck className="h-4 w-4" />
                      Prompt Improvement Suggestions
                    </h4>
                    <div className="space-y-3">
                      {metrics.actionableInsights.autoPromptImprovementSuggestions.map(
                        (suggestion, index) => (
                          <div
                            key={index}
                            className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge
                                    className={
                                      suggestion.priority === "high"
                                        ? "bg-red-100 text-red-800"
                                        : suggestion.priority === "medium"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : "bg-gray-100 text-gray-800"
                                    }
                                  >
                                    {suggestion.priority.toUpperCase()}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {suggestion.location}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                  Issue: {suggestion.issue}
                                </p>
                                <p className="text-sm mt-1">
                                  {suggestion.suggestion}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Expected Impact: {suggestion.expectedImpact}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Conversation Rewrite Suggestions */}
              {metrics.actionableInsights.conversationRewriteSuggestions &&
                metrics.actionableInsights.conversationRewriteSuggestions
                  .length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                      <MessageSquare className="h-4 w-4" />
                      Conversation Rewrite Suggestions
                    </h4>
                    <div className="space-y-3">
                      {metrics.actionableInsights.conversationRewriteSuggestions.map(
                        (suggestion, index) => (
                          <div
                            key={index}
                            className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                          >
                            <p className="text-xs text-muted-foreground mb-2">
                              Turn {suggestion.turnIndex + 1}
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-red-600 mb-1">
                                  Original:
                                </p>
                                <p className="text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded">
                                  {suggestion.originalResponse}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-green-600 mb-1">
                                  Suggested:
                                </p>
                                <p className="text-sm bg-green-50 dark:bg-green-900/30 p-2 rounded">
                                  {suggestion.suggestedResponse}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Reason: {suggestion.reason}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Other Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {metrics.actionableInsights.voiceTuningRecommendations &&
                  metrics.actionableInsights.voiceTuningRecommendations.length >
                    0 && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <Mic className="h-4 w-4" />
                        Voice Tuning
                      </h4>
                      <ul className="space-y-2">
                        {metrics.actionableInsights.voiceTuningRecommendations.map(
                          (rec, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {metrics.actionableInsights.flowRestructuringSuggestions &&
                  metrics.actionableInsights.flowRestructuringSuggestions
                    .length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <Target className="h-4 w-4" />
                        Flow Restructuring
                      </h4>
                      <ul className="space-y-2">
                        {metrics.actionableInsights.flowRestructuringSuggestions.map(
                          (rec, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {metrics.actionableInsights.escalationLogicImprovements &&
                  metrics.actionableInsights.escalationLogicImprovements.length >
                    0 && (
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4" />
                        Escalation Logic Improvements
                      </h4>
                      <ul className="space-y-2">
                        {metrics.actionableInsights.escalationLogicImprovements.map(
                          (rec, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </div>

              {/* Empty state */}
              {!metrics.actionableInsights.autoPromptImprovementSuggestions
                ?.length &&
                !metrics.actionableInsights.conversationRewriteSuggestions
                  ?.length &&
                !metrics.actionableInsights.voiceTuningRecommendations?.length &&
                !metrics.actionableInsights.flowRestructuringSuggestions
                  ?.length &&
                !metrics.actionableInsights.escalationLogicImprovements
                  ?.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No actionable insights available</p>
                  </div>
                )}
            </div>
          )}

        {/* Empty State for categories without data */}
        {activeCategory !== "overview" &&
          !metrics[activeCategory as keyof ComprehensiveTestMetrics] && (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm">
                Metrics for this category have not been collected yet.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
