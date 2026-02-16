"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Edit2,
  X,
  Check,
  Workflow,
  Database,
  Variable,
  BookOpen,
  FileQuestion,
  ExternalLink,
  Eye,
  Maximize2,
  Shield,
  Activity,
  Upload,
  Download,
  FileUp,
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
import { TestFlowTab, WorkflowExecutionPlan, TestCaseData as WorkflowTestCase } from "@/components/workflow";
import { ConsistencyTestPanel } from "@/components/consistency-test-panel";

type Provider = "elevenlabs" | "retell" | "vapi" | "openai_realtime" | "custom" | "bolna" | "livekit" | "haptik";

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
  test_mode?: 'voice' | 'chat' | 'auto';  // Testing mode - voice, chat, or auto-detect
}

interface DynamicVariable {
  name: string;
  pattern: string;
  source: string;
  defaultValue?: string;
  testValue?: string;
}

interface KnowledgeBaseItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  status?: string;
  url?: string;
  metadata?: {
    size_bytes?: number;
    [key: string]: any;
  };
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

interface DynamicVariable {
  name: string;
  pattern: string;
  source: string;
  defaultValue?: string;
  description?: string;
  testValue?: string; // User-provided test value
}

interface KnowledgeBaseItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  url?: string;
  status?: string;
  createdAt?: string;
  metadata?: {
    size_bytes?: number;
    [key: string]: any;
  };
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

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-teal-100 text-teal-800 dark:bg-[#0A2E2F] dark:text-teal-100",
  low: "bg-green-100 text-green-800",
};

const categoryColors: Record<string, string> = {
  "Happy Path": "bg-green-100 text-green-800",
  "Edge Case": "bg-teal-100 text-teal-800 dark:bg-[#0A2E2F] dark:text-teal-100",
  "Error Handling": "bg-red-100 text-red-800",
  "Boundary Testing": "bg-teal-100 text-teal-800 dark:bg-[#0A2E2F] dark:text-teal-100",
  "Conversation Flow": "bg-teal-100 text-teal-800 dark:bg-[#0A2E2F] dark:text-teal-100",
  "Tool/Function Testing": "bg-teal-100 text-teal-800 dark:bg-[#0A2E2F] dark:text-teal-100",
  "Off-Topic": "bg-gray-100 text-gray-800",
  "General": "bg-teal-100 text-teal-800 dark:bg-[#0A2E2F] dark:text-teal-100",
  "Custom": "bg-teal-100 text-teal-800 dark:bg-[#0A2E2F] dark:text-teal-100",
};

const providerColors: Record<Provider, string> = {
  elevenlabs: "bg-teal-100 text-teal-800 dark:bg-[#0A2E2F] dark:text-teal-100",
  retell: "bg-teal-100 text-teal-800 dark:bg-[#0A2E2F] dark:text-teal-100",
  vapi: "bg-teal-100 text-teal-800 dark:bg-[#0A2E2F] dark:text-teal-100",
  openai_realtime: "bg-teal-100 text-teal-800 dark:bg-[#0A2E2F] dark:text-teal-100",
  custom: "bg-purple-100 text-purple-800",
  bolna: "bg-emerald-100 text-emerald-800",
  livekit: "bg-blue-100 text-blue-800",
  haptik: "bg-orange-100 text-orange-800",
};

const severityColors: Record<string, string> = {
  high: "border-red-300 bg-red-50",
  medium: "border-slate-300 bg-slate-50",
  low: "border-slate-300 bg-slate-50",
};

const severityIcons: Record<string, React.ReactNode> = {
  high: <AlertCircle className="h-4 w-4 text-red-500" />,
  medium: <AlertTriangle className="h-4 w-4 text-slate-500" />,
  low: <Lightbulb className="h-4 w-4 text-slate-500" />,
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
  
  // Edit test case state
  const [editingTestCaseId, setEditingTestCaseId] = useState<string | null>(null);
  const [editTestCase, setEditTestCase] = useState({
    name: "",
    scenario: "",
    category: "",
    expectedOutcome: "",
    priority: "medium" as "high" | "medium" | "low",
  });

  // Generated test cases dialog state
  const [showGeneratedTestCasesDialog, setShowGeneratedTestCasesDialog] = useState(false);
  const [generatedTestCases, setGeneratedTestCases] = useState<TestCase[]>([]);
  const [selectedGeneratedTestCases, setSelectedGeneratedTestCases] = useState<Set<string>>(new Set());
  const [isAddingSelectedTestCases, setIsAddingSelectedTestCases] = useState(false);

  // CSV Import state
  const [showCSVImportDialog, setShowCSVImportDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ name: string; scenario: string; expected_behavior: string; category: string; priority: string }[]>([]);
  const [isImportingCSV, setIsImportingCSV] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Prompt comparison state
  const [selectedPromptVersions, setSelectedPromptVersions] = useState<string[]>([]);
  const [showPromptComparison, setShowPromptComparison] = useState(false);
  const comparisonSectionRef = useRef<HTMLDivElement>(null);

  // Dynamic Variables state
  const [dynamicVariables, setDynamicVariables] = useState<DynamicVariable[]>([]);
  const [isLoadingVariables, setIsLoadingVariables] = useState(false);
  const [isSavingVariables, setIsSavingVariables] = useState(false);
  const [showDynamicVariablesDialog, setShowDynamicVariablesDialog] = useState(false);

  // Knowledge Base state
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([]);
  const [isLoadingKnowledgeBase, setIsLoadingKnowledgeBase] = useState(false);

  // Document viewer state
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeBaseItem | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isLoadingDocumentContent, setIsLoadingDocumentContent] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);

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

  // Fetch dynamic variables for this agent
  const fetchDynamicVariables = useCallback(async () => {
    try {
      setIsLoadingVariables(true);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(api.endpoints.agents.dynamicVariables(agentId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Load saved values from localStorage
        let savedVars: Record<string, string> = {};
        try {
          const savedData = localStorage.getItem(`agent-${agentId}-variables`);
          if (savedData) {
            savedVars = JSON.parse(savedData);
          }
        } catch (e) {
          console.error("Error loading saved variables:", e);
        }
        
        // Add testValue field for user input, using saved values if available
        const varsWithTestValue = (data.variables || []).map((v: DynamicVariable) => ({
          ...v,
          testValue: savedVars[v.name] || v.defaultValue || '',
        }));
        setDynamicVariables(varsWithTestValue);
      }
    } catch (error) {
      console.error("Error fetching dynamic variables:", error);
    } finally {
      setIsLoadingVariables(false);
    }
  }, [agentId, getToken]);

  // Fetch knowledge base for this agent
  const fetchKnowledgeBase = useCallback(async () => {
    try {
      setIsLoadingKnowledgeBase(true);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(api.endpoints.agents.knowledgeBase(agentId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setKnowledgeBase(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
    } finally {
      setIsLoadingKnowledgeBase(false);
    }
  }, [agentId, getToken]);

  // Fetch knowledge base document content
  const fetchDocumentContent = useCallback(async (document: KnowledgeBaseItem) => {
    try {
      setSelectedDocument(document);
      setShowDocumentViewer(true);
      setIsLoadingDocumentContent(true);
      setDocumentContent('');
      
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        api.endpoints.agents.knowledgeBaseDocumentContent(agentId, document.id),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setDocumentContent(data.content || '');
      } else {
        const errorData = await response.json();
        setDocumentContent(`Error loading document: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error fetching document content:", error);
      setDocumentContent('Error loading document content');
    } finally {
      setIsLoadingDocumentContent(false);
    }
  }, [agentId, getToken]);

  // Handle test run selection for comparison (max 2)
  const handleRunSelectionChange = (runId: string, checked: boolean) => {
    setSelectedRunIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        // Limit to 2 selections max
        if (newSet.size >= 2) return prev;
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

  // Generate test cases using AI (shows dialog for selection)
  const handleGenerateTestCases = async () => {
    if (!agent) return;

    setIsGeneratingTests(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) return;

      // Call a preview endpoint that generates but doesn't save
      const response = await fetch(api.endpoints.agents.generateTestCases(agentId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preview: true }), // Request preview mode
      });

      if (response.ok) {
        const data = await response.json();
        // Store generated test cases for selection
        const generatedCases = (data.testCases || []).map((tc: any, index: number) => ({
          id: tc.id || `temp-${index}-${Date.now()}`, // Temp ID for selection
          name: tc.name,
          scenario: tc.scenario,
          category: tc.category || 'General',
          expectedOutcome: tc.expected_behavior || tc.expectedOutcome || '',
          priority: tc.priority || 'medium',
        }));
        setGeneratedTestCases(generatedCases);
        // Select all by default
        setSelectedGeneratedTestCases(new Set(generatedCases.map((tc: TestCase) => tc.id)));
        setShowGeneratedTestCasesDialog(true);
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

  // Handle selection toggle for generated test cases
  const handleGeneratedTestCaseSelection = (testCaseId: string, checked: boolean) => {
    setSelectedGeneratedTestCases(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(testCaseId);
      } else {
        newSet.delete(testCaseId);
      }
      return newSet;
    });
  };

  // Select/deselect all generated test cases
  const handleSelectAllGeneratedTestCases = (checked: boolean) => {
    if (checked) {
      setSelectedGeneratedTestCases(new Set(generatedTestCases.map(tc => tc.id)));
    } else {
      setSelectedGeneratedTestCases(new Set());
    }
  };

  // Add selected generated test cases to saved test cases
  const handleAddSelectedTestCases = async () => {
    if (selectedGeneratedTestCases.size === 0) return;

    setIsAddingSelectedTestCases(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) return;

      // Get only selected test cases
      const selectedCases = generatedTestCases.filter(tc => selectedGeneratedTestCases.has(tc.id));

      const response = await fetch(api.endpoints.agents.testCases(agentId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testCases: selectedCases.map(tc => ({
            name: tc.name,
            scenario: tc.scenario,
            category: tc.category,
            expectedOutcome: tc.expectedOutcome,
            priority: tc.priority,
          }))
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
        setShowGeneratedTestCasesDialog(false);
        setGeneratedTestCases([]);
        setSelectedGeneratedTestCases(new Set());
      } else {
        const errorData = await response.json();
        setError(errorData.message || errorData.error || "Failed to add test cases");
      }
    } catch (error) {
      console.error("Error adding test cases:", error);
      setError("Failed to add test cases");
    } finally {
      setIsAddingSelectedTestCases(false);
    }
  };

  // Add new test case manually (saves to database via API)
  const handleAddTestCase = async () => {
    if (!newTestCase.name || !newTestCase.scenario || !newTestCase.expectedOutcome) return;
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

  // CSV Import: handle file selection and preview
  const handleCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvError(null);
    setCsvPreview([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) {
          setCsvError("CSV file must have a header row and at least one data row.");
          return;
        }

        // Simple CSV parse for preview (handles quoted fields)
        const parseLine = (line: string): string[] => {
          const fields: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
              else inQuotes = !inQuotes;
            } else if (ch === "," && !inQuotes) {
              fields.push(current.trim());
              current = "";
            } else {
              current += ch;
            }
          }
          fields.push(current.trim());
          return fields;
        };

        const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "_"));
        if (!headers.includes("name") || !headers.includes("scenario")) {
          setCsvError('CSV must have at least "name" and "scenario" columns. Found: ' + headers.join(", "));
          return;
        }

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = parseLine(lines[i]);
          if (vals.every(v => !v)) continue;
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
          if (row.name && row.scenario) {
            rows.push({
              name: row.name,
              scenario: row.scenario,
              expected_behavior: row.expected_behavior || row.expected_outcome || "",
              category: row.category || "Imported",
              priority: row.priority || "medium",
            });
          }
        }

        if (rows.length === 0) {
          setCsvError("No valid test cases found in CSV. Each row needs at least name and scenario.");
          return;
        }
        setCsvPreview(rows);
      } catch {
        setCsvError("Failed to parse CSV file. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  // CSV Import: download template
  const handleDownloadCSVTemplate = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(api.endpoints.testCases.csvTemplate, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "test-cases-template.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading template:", error);
    }
  };

  // CSV Import: submit
  const handleImportCSV = async () => {
    if (!csvFile || csvPreview.length === 0) return;
    setIsImportingCSV(true);
    setCsvError(null);

    try {
      const token = await getToken();
      if (!token) return;

      const text = await csvFile.text();

      const response = await fetch(api.endpoints.testCases.importCSV, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
          csv_content: text,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newCases = (data.testCases || []).map((tc: any) => ({
          id: tc.id,
          name: tc.name,
          scenario: tc.scenario,
          category: tc.category || "Imported",
          expectedOutcome: tc.expected_behavior || "",
          priority: tc.priority || "medium",
        }));
        setSavedTestCases([...savedTestCases, ...newCases]);
        setShowCSVImportDialog(false);
        setCsvFile(null);
        setCsvPreview([]);
        if (csvFileInputRef.current) csvFileInputRef.current.value = "";
      } else {
        const errorData = await response.json();
        setCsvError(errorData.message || errorData.error || "Failed to import test cases");
      }
    } catch (error) {
      console.error("Error importing CSV:", error);
      setCsvError("Failed to import test cases");
    } finally {
      setIsImportingCSV(false);
    }
  };

  // Delete a test case
  const handleDeleteTestCase = async (testCaseId: string) => {
    if (!confirm("Are you sure you want to delete this test case?")) return;

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(api.endpoints.testCases.delete(testCaseId), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSavedTestCases(savedTestCases.filter(tc => tc.id !== testCaseId));
      } else {
        const errorData = await response.json();
        setError(errorData.message || errorData.error || "Failed to delete test case");
      }
    } catch (error) {
      console.error("Error deleting test case:", error);
      setError("Failed to delete test case");
    }
  };

  // Start editing a test case
  const handleStartEditTestCase = (tc: TestCase) => {
    setEditingTestCaseId(tc.id);
    setEditTestCase({
      name: tc.name,
      scenario: tc.scenario,
      category: tc.category,
      expectedOutcome: tc.expectedOutcome,
      priority: tc.priority,
    });
  };

  // Cancel editing
  const handleCancelEditTestCase = () => {
    setEditingTestCaseId(null);
    setEditTestCase({
      name: "",
      scenario: "",
      category: "",
      expectedOutcome: "",
      priority: "medium",
    });
  };

  // Save edited test case
  const handleSaveEditTestCase = async () => {
    if (!editingTestCaseId || !editTestCase.name || !editTestCase.scenario || !editTestCase.expectedOutcome) return;

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(api.endpoints.testCases.update(editingTestCaseId), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editTestCase.name,
          scenario: editTestCase.scenario,
          category: editTestCase.category,
          expected_behavior: editTestCase.expectedOutcome,
          priority: editTestCase.priority,
        }),
      });

      if (response.ok) {
        setSavedTestCases(savedTestCases.map(tc => 
          tc.id === editingTestCaseId 
            ? { ...tc, ...editTestCase }
            : tc
        ));
        handleCancelEditTestCase();
      } else {
        const errorData = await response.json();
        setError(errorData.message || errorData.error || "Failed to update test case");
      }
    } catch (error) {
      console.error("Error updating test case:", error);
      setError("Failed to update test case");
    }
  };

  // Save workflow
  const handleSaveWorkflow = async (workflowData: any) => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(api.endpoints.agents.workflow(agentId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        throw new Error("Failed to save workflow");
      }
    } catch (error) {
      console.error("Error saving workflow:", error);
      throw error;
    }
  };

  // Run workflow-based tests
  const handleRunWorkflow = async (executionPlan: WorkflowExecutionPlan) => {
    try {
      const token = await getToken();
      if (!token) return;

      // Create a test run with workflow execution mode
      const response = await fetch(api.endpoints.testRuns.startWorkflow, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
          name: `Workflow Test - ${new Date().toLocaleString()}`,
          execution_plan: executionPlan,
          execution_mode: "workflow",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to the test run page
        router.push(`/dashboard/test-runs/${data.testRun.id}`);
      } else {
        throw new Error("Failed to start workflow test run");
      }
    } catch (error) {
      console.error("Error running workflow:", error);
      setError("Failed to start test run");
    }
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
    fetchDynamicVariables();
    fetchKnowledgeBase();
  }, [fetchAgent, fetchTestCases, fetchTestRuns, fetchDynamicVariables, fetchKnowledgeBase]);

  // Analyze the prompt using backend AI
  const analyzePrompt = async (prompt: string, config: Record<string, any>) => {
    setIsAnalyzing(true);

    try {
      const token = await getToken();
      if (!token) {
        setIsAnalyzing(false);
        return;
      }

      // Call backend API for AI-powered analysis
      const response = await fetch(api.endpoints.agents.analyzePrompt(agentId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const analysis = await response.json();
        setPromptAnalysis({
          purpose: analysis.purpose || 'Purpose could not be determined',
          capabilities: analysis.capabilities || [],
          expectedBehaviors: analysis.expectedBehaviors || [],
          potentialIssues: [], // Not using issues anymore
          strengths: analysis.strengths || [],
          weaknesses: analysis.weaknesses || [],
          overallScore: 0, // Not using score anymore
        });
      } else {
        // Fallback to basic local analysis if API fails
        const fallbackAnalysis: PromptAnalysis = {
          purpose: extractPurpose(prompt),
          capabilities: extractCapabilities(prompt, config),
          expectedBehaviors: extractExpectedBehaviors(prompt),
          potentialIssues: [],
          strengths: extractStrengths(prompt),
          weaknesses: extractWeaknesses(prompt),
          overallScore: 0,
        };
        setPromptAnalysis(fallbackAnalysis);
      }
    } catch (error) {
      console.error('Error analyzing prompt:', error);
      // Fallback to basic local analysis
      const fallbackAnalysis: PromptAnalysis = {
        purpose: extractPurpose(prompt),
        capabilities: extractCapabilities(prompt, config),
        expectedBehaviors: extractExpectedBehaviors(prompt),
        potentialIssues: [],
        strengths: extractStrengths(prompt),
        weaknesses: extractWeaknesses(prompt),
        overallScore: 0,
      };
      setPromptAnalysis(fallbackAnalysis);
    } finally {
      setIsAnalyzing(false);
    }
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
        <div className="text-sm">
          {typeof value === "boolean" ? (
            <Badge variant={value ? "default" : "secondary"}>
              {value ? "Yes" : "No"}
            </Badge>
          ) : (
            String(value)
          )}
        </div>
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
        // Retell stores full prompt in metadata.fullPrompt
        // ElevenLabs stores in agent_prompt or system_prompt
        // VAPI stores in prompt
        const newPrompt = fetchedAgent?.metadata?.fullPrompt ||
                          fetchedAgent?.description || 
                          fetchedAgent?.prompt || 
                          fetchedAgent?.system_prompt || 
                          fetchedAgent?.agent_prompt ||
                          fetchedAgent?.metadata?.prompt ||
                          fetchedAgent?.metadata?.general_prompt ||
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
            // Try to extract prompt from various locations in config
            finalPrompt = updatedData.agent.config.metadata?.fullPrompt ||
                          updatedData.agent.config.metadata?.general_prompt ||
                          updatedData.agent.config.description || 
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

  // Prompt version selection handler
  const handlePromptVersionSelect = (versionId: string, checked: boolean) => {
    if (checked) {
      // Max 2 selections
      if (selectedPromptVersions.length < 2) {
        setSelectedPromptVersions([...selectedPromptVersions, versionId]);
      }
    } else {
      setSelectedPromptVersions(selectedPromptVersions.filter(id => id !== versionId));
      if (showPromptComparison) {
        setShowPromptComparison(false);
      }
    }
  };

  // Get prompt content by version id
  const getPromptByVersionId = (versionId: string): { prompt: string; version: number; date: string } | null => {
    if (versionId === 'current') {
      return {
        prompt: agent?.prompt || '',
        version: promptVersions[0]?.version_number || 1,
        date: promptVersions[0]?.created_at || ''
      };
    }
    const version = promptVersions.find(v => v.id === versionId);
    if (version) {
      return {
        prompt: version.prompt,
        version: version.version_number,
        date: version.created_at
      };
    }
    return null;
  };

  // Compute diff between two strings using Myers diff algorithm (simplified)
  // This produces a proper line-by-line diff like VS Code
  const computeDiff = (oldText: string, newText: string): DiffResult[] => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    
    // Build a map of line content to positions for quick lookup
    const buildLineMap = (lines: string[]): Map<string, number[]> => {
      const map = new Map<string, number[]>();
      lines.forEach((line, idx) => {
        const positions = map.get(line) || [];
        positions.push(idx);
        map.set(line, positions);
      });
      return map;
    };
    
    // Find longest common subsequence
    const findLCS = (a: string[], b: string[]): number[][] => {
      const m = a.length;
      const n = b.length;
      const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
      
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (a[i - 1] === b[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          }
        }
      }
      return dp;
    };
    
    // Backtrack to find the actual LCS
    const backtrack = (dp: number[][], a: string[], b: string[]): Set<string> => {
      const lcsIndices: { oldIdx: number; newIdx: number }[] = [];
      let i = a.length, j = b.length;
      
      while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
          lcsIndices.unshift({ oldIdx: i - 1, newIdx: j - 1 });
          i--;
          j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
          i--;
        } else {
          j--;
        }
      }
      
      // Create pairs of matching indices
      const matchedOld = new Set(lcsIndices.map(l => l.oldIdx));
      const matchedNew = new Set(lcsIndices.map(l => l.newIdx));
      
      return new Set([...matchedOld].map(idx => `old:${idx}`).concat([...matchedNew].map(idx => `new:${idx}`)));
    };
    
    const dp = findLCS(oldLines, newLines);
    
    // Build the diff result
    const result: DiffResult[] = [];
    let oldIdx = 0;
    let newIdx = 0;
    
    // Track matched lines using LCS
    const matchedPairs: { oldIdx: number; newIdx: number }[] = [];
    let i = oldLines.length, j = newLines.length;
    
    while (i > 0 && j > 0) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        matchedPairs.unshift({ oldIdx: i - 1, newIdx: j - 1 });
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    
    // Build result with proper alignment
    let matchIdx = 0;
    oldIdx = 0;
    newIdx = 0;
    
    while (oldIdx < oldLines.length || newIdx < newLines.length) {
      const nextMatch = matchedPairs[matchIdx];
      
      if (nextMatch && oldIdx === nextMatch.oldIdx && newIdx === nextMatch.newIdx) {
        // Matching line
        result.push({
          type: 'unchanged',
          oldLineNum: oldIdx + 1,
          newLineNum: newIdx + 1,
          oldContent: oldLines[oldIdx],
          newContent: newLines[newIdx]
        });
        oldIdx++;
        newIdx++;
        matchIdx++;
      } else {
        // Check if we need to add deleted lines before next match
        const oldUntil = nextMatch ? nextMatch.oldIdx : oldLines.length;
        const newUntil = nextMatch ? nextMatch.newIdx : newLines.length;
        
        // Add deleted and added lines side by side where possible
        while (oldIdx < oldUntil || newIdx < newUntil) {
          if (oldIdx < oldUntil && newIdx < newUntil) {
            // Both have content - show as modified
            result.push({
              type: 'modified',
              oldLineNum: oldIdx + 1,
              newLineNum: newIdx + 1,
              oldContent: oldLines[oldIdx],
              newContent: newLines[newIdx]
            });
            oldIdx++;
            newIdx++;
          } else if (oldIdx < oldUntil) {
            // Only old has content - deleted
            result.push({
              type: 'deleted',
              oldLineNum: oldIdx + 1,
              newLineNum: null,
              oldContent: oldLines[oldIdx],
              newContent: null
            });
            oldIdx++;
          } else {
            // Only new has content - added
            result.push({
              type: 'added',
              oldLineNum: null,
              newLineNum: newIdx + 1,
              oldContent: null,
              newContent: newLines[newIdx]
            });
            newIdx++;
          }
        }
      }
    }
    
    return result;
  };

  type DiffResult = {
    type: 'unchanged' | 'added' | 'deleted' | 'modified';
    oldLineNum: number | null;
    newLineNum: number | null;
    oldContent: string | null;
    newContent: string | null;
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
          {/* Test Flow tab hidden for now
          <TabsTrigger value="testflow">
            <Workflow className="mr-2 h-4 w-4" />
            Test Flow
          </TabsTrigger>
          */}
          <TabsTrigger value="testruns">
            <Play className="mr-2 h-4 w-4" />
            Previous Test Runs
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="consistency">
            <Activity className="mr-2 h-4 w-4" />
            Consistency
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
                                    key !== "prompt" &&
                                    key !== "systemPrompt" &&
                                    key !== "firstMessage" &&
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
                                      key !== "prompt" &&
                                      key !== "systemPrompt" &&
                                      key !== "firstMessage" &&
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

          {/* Knowledge Base Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Knowledge Base
                  </CardTitle>
                  <CardDescription>
                    Documents and data sources connected to this agent
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchKnowledgeBase} disabled={isLoadingKnowledgeBase}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingKnowledgeBase ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingKnowledgeBase ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : knowledgeBase.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <h3 className="font-medium mb-1">No Knowledge Base Found</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    This agent doesn't have any connected knowledge base or documents.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {knowledgeBase.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => fetchDocumentContent(item)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          {item.type === 'url' ? (
                            <ExternalLink className="h-4 w-4 text-primary" />
                          ) : (
                            <FileText className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs py-0">
                              {item.type}
                            </Badge>
                            {item.metadata?.size_bytes && (
                              <span>Size: {(item.metadata.size_bytes / 1024).toFixed(1)} KB</span>
                            )}
                            {item.url && (
                              <span className="truncate max-w-[200px]">Source: {item.url}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="default" className="text-xs">active</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); fetchDocumentContent(item); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {item.url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild onClick={(e) => e.stopPropagation()}>
                            <a href={item.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                    <div className="flex items-center gap-2">
                      {selectedPromptVersions.length === 2 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newValue = !showPromptComparison;
                            setShowPromptComparison(newValue);
                            if (newValue) {
                              // Scroll to comparison section after state update
                              setTimeout(() => {
                                comparisonSectionRef.current?.scrollIntoView({ 
                                  behavior: 'smooth', 
                                  block: 'start' 
                                });
                              }, 100);
                            }
                          }}
                          className="flex items-center gap-1"
                        >
                          <GitCompare className="h-4 w-4" />
                          {showPromptComparison ? "Hide Comparison" : "Compare Selected"}
                        </Button>
                      )}
                      {selectedPromptVersions.length > 0 && selectedPromptVersions.length < 2 && (
                        <span className="text-xs text-muted-foreground">
                          Select 1 more to compare
                        </span>
                      )}
                      {promptVersions.length > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <History className="h-3 w-3" />
                          {promptVersions.length} version{promptVersions.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    View current and historical versions of the agent's prompt. Select 2 versions to compare.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mounted ? (
                    <Accordion type="single" collapsible defaultValue="current" className="w-full">
                      {/* Current Prompt */}
                      <AccordionItem value="current" className="relative">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center h-[52px]">
                            <Checkbox
                              checked={selectedPromptVersions.includes('current')}
                              onCheckedChange={(checked) => handlePromptVersionSelect('current', checked as boolean)}
                              disabled={!selectedPromptVersions.includes('current') && selectedPromptVersions.length >= 2}
                            />
                          </div>
                          <AccordionTrigger className="hover:no-underline flex-1">
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
                        </div>
                        <AccordionContent>
                          <div className="border rounded-lg p-4 bg-muted/30 mt-2 ml-6">
                            <pre className="text-sm whitespace-pre-wrap font-mono">{agent.prompt}</pre>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Historical Versions */}
                      {promptVersions.slice(1).map((version) => (
                        <AccordionItem key={version.id} value={version.id} className="relative">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center h-[52px]">
                              <Checkbox
                                checked={selectedPromptVersions.includes(version.id)}
                                onCheckedChange={(checked) => handlePromptVersionSelect(version.id, checked as boolean)}
                                disabled={!selectedPromptVersions.includes(version.id) && selectedPromptVersions.length >= 2}
                              />
                            </div>
                            <AccordionTrigger className="hover:no-underline flex-1">
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
                          </div>
                          <AccordionContent>
                            <div className="border rounded-lg p-4 bg-muted/30 mt-2 ml-6">
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

                  {/* Diff Comparison View */}
                  {showPromptComparison && selectedPromptVersions.length === 2 && (() => {
                    const version1 = getPromptByVersionId(selectedPromptVersions[0]);
                    const version2 = getPromptByVersionId(selectedPromptVersions[1]);
                    
                    if (!version1 || !version2) return null;
                    
                    // Sort by version number to show older on left
                    const [older, newer] = version1.version < version2.version 
                      ? [version1, version2] 
                      : [version2, version1];
                    
                    const diff = computeDiff(older.prompt, newer.prompt);
                    
                    const addedCount = diff.filter(l => l.type === 'added').length;
                    const deletedCount = diff.filter(l => l.type === 'deleted').length;
                    const modifiedCount = diff.filter(l => l.type === 'modified').length;
                    
                    return (
                      <div ref={comparisonSectionRef} className="mt-6 border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-3 border-b flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GitCompare className="h-4 w-4" />
                            <span className="font-medium">Version Comparison</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500"></span>
                              <span className="text-muted-foreground">{deletedCount} deleted</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded bg-slate-500/20 border border-slate-500"></span>
                              <span className="text-muted-foreground">{modifiedCount} modified</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded bg-green-500/20 border border-green-500"></span>
                              <span className="text-muted-foreground">{addedCount} added</span>
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
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                              v{older.version}
                            </Badge>
                            <span className="text-muted-foreground">
                              {older.date && formatDate(older.date)}
                            </span>
                          </div>
                          <div className="bg-muted/50 px-4 py-2 text-sm font-medium flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                              v{newer.version}
                            </Badge>
                            <span className="text-muted-foreground">
                              {newer.date && formatDate(newer.date)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Unified diff view - synchronized side by side */}
                        <ScrollArea className="h-[600px]">
                          <div className="font-mono text-xs">
                            {diff.map((line, idx) => (
                              <div key={idx} className="grid grid-cols-2 divide-x">
                                {/* Left side (older) */}
                                <div
                                  className={`flex min-h-[28px] ${
                                    line.type === 'deleted' 
                                      ? 'bg-red-500/15' 
                                      : line.type === 'modified'
                                        ? 'bg-red-500/10'
                                        : ''
                                  }`}
                                >
                                  <span className="w-10 flex-shrink-0 text-right pr-2 text-muted-foreground py-1 select-none border-r bg-muted/30">
                                    {line.oldLineNum || ''}
                                  </span>
                                  <span className="w-6 flex-shrink-0 text-center py-1 select-none">
                                    {(line.type === 'deleted' || line.type === 'modified') && (
                                      <span className="text-red-500 font-bold">−</span>
                                    )}
                                  </span>
                                  <pre className={`flex-1 py-1 px-2 whitespace-pre-wrap break-all ${
                                    line.type === 'deleted' || line.type === 'modified' ? 'text-red-600' : ''
                                  }`}>
                                    {line.oldContent ?? ''}
                                  </pre>
                                </div>
                                
                                {/* Right side (newer) */}
                                <div
                                  className={`flex min-h-[28px] ${
                                    line.type === 'added' 
                                      ? 'bg-green-500/15' 
                                      : line.type === 'modified'
                                        ? 'bg-green-500/10'
                                        : ''
                                  }`}
                                >
                                  <span className="w-10 flex-shrink-0 text-right pr-2 text-muted-foreground py-1 select-none border-r bg-muted/30">
                                    {line.newLineNum || ''}
                                  </span>
                                  <span className="w-6 flex-shrink-0 text-center py-1 select-none">
                                    {(line.type === 'added' || line.type === 'modified') && (
                                      <span className="text-green-500 font-bold">+</span>
                                    )}
                                  </span>
                                  <pre className={`flex-1 py-1 px-2 whitespace-pre-wrap break-all ${
                                    line.type === 'added' || line.type === 'modified' ? 'text-green-600' : ''
                                  }`}>
                                    {line.newContent ?? ''}
                                  </pre>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    );
                  })()}
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
                      <p className="text-sm text-slate-600 text-center">
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
                      onClick={() => {
                        fetchDynamicVariables();
                        setShowDynamicVariablesDialog(true);
                      }}
                    >
                      <span className="mr-2 text-xs font-bold">{"{X}"}</span>
                      Dynamic Variables
                    </Button>
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
                      {isGeneratingTests && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Generate More
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCSVImportDialog(true);
                        setCsvFile(null);
                        setCsvPreview([]);
                        setCsvError(null);
                      }}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Import CSV
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
                        <Label className="text-sm font-medium">Expected Response *</Label>
                        <Input
                          value={newTestCase.expectedOutcome}
                          onChange={(e) =>
                            setNewTestCase({
                              ...newTestCase,
                              expectedOutcome: e.target.value,
                            })
                          }
                          placeholder="What should happen (required)"
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
                      <Button onClick={handleAddTestCase} disabled={!newTestCase.name || !newTestCase.scenario || !newTestCase.expectedOutcome || (!newTestCase.category || (newTestCase.category === "__custom__" && !customCategory))}>
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
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">
                            Actions
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
                              const isEditing = editingTestCaseId === tc.id;
                              rows.push(
                                <tr key={tc.id} className={`
                                  ${idx === 0 ? 'border-t-2 border-t-border' : ''} 
                                  ${isEditing ? 'bg-primary/5 ring-2 ring-primary/20 ring-inset' : 'hover:bg-muted/30'}
                                  transition-colors
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
                                    {isEditing ? (
                                      <Input
                                        value={editTestCase.name}
                                        onChange={(e) => setEditTestCase({ ...editTestCase, name: e.target.value })}
                                        className="h-8 text-sm"
                                        autoFocus
                                      />
                                    ) : (
                                      <span className="text-sm font-medium text-foreground">{tc.name}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <Input
                                          value={editTestCase.scenario}
                                          onChange={(e) => setEditTestCase({ ...editTestCase, scenario: e.target.value })}
                                          className="h-8 text-sm"
                                          placeholder="Scenario"
                                        />
                                        <Input
                                          value={editTestCase.expectedOutcome}
                                          onChange={(e) => setEditTestCase({ ...editTestCase, expectedOutcome: e.target.value })}
                                          className="h-8 text-sm"
                                          placeholder="Expected outcome"
                                        />
                                      </div>
                                    ) : (
                                      <>
                                        <p className="text-sm text-muted-foreground line-clamp-2" title={tc.scenario}>
                                          {tc.scenario}
                                        </p>
                                        {tc.expectedOutcome && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            <span className="font-medium">Expected: </span>
                                            {tc.expectedOutcome}
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {isEditing ? (
                                      <Select
                                        value={editTestCase.priority}
                                        onValueChange={(v) => setEditTestCase({ ...editTestCase, priority: v as "high" | "medium" | "low" })}
                                      >
                                        <SelectTrigger className="h-8 text-xs w-24">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="high">High</SelectItem>
                                          <SelectItem value="medium">Medium</SelectItem>
                                          <SelectItem value="low">Low</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Badge
                                        variant="secondary"
                                        className={`${priorityColors[tc.priority]} text-xs font-medium`}
                                      >
                                        {tc.priority.charAt(0).toUpperCase() + tc.priority.slice(1)}
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {isEditing ? (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                            onClick={handleSaveEditTestCase}
                                          >
                                            <Check className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            onClick={handleCancelEditTestCase}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            onClick={() => handleStartEditTestCase(tc)}
                                          >
                                            <Edit2 className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                            onClick={() => handleDeleteTestCase(tc.id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
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

        {/* Test Flow Tab - Full height */}
        <TabsContent value="testflow" className="mt-0">
          <TestFlowTab
            agentId={agentId}
            testCases={savedTestCases.map(tc => ({
              id: tc.id,
              name: tc.name,
              scenario: tc.scenario,
              category: tc.category || 'General',
              expectedOutcome: tc.expectedOutcome || '',
              priority: tc.priority,
            }))}
            onSave={handleSaveWorkflow}
            onRunWorkflow={handleRunWorkflow}
          />
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
                  {selectedRunIds.size === 2 && (
                    <Button onClick={handleCompareRuns} className="gap-2">
                      <GitCompare className="h-4 w-4" />
                      Compare 2 Runs
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
                  {selectedRunIds.size === 1 && (
                    <div className="mb-4 p-3 bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Select 1 more test run to compare
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
                            running: "bg-slate-100 text-slate-800",
                            pending: "bg-slate-100 text-slate-800",
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
                                  disabled={run.status !== 'completed' || (selectedRunIds.size >= 2 && !selectedRunIds.has(run.id))}
                                  className={selectedRunIds.size >= 2 && !selectedRunIds.has(run.id) ? 'cursor-not-allowed opacity-50' : ''}
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

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Testing
              </CardTitle>
              <CardDescription>
                Security tests are now integrated into the Test Cases workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 bg-muted/50 rounded-lg text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Create Security Test Cases</h3>
                <p className="text-muted-foreground mb-4">
                  Security tests for data leakage, prompt injection, PII handling, and more are now 
                  created as regular test cases with the &quot;Security Test&quot; option enabled.
                </p>
                <div className="flex justify-center gap-3">
                  <Button asChild>
                    <a href="/dashboard/test-cases">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Security Test Cases
                    </a>
                  </Button>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="font-medium">Data Leakage</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Test if agent leaks sensitive data across conversations
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Prompt Injection</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Test resistance to prompt injection attacks
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">PII Handling</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Test proper handling of personal information
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consistency Tab */}
        <TabsContent value="consistency" className="space-y-4">
          <ConsistencyTestPanel agentId={agentId} />
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledgebase" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Knowledge Base
                  </CardTitle>
                  <CardDescription>
                    Documents and data sources connected to this agent
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={fetchKnowledgeBase} disabled={isLoadingKnowledgeBase}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingKnowledgeBase ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingKnowledgeBase ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : knowledgeBase.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Knowledge Base Found</h3>
                  <p className="text-muted-foreground max-w-md">
                    This agent doesn't have any connected knowledge base or documents. 
                    You can add knowledge base items through your voice agent provider's dashboard.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {knowledgeBase.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => fetchDocumentContent(item)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          {item.type === 'document' && <FileText className="h-5 w-5 text-primary" />}
                          {item.type === 'file' && <FileText className="h-5 w-5 text-primary" />}
                          {item.type === 'vector_store' && <Database className="h-5 w-5 text-primary" />}
                          {item.type === 'retrieval_tool' && <FileQuestion className="h-5 w-5 text-primary" />}
                          {item.type === 'url' && <ExternalLink className="h-5 w-5 text-primary" />}
                          {!['document', 'file', 'vector_store', 'retrieval_tool', 'url'].includes(item.type) && (
                            <BookOpen className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {item.type}
                            </Badge>
                            {item.description && (
                              <span className="truncate max-w-xs">{item.description}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status && (
                          <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                            {item.status}
                          </Badge>
                        )}
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); fetchDocumentContent(item); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {item.url && (
                          <Button variant="ghost" size="icon" asChild onClick={(e) => e.stopPropagation()}>
                            <a href={item.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CSV Import Dialog */}
      <Dialog open={showCSVImportDialog} onOpenChange={setShowCSVImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Test Cases from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with your test cases. Download the template first to see the expected format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1: Download Template */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <div className="flex-1">
                <p className="text-sm font-medium">Step 1: Download the CSV template</p>
                <p className="text-xs text-muted-foreground">Columns: name, scenario, expected_behavior, category, priority</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadCSVTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
            </div>

            {/* Step 2: Upload CSV */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Step 2: Upload your filled CSV</p>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => csvFileInputRef.current?.click()}
              >
                <input
                  ref={csvFileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCSVFileSelect}
                />
                <FileUp className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                {csvFile ? (
                  <p className="text-sm font-medium">{csvFile.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Click to select a CSV file</p>
                )}
              </div>
            </div>

            {/* Error */}
            {csvError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {csvError}
              </div>
            )}

            {/* Preview */}
            {csvPreview.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Preview ({csvPreview.length} test case{csvPreview.length !== 1 ? "s" : ""})</p>
                <ScrollArea className="h-[200px] rounded-md border">
                  <div className="p-2 space-y-1">
                    {csvPreview.map((row, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded text-sm hover:bg-muted/50">
                        <Badge variant="outline" className="shrink-0 text-xs">{row.category}</Badge>
                        <span className="font-medium truncate">{row.name}</span>
                        <span className="text-muted-foreground truncate flex-1">— {row.scenario.slice(0, 80)}{row.scenario.length > 80 ? "…" : ""}</span>
                        <Badge variant={row.priority === "high" ? "destructive" : row.priority === "low" ? "secondary" : "default"} className="shrink-0 text-xs">
                          {row.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCSVImportDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImportCSV}
              disabled={csvPreview.length === 0 || isImportingCSV}
            >
              {isImportingCSV && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {csvPreview.length > 0 ? `${csvPreview.length} Test Case${csvPreview.length !== 1 ? "s" : ""}` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Test Cases Selection Dialog - Full Screen */}
      <Dialog open={showGeneratedTestCasesDialog} onOpenChange={setShowGeneratedTestCasesDialog}>
        <DialogContent className="!max-w-[80vw] !w-[80vw] !h-[85vh] !rounded-lg flex flex-col p-0 [&>button]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b bg-background">
            <div>
              <DialogTitle className="text-xl font-semibold">
                Generated Test Cases
              </DialogTitle>
              <DialogDescription className="mt-1 text-muted-foreground">
                Select the test cases you want to add. {generatedTestCases.length} test case{generatedTestCases.length !== 1 ? 's' : ''} generated.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  id="select-all-generated"
                  checked={selectedGeneratedTestCases.size === generatedTestCases.length && generatedTestCases.length > 0}
                  onCheckedChange={(checked) => handleSelectAllGeneratedTestCases(checked as boolean)}
                />
                <span className="text-sm font-medium">
                  Select All ({selectedGeneratedTestCases.size} of {generatedTestCases.length} selected)
                </span>
              </label>
              <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
                {selectedGeneratedTestCases.size} selected
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setShowGeneratedTestCasesDialog(false);
                  setGeneratedTestCases([]);
                  setSelectedGeneratedTestCases(new Set());
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Scrollable Test Cases Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-8 py-3 w-12"></th>
                  <th className="px-4 py-3 w-[280px]">Test Case</th>
                  <th className="px-4 py-3 w-[120px]">Category</th>
                  <th className="px-4 py-3 w-[80px]">Priority</th>
                  <th className="px-4 py-3">Scenario</th>
                  <th className="px-4 py-3">Expected Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {generatedTestCases.map((tc) => (
                  <tr
                    key={tc.id}
                    onClick={() => handleGeneratedTestCaseSelection(tc.id, !selectedGeneratedTestCases.has(tc.id))}
                    className={`cursor-pointer transition-colors ${
                      selectedGeneratedTestCases.has(tc.id)
                        ? 'bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <td className="px-8 py-4">
                      <Checkbox
                        id={`tc-${tc.id}`}
                        checked={selectedGeneratedTestCases.has(tc.id)}
                        onCheckedChange={(checked) => handleGeneratedTestCaseSelection(tc.id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-sm">{tc.name}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                        {tc.category}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        tc.priority === 'high' ? 'bg-red-100 text-red-700' :
                        tc.priority === 'low' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {tc.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">{tc.scenario}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">{tc.expectedOutcome || '-'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-8 py-4 border-t bg-background">
            <Button
              variant="outline"
              onClick={() => {
                setShowGeneratedTestCasesDialog(false);
                setGeneratedTestCases([]);
                setSelectedGeneratedTestCases(new Set());
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedTestCases}
              disabled={selectedGeneratedTestCases.size === 0 || isAddingSelectedTestCases}
              className="min-w-[180px]"
            >
              {isAddingSelectedTestCases ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add {selectedGeneratedTestCases.size} Test Case{selectedGeneratedTestCases.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Document Viewer Dialog - Fullscreen */}
      <Dialog open={showDocumentViewer} onOpenChange={setShowDocumentViewer}>
        <DialogContent className="!max-w-none !w-screen !h-screen !m-0 !rounded-none flex flex-col">
          <DialogHeader className="flex-shrink-0 px-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">
                    {selectedDocument?.name || 'Document'}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {selectedDocument?.type || 'file'}
                    </Badge>
                    {selectedDocument?.metadata?.size_bytes && (
                      <span className="text-xs">
                        Size: {(selectedDocument.metadata.size_bytes / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden mx-6 border rounded-lg bg-muted/30 min-h-0">
            {isLoadingDocumentContent ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading document content...</p>
                </div>
              </div>
            ) : documentContent ? (
              <ScrollArea className="h-full w-full">
                <div className="p-6">
                  {documentContent.startsWith('Error') ? (
                    // Show error message
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                      <p className="text-destructive font-medium">{documentContent}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        The document content could not be retrieved from ElevenLabs.
                      </p>
                    </div>
                  ) : documentContent.trim().startsWith('<') && documentContent.includes('</') ? (
                    // Render HTML content
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: documentContent }}
                    />
                  ) : (
                    // Render formatted text content with Q&A parsing
                    <div className="space-y-4 text-sm leading-relaxed">
                      {documentContent.split('\n').map((line, index) => {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) return <div key={index} className="h-2" />;
                        
                        // Question line (starts with Q:)
                        if (trimmedLine.startsWith('Q:')) {
                          return (
                            <div key={index} className="mt-4">
                              <p className="font-semibold text-primary">
                                {trimmedLine}
                              </p>
                            </div>
                          );
                        }
                        
                        // Answer line (starts with A:)
                        if (trimmedLine.startsWith('A:')) {
                          return (
                            <div key={index} className="ml-4 pl-4 border-l-2 border-muted-foreground/20">
                              <p className="text-foreground">
                                {trimmedLine.substring(2).trim()}
                              </p>
                            </div>
                          );
                        }
                        
                        // Header lines (contains flag emoji - check for regional indicator symbols)
                        const hasFlag = /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(trimmedLine);
                        if (hasFlag || (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3 && !trimmedLine.startsWith('•'))) {
                          return (
                            <h3 key={index} className="font-bold text-lg mt-6 mb-2 text-foreground">
                              {trimmedLine}
                            </h3>
                          );
                        }
                        
                        // Bullet points
                        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
                          return (
                            <div key={index} className="ml-4 flex gap-2">
                              <span className="text-muted-foreground">•</span>
                              <span>{trimmedLine.substring(1).trim()}</span>
                            </div>
                          );
                        }
                        
                        // Regular paragraph
                        return (
                          <p key={index} className="text-foreground">
                            {trimmedLine}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-center">
                  <FileQuestion className="h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No content available</p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-shrink-0 px-6 pb-4 mt-4">
            {selectedDocument?.url && (
              <Button variant="outline" asChild>
                <a href={selectedDocument.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Source
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDocumentViewer(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dynamic Variables Dialog */}
      <Dialog open={showDynamicVariablesDialog} onOpenChange={setShowDynamicVariablesDialog}>
        <DialogContent className="!max-w-[70vw] !w-[70vw] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <span className="h-6 w-6 flex items-center justify-center text-base font-bold">{'{X}'}</span>
                  Dynamic Variables
                </DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  Variables extracted from the agent's prompt. Set test values for testing.
                </DialogDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchDynamicVariables} disabled={isLoadingVariables}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingVariables ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto mt-4">
            {isLoadingVariables ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : dynamicVariables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="h-12 w-12 flex items-center justify-center text-2xl font-bold text-muted-foreground/50 mb-4">{'{X}'}</span>
                <h3 className="text-lg font-medium mb-2">No Dynamic Variables Found</h3>
                <p className="text-muted-foreground max-w-md">
                  No dynamic variables (like {"{{variable}}"} or {"{variable}"}) were detected in the agent's prompt.
                  Dynamic variables allow you to personalize conversations with caller-specific data.
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-muted-foreground w-[200px]">
                        Variable Name
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-muted-foreground w-[200px]">
                        Pattern
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-muted-foreground w-[120px]">
                        Source
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Test Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dynamicVariables.map((variable, index) => (
                      <tr key={index} className="hover:bg-muted/30">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="bg-primary/10 text-primary px-3 py-1.5 rounded text-sm font-mono font-medium">
                              {variable.name}
                            </code>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded">
                            {variable.pattern}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-sm px-3 py-1">
                            {variable.source}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Input
                            value={variable.testValue || ''}
                            onChange={(e) => {
                              const newVars = [...dynamicVariables];
                              newVars[index] = { ...newVars[index], testValue: e.target.value };
                              setDynamicVariables(newVars);
                            }}
                            placeholder={variable.defaultValue || `Enter test value for ${variable.name}`}
                            className="h-10 text-sm w-full"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowDynamicVariablesDialog(false)}>
              Cancel
            </Button>
            {dynamicVariables.length > 0 && (
              <Button
                disabled={isSavingVariables}
                onClick={async () => {
                  // Save variables to backend
                  const varsToSave = dynamicVariables.reduce((acc, v) => {
                    if (v.testValue) acc[v.name] = v.testValue;
                    return acc;
                  }, {} as Record<string, string>);
                  
                  setIsSavingVariables(true);
                  try {
                    const token = await getToken();
                    const response = await fetch(api.endpoints.agents.dynamicVariables(agentId), {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ variables: varsToSave }),
                    });
                    
                    if (!response.ok) {
                      throw new Error('Failed to save');
                    }
                    
                    // Also save to localStorage as backup
                    localStorage.setItem(`agent-${agentId}-variables`, JSON.stringify(varsToSave));
                    setShowDynamicVariablesDialog(false);
                  } catch (err) {
                    console.error('Error saving dynamic variables:', err);
                    // Still save to localStorage as fallback
                    localStorage.setItem(`agent-${agentId}-variables`, JSON.stringify(varsToSave));
                    setShowDynamicVariablesDialog(false);
                  } finally {
                    setIsSavingVariables(false);
                  }
                }}
              >
                {isSavingVariables ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Save Test Values
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
