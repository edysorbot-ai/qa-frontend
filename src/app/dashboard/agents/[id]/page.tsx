"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Bot,
  Settings,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Trash2,
  History,
  TestTube2,
  Sparkles,
  Plus,
  Play,
  Clock,
  BarChart3,
  GitCompare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import Link from "next/link";

type Provider = "elevenlabs" | "retell" | "vapi" | "openai_realtime";

interface AgentDetails {
  id: string;
  name: string;
  provider: Provider;
  external_agent_id: string;
  integration_id: string;
  config: Record<string, any>;
  prompt?: string;
  intents: string[];
  status: "active" | "inactive" | "error";
  created_at: string;
  updated_at: string;
  test_count?: number;
  last_run?: string;
}

interface PromptAnalysis {
  purpose: string;
  capabilities: string[];
  expectedBehaviors: string[];
  potentialIssues: PromptIssue[];
  strengths: string[];
  weaknesses: string[];
  overallScore: number;
}

interface PromptIssue {
  type: "warning" | "suggestion" | "improvement";
  area: string;
  description: string;
  recommendation: string;
  severity: "high" | "medium" | "low";
}

interface PromptVersion {
  id: string;
  agent_id: string;
  version_number: number;
  prompt: string;
  prompt_hash: string;
  created_at: string;
}

interface ConfigVersion {
  id: string;
  agent_id: string;
  version_number: number;
  config: Record<string, any>;
  config_hash: string;
  created_at: string;
}

interface TestCase {
  id: string;
  name: string;
  scenario: string;
  category: string;
  expectedOutcome: string;
  priority: "high" | "medium" | "low";
}

interface TestRun {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  created_at: string;
  completed_at?: string;
  config?: Record<string, any>;
}

interface AgentAnalysisResult {
  purpose: string;
  capabilities: string[];
  expectedBehaviors: string[];
  configs: Record<string, any>;
}

const providerNames: Record<Provider, string> = {
  elevenlabs: "ElevenLabs",
  retell: "Retell",
  vapi: "VAPI",
  openai_realtime: "OpenAI Realtime",
};

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

const categoryColors: Record<string, string> = {
  "Happy Path": "bg-green-100 text-green-800",
  "Edge Case": "bg-orange-100 text-orange-800",
  "Error Handling": "bg-red-100 text-red-800",
  "Boundary Testing": "bg-purple-100 text-purple-800",
  "Conversation Flow": "bg-blue-100 text-blue-800",
  "Tool/Function Testing": "bg-cyan-100 text-cyan-800",
  "Off-Topic": "bg-gray-100 text-gray-800",
  "General": "bg-slate-100 text-slate-800",
  "Custom": "bg-pink-100 text-pink-800",
};

const providerColors: Record<Provider, string> = {
  elevenlabs: "bg-purple-100 text-purple-800",
  retell: "bg-blue-100 text-blue-800",
  vapi: "bg-green-100 text-green-800",
  openai_realtime: "bg-orange-100 text-orange-800",
};

const severityColors: Record<string, string> = {
  high: "border-red-300 bg-red-50",
  medium: "border-yellow-300 bg-yellow-50",
  low: "border-blue-300 bg-blue-50",
};

const severityIcons: Record<string, React.ReactNode> = {
  high: <AlertCircle className="h-4 w-4 text-red-500" />,
  medium: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  low: <Lightbulb className="h-4 w-4 text-blue-500" />,
};

export default function AgentDetailPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  // State
  const [mounted, setMounted] = useState(false);
  const [configAccordionValue, setConfigAccordionValue] = useState<string>("config-current");
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [promptAnalysis, setPromptAnalysis] = useState<PromptAnalysis | null>(null);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [configVersions, setConfigVersions] = useState<ConfigVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test Cases State
  const [savedTestCases, setSavedTestCases] = useState<TestCase[]>([]);
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  
  // Test Runs State
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());
  
  // Add test case form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [newTestCase, setNewTestCase] = useState({
    name: "",
    scenario: "",
    category: "",
    expectedOutcome: "",
    priority: "medium" as "high" | "medium" | "low",
  });

  // Get unique categories from existing test cases
  const existingCategories = [...new Set(savedTestCases.map(tc => tc.category))].filter(Boolean);

  // Fix hydration mismatch with Radix UI components
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch agent details
  const fetchAgent = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(api.endpoints.agents.get(agentId), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const agentData = data.agent;
        
        // Set prompt versions if returned from API
        if (data.promptVersions) {
          setPromptVersions(data.promptVersions);
        }
        
        // Set config versions if returned from API
        if (data.configVersions) {
          setConfigVersions(data.configVersions);
        }
        
        // Try to extract prompt from various locations if not directly stored
        let prompt = agentData.prompt;
        if (!prompt && agentData.config) {
          prompt = agentData.config.description || 
                   agentData.config.prompt || 
                   agentData.config.system_prompt ||
                   agentData.config.agent_prompt ||
                   agentData.config.metadata?.prompt ||
                   "";
        }
        
        // Update agent with extracted prompt
        const updatedAgent = { ...agentData, prompt };
        setAgent(updatedAgent);

        // If we have a prompt, analyze it
        if (prompt) {
          analyzePrompt(prompt, agentData.config);
        }
        
        // Check for prompt/config updates from provider
        checkForUpdates(token);
      } else {
        setError("Failed to fetch agent details");
      }
    } catch (error) {
      console.error("Error fetching agent:", error);
      setError("Failed to fetch agent details");
    } finally {
      setIsLoading(false);
    }
  }, [agentId, getToken]);

  // Fetch versions separately (used after refresh)
  const fetchVersions = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      // Fetch prompt versions
      const promptResponse = await fetch(`${api.endpoints.agents.get(agentId)}/prompt-versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (promptResponse.ok) {
        const data = await promptResponse.json();
        setPromptVersions(data.versions || []);
      }

      // Fetch config versions
      const configResponse = await fetch(`${api.endpoints.agents.get(agentId)}/config-versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (configResponse.ok) {
        const data = await configResponse.json();
        setConfigVersions(data.versions || []);
      }
    } catch (error) {
      console.error("Error fetching versions:", error);
    }
  }, [agentId, getToken]);

  // Fetch saved test cases for this agent
  const fetchTestCases = useCallback(async () => {
    try {
      setIsLoadingTests(true);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(api.endpoints.agents.testCases(agentId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const cases = (data.testCases || []).map((tc: any) => ({
          id: tc.id,
          name: tc.name,
          scenario: tc.scenario,
          category: tc.category || 'General',
          expectedOutcome: tc.expected_behavior || '',
          priority: tc.priority || 'medium',
        }));
        setSavedTestCases(cases);
      }
    } catch (error) {
      console.error("Error fetching test cases:", error);
    } finally {
      setIsLoadingTests(false);
    }
  }, [agentId, getToken]);

  // Fetch test runs for this agent
  const fetchTestRuns = useCallback(async () => {
    try {
      setIsLoadingRuns(true);
      const token = await getToken();
      if (!token) return;

      console.log('[fetchTestRuns] Fetching for agent:', agentId);
      const response = await fetch(api.endpoints.testRuns.byAgent(agentId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[fetchTestRuns] Response:', data);
        setTestRuns(data.testRuns || []);
      } else {
        console.error('[fetchTestRuns] Error response:', response.status);
      }
    } catch (error) {
      console.error("Error fetching test runs:", error);
    } finally {
      setIsLoadingRuns(false);
    }
  }, [agentId, getToken]);

  // Handle test run selection for comparison
  const handleRunSelectionChange = (runId: string, checked: boolean) => {
    setSelectedRunIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(runId);
      } else {
        newSet.delete(runId);
      }
      return newSet;
    });
  };

  // Navigate to comparison page
  const handleCompareRuns = () => {
    if (selectedRunIds.size < 2) return;
    const ids = Array.from(selectedRunIds).join(',');
    router.push(`/dashboard/test-runs/compare?ids=${ids}`);
  };

  // Generate test cases using AI (auto-saved by backend)
  const handleGenerateTestCases = async () => {
    if (!agent) return;

    setIsGeneratingTests(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(api.endpoints.agents.generateTestCases(agentId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        // Test cases are auto-saved by backend, so add them to savedTestCases
        const newSavedCases = (data.testCases || []).map((tc: any) => ({
          id: tc.id,
          name: tc.name,
          scenario: tc.scenario,
          category: tc.category || 'General',
          expectedOutcome: tc.expected_behavior || '',
          priority: tc.priority || 'medium',
        }));
        setSavedTestCases([...savedTestCases, ...newSavedCases]);
      } else {
        const errorData = await response.json();
        setError(errorData.message || errorData.error || "Failed to generate test cases");
      }
    } catch (error) {
      console.error("Error generating test cases:", error);
      setError("Failed to generate test cases");
    } finally {
      setIsGeneratingTests(false);
    }
  };

  // Add new test case manually (saves to database via API)
  const handleAddTestCase = async () => {
    if (!newTestCase.name || !newTestCase.scenario) return;
    if (!newTestCase.category && !customCategory) return;

    const finalCategory = newTestCase.category === "__custom__" 
      ? customCategory 
      : newTestCase.category || "Custom";

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(api.endpoints.agents.testCases(agentId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testCases: [{
            name: newTestCase.name,
            scenario: newTestCase.scenario,
            category: finalCategory,
            expectedOutcome: newTestCase.expectedOutcome,
            priority: newTestCase.priority,
          }]
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newCases = (data.testCases || []).map((tc: any) => ({
          id: tc.id,
          name: tc.name,
          scenario: tc.scenario,
          category: tc.category || 'General',
          expectedOutcome: tc.expected_behavior || '',
          priority: tc.priority || 'medium',
        }));
        setSavedTestCases([...savedTestCases, ...newCases]);
      } else {
        const errorData = await response.json();
        setError(errorData.message || errorData.error || "Failed to add test case");
      }
    } catch (error) {
      console.error("Error adding test case:", error);
      setError("Failed to add test case");
    }

    setNewTestCase({
      name: "",
      scenario: "",
      category: "",
      expectedOutcome: "",
      priority: "medium",
    });
    setCustomCategory("");
    setShowAddForm(false);
  };

  // Check if prompt or config has been updated in the provider
  const checkForUpdates = async (token: string) => {
    try {
      setIsCheckingUpdate(true);
      const response = await fetch(`${api.endpoints.agents.get(agentId)}/check-prompt`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.changed) {
          // Update prompt versions if changed
          if (data.promptVersions) {
            setPromptVersions(data.promptVersions);
          }
          // Update config versions if changed
          if (data.configVersions) {
            setConfigVersions(data.configVersions);
          }
          // Update agent state
          if (data.currentPrompt || data.currentConfig) {
            setAgent((prev) => prev ? { 
              ...prev, 
              prompt: data.currentPrompt || prev.prompt,
              config: data.currentConfig || prev.config
            } : null);
            if (data.currentPrompt) {
              analyzePrompt(data.currentPrompt, data.currentConfig || agent?.config || {});
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  useEffect(() => {
    fetchAgent();
    fetchTestCases();
    fetchTestRuns();
  }, [fetchAgent, fetchTestCases, fetchTestRuns]);

  // Analyze the prompt
  const analyzePrompt = (prompt: string, config: Record<string, any>) => {
    setIsAnalyzing(true);

    // Perform local analysis of the prompt
    const analysis: PromptAnalysis = {
      purpose: extractPurpose(prompt),
      capabilities: extractCapabilities(prompt, config),
      expectedBehaviors: extractExpectedBehaviors(prompt),
      potentialIssues: analyzePromptIssues(prompt, config),
      strengths: extractStrengths(prompt),
      weaknesses: extractWeaknesses(prompt),
      overallScore: calculatePromptScore(prompt, config),
    };

    setPromptAnalysis(analysis);
    setIsAnalyzing(false);
  };

  // Extract purpose from prompt
  const extractPurpose = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes("assistant") && lowerPrompt.includes("help")) {
      return "Customer assistance and support";
    }
    if (lowerPrompt.includes("booking") || lowerPrompt.includes("schedule") || lowerPrompt.includes("appointment")) {
      return "Appointment scheduling and booking management";
    }
    if (lowerPrompt.includes("sales") || lowerPrompt.includes("sell") || lowerPrompt.includes("product")) {
      return "Sales and product information";
    }
    if (lowerPrompt.includes("support") || lowerPrompt.includes("troubleshoot") || lowerPrompt.includes("issue")) {
      return "Technical support and troubleshooting";
    }
    if (lowerPrompt.includes("information") || lowerPrompt.includes("answer") || lowerPrompt.includes("questions")) {
      return "Information and FAQ handling";
    }

    return "General voice assistant";
  };

  // Extract capabilities from prompt and config
  const extractCapabilities = (prompt: string, config: Record<string, any>): string[] => {
    const capabilities: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes("book") || lowerPrompt.includes("schedule") || lowerPrompt.includes("appointment")) {
      capabilities.push("Appointment booking");
    }
    if (lowerPrompt.includes("transfer") || lowerPrompt.includes("connect") || lowerPrompt.includes("agent")) {
      capabilities.push("Call transfer to human agent");
    }
    if (lowerPrompt.includes("cancel") || lowerPrompt.includes("reschedule")) {
      capabilities.push("Cancellation and rescheduling");
    }
    if (lowerPrompt.includes("answer") || lowerPrompt.includes("question") || lowerPrompt.includes("help")) {
      capabilities.push("Answer questions");
    }
    if (lowerPrompt.includes("collect") || lowerPrompt.includes("information") || lowerPrompt.includes("details")) {
      capabilities.push("Collect user information");
    }
    if (config.functions || config.tools) {
      capabilities.push("Custom function/tool execution");
    }
    if (config.endCallFunctions || lowerPrompt.includes("end call") || lowerPrompt.includes("goodbye")) {
      capabilities.push("End call appropriately");
    }

    return capabilities.length > 0 ? capabilities : ["General conversation handling"];
  };

  // Extract expected behaviors from prompt
  const extractExpectedBehaviors = (prompt: string): string[] => {
    const behaviors: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes("polite") || lowerPrompt.includes("friendly") || lowerPrompt.includes("professional")) {
      behaviors.push("Maintain professional and friendly tone");
    }
    if (lowerPrompt.includes("concise") || lowerPrompt.includes("brief") || lowerPrompt.includes("short")) {
      behaviors.push("Keep responses concise");
    }
    if (lowerPrompt.includes("clarify") || lowerPrompt.includes("confirm")) {
      behaviors.push("Ask clarifying questions when needed");
    }
    if (lowerPrompt.includes("don't") || lowerPrompt.includes("never") || lowerPrompt.includes("avoid")) {
      behaviors.push("Follow specific restrictions");
    }
    if (lowerPrompt.includes("empathy") || lowerPrompt.includes("understand")) {
      behaviors.push("Show empathy and understanding");
    }

    return behaviors.length > 0 ? behaviors : ["Follow general conversation best practices"];
  };

  // Analyze prompt for potential issues
  const analyzePromptIssues = (prompt: string, config: Record<string, any>): PromptIssue[] => {
    const issues: PromptIssue[] = [];
    const words = prompt.split(/\s+/).length;

    // Check prompt length
    if (words < 50) {
      issues.push({
        type: "warning",
        area: "Prompt Length",
        description: "The prompt is quite short, which may lead to inconsistent agent behavior.",
        recommendation: "Add more detailed instructions about tone, handling edge cases, and specific response formats.",
        severity: "medium",
      });
    }

    if (words > 2000) {
      issues.push({
        type: "suggestion",
        area: "Prompt Length",
        description: "The prompt is very long, which may cause the agent to lose focus on key instructions.",
        recommendation: "Consider prioritizing the most important instructions at the beginning and end of the prompt.",
        severity: "low",
      });
    }

    // Check for error handling
    const lowerPrompt = prompt.toLowerCase();
    if (!lowerPrompt.includes("error") && !lowerPrompt.includes("don't understand") && !lowerPrompt.includes("clarify")) {
      issues.push({
        type: "improvement",
        area: "Error Handling",
        description: "No explicit error handling or clarification instructions found.",
        recommendation: "Add instructions for how the agent should handle misunderstandings or unclear user inputs.",
        severity: "medium",
      });
    }

    // Check for fallback behavior
    if (!lowerPrompt.includes("don't know") && !lowerPrompt.includes("cannot") && !lowerPrompt.includes("unable")) {
      issues.push({
        type: "suggestion",
        area: "Fallback Behavior",
        description: "No fallback behavior specified for out-of-scope requests.",
        recommendation: "Define what the agent should do when it can't help with a request.",
        severity: "low",
      });
    }

    // Check for tone/personality
    if (!lowerPrompt.includes("tone") && !lowerPrompt.includes("personality") && !lowerPrompt.includes("manner")) {
      issues.push({
        type: "suggestion",
        area: "Personality",
        description: "No explicit personality or tone instructions found.",
        recommendation: "Define the agent's personality traits and communication style for consistent interactions.",
        severity: "low",
      });
    }

    // Check for boundary setting
    if (!lowerPrompt.includes("never") && !lowerPrompt.includes("don't") && !lowerPrompt.includes("avoid")) {
      issues.push({
        type: "warning",
        area: "Boundaries",
        description: "No explicit boundaries or restrictions defined.",
        recommendation: "Add clear instructions about what the agent should NOT do or discuss.",
        severity: "high",
      });
    }

    // Check config for missing important settings
    if (!config.voice && !config.voiceId) {
      issues.push({
        type: "suggestion",
        area: "Voice Configuration",
        description: "No specific voice configured.",
        recommendation: "Consider selecting a voice that matches your brand personality.",
        severity: "low",
      });
    }

    return issues;
  };

  // Extract strengths from prompt
  const extractStrengths = (prompt: string): string[] => {
    const strengths: string[] = [];
    const lowerPrompt = prompt.toLowerCase();
    const words = prompt.split(/\s+/).length;

    if (words >= 100 && words <= 500) {
      strengths.push("Well-balanced prompt length");
    }
    if (lowerPrompt.includes("example") || lowerPrompt.includes("for instance")) {
      strengths.push("Includes examples for clarity");
    }
    if (lowerPrompt.includes("step") || lowerPrompt.includes("first") || lowerPrompt.includes("then")) {
      strengths.push("Structured instructions");
    }
    if (lowerPrompt.includes("if") && (lowerPrompt.includes("then") || lowerPrompt.includes(","))) {
      strengths.push("Conditional logic for different scenarios");
    }
    if (lowerPrompt.includes("always") || lowerPrompt.includes("must")) {
      strengths.push("Clear mandatory behaviors defined");
    }

    return strengths;
  };

  // Extract weaknesses from prompt
  const extractWeaknesses = (prompt: string): string[] => {
    const weaknesses: string[] = [];
    const lowerPrompt = prompt.toLowerCase();
    const words = prompt.split(/\s+/).length;

    if (words < 50) {
      weaknesses.push("Prompt too short for complex behaviors");
    }
    if (!lowerPrompt.includes("error") && !lowerPrompt.includes("fail")) {
      weaknesses.push("Missing error handling instructions");
    }
    if (!lowerPrompt.includes("end") && !lowerPrompt.includes("goodbye") && !lowerPrompt.includes("finish")) {
      weaknesses.push("No clear call ending guidance");
    }

    return weaknesses;
  };

  // Calculate overall prompt score
  const calculatePromptScore = (prompt: string, config: Record<string, any>): number => {
    let score = 50; // Base score
    const lowerPrompt = prompt.toLowerCase();
    const words = prompt.split(/\s+/).length;

    // Length score
    if (words >= 100 && words <= 500) score += 15;
    else if (words >= 50 && words <= 1000) score += 10;
    else if (words < 50) score -= 10;

    // Structure score
    if (lowerPrompt.includes("example")) score += 5;
    if (lowerPrompt.includes("step") || lowerPrompt.includes("first")) score += 5;
    if (lowerPrompt.includes("if")) score += 5;

    // Error handling score
    if (lowerPrompt.includes("error") || lowerPrompt.includes("clarify")) score += 10;
    if (lowerPrompt.includes("don't understand")) score += 5;

    // Boundaries score
    if (lowerPrompt.includes("never") || lowerPrompt.includes("don't") || lowerPrompt.includes("avoid")) score += 10;

    // Personality score
    if (lowerPrompt.includes("tone") || lowerPrompt.includes("personality") || lowerPrompt.includes("friendly")) score += 5;

    // Config score
    if (config.voice || config.voiceId) score += 5;
    if (config.functions || config.tools) score += 5;

    return Math.min(100, Math.max(0, score));
  };

  // Helper to render a config field nicely
  const renderConfigField = (label: string, value: any) => {
    if (value === undefined || value === null || value === "") return null;
    
    return (
      <div key={label} className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground capitalize">{label}</p>
        <p className="text-sm">
          {typeof value === "boolean" ? (
            <Badge variant={value ? "default" : "secondary"}>
              {value ? "Yes" : "No"}
            </Badge>
          ) : (
            String(value)
          )}
        </p>
      </div>
    );
  };

  // Refresh agent data from provider
  const handleRefresh = async () => {
    if (!agent) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) return;

      // Fetch fresh agent details from provider
      const response = await fetch(
        api.endpoints.integrations.agent(agent.integration_id, agent.external_agent_id || agent.id),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const fetchedAgent = data.agent;
        
        // Store the full agent data as config
        const newConfig = fetchedAgent || {};
        
        // Extract prompt based on provider format
        const newPrompt = fetchedAgent?.description || 
                          fetchedAgent?.prompt || 
                          fetchedAgent?.system_prompt || 
                          fetchedAgent?.agent_prompt ||
                          fetchedAgent?.metadata?.prompt ||
                          "";

        // Update agent in database
        const updateResponse = await fetch(api.endpoints.agents.update(agentId), {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            config: newConfig,
            prompt: newPrompt,
          }),
        });

        if (updateResponse.ok) {
          const updatedData = await updateResponse.json();
          // Also try to extract prompt from the updated config
          let finalPrompt = updatedData.agent.prompt;
          if (!finalPrompt && updatedData.agent.config) {
            finalPrompt = updatedData.agent.config.description || 
                          updatedData.agent.config.prompt || 
                          "";
          }
          const finalAgent = { ...updatedData.agent, prompt: finalPrompt };
          setAgent(finalAgent);
          if (finalPrompt) {
            analyzePrompt(finalPrompt, newConfig);
          }
          
          // Re-fetch versions to get updated data including any new versions
          await fetchVersions();
        }
      } else {
        setError("Failed to refresh agent data from provider");
      }
    } catch (error) {
      console.error("Error refreshing agent:", error);
      setError("Failed to refresh agent data");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Delete agent
  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(api.endpoints.agents.delete(agentId), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        router.push("/dashboard/agents");
      } else {
        setError("Failed to delete agent");
      }
    } catch (error) {
      console.error("Error deleting agent:", error);
      setError("Failed to delete agent");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/agents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Agent not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/agents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={providerColors[agent.provider]}>
                  {providerNames[agent.provider]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Connected {formatDate(agent.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">
            <Settings className="mr-2 h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="prompt">
            <FileText className="mr-2 h-4 w-4" />
            Prompt Analysis
          </TabsTrigger>
          <TabsTrigger value="testcases">
            <TestTube2 className="mr-2 h-4 w-4" />
            Test Cases
          </TabsTrigger>
          <TabsTrigger value="testruns">
            <Play className="mr-2 h-4 w-4" />
            Previous Test Runs
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Agent Configuration</CardTitle>
                  <CardDescription>
                    Current settings and configuration for this agent
                  </CardDescription>
                </div>
                {configVersions.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <History className="h-3 w-3" />
                    {configVersions.length} version{configVersions.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(agent.config).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No configuration data available. Click Refresh to fetch from provider.
                </p>
              ) : mounted ? (
                <Accordion 
                  type="single" 
                  collapsible 
                  value={configAccordionValue} 
                  onValueChange={(val) => setConfigAccordionValue(val || "")}
                  className="w-full"
                >
                  {/* Current Configuration */}
                  <AccordionItem value="config-current">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Settings className="h-4 w-4 text-primary" />
                        <span className="font-medium">Configuration - Current Version</span>
                        {configVersions.length > 0 && (
                          <>
                            <Badge variant="outline" className="ml-2">
                              v{configVersions[0]?.version_number || 1}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(configVersions[0].created_at)}
                            </span>
                          </>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-6 pt-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {renderConfigField("Name", agent.config.name)}
                          {renderConfigField("Provider", agent.config.provider)}
                          {renderConfigField("Language", agent.config.language)}
                          {renderConfigField("Voice", agent.config.voice)}
                          {renderConfigField("Voice ID", agent.config.voice_id || agent.config.voiceId)}
                        </div>

                        {/* Metadata Section */}
                        {agent.config.metadata && typeof agent.config.metadata === "object" && (
                          <>
                            <Separator />
                            <div>
                              <h3 className="font-medium mb-3">Metadata</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(agent.config.metadata)
                                  .filter(([key, value]) => 
                                    value !== undefined && 
                                    value !== null && 
                                    value !== "" &&
                                    key !== "fullConfig" &&
                                    typeof value !== "object"
                                  )
                                  .map(([key, value]) => renderConfigField(
                                    key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim(),
                                    value
                                  ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Full Configuration JSON */}
                        <Separator />
                        <details className="group">
                          <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground">
                            View Full Configuration JSON
                          </summary>
                          <ScrollArea className="h-[300px] mt-3 border rounded-lg p-4 bg-muted/30">
                            <pre className="text-xs whitespace-pre-wrap font-mono">
                              {JSON.stringify(agent.config, null, 2)}
                            </pre>
                          </ScrollArea>
                        </details>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Historical Config Versions */}
                  {configVersions.slice(1).map((version) => (
                    <AccordionItem key={version.id} value={`config-${version.id}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Configuration - v{version.version_number}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(version.created_at)}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-6 pt-4">
                          {/* Basic Info from version */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderConfigField("Name", version.config.name)}
                            {renderConfigField("Provider", version.config.provider)}
                            {renderConfigField("Language", version.config.language)}
                            {renderConfigField("Voice", version.config.voice)}
                            {renderConfigField("Voice ID", version.config.voice_id || version.config.voiceId)}
                          </div>

                          {/* Metadata Section from version */}
                          {version.config.metadata && typeof version.config.metadata === "object" && (
                            <>
                              <Separator />
                              <div>
                                <h3 className="font-medium mb-3">Metadata</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {Object.entries(version.config.metadata as Record<string, any>)
                                    .filter(([key, value]) => 
                                      value !== undefined && 
                                      value !== null && 
                                      value !== "" &&
                                      key !== "fullConfig" &&
                                      typeof value !== "object"
                                    )
                                    .map(([key, value]) => renderConfigField(
                                      key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim(),
                                      value
                                    ))}
                                </div>
                              </div>
                            </>
                          )}

                          {/* Full Configuration JSON */}
                          <Separator />
                          <details className="group">
                            <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground">
                              View Full Configuration JSON
                            </summary>
                            <ScrollArea className="h-[300px] mt-3 border rounded-lg p-4 bg-muted/30">
                              <pre className="text-xs whitespace-pre-wrap font-mono">
                                {JSON.stringify(version.config, null, 2)}
                              </pre>
                            </ScrollArea>
                          </details>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="h-12 animate-pulse bg-muted rounded" />
              )}

              {configVersions.length === 0 && Object.keys(agent.config).length > 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 mt-4">
                  No version history yet. Configuration versions will be tracked when changes are detected from the provider.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompt Analysis Tab */}
        <TabsContent value="prompt" className="space-y-4">
          {!agent.prompt ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No prompt data available. Click Refresh to fetch from provider.
                </p>
                <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  Refresh Agent Data
                </Button>
              </CardContent>
            </Card>
          ) : isAnalyzing ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Analyzing prompt...</span>
            </div>
          ) : promptAnalysis ? (
            <>
              {/* Score Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Prompt Score</CardTitle>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-3xl font-bold ${
                          promptAnalysis.overallScore >= 80
                            ? "text-green-600"
                            : promptAnalysis.overallScore >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {promptAnalysis.overallScore}
                      </span>
                      <span className="text-muted-foreground">/100</span>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Analysis Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Purpose & Capabilities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Purpose & Capabilities</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        Detected Purpose
                      </h4>
                      <p className="text-sm">{promptAnalysis.purpose}</p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Capabilities
                      </h4>
                      <ul className="space-y-1">
                        {promptAnalysis.capabilities.map((cap, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Expected Behaviors
                      </h4>
                      <ul className="space-y-1">
                        {promptAnalysis.expectedBehaviors.map((behavior, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            • {behavior}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Strengths & Weaknesses */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Strengths & Weaknesses</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {promptAnalysis.strengths.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-600 mb-2">Strengths</h4>
                        <ul className="space-y-1">
                          {promptAnalysis.strengths.map((strength, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {promptAnalysis.weaknesses.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-medium text-red-600 mb-2">Weaknesses</h4>
                          <ul className="space-y-1">
                            {promptAnalysis.weaknesses.map((weakness, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm">
                                <AlertCircle className="h-3 w-3 text-red-500" />
                                {weakness}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Issues & Recommendations */}
              {promptAnalysis.potentialIssues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Issues & Recommendations</CardTitle>
                    <CardDescription>
                      Suggestions to improve your agent's prompt
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {promptAnalysis.potentialIssues.map((issue, i) => (
                        <div
                          key={i}
                          className={`p-4 rounded-lg border ${severityColors[issue.severity]}`}
                        >
                          <div className="flex items-start gap-3">
                            {severityIcons[issue.severity]}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{issue.area}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    issue.type === "warning"
                                      ? "border-orange-300 text-orange-700"
                                      : issue.type === "improvement"
                                      ? "border-blue-300 text-blue-700"
                                      : "border-gray-300 text-gray-700"
                                  }`}
                                >
                                  {issue.type}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {issue.description}
                              </p>
                              <div className="bg-background p-2 rounded text-sm">
                                <span className="font-medium">Recommendation: </span>
                                {issue.recommendation}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Prompt Versions Accordion */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">Prompt History</CardTitle>
                      {isCheckingUpdate && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {promptVersions.length > 0 && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <History className="h-3 w-3" />
                        {promptVersions.length} version{promptVersions.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    View current and historical versions of the agent's prompt
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mounted ? (
                    <Accordion type="single" collapsible className="w-full">
                      {/* Current Prompt */}
                      <AccordionItem value="current">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="font-medium">Prompt - Current Version</span>
                            {promptVersions.length > 0 && (
                              <>
                                <Badge variant="outline" className="ml-2">
                                  v{promptVersions[0]?.version_number || 1}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(promptVersions[0].created_at)}
                                </span>
                              </>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="border rounded-lg p-4 bg-muted/30 mt-2">
                            <pre className="text-sm whitespace-pre-wrap font-mono">{agent.prompt}</pre>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Historical Versions */}
                      {promptVersions.slice(1).map((version) => (
                        <AccordionItem key={version.id} value={version.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                              <History className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Prompt - v{version.version_number}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(version.created_at)}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="border rounded-lg p-4 bg-muted/30 mt-2">
                              <pre className="text-sm whitespace-pre-wrap font-mono">
                                {version.prompt}
                              </pre>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="h-12 animate-pulse bg-muted rounded" />
                  )}

                  {promptVersions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No version history yet. Prompt versions will be tracked when changes are detected from the provider.
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* Test Cases Tab */}
        <TabsContent value="testcases" className="space-y-4">
          {/* Generate Test Cases Card - Show when no saved test cases */}
          {savedTestCases.length === 0 && !isGeneratingTests && (
            <Card>
              <CardHeader>
                <CardTitle>Generate Test Cases</CardTitle>
                <CardDescription>
                  Use AI to automatically generate comprehensive test cases based on your agent&apos;s prompt and configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Sparkles className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-lg font-medium mb-2">AI-Powered Test Generation</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Our AI will analyze your agent&apos;s prompt and configuration to generate relevant test cases covering happy paths, edge cases, error handling, and more.
                  </p>
                  
                  <div className="w-full max-w-md space-y-4">
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleGenerateTestCases} 
                        disabled={isGeneratingTests || !agent?.prompt}
                        className="flex-1"
                      >
                        {isGeneratingTests ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Test Cases
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {!agent?.prompt && (
                      <p className="text-sm text-amber-600 text-center">
                        No prompt available. Click Refresh to fetch agent data from provider.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generating indicator */}
          {isGeneratingTests && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Loader2 className="h-12 w-12 text-primary mb-4 animate-spin" />
                  <h3 className="text-lg font-medium mb-2">Generating Test Cases...</h3>
                  <p className="text-muted-foreground">
                    AI is analyzing your agent and creating comprehensive test cases. This may take a moment.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Saved Test Cases */}
          {savedTestCases.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Test Cases</CardTitle>
                    <CardDescription>
                      {savedTestCases.length} test case{savedTestCases.length !== 1 ? "s" : ""} for this agent
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddForm(true)}
                      disabled={showAddForm}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Test Case
                    </Button>
                    <Button variant="outline" onClick={handleGenerateTestCases} disabled={isGeneratingTests}>
                      {isGeneratingTests ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Generate More
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Test Case Form */}
                {showAddForm && (
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-5 bg-primary/5 space-y-4">
                    <h3 className="font-semibold text-primary">Add New Test Case</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Name *</Label>
                        <Input
                          value={newTestCase.name}
                          onChange={(e) =>
                            setNewTestCase({ ...newTestCase, name: e.target.value })
                          }
                          placeholder="Test case name"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Category *</Label>
                        <Select
                          value={newTestCase.category}
                          onValueChange={(v) => {
                            setNewTestCase({ ...newTestCase, category: v });
                            if (v !== "__custom__") setCustomCategory("");
                          }}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {existingCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                            <SelectItem value="__custom__">
                              <span className="flex items-center gap-2">
                                <Plus className="h-3 w-3" />
                                Custom Category
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {newTestCase.category === "__custom__" && (
                          <Input
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            placeholder="Enter custom category name"
                            className="mt-2 bg-background"
                          />
                        )}
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-sm font-medium">Scenario *</Label>
                        <Input
                          value={newTestCase.scenario}
                          onChange={(e) =>
                            setNewTestCase({ ...newTestCase, scenario: e.target.value })
                          }
                          placeholder="Describe the test scenario..."
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Expected Outcome</Label>
                        <Input
                          value={newTestCase.expectedOutcome}
                          onChange={(e) =>
                            setNewTestCase({
                              ...newTestCase,
                              expectedOutcome: e.target.value,
                            })
                          }
                          placeholder="What should happen"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Priority</Label>
                        <Select
                          value={newTestCase.priority}
                          onValueChange={(v) =>
                            setNewTestCase({
                              ...newTestCase,
                              priority: v as "high" | "medium" | "low",
                            })
                          }
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleAddTestCase} disabled={!newTestCase.name || !newTestCase.scenario || (!newTestCase.category || (newTestCase.category === "__custom__" && !customCategory))}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Test Case
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setShowAddForm(false);
                        setNewTestCase({ name: "", scenario: "", category: "", expectedOutcome: "", priority: "medium" });
                        setCustomCategory("");
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {isLoadingTests ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full">
                      <thead className="bg-muted/70">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-44">
                            Category
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-56">
                            Test Case
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Scenario
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">
                            Priority
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(() => {
                          // Group test cases by category for rowspan display
                          const categoryGroups = new Map<string, TestCase[]>();
                          savedTestCases.forEach((tc) => {
                            const category = tc.category || "General";
                            const group = categoryGroups.get(category) || [];
                            group.push(tc);
                            categoryGroups.set(category, group);
                          });

                          const rows: React.ReactNode[] = [];
                          categoryGroups.forEach((cases, category) => {
                            cases.forEach((tc, idx) => {
                              rows.push(
                                <tr key={tc.id} className={`
                                  ${idx === 0 ? 'border-t-2 border-t-border' : ''} 
                                  hover:bg-muted/30 transition-colors
                                `}>
                                  {idx === 0 && (
                                    <td
                                      rowSpan={cases.length}
                                      className="px-4 py-3 align-top bg-muted/20 border-r border-border"
                                    >
                                      <div className="sticky top-0">
                                        <Badge className={`${categoryColors[category] || "bg-slate-100 text-slate-800"} font-medium`}>
                                          {category}
                                        </Badge>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          {cases.length} test case{cases.length !== 1 ? 's' : ''}
                                        </p>
                                      </div>
                                    </td>
                                  )}
                                  <td className="px-4 py-3">
                                    <span className="text-sm font-medium text-foreground">{tc.name}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="text-sm text-muted-foreground line-clamp-2" title={tc.scenario}>
                                      {tc.scenario}
                                    </p>
                                    {tc.expectedOutcome && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        <span className="font-medium">Expected: </span>
                                        {tc.expectedOutcome}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge
                                      variant="secondary"
                                      className={`${priorityColors[tc.priority]} text-xs font-medium`}
                                    >
                                      {tc.priority}
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            });
                          });
                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Previous Test Runs Tab */}
        <TabsContent value="testruns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Previous Test Runs</CardTitle>
                  <CardDescription>
                    View and compare test runs for this agent
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRunIds.size >= 2 && (
                    <Button onClick={handleCompareRuns} className="gap-2">
                      <GitCompare className="h-4 w-4" />
                      Compare {selectedRunIds.size} Runs
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/dashboard/test-runs/new?agent_id=${agentId}`)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Test Run
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingRuns ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : testRuns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Play className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Test Runs Yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Run your first test to see results here. Select test cases and execute a test run to evaluate your agent.
                  </p>
                  <Button onClick={() => router.push(`/dashboard/test-runs/new?agent_id=${agentId}`)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Test Run
                  </Button>
                </div>
              ) : (
                <>
                  {selectedRunIds.size > 0 && selectedRunIds.size < 2 && (
                    <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Select at least 2 test runs to compare
                    </div>
                  )}
                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full table-fixed">
                      <thead className="bg-muted/70">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-12">
                            <span className="sr-only">Select</span>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Test Run
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-48">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {testRuns.map((run) => {
                          const statusColors: Record<string, string> = {
                            completed: "bg-green-100 text-green-800",
                            running: "bg-blue-100 text-blue-800",
                            pending: "bg-yellow-100 text-yellow-800",
                            failed: "bg-red-100 text-red-800",
                            cancelled: "bg-gray-100 text-gray-800",
                          };
                          
                          return (
                            <tr 
                              key={run.id} 
                              className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                                selectedRunIds.has(run.id) ? 'bg-primary/5' : ''
                              }`}
                              onClick={() => router.push(`/dashboard/test-runs/${run.id}`)}
                            >
                              <td className="px-4 py-3 w-12" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedRunIds.has(run.id)}
                                  onCheckedChange={(checked) => handleRunSelectionChange(run.id, checked as boolean)}
                                  disabled={run.status !== 'completed'}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium truncate">{run.name || `Test Run #${run.id.slice(0, 8)}`}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 w-32">
                                <Badge className={statusColors[run.status] || "bg-gray-100 text-gray-800"}>
                                  {run.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 w-48 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 flex-shrink-0" />
                                  {new Date(run.created_at).toLocaleDateString()} {new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{agent.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
