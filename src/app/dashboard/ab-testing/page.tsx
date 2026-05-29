"use client";
import { toast } from 'sonner';
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, FlaskConical, Trophy, TrendingUp, Loader2, ArrowRight } from "lucide-react";
import api from "@/lib/api";

interface Agent {
  id: string;
  name: string;
  system_prompt?: string;
}

interface TestCase {
  id: string;
  name: string;
  scenario: string;
  category?: string;
}

interface ABTest {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  prompt_a_label: string;
  prompt_b_label: string;
  winner: 'a' | 'b' | 'tie' | null;
  confidence_level: number | null;
  summary: any;
  created_at: string;
  completed_at: string | null;
}

export default function ABTestingPage() {
  const { getToken } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [abTests, setABTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set());
  
  const [form, setForm] = useState({
    name: "",
    promptA: "",
    promptB: "",
    promptALabel: "Current Prompt",
    promptBLabel: "New Prompt",
  });

  const fetchAgents = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.agents.list, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgents(await res.json());
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    }
  }, [getToken]);

  const fetchTestCases = useCallback(async () => {
    if (!selectedAgentId) return;
    try {
      const token = await getToken();
      const res = await fetch(`${api.endpoints.testCases.list}?agent_id=${selectedAgentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTestCases(await res.json());
    } catch (error) {
      console.error("Failed to fetch test cases:", error);
    }
  }, [getToken, selectedAgentId]);

  const fetchABTests = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const url = selectedAgentId 
        ? `${api.endpoints.abTests.list}?agentId=${selectedAgentId}` 
        : api.endpoints.abTests.list;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setABTests(data.tests || []);
    } catch (error) {
      console.error("Failed to fetch A/B tests:", error);
    } finally {
      setLoading(false);
    }
  }, [getToken, selectedAgentId]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);
  useEffect(() => { fetchTestCases(); }, [fetchTestCases]);
  useEffect(() => { fetchABTests(); }, [fetchABTests]);

  const createABTest = async () => {
    if (!selectedAgentId || !form.promptA || !form.promptB || selectedTestCases.size === 0) {
      toast.error("Please fill all fields and select test cases");
      return;
    }

    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.abTests.create, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          agentId: selectedAgentId,
          name: form.name || `A/B Test - ${new Date().toLocaleDateString()}`,
          promptA: form.promptA,
          promptB: form.promptB,
          promptALabel: form.promptALabel,
          promptBLabel: form.promptBLabel,
          testCaseIds: Array.from(selectedTestCases),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("A/B test started! Results will appear when complete.");
        setShowCreateDialog(false);
        setForm({ name: "", promptA: "", promptB: "", promptALabel: "Current Prompt", promptBLabel: "New Prompt" });
        setSelectedTestCases(new Set());
        await fetchABTests();
      } else {
        toast.error(data.error || "Failed to create A/B test");
      }
    } catch (error) {
      toast.error("Failed to create A/B test");
    } finally {
      setCreating(false);
    }
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6" />
            A/B Prompt Testing
          </h1>
          <p className="text-muted-foreground">
            Compare two prompt versions with statistical significance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => {
            if (selectedAgent?.system_prompt) {
              setForm(prev => ({ ...prev, promptA: selectedAgent.system_prompt || "" }));
            }
            setShowCreateDialog(true);
          }} className="gap-2">
            <Plus className="h-4 w-4" />
            New A/B Test
          </Button>
        </div>
      </div>

      {/* A/B Test Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : abTests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No A/B tests yet. Create one to compare prompt versions.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {abTests.map(test => (
            <Card key={test.id} className={test.status === 'completed' ? 'border-green-200' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{test.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      test.status === 'completed' ? 'default' :
                      test.status === 'running' ? 'secondary' :
                      test.status === 'failed' ? 'destructive' : 'outline'
                    }>
                      {test.status === 'running' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      {test.status}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  {test.prompt_a_label} vs {test.prompt_b_label} • Created {new Date(test.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              
              {test.status === 'completed' && test.summary && (
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Prompt A */}
                    <div className={`p-4 rounded-lg border ${test.winner === 'a' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'bg-muted/30'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {test.winner === 'a' && <Trophy className="h-4 w-4 text-green-500" />}
                        <span className="font-medium text-sm">{test.prompt_a_label}</span>
                      </div>
                      <div className="text-2xl font-bold">{test.summary.promptA?.avgScore?.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">
                        Pass rate: {test.summary.promptA?.passRate?.toFixed(0)}%
                      </div>
                    </div>
                    
                    {/* VS */}
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground mb-1">Confidence</span>
                      <div className="text-lg font-bold">
                        {test.confidence_level ? `${(test.confidence_level * 100).toFixed(1)}%` : '-'}
                      </div>
                      <Progress value={(test.confidence_level || 0) * 100} className="w-full mt-2" />
                      {test.summary.pValue !== undefined && (
                        <span className="text-xs text-muted-foreground mt-1">
                          p = {test.summary.pValue?.toFixed(4)}
                        </span>
                      )}
                      {test.winner === 'tie' && (
                        <Badge variant="outline" className="mt-2">No significant difference</Badge>
                      )}
                      {test.summary.sampleSizeRecommendation && (
                        <span className="text-xs text-orange-500 mt-1 text-center">
                          {test.summary.sampleSizeRecommendation}
                        </span>
                      )}
                    </div>
                    
                    {/* Prompt B */}
                    <div className={`p-4 rounded-lg border ${test.winner === 'b' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'bg-muted/30'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {test.winner === 'b' && <Trophy className="h-4 w-4 text-green-500" />}
                        <span className="font-medium text-sm">{test.prompt_b_label}</span>
                      </div>
                      <div className="text-2xl font-bold">{test.summary.promptB?.avgScore?.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">
                        Pass rate: {test.summary.promptB?.passRate?.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Metric Comparison */}
                  {test.summary.significantMetrics?.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Metric Comparison</h4>
                      <div className="space-y-2">
                        {test.summary.significantMetrics.map((m: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{m.metric}</span>
                            <div className="flex items-center gap-3">
                              <span>{m.promptAValue?.toFixed(1)}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span className={m.improvement > 0 ? 'text-green-600' : m.improvement < 0 ? 'text-red-600' : ''}>
                                {m.promptBValue?.toFixed(1)}
                              </span>
                              {m.significant && (
                                <Badge variant="outline" className="text-xs">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  {m.improvement > 0 ? '+' : ''}{m.improvement?.toFixed(1)}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create A/B Test Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create A/B Prompt Test</DialogTitle>
            <DialogDescription>
              Compare two prompt versions against the same test cases with statistical analysis
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Test Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., v2.1 vs v2.2 comparison"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{form.promptALabel}</Label>
                <Input
                  value={form.promptALabel}
                  onChange={e => setForm(prev => ({ ...prev, promptALabel: e.target.value }))}
                  className="mb-2"
                  placeholder="Label for prompt A"
                />
                <Textarea
                  value={form.promptA}
                  onChange={e => setForm(prev => ({ ...prev, promptA: e.target.value }))}
                  placeholder="Paste your current/baseline prompt here..."
                  className="min-h-[200px] font-mono text-xs"
                />
              </div>
              <div>
                <Label>{form.promptBLabel}</Label>
                <Input
                  value={form.promptBLabel}
                  onChange={e => setForm(prev => ({ ...prev, promptBLabel: e.target.value }))}
                  className="mb-2"
                  placeholder="Label for prompt B"
                />
                <Textarea
                  value={form.promptB}
                  onChange={e => setForm(prev => ({ ...prev, promptB: e.target.value }))}
                  placeholder="Paste your new/improved prompt here..."
                  className="min-h-[200px] font-mono text-xs"
                />
              </div>
            </div>

            {/* Test Case Selection */}
            <div>
              <Label>Select Test Cases ({selectedTestCases.size} selected)</Label>
              <div className="border rounded-md max-h-[200px] overflow-y-auto mt-2">
                {testCases.map(tc => (
                  <div key={tc.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 border-b last:border-0">
                    <Checkbox
                      checked={selectedTestCases.has(tc.id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(selectedTestCases);
                        checked ? next.add(tc.id) : next.delete(tc.id);
                        setSelectedTestCases(next);
                      }}
                    />
                    <div className="flex-1">
                      <span className="text-sm">{tc.name}</span>
                      {tc.category && <Badge variant="outline" className="ml-2 text-xs">{tc.category}</Badge>}
                    </div>
                  </div>
                ))}
                {testCases.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    Select an agent to see test cases
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1"
                onClick={() => setSelectedTestCases(new Set(testCases.map(tc => tc.id)))}
              >
                Select All
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={createABTest} disabled={creating} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              Start A/B Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
