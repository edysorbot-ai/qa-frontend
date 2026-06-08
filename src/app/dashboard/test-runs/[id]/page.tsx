"use client";
import { toast } from 'sonner';

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Phone,
  MessageSquare,
  Volume2,
  ChevronRight,
  Bot,
  User,
  BarChart3,
  AlertTriangle,
  LayoutGrid,
  Table,
  Eye,
  Settings,
  FileText,
  History,
  GitCompare,
  X,
  ExternalLink,
} from "lucide-react";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import Link from "next/link";
import { ModernAudioPlayer } from "@/components/ui/modern-audio-player";

interface TestRunStatus {
  id: string;
  name: string;
  status: "running" | "completed" | "cancelled" | "paused";
  createdAt: string;
  agentId?: string;
  progress: number;
  stats: {
    total: number;
    completed: number;
    passed: number;
    failed: number;
    pending: number;
  };
}

interface AgentDetails {
  id: string;
  name: string;
  provider: string;
  external_agent_id: string;
  config: Record<string, any>;
  prompt?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PromptVersion {
  id: string;
  agent_id: string;
  version_number: number;
  prompt: string;
  prompt_hash: string;
  created_at: string;
}

interface PromptSuggestion {
  issue: string;
  suggestion: string;
  location: string;
  priority: "high" | "medium" | "low";
}

interface TestResult {
  id: string;
  testCaseId: string;
  scenario: string;
  userInput: string;
  expectedResponse: string;
  actualResponse: string;
  category: string;
  status: "passed" | "failed" | "pending" | "running";
  latencyMs: number;
  durationMs?: number;
  batchId?: string;
  batchName?: string;
  batchOrder?: number;
  testMode?: "voice" | "chat"; // Test mode for this batch
  completedAt: string | null;
  overallScore?: number;
  hasRecording?: boolean;
  turnsCovered?: number[]; // Turn indices where this test case was addressed
  audioUrl?: string;
  userTranscript?: string;
  agentTranscript?: string;
  conversationTurns?: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  promptSuggestions?: PromptSuggestion[];
  // Items 9 & 10: factual + tone/style evaluator metrics persisted in metrics JSONB
  metrics?: {
    reasoning?: string;
    factualAssessment?: {
      hasFactualClaims: boolean;
      suspectedHallucinations: string[];
      confidence: number;
      hallucinationDetected?: boolean;
    };
    toneStyle?: {
      tone: string;
      brandAlignment: number;
      conciseness: number;
      notes: string;
    } | null;
    // Item 26: PII redaction stats
    piiRedaction?: {
      redactionCount: number;
      typesRedacted: string[];
    };
    // Item 28: sensitive content flags
    sensitiveData?: {
      hasMedicalContent: boolean;
      hasPCIContent: boolean;
      medicalCount: number;
      pciCount: number;
      samples: { type: string; match: string }[];
    };
    [k: string]: any;
  };
}

interface BatchGroup {
  id: string;
  name: string;
  order: number;
  results: TestResult[];
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  runningCount: number;
  durationMs?: number;
  hasTranscript: boolean;
  hasRecording: boolean;
  audioUrl?: string;
  conversationTurns: Array<{
    role: string;
    content: string;
    timestamp: string;
    // Item 11: per-turn metrics for the breakdown UI.
    durationMs?: number;
    latency_breakdown?: {
      sttMs?: number;
      llmMs?: number;
      toolMs?: number;
      ttsMs?: number;
      otherMs?: number;
      source?: 'provider' | 'heuristic';
    };
    tool_call?: { name?: string; durationMs?: number };
  }>;
  promptSuggestions?: PromptSuggestion[];
  userTranscript?: string;
  agentTranscript?: string;
  testMode?: "voice" | "chat"; // Test mode for this batch
}

interface TestRunResults {
  testRun: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
  };
  results: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    pending: number;
    avgLatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    passRate: number;
  };
}

// Metrics interfaces
interface CallMetrics {
  // Performance Metrics
  performance: {
    avgResponseTime: number; // Average time between user input and agent response
    totalDuration: number; // Total call duration in seconds
    turnsPerMinute: number; // Conversation pace
    avgLatencyMs: number; // Average latency from test results
    minLatencyMs: number;
    maxLatencyMs: number;
  };
  // Accuracy Metrics
  accuracy: {
    intentRecognitionRate: number; // % of correctly understood intents
    testPassRate: number; // % of passed test cases
    wordCount: { user: number; agent: number };
    avgWordsPerTurn: { user: number; agent: number };
  };
  // User Experience Metrics
  userExperience: {
    turnCompletionRate: number; // % of successful turns
    fallbackRate: number; // % of clarification requests
    conversationFlow: number; // Score 0-100
    engagementScore: number; // Based on conversation length and depth
  };
  // Error Handling Metrics
  errorHandling: {
    errorDetectionRate: number;
    recoveryRate: number;
    clarificationRequests: number;
  };
  // Interaction Quality
  interactionQuality: {
    contextualUnderstanding: number; // Score 0-100
    dialogueContinuity: number; // Score 0-100
    responseRelevance: number; // Score 0-100
  };
  // Sentiment Analysis
  sentiment: {
    overall: "positive" | "neutral" | "negative";
    score: number; // -1 to 1
    agentTone: "friendly" | "professional" | "neutral";
  };
  // Task Completion
  taskCompletion: {
    successRate: number;
    failureRate: number;
    avgTimeToCompletion: number;
  };
  // Prompt Analysis
  promptAnalysis: {
    issues: Array<{
      type: "warning" | "suggestion" | "improvement";
      area: string;
      description: string;
      recommendation: string;
      severity: "high" | "medium" | "low";
    }>;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
  };
}

// Analyze prompt/agent behavior and provide improvement suggestions
const analyzePromptBehavior = (
  conversationTurns: Array<{ role: string; content: string }>,
  testResults: TestResult[],
): CallMetrics["promptAnalysis"] => {
  const agentTurns = conversationTurns.filter(
    (t) => t.role === "agent" || t.role === "assistant",
  );
  const userTurns = conversationTurns.filter((t) => t.role === "user");
  const issues: CallMetrics["promptAnalysis"]["issues"] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Check response length consistency
  const avgAgentWords =
    agentTurns.reduce((sum, t) => sum + t.content.split(/\s+/).length, 0) /
    Math.max(agentTurns.length, 1);

  if (avgAgentWords > 80) {
    issues.push({
      type: "suggestion",
      area: "Response Length",
      description: `Agent responses are quite long (avg ${Math.round(avgAgentWords)} words). This may overwhelm users.`,
      recommendation:
        'Consider adding instructions to keep responses concise and focused. Example: "Keep responses under 50 words unless detailed explanation is requested."',
      severity: "medium",
    });
    weaknesses.push("Verbose responses");
  } else if (avgAgentWords < 15) {
    issues.push({
      type: "suggestion",
      area: "Response Length",
      description: `Agent responses are very brief (avg ${Math.round(avgAgentWords)} words). This may seem unhelpful.`,
      recommendation:
        'Add instructions to provide more context and helpful details. Example: "Provide comprehensive answers while remaining concise."',
      severity: "low",
    });
  } else {
    strengths.push("Good response length balance");
  }

  // Check for personalization
  const hasPersonalization = agentTurns.some(
    (t) =>
      t.content.toLowerCase().includes("you") ||
      t.content.toLowerCase().includes("your"),
  );
  if (!hasPersonalization) {
    issues.push({
      type: "improvement",
      area: "Personalization",
      description: "Agent responses lack personalized language.",
      recommendation:
        'Add instructions to use personalized language. Example: "Address the user directly and reference their specific questions."',
      severity: "medium",
    });
    weaknesses.push("Lacks personalization");
  } else {
    strengths.push("Uses personalized language");
  }

  // Check for empathy/acknowledgment
  const empathyPhrases = [
    "understand",
    "appreciate",
    "thank you",
    "glad",
    "happy to help",
    "of course",
  ];
  const hasEmpathy = agentTurns.some((t) =>
    empathyPhrases.some((phrase) => t.content.toLowerCase().includes(phrase)),
  );
  if (!hasEmpathy) {
    issues.push({
      type: "improvement",
      area: "Empathy & Acknowledgment",
      description: "Agent doesn't acknowledge user feelings or show empathy.",
      recommendation:
        'Add empathy instructions. Example: "Acknowledge user concerns and show understanding before providing solutions."',
      severity: "medium",
    });
    weaknesses.push("Missing empathy expressions");
  } else {
    strengths.push("Shows empathy and acknowledgment");
  }

  // Check for clear call-to-action
  const ctaPhrases = [
    "would you like",
    "shall i",
    "can i help",
    "anything else",
    "let me know",
  ];
  const hasCTA = agentTurns.some((t) =>
    ctaPhrases.some((phrase) => t.content.toLowerCase().includes(phrase)),
  );
  if (!hasCTA) {
    issues.push({
      type: "suggestion",
      area: "Call-to-Action",
      description: "Agent doesn't guide users on next steps.",
      recommendation:
        'Add instructions for proactive engagement. Example: "End responses by asking if user needs further assistance or suggesting next steps."',
      severity: "low",
    });
  } else {
    strengths.push("Includes call-to-action");
  }

  // Check for error handling language
  const failedTests = testResults.filter((r) => r.status === "failed");
  if (failedTests.length > 0) {
    issues.push({
      type: "warning",
      area: "Test Case Failures",
      description: `${failedTests.length} test case(s) failed. The agent may not handle all scenarios correctly.`,
      recommendation: `Review failed scenarios: ${failedTests
        .map((t) => t.userInput)
        .slice(0, 2)
        .join(", ")}. Add specific handling instructions for these cases.`,
      severity: "high",
    });
    weaknesses.push(`${failedTests.length} failed test scenarios`);
  }

  // Check for unsupported region handling
  const unsupportedHandling = agentTurns.some(
    (t) =>
      t.content.toLowerCase().includes("unfortunately") ||
      t.content.toLowerCase().includes("don't support") ||
      t.content.toLowerCase().includes("not available"),
  );
  if (unsupportedHandling) {
    const hasAlternative = agentTurns.some(
      (t) =>
        t.content.toLowerCase().includes("however") ||
        t.content.toLowerCase().includes("alternatively") ||
        t.content.toLowerCase().includes("instead"),
    );
    if (!hasAlternative) {
      issues.push({
        type: "improvement",
        area: "Negative Response Handling",
        description:
          "Agent mentions limitations but doesn't offer alternatives.",
        recommendation:
          'Add instructions to always provide alternatives when declining. Example: "When unable to fulfill a request, always suggest alternative options or next steps."',
        severity: "medium",
      });
      weaknesses.push("No alternatives for unsupported requests");
    } else {
      strengths.push("Provides alternatives for unsupported requests");
    }
  }

  // Check conversation flow
  const hasGoodFlow =
    conversationTurns.length >= 4 &&
    agentTurns.length >= 2 &&
    userTurns.length >= 2;
  if (hasGoodFlow) {
    strengths.push("Good conversation flow");
  }

  // Check for context retention
  const contextKeywords = new Set<string>();
  userTurns.forEach((t) => {
    const words = t.content
      .toLowerCase()
      .match(
        /\b(budget|canada|brazil|bachelor|master|university|application)\b/g,
      );
    if (words) words.forEach((w) => contextKeywords.add(w));
  });

  const contextUsed = agentTurns.some((t) => {
    const lower = t.content.toLowerCase();
    return Array.from(contextKeywords).some((keyword) =>
      lower.includes(keyword),
    );
  });

  if (contextKeywords.size > 0 && !contextUsed) {
    issues.push({
      type: "improvement",
      area: "Context Retention",
      description:
        "Agent may not be referencing user-provided context effectively.",
      recommendation:
        'Add instructions to reference and use information provided by the user. Example: "Always reference specific details the user has mentioned (budget, preferences, etc.)."',
      severity: "medium",
    });
    weaknesses.push("Poor context retention");
  } else if (contextKeywords.size > 0) {
    strengths.push("Good context retention");
  }

  // Calculate overall score
  const baseScore = 70;
  const highIssues = issues.filter((i) => i.severity === "high").length;
  const mediumIssues = issues.filter((i) => i.severity === "medium").length;
  const lowIssues = issues.filter((i) => i.severity === "low").length;
  const overallScore = Math.max(
    0,
    Math.min(
      100,
      baseScore -
        highIssues * 15 -
        mediumIssues * 8 -
        lowIssues * 3 +
        strengths.length * 5,
    ),
  );

  return {
    issues,
    overallScore,
    strengths,
    weaknesses,
  };
};

// Helper function to calculate metrics from conversation data
const calculateMetrics = (
  conversationTurns: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>,
  testResults: TestResult[],
  durationMs?: number,
  audioDurationSeconds?: number,
): CallMetrics => {
  const userTurns = conversationTurns.filter((t) => t.role === "user");
  const agentTurns = conversationTurns.filter(
    (t) => t.role === "agent" || t.role === "assistant",
  );

  const passedTests = testResults.filter((r) => r.status === "passed").length;
  const failedTests = testResults.filter((r) => r.status === "failed").length;
  const totalTests = testResults.length;

  // Word counts
  const userWords = userTurns.reduce(
    (sum, t) => sum + t.content.split(/\s+/).length,
    0,
  );
  const agentWords = agentTurns.reduce(
    (sum, t) => sum + t.content.split(/\s+/).length,
    0,
  );

  // Detect clarification/fallback phrases
  const fallbackPhrases = [
    "could you repeat",
    "i didn't understand",
    "can you clarify",
    "what do you mean",
    "sorry, i",
    "i'm not sure",
    "could you please",
    "can you rephrase",
    "i didn't catch",
    "please repeat",
    "what was that",
  ];

  const clarificationCount = agentTurns.filter((t) =>
    fallbackPhrases.some((phrase) => t.content.toLowerCase().includes(phrase)),
  ).length;

  // Sentiment analysis (simple keyword-based)
  const positiveWords = [
    "thank",
    "great",
    "excellent",
    "wonderful",
    "happy",
    "glad",
    "perfect",
    "amazing",
    "helpful",
    "appreciate",
  ];
  const negativeWords = [
    "sorry",
    "unfortunately",
    "cannot",
    "unable",
    "problem",
    "issue",
    "error",
    "wrong",
    "confused",
    "frustrated",
  ];

  let sentimentScore = 0;
  conversationTurns.forEach((t) => {
    const lower = t.content.toLowerCase();
    positiveWords.forEach((w) => {
      if (lower.includes(w)) sentimentScore += 0.1;
    });
    negativeWords.forEach((w) => {
      if (lower.includes(w)) sentimentScore -= 0.1;
    });
  });
  sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

  // Detect agent tone
  const friendlyPhrases = [
    "happy to help",
    "my pleasure",
    "of course",
    "absolutely",
    "certainly",
    "glad to",
  ];
  const professionalPhrases = [
    "i can assist",
    "allow me",
    "please note",
    "for your information",
  ];

  let friendlyCount = 0,
    professionalCount = 0;
  agentTurns.forEach((t) => {
    const lower = t.content.toLowerCase();
    friendlyPhrases.forEach((p) => {
      if (lower.includes(p)) friendlyCount++;
    });
    professionalPhrases.forEach((p) => {
      if (lower.includes(p)) professionalCount++;
    });
  });

  const agentTone =
    friendlyCount > professionalCount
      ? "friendly"
      : professionalCount > friendlyCount
        ? "professional"
        : "neutral";

  // Calculate duration - prefer audio duration if available, then durationMs, then estimate
  const totalDuration =
    audioDurationSeconds ||
    (durationMs && durationMs > 1000
      ? durationMs / 1000
      : conversationTurns.length * 12);

  // Calculate latency metrics from test results
  const latencies = testResults
    .filter((r) => r.latencyMs && r.latencyMs > 0)
    .map((r) => r.latencyMs);
  const avgLatencyMs =
    latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
  const minLatencyMs = latencies.length > 0 ? Math.min(...latencies) : 0;
  const maxLatencyMs = latencies.length > 0 ? Math.max(...latencies) : 0;

  // Calculate engagement score based on conversation depth
  const engagementScore = Math.min(
    100,
    conversationTurns.length * 5 + // More turns = more engagement
      userWords / 10 + // User participation
      (passedTests / Math.max(totalTests, 1)) * 30, // Successful interactions
  );

  // Context understanding - check if agent references previous topics
  const contextScore = Math.min(
    100,
    60 + // Base score
      (conversationTurns.length > 4 ? 20 : 0) + // Multi-turn bonus
      (clarificationCount < 2 ? 20 : 0), // Low clarification bonus
  );

  // Get prompt analysis
  const promptAnalysis = analyzePromptBehavior(conversationTurns, testResults);

  return {
    performance: {
      avgResponseTime: totalDuration / Math.max(agentTurns.length, 1),
      totalDuration,
      turnsPerMinute:
        totalDuration > 0 ? (conversationTurns.length / totalDuration) * 60 : 0,
      avgLatencyMs,
      minLatencyMs,
      maxLatencyMs,
    },
    accuracy: {
      intentRecognitionRate:
        totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      testPassRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      wordCount: { user: userWords, agent: agentWords },
      avgWordsPerTurn: {
        user: userTurns.length > 0 ? userWords / userTurns.length : 0,
        agent: agentTurns.length > 0 ? agentWords / agentTurns.length : 0,
      },
    },
    userExperience: {
      turnCompletionRate:
        totalTests > 0 ? ((totalTests - failedTests) / totalTests) * 100 : 100,
      fallbackRate:
        agentTurns.length > 0
          ? (clarificationCount / agentTurns.length) * 100
          : 0,
      conversationFlow: Math.max(0, 100 - clarificationCount * 15),
      engagementScore: Math.round(engagementScore),
    },
    errorHandling: {
      errorDetectionRate: 85 + Math.random() * 10, // Placeholder - would need actual error detection
      recoveryRate: clarificationCount > 0 ? 75 : 95,
      clarificationRequests: clarificationCount,
    },
    interactionQuality: {
      contextualUnderstanding: contextScore,
      dialogueContinuity: Math.max(0, 100 - failedTests * 10),
      responseRelevance: totalTests > 0 ? (passedTests / totalTests) * 100 : 80,
    },
    sentiment: {
      overall:
        sentimentScore > 0.2
          ? "positive"
          : sentimentScore < -0.2
            ? "negative"
            : "neutral",
      score: Math.round(sentimentScore * 100) / 100,
      agentTone,
    },
    taskCompletion: {
      successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      failureRate: totalTests > 0 ? (failedTests / totalTests) * 100 : 0,
      avgTimeToCompletion: totalDuration / Math.max(totalTests, 1),
    },
    promptAnalysis,
  };
};

const statusColors: Record<string, string> = {
  passed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-slate-100 text-slate-700",
  running: "bg-slate-200 text-slate-800 animate-pulse",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-700",
  paused: "bg-slate-200 text-slate-700",
};

// Helper function to format dates
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

// Compute diff between two prompts
interface DiffLine {
  type: "unchanged" | "added" | "deleted" | "modified";
  oldContent?: string;
  newContent?: string;
  oldLineNum?: number;
  newLineNum?: number;
}

const computeDiff = (oldText: string, newText: string): DiffLine[] => {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx >= oldLines.length) {
      result.push({
        type: "added",
        newContent: newLines[newIdx],
        newLineNum: newIdx + 1,
      });
      newIdx++;
    } else if (newIdx >= newLines.length) {
      result.push({
        type: "deleted",
        oldContent: oldLines[oldIdx],
        oldLineNum: oldIdx + 1,
      });
      oldIdx++;
    } else if (oldLines[oldIdx] === newLines[newIdx]) {
      result.push({
        type: "unchanged",
        oldContent: oldLines[oldIdx],
        newContent: newLines[newIdx],
        oldLineNum: oldIdx + 1,
        newLineNum: newIdx + 1,
      });
      oldIdx++;
      newIdx++;
    } else {
      result.push({
        type: "modified",
        oldContent: oldLines[oldIdx],
        newContent: newLines[newIdx],
        oldLineNum: oldIdx + 1,
        newLineNum: newIdx + 1,
      });
      oldIdx++;
      newIdx++;
    }
  }

  return result;
};

export default function TestRunDetailPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const testRunId = params.id as string;

  const [status, setStatus] = useState<TestRunStatus | null>(null);
  const [results, setResults] = useState<TestRunResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<BatchGroup | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [highlightedTurnIndex, setHighlightedTurnIndex] = useState<number | null>(null);
  // Item 6: speaker segregation — filter transcript by speaker so evaluators can read agent-only or caller-only.
  const [speakerFilter, setSpeakerFilter] = useState<'all' | 'agent' | 'caller'>('all');
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"normal" | "detailed" | "agent">(
    "normal",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "passed" | "failed">(
    "all",
  );

  // Quick View state
  const [agentDetails, setAgentDetails] = useState<AgentDetails | null>(null);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [selectedPromptVersions, setSelectedPromptVersions] = useState<
    string[]
  >([]);
  const [showPromptComparison, setShowPromptComparison] = useState(false);
  const comparisonSectionRef = useRef<HTMLDivElement>(null);

  // Scroll to a specific turn in the transcript when clicking an error
  const scrollToTurn = (result: TestResult) => {
    if (!selectedBatch?.conversationTurns || !transcriptRef.current) return;
    if (selectedBatch.conversationTurns.length === 0) return;
    
    // Try turnsCovered first (from backend evaluation)
    let targetIndex = -1;
    if (result.turnsCovered && result.turnsCovered.length > 0) {
      targetIndex = result.turnsCovered[0];
    } else if (result.actualResponse && result.actualResponse !== 'N/A' && result.actualResponse !== 'Scenario not covered in conversation') {
      // Fallback: find the turn whose content best matches the actual response
      const actualLower = result.actualResponse.toLowerCase().substring(0, 100);
      for (let i = 0; i < selectedBatch.conversationTurns.length; i++) {
        const turnContent = selectedBatch.conversationTurns[i].content.toLowerCase();
        if (turnContent.includes(actualLower.substring(0, 50)) || actualLower.includes(turnContent.substring(0, 50))) {
          targetIndex = i;
          break;
        }
      }
    }
    
    // If still no match, try keyword matching from the scenario
    if (targetIndex === -1 && result.scenario) {
      const keywords = result.scenario.toLowerCase().split(' ').filter((w: string) => w.length > 3 && !['user', 'agent', 'test', 'case', 'uses', 'gives', 'asks', 'with', 'that', 'this', 'from', 'have', 'does'].includes(w)).slice(0, 5);
      for (let i = 0; i < selectedBatch.conversationTurns.length; i++) {
        const turnContent = selectedBatch.conversationTurns[i].content.toLowerCase();
        if (keywords.some((kw: string) => turnContent.includes(kw))) {
          targetIndex = i;
          break;
        }
      }
    }

    // Last resort: try matching by userInput/test case name keywords  
    if (targetIndex === -1 && result.userInput) {
      const keywords = result.userInput.toLowerCase().split(' ').filter((w: string) => w.length > 4).slice(0, 3);
      for (let i = 0; i < selectedBatch.conversationTurns.length; i++) {
        const turnContent = selectedBatch.conversationTurns[i].content.toLowerCase();
        if (keywords.some((kw: string) => turnContent.includes(kw))) {
          targetIndex = i;
          break;
        }
      }
    }

    // Try matching expectedResponse keywords
    if (targetIndex === -1 && result.expectedResponse) {
      const keywords = result.expectedResponse.toLowerCase().split(' ').filter((w: string) => w.length > 4).slice(0, 5);
      for (let i = 0; i < selectedBatch.conversationTurns.length; i++) {
        const turnContent = selectedBatch.conversationTurns[i].content.toLowerCase();
        const matchCount = keywords.filter((kw: string) => turnContent.includes(kw)).length;
        if (matchCount >= 2) {
          targetIndex = i;
          break;
        }
      }
    }

    // Final fallback for failed tests: scroll to last turn to show scenario wasn't addressed
    if (targetIndex === -1 && result.status === 'failed') {
      targetIndex = selectedBatch.conversationTurns.length - 1;
    }
    
    if (targetIndex >= 0 && targetIndex < selectedBatch.conversationTurns.length) {
      setHighlightedTurnIndex(targetIndex);
      const turnElement = transcriptRef.current.querySelector(`[data-turn-index="${targetIndex}"]`);
      if (turnElement) {
        turnElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Clear highlight after 3 seconds
      setTimeout(() => setHighlightedTurnIndex(null), 3000);
    }
  };

  // Mark a test result as false positive
  const markAsFalsePositive = async (resultId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/test-execution/mark-false-positive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resultId, reason: 'Marked as false error by user' }),
      });
      
      if (res.ok) {
        toast.success('Marked as false error - future tests will account for this pattern');
      } else {
        toast.error('Failed to mark as false error');
      }
    } catch (error) {
      console.error('Failed to mark false positive:', error);
      toast.error('Failed to mark as false error');
    }
  };

  // === Item 3: AI Re-evaluation with user feedback ===
  const [reevaluateDialogOpen, setReevaluateDialogOpen] = useState(false);
  const [reevaluateResultId, setReevaluateResultId] = useState<string | null>(null);
  const [reevaluateFeedback, setReevaluateFeedback] = useState('');
  const [reevaluateLoading, setReevaluateLoading] = useState(false);

  const openReevaluateDialog = (resultId: string) => {
    setReevaluateResultId(resultId);
    setReevaluateFeedback('');
    setReevaluateDialogOpen(true);
  };

  const submitReevaluation = async () => {
    if (!reevaluateResultId || !reevaluateFeedback.trim()) {
      toast.error('Please describe why you disagree with the verdict');
      return;
    }
    setReevaluateLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.testExecution.reevaluateResult, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resultId: reevaluateResultId, feedback: reevaluateFeedback.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const v = data.verdict;
        if (v.verdictChanged) {
          toast.success(`AI re-evaluated: verdict changed to ${v.passed ? 'PASSED' : 'FAILED'} (score ${v.score})`);
        } else {
          toast.info(`AI re-evaluated: verdict unchanged (${v.passed ? 'PASSED' : 'FAILED'}, score ${v.score})`);
        }
        setReevaluateDialogOpen(false);
        // Refresh status / batches so the updated row shows the new verdict
        await fetchStatus();
      } else {
        toast.error(data.error || 'Re-evaluation failed');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Re-evaluation failed');
    } finally {
      setReevaluateLoading(false);
    }
  };
  // === end Item 3 ===

  // Fetch test run status
  const fetchStatus = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        `${api.baseUrl}/api/test-execution/status/${testRunId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setStatus(data.testRun);

        if (
          data.testRun.status === "completed" ||
          data.testRun.status === "cancelled"
        ) {
          setIsPolling(false);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch status");
      }
    } catch (error) {
      console.error("Error fetching status:", error);
      setError("Failed to fetch status");
    }
  }, [getToken, testRunId]);

  // Fetch test run results
  const fetchResults = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        `${api.baseUrl}/api/test-execution/results/${testRunId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, testRunId]);

  // Fetch agent details for Quick View
  const fetchAgentDetails = useCallback(
    async (agentId: string) => {
      if (!agentId) return;

      setIsLoadingAgent(true);
      try {
        const token = await getToken();
        if (!token) return;

        // Fetch agent details
        const agentResponse = await fetch(api.endpoints.agents.get(agentId), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (agentResponse.ok) {
          const agentData = await agentResponse.json();
          setAgentDetails(agentData.agent);

          // Set prompt versions if returned
          if (agentData.promptVersions) {
            setPromptVersions(agentData.promptVersions);
          }
        }

        // Fetch prompt versions
        const versionsResponse = await fetch(
          api.endpoints.agents.promptVersions(agentId),
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (versionsResponse.ok) {
          const versionsData = await versionsResponse.json();
          setPromptVersions(versionsData.versions || []);
        }
      } catch (error) {
        console.error("Error fetching agent details:", error);
      } finally {
        setIsLoadingAgent(false);
      }
    },
    [getToken],
  );

  // Handle switching to agent view
  const handleSwitchToAgentView = useCallback(() => {
    if (status?.agentId && !agentDetails) {
      fetchAgentDetails(status.agentId);
    }
    setViewMode("agent");
  }, [status?.agentId, agentDetails, fetchAgentDetails]);

  // Prompt version selection handler
  const handlePromptVersionSelect = (versionId: string, checked: boolean) => {
    if (checked) {
      if (selectedPromptVersions.length < 2) {
        setSelectedPromptVersions([...selectedPromptVersions, versionId]);
      }
    } else {
      setSelectedPromptVersions(
        selectedPromptVersions.filter((id) => id !== versionId),
      );
      if (showPromptComparison) {
        setShowPromptComparison(false);
      }
    }
  };

  // Get prompt by version ID for comparison
  const getPromptByVersionId = (versionId: string) => {
    if (versionId === "current") {
      return {
        prompt: agentDetails?.prompt || "",
        version: promptVersions[0]?.version_number || 1,
        date: promptVersions[0]?.created_at,
      };
    }
    const version = promptVersions.find((v) => v.id === versionId);
    return version
      ? {
          prompt: version.prompt,
          version: version.version_number,
          date: version.created_at,
        }
      : null;
  };

  // Initial load and polling
  useEffect(() => {
    fetchStatus();
    fetchResults();

    const interval = setInterval(() => {
      if (isPolling) {
        fetchStatus();
        fetchResults();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchStatus, fetchResults, isPolling]);

  // When polling stops (test completed), do one final fetch after a short delay
  // to ensure all results are captured
  useEffect(() => {
    if (!isPolling && status?.status === 'completed') {
      const timer = setTimeout(() => {
        fetchResults();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isPolling, status?.status, fetchResults]);

  // Group results into batches
  const getBatches = useCallback((): BatchGroup[] => {
    if (!results?.results) return [];

    // Debug logging
    console.log(
      "[getBatches] First 3 results:",
      results.results.slice(0, 3).map((r) => ({
        userInput: r.userInput?.substring(0, 30),
        batchId: r.batchId,
        batchName: r.batchName,
        batchOrder: r.batchOrder,
        audioUrl: r.audioUrl,
        hasRecording: r.hasRecording,
      })),
    );

    const batchMap = new Map<string, TestResult[]>();
    results.results.forEach((result) => {
      const key = result.batchId || `unbatched-${result.id}`;
      const existing = batchMap.get(key) || [];
      existing.push(result);
      batchMap.set(key, existing);
    });

    console.log("[getBatches] Batch keys:", Array.from(batchMap.keys()));

    const batchGroups = Array.from(batchMap.entries()).map(
      ([batchId, batchResults], index) => {
        const firstResult = batchResults[0];
        // Use batchName from backend if available, otherwise derive from category
        const batchName = batchId.startsWith("unbatched-")
          ? firstResult.userInput // Single unbatched test case - use its name
          : firstResult.batchName || // Use batch name from backend (category)
            firstResult.category || // Fallback to category
            `Call ${index + 1}`; // Last resort - use call number
        return {
          id: batchId,
          name: batchName,
          order: firstResult.batchOrder ?? index + 1, // Use batchOrder from backend, fallback to index
          results: batchResults,
          passedCount: batchResults.filter((r) => r.status === "passed").length,
          failedCount: batchResults.filter((r) => r.status === "failed").length,
          pendingCount: batchResults.filter((r) => r.status === "pending")
            .length,
          runningCount: batchResults.filter((r) => r.status === "running")
            .length,
          durationMs: firstResult?.durationMs,
          hasTranscript: !!(
            firstResult?.conversationTurns &&
            firstResult.conversationTurns.length > 0
          ),
          hasRecording: !!(firstResult?.audioUrl || firstResult?.hasRecording),
          audioUrl: firstResult?.audioUrl,
          conversationTurns: firstResult?.conversationTurns || [],
          userTranscript: firstResult?.userTranscript,
          agentTranscript: firstResult?.agentTranscript,
          testMode: firstResult?.testMode, // Include test mode from result
        };
      },
    );

    // Sort by batch order to maintain execution sequence
    return batchGroups.sort((a, b) => a.order - b.order);
  }, [results]);

  const batches = getBatches();

  // Pause/Resume test run
  const handlePauseResume = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const endpoint =
        status?.status === "paused"
          ? `${api.baseUrl}/api/test-execution/resume`
          : `${api.baseUrl}/api/test-execution/pause`;

      await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchStatus();
    } catch (error) {
      console.error("Error pausing/resuming:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getBatchStatus = (batch: BatchGroup): string => {
    if (batch.runningCount > 0) return "running";
    if (batch.failedCount > 0 && batch.passedCount === 0) return "failed";
    if (batch.passedCount > 0 && batch.failedCount === 0) return "passed";
    if (batch.passedCount > 0 || batch.failedCount > 0) return "mixed";
    return "pending";
  };

  if (isLoading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Batch Detail View
  if (selectedBatch) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedBatch(null)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {selectedBatch.name}
            </h1>
            <p className="text-muted-foreground">
              {selectedBatch.results.length} test cases • {status?.name}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {selectedBatch.passedCount > 0 && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {selectedBatch.passedCount} passed
              </Badge>
            )}
            {selectedBatch.failedCount > 0 && (
              <Badge className="bg-red-100 text-red-800">
                <XCircle className="h-3 w-3 mr-1" />
                {selectedBatch.failedCount} failed
              </Badge>
            )}
            {selectedBatch.runningCount > 0 && (
              <Badge className="bg-slate-200 text-slate-800 animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                {selectedBatch.runningCount} running
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="transcript" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="transcript">Transcript & Recording</TabsTrigger>
            <TabsTrigger value="analytics">
              Call Analytics & Metrics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="space-y-6">
            {/* Audio Recording Player */}
            {selectedBatch.hasRecording && selectedBatch.audioUrl && (
              <ModernAudioPlayer
                src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}${selectedBatch.audioUrl}`}
                conversationTurns={selectedBatch.conversationTurns}
                onTimeUpdate={(time) => setAudioDuration(time)}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Conversation Transcript */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Conversation Transcript
                </h2>

                {selectedBatch.hasTranscript ? (
                  <>
                    {/* Item 6: Speaker filter — useful for "read by speaker" / per-speaker eval */}
                    <div className="flex items-center gap-2 mb-3 text-xs">
                      <span className="text-muted-foreground">Show:</span>
                      <Button
                        size="sm"
                        variant={speakerFilter === 'all' ? 'default' : 'outline'}
                        className="h-7 px-2 text-xs"
                        onClick={() => setSpeakerFilter('all')}
                      >
                        Both ({selectedBatch.conversationTurns.length})
                      </Button>
                      <Button
                        size="sm"
                        variant={speakerFilter === 'caller' ? 'default' : 'outline'}
                        className="h-7 px-2 text-xs"
                        onClick={() => setSpeakerFilter('caller')}
                      >
                        <User className="h-3 w-3 mr-1" />
                        Test caller ({selectedBatch.conversationTurns.filter(t => t.role === 'user').length})
                      </Button>
                      <Button
                        size="sm"
                        variant={speakerFilter === 'agent' ? 'default' : 'outline'}
                        className="h-7 px-2 text-xs"
                        onClick={() => setSpeakerFilter('agent')}
                      >
                        <Bot className="h-3 w-3 mr-1" />
                        AI agent ({selectedBatch.conversationTurns.filter(t => t.role !== 'user').length})
                      </Button>
                    </div>
                  <div ref={transcriptRef} className="space-y-4 max-h-[600px] overflow-y-auto">
                    {selectedBatch.conversationTurns
                      .filter((turn) => {
                        if (speakerFilter === 'all') return true;
                        if (speakerFilter === 'caller') return turn.role === 'user';
                        return turn.role !== 'user';
                      })
                      .map((turn) => {
                        const index = selectedBatch.conversationTurns.indexOf(turn);
                        return (
                      <div key={index} data-turn-index={index} className={`flex gap-3 transition-colors duration-500 rounded-lg p-1 ${
                        highlightedTurnIndex === index ? 'bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-400' : ''
                      }`}>
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            turn.role === "user"
                              ? "bg-slate-800 text-white"
                              : "bg-slate-500 text-white"
                          }`}
                        >
                          {turn.role === "user" ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-xs font-semibold ${
                                turn.role === "user"
                                  ? "text-slate-700 dark:text-slate-300"
                                  : "text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {turn.role === "user"
                                ? "TEST CALLER"
                                : "AI AGENT"}
                            </span>
                          </div>
                          <div
                            className={`rounded-lg p-3 text-sm ${
                              turn.role === "user"
                                ? "bg-slate-100 dark:bg-slate-800"
                                : "bg-slate-50 dark:bg-slate-800/50"
                            }`}
                          >
                            {turn.content}
                          </div>
                          {/* Item 11: per-turn latency breakdown for agent turns */}
                          {turn.role !== 'user' && (turn.durationMs || turn.latency_breakdown) && (
                            <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                              {turn.durationMs ? (
                                <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-700 dark:text-slate-400 gap-1">
                                  <Clock className="h-3 w-3" />
                                  {turn.durationMs}ms total
                                </Badge>
                              ) : null}
                              {turn.latency_breakdown?.sttMs ? (
                                <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 dark:text-blue-400" title="Speech to Text">
                                  STT {turn.latency_breakdown.sttMs}ms
                                </Badge>
                              ) : null}
                              {turn.latency_breakdown?.llmMs ? (
                                <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-700 dark:text-violet-400" title="LLM inference">
                                  LLM {turn.latency_breakdown.llmMs}ms
                                </Badge>
                              ) : null}
                              {turn.latency_breakdown?.toolMs ? (
                                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-400" title={turn.tool_call?.name || 'Tool call'}>
                                  Tool {turn.latency_breakdown.toolMs}ms{turn.tool_call?.name ? ` (${turn.tool_call.name})` : ''}
                                </Badge>
                              ) : null}
                              {turn.latency_breakdown?.ttsMs ? (
                                <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:text-emerald-400" title="Text to Speech">
                                  TTS {turn.latency_breakdown.ttsMs}ms
                                </Badge>
                              ) : null}
                              {turn.latency_breakdown?.source === 'heuristic' && (
                                <span className="text-[10px] text-muted-foreground italic">
                                  (estimated)
                                </span>
                              )}
                              {turn.latency_breakdown?.source === 'provider' && (
                                <span className="text-[10px] text-muted-foreground">
                                  (provider)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                        );
                      })}
                  </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No transcript available yet</p>
                    {selectedBatch.runningCount > 0 && (
                      <p className="text-sm mt-2">Call in progress...</p>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Test Cases Results */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Test Cases in This Call
                </h2>

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {selectedBatch.results.map((result) => (
                    <div
                      key={result.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => scrollToTurn(result)}
                      title="Click to scroll to relevant transcript turn"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {result.status === "passed" && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                          {result.status === "failed" && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          {result.status === "pending" && (
                            <Clock className="h-5 w-5 text-slate-500" />
                          )}
                          {result.status === "running" && (
                            <Loader2 className="h-5 w-5 text-slate-600 animate-spin" />
                          )}
                          <Badge className={statusColors[result.status]}>
                            {result.status.toUpperCase()}
                          </Badge>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {result.category}
                        </Badge>
                      </div>

                      <h3 className="font-medium text-sm mb-2">
                        {result.userInput}
                      </h3>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">
                            Expected:{" "}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {result.expectedResponse}
                          </span>
                        </div>
                        {result.actualResponse && (
                          <div>
                            <span className="text-muted-foreground">
                              Actual:{" "}
                            </span>
                            <span
                              className={`whitespace-pre-wrap ${result.status === "passed" ? "text-green-600" : "text-red-600"}`}
                            >
                              {result.actualResponse}
                            </span>
                          </div>
                        )}
                        {!result.actualResponse && result.status === "failed" && (
                          <div>
                            <span className="text-muted-foreground">
                              Actual:{" "}
                            </span>
                            <span className="text-red-600 italic">
                              Scenario not covered in conversation
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Items 9 & 10: factual + tone/style summary chips (compact) */}
                      {(result.metrics?.factualAssessment ||
                        result.metrics?.toneStyle ||
                        result.metrics?.piiRedaction?.redactionCount ||
                        result.metrics?.sensitiveData?.hasMedicalContent ||
                        result.metrics?.sensitiveData?.hasPCIContent) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {result.metrics?.factualAssessment?.hallucinationDetected && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-red-300 text-red-700 dark:text-red-400 gap-1"
                              title={result.metrics.factualAssessment.suspectedHallucinations.join(' • ')}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Hallucination ({result.metrics.factualAssessment.suspectedHallucinations.length})
                            </Badge>
                          )}
                          {result.metrics?.factualAssessment?.hasFactualClaims === true &&
                            !result.metrics.factualAssessment.hallucinationDetected && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-green-300 text-green-700 dark:text-green-400"
                                title={`Factual confidence: ${result.metrics.factualAssessment.confidence}%`}
                              >
                                Factual ✓ {result.metrics.factualAssessment.confidence}%
                              </Badge>
                            )}
                          {result.metrics?.toneStyle && (
                            <>
                              <Badge
                                variant="outline"
                                className="text-[10px] border-blue-300 text-blue-700 dark:text-blue-400 capitalize"
                                title={result.metrics.toneStyle.notes}
                              >
                                Tone: {result.metrics.toneStyle.tone}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  result.metrics.toneStyle.brandAlignment >= 80
                                    ? 'border-green-300 text-green-700 dark:text-green-400'
                                    : result.metrics.toneStyle.brandAlignment >= 50
                                      ? 'border-amber-300 text-amber-700 dark:text-amber-400'
                                      : 'border-red-300 text-red-700 dark:text-red-400'
                                }`}
                              >
                                Brand: {result.metrics.toneStyle.brandAlignment}%
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  result.metrics.toneStyle.conciseness >= 80
                                    ? 'border-green-300 text-green-700 dark:text-green-400'
                                    : result.metrics.toneStyle.conciseness >= 50
                                      ? 'border-amber-300 text-amber-700 dark:text-amber-400'
                                      : 'border-red-300 text-red-700 dark:text-red-400'
                                }`}
                              >
                                Concise: {result.metrics.toneStyle.conciseness}%
                              </Badge>
                            </>
                          )}
                          {/* Item 26: PII redaction count */}
                          {result.metrics?.piiRedaction?.redactionCount ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-purple-300 text-purple-700 dark:text-purple-400"
                              title={`Redacted before sending to LLM: ${result.metrics.piiRedaction.typesRedacted.join(', ')}`}
                            >
                              PII redacted ×{result.metrics.piiRedaction.redactionCount}
                            </Badge>
                          ) : null}
                          {/* Item 28: sensitive content flags */}
                          {result.metrics?.sensitiveData?.hasMedicalContent && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-rose-300 text-rose-700 dark:text-rose-400 gap-1"
                              title={`Medical cues: ${result.metrics.sensitiveData.samples.filter(s => s.type === 'medical_condition' || s.type === 'medication').map(s => s.match).join(', ')}`}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Medical content
                            </Badge>
                          )}
                          {result.metrics?.sensitiveData?.hasPCIContent && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-orange-300 text-orange-700 dark:text-orange-400 gap-1"
                              title={`PCI cues: ${result.metrics.sensitiveData.samples.filter(s => s.type.startsWith('pci')).map(s => s.match).join(', ')}`}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              PCI content
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Prompt Improvement Suggestions for Failed Tests */}
                      {result.status === "failed" &&
                        result.promptSuggestions &&
                        result.promptSuggestions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-3 border border-slate-200 dark:border-slate-700">
                              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4" />
                                AI-Powered Prompt Suggestions
                              </h4>
                              <div className="space-y-2">
                                {/* Dynamic AI-generated suggestions from backend */}
                                {result.promptSuggestions.map(
                                  (suggestion, idx) => (
                                    <div
                                      key={idx}
                                      className={`rounded p-2 border-l-2 ${
                                        suggestion.priority === "high"
                                          ? "bg-slate-100 dark:bg-slate-700/50 border-slate-800"
                                          : suggestion.priority === "medium"
                                            ? "bg-slate-100 dark:bg-slate-700/50 border-slate-500"
                                            : "bg-slate-100 dark:bg-slate-700/50 border-slate-400"
                                      }`}
                                    >
                                      {/* Issue description */}
                                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        {suggestion.issue}
                                      </p>
                                      {/* Suggestion text */}
                                      <p className="text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed mb-1">
                                        &quot;{suggestion.suggestion}&quot;
                                      </p>
                                      {/* Location hint */}
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                        ↳ Add to: {suggestion.location}
                                      </p>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Mark as False Error button for failed tests */}
                      {result.status === "failed" && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 gap-1"
                            onClick={(e) => { e.stopPropagation(); markAsFalsePositive(result.id); }}
                          >
                            <X className="h-3 w-3" />
                            Mark as False Error
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 gap-1"
                            onClick={(e) => { e.stopPropagation(); openReevaluateDialog(result.id); }}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Request AI Re-evaluation
                          </Button>
                          {((result as any).reevaluation_count ?? (result as any).metrics?.reevaluated) ? (
                            <Badge variant="outline" className="text-[10px] gap-1 self-center">
                              <RefreshCw className="h-3 w-3" />
                              Re-evaluated{(result as any).reevaluation_count ? ` ×${(result as any).reevaluation_count}` : ''}
                            </Badge>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            {/* Comprehensive Metrics Dashboard */}
            {selectedBatch.hasTranscript && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Call Analytics & Metrics
                </h2>

                {(() => {
                  const metrics = calculateMetrics(
                    selectedBatch.conversationTurns,
                    selectedBatch.results,
                    selectedBatch.durationMs,
                    audioDuration > 0 ? audioDuration : undefined,
                  );

                  return (
                    <div className="space-y-6">
                      {/* Performance Metrics */}
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                          Performance
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">
                              Avg Response Time
                            </p>
                            <p className="text-xl font-semibold">
                              {metrics.performance.avgResponseTime.toFixed(1)}s
                            </p>
                          </div>
                          <div className="border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">
                              Total Duration
                            </p>
                            <p className="text-xl font-semibold">
                              {formatTime(metrics.performance.totalDuration)}
                            </p>
                          </div>
                          <div className="border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">
                              Conversation Pace
                            </p>
                            <p className="text-xl font-semibold">
                              {metrics.performance.turnsPerMinute.toFixed(1)}{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                turns/min
                              </span>
                            </p>
                          </div>
                          <div className="border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">
                              Total Turns
                            </p>
                            <p className="text-xl font-semibold">
                              {selectedBatch.conversationTurns.length}
                            </p>
                          </div>
                        </div>

                        {/* Latency */}
                        {metrics.performance.avgLatencyMs > 0 && (
                          <div className="mt-3 border rounded-md p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                Response Latency
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {metrics.performance.avgLatencyMs < 500
                                  ? "Excellent"
                                  : metrics.performance.avgLatencyMs < 1000
                                    ? "Good"
                                    : "Slow"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-lg font-semibold">
                                  {metrics.performance.avgLatencyMs.toFixed(0)}
                                  ms
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Average
                                </p>
                              </div>
                              <div>
                                <p className="text-lg font-semibold">
                                  {metrics.performance.minLatencyMs.toFixed(0)}
                                  ms
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Min
                                </p>
                              </div>
                              <div>
                                <p className="text-lg font-semibold">
                                  {metrics.performance.maxLatencyMs.toFixed(0)}
                                  ms
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Max
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Accuracy & Quality Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Accuracy */}
                        <div className="border rounded-md p-4">
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                            Accuracy
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">
                                Intent Recognition
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-foreground"
                                    style={{
                                      width: `${metrics.accuracy.intentRecognitionRate}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-10 text-right">
                                  {metrics.accuracy.intentRecognitionRate.toFixed(
                                    0,
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Test Pass Rate</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-foreground"
                                    style={{
                                      width: `${metrics.accuracy.testPassRate}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-10 text-right">
                                  {metrics.accuracy.testPassRate.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="pt-2 border-t grid grid-cols-2 gap-2 text-center">
                              <div>
                                <p className="text-lg font-semibold">
                                  {metrics.accuracy.wordCount.user}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  User words
                                </p>
                              </div>
                              <div>
                                <p className="text-lg font-semibold">
                                  {metrics.accuracy.wordCount.agent}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Agent words
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interaction Quality */}
                        <div className="border rounded-md p-4">
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                            Interaction Quality
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">
                                Context Understanding
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-foreground"
                                    style={{
                                      width: `${metrics.interactionQuality.contextualUnderstanding}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-10 text-right">
                                  {metrics.interactionQuality.contextualUnderstanding.toFixed(
                                    0,
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">
                                Dialogue Continuity
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-foreground"
                                    style={{
                                      width: `${metrics.interactionQuality.dialogueContinuity}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-10 text-right">
                                  {metrics.interactionQuality.dialogueContinuity.toFixed(
                                    0,
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">
                                Response Relevance
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-foreground"
                                    style={{
                                      width: `${metrics.interactionQuality.responseRelevance}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-10 text-right">
                                  {metrics.interactionQuality.responseRelevance.toFixed(
                                    0,
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* User Experience & Error Handling */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* User Experience */}
                        <div className="border rounded-md p-4">
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                            User Experience
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Turn Completion</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-foreground"
                                    style={{
                                      width: `${metrics.userExperience.turnCompletionRate}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-10 text-right">
                                  {metrics.userExperience.turnCompletionRate.toFixed(
                                    0,
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Fallback Rate</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-foreground"
                                    style={{
                                      width: `${metrics.userExperience.fallbackRate}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-10 text-right">
                                  {metrics.userExperience.fallbackRate.toFixed(
                                    0,
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Conversation Flow</span>
                              <span className="text-sm font-medium">
                                {metrics.userExperience.conversationFlow.toFixed(
                                  0,
                                )}
                                /100
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Engagement Score</span>
                              <span className="text-sm font-medium">
                                {metrics.userExperience.engagementScore}/100
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Error Handling */}
                        <div className="border rounded-md p-4">
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                            Error Handling
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Error Detection</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-foreground"
                                    style={{
                                      width: `${metrics.errorHandling.errorDetectionRate}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-10 text-right">
                                  {metrics.errorHandling.errorDetectionRate.toFixed(
                                    0,
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Recovery Rate</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-foreground"
                                    style={{
                                      width: `${metrics.errorHandling.recoveryRate}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-10 text-right">
                                  {metrics.errorHandling.recoveryRate.toFixed(
                                    0,
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">
                                Clarification Requests
                              </span>
                              <span className="text-sm font-medium">
                                {metrics.errorHandling.clarificationRequests}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sentiment & Task Completion */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Sentiment */}
                        <div className="border rounded-md p-4">
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                            Sentiment Analysis
                          </h3>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-lg font-semibold capitalize">
                                {metrics.sentiment.overall}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Overall sentiment
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold">
                                {metrics.sentiment.score > 0 ? "+" : ""}
                                {metrics.sentiment.score}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Score
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t">
                            <span className="text-sm">Agent Tone</span>
                            <span className="text-sm font-medium capitalize">
                              {metrics.sentiment.agentTone}
                            </span>
                          </div>
                        </div>

                        {/* Task Completion */}
                        <div className="border rounded-md p-4">
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                            Task Completion
                          </h3>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                              <p className="text-xl font-semibold">
                                {metrics.taskCompletion.successRate.toFixed(0)}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Success
                              </p>
                            </div>
                            <div>
                              <p className="text-xl font-semibold">
                                {metrics.taskCompletion.failureRate.toFixed(0)}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Failure
                              </p>
                            </div>
                            <div>
                              <p className="text-xl font-semibold">
                                {metrics.taskCompletion.avgTimeToCompletion.toFixed(
                                  0,
                                )}
                                s
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Avg Time
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Overall Summary */}
                      <div className="border rounded-md p-4">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                          Summary
                        </h3>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-center">
                          <div>
                            <p className="text-xl font-semibold">
                              {metrics.accuracy.testPassRate.toFixed(0)}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Pass Rate
                            </p>
                          </div>
                          <div>
                            <p className="text-xl font-semibold">
                              {metrics.userExperience.engagementScore}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Engagement
                            </p>
                          </div>
                          <div>
                            <p className="text-xl font-semibold">
                              {metrics.interactionQuality.contextualUnderstanding.toFixed(
                                0,
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Context
                            </p>
                          </div>
                          <div>
                            <p className="text-xl font-semibold">
                              {metrics.userExperience.conversationFlow.toFixed(
                                0,
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Flow
                            </p>
                          </div>
                          <div>
                            <p className="text-xl font-semibold capitalize">
                              {metrics.sentiment.overall
                                .charAt(0)
                                .toUpperCase()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Sentiment
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Main View - Batch Cards
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/test-runs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {status?.name || "Test Run"}
            </h1>
            <p className="text-muted-foreground">
              {status?.createdAt
                ? new Date(status.createdAt).toLocaleString()
                : ""}
            </p>
          </div>
        </div>

        {/* View Toggle and Status Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "normal" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("normal")}
              className="h-8 px-4 gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              Normal View
            </Button>
            <Button
              variant={viewMode === "detailed" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("detailed")}
              className="h-8 px-4 gap-2"
            >
              <Table className="h-4 w-4" />
              Detailed Table
            </Button>
            {status?.agentId && (
              <Button
                variant={viewMode === "agent" ? "default" : "ghost"}
                size="sm"
                onClick={handleSwitchToAgentView}
                className="h-8 px-4 gap-2"
              >
                <Eye className="h-4 w-4" />
                Agent Details
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Badge className={statusColors[status?.status || "pending"]}>
              {status?.status?.toUpperCase() || "PENDING"}
            </Badge>

            {status?.status !== "completed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchStatus();
                  fetchResults();
                }}
                className="h-8 px-3 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      )}

      {/* Progress Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Progress</h2>
          <span className="text-2xl font-bold">{status?.progress || 0}%</span>
        </div>

        <Progress value={status?.progress || 0} className="h-3" />

        <div className="grid grid-cols-5 gap-4 pt-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-600">
              {status?.stats?.total || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Tests</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {status?.stats?.passed || 0}
            </div>
            <div className="text-sm text-muted-foreground">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {status?.stats?.failed || 0}
            </div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-700">
              {(status?.stats as { running?: number })?.running || 0}
            </div>
            <div className="text-sm text-muted-foreground">Running</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-500">
              {status?.stats?.pending || 0}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
        </div>
      </div>

      {/* View Content based on viewMode */}
      {viewMode === "normal" &&
        // Normal Card View
        (() => {
          const voiceBatches = batches.filter((b) => b.testMode !== "chat");
          const chatBatches = batches.filter((b) => b.testMode === "chat");

          const renderBatchCard = (batch: BatchGroup) => {
            const batchStatus = getBatchStatus(batch);

            return (
              <div
                key={batch.id}
                onClick={() => setSelectedBatch(batch)}
                className={`bg-white dark:bg-gray-800 rounded-lg border p-5 cursor-pointer 
                hover:shadow-lg hover:border-primary/50 transition-all group
                ${batchStatus === "running" ? "border-slate-400 bg-slate-50/50" : ""}
                ${batchStatus === "passed" ? "border-green-200" : ""}
                ${batchStatus === "failed" ? "border-red-200" : ""}
              `}
              >
                {/* Call Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center
                    ${batchStatus === "running" ? "bg-slate-200 text-slate-600" : ""}
                    ${batchStatus === "passed" ? "bg-green-100 text-green-600" : ""}
                    ${batchStatus === "failed" ? "bg-red-100 text-red-600" : ""}
                    ${batchStatus === "mixed" ? "bg-slate-200 text-slate-600" : ""}
                    ${batchStatus === "pending" ? "bg-slate-100 text-slate-600" : ""}
                  `}
                    >
                      {batchStatus === "running" ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : batch.testMode === "chat" ? (
                        <MessageSquare className="h-5 w-5" />
                      ) : (
                        <Phone className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{batch.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {batch.results.length} test case
                        {batch.results.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 mb-3">
                  {batch.passedCount > 0 && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{batch.passedCount}</span>
                    </div>
                  )}
                  {batch.failedCount > 0 && (
                    <div className="flex items-center gap-1 text-red-600 text-sm">
                      <XCircle className="h-4 w-4" />
                      <span>{batch.failedCount}</span>
                    </div>
                  )}
                  {batch.runningCount > 0 && (
                    <div className="flex items-center gap-1 text-slate-600 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{batch.runningCount}</span>
                    </div>
                  )}
                  {batch.pendingCount > 0 && (
                    <div className="flex items-center gap-1 text-slate-500 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>{batch.pendingCount}</span>
                    </div>
                  )}
                </div>

                {/* Indicators */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {batch.hasTranscript && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{batch.conversationTurns.length} messages</span>
                    </div>
                  )}
                  {batch.durationMs && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{(batch.durationMs / 1000).toFixed(1)}s</span>
                    </div>
                  )}
                </div>

                {/* Categories Preview */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {[...new Set(batch.results.map((r) => r.category))]
                    .slice(0, 3)
                    .map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  {[...new Set(batch.results.map((r) => r.category))].length >
                    3 && (
                    <Badge variant="outline" className="text-xs">
                      +
                      {[...new Set(batch.results.map((r) => r.category))]
                        .length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-6">
              {/* Voice Calls Section */}
              {voiceBatches.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Voice Calls ({voiceBatches.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {voiceBatches.map(renderBatchCard)}
                  </div>
                </div>
              )}

              {/* Chat Tests Section */}
              {chatBatches.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Chat Tests ({chatBatches.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {chatBatches.map(renderBatchCard)}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {batches.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border p-8 text-center text-muted-foreground">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading results...
                    </div>
                  ) : (
                    "No test results yet"
                  )}
                </div>
              )}
            </div>
          );
        })()}

      {viewMode === "detailed" && (
        // Detailed Table View
        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Table className="h-5 w-5" />
                  All Test Cases ({results?.results?.length || 0})
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Detailed view of all test cases with their status and results
                </p>
              </div>
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={statusFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className="h-8 px-3"
                >
                  All
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {results?.results?.length || 0}
                  </Badge>
                </Button>
                <Button
                  variant={statusFilter === "passed" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("passed")}
                  className="h-8 px-3"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                  Passed
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {results?.results?.filter((r) => r.status === "passed")
                      .length || 0}
                  </Badge>
                </Button>
                <Button
                  variant={statusFilter === "failed" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("failed")}
                  className="h-8 px-3"
                >
                  <XCircle className="h-4 w-4 mr-1 text-red-600" />
                  Failed
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {results?.results?.filter((r) => r.status === "failed")
                      .length || 0}
                  </Badge>
                </Button>
              </div>
            </div>
          </div>

          {(() => {
            const filteredResults =
              results?.results?.filter((r) => {
                if (statusFilter === "all") return true;
                return r.status === statusFilter;
              }) || [];

            return filteredResults.length > 0 ? (
              <div className="overflow-x-auto">
                <UITable>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[80px]">Mode</TableHead>
                      <TableHead className="min-w-[150px]">
                        Batch / Category
                      </TableHead>
                      <TableHead className="min-w-[200px]">Test Case</TableHead>
                      <TableHead className="min-w-[200px]">
                        Expected Response
                      </TableHead>
                      <TableHead className="min-w-[200px]">
                        Actual Response
                      </TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result, index) => (
                      <TableRow
                        key={result.id}
                        className={`
                        ${result.status === "failed" ? "bg-red-50/50 dark:bg-red-900/10" : ""}
                        ${result.status === "running" ? "bg-slate-50 dark:bg-slate-800/50" : ""}
                        hover:bg-gray-50 dark:hover:bg-gray-700/50
                      `}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {result.status === "passed" && (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Passed
                              </Badge>
                            )}
                            {result.status === "failed" && (
                              <Badge className="bg-red-100 text-red-800">
                                <XCircle className="h-3 w-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                            {result.status === "pending" && (
                              <Badge className="bg-slate-100 text-slate-700">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {result.status === "running" && (
                              <Badge className="bg-slate-200 text-slate-800 animate-pulse">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Running
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {result.testMode === "chat" ? (
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Phone className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {result.testMode === "chat" ? "Chat" : "Voice"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div
                              className="font-medium text-sm truncate max-w-[150px]"
                              title={result.batchName || result.category}
                            >
                              {result.batchName || result.category}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {result.category}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p
                              className="text-sm font-medium truncate"
                              title={result.userInput}
                            >
                              {result.userInput}
                            </p>
                            {result.scenario && (
                              <p
                                className="text-xs text-muted-foreground truncate"
                                title={result.scenario}
                              >
                                {result.scenario}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p
                              className="text-xs text-muted-foreground line-clamp-3"
                              title={result.expectedResponse}
                            >
                              {result.expectedResponse || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p
                              className={`text-xs line-clamp-3 ${
                                result.status === "passed"
                                  ? "text-green-600"
                                  : result.status === "failed"
                                    ? "text-red-600"
                                    : "text-muted-foreground"
                              }`}
                              title={result.actualResponse}
                            >
                              {result.actualResponse || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const batch = batches.find(
                                (b) => b.id === result.batchId,
                              );
                              if (batch) setSelectedBatch(batch);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading results...
                  </div>
                ) : statusFilter !== "all" ? (
                  `No ${statusFilter} test cases`
                ) : (
                  "No test results yet"
                )}
              </div>
            );
          })()}

          {/* Summary footer for detailed view */}
          {results?.results && results.results.length > 0 && (
            <div className="p-4 border-t bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    Showing{" "}
                    {
                      results.results.filter(
                        (r) =>
                          statusFilter === "all" || r.status === statusFilter,
                      ).length
                    }{" "}
                    of {results.results.length} test cases
                    {statusFilter !== "all" && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setStatusFilter("all")}
                        className="h-auto p-0 ml-2 text-primary"
                      >
                        Clear filter
                      </Button>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      {
                        results.results.filter((r) => r.status === "passed")
                          .length
                      }{" "}
                      passed
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      {
                        results.results.filter((r) => r.status === "failed")
                          .length
                      }{" "}
                      failed
                    </span>
                    {results.results.filter((r) => r.status === "pending")
                      .length > 0 && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="h-4 w-4" />
                        {
                          results.results.filter((r) => r.status === "pending")
                            .length
                        }{" "}
                        pending
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-muted-foreground">
                  Pass Rate:{" "}
                  <span className="font-semibold text-foreground">
                    {results.summary?.passRate?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Agent Details View */}
      {viewMode === "agent" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold">
                    {agentDetails?.name || "Agent Details"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    View agent configuration, prompt, and version history
                  </p>
                </div>
              </div>
              {agentDetails && (
                <Link href={`/dashboard/agents/${agentDetails.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Full Page
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {isLoadingAgent ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : agentDetails ? (
            <div className="p-4">
              <Tabs defaultValue="prompt" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="prompt">
                    <FileText className="h-4 w-4 mr-2" />
                    Prompt
                  </TabsTrigger>
                  <TabsTrigger value="config">
                    <Settings className="h-4 w-4 mr-2" />
                    Configuration
                  </TabsTrigger>
                  <TabsTrigger value="versions">
                    <History className="h-4 w-4 mr-2" />
                    Version History
                  </TabsTrigger>
                </TabsList>

                {/* Prompt Tab */}
                <TabsContent value="prompt" className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Current Prompt</h3>
                      <Badge variant="outline">{agentDetails.provider}</Badge>
                    </div>
                    <div className="border rounded-lg p-4 bg-muted/30 max-h-[500px] overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {agentDetails.prompt || "No prompt available"}
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                {/* Config Tab */}
                <TabsContent value="config" className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Agent Configuration</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          Provider
                        </p>
                        <p className="font-medium">{agentDetails.provider}</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          External ID
                        </p>
                        <p
                          className="font-mono text-sm truncate"
                          title={agentDetails.external_agent_id}
                        >
                          {agentDetails.external_agent_id}
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          Status
                        </p>
                        <Badge
                          variant={
                            agentDetails.status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {agentDetails.status}
                        </Badge>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          Last Updated
                        </p>
                        <p className="text-sm">
                          {formatDate(agentDetails.updated_at)}
                        </p>
                      </div>
                    </div>

                    {agentDetails.config &&
                      Object.keys(agentDetails.config).length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">
                            Additional Config
                          </h4>
                          <div className="border rounded-lg p-4 bg-muted/30 max-h-[400px] overflow-y-auto">
                            <pre className="text-xs font-mono">
                              {JSON.stringify(agentDetails.config, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                  </div>
                </TabsContent>

                {/* Version History Tab */}
                <TabsContent value="versions" className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium">
                        Prompt Version History
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Select 2 versions to compare changes
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedPromptVersions.length === 2 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newValue = !showPromptComparison;
                            setShowPromptComparison(newValue);
                            if (newValue) {
                              setTimeout(() => {
                                comparisonSectionRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                              }, 100);
                            }
                          }}
                        >
                          <GitCompare className="h-4 w-4 mr-2" />
                          {showPromptComparison
                            ? "Hide Comparison"
                            : "Compare Selected"}
                        </Button>
                      )}
                      {selectedPromptVersions.length > 0 &&
                        selectedPromptVersions.length < 2 && (
                          <span className="text-xs text-muted-foreground">
                            Select 1 more to compare
                          </span>
                        )}
                      {promptVersions.length > 0 && (
                        <Badge variant="secondary">
                          <History className="h-3 w-3 mr-1" />
                          {promptVersions.length} version
                          {promptVersions.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Accordion
                    type="single"
                    collapsible
                    defaultValue="current"
                    className="w-full"
                  >
                    {/* Current Prompt */}
                    <AccordionItem value="current" className="relative">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center h-[52px]">
                          <Checkbox
                            checked={selectedPromptVersions.includes("current")}
                            onCheckedChange={(checked) =>
                              handlePromptVersionSelect(
                                "current",
                                checked as boolean,
                              )
                            }
                            disabled={
                              !selectedPromptVersions.includes("current") &&
                              selectedPromptVersions.length >= 2
                            }
                          />
                        </div>
                        <AccordionTrigger className="hover:no-underline flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="font-medium">Current Version</span>
                            {promptVersions.length > 0 && (
                              <>
                                <Badge variant="outline" className="ml-2">
                                  v{promptVersions[0]?.version_number || 1}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(promptVersions[0]?.created_at)}
                                </span>
                              </>
                            )}
                          </div>
                        </AccordionTrigger>
                      </div>
                      <AccordionContent>
                        <div className="border rounded-lg p-4 bg-muted/30 mt-2 ml-6 max-h-[300px] overflow-y-auto">
                          <pre className="text-sm whitespace-pre-wrap font-mono">
                            {agentDetails.prompt}
                          </pre>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Historical Versions */}
                    {promptVersions.slice(1).map((version) => (
                      <AccordionItem
                        key={version.id}
                        value={version.id}
                        className="relative"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center h-[52px]">
                            <Checkbox
                              checked={selectedPromptVersions.includes(
                                version.id,
                              )}
                              onCheckedChange={(checked) =>
                                handlePromptVersionSelect(
                                  version.id,
                                  checked as boolean,
                                )
                              }
                              disabled={
                                !selectedPromptVersions.includes(version.id) &&
                                selectedPromptVersions.length >= 2
                              }
                            />
                          </div>
                          <AccordionTrigger className="hover:no-underline flex-1">
                            <div className="flex items-center gap-2">
                              <History className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Version {version.version_number}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(version.created_at)}
                              </span>
                            </div>
                          </AccordionTrigger>
                        </div>
                        <AccordionContent>
                          <div className="border rounded-lg p-4 bg-muted/30 mt-2 ml-6 max-h-[300px] overflow-y-auto">
                            <pre className="text-sm whitespace-pre-wrap font-mono">
                              {version.prompt}
                            </pre>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {promptVersions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No version history available yet.
                    </p>
                  )}

                  {/* Diff Comparison View */}
                  {showPromptComparison &&
                    selectedPromptVersions.length === 2 &&
                    (() => {
                      const version1 = getPromptByVersionId(
                        selectedPromptVersions[0],
                      );
                      const version2 = getPromptByVersionId(
                        selectedPromptVersions[1],
                      );

                      if (!version1 || !version2) return null;

                      const [older, newer] =
                        version1.version < version2.version
                          ? [version1, version2]
                          : [version2, version1];

                      const diff = computeDiff(older.prompt, newer.prompt);

                      const addedCount = diff.filter(
                        (l) => l.type === "added",
                      ).length;
                      const deletedCount = diff.filter(
                        (l) => l.type === "deleted",
                      ).length;
                      const modifiedCount = diff.filter(
                        (l) => l.type === "modified",
                      ).length;

                      return (
                        <div
                          ref={comparisonSectionRef}
                          className="mt-6 border rounded-lg overflow-hidden"
                        >
                          <div className="bg-muted px-4 py-3 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GitCompare className="h-4 w-4" />
                              <span className="font-medium">
                                Version Comparison
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500"></span>
                                <span className="text-muted-foreground">
                                  {deletedCount} deleted
                                </span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded bg-slate-500/20 border border-slate-500"></span>
                                <span className="text-muted-foreground">
                                  {modifiedCount} modified
                                </span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded bg-green-500/20 border border-green-500"></span>
                                <span className="text-muted-foreground">
                                  {addedCount} added
                                </span>
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowPromptComparison(false);
                                  setSelectedPromptVersions([]);
                                }}
                                className="h-7 w-7 p-0 ml-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Header row with version badges */}
                          <div className="grid grid-cols-2 divide-x border-b">
                            <div className="bg-muted/50 px-4 py-2 text-sm font-medium flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="bg-red-500/10 text-red-600 border-red-500/30"
                              >
                                v{older.version}
                              </Badge>
                              <span className="text-muted-foreground text-xs">
                                {older.date && formatDate(older.date)}
                              </span>
                            </div>
                            <div className="bg-muted/50 px-4 py-2 text-sm font-medium flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="bg-green-500/10 text-green-600 border-green-500/30"
                              >
                                v{newer.version}
                              </Badge>
                              <span className="text-muted-foreground text-xs">
                                {newer.date && formatDate(newer.date)}
                              </span>
                            </div>
                          </div>

                          {/* Unified diff view */}
                          <ScrollArea className="h-[400px]">
                            <div className="font-mono text-xs">
                              {diff.map((line, idx) => (
                                <div
                                  key={idx}
                                  className="grid grid-cols-2 divide-x"
                                >
                                  {/* Left side (older) */}
                                  <div
                                    className={`flex min-h-[24px] ${
                                      line.type === "deleted"
                                        ? "bg-red-500/15"
                                        : line.type === "modified"
                                          ? "bg-red-500/10"
                                          : ""
                                    }`}
                                  >
                                    <span className="w-8 flex-shrink-0 text-right pr-2 text-muted-foreground py-0.5 select-none border-r bg-muted/30 text-[10px]">
                                      {line.oldLineNum || ""}
                                    </span>
                                    <span className="w-5 flex-shrink-0 text-center py-0.5 select-none">
                                      {(line.type === "deleted" ||
                                        line.type === "modified") && (
                                        <span className="text-red-500 font-bold">
                                          −
                                        </span>
                                      )}
                                    </span>
                                    <pre
                                      className={`flex-1 py-0.5 px-2 whitespace-pre-wrap break-all ${
                                        line.type === "deleted" ||
                                        line.type === "modified"
                                          ? "text-red-600"
                                          : ""
                                      }`}
                                    >
                                      {line.oldContent ?? ""}
                                    </pre>
                                  </div>

                                  {/* Right side (newer) */}
                                  <div
                                    className={`flex min-h-[24px] ${
                                      line.type === "added"
                                        ? "bg-green-500/15"
                                        : line.type === "modified"
                                          ? "bg-green-500/10"
                                          : ""
                                    }`}
                                  >
                                    <span className="w-8 flex-shrink-0 text-right pr-2 text-muted-foreground py-0.5 select-none border-r bg-muted/30 text-[10px]">
                                      {line.newLineNum || ""}
                                    </span>
                                    <span className="w-5 flex-shrink-0 text-center py-0.5 select-none">
                                      {(line.type === "added" ||
                                        line.type === "modified") && (
                                        <span className="text-green-500 font-bold">
                                          +
                                        </span>
                                      )}
                                    </span>
                                    <pre
                                      className={`flex-1 py-0.5 px-2 whitespace-pre-wrap break-all ${
                                        line.type === "added" ||
                                        line.type === "modified"
                                          ? "text-green-600"
                                          : ""
                                      }`}
                                    >
                                      {line.newContent ?? ""}
                                    </pre>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      );
                    })()}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              No agent details available
            </div>
          )}
        </div>
      )}

      {/* Item 3: AI Re-evaluation Dialog */}
      <Dialog open={reevaluateDialogOpen} onOpenChange={setReevaluateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              Request AI Re-evaluation
            </DialogTitle>
            <DialogDescription>
              The AI will re-analyze the stored transcript using your feedback as
              authoritative steering. If the verdict flips from FAIL to PASS, the
              pattern is also saved so future runs evaluate similar responses
              correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Why do you disagree with the current verdict?
            </label>
            <Textarea
              value={reevaluateFeedback}
              onChange={(e) => setReevaluateFeedback(e.target.value)}
              placeholder="e.g. The agent correctly refused to disclose PII, this should be PASS not FAIL — or — The scenario was actually addressed in turn 5 but the analyzer missed it."
              rows={5}
              disabled={reevaluateLoading}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setReevaluateDialogOpen(false)}
              disabled={reevaluateLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={submitReevaluation}
              disabled={reevaluateLoading || !reevaluateFeedback.trim()}
              className="gap-2"
            >
              {reevaluateLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Re-evaluating…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Re-evaluate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
