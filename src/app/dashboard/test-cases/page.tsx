"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Sparkles,
  Trash2,
  Play,
  Tag,
  Loader2,
  RefreshCw,
  Layers,
  GripVertical,
} from "lucide-react";
import api from "@/lib/api";

interface KeyTopic {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  testAspects: string[];
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  agent_id: string;
  scenario: string;
  expected_behavior: string;
  key_topic?: string;
  test_type?: string;
  batch_compatible?: boolean;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  provider: string;
  first_message?: string;
  system_prompt?: string;
}

interface CallBatch {
  batchId: number;
  testCaseIds: string[];
  testCases: TestCase[];
  reasoning: string;
  estimatedDuration: string;
}

export default function TestCasesPage() {
  const { getToken } = useAuth();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [keyTopics, setKeyTopics] = useState<KeyTopic[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analyzingBatches, setAnalyzingBatches] = useState(false);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  
  // Form states
  const [newTestCase, setNewTestCase] = useState({
    name: "",
    description: "",
    scenario: "",
    expected_behavior: "",
    key_topic: "",
  });
  
  // Batch states
  const [callBatches, setCallBatches] = useState<CallBatch[]>([]);
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set());
  
  // Active tab (topic filter)
  const [activeTab, setActiveTab] = useState<string>("all");

  const fetchAgents = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.agents.list, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAgents(data);
      if (data.length > 0) {
        setSelectedAgentId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    }
  }, [getToken]);

  const fetchTestCases = useCallback(async () => {
    if (!selectedAgentId) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${api.endpoints.testCases.list}?agent_id=${selectedAgentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTestCases(data);
      
      // Extract unique topics from test cases
      const topics = new Set<string>();
      data.forEach((tc: TestCase) => {
        if (tc.key_topic) topics.add(tc.key_topic);
      });
      // We'll populate keyTopics from the generate response
    } catch (error) {
      console.error("Failed to fetch test cases:", error);
    } finally {
      setLoading(false);
    }
  }, [getToken, selectedAgentId]);

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Fetch test cases when agent changes
  useEffect(() => {
    fetchTestCases();
  }, [fetchTestCases]);

  const generateSmartTestCases = async () => {
    if (!selectedAgentId) return;
    
    setGenerating(true);
    try {
      const token = await getToken();
      const selectedAgent = agents.find(a => a.id === selectedAgentId);
      
      // Call the smart generation endpoint
      const res = await fetch(`${api.baseUrl}/api/test-execution/generate-smart-test-cases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId: selectedAgentId,
          prompt: selectedAgent?.system_prompt || "",
          firstMessage: selectedAgent?.first_message || "",
        }),
      });
      
      const data = await res.json();
      
      if (data.keyTopics) {
        setKeyTopics(data.keyTopics);
      }
      
      if (data.testCases && data.testCases.length > 0) {
        // Create test cases in bulk
        const bulkRes = await fetch(api.endpoints.testCases.bulk, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            test_cases: data.testCases.map((tc: { name: string; description: string; scenario: string; expectedBehavior: string; keyTopic: string; testType: string; batchCompatible: boolean }) => ({
              name: tc.name,
              description: tc.description,
              agent_id: selectedAgentId,
              scenario: tc.scenario,
              expected_behavior: tc.expectedBehavior,
              key_topic: tc.keyTopic,
              test_type: tc.testType,
              batch_compatible: tc.batchCompatible,
            })),
          }),
        });
        
        if (bulkRes.ok) {
          await fetchTestCases();
        }
      }
      
      setShowGenerateDialog(false);
    } catch (error) {
      console.error("Failed to generate test cases:", error);
    } finally {
      setGenerating(false);
    }
  };
  const analyzeForBatching = async () => {
    if (selectedTestCases.size === 0) {
      alert("Please select test cases to batch");
      return;
    }
    
    setAnalyzingBatches(true);
    try {
      const token = await getToken();
      const selectedTCs = testCases.filter(tc => selectedTestCases.has(tc.id));
      
      const res = await fetch(api.endpoints.testExecution.analyzeForBatching, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          testCases: selectedTCs,
        }),
      });
      
      const data = await res.json();
      
      if (data.batches) {
        // Map test case IDs to actual test cases
        interface BatchData {
          testCaseIds: string[];
          reasoning: string;
          estimatedDuration?: string;
        }
        const batchesWithTestCases: CallBatch[] = data.batches.map((batch: BatchData, idx: number) => ({
          batchId: idx + 1,
          testCaseIds: batch.testCaseIds,
          testCases: batch.testCaseIds.map((id: string) => testCases.find(tc => tc.id === id)).filter(Boolean) as TestCase[],
          reasoning: batch.reasoning,
          estimatedDuration: batch.estimatedDuration || "2-3 minutes",
        }));
        
        setCallBatches(batchesWithTestCases);
        setShowBatchDialog(true);
      }
    } catch (error) {
      console.error("Failed to analyze batches:", error);
    } finally {
      setAnalyzingBatches(false);
    }
  };

  const startBatchedExecution = async () => {
    try {
      const token = await getToken();
      
      // First create a test run
      const runRes = await fetch(api.endpoints.testRuns.create, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: `Batched Run - ${new Date().toLocaleString()}`,
          agent_id: selectedAgentId,
          test_case_ids: Array.from(selectedTestCases),
        }),
      });
      
      const testRun = await runRes.json();
      
      // Start batched execution
      const res = await fetch(api.endpoints.testExecution.startBatched, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          testRunId: testRun.id,
          callBatches: callBatches.map(b => ({
            testCaseIds: b.testCaseIds,
            reasoning: b.reasoning,
          })),
        }),
      });
      
      if (res.ok) {
        setShowBatchDialog(false);
        setSelectedTestCases(new Set());
        // Navigate to test run page
        window.location.href = `/dashboard/test-runs/${testRun.id}`;
      }
    } catch (error) {
      console.error("Failed to start batched execution:", error);
    }
  };

  const createTestCase = async () => {
    if (!selectedAgentId || !newTestCase.name || !newTestCase.scenario) return;
    
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.testCases.create, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newTestCase,
          agent_id: selectedAgentId,
        }),
      });
      
      if (res.ok) {
        await fetchTestCases();
        setShowAddDialog(false);
        setNewTestCase({
          name: "",
          description: "",
          scenario: "",
          expected_behavior: "",
          key_topic: "",
        });
      }
    } catch (error) {
      console.error("Failed to create test case:", error);
    }
  };

  const deleteTestCase = async (id: string) => {
    if (!confirm("Are you sure you want to delete this test case?")) return;
    
    try {
      const token = await getToken();
      await fetch(api.endpoints.testCases.delete(id), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchTestCases();
    } catch (error) {
      console.error("Failed to delete test case:", error);
    }
  };

  const toggleTestCaseSelection = (id: string) => {
    const newSelected = new Set(selectedTestCases);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTestCases(newSelected);
  };

  const selectAllInTopic = (topic: string) => {
    const newSelected = new Set(selectedTestCases);
    const topicTestCases = topic === "all" 
      ? testCases 
      : testCases.filter(tc => tc.key_topic === topic);
    
    topicTestCases.forEach(tc => newSelected.add(tc.id));
    setSelectedTestCases(newSelected);
  };

  const getFilteredTestCases = () => {
    if (activeTab === "all") return testCases;
    return testCases.filter(tc => tc.key_topic === activeTab);
  };

  const getUniqueTopics = () => {
    const topics = new Set<string>();
    testCases.forEach(tc => {
      if (tc.key_topic) topics.add(tc.key_topic);
    });
    return Array.from(topics);
  };

  const getPriorityColor = (priority: string): "destructive" | "default" | "secondary" | "outline" => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Cases</h1>
          <p className="text-muted-foreground">
            Manage and generate test cases for your AI agents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Topics Section */}
      {keyTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Key Topics Identified
            </CardTitle>
            <CardDescription>
              Topics extracted from the agent&apos;s prompt for comprehensive testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {keyTopics.map((topic, idx) => (
                <Card key={idx} className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{topic.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {topic.description}
                        </p>
                      </div>
                      <Badge variant={getPriorityColor(topic.priority)}>
                        {topic.priority}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {topic.testAspects.slice(0, 3).map((aspect, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {aspect}
                        </Badge>
                      ))}
                      {topic.testAspects.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{topic.testAspects.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" />
                Auto Generate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Smart Test Cases</DialogTitle>
                <DialogDescription>
                  AI will analyze your agent&apos;s prompt and generate comprehensive test cases
                  covering all key topics and edge cases.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {selectedAgent && (
                  <div className="space-y-4">
                    <div>
                      <Label>Agent</Label>
                      <p className="text-sm font-medium">{selectedAgent.name}</p>
                    </div>
                    <div>
                      <Label>What will be analyzed:</Label>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>• Agent&apos;s system prompt and instructions</li>
                        <li>• First message and conversation flow</li>
                        <li>• Key topics (eligibility, budget, objections, etc.)</li>
                        <li>• Edge cases and error scenarios</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={generateSmartTestCases} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Test Cases
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Manual
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Test Case</DialogTitle>
                <DialogDescription>
                  Create a new test case manually
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Budget Objection Handling"
                    value={newTestCase.name}
                    onChange={(e) => setNewTestCase({ ...newTestCase, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Brief description of what this test validates"
                    value={newTestCase.description}
                    onChange={(e) => setNewTestCase({ ...newTestCase, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="scenario">Scenario / Caller Persona</Label>
                  <Textarea
                    id="scenario"
                    placeholder="Describe how the test caller should behave..."
                    value={newTestCase.scenario}
                    onChange={(e) => setNewTestCase({ ...newTestCase, scenario: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expected">Expected Behavior</Label>
                  <Textarea
                    id="expected"
                    placeholder="What should the agent do in response..."
                    value={newTestCase.expected_behavior}
                    onChange={(e) => setNewTestCase({ ...newTestCase, expected_behavior: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="topic">Key Topic (Optional)</Label>
                  <Select
                    value={newTestCase.key_topic}
                    onValueChange={(v) => setNewTestCase({ ...newTestCase, key_topic: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No topic</SelectItem>
                      {getUniqueTopics().map((topic) => (
                        <SelectItem key={topic} value={topic}>
                          {topic}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">+ Custom topic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createTestCase}>Create Test Case</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={fetchTestCases} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {selectedTestCases.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedTestCases.size} selected
              </span>
              <Button
                onClick={analyzeForBatching}
                disabled={analyzingBatches}
                className="gap-2"
              >
                {analyzingBatches ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Layers className="h-4 w-4" />
                    Create Call Batches
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Test Cases Table with Topic Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Test Cases</CardTitle>
          <CardDescription>
            {testCases.length} test cases for {selectedAgent?.name || "selected agent"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">
                  All ({testCases.length})
                </TabsTrigger>
                {getUniqueTopics().map((topic) => (
                  <TabsTrigger key={topic} value={topic}>
                    {topic} ({testCases.filter(tc => tc.key_topic === topic).length})
                  </TabsTrigger>
                ))}
              </TabsList>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectAllInTopic(activeTab)}
              >
                Select All
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : getFilteredTestCases().length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No test cases found.</p>
                <p className="text-sm mt-1">
                  Click &quot;Auto Generate&quot; to create test cases automatically.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Scenario</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredTestCases().map((testCase) => (
                    <TableRow key={testCase.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTestCases.has(testCase.id)}
                          onCheckedChange={() => toggleTestCaseSelection(testCase.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{testCase.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {testCase.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {testCase.key_topic && (
                          <Badge variant="outline">{testCase.key_topic}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {testCase.test_type && (
                          <Badge variant="secondary">{testCase.test_type}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {testCase.scenario}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTestCase(testCase.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Call Batching Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Call Batching Plan
            </DialogTitle>
            <DialogDescription>
              AI has organized your test cases into optimal call batches. 
              Each batch will be tested in a single voice conversation.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {callBatches.map((batch) => (
                <Card key={batch.batchId} className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Call #{batch.batchId}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {batch.testCases.length} test cases
                        </Badge>
                        <Badge variant="secondary">
                          ~{batch.estimatedDuration}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>{batch.reasoning}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {batch.testCases.map((tc, idx) => (
                        <div
                          key={tc.id}
                          className="flex items-center gap-3 p-2 bg-background rounded-md"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium w-6">{idx + 1}.</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{tc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {tc.key_topic && <span className="mr-2">[{tc.key_topic}]</span>}
                              {tc.scenario?.slice(0, 80)}...
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Total: {callBatches.length} calls for {selectedTestCases.size} test cases
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
                Cancel
              </Button>
              <Button onClick={startBatchedExecution} className="gap-2">
                <Play className="h-4 w-4" />
                Start Batched Execution
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
