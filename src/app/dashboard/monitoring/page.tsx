"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  Plus,
  Phone,
  RefreshCw,
  Loader2,
  Bot,
  MoreVertical,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import Link from "next/link";

const providerColors: Record<string, string> = {
  elevenlabs: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  retell: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  vapi: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  haptik: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  bolna: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  livekit: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  custom: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  openai_realtime: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

interface Agent {
  id: string;
  name: string;
  provider: string;
  external_agent_id: string;
  status: string;
  created_at: string;
}

interface MonitoredAgent {
  id: string;
  agent_id: string;
  name: string;
  provider: string;
  total_calls: number;
  analyzed_calls: number;
  issues_found: number;
  last_call_at: string | null;
  polling_enabled: boolean;
  created_at: string;
}

interface OverviewStats {
  total_calls: number;
  analyzed_calls: number;
  calls_today: number;
  total_issues: number;
  active_agents: number;
}

export default function MonitoringPage() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [monitoredAgents, setMonitoredAgents] = useState<MonitoredAgent[]>([]);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Fetch monitored agents
  const fetchMonitoredAgents = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${api.baseUrl}/api/monitoring/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMonitoredAgents(data.agents || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error("Error fetching monitored agents:", error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Fetch available agents (from Agents page)
  const fetchAvailableAgents = useCallback(async () => {
    setLoadingAgents(true);
    try {
      const token = await getToken();
      const response = await fetch(`${api.baseUrl}/api/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter out already monitored agents
        const monitoredIds = monitoredAgents.map(a => a.agent_id);
        const available = (data.agents || []).filter(
          (a: Agent) => !monitoredIds.includes(a.id)
        );
        setAvailableAgents(available);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoadingAgents(false);
    }
  }, [getToken, monitoredAgents]);

  useEffect(() => {
    fetchMonitoredAgents();
  }, [fetchMonitoredAgents]);

  // Fetch available agents when modal opens
  useEffect(() => {
    if (showAddModal) {
      fetchAvailableAgents();
      setSelectedAgentIds([]);
    }
  }, [showAddModal, fetchAvailableAgents]);

  // Add agents to monitoring
  const handleAddAgents = async () => {
    if (selectedAgentIds.length === 0) return;
    
    setIsAdding(true);
    try {
      const token = await getToken();
      
      // Add each selected agent to monitoring
      for (const agentId of selectedAgentIds) {
        await fetch(`${api.baseUrl}/api/monitoring/agents`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ agentId }),
        });
      }
      
      await fetchMonitoredAgents();
      setShowAddModal(false);
      setSelectedAgentIds([]);
    } catch (error) {
      console.error("Error adding agents:", error);
    } finally {
      setIsAdding(false);
    }
  };

  // Remove agent from monitoring
  const handleRemoveAgent = async (agentId: string) => {
    try {
      const token = await getToken();
      await fetch(`${api.baseUrl}/api/monitoring/agents/${agentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchMonitoredAgents();
    } catch (error) {
      console.error("Error removing agent:", error);
    }
  };

  // Toggle agent selection
  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgentIds(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No calls yet";
    return new Date(dateStr).toLocaleDateString();
  };

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
            Production Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and analyze production calls automatically via API polling
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Agent to Monitor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_calls || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Analyzed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {stats?.analyzed_calls || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Calls Today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.calls_today || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Issues Found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {stats?.total_issues || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.active_agents || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Monitored Agents Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Monitored Agents</h2>
        
        {monitoredAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monitoredAgents.map((agent) => (
              <Card
                key={agent.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => router.push(`/dashboard/monitoring/agent/${agent.agent_id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <Badge className={`mt-1 ${providerColors[agent.provider]}`}>
                          {agent.provider}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAgent(agent.agent_id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove from Monitoring
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{agent.total_calls}</div>
                      <div className="text-xs text-muted-foreground">Total Calls</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-500">{agent.analyzed_calls}</div>
                      <div className="text-xs text-muted-foreground">Analyzed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-500">
                        {agent.issues_found || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Issues</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {formatDate(agent.last_call_at)}
                    </div>
                    {agent.polling_enabled ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Syncing
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No agents being monitored</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add agents to start monitoring their production calls
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Agent to Monitor
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Agent Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Agents to Monitor</DialogTitle>
            <DialogDescription>
              Select agents from your connected agents to monitor their production calls.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingAgents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableAgents.length > 0 ? (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {availableAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAgentIds.includes(agent.id)
                          ? "bg-primary/5 border-primary"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleAgentSelection(agent.id)}
                    >
                      <Checkbox
                        checked={selectedAgentIds.includes(agent.id)}
                        onCheckedChange={() => toggleAgentSelection(agent.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{agent.name}</div>
                        <Badge className={`mt-1 text-xs ${providerColors[agent.provider]}`}>
                          {agent.provider}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No available agents to add.</p>
                <p className="text-sm mt-1">
                  All your agents are already being monitored or you need to{" "}
                  <Link href="/dashboard/agents" className="text-primary hover:underline">
                    connect agents
                  </Link>{" "}
                  first.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddAgents}
              disabled={selectedAgentIds.length === 0 || isAdding}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add {selectedAgentIds.length > 0 ? `(${selectedAgentIds.length})` : ''} Agent{selectedAgentIds.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
