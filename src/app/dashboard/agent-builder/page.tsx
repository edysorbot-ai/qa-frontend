"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Bot,
  Plus,
  MessageSquare,
  Brain,
  Volume2,
  Sparkles,
  ArrowRight,
  Loader2,
  Trash2,
  Edit,
  Play,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

// LLM Models available
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
}

interface CustomAgent {
  id: string;
  name: string;
  description: string;
  config: CustomAgentConfig;
  status: string;
  created_at: string;
}

const defaultConfig: CustomAgentConfig = {
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
};

export default function AgentBuilderPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CustomAgent | null>(null);
  const [config, setConfig] = useState<CustomAgentConfig>(defaultConfig);
  const [activeTab, setActiveTab] = useState("basic");
  const [error, setError] = useState<string | null>(null);

  const fetchCustomAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${api.baseUrl}/api/custom-agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomAgents(data.agents || []);
      }
    } catch (error) {
      console.error("Error fetching custom agents:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  // Fetch existing custom agents
  useEffect(() => {
    fetchCustomAgents();
  }, [fetchCustomAgents]);

  const handleCreateAgent = async () => {
    if (!config.name.trim()) {
      setError("Agent name is required");
      return;
    }
    if (!config.systemPrompt.trim()) {
      setError("System prompt is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = await getToken();
      const endpoint = editingAgent 
        ? `${api.baseUrl}/api/custom-agents/${editingAgent.id}`
        : `${api.baseUrl}/api/custom-agents`;
      
      const response = await fetch(endpoint, {
        method: editingAgent ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateDialog(false);
        setEditingAgent(null);
        setConfig(defaultConfig);
        fetchCustomAgents();
        
        // Navigate to the agent page
        if (data.agent?.id) {
          router.push(`/dashboard/agents/${data.agent.id}`);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save agent");
      }
    } catch (error) {
      console.error("Error saving agent:", error);
      setError("Failed to save agent");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;

    try {
      const token = await getToken();
      const response = await fetch(`${api.baseUrl}/api/custom-agents/${agentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchCustomAgents();
      }
    } catch (error) {
      console.error("Error deleting agent:", error);
    }
  };

  const openEditDialog = (agent: CustomAgent) => {
    setEditingAgent(agent);
    setConfig(agent.config);
    setShowCreateDialog(true);
  };

  const openCreateDialog = () => {
    setEditingAgent(null);
    setConfig(defaultConfig);
    setShowCreateDialog(true);
  };

  return (
    <div className="flex-1 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            Agent Builder
          </h1>
          <p className="text-muted-foreground mt-2">
            Create custom voice agents for simulation testing. Perfect for testing agents without API access.
          </p>
        </div>
        <Button onClick={openCreateDialog} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Create Custom Agent
        </Button>
      </div>

      {/* Custom Agents Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : customAgents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Custom Agents Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Create your first custom agent to start testing voice agents without needing API access.
              Copy prompts from any platform and simulate conversations.
            </p>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {customAgents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Custom
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {agent.config?.llmModel || "gpt-4o-mini"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {agent.description || agent.config?.systemPrompt?.substring(0, 100) + "..."}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(agent)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteAgent(agent.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Agent Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="!max-w-[80vw] !w-[80vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              {editingAgent ? "Edit Custom Agent" : "Create Custom Agent"}
            </DialogTitle>
            <DialogDescription>
              Configure your custom voice agent for simulation testing
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-4 border-b bg-muted/30">
                <TabsList className="grid w-full grid-cols-4">
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
                  <TabsTrigger value="voice" className="gap-2">
                    <Volume2 className="h-4 w-4" />
                    Voice & TTS
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
                        value={config.name}
                        onChange={(e) => setConfig({ ...config, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={config.language}
                        onValueChange={(value) => setConfig({ ...config, language: value })}
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
                      value={config.description}
                      onChange={(e) => setConfig({ ...config, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responseStyle">Response Style</Label>
                    <Select
                      value={config.responseStyle}
                      onValueChange={(value: "concise" | "detailed" | "conversational") => 
                        setConfig({ ...config, responseStyle: value })
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
                </TabsContent>

                {/* Prompt Tab */}
                <TabsContent value="prompt" className="mt-0 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="systemPrompt">System Prompt *</Label>
                    <p className="text-sm text-muted-foreground">
                      The main instructions that define how the agent behaves. Copy from your voice agent platform.
                    </p>
                    <Textarea
                      id="systemPrompt"
                      placeholder="You are a helpful customer service agent for Acme Corp..."
                      value={config.systemPrompt}
                      onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
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
                      value={config.startingMessage}
                      onChange={(e) => setConfig({ ...config, startingMessage: e.target.value })}
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
                      value={config.knowledgeBase}
                      onChange={(e) => setConfig({ ...config, knowledgeBase: e.target.value })}
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
                            config.llmModel === model.id
                              ? "border-primary ring-2 ring-primary/20"
                              : "hover:border-muted-foreground/50"
                          }`}
                          onClick={() => setConfig({ ...config, llmModel: model.id, llmProvider: model.provider })}
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
                        <Label>Temperature: {config.temperature.toFixed(2)}</Label>
                        <p className="text-sm text-muted-foreground">
                          Controls randomness. Lower = more focused, higher = more creative.
                        </p>
                      </div>
                    </div>
                    <Slider
                      value={[config.temperature]}
                      onValueChange={([value]) => setConfig({ ...config, temperature: value })}
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
                    <Label>Max Response Tokens: {config.maxTokens}</Label>
                    <p className="text-sm text-muted-foreground">
                      Maximum length of agent responses.
                    </p>
                    <Slider
                      value={[config.maxTokens]}
                      onValueChange={([value]) => setConfig({ ...config, maxTokens: value })}
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

                {/* Voice Tab */}
                <TabsContent value="voice" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <Label>Voice Selection</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose a voice for text-to-speech when running voice-based simulations.
                    </p>
                    <div className="grid gap-3 md:grid-cols-3">
                      {TTS_VOICES.map((voice) => (
                        <Card
                          key={voice.id}
                          className={`cursor-pointer transition-all ${
                            config.voice === voice.id
                              ? "border-primary ring-2 ring-primary/20"
                              : "hover:border-muted-foreground/50"
                          }`}
                          onClick={() => setConfig({ ...config, voice: voice.id })}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <Volume2 className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="font-medium">{voice.name}</p>
                                <p className="text-xs text-muted-foreground">{voice.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Voice Testing Info
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Voice-based simulation uses our built-in TTS and STT services to generate 
                        realistic voice conversations. The agent speaks with the selected voice, 
                        and we transcribe responses to evaluate them against test cases.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {error && (
            <div className="px-6 py-2 bg-destructive/10 border-t border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAgent} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {editingAgent ? "Save Changes" : "Create Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
