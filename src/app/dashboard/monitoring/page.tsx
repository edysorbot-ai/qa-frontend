"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Activity, 
  Play, 
  Square, 
  Copy, 
  Check, 
  Phone,
  Clock, 
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Loader2,
  Zap,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

// Provider-specific webhook instructions
const WEBHOOK_INSTRUCTIONS: Record<string, {
  title: string;
  steps: string[];
  docsUrl?: string;
  webhookLocation: string;
}> = {
  retell: {
    title: "Retell AI Webhook Setup",
    steps: [
      "Go to your Retell AI dashboard (retellai.com)",
      "Navigate to Settings → Webhooks",
      "Add a new webhook with the URL below",
      "Enable events: call_started, call_ended, call_analyzed",
      "Save the webhook configuration",
    ],
    docsUrl: "https://docs.retellai.com/api-references/webhooks",
    webhookLocation: "Settings → Webhooks → Add Webhook",
  },
  vapi: {
    title: "VAPI Webhook Setup",
    steps: [
      "Go to your VAPI dashboard (vapi.ai)",
      "Select your assistant",
      "Go to Advanced Settings → Server URL",
      "Paste the webhook URL below",
      "Or configure via API: PATCH /assistant/{id} with serverUrl",
    ],
    docsUrl: "https://docs.vapi.ai/webhooks",
    webhookLocation: "Assistant → Advanced Settings → Server URL",
  },
  elevenlabs: {
    title: "ElevenLabs Webhook Setup",
    steps: [
      "Go to ElevenLabs dashboard (elevenlabs.io)",
      "Navigate to your Conversational AI agent",
      "Go to Settings → Webhooks",
      "Add the webhook URL below for post-conversation events",
      "Enable conversation events",
    ],
    docsUrl: "https://elevenlabs.io/docs/conversational-ai/webhooks",
    webhookLocation: "Agent → Settings → Webhooks",
  },
  bolna: {
    title: "Bolna AI Webhook Setup",
    steps: [
      "Go to Bolna dashboard (bolna.ai)",
      "Select your agent",
      "Go to Agent Settings → Webhooks",
      "Add the webhook URL for call events",
      "Enable: call_started, call_ended notifications",
    ],
    docsUrl: "https://docs.bolna.ai/webhooks",
    webhookLocation: "Agent → Settings → Webhooks",
  },
  livekit: {
    title: "LiveKit Webhook Setup",
    steps: [
      "Go to LiveKit Cloud (cloud.livekit.io)",
      "Select your project",
      "Go to Settings → Webhooks",
      "Add the webhook URL below",
      "Enable room and participant events",
    ],
    docsUrl: "https://docs.livekit.io/home/server/webhooks/",
    webhookLocation: "Project → Settings → Webhooks",
  },
};

const providerColors: Record<string, string> = {
  elevenlabs: "bg-blue-500",
  retell: "bg-purple-500",
  vapi: "bg-green-500",
  haptik: "bg-orange-500",
  bolna: "bg-pink-500",
  livekit: "bg-cyan-500",
  custom: "bg-gray-500",
};

interface Agent {
  id: string;
  name: string;
  provider: string;
  provider_agent_id: string;
}

interface MonitoringSession {
  id: string;
  agent_id: string;
  webhook_url: string;
  is_active: boolean;
  total_calls: number;
  last_call_at: string | null;
  agent_name: string;
  provider: string;
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
  overall_score: number | null;
  issues_found: number;
  analysis_status: string;
  created_at: string;
}

export default function MonitoringPage() {
  const { getToken } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [session, setSession] = useState<MonitoringSession | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [instructions, setInstructions] = useState<typeof WEBHOOK_INSTRUCTIONS.retell | null>(null);
  const [jsonConfig, setJsonConfig] = useState<object | null>(null);
  const [calls, setCalls] = useState<ProductionCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch agents on mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const token = await getToken();
        const response = await fetch(api.endpoints.agents.list, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents || []);
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, [getToken]);

  // Fetch monitoring sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = await getToken();
        const response = await fetch(api.endpoints.monitoring.sessions, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          // Check if there's an active session
          const activeSession = data.sessions.find((s: MonitoringSession) => s.is_active);
          if (activeSession) {
            setSession(activeSession);
            setSelectedAgentId(activeSession.agent_id);
            setIsMonitoring(true);
            setWebhookUrl(activeSession.webhook_url);
            const agent = agents.find(a => a.id === activeSession.agent_id);
            if (agent) {
              setInstructions(WEBHOOK_INSTRUCTIONS[agent.provider]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
      }
    };
    if (agents.length > 0) {
      fetchSessions();
    }
  }, [getToken, agents]);

  // Fetch calls for selected agent
  const fetchCalls = useCallback(async () => {
    if (!selectedAgentId) return;
    
    try {
      const token = await getToken();
      const response = await fetch(
        `${api.endpoints.monitoring.calls}?agentId=${selectedAgentId}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setCalls(data.calls || []);
      }
    } catch (error) {
      console.error("Error fetching calls:", error);
    }
  }, [getToken, selectedAgentId]);

  useEffect(() => {
    if (selectedAgentId && isMonitoring) {
      fetchCalls();
    }
  }, [selectedAgentId, isMonitoring, fetchCalls]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!isMonitoring) return;

    const connectWebSocket = async () => {
      try {
        const token = await getToken();
        // Get user ID from token claims (simplified)
        const response = await fetch(api.endpoints.users.me, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        
        const userData = await response.json();
        const userId = userData.user?.id;
        
        if (!userId) return;

        const wsUrl = `${api.wsUrl}?userId=${userId}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("[WebSocket] Connected");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("[WebSocket] Received:", data);

            if (data.event === "call:started" || data.event === "call:completed") {
              // Refresh calls list
              fetchCalls();
            }
          } catch (e) {
            console.error("[WebSocket] Parse error:", e);
          }
        };

        ws.onclose = () => {
          console.log("[WebSocket] Disconnected");
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error("[WebSocket] Error:", error);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error("[WebSocket] Connection error:", error);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isMonitoring, getToken, fetchCalls]);

  // Setup monitoring session
  const handleSetupSession = async () => {
    if (!selectedAgentId) return;

    setSetupLoading(true);
    try {
      const token = await getToken();
      console.log("[Monitoring] Setting up session for agent:", selectedAgentId);
      
      const response = await fetch(api.endpoints.monitoring.createSession, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agentId: selectedAgentId }),
      });

      const data = await response.json();
      console.log("[Monitoring] Response:", response.status, data);

      if (response.ok) {
        console.log("[Monitoring] Session created successfully:", data);
        setSession(data.session);
        setWebhookUrl(data.webhookUrl);
        setInstructions(data.instructions);
        setJsonConfig(data.jsonConfig || null);
      } else {
        console.error("[Monitoring] Error creating session:", data);
        alert(`Error: ${data.error || data.details || 'Failed to setup webhook'}`);
      }
    } catch (error) {
      console.error("Error setting up session:", error);
      alert("Failed to connect to server. Please check if the backend is running.");
    } finally {
      setSetupLoading(false);
    }
  };

  // Start monitoring
  const handleStartMonitoring = async () => {
    if (!selectedAgentId) return;

    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.monitoring.startMonitoring(selectedAgentId), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setIsMonitoring(true);
        fetchCalls();
      }
    } catch (error) {
      console.error("Error starting monitoring:", error);
    }
  };

  // Stop monitoring
  const handleStopMonitoring = async () => {
    if (!selectedAgentId) return;

    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.monitoring.stopMonitoring(selectedAgentId), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setIsMonitoring(false);
      }
    } catch (error) {
      console.error("Error stopping monitoring:", error);
    }
  };

  // Copy webhook URL
  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy JSON config
  const handleCopyJson = () => {
    if (jsonConfig) {
      navigator.clipboard.writeText(JSON.stringify(jsonConfig, null, 2));
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
    }
  };

  // Handle agent selection change
  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
    setSession(null);
    setWebhookUrl("");
    setInstructions(null);
    setJsonConfig(null);
    setIsMonitoring(false);
    setCalls([]);
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Realtime Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor production calls and analyze agent performance in real-time
          </p>
        </div>
        {isMonitoring && (
          <Badge variant="default" className="bg-green-500 animate-pulse">
            <Zap className="h-3 w-3 mr-1" />
            Live
          </Badge>
        )}
      </div>

      {/* Agent Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Agent to Monitor</CardTitle>
          <CardDescription>
            Choose an agent from your connected integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedAgentId} onValueChange={handleAgentChange}>
            <SelectTrigger className="w-full md:w-[400px]">
              <SelectValue placeholder="Select an agent..." />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <Badge className={`${providerColors[agent.provider]} text-white text-xs`}>
                      {agent.provider}
                    </Badge>
                    {agent.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedAgentId && !session && (
            <Button onClick={handleSetupSession} disabled={setupLoading}>
              {setupLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Setup Webhook
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Webhook Setup Instructions */}
      {session && instructions && !isMonitoring && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {instructions.title}
              {instructions.docsUrl && (
                <a 
                  href={instructions.docsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  Docs
                </a>
              )}
            </CardTitle>
            <CardDescription>
              {jsonConfig 
                ? `Add this webhook tool to your ${selectedAgent?.provider} agent`
                : `Add this webhook URL to your ${selectedAgent?.provider} agent settings`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Webhook URL (for non-ElevenLabs providers) */}
            {!jsonConfig && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <div className="flex gap-2">
                  <Input 
                    value={webhookUrl} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyWebhook}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Location: {instructions.webhookLocation}
                </p>
              </div>
            )}

            {/* JSON Config (for ElevenLabs) */}
            {jsonConfig && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Webhook Tool JSON Configuration</label>
                  <Button variant="outline" size="sm" onClick={handleCopyJson}>
                    {jsonCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy JSON
                      </>
                    )}
                  </Button>
                </div>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[400px] text-xs font-mono">
                    {JSON.stringify(jsonConfig, null, 2)}
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy this JSON and paste it in the &quot;Edit as JSON&quot; view when adding a webhook tool
                </p>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Setup Steps</label>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                {instructions.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            {/* Start Button */}
            <div className="pt-4 border-t">
              <Button onClick={handleStartMonitoring} className="w-full md:w-auto">
                <Play className="h-4 w-4 mr-2" />
                Start Realtime Monitoring
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Click after you&apos;ve added the webhook {jsonConfig ? 'tool' : 'URL'} to your provider
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Monitoring Dashboard */}
      {isMonitoring && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Calls</CardDescription>
                <CardTitle className="text-3xl">{calls.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg. Score</CardDescription>
                <CardTitle className="text-3xl">
                  {calls.length > 0
                    ? Math.round(
                        calls
                          .filter(c => c.overall_score !== null)
                          .reduce((acc, c) => acc + (c.overall_score || 0), 0) /
                          calls.filter(c => c.overall_score !== null).length || 0
                      )
                    : "-"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Issues Found</CardDescription>
                <CardTitle className="text-3xl text-orange-500">
                  {calls.reduce((acc, c) => acc + c.issues_found, 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Monitoring Status</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  <span className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                  Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleStopMonitoring}
                  className="text-red-500 hover:text-red-600"
                >
                  <Square className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Calls List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Production Calls</CardTitle>
                <CardDescription>
                  Calls received from {selectedAgent?.name}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchCalls}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {calls.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Waiting for calls...</p>
                  <p className="text-sm">
                    Make a call to your agent to see it appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {calls.map((call) => (
                    <Link
                      key={call.id}
                      href={`/dashboard/monitoring/${call.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${
                            call.status === 'active' 
                              ? 'bg-green-100 text-green-600 animate-pulse' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Phone className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {call.caller_phone || call.provider_call_id?.slice(0, 12) || 'Unknown'}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(call.created_at).toLocaleString()}
                              {call.duration_seconds && (
                                <span>• {Math.floor(call.duration_seconds / 60)}:{(call.duration_seconds % 60).toString().padStart(2, '0')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {call.overall_score !== null && (
                            <div className={`text-lg font-bold ${
                              call.overall_score >= 80 
                                ? 'text-green-500' 
                                : call.overall_score >= 50 
                                  ? 'text-yellow-500' 
                                  : 'text-red-500'
                            }`}>
                              {Math.round(call.overall_score)}
                            </div>
                          )}
                          {call.issues_found > 0 && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {call.issues_found}
                            </Badge>
                          )}
                          {call.analysis_status === 'analyzing' && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          <Badge variant={call.status === 'active' ? 'default' : 'secondary'}>
                            {call.status}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!selectedAgentId && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-lg font-medium mb-2">No Agent Selected</h3>
            <p className="text-muted-foreground">
              Select an agent above to start monitoring production calls
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
