"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Loader2, Plus, Trash2, Layers, GripVertical, X, Phone, Edit2, Check, Search, Bot, FileText, Settings, ListChecks, PlayCircle, Maximize2 } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  provider: string;
  prompt?: string;
  config?: Record<string, any>;
  integration_id?: string;
  external_agent_id?: string;
}

interface TestCase {
  id: string;
  name: string;
  scenario: string;
  category: string;
  keyTopic?: string;
  expectedOutcome: string;
  priority: "high" | "medium" | "low";
}

interface CallBatch {
  id: string;
  name: string;
  testCases: TestCase[];
  estimatedDuration: string;
}

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-slate-200 text-slate-800",
  low: "bg-green-100 text-green-800",
};

const categoryColors: Record<string, string> = {
  "Happy Path": "bg-green-100 text-green-800",
  "Edge Case": "bg-slate-200 text-slate-700",
  "Error Handling": "bg-red-100 text-red-800",
  "Boundary Testing": "bg-slate-200 text-slate-700",
  "Conversation Flow Testing": "bg-slate-200 text-slate-700",
  "Tool/Function Testing": "bg-slate-200 text-slate-700",
  "Off-Topic": "bg-slate-100 text-slate-700",
  "Budget": "bg-slate-200 text-slate-700",
  "Eligibility": "bg-slate-200 text-slate-700",
  "Custom": "bg-slate-200 text-slate-700",
};

export default function NewTestRunPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAgentId = searchParams.get("agent_id");

  // Selection state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentSearch, setAgentSearch] = useState("");

  // Test cases state
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(new Set());

  // Loading states
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isLoadingAgentDetails, setIsLoadingAgentDetails] = useState(false);
  const [isStartingTests, setIsStartingTests] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Batch planning modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  
  // Prompt fullscreen modal state
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [callBatches, setCallBatches] = useState<CallBatch[]>([]);
  const [draggedTestCase, setDraggedTestCase] = useState<{ testCase: TestCase; fromBatchId: string } | null>(null);
  const [dragOverBatchId, setDragOverBatchId] = useState<string | null>(null);

  // New test case form
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState("");
  const [newTestCase, setNewTestCase] = useState({
    name: "",
    scenario: "",
    category: "",
    expectedOutcome: "",
    priority: "medium" as "high" | "medium" | "low",
  });

  // Test run configuration
  const [batchingEnabled, setBatchingEnabled] = useState(true);
  const [concurrencyEnabled, setConcurrencyEnabled] = useState(false);
  const [concurrencyCount, setConcurrencyCount] = useState(3);
  
  // Provider limits state
  const [providerLimits, setProviderLimits] = useState<{
    concurrencyLimit: number;
    source: string;
    provider: string;
  } | null>(null);
  const [showConcurrencyWarning, setShowConcurrencyWarning] = useState(false);

  // Get unique categories from existing test cases
  const existingCategories = [...new Set(testCases.map(tc => tc.category))].filter(Boolean);

  // Filter agents based on search
  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(agentSearch.toLowerCase())
  );

  // Get selected test cases
  const selectedTestCases = testCases.filter(tc => selectedTestCaseIds.has(tc.id));

  // Fetch agents on mount
  useEffect(() => {
    const loadAgents = async () => {
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
          setAgents(data.agents || []);
          
          // Pre-select agent if agent_id is in URL
          if (preselectedAgentId && data.agents?.some((a: Agent) => a.id === preselectedAgentId)) {
            setSelectedAgentId(preselectedAgentId);
          }
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
        setError("Failed to load agents");
      } finally {
        setIsLoadingAgents(false);
      }
    };

    loadAgents();
  }, [getToken, preselectedAgentId]);

  // Fetch agent details and test cases when agent is selected
  const fetchAgentDetails = useCallback(async (agentId: string) => {
    if (!agentId) return;

    setIsLoadingAgentDetails(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) return;

      // Fetch agent details
      const agentResponse = await fetch(api.endpoints.agents.get(agentId), {
        headers: { Authorization: `Bearer ${token}` },
      });

      let agentData = null;
      if (agentResponse.ok) {
        const data = await agentResponse.json();
        agentData = data.agent;
        setSelectedAgent(data.agent);
        
        // Fetch provider limits if integration_id is available
        if (data.agent?.integration_id) {
          try {
            const limitsResponse = await fetch(
              api.endpoints.integrations.limits(data.agent.integration_id),
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (limitsResponse.ok) {
              const limitsData = await limitsResponse.json();
              setProviderLimits(limitsData.limits);
              // If current concurrency exceeds limit, adjust it
              if (limitsData.limits?.concurrencyLimit && concurrencyCount > limitsData.limits.concurrencyLimit) {
                setConcurrencyCount(limitsData.limits.concurrencyLimit);
                setShowConcurrencyWarning(true);
              }
            }
          } catch (e) {
            console.error("Error fetching provider limits:", e);
          }
        }
      }

      // Fetch test cases for this agent
      const testCasesResponse = await fetch(api.endpoints.agents.testCases(agentId), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (testCasesResponse.ok) {
        const data = await testCasesResponse.json();
        const cases = (data.testCases || []).map((tc: any) => ({
          id: tc.id,
          name: tc.name,
          scenario: tc.scenario,
          category: tc.category || 'General',
          keyTopic: tc.key_topic || tc.category || 'General',
          expectedOutcome: tc.expected_behavior || '',
          priority: tc.priority || 'medium',
        }));
        setTestCases(cases);
        // Select all test cases by default
        setSelectedTestCaseIds(new Set(cases.map((tc: TestCase) => tc.id)));
      }
    } catch (error) {
      console.error("Error fetching agent details:", error);
      setError("Failed to load agent details");
    } finally {
      setIsLoadingAgentDetails(false);
    }
  }, [getToken, concurrencyCount]);

  // Fetch agent details when selection changes
  useEffect(() => {
    if (selectedAgentId) {
      fetchAgentDetails(selectedAgentId);
    } else {
      setSelectedAgent(null);
      setTestCases([]);
      setSelectedTestCaseIds(new Set());
    }
  }, [selectedAgentId, fetchAgentDetails]);

  // Toggle test case selection
  const toggleTestCase = (id: string) => {
    setSelectedTestCaseIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select all test cases
  const selectAllTestCases = () => {
    setSelectedTestCaseIds(new Set(testCases.map(tc => tc.id)));
  };

  // Deselect all test cases
  const deselectAllTestCases = () => {
    setSelectedTestCaseIds(new Set());
  };

  const handleAddTestCase = () => {
    if (!newTestCase.name || !newTestCase.scenario) return;

    const finalCategory = newTestCase.category === "__custom__" 
      ? customCategory 
      : newTestCase.category || "Custom";

    const newCase: TestCase = {
      id: `tc-manual-${Date.now()}`,
      name: newTestCase.name,
      scenario: newTestCase.scenario,
      category: finalCategory,
      keyTopic: finalCategory, // Use category as keyTopic for manually added test cases
      expectedOutcome: newTestCase.expectedOutcome,
      priority: newTestCase.priority,
    };

    setTestCases([...testCases, newCase]);
    setSelectedTestCaseIds(prev => new Set([...prev, newCase.id]));
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

  const handleEditTestCase = (tc: TestCase) => {
    setEditingTestCase(tc.id);
    setNewTestCase({
      name: tc.name,
      scenario: tc.scenario,
      category: existingCategories.includes(tc.category) ? tc.category : "__custom__",
      expectedOutcome: tc.expectedOutcome,
      priority: tc.priority,
    });
    if (!existingCategories.includes(tc.category)) {
      setCustomCategory(tc.category);
    }
  };

  const handleSaveEdit = () => {
    if (!editingTestCase || !newTestCase.name || !newTestCase.scenario) return;

    const finalCategory = newTestCase.category === "__custom__" 
      ? customCategory 
      : newTestCase.category || "Custom";

    setTestCases(testCases.map(tc => 
      tc.id === editingTestCase 
        ? { 
            ...tc, 
            name: newTestCase.name,
            scenario: newTestCase.scenario,
            category: finalCategory,
            expectedOutcome: newTestCase.expectedOutcome,
            priority: newTestCase.priority,
          }
        : tc
    ));
    
    setEditingTestCase(null);
    setNewTestCase({
      name: "",
      scenario: "",
      category: "",
      expectedOutcome: "",
      priority: "medium",
    });
    setCustomCategory("");
  };

  const handleCancelEdit = () => {
    setEditingTestCase(null);
    setNewTestCase({
      name: "",
      scenario: "",
      category: "",
      expectedOutcome: "",
      priority: "medium",
    });
    setCustomCategory("");
  };

  const handleDeleteTestCase = (id: string) => {
    setTestCases(testCases.filter((tc) => tc.id !== id));
    setSelectedTestCaseIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  // Create batches from selected test cases - group by category or individual
  const createBatches = (): CallBatch[] => {
    const casesToBatch = selectedTestCases;
    
    if (!batchingEnabled) {
      // Each test case is its own batch (individual calls)
      return casesToBatch.map((tc, index) => ({
        id: `batch-${index + 1}`,
        name: tc.keyTopic || tc.category || "Individual",
        testCases: [tc],
        estimatedDuration: `~30 sec (1 scenario)`,
      }));
    }
    
    // Group test cases by keyTopic (more accurate than category) - each topic = ONE call
    const topicGroups = new Map<string, TestCase[]>();
    casesToBatch.forEach((tc) => {
      const topic = tc.keyTopic || tc.category || "General";
      const group = topicGroups.get(topic) || [];
      group.push(tc);
      topicGroups.set(topic, group);
    });

    const batches: CallBatch[] = [];
    topicGroups.forEach((cases, topic) => {
      const totalTurns = cases.length * 3;
      const estimatedMinutes = Math.ceil(totalTurns * 10 / 60);
      batches.push({
        id: `batch-${batches.length + 1}`,
        name: topic,
        testCases: cases,
        estimatedDuration: `~${estimatedMinutes} min (${cases.length} scenarios)`,
      });
    });

    return batches;
  };

  const handlePlanBatches = () => {
    const batches = createBatches();
    setCallBatches(batches);
    setShowBatchModal(true);
  };

  const moveTestCase = (testCaseId: string, fromBatchId: string, toBatchId: string) => {
    setCallBatches(prevBatches => {
      const newBatches = [...prevBatches];
      const fromBatch = newBatches.find(b => b.id === fromBatchId);
      const toBatch = newBatches.find(b => b.id === toBatchId);
      
      if (!fromBatch || !toBatch) return prevBatches;
      
      const tcIndex = fromBatch.testCases.findIndex(tc => tc.id === testCaseId);
      if (tcIndex === -1) return prevBatches;
      
      const [testCase] = fromBatch.testCases.splice(tcIndex, 1);
      toBatch.testCases.push(testCase);
      
      return newBatches.filter(b => b.testCases.length > 0);
    });
  };

  const removeFromBatch = (testCaseId: string, batchId: string) => {
    setCallBatches(prevBatches => {
      return prevBatches.map(batch => {
        if (batch.id === batchId) {
          return {
            ...batch,
            testCases: batch.testCases.filter(tc => tc.id !== testCaseId)
          };
        }
        return batch;
      }).filter(b => b.testCases.length > 0);
    });
  };

  const handleStartBatchedTests = async () => {
    if (callBatches.length === 0 || !selectedAgent) return;

    setIsStartingTests(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) return;

      const formattedBatches = callBatches.map(batch => ({
        id: batch.id,
        name: batch.name,
        testCases: batch.testCases.map(tc => ({
          id: tc.id,
          name: tc.name,
          scenario: tc.scenario,
          expectedOutcome: tc.expectedOutcome,
          category: tc.category,
        })),
      }));

      const response = await fetch(`${api.baseUrl}/api/test-execution/start-batched`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Test Run - ${selectedAgent.name}`,
          provider: selectedAgent.provider,
          agentId: selectedAgent.external_agent_id || selectedAgent.id,
          internalAgentId: selectedAgent.id, // Our database agent ID for querying later
          integrationId: selectedAgent.integration_id,
          agentName: selectedAgent.name,
          batches: formattedBatches,
          enableBatching: batchingEnabled,
          enableConcurrency: concurrencyEnabled,
          concurrencyCount: concurrencyEnabled ? concurrencyCount : 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/test-runs/${data.testRunId}`);
      } else {
        const errorData = await response.json();
        console.error("Batched test error response:", response.status, errorData);
        setError(errorData.error || `Failed to start batched test run (${response.status})`);
      }
    } catch (error) {
      console.error("Error starting batched tests:", error);
      setError(`Failed to start tests: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setIsStartingTests(false);
      setShowBatchModal(false);
    }
  };

  // Extract config values for display
  const getConfigValues = (config: Record<string, any>) => {
    const values: Record<string, any> = {};
    
    // Common config keys to display
    const keys = [
      'llmModel', 'modelName', 'model', 'llmProvider', 'modelProvider',
      'temperature', 'maxTokens', 'voice', 'voiceId', 'voiceModel',
      'language', 'firstMessage', 'beginMessage',
    ];
    
    keys.forEach(key => {
      if (config[key] !== undefined && config[key] !== null && config[key] !== '') {
        values[key] = config[key];
      }
    });
    
    return values;
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/test-runs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Test Run</h1>
          <p className="text-muted-foreground">
            Select an agent and configure your test run
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      )}

      {/* Agent Selection */}
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Select Agent</h2>
        </div>
        
        <div className="max-w-md">
          <Select
            value={selectedAgentId}
            onValueChange={(value) => {
              setSelectedAgentId(value);
              setAgentSearch("");
            }}
            disabled={isLoadingAgents}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  isLoadingAgents
                    ? "Loading agents..."
                    : agents.length === 0
                    ? "No agents added"
                    : "Select an agent"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <div className="flex items-center px-2 pb-2 sticky top-0 bg-popover">
                <Search className="h-4 w-4 text-muted-foreground absolute left-4" />
                <Input
                  placeholder="Search agents..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              {filteredAgents.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {agents.length === 0 ? (
                    <div className="space-y-2">
                      <p>No agents added yet</p>
                      <Link href="/dashboard/agents" className="text-primary underline">
                        Add an agent first
                      </Link>
                    </div>
                  ) : (
                    "No agents found"
                  )}
                </div>
              ) : (
                filteredAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <span>{agent.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {agent.provider}
                      </Badge>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading Agent Details */}
      {isLoadingAgentDetails && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Agent Details Section */}
      {selectedAgent && !isLoadingAgentDetails && (
        <div className="space-y-4">
          {/* Agent Info Accordion */}
          <Accordion type="multiple" defaultValue={["prompt", "config"]} className="border rounded-lg">
            {/* Prompt Section */}
            <AccordionItem value="prompt" className="border-b">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">Agent Prompt</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                {selectedAgent.prompt ? (
                  <div className="relative rounded-lg overflow-hidden">
                    <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg max-h-64 overflow-auto">
                      {selectedAgent.prompt}
                    </pre>
                    <button
                      className="absolute top-3 right-6 p-1.5 rounded-md bg-background/90 hover:bg-background border shadow transition-colors z-10"
                      onClick={() => setShowPromptModal(true)}
                      title="Expand to fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No prompt configured</p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Config Section */}
            <AccordionItem value="config" className="border-b-0">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <span className="font-medium">Agent Configuration</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                {selectedAgent.config && Object.keys(selectedAgent.config).length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Property</th>
                          <th className="px-3 py-2 text-left font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Object.entries(getConfigValues(selectedAgent.config)).map(([key, value]) => (
                          <tr key={key} className="hover:bg-muted/50">
                            <td className="px-3 py-2 text-muted-foreground capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {typeof value === 'boolean' 
                                ? (value ? '✓ Enabled' : '✗ Disabled')
                                : typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : String(value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No configuration available</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Test Cases Section */}
          <div className="border rounded-lg p-6 bg-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  Test Cases ({selectedTestCaseIds.size} of {testCases.length} selected)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllTestCases}
                  disabled={selectedTestCaseIds.size === testCases.length}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAllTestCases}
                  disabled={selectedTestCaseIds.size === 0}
                >
                  Deselect All
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
              </div>
            </div>

            {testCases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No test cases found for this agent.</p>
                <p className="text-sm mt-1">
                  <Link href={`/dashboard/agents/${selectedAgentId}`} className="text-primary underline">
                    Generate test cases
                  </Link>
                  {" "}or add them manually below.
                </p>
              </div>
            ) : (
              <>
                {/* Add Test Case Form */}
                {showAddForm && (
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-5 bg-primary/5 space-y-4 mb-4">
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

                {/* Test Cases Table */}
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-muted/70">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-12">
                          <input
                            type="checkbox"
                            checked={selectedTestCaseIds.size === testCases.length && testCases.length > 0}
                            onChange={(e) => e.target.checked ? selectAllTestCases() : deselectAllTestCases()}
                            className="rounded"
                          />
                        </th>
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
                        const categoryGroups = new Map<string, TestCase[]>();
                        testCases.forEach((tc) => {
                          const category = tc.category || "General";
                          const group = categoryGroups.get(category) || [];
                          group.push(tc);
                          categoryGroups.set(category, group);
                        });

                        const rows: React.ReactNode[] = [];
                        categoryGroups.forEach((cases, category) => {
                          cases.forEach((tc, idx) => {
                            const isSelected = selectedTestCaseIds.has(tc.id);
                            
                            rows.push(
                              <tr key={tc.id} className={`
                                ${idx === 0 ? 'border-t-2 border-t-border' : ''} 
                                ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}
                                transition-colors
                              `}>
                                {idx === 0 && (
                                  <td
                                    rowSpan={cases.length}
                                    className="px-4 py-3 align-middle text-center bg-muted/20 border-r border-border"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={cases.every(c => selectedTestCaseIds.has(c.id))}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedTestCaseIds(prev => {
                                            const newSet = new Set(prev);
                                            cases.forEach(c => newSet.add(c.id));
                                            return newSet;
                                          });
                                        } else {
                                          setSelectedTestCaseIds(prev => {
                                            const newSet = new Set(prev);
                                            cases.forEach(c => newSet.delete(c.id));
                                            return newSet;
                                          });
                                        }
                                      }}
                                      className="rounded"
                                    />
                                  </td>
                                )}
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
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleTestCase(tc.id)}
                                      className="rounded"
                                    />
                                    <span className="text-sm font-medium text-foreground">{tc.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-sm text-muted-foreground line-clamp-2" title={tc.scenario}>
                                    {tc.scenario}
                                  </p>
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
              </>
            )}
          </div>

          {/* Test Run Configuration */}
          {testCases.length > 0 && (
            <div className="border rounded-lg p-6 bg-muted/30 space-y-4">
              <h3 className="font-semibold">Test Run Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Call Batching Toggle */}
                <div className="p-4 border rounded-lg bg-background space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Call Batching</Label>
                      <p className="text-xs text-muted-foreground">
                        {batchingEnabled 
                          ? "Group by category - each category = 1 call" 
                          : "Each test case = 1 separate call"}
                      </p>
                    </div>
                    <Switch
                      checked={batchingEnabled}
                      onCheckedChange={setBatchingEnabled}
                    />
                  </div>
                </div>

                {/* Concurrency Toggle */}
                <div className="p-4 border rounded-lg bg-background space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Concurrent Calls</Label>
                      <p className="text-xs text-muted-foreground">
                        {concurrencyEnabled 
                          ? `Run ${concurrencyCount} calls in parallel` 
                          : "Run calls sequentially"}
                      </p>
                      {providerLimits && (
                        <p className="text-xs text-slate-600">
                          Provider limit: {providerLimits.concurrencyLimit} concurrent calls
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={concurrencyEnabled}
                      onCheckedChange={setConcurrencyEnabled}
                    />
                  </div>
                  {concurrencyEnabled && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Parallel calls:</Label>
                        <Select
                          value={String(concurrencyCount)}
                          onValueChange={(v) => {
                            const newValue = Number(v);
                            if (providerLimits && newValue > providerLimits.concurrencyLimit) {
                              setShowConcurrencyWarning(true);
                              setConcurrencyCount(providerLimits.concurrencyLimit);
                            } else {
                              setShowConcurrencyWarning(false);
                              setConcurrencyCount(newValue);
                            }
                          }}
                        >
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5, 6, 8, 10].map((n) => {
                              const exceedsLimit = providerLimits && n > providerLimits.concurrencyLimit;
                              return (
                                <SelectItem 
                                  key={n} 
                                  value={String(n)}
                                  disabled={exceedsLimit || false}
                                  className={exceedsLimit ? "text-muted-foreground" : ""}
                                >
                                  {n}{exceedsLimit ? " (exceeds limit)" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      {showConcurrencyWarning && providerLimits && (
                        <div className="p-2 bg-slate-100 border border-slate-300 rounded text-xs text-slate-700">
                          Your {providerLimits.provider} account has a limit of {providerLimits.concurrencyLimit} concurrent calls. 
                          Concurrency has been adjusted automatically.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Test Summary */}
                <div className="p-4 border rounded-lg bg-background">
                  <Label className="text-sm font-medium">Test Summary</Label>
                  <div className="mt-2 space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Selected Test Cases:</span> {selectedTestCaseIds.size}</p>
                    <p><span className="text-muted-foreground">Categories:</span> {new Set(selectedTestCases.map(tc => tc.category)).size}</p>
                    <p className={`font-medium ${batchingEnabled ? 'text-green-600' : 'text-slate-700'}`}>
                      <span className="text-muted-foreground">Estimated Calls:</span>{' '}
                      {batchingEnabled 
                        ? `~${new Set(selectedTestCases.map(tc => tc.category)).size} calls (batched)`
                        : `${selectedTestCaseIds.size} calls (individual)`}
                    </p>
                    {concurrencyEnabled && (
                      <p className="text-slate-700 font-medium">
                        <span className="text-muted-foreground">Execution:</span>{' '}
                        {concurrencyCount} parallel • ~{Math.ceil(
                          (batchingEnabled 
                            ? new Set(selectedTestCases.map(tc => tc.category)).size 
                            : selectedTestCaseIds.size
                          ) / concurrencyCount
                        )} rounds
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Start Running Tests Button */}
          {testCases.length > 0 && (
            <div className="flex justify-end gap-3 pt-4">
              <Button
                size="lg"
                onClick={handlePlanBatches}
                disabled={selectedTestCaseIds.size === 0 || isStartingTests}
              >
                <Layers className="mr-2 h-5 w-5" />
                Plan Call Batches & Run
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Batch Planning Modal */}
      <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
        <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[90vh] p-6" style={{ maxWidth: '95vw', width: '95vw' }}>
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold">
              {batchingEnabled ? "Call Batch Planning" : "Individual Call Planning"}
            </DialogTitle>
            <DialogDescription>
              {batchingEnabled ? (
                <>
                  Each category = 1 voice call. All test cases in a category will be tested in a single conversation.
                  <span className="block mt-1 text-primary font-medium">
                    Drag test cases between categories to reorganize batches.
                  </span>
                </>
              ) : (
                <>
                  Each test case = 1 separate voice call. Tests will run {concurrencyEnabled ? `with ${concurrencyCount} parallel calls` : "sequentially"}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Summary Stats */}
          <div className="flex gap-6 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Phone className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{callBatches.length}</p>
                <p className="text-xs text-muted-foreground">Voice Calls</p>
              </div>
            </div>
            {concurrencyEnabled && (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{concurrencyCount}</p>
                  <p className="text-xs text-muted-foreground">Parallel</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Layers className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{callBatches.reduce((sum, b) => sum + b.testCases.length, 0)}</p>
                <p className="text-xs text-muted-foreground">Test Cases</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <PlayCircle className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">~{callBatches.length * 2}min</p>
                <p className="text-xs text-muted-foreground">Est. Duration</p>
              </div>
            </div>
            <div className="ml-auto flex items-center">
              <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                Saving {selectedTestCaseIds.size - callBatches.length} calls vs single-test mode
              </Badge>
            </div>
          </div>

          {/* Calls Table */}
          <div className="overflow-auto max-h-[55vh]">
            <table className="w-full">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-sm w-16">Call</th>
                  <th className="text-left px-4 py-3 font-medium text-sm w-48">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-sm">Test Cases</th>
                  <th className="text-right px-4 py-3 font-medium text-sm w-20">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {callBatches.map((batch, batchIndex) => (
                  <tr 
                    key={batch.id} 
                    className={`transition-colors ${
                      dragOverBatchId === batch.id && draggedTestCase?.fromBatchId !== batch.id
                        ? 'bg-primary/10 ring-2 ring-primary ring-inset'
                        : 'hover:bg-muted/50'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (draggedTestCase && draggedTestCase.fromBatchId !== batch.id) {
                        setDragOverBatchId(batch.id);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverBatchId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedTestCase && draggedTestCase.fromBatchId !== batch.id) {
                        moveTestCase(draggedTestCase.testCase.id, draggedTestCase.fromBatchId, batch.id);
                      }
                      setDraggedTestCase(null);
                      setDragOverBatchId(null);
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        {batchIndex + 1}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={categoryColors[batch.name] || "bg-gray-100 text-gray-800"}>
                        {batch.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {batch.testCases.map((tc, tcIndex) => (
                          <div
                            key={tc.id}
                            draggable
                            onDragStart={(e) => {
                              setDraggedTestCase({ testCase: tc, fromBatchId: batch.id });
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', tc.id);
                            }}
                            onDragEnd={() => {
                              setDraggedTestCase(null);
                              setDragOverBatchId(null);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs group cursor-grab active:cursor-grabbing transition-all ${
                              draggedTestCase?.testCase.id === tc.id ? 'opacity-50 scale-95' : 'hover:bg-muted/80 hover:shadow-sm'
                            }`}
                          >
                            <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 mr-0.5" />
                            <span className="text-muted-foreground">{tcIndex + 1}.</span>
                            <span className="max-w-[200px] truncate">{tc.name}</span>
                            <button
                              className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromBatch(tc.id, batch.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium">{batch.testCases.length}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowBatchModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartBatchedTests}
              disabled={callBatches.length === 0 || isStartingTests}
              size="lg"
            >
              {isStartingTests ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="mr-2 h-4 w-4" />
              )}
              Start {callBatches.length} Batched Calls
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Prompt Modal */}
      <Dialog open={showPromptModal} onOpenChange={setShowPromptModal}>
        <DialogContent className="!max-w-[95vw] !w-[95vw] !max-h-[95vh] !h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Agent Prompt - {selectedAgent?.name}
            </DialogTitle>
            <DialogDescription>
              Full prompt configuration for this agent
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            <pre className="text-sm whitespace-pre-wrap bg-muted p-6 rounded-lg min-h-full">
              {selectedAgent?.prompt || "No prompt configured"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
