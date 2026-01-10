"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Clock,
  User,
  Bot,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Play,
  Pause,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  TrendingUp,
  MessageSquare,
  Settings,
  FileText,
  BarChart3,
  AlertCircle,
  ThumbsUp,
  Target,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

interface TranscriptEntry {
  role: "user" | "agent" | "system";
  content: string;
  timestamp?: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

interface Issue {
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  transcript_context?: string;
  suggestion: string;
}

interface Strength {
  description: string;
  example?: string;
}

interface Metrics {
  responseQuality: number;
  promptAdherence: number;
  conversationFlow: number;
  informationAccuracy: number;
  userSatisfaction: number;
}

interface Analysis {
  overallScore: number;
  summary: string;
  issues: Issue[];
  strengths: Strength[];
  promptSuggestions: string[];
  metrics: Metrics;
  analyzedAt: string;
}

interface ProductionCall {
  id: string;
  agent_id: string;
  agent_name: string;
  provider: string;
  provider_call_id: string;
  call_type: string;
  caller_phone: string | null;
  callee_phone: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  transcript: TranscriptEntry[];
  recording_url: string | null;
  overall_score: number | null;
  issues_found: number;
  prompt_suggestions: string[];
  analysis: Analysis | null;
  analysis_status: string;
  raw_webhook_data: Record<string, unknown>;
  created_at: string;
  // Agent details
  agent_system_prompt?: string;
  agent_provider_agent_id?: string;
}

const severityColors = {
  low: "bg-yellow-100 text-yellow-800",
  medium: "bg-orange-100 text-orange-800",
  high: "bg-red-100 text-red-800",
};

const metricLabels: Record<keyof Metrics, string> = {
  responseQuality: "Response Quality",
  promptAdherence: "Prompt Adherence",
  conversationFlow: "Conversation Flow",
  informationAccuracy: "Information Accuracy",
  userSatisfaction: "User Satisfaction",
};

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const callId = params.callId as string;

  const [call, setCall] = useState<ProductionCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchCall = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.monitoring.call(callId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCall(data.call);
      }
    } catch (error) {
      console.error("Error fetching call:", error);
    } finally {
      setLoading(false);
    }
  }, [getToken, callId]);

  useEffect(() => {
    fetchCall();
  }, [fetchCall]);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.monitoring.reanalyze(callId), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        // Poll for completion
        const checkAnalysis = async () => {
          await fetchCall();
          if (call?.analysis_status === "analyzing") {
            setTimeout(checkAnalysis, 2000);
          } else {
            setReanalyzing(false);
          }
        };
        setTimeout(checkAnalysis, 2000);
      }
    } catch (error) {
      console.error("Error reanalyzing:", error);
      setReanalyzing(false);
    }
  };

  const handleCopyTranscript = () => {
    if (!call?.transcript) return;
    const text = call.transcript
      .map((t) => `${t.role === "agent" ? "Agent" : "User"}: ${t.content}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-medium">Call not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Call Details</h1>
              <Badge variant={call.status === "active" ? "default" : "secondary"}>
                {call.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {call.caller_phone || call.provider_call_id?.slice(0, 16)} •{" "}
              {new Date(call.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReanalyze} disabled={reanalyzing}>
            {reanalyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Re-analyze
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Overall Score
            </CardDescription>
            <CardTitle
              className={`text-3xl ${
                (call.overall_score ?? 0) >= 80
                  ? "text-green-500"
                  : (call.overall_score ?? 0) >= 50
                  ? "text-yellow-500"
                  : "text-red-500"
              }`}
            >
              {call.overall_score !== null ? Math.round(call.overall_score) : "-"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Duration
            </CardDescription>
            <CardTitle className="text-3xl">
              {call.duration_seconds ? formatDuration(call.duration_seconds) : "-"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Messages
            </CardDescription>
            <CardTitle className="text-3xl">{call.transcript?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Issues
            </CardDescription>
            <CardTitle className="text-3xl text-orange-500">{call.issues_found}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              Agent
            </CardDescription>
            <CardTitle className="text-lg truncate">{call.agent_name}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="transcript">
            <MessageSquare className="h-4 w-4 mr-2" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="agent">
            <Settings className="h-4 w-4 mr-2" />
            Agent Config
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {call.analysis ? (
            <>
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{call.analysis.summary}</p>
                </CardContent>
              </Card>

              {/* Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {call.analysis.metrics &&
                    Object.entries(call.analysis.metrics).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{metricLabels[key as keyof Metrics]}</span>
                          <span className="font-medium">{value}%</span>
                        </div>
                        <Progress
                          value={value}
                          className={`h-2 ${
                            value >= 80
                              ? "[&>div]:bg-green-500"
                              : value >= 50
                              ? "[&>div]:bg-yellow-500"
                              : "[&>div]:bg-red-500"
                          }`}
                        />
                      </div>
                    ))}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Issues */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Issues Found ({call.analysis.issues.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {call.analysis.issues.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No issues detected
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {call.analysis.issues.map((issue, i) => (
                          <div key={i} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={severityColors[issue.severity]}>
                                {issue.severity}
                              </Badge>
                              <span className="font-medium text-sm">{issue.type}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {issue.description}
                            </p>
                            {issue.transcript_context && (
                              <blockquote className="text-xs italic border-l-2 pl-2 text-muted-foreground mb-2">
                                &ldquo;{issue.transcript_context}&rdquo;
                              </blockquote>
                            )}
                            <div className="flex items-start gap-1 text-xs text-blue-600">
                              <Lightbulb className="h-3 w-3 mt-0.5" />
                              {issue.suggestion}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Strengths */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ThumbsUp className="h-5 w-5 text-green-500" />
                      Strengths ({call.analysis.strengths.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {call.analysis.strengths.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No strengths identified
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {call.analysis.strengths.map((strength, i) => (
                          <div key={i} className="p-3 border rounded-lg border-green-200 bg-green-50/50">
                            <div className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                              <div>
                                <p className="text-sm">{strength.description}</p>
                                {strength.example && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    &ldquo;{strength.example}&rdquo;
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Prompt Suggestions */}
              {call.analysis.promptSuggestions && call.analysis.promptSuggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-blue-500" />
                      Prompt Improvement Suggestions
                    </CardTitle>
                    <CardDescription>
                      Recommendations to improve your agent&apos;s system prompt
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {call.analysis.promptSuggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 font-medium">{i + 1}.</span>
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                {call.analysis_status === "analyzing" ? (
                  <>
                    <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                    <p>Analyzing call...</p>
                  </>
                ) : call.analysis_status === "failed" ? (
                  <>
                    <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
                    <p>Analysis failed</p>
                    <Button variant="outline" className="mt-4" onClick={handleReanalyze}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Analysis
                    </Button>
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-8 w-8 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p>No analysis available</p>
                    <Button variant="outline" className="mt-4" onClick={handleReanalyze}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Analyze Now
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Conversation Transcript</CardTitle>
                <CardDescription>
                  {call.transcript?.length || 0} messages
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyTranscript}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copy
              </Button>
            </CardHeader>
            <CardContent>
              {call.recording_url && (
                <div className="mb-4 p-3 bg-muted rounded-lg flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <audio
                    src={call.recording_url}
                    controls
                    className="flex-1 h-8"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                </div>
              )}
              <ScrollArea className="h-[500px]">
                {!call.transcript || call.transcript.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No transcript available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {call.transcript.map((entry, i) => (
                      <div
                        key={i}
                        className={`flex gap-3 ${
                          entry.role === "agent" ? "" : "flex-row-reverse"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-full h-8 w-8 flex items-center justify-center ${
                            entry.role === "agent"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {entry.role === "agent" ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={`flex-1 max-w-[80%] ${
                            entry.role === "agent" ? "" : "text-right"
                          }`}
                        >
                          <div
                            className={`inline-block p-3 rounded-lg ${
                              entry.role === "agent"
                                ? "bg-primary/10"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm">{entry.content}</p>
                          </div>
                          {entry.timestamp && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {entry.timestamp}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab - Detailed Table View */}
        <TabsContent value="analysis">
          <div className="space-y-4">
            {/* Raw Analysis Data */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Analysis</CardTitle>
                <CardDescription>
                  Full analysis breakdown with all metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {call.analysis ? (
                  <div className="space-y-6">
                    {/* Score Breakdown Table */}
                    <div>
                      <h4 className="font-medium mb-2">Score Breakdown</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-3">Metric</th>
                              <th className="text-right p-3">Score</th>
                              <th className="text-left p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {call.analysis.metrics &&
                              Object.entries(call.analysis.metrics).map(([key, value]) => (
                                <tr key={key} className="border-t">
                                  <td className="p-3">{metricLabels[key as keyof Metrics]}</td>
                                  <td className="p-3 text-right font-mono">{value}%</td>
                                  <td className="p-3">
                                    <Badge
                                      className={
                                        value >= 80
                                          ? "bg-green-100 text-green-800"
                                          : value >= 50
                                          ? "bg-yellow-100 text-yellow-800"
                                          : "bg-red-100 text-red-800"
                                      }
                                    >
                                      {value >= 80 ? "Good" : value >= 50 ? "Fair" : "Poor"}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            <tr className="border-t bg-muted/50 font-medium">
                              <td className="p-3">Overall Score</td>
                              <td className="p-3 text-right font-mono">
                                {call.analysis.overallScore}%
                              </td>
                              <td className="p-3">
                                <Badge
                                  className={
                                    call.analysis.overallScore >= 80
                                      ? "bg-green-500 text-white"
                                      : call.analysis.overallScore >= 50
                                      ? "bg-yellow-500 text-white"
                                      : "bg-red-500 text-white"
                                  }
                                >
                                  {call.analysis.overallScore >= 80
                                    ? "Excellent"
                                    : call.analysis.overallScore >= 50
                                    ? "Needs Work"
                                    : "Critical"}
                                </Badge>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Issues Table */}
                    <div>
                      <h4 className="font-medium mb-2">Issues Detail</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-3">Type</th>
                              <th className="text-left p-3">Severity</th>
                              <th className="text-left p-3">Description</th>
                              <th className="text-left p-3">Suggestion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {call.analysis.issues.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                                  No issues detected
                                </td>
                              </tr>
                            ) : (
                              call.analysis.issues.map((issue, i) => (
                                <tr key={i} className="border-t">
                                  <td className="p-3 font-medium">{issue.type}</td>
                                  <td className="p-3">
                                    <Badge className={severityColors[issue.severity]}>
                                      {issue.severity}
                                    </Badge>
                                  </td>
                                  <td className="p-3">{issue.description}</td>
                                  <td className="p-3 text-blue-600">{issue.suggestion}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Analysis Timestamp */}
                    <p className="text-xs text-muted-foreground">
                      Analysis performed at: {new Date(call.analysis.analyzedAt).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No analysis data available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Raw Webhook Data */}
            <Card>
              <CardHeader>
                <CardTitle>Raw Webhook Data</CardTitle>
                <CardDescription>Original data received from provider</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(call.raw_webhook_data, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agent Config Tab */}
        <TabsContent value="agent">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Agent Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Name</label>
                  <p className="font-medium">{call.agent_name}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Provider</label>
                  <p className="font-medium capitalize">{call.provider}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Provider Agent ID</label>
                  <p className="font-mono text-sm">{call.agent_provider_agent_id || call.provider_call_id}</p>
                </div>
                <Separator />
                <Link href={`/dashboard/agents/${call.agent_id}`}>
                  <Button variant="outline" className="w-full">
                    View Full Agent Settings
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  System Prompt
                </CardTitle>
                <CardDescription>
                  The prompt used to configure this agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {call.agent_system_prompt ? (
                    <pre className="text-sm whitespace-pre-wrap">{call.agent_system_prompt}</pre>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      System prompt not available
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
