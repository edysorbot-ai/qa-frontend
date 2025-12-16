"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

interface TestRunStatus {
  id: string;
  name: string;
  status: "running" | "completed" | "cancelled" | "paused";
  createdAt: string;
  progress: number;
  stats: {
    total: number;
    completed: number;
    passed: number;
    failed: number;
    pending: number;
  };
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
  completedAt: string | null;
  overallScore?: number;
  hasRecording?: boolean;
  audioUrl?: string;
  userTranscript?: string;
  agentTranscript?: string;
  conversationTurns?: Array<{ role: string; content: string; timestamp: string }>;
}

interface BatchGroup {
  id: string;
  name: string;
  results: TestResult[];
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  runningCount: number;
  durationMs?: number;
  hasTranscript: boolean;
  hasRecording: boolean;
  audioUrl?: string;
  conversationTurns: Array<{ role: string; content: string; timestamp: string }>;
  userTranscript?: string;
  agentTranscript?: string;
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

const statusColors: Record<string, string> = {
  passed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800 animate-pulse",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
  paused: "bg-orange-100 text-orange-800",
};

export default function TestRunDetailPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const testRunId = params.id as string;

  const [status, setStatus] = useState<TestRunStatus | null>(null);
  const [results, setResults] = useState<TestRunResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<BatchGroup | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        }
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
        }
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

  // Group results into batches
  const getBatches = useCallback((): BatchGroup[] => {
    if (!results?.results) return [];

    // Debug logging
    console.log('[getBatches] First 3 results:', results.results.slice(0, 3).map(r => ({
      userInput: r.userInput?.substring(0, 30),
      batchId: r.batchId,
      audioUrl: r.audioUrl,
      hasRecording: r.hasRecording
    })));

    const batchMap = new Map<string, TestResult[]>();
    results.results.forEach(result => {
      const key = result.batchId || `unbatched-${result.id}`;
      const existing = batchMap.get(key) || [];
      existing.push(result);
      batchMap.set(key, existing);
    });

    console.log('[getBatches] Batch keys:', Array.from(batchMap.keys()));

    return Array.from(batchMap.entries()).map(([batchId, batchResults], index) => {
      const firstResult = batchResults[0];
      // Get unique categories in this batch
      const categories = [...new Set(batchResults.map(r => r.category))];
      const batchName = batchId.startsWith('unbatched-') 
        ? firstResult.userInput  // Single unbatched test case - use its name
        : categories.length === 1 
          ? categories[0]  // All same category - use category name
          : `Call ${index + 1}`; // Mixed categories - use call number
      return {
        id: batchId,
        name: batchName,
        results: batchResults,
        passedCount: batchResults.filter(r => r.status === 'passed').length,
        failedCount: batchResults.filter(r => r.status === 'failed').length,
        pendingCount: batchResults.filter(r => r.status === 'pending').length,
        runningCount: batchResults.filter(r => r.status === 'running').length,
        durationMs: firstResult?.durationMs,
        hasTranscript: !!(firstResult?.conversationTurns && firstResult.conversationTurns.length > 0),
        hasRecording: !!(firstResult?.audioUrl || firstResult?.hasRecording),
        audioUrl: firstResult?.audioUrl,
        conversationTurns: firstResult?.conversationTurns || [],
        userTranscript: firstResult?.userTranscript,
        agentTranscript: firstResult?.agentTranscript,
      };
    });
  }, [results]);

  const batches = getBatches();

  // Cancel test run
  const handleCancel = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      await fetch(`${api.baseUrl}/api/test-execution/cancel/${testRunId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchStatus();
    } catch (error) {
      console.error("Error cancelling test run:", error);
    }
  };

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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBatchStatus = (batch: BatchGroup): string => {
    if (batch.runningCount > 0) return 'running';
    if (batch.failedCount > 0 && batch.passedCount === 0) return 'failed';
    if (batch.passedCount > 0 && batch.failedCount === 0) return 'passed';
    if (batch.passedCount > 0 || batch.failedCount > 0) return 'mixed';
    return 'pending';
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
          <Button variant="ghost" size="icon" onClick={() => setSelectedBatch(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{selectedBatch.name}</h1>
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
              <Badge className="bg-blue-100 text-blue-800 animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                {selectedBatch.runningCount} running
              </Badge>
            )}
          </div>
        </div>

        {/* Audio Recording Player */}
        {selectedBatch.hasRecording && selectedBatch.audioUrl && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Call Recording</span>
              </div>
              <audio 
                controls 
                className="flex-1 h-10"
                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${selectedBatch.audioUrl}`}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Conversation Transcript */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation Transcript
            </h2>
            
            {selectedBatch.hasTranscript ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {selectedBatch.conversationTurns.map((turn, index) => (
                  <div key={index} className="flex gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      turn.role === 'user' 
                        ? 'bg-slate-700 text-white' 
                        : 'bg-purple-600 text-white'
                    }`}>
                      {turn.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${
                          turn.role === 'user' ? 'text-slate-600' : 'text-purple-600'
                        }`}>
                          {turn.role === 'user' ? 'TEST CALLER' : 'AI AGENT'}
                        </span>
                      </div>
                      <div className={`rounded-lg p-3 text-sm ${
                        turn.role === 'user'
                          ? 'bg-slate-100 dark:bg-slate-800'
                          : 'bg-purple-50 dark:bg-purple-900/30'
                      }`}>
                        {turn.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
            <h2 className="text-lg font-semibold mb-4">Test Cases in This Call</h2>
            
            <div className="space-y-3">
              {selectedBatch.results.map((result) => (
                <div 
                  key={result.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.status === "passed" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {result.status === "failed" && <XCircle className="h-5 w-5 text-red-500" />}
                      {result.status === "pending" && <Clock className="h-5 w-5 text-yellow-500" />}
                      {result.status === "running" && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                      <Badge className={statusColors[result.status]}>
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {result.category}
                    </Badge>
                  </div>
                  
                  <h3 className="font-medium text-sm mb-2">{result.userInput}</h3>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Expected: </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {result.expectedResponse.length > 100 
                          ? result.expectedResponse.substring(0, 100) + '...' 
                          : result.expectedResponse}
                      </span>
                    </div>
                    {result.actualResponse && (
                      <div>
                        <span className="text-muted-foreground">Actual: </span>
                        <span className={result.status === 'passed' ? 'text-green-600' : 'text-red-600'}>
                          {result.actualResponse.length > 100 
                            ? result.actualResponse.substring(0, 100) + '...' 
                            : result.actualResponse}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main View - Batch Cards
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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

        <div className="flex items-center gap-2">
          <Badge className={statusColors[status?.status || "pending"]}>
            {status?.status?.toUpperCase() || "PENDING"}
          </Badge>

          {status?.status === "running" && (
            <>
              <Button variant="outline" size="sm" onClick={handlePauseResume}>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
              <Button variant="destructive" size="sm" onClick={handleCancel}>
                <Square className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </>
          )}

          {status?.status === "paused" && (
            <>
              <Button variant="outline" size="sm" onClick={handlePauseResume}>
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
              <Button variant="destructive" size="sm" onClick={handleCancel}>
                <Square className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              fetchStatus();
              fetchResults();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
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
            <div className="text-3xl font-bold text-blue-600">
              {(status?.stats as any)?.running || 0}
            </div>
            <div className="text-sm text-muted-foreground">Running</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {status?.stats?.pending || 0}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
        </div>
      </div>

      {/* Calls/Batches Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Voice Calls ({batches.length})
        </h2>
        
        {batches.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((batch, index) => {
              const batchStatus = getBatchStatus(batch);
              
              return (
                <div
                  key={batch.id}
                  onClick={() => setSelectedBatch(batch)}
                  className={`bg-white dark:bg-gray-800 rounded-lg border p-5 cursor-pointer 
                    hover:shadow-lg hover:border-primary/50 transition-all group
                    ${batchStatus === 'running' ? 'border-blue-300 bg-blue-50/50' : ''}
                    ${batchStatus === 'passed' ? 'border-green-200' : ''}
                    ${batchStatus === 'failed' ? 'border-red-200' : ''}
                  `}
                >
                  {/* Call Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center
                        ${batchStatus === 'running' ? 'bg-blue-100 text-blue-600' : ''}
                        ${batchStatus === 'passed' ? 'bg-green-100 text-green-600' : ''}
                        ${batchStatus === 'failed' ? 'bg-red-100 text-red-600' : ''}
                        ${batchStatus === 'mixed' ? 'bg-yellow-100 text-yellow-600' : ''}
                        ${batchStatus === 'pending' ? 'bg-gray-100 text-gray-600' : ''}
                      `}>
                        {batchStatus === 'running' ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Phone className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{batch.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {batch.results.length} test case{batch.results.length !== 1 ? 's' : ''}
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
                      <div className="flex items-center gap-1 text-blue-600 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{batch.runningCount}</span>
                      </div>
                    )}
                    {batch.pendingCount > 0 && (
                      <div className="flex items-center gap-1 text-yellow-600 text-sm">
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
                    {[...new Set(batch.results.map(r => r.category))].slice(0, 3).map(cat => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                    {[...new Set(batch.results.map(r => r.category))].length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{[...new Set(batch.results.map(r => r.category))].length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
