"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Loader2,
  Bot,
  Calendar,
  Search,
  AlertCircle,
  Sparkles,
  Edit,
  MessageSquare,
  Brain,
  Volume2,
  ArrowRight,
  Info,
  Wand2,
} from "lucide-react";
import { api } from "@/lib/api";

type Provider = "elevenlabs" | "retell" | "vapi" | "openai_realtime" | "custom" | "bolna" | "livekit" | "haptik";

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
  custom: "Custom Agent",
  bolna: "Bolna AI",
  livekit: "LiveKit",
  haptik: "Haptik",
};

const providerColors: Record<Provider, string> = {
  elevenlabs: "bg-slate-100 text-slate-800",
  retell: "bg-slate-100 text-slate-800",
  vapi: "bg-slate-100 text-slate-800",
  openai_realtime: "bg-slate-100 text-slate-800",
  custom: "bg-purple-100 text-purple-800",
  bolna: "bg-emerald-100 text-emerald-800",
  livekit: "bg-blue-100 text-blue-800",
  haptik: "bg-orange-100 text-orange-800",
};

// LLM Models available for custom agents
const LLM_MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", description: "Most capable, best for complex tasks" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", description: "Fast and cost-effective" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai", description: "Balanced performance" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", description: "Fastest, most economical" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "anthropic", description: "Excellent reasoning" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "anthropic", description: "Fast and efficient" },
];

// Voice options for TTS
const TTS_VOICES = [
  { id: "alloy", name: "Alloy", gender: "neutral", description: "Warm and engaging" },
  { id: "echo", name: "Echo", gender: "male", description: "Clear and professional" },
  { id: "fable", name: "Fable", gender: "neutral", description: "Expressive storyteller" },
  { id: "onyx", name: "Onyx", gender: "male", description: "Deep and authoritative" },
  { id: "nova", name: "Nova", gender: "female", description: "Friendly and natural" },
  { id: "shimmer", name: "Shimmer", gender: "female", description: "Soft and pleasant" },
];

interface CustomAgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  startingMessage: string;
  llmModel: string;
  llmProvider: string;
  temperature: number;
  maxTokens: number;
  voice: string;
  knowledgeBase: string;
  responseStyle: "concise" | "detailed" | "conversational";
  language: string;
  agentType: "chat" | "voice";
}

const defaultCustomConfig: CustomAgentConfig = {
  name: "",
  description: "",
  systemPrompt: "",
  startingMessage: "Hello! How can I help you today?",
  llmModel: "gpt-4o-mini",
  llmProvider: "openai",
  temperature: 0.7,
  maxTokens: 500,
  voice: "nova",
  knowledgeBase: "",
  responseStyle: "conversational",
  language: "en-US",
  agentType: "voice",
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

  // Custom agent modal state
  const [showCustomAgentModal, setShowCustomAgentModal] = useState(false);
  const [editingCustomAgent, setEditingCustomAgent] = useState<ConnectedAgent | null>(null);
  const [customConfig, setCustomConfig] = useState<CustomAgentConfig>(defaultCustomConfig);
  const [customActiveTab, setCustomActiveTab] = useState("basic");
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

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
          // De-duplicate agents by id to prevent React key errors
          const uniqueAgents = (data.agents || []).filter(
            (agent: ProviderAgent, index: number, self: ProviderAgent[]) =>
              index === self.findIndex((a) => a.id === agent.id)
          );
          setProviderAgents(uniqueAgents);
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

  // Custom agent handlers
  const openCreateCustomDialog = () => {
    setEditingCustomAgent(null);
    setCustomConfig(defaultCustomConfig);
    setCustomActiveTab("basic");
    setCustomError(null);
    setShowCustomAgentModal(true);
  };

  const openEditCustomDialog = (agent: ConnectedAgent) => {
    setEditingCustomAgent(agent);
    setCustomConfig(agent.config as unknown as CustomAgentConfig || defaultCustomConfig);
    setCustomActiveTab("basic");
    setCustomError(null);
    setShowCustomAgentModal(true);
  };

  const handleSaveCustomAgent = async () => {
    if (!customConfig.name.trim()) {
      setCustomError("Agent name is required");
      return;
    }
    if (!customConfig.systemPrompt.trim()) {
      setCustomError("System prompt is required");
      return;
    }

    setIsSavingCustom(true);
    setCustomError(null);

    try {
      const token = await getToken();
      const endpoint = editingCustomAgent 
        ? `${api.baseUrl}/api/custom-agents/${editingCustomAgent.id}`
        : `${api.baseUrl}/api/custom-agents`;
      
      const response = await fetch(endpoint, {
        method: editingCustomAgent ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customConfig),
      });

      if (response.ok) {
        const data = await response.json();
        if (editingCustomAgent) {
          // Update existing agent in list
          setConnectedAgents(connectedAgents.map(a => 
            a.id === editingCustomAgent.id ? data.agent : a
          ));
        } else {
          // Add new agent to list
          setConnectedAgents([data.agent, ...connectedAgents]);
        }
        setShowCustomAgentModal(false);
        setEditingCustomAgent(null);
        setCustomConfig(defaultCustomConfig);
      } else {
        const errorData = await response.json();
        setCustomError(errorData.error || "Failed to save agent");
      }
    } catch (error) {
      console.error("Error saving custom agent:", error);
      setCustomError("Failed to save agent");
    } finally {
      setIsSavingCustom(false);
    }
  };

  // Auto-generate system prompt based on basic info
  const autoGeneratePrompt = async () => {
    if (!customConfig.name.trim()) {
      setCustomError("Please enter an agent name first");
      return;
    }

    setIsGeneratingPrompt(true);
    setCustomError(null);

    try {
      const token = await getToken();
      const response = await fetch(`${api.baseUrl}/api/custom-agents/generate-prompt`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: customConfig.name,
          description: customConfig.description,
          agentType: customConfig.agentType,
          responseStyle: customConfig.responseStyle,
          language: customConfig.language,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCustomConfig({
          ...customConfig,
          systemPrompt: data.prompt,
          startingMessage: data.startingMessage || customConfig.startingMessage,
        });
      } else {
        // Fallback to template-based generation if API fails
        const generatedPrompt = generateTemplatePrompt();
        setCustomConfig({
          ...customConfig,
          systemPrompt: generatedPrompt.prompt,
          startingMessage: generatedPrompt.startingMessage,
        });
      }
    } catch (error) {
      // Fallback to template-based generation
      const generatedPrompt = generateTemplatePrompt();
      setCustomConfig({
        ...customConfig,
        systemPrompt: generatedPrompt.prompt,
        startingMessage: generatedPrompt.startingMessage,
      });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Template-based prompt generation fallback
  const generateTemplatePrompt = () => {
    const agentTypeText = customConfig.agentType === "voice" ? "voice-based" : "text-based chat";
    const styleGuide = {
      concise: "Keep responses brief and to the point. Avoid unnecessary elaboration.",
      detailed: "Provide comprehensive and thorough responses with full explanations.",
      conversational: "Maintain a natural, friendly conversational tone throughout interactions.",
    };

    const prompt = `You are ${customConfig.name}, a professional ${agentTypeText} assistant.${customConfig.description ? `\n\nRole: ${customConfig.description}` : ""}

## Communication Style
- ${styleGuide[customConfig.responseStyle]}
- Language: ${customConfig.language === "en-US" ? "English (US)" : customConfig.language}
${customConfig.agentType === "voice" ? "- Speak naturally as this is a voice conversation. Use conversational language and avoid text-specific formatting like bullet points or markdown.\n- Keep responses concise for natural speech flow." : "- You may use formatting like bullet points when helpful for clarity."}

## Guidelines
1. Be helpful, accurate, and professional
2. If you don't know something, admit it honestly
3. Stay focused on your role and expertise
4. Be respectful and patient with users
${customConfig.agentType === "voice" ? "5. Confirm important information by repeating it back\n6. Use natural speech patterns and avoid jargon" : ""}`;

    const startingMessage = customConfig.agentType === "voice" 
      ? `Hello! This is ${customConfig.name}. How can I help you today?`
      : `Hi there! I'm ${customConfig.name}. How can I assist you?`;

    return { prompt, startingMessage };
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCreateCustomDialog}>
            <Sparkles className="mr-2 h-4 w-4" />
            Create Custom Agent
          </Button>
          <Button onClick={handleOpenModal}>
            <Plus className="mr-2 h-4 w-4" />
            Connect Agent
          </Button>
        </div>
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
              Add a voice agent from ElevenLabs, Retell, VAPI, OpenAI Realtime,
              or create a custom agent to begin testing.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={openCreateCustomDialog}>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Custom Agent
              </Button>
              <Button onClick={handleOpenModal}>
                <Plus className="mr-2 h-4 w-4" />
                Connect Agent
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connectedAgents.map((agent) => (
            <Card
              key={agent.id}
              className="cursor-pointer hover:shadow-md transition-shadow relative group"
              onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
            >
              {/* Edit button for custom agents */}
              {agent.provider === "custom" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditCustomDialog(agent);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
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
                <div className="flex items-center gap-2 p-4 bg-slate-100 rounded-lg text-slate-700">
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
                        {filteredProviderAgents.map((agent, index) => (
                          <div
                            key={`${agent.id}-${index}`}
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

      {/* Create/Edit Custom Agent Dialog */}
      <Dialog open={showCustomAgentModal} onOpenChange={setShowCustomAgentModal}>
        <DialogContent className="!max-w-[80vw] !w-[80vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              {editingCustomAgent ? "Edit Custom Agent" : "Create Custom Agent"}
            </DialogTitle>
            <DialogDescription>
              Configure your custom voice agent for simulation testing. Perfect for testing agents without API access.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <Tabs value={customActiveTab} onValueChange={setCustomActiveTab} className="w-full">
              <div className="px-6 pt-4 border-b bg-muted/30">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic" className="gap-2">
                    <Bot className="h-4 w-4" />
                    Basic Info
                  </TabsTrigger>
                  <TabsTrigger value="prompt" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Prompt
                  </TabsTrigger>
                  <TabsTrigger value="model" className="gap-2">
                    <Brain className="h-4 w-4" />
                    LLM Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                {/* Basic Info Tab */}
                <TabsContent value="basic" className="mt-0 space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Agent Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Customer Support Agent"
                        value={customConfig.name}
                        onChange={(e) => setCustomConfig({ ...customConfig, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={customConfig.language}
                        onValueChange={(value) => setCustomConfig({ ...customConfig, language: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en-US">English (US)</SelectItem>
                          <SelectItem value="en-GB">English (UK)</SelectItem>
                          <SelectItem value="es-ES">Spanish</SelectItem>
                          <SelectItem value="fr-FR">French</SelectItem>
                          <SelectItem value="de-DE">German</SelectItem>
                          <SelectItem value="it-IT">Italian</SelectItem>
                          <SelectItem value="pt-BR">Portuguese (BR)</SelectItem>
                          <SelectItem value="ja-JP">Japanese</SelectItem>
                          <SelectItem value="ko-KR">Korean</SelectItem>
                          <SelectItem value="zh-CN">Chinese (Simplified)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this agent does..."
                      value={customConfig.description}
                      onChange={(e) => setCustomConfig({ ...customConfig, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="responseStyle">Response Style</Label>
                      <Select
                        value={customConfig.responseStyle}
                        onValueChange={(value: "concise" | "detailed" | "conversational") => 
                          setCustomConfig({ ...customConfig, responseStyle: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="concise">Concise - Short, direct responses</SelectItem>
                          <SelectItem value="detailed">Detailed - Comprehensive explanations</SelectItem>
                          <SelectItem value="conversational">Conversational - Natural dialogue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agentType">Agent Type</Label>
                      <Select
                        value={customConfig.agentType}
                        onValueChange={(value: "chat" | "voice") => 
                          setCustomConfig({ ...customConfig, agentType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chat">Chat Agent - Text-based conversations</SelectItem>
                          <SelectItem value="voice">Voice Agent - Voice-based conversations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Voice Selection - Only shown for Voice Agents */}
                  {customConfig.agentType === "voice" && (
                    <div className="space-y-4 pt-4 border-t">
                      <div>
                        <Label>Voice Selection</Label>
                        <p className="text-sm text-muted-foreground">
                          Choose a voice for text-to-speech when running voice-based simulations.
                        </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        {TTS_VOICES.map((voice) => (
                          <Card
                            key={voice.id}
                            className={`cursor-pointer transition-all ${
                              customConfig.voice === voice.id
                                ? "border-primary ring-2 ring-primary/20"
                                : "hover:border-muted-foreground/50"
                            }`}
                            onClick={() => setCustomConfig({ ...customConfig, voice: voice.id })}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                  <Volume2 className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{voice.name}</p>
                                  <p className="text-xs text-muted-foreground">{voice.description}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Prompt Tab */}
                <TabsContent value="prompt" className="mt-0 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="systemPrompt">System Prompt *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={autoGeneratePrompt}
                        disabled={isGeneratingPrompt}
                        className="gap-2"
                      >
                        {isGeneratingPrompt ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4" />
                        )}
                        Auto Generate
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The main instructions that define how the agent behaves. Copy from your voice agent platform or auto-generate based on basic info.
                    </p>
                    <Textarea
                      id="systemPrompt"
                      placeholder="You are a helpful customer service agent for Acme Corp..."
                      value={customConfig.systemPrompt}
                      onChange={(e) => setCustomConfig({ ...customConfig, systemPrompt: e.target.value })}
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startingMessage">Starting Message</Label>
                    <p className="text-sm text-muted-foreground">
                      The first message the agent says when a conversation starts.
                    </p>
                    <Textarea
                      id="startingMessage"
                      placeholder="Hello! How can I help you today?"
                      value={customConfig.startingMessage}
                      onChange={(e) => setCustomConfig({ ...customConfig, startingMessage: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="knowledgeBase">Knowledge Base (Optional)</Label>
                    <p className="text-sm text-muted-foreground">
                      Additional context or information the agent should know. FAQs, product details, etc.
                    </p>
                    <Textarea
                      id="knowledgeBase"
                      placeholder="FAQ: What are your business hours? We're open Mon-Fri 9am-5pm..."
                      value={customConfig.knowledgeBase}
                      onChange={(e) => setCustomConfig({ ...customConfig, knowledgeBase: e.target.value })}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                </TabsContent>

                {/* LLM Settings Tab */}
                <TabsContent value="model" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <Label>LLM Model</Label>
                    <div className="grid gap-3 md:grid-cols-2">
                      {LLM_MODELS.map((model) => (
                        <Card
                          key={model.id}
                          className={`cursor-pointer transition-all ${
                            customConfig.llmModel === model.id
                              ? "border-primary ring-2 ring-primary/20"
                              : "hover:border-muted-foreground/50"
                          }`}
                          onClick={() => setCustomConfig({ ...customConfig, llmModel: model.id, llmProvider: model.provider })}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{model.name}</p>
                                <p className="text-sm text-muted-foreground">{model.description}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {model.provider}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Temperature: {customConfig.temperature.toFixed(2)}</Label>
                        <p className="text-sm text-muted-foreground">
                          Controls randomness. Lower = more focused, higher = more creative.
                        </p>
                      </div>
                    </div>
                    <Slider
                      value={[customConfig.temperature]}
                      onValueChange={([value]) => setCustomConfig({ ...customConfig, temperature: value })}
                      min={0}
                      max={1}
                      step={0.05}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Focused (0)</span>
                      <span>Balanced (0.5)</span>
                      <span>Creative (1)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Response Tokens: {customConfig.maxTokens}</Label>
                    <p className="text-sm text-muted-foreground">
                      Maximum length of agent responses.
                    </p>
                    <Slider
                      value={[customConfig.maxTokens]}
                      onValueChange={([value]) => setCustomConfig({ ...customConfig, maxTokens: value })}
                      min={50}
                      max={2000}
                      step={50}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Short (50)</span>
                      <span>Medium (500)</span>
                      <span>Long (2000)</span>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {customError && (
            <div className="px-6 py-2 bg-destructive/10 border-t border-destructive/20">
              <p className="text-sm text-destructive">{customError}</p>
            </div>
          )}

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowCustomAgentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomAgent} disabled={isSavingCustom} className="gap-2">
              {isSavingCustom ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {editingCustomAgent ? "Save Changes" : "Create Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
