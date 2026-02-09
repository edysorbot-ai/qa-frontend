// ============================================
// COMPREHENSIVE QUALITY METRICS (13 Categories)
// STABLR Platform - Metrics Types
// ============================================

// 1. Conversation Quality Metrics (Core Evaluator Layer)
export interface ConversationQualityMetrics {
  // Understanding and Intent Handling
  intentDetectionAccuracy?: number;
  intentConfidenceScore?: number;
  wrongIntentClassificationRate?: number;
  intentSwitchingFrequency?: number;
  missedIntentInstances?: number;
  ambiguousIntentResolutionScore?: number;
  multiIntentHandlingSuccessRate?: number;
  
  // Context Management
  contextRetentionScore?: number;
  contextLossIncidents?: number;
  longConversationCoherenceScore?: number;
  followUpRelevanceScore?: number;
  repetitionRateDueToContextFailure?: number;
  
  // Response Quality
  responseRelevanceScore?: number;
  hallucinationFrequency?: number;
  offScriptResponseRate?: number;
  overVerboseResponseRate?: number;
  underInformativeResponseRate?: number;
  fillerResponseRatio?: number;
  unsafeOrPolicyViolatingResponses?: number;
  
  // Linguistic Quality
  grammarAccuracy?: number;
  pronunciationClarity?: number;
  accentConsistency?: number;
  toneAlignmentScore?: number;
  empathyScore?: number;
  naturalnessScore?: number;
  speechDisfluencyRate?: number;
}

// 2. Prompt Compliance and Instruction Adherence
export interface PromptComplianceMetrics {
  // Prompt Adherence
  systemPromptComplianceScore?: number;
  instructionViolationCount?: number;
  missingMandatorySteps?: number;
  incorrectFlowExecution?: number;
  incorrectEscalationHandling?: number;
  promptDriftOverConversationLength?: number;
  
  // Rule Violations
  forbiddenPhraseUsage?: number;
  missingComplianceStatements?: number;
  wrongFallbackBehavior?: number;
  improperHandoverPhrasing?: number;
  invalidDataCollectionAttempts?: number;
}

// 3. Conversation Outcome Effectiveness
export interface ConversationOutcomeMetrics {
  // Goal Completion
  goalCompletionRate?: number;
  partialCompletionRate?: number;
  failedCompletionRate?: number;
  abandonedConversationRate?: number;
  userDisengagementPoints?: number;
  
  // Funnel Performance
  leadQualificationAccuracy?: number;
  dataCaptureCompleteness?: number;
  appointmentBookingSuccessRate?: number;
  escalationSuccessRate?: number;
  callbackSchedulingAccuracy?: number;
}

// 4. Voice-Specific Performance Metrics
export interface VoicePerformanceMetrics {
  // Audio Quality
  audioClarityScore?: number;
  backgroundNoiseInterference?: number;
  latencySpikes?: number;
  audioCutoffIncidents?: number;
  voiceOverlapIncidents?: number;
  
  // Speech Dynamics
  speechSpeedConsistency?: number;
  pauseAppropriatenessScore?: number;
  turnTakingAccuracy?: number;
  interruptionRate?: number;
  silenceThresholdViolations?: number;
  
  // TTS Performance
  voiceStabilityScore?: number;
  emotionModulationAccuracy?: number;
  pronunciationErrorRate?: number;
  mispronouncedEntityCount?: number;
  voiceResetIncidents?: number;
}

// 5. Latency and System Performance Metrics
export interface SystemPerformanceMetrics {
  // Response Timing
  firstResponseLatencyMs?: number;
  averageResponseLatencyMs?: number;
  p95LatencyMs?: number;
  p99LatencyMs?: number;
  timeoutFrequency?: number;
  retryOccurrences?: number;
  
  // Platform Stability
  apiFailureRate?: number;
  retrySuccessRate?: number;
  sessionCrashRate?: number;
  providerSpecificFailureRates?: Record<string, number>;
}

// 6. User Experience Metrics
export interface UserExperienceMetrics {
  // Engagement
  userSpeakingTimeRatio?: number;
  agentSpeakingTimeRatio?: number;
  userInterruptionFrequency?: number;
  frustrationIndicators?: number;
  sentimentTrendOverTime?: number[];
  dropOffSentimentScore?: number;
  
  // Satisfaction Proxies
  conversationalSmoothnessScore?: number;
  repetitionAnnoyanceScore?: number;
  clarificationRequestsCount?: number;
  userCorrectionFrequency?: number;
}

// 7. Error Detection and Root Cause Metrics
export interface ErrorDetectionMetrics {
  // Error Categorization
  asrErrors?: number;
  nluErrors?: number;
  promptLogicErrors?: number;
  toolInvocationErrors?: number;
  integrationErrors?: number;
  
  // Root Cause Attribution
  modelLimitationErrors?: number;
  promptDesignFlawErrors?: number;
  providerLatencyErrors?: number;
  toolApiFailureErrors?: number;
  userBehaviorAnomalyErrors?: number;
  
  // Error Details
  errorCategories?: Array<{
    type: string;
    count: number;
    severity: 'critical' | 'warning' | 'info';
    rootCause: string;
  }>;
}

// 8. Comparative and Benchmarking Metrics
export interface BenchmarkingMetrics {
  // Model Comparison
  modelWiseAccuracy?: Record<string, number>;
  providerWiseLatency?: Record<string, number>;
  costPerSuccessfulConversation?: number;
  errorRatePerProvider?: Record<string, number>;
  completionRatePerProvider?: Record<string, number>;
  
  // Versioning
  beforeAfterPromptChangeImpact?: number;
  modelUpgradeImpactAnalysis?: number;
  regressionDetectionScore?: number;
}

// 9. Cost and Efficiency Metrics
export interface CostEfficiencyMetrics {
  // Cost Efficiency
  costPerCompletedConversation?: number;
  costPerQualifiedLead?: number;
  costPerEscalation?: number;
  tokenToOutcomeRatio?: number;
  voiceMinuteWastePercentage?: number;
  
  // Optimization Indicators
  overTalkingCostLoss?: number;
  redundantTokenUsage?: number;
  silenceCostRatio?: number;
  
  // Token Usage
  totalTokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
}

// 10. Compliance, Risk, and Safety Metrics
export interface ComplianceSafetyMetrics {
  sensitiveDataLeakageIncidents?: number;
  piiHandlingViolations?: number;
  consentHandlingAccuracy?: number;
  complianceScriptAdherence?: number;
  riskExposureScore?: number;
  
  // Detailed violations
  violations?: Array<{
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    timestamp?: number;
  }>;
}

// 11. Evaluator Intelligence Metrics (Meta Layer)
export interface EvaluatorMetrics {
  evaluationConfidenceScore?: number;
  falsePositiveRate?: number;
  falseNegativeRate?: number;
  manualOverrideFrequency?: number;
  evaluatorAgreementScoreWithHumanQA?: number;
}

// 12. Actionable Insights and Recommendations
export interface ActionableInsights {
  autoPromptImprovementSuggestions?: Array<{
    issue: string;
    suggestion: string;
    location: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: string;
  }>;
  conversationRewriteSuggestions?: Array<{
    turnIndex: number;
    originalResponse: string;
    suggestedResponse: string;
    reason: string;
  }>;
  voiceTuningRecommendations?: string[];
  flowRestructuringSuggestions?: string[];
  escalationLogicImprovements?: string[];
}

// Combined Comprehensive Metrics Interface
export interface ComprehensiveTestMetrics {
  // Category 1: Conversation Quality
  conversationQuality?: ConversationQualityMetrics;
  
  // Category 2: Prompt Compliance
  promptCompliance?: PromptComplianceMetrics;
  
  // Category 3: Outcome Effectiveness
  outcomeEffectiveness?: ConversationOutcomeMetrics;
  
  // Category 4: Voice Performance
  voicePerformance?: VoicePerformanceMetrics;
  
  // Category 5: System Performance
  systemPerformance?: SystemPerformanceMetrics;
  
  // Category 6: User Experience
  userExperience?: UserExperienceMetrics;
  
  // Category 7: Error Detection
  errorDetection?: ErrorDetectionMetrics;
  
  // Category 8: Benchmarking
  benchmarking?: BenchmarkingMetrics;
  
  // Category 9: Cost Efficiency
  costEfficiency?: CostEfficiencyMetrics;
  
  // Category 10: Compliance & Safety
  complianceSafety?: ComplianceSafetyMetrics;
  
  // Category 11: Evaluator Metrics
  evaluatorMetrics?: EvaluatorMetrics;
  
  // Category 12: Actionable Insights
  actionableInsights?: ActionableInsights;
  
  // Overall Scores (Dashboard Summary)
  overallScore?: number;
  categoryScores?: {
    conversationQuality: number;
    promptCompliance: number;
    outcomeEffectiveness: number;
    voicePerformance: number;
    systemPerformance: number;
    userExperience: number;
    complianceSafety: number;
  };
}

// Metric display configuration
export interface MetricDisplayConfig {
  key: string;
  label: string;
  description?: string;
  format: 'percentage' | 'number' | 'count' | 'ms' | 'currency';
  goodThreshold?: number;
  warningThreshold?: number;
  invertedScale?: boolean; // true if lower is better
}

// Category configurations for dashboard
export const METRIC_CATEGORIES = {
  conversationQuality: {
    label: 'Conversation Quality',
    icon: 'MessageSquare',
    description: 'How well the AI agent handled the conversation',
    color: 'blue',
  },
  promptCompliance: {
    label: 'Prompt Compliance',
    icon: 'FileCheck',
    description: 'Adherence to system instructions and rules',
    color: 'purple',
  },
  outcomeEffectiveness: {
    label: 'Outcome Effectiveness',
    icon: 'Target',
    description: 'Goal completion and funnel performance',
    color: 'green',
  },
  voicePerformance: {
    label: 'Voice Performance',
    icon: 'Mic',
    description: 'Audio quality and speech dynamics',
    color: 'orange',
  },
  systemPerformance: {
    label: 'System Performance',
    icon: 'Zap',
    description: 'Latency and platform stability',
    color: 'yellow',
  },
  userExperience: {
    label: 'User Experience',
    icon: 'Heart',
    description: 'Engagement and satisfaction metrics',
    color: 'pink',
  },
  errorDetection: {
    label: 'Error Detection',
    icon: 'AlertTriangle',
    description: 'Error categorization and root cause analysis',
    color: 'red',
  },
  benchmarking: {
    label: 'Benchmarking',
    icon: 'BarChart',
    description: 'Comparative and versioning metrics',
    color: 'indigo',
  },
  costEfficiency: {
    label: 'Cost Efficiency',
    icon: 'DollarSign',
    description: 'Cost optimization metrics',
    color: 'emerald',
  },
  complianceSafety: {
    label: 'Compliance & Safety',
    icon: 'Shield',
    description: 'Risk and regulatory compliance',
    color: 'slate',
  },
  evaluatorMetrics: {
    label: 'Evaluator Intelligence',
    icon: 'Brain',
    description: 'Meta-evaluation quality metrics',
    color: 'cyan',
  },
  actionableInsights: {
    label: 'Actionable Insights',
    icon: 'Lightbulb',
    description: 'Recommendations and suggestions',
    color: 'amber',
  },
} as const;

// Helper function to get score color
export function getScoreColor(score: number, inverted = false): string {
  const adjustedScore = inverted ? 100 - score : score;
  if (adjustedScore >= 80) return 'text-green-600';
  if (adjustedScore >= 60) return 'text-yellow-600';
  if (adjustedScore >= 40) return 'text-orange-600';
  return 'text-red-600';
}

// Helper function to get score background color
export function getScoreBgColor(score: number, inverted = false): string {
  const adjustedScore = inverted ? 100 - score : score;
  if (adjustedScore >= 80) return 'bg-green-500';
  if (adjustedScore >= 60) return 'bg-yellow-500';
  if (adjustedScore >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

// Helper function to format metric values
export function formatMetricValue(
  value: number | undefined | null,
  format: MetricDisplayConfig['format']
): string {
  if (value === undefined || value === null) return 'N/A';
  
  switch (format) {
    case 'percentage':
      return `${Math.round(value)}%`;
    case 'ms':
      return `${Math.round(value)}ms`;
    case 'currency':
      return `$${value.toFixed(2)}`;
    case 'count':
      return Math.round(value).toString();
    default:
      return value.toFixed(1);
  }
}
