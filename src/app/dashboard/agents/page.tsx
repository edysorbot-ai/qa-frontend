"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Loader2,
  Bot,
  Calendar,
  Search,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";

type Provider = "elevenlabs" | "retell" | "vapi" | "openai_realtime";

interface Integration {
  id: string;
  provider: Provider;
  api_key: string;
  is_active: boolean;
}

interface ProviderAgent {
  id: string;
  name: string;
  provider: string;
  description?: string;
  voice?: string;
  language?: string;
}

interface ConnectedAgent {
  id: string;
  name: string;
  provider: Provider;
  external_agent_id: string;
  integration_id: string;
  config: Record<string, any>;
  prompt?: string;
  status: "active" | "inactive" | "error";
  created_at: string;
  updated_at: string;
}

const providerNames: Record<Provider, string> = {
  elevenlabs: "ElevenLabs",
  retell: "Retell",
  vapi: "VAPI",
  openai_realtime: "OpenAI Realtime",
};

const providerColors: Record<Provider, string> = {
  elevenlabs: "bg-purple-100 text-purple-800",
  retell: "bg-blue-100 text-blue-800",
  vapi: "bg-green-100 text-green-800",
  openai_realtime: "bg-orange-100 text-orange-800",
};

export default function AgentsPage() {
  const { getToken } = useAuth();
  const router = useRouter();

  // Connected agents state
  const [connectedAgents, setConnectedAgents] = useState<ConnectedAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  // Modal state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectedIntegrations, setConnectedIntegrations] = useState<Integration[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedProviderAgent, setSelectedProviderAgent] = useState<string>("");
  const [providerAgents, setProviderAgents] = useState<ProviderAgent[]>([]);
  const [agentSearch, setAgentSearch] = useState("");

  // Loading states
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);
  const [isLoadingProviderAgents, setIsLoadingProviderAgents] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch connected agents
  useEffect(() => {
    const loadConnectedAgents = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const response = await fetch(api.endpoints.agents.list, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setConnectedAgents(data.agents || []);
        }
      } catch (error) {
        console.error("Error fetching connected agents:", error);
      } finally {
        setIsLoadingAgents(false);
      }
    };

    loadConnectedAgents();
  }, [getToken]);

  // Fetch integrations when modal opens
  useEffect(() => {
    if (!showConnectModal) return;

    const loadIntegrations = async () => {
      setIsLoadingIntegrations(true);
      try {
        const token = await getToken();
        if (!token) return;

        const response = await fetch(api.endpoints.integrations.list, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const connected = (data.integrations || []).filter(
            (i: Integration) => i.is_active
          );
          setConnectedIntegrations(connected);
        }
      } catch (error) {
        console.error("Error fetching integrations:", error);
        setError("Failed to load integrations");
      } finally {
        setIsLoadingIntegrations(false);
      }
    };

    loadIntegrations();
  }, [showConnectModal, getToken]);

  // Fetch provider agents when provider changes
  useEffect(() => {
    if (!selectedProvider) {
      setProviderAgents([]);
      setSelectedProviderAgent("");
      return;
    }

    const loadProviderAgents = async () => {
      setIsLoadingProviderAgents(true);
      setSelectedProviderAgent("");
      setProviderAgents([]);
      setError(null);

      try {
        const token = await getToken();
        if (!token) return;

        const integration = connectedIntegrations.find(
          (i) => i.provider === selectedProvider
        );

        if (!integration) {
          setError("Integration not found");
          return;
        }

        const response = await fetch(
          api.endpoints.integrations.agents(integration.id),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setProviderAgents(data.agents || []);
        } else {
          const errorData = await response.json();
          setError(errorData.message || "Failed to load agents from provider");
        }
      } catch (error) {
        console.error("Error fetching provider agents:", error);
        setError("Failed to load agents from provider");
      } finally {
        setIsLoadingProviderAgents(false);
      }
    };

    loadProviderAgents();
  }, [selectedProvider, connectedIntegrations, getToken]);

  // Filter agents based on search
  const filteredProviderAgents = providerAgents.filter((agent) =>
    agent.name.toLowerCase().includes(agentSearch.toLowerCase())
  );

  // Handle connect agent
  const handleConnectAgent = async () => {
    if (!selectedProvider || !selectedProviderAgent) return;

    setIsConnecting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) return;

      const integration = connectedIntegrations.find(
        (i) => i.provider === selectedProvider
      );

      if (!integration) {
        setError("Integration not found");
        return;
      }

      const selectedAgent = providerAgents.find(
        (a) => a.id === selectedProviderAgent
      );

      if (!selectedAgent) {
        setError("Agent not found");
        return;
      }

      // Fetch agent details from provider
      const agentDetailsResponse = await fetch(
        api.endpoints.integrations.agent(integration.id, selectedProviderAgent),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let agentConfig = {};
      let agentPrompt = "";

      if (agentDetailsResponse.ok) {
        const agentDetails = await agentDetailsResponse.json();
        const agent = agentDetails.agent;
        
        // Store the full agent data as config
        agentConfig = agent || {};
        
        // Extract prompt based on provider format
        // ElevenLabs: description field contains prompt
        // Retell: llm_websocket_url or agent_prompt
        // VAPI: prompt or system_prompt
        agentPrompt = agent?.description || 
                      agent?.prompt || 
                      agent?.system_prompt || 
                      agent?.agent_prompt ||
                      agent?.metadata?.prompt ||
                      "";
      }

      // Create the connected agent
      const response = await fetch(api.endpoints.agents.create, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          integration_id: integration.id,
          external_agent_id: selectedProviderAgent,
          name: selectedAgent.name,
          provider: selectedProvider,
          config: agentConfig,
          prompt: agentPrompt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConnectedAgents([data.agent, ...connectedAgents]);
        setShowConnectModal(false);
        resetModalState();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to connect agent");
      }
    } catch (error) {
      console.error("Error connecting agent:", error);
      setError("Failed to connect agent");
    } finally {
      setIsConnecting(false);
    }
  };

  const resetModalState = () => {
    setSelectedProvider("");
    setSelectedProviderAgent("");
    setProviderAgents([]);
    setAgentSearch("");
    setError(null);
  };

  const handleOpenModal = () => {
    resetModalState();
    setShowConnectModal(true);
  };

  const handleCloseModal = () => {
    setShowConnectModal(false);
    resetModalState();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoadingAgents) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Manage your connected voice agents
          </p>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus className="mr-2 h-4 w-4" />
          Connect Agent
        </Button>
      </div>

      {/* Agents Grid or Empty State */}
      {connectedAgents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Agents Connected</CardTitle>
            <CardDescription>
              Connect your first voice agent to start testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Add a voice agent from ElevenLabs, Retell, VAPI, or OpenAI Realtime
              to begin generating test cases.
            </p>
            <Button onClick={handleOpenModal}>
              <Plus className="mr-2 h-4 w-4" />
              Connect Your First Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connectedAgents.map((agent) => (
            <Card
              key={agent.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <Badge
                        variant="secondary"
                        className={providerColors[agent.provider]}
                      >
                        {providerNames[agent.provider]}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Connected {formatDate(agent.created_at)}</span>
                </div>
                {agent.status !== "active" && (
                  <Badge
                    variant="outline"
                    className={
                      agent.status === "error"
                        ? "mt-2 text-red-600 border-red-300"
                        : "mt-2 text-gray-600 border-gray-300"
                    }
                  >
                    {agent.status}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connect Agent Modal */}
      <Dialog open={showConnectModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Connect Agent</DialogTitle>
            <DialogDescription>
              Select a provider and choose an agent to connect
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>Provider</Label>
              {isLoadingIntegrations ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : connectedIntegrations.length === 0 ? (
                <div className="flex items-center gap-2 p-4 bg-yellow-50 rounded-lg text-yellow-800">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">
                    No integrations connected. Please add an integration in
                    Settings first.
                  </span>
                </div>
              ) : (
                <Select
                  value={selectedProvider}
                  onValueChange={(value) => {
                    setSelectedProvider(value);
                    setAgentSearch("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectedIntegrations.map((integration) => (
                      <SelectItem
                        key={integration.id}
                        value={integration.provider}
                      >
                        {providerNames[integration.provider]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Agent Selection */}
            {selectedProvider && (
              <div className="space-y-2">
                <Label>Agent</Label>
                {isLoadingProviderAgents ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : providerAgents.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-gray-600 text-sm">
                    No agents found for this provider
                  </div>
                ) : (
                  <>
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search agents..."
                        value={agentSearch}
                        onChange={(e) => setAgentSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Agent List */}
                    <ScrollArea className="h-[200px] border rounded-md">
                      <div className="p-2 space-y-1">
                        {filteredProviderAgents.map((agent) => (
                          <div
                            key={agent.id}
                            className={`p-3 rounded-md cursor-pointer transition-colors ${
                              selectedProviderAgent === agent.id
                                ? "bg-primary/10 border border-primary"
                                : "hover:bg-muted"
                            }`}
                            onClick={() => setSelectedProviderAgent(agent.id)}
                          >
                            <div className="font-medium">{agent.name}</div>
                            {agent.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {agent.description}
                              </div>
                            )}
                          </div>
                        ))}
                        {filteredProviderAgents.length === 0 && (
                          <div className="p-4 text-center text-muted-foreground">
                            No agents match your search
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleConnectAgent}
              disabled={
                !selectedProvider || !selectedProviderAgent || isConnecting
              }
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Agent"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
