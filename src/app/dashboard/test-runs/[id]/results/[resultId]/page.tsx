"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ThumbsUp,
  MessageSquare,
  Mic,
  Bot,
  User,
  BarChart3,
  TrendingUp,
  Wrench,
  Shield,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModernAudioPlayer } from "@/components/ui/modern-audio-player";
import ComprehensiveMetricsDashboard from "@/components/comprehensive-metrics-dashboard";
import { ContextGrowthChart } from "@/components/context-growth-chart";
import { ToolDecisionTimeline } from "@/components/tool-decision-timeline";
import { MarkAsGoldenButton } from "@/components/golden-tests-dashboard";
import { InferenceScanPanel } from "@/components/inference-scan-panel";
import { ComprehensiveTestMetrics } from "@/types/metrics";

interface ConversationTurn {
  role: "user" | "agent";
  content: string;
  timestamp: string;
  durationMs?: number;
}

interface EvaluationIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  turn: number;
  agentSaid: string;
  problem: string;
  impact: string;
  shouldHaveSaid: string;
}

interface TestResultDetail {
  id: string;
  testRunId: string;
  testRunName: string;
  testCaseId: string;
  position: number;
  totalTests: number;
  
  // Test info
  scenario: string;
  userInput: string;
  expectedResponse: string;
  actualResponse: string;
  category: string;
  status: "passed" | "failed" | "pending";
  
  // Timing
  durationMs: number;
  durationFormatted: string;
  latencyMs: number;
  startedAt: string;
  completedAt: string;
  
  // Audio/Recording
  hasRecording: boolean;
  userAudioUrl: string | null;
  agentAudioUrl: string | null;
  callId: string | null;
  
  // Transcripts
  userTranscript: string | null;
  agentTranscript: string | null;
  conversationTurns: ConversationTurn[];
  
  // Evaluation
  overallScore: number;
  coreMetrics: {
    accuracy: number;
    relevance: number;
    coherence: number;
    completeness: number;
  };
  advancedMetrics: {
    noHallucination: number;
    responseSpeed: number;
    infoAccuracy: number;
    protocol: number;
    resolution: number;
    voiceQuality: number;
    tone: number;
    empathy: number;
  };
  analysis: {
    summary: string;
    strengths: string[];
    issues: Array<string | EvaluationIssue>;
  };
  
  // Comprehensive Metrics (13 Categories)
  comprehensiveMetrics?: ComprehensiveTestMetrics;
  
  // Intent
  detectedIntent: string | null;
  intentMatch: boolean;
  outputMatch: boolean;
  
  // Error
  errorMessage: string | null;
}

const statusColors: Record<string, string> = {
  passed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-teal-100 text-teal-800",
};

function CircularProgress({ value, label, size = 100 }: { value: number; label: string; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#1A5253' : '#ef4444';
  
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold">{value}%</span>
      </div>
      <span className="text-sm text-muted-foreground mt-2">{label}</span>
    </div>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-teal-600' : 'bg-red-500';
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function TestResultDetailPage() {
  const { getToken } = useAuth();
  useRouter();
  const params = useParams();
  const testRunId = params.id as string;
  const resultId = params.resultId as string;

  const [result, setResult] = useState<TestResultDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Audio player state
  const [isPlaying] = useState(false);
  const [, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchResult = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        `${api.baseUrl}/api/test-execution/result/${resultId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResult(data.result);
        } else {
          setError(data.error || "Failed to fetch result");
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch result");
      }
    } catch (error) {
      console.error("Error fetching result:", error);
      setError("Failed to fetch result");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, resultId]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  // Audio controls - keeping refs for potential future use
  void isPlaying;
  void audioRef;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/test-runs/${testRunId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Test Result</h1>
        </div>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error || "Result not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/test-runs/${testRunId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Test {result.position} of {result.totalTests}
              </h1>
              <Badge className={statusColors[result.status]}>
                {result.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {result.testRunName} • {result.category}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {result.status === "passed" && (
            <MarkAsGoldenButton resultId={result.id} />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchResult}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          
          {/* Navigation between results */}
          {result.position > 1 && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                // Navigate to previous result (would need to fetch previous result ID)
              }}
              disabled
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {result.position < result.totalTests && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                // Navigate to next result (would need to fetch next result ID)
              }}
              disabled
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scenario Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Test Scenario</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Scenario</label>
                <p className="mt-1">{result.scenario}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User Input</label>
                  <p className="mt-1 text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{result.userInput}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expected Response</label>
                  <p className="mt-1 text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{result.expectedResponse}</p>
                </div>
              </div>
              {result.actualResponse && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Actual Response</label>
                  <p className="mt-1 text-sm bg-teal-50 dark:bg-[#0A2E2F]/20 p-3 rounded-lg border border-teal-200 dark:border-teal-800 whitespace-pre-wrap">
                    {result.actualResponse}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Prompt Improvement Suggestions - Only show for failed tests */}
          {result.status === 'failed' && (
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-[#0A2E2F]/20 dark:to-[#0F3D3E]/20 rounded-lg border-2 border-teal-200 dark:border-teal-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-teal-900 dark:text-teal-100">
                <AlertTriangle className="h-5 w-5" />
                Prompt Improvement Suggestions
              </h2>
              
              <div className="space-y-4">
                {/* Analysis of what went wrong */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">What Went Wrong</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    The agent&apos;s response didn&apos;t match the expected outcome. Based on the test case expectations, the agent should have {result.expectedResponse}
                  </p>
                </div>

                {/* Prompt modifications */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-3">Recommended Prompt Additions</h3>
                  <div className="space-y-3">
                    {/* Determine prompt suggestions based on category */}
                    {result.category === 'Off-topic Handling' && (
                      <>
                        <div className="bg-teal-50 dark:bg-[#0A2E2F]/30 rounded p-3 border-l-4 border-teal-600">
                          <p className="text-xs font-mono text-gray-800 dark:text-gray-200 mb-1">
                            &quot;When users ask questions unrelated to your purpose (e.g., personal matters, dating advice, non-academic topics), politely redirect them back to your core function. Say: &apos;I appreciate your question, but I&apos;m specifically designed to help with [your purpose]. Let&apos;s get you back on track with [relevant topic].&apos;&quot;
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">Add this to: System Instructions → Conversation Guidelines section</p>
                        </div>
                        <div className="bg-teal-50 dark:bg-[#0A2E2F]/30 rounded p-3 border-l-4 border-teal-600">
                          <p className="text-xs font-mono text-gray-800 dark:text-gray-200 mb-1">
                            &quot;Never engage with off-topic requests. Always acknowledge the user&apos;s question briefly, then redirect to relevant topics within your scope.&quot;
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">Add this to: System Instructions → Boundaries section</p>
                        </div>
                      </>
                    )}
                    
                    {result.category === 'Budget Inquiry' && (
                      <>
                        <div className="bg-teal-50 dark:bg-[#0A2E2F]/30 rounded p-3 border-l-4 border-teal-600">
                          <p className="text-xs font-mono text-gray-800 dark:text-gray-200 mb-1">
                            &quot;When discussing financial information, always use the exact currency symbols and formats provided. If a budget is &apos;$5000&apos;, maintain the dollar sign and specific amount. Don&apos;t generalize or estimate unless specifically asked to do so.&quot;
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">Add this to: System Instructions → Data Accuracy section</p>
                        </div>
                      </>
                    )}

                    {result.category === 'User Requests Callback' && (
                      <>
                        <div className="bg-teal-50 dark:bg-[#0A2E2F]/30 rounded p-3 border-l-4 border-teal-600">
                          <p className="text-xs font-mono text-gray-800 dark:text-gray-200 mb-1">
                            &quot;When a user requests a callback or wants to speak with someone else, acknowledge their request immediately and provide clear next steps. For example: &apos;I understand you&apos;d like a callback. Let me collect your preferred contact details and time.&apos;&quot;
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">Add this to: System Instructions → Call Handling section</p>
                        </div>
                      </>
                    )}

                    {/* Generic fallback for other categories */}
                    {!['Off-topic Handling', 'Budget Inquiry', 'User Requests Callback'].includes(result.category) && (
                      <>
                        <div className="bg-teal-50 dark:bg-[#0A2E2F]/30 rounded p-3 border-l-4 border-teal-600">
                          <p className="text-xs font-mono text-gray-800 dark:text-gray-200 mb-1">
                            &quot;For {result.category} scenarios: Ensure you {result.expectedResponse.toLowerCase()}. Always prioritize accuracy and completeness in your responses.&quot;
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">Add this to: System Instructions → {result.category} section</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick action guide */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">Quick Fix Guide</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>Go to <strong>Agent Configuration</strong> page</li>
                    <li>Locate the <strong>System Prompt</strong> or <strong>Instructions</strong> section</li>
                    <li>Copy the recommended prompt additions above</li>
                    <li>Paste them into the appropriate section mentioned</li>
                    <li>Save and re-run this test to verify the fix</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Test Cases in This Call */}
        <div className="space-y-6">
          {/* Test Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Test Result</h2>
            <div className="flex items-center justify-between mb-4">
              <Badge className={statusColors[result.status]} variant="outline">
                {result.status === 'passed' ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                {result.status.toUpperCase()}
              </Badge>
              <span className="text-sm text-muted-foreground">{result.category}</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{result.durationFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latency</span>
                <span className="font-medium">{result.latencyMs}ms</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {result.errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6">
              <h2 className="text-lg font-semibold text-red-600 mb-2 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Error
              </h2>
              <p className="text-sm text-red-600">{result.errorMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs for Transcript and Analytics */}
      <Tabs defaultValue="comprehensive" className="mt-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="comprehensive" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="context-growth" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Context Growth
          </TabsTrigger>
          <TabsTrigger value="tool-decisions" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Tool Decisions
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="transcript" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Legacy
          </TabsTrigger>
        </TabsList>

        {/* Comprehensive Metrics Tab */}
        <TabsContent value="comprehensive" className="mt-6">
          {result.comprehensiveMetrics ? (
            <ComprehensiveMetricsDashboard metrics={result.comprehensiveMetrics} />
          ) : (
            <ComprehensiveMetricsDashboard 
              metrics={{
                overallScore: result.overallScore,
                categoryScores: {
                  conversationQuality: result.coreMetrics.accuracy,
                  promptCompliance: result.advancedMetrics.protocol,
                  outcomeEffectiveness: result.coreMetrics.completeness,
                  voicePerformance: result.advancedMetrics.voiceQuality,
                  systemPerformance: result.advancedMetrics.responseSpeed,
                  userExperience: result.advancedMetrics.empathy,
                  complianceSafety: result.advancedMetrics.noHallucination,
                },
                conversationQuality: {
                  intentDetectionAccuracy: result.intentMatch ? 100 : 0,
                  responseRelevanceScore: result.coreMetrics.relevance,
                  hallucinationFrequency: 100 - result.advancedMetrics.noHallucination,
                  empathyScore: result.advancedMetrics.empathy,
                  toneAlignmentScore: result.advancedMetrics.tone,
                  naturalnessScore: result.advancedMetrics.voiceQuality,
                },
                voicePerformance: {
                  audioClarityScore: result.advancedMetrics.voiceQuality,
                  voiceStabilityScore: result.advancedMetrics.voiceQuality,
                },
                systemPerformance: {
                  averageResponseLatencyMs: result.latencyMs,
                  firstResponseLatencyMs: result.latencyMs,
                },
                outcomeEffectiveness: {
                  goalCompletionRate: result.outputMatch ? 100 : 0,
                },
                actionableInsights: result.analysis.issues.length > 0 ? {
                  autoPromptImprovementSuggestions: result.analysis.issues.map((issue) => ({
                    issue: typeof issue === 'string' ? issue : (issue as EvaluationIssue).problem,
                    suggestion: typeof issue === 'string' 
                      ? 'Review and update the prompt to handle this scenario better'
                      : (issue as EvaluationIssue).shouldHaveSaid,
                    location: 'System Prompt',
                    priority: 'medium' as const,
                    expectedImpact: 'Improved response accuracy',
                  })),
                } : undefined,
              }} 
            />
          )}
        </TabsContent>

        {/* Context Growth Tab */}
        <TabsContent value="context-growth" className="mt-6">
          <ContextGrowthTab resultId={result.id} />
        </TabsContent>

        {/* Tool Decisions Tab */}
        <TabsContent value="tool-decisions" className="mt-6">
          <ToolDecisionsTab resultId={result.id} />
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="mt-6">
          <InferenceScanPanel testResultId={result.id} />
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="mt-6 space-y-6">
          {/* Call Recording */}
          {result.hasRecording && result.agentAudioUrl ? (
            <ModernAudioPlayer
              src={result.agentAudioUrl}
              conversationTurns={result.conversationTurns || []}
              onTimeUpdate={(time) => setCurrentTime(time)}
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Call Recording
              </h2>
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No recording available for this test</p>
              </div>
            </div>
          )}

          {/* Conversation Transcript */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation Transcript
              </h2>
              {result.conversationTurns && result.conversationTurns.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {result.conversationTurns.length} messages
                </span>
              )}
            </div>
            
            {result.conversationTurns && result.conversationTurns.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {result.conversationTurns.map((turn, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${turn.role === 'user' ? 'justify-start' : 'justify-start'}`}
                  >
                    {/* Avatar */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      turn.role === 'user' 
                        ? 'bg-teal-800 text-white' 
                        : 'bg-teal-600 text-white'
                    }`}>
                      {turn.role === 'user' ? (
                        <User className="h-5 w-5" />
                      ) : (
                        <Bot className="h-5 w-5" />
                      )}
                    </div>
                    
                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold ${
                          turn.role === 'user' ? 'text-teal-700 dark:text-teal-300' : 'text-teal-600 dark:text-teal-400'
                        }`}>
                          {turn.role === 'user' ? 'TEST CALLER' : 'AI AGENT'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {typeof turn.timestamp === 'number' 
                            ? new Date(turn.timestamp).toLocaleTimeString()
                            : turn.timestamp}
                        </span>
                      </div>
                      <div className={`rounded-lg p-4 ${
                        turn.role === 'user'
                          ? 'bg-teal-100 dark:bg-[#0A2E2F]'
                          : 'bg-teal-50 dark:bg-[#0A2E2F]/50'
                      }`}>
                        <p className="text-sm leading-relaxed">{turn.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Show user and agent transcripts if no conversation turns */}
                {result.userTranscript && (
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-teal-800 text-white flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">TEST CALLER</span>
                      </div>
                      <div className="bg-teal-100 dark:bg-[#0A2E2F] rounded-lg p-4">
                        <p className="text-sm leading-relaxed">{result.userTranscript}</p>
                      </div>
                    </div>
                  </div>
                )}
                {result.agentTranscript && (
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">AI AGENT</span>
                      </div>
                      <div className="bg-teal-50 dark:bg-[#0A2E2F]/50 rounded-lg p-4">
                        <p className="text-sm leading-relaxed">{result.agentTranscript}</p>
                      </div>
                    </div>
                  </div>
                )}
                {!result.userTranscript && !result.agentTranscript && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No transcript available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Overall Score */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Overall Score</h2>
              <div className="flex justify-center relative">
                <CircularProgress value={result.overallScore} label="Overall" size={140} />
              </div>
              <div className="mt-4 text-center">
                <p className={`text-sm font-medium ${
                  result.overallScore >= 80 ? 'text-green-600' :
                  result.overallScore >= 60 ? 'text-teal-700' : 'text-red-600'
                }`}>
                  {result.overallScore >= 80 ? 'Excellent' :
                   result.overallScore >= 60 ? 'Good' :
                   result.overallScore >= 40 ? 'Needs Improvement' : 'Poor'}
                </p>
              </div>
            </div>

            {/* Core Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Core Metrics</h2>
              <div className="space-y-4">
                <MetricBar label="Accuracy" value={result.coreMetrics.accuracy} />
                <MetricBar label="Relevance" value={result.coreMetrics.relevance} />
                <MetricBar label="Coherence" value={result.coreMetrics.coherence} />
                <MetricBar label="Completeness" value={result.coreMetrics.completeness} />
              </div>
            </div>

            {/* Advanced Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Advanced Metrics</h2>
              <div className="space-y-3">
                <MetricBar label="No Hallucination" value={result.advancedMetrics.noHallucination} />
                <MetricBar label="Response Speed" value={result.advancedMetrics.responseSpeed} />
                <MetricBar label="Info Accuracy" value={result.advancedMetrics.infoAccuracy} />
                <MetricBar label="Protocol" value={result.advancedMetrics.protocol} />
              </div>
            </div>

            {/* Voice & Tone Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Voice & Tone</h2>
              <div className="space-y-3">
                <MetricBar label="Resolution" value={result.advancedMetrics.resolution} />
                <MetricBar label="Voice Quality" value={result.advancedMetrics.voiceQuality} />
                <MetricBar label="Tone" value={result.advancedMetrics.tone} />
                <MetricBar label="Empathy" value={result.advancedMetrics.empathy} />
              </div>
            </div>

            {/* AI Evaluation Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 md:col-span-2">
              <h2 className="text-lg font-semibold mb-4">AI Evaluation Summary</h2>
              
              {result.analysis.summary && (
                <p className="text-sm text-muted-foreground mb-4">
                  {result.analysis.summary}
                </p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.analysis.strengths && result.analysis.strengths.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-green-600 flex items-center gap-2 mb-2">
                      <ThumbsUp className="h-4 w-4" />
                      Strengths
                    </h3>
                    <ul className="space-y-1">
                      {result.analysis.strengths.map((strength, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {result.analysis.issues && result.analysis.issues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-red-600 flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Issues ({result.analysis.issues.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.analysis.issues.map((issue, i) => {
                        if (typeof issue === 'string') {
                          return (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <span>{issue}</span>
                            </div>
                          );
                        }
                        const issueObj = issue as EvaluationIssue;
                        return (
                          <div key={i} className="bg-red-50 dark:bg-red-900/20 rounded p-2 border border-red-200 dark:border-red-800">
                            <p className="text-xs font-medium text-red-700 dark:text-red-300">
                              {issueObj.problem}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {!result.analysis.summary && 
               (!result.analysis.strengths || result.analysis.strengths.length === 0) && 
               (!result.analysis.issues || result.analysis.issues.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No AI evaluation available
                </p>
              )}
            </div>

            {/* Test Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Test Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{result.durationFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Latency</span>
                  <span className="font-medium">{result.latencyMs}ms</span>
                </div>
                {result.detectedIntent && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Detected Intent</span>
                    <span className="font-medium">{result.detectedIntent}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Intent Match</span>
                  <Badge variant={result.intentMatch ? "default" : "destructive"}>
                    {result.intentMatch ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Output Match</span>
                  <Badge variant={result.outputMatch ? "default" : "destructive"}>
                    {result.outputMatch ? "Yes" : "No"}
                  </Badge>
                </div>
                {result.startedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span className="font-medium text-xs">
                      {new Date(result.startedAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {result.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium text-xs">
                      {new Date(result.completedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Context Growth Tab Component
function ContextGrowthTab({ resultId }: { resultId: string }) {
  const { getToken } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return;
        
        const response = await fetch(
          `${api.baseUrl}/api/test-runs/results/${resultId}/context-metrics`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setMetrics(data.metrics);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load context growth data');
        }
      } catch (err: any) {
        console.error('Failed to fetch context metrics:', err);
        setError('Failed to load context growth data');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [resultId, getToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Analyzing context growth...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
        <div className="flex items-center gap-2 text-yellow-500 mb-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Unable to Load Context Metrics</span>
        </div>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return <ContextGrowthChart metrics={metrics} />;
}

// Tool Decisions Tab Component
function ToolDecisionsTab({ resultId }: { resultId: string }) {
  const { getToken } = useAuth();
  const [trace, setTrace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchToolDecisions = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return;
        
        const response = await fetch(
          `${api.baseUrl}/api/test-runs/results/${resultId}/tool-decisions`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setTrace(data.trace);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load tool decisions');
        }
      } catch (err: any) {
        console.error('Failed to fetch tool decisions:', err);
        setError('Failed to load tool decisions');
      } finally {
        setLoading(false);
      }
    };

    fetchToolDecisions();
  }, [resultId, getToken]);

  const handleExportAudit = async () => {
    try {
      setIsExporting(true);
      const token = await getToken();
      if (!token) return;
      
      const response = await fetch(
        `${api.baseUrl}/api/test-runs/results/${resultId}/tool-decisions/audit`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Download as JSON file
        const blob = new Blob([JSON.stringify(data.audit, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tool-decision-audit-${resultId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        console.error('Failed to export audit');
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading tool decisions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
        <div className="flex items-center gap-2 text-yellow-500 mb-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Unable to Load Tool Decisions</span>
        </div>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <ToolDecisionTimeline 
      trace={trace} 
      onExportAudit={handleExportAudit}
      isExporting={isExporting}
    />
  );
}
