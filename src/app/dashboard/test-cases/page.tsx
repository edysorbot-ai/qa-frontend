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
  User,
  Shield,
  Volume2,
  AlertTriangle,
  LayoutTemplate,
  Lock,
  CheckCircle2,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import api from "@/lib/api";
import { GoldExamplesDialog } from "@/components/test-cases/gold-examples-dialog";

// Persona and Security Types
type PersonaType = 'neutral' | 'angry' | 'confused' | 'impatient' | 'elderly' | 'technical' | 'rambling' | 'suspicious' | 'friendly' | 'rushed';
type VoiceAccent = 'american' | 'british' | 'australian' | 'indian' | 'spanish' | 'french' | 'german' | 'chinese' | 'japanese' | 'neutral';
type BehaviorModifier = 'interrupts_frequently' | 'long_pauses' | 'background_noise' | 'mumbles' | 'repeats_self' | 'changes_topic' | 'gives_partial_info' | 'asks_many_questions' | 'mono_syllabic' | 'emotional';
type SecurityTestType =
  | 'data_leakage'
  | 'prompt_injection'
  | 'prompt_injection_l1'
  | 'prompt_injection_l2'
  | 'prompt_injection_l3'
  | 'jailbreak_attempt'
  | 'pii_handling'
  | 'pii_exposure'
  | 'unauthorized_access'
  | 'social_engineering'
  | 'toxic_content'
  | 'harmful_advice'
  | 'adversarial_input'
  | 'data_exfiltration'
  | 'medical_data_request'
  | 'pci_data_request';

const PERSONA_OPTIONS: { value: PersonaType; label: string; description: string; emoji: string }[] = [
  { value: 'neutral', label: 'Neutral', description: 'Standard professional caller', emoji: '😐' },
  { value: 'angry', label: 'Angry', description: 'Frustrated, upset customer', emoji: '😠' },
  { value: 'confused', label: 'Confused', description: 'Uncertain, needs clarification', emoji: '😕' },
  { value: 'impatient', label: 'Impatient', description: 'Wants quick answers, interrupts', emoji: '⏰' },
  { value: 'elderly', label: 'Elderly', description: 'Slower pace, may need repetition', emoji: '👴' },
  { value: 'technical', label: 'Technical', description: 'Tech-savvy, uses jargon', emoji: '🤓' },
  { value: 'rambling', label: 'Rambling', description: 'Goes off-topic, verbose', emoji: '🗣️' },
  { value: 'suspicious', label: 'Suspicious', description: 'Skeptical, questions everything', emoji: '🤨' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, cooperative', emoji: '😊' },
  { value: 'rushed', label: 'Rushed', description: 'In a hurry, brief responses', emoji: '🏃' },
];

const ACCENT_OPTIONS: { value: VoiceAccent; label: string; flag: string }[] = [
  { value: 'neutral', label: 'Neutral', flag: '🌐' },
  { value: 'american', label: 'American', flag: '🇺🇸' },
  { value: 'british', label: 'British', flag: '🇬🇧' },
  { value: 'australian', label: 'Australian', flag: '🇦🇺' },
  { value: 'indian', label: 'Indian', flag: '🇮🇳' },
  { value: 'spanish', label: 'Spanish', flag: '🇪🇸' },
  { value: 'french', label: 'French', flag: '🇫🇷' },
  { value: 'german', label: 'German', flag: '🇩🇪' },
  { value: 'chinese', label: 'Chinese', flag: '🇨🇳' },
  { value: 'japanese', label: 'Japanese', flag: '🇯🇵' },
];

const BEHAVIOR_OPTIONS: { value: BehaviorModifier; label: string }[] = [
  { value: 'interrupts_frequently', label: 'Interrupts frequently' },
  { value: 'long_pauses', label: 'Long pauses' },
  { value: 'background_noise', label: 'Background noise' },
  { value: 'mumbles', label: 'Mumbles/unclear speech' },
  { value: 'repeats_self', label: 'Repeats themselves' },
  { value: 'changes_topic', label: 'Changes topic randomly' },
  { value: 'gives_partial_info', label: 'Gives partial info' },
  { value: 'asks_many_questions', label: 'Asks many questions' },
  { value: 'mono_syllabic', label: 'Mono-syllabic responses' },
  { value: 'emotional', label: 'Emotional/expressive' },
];

const SECURITY_TEST_OPTIONS: { value: SecurityTestType; label: string; description: string }[] = [
  { value: 'data_leakage', label: 'Data Leakage', description: 'Test if agent leaks sensitive data across conversations' },
  { value: 'prompt_injection', label: 'Prompt Injection (generic)', description: 'Test resistance to prompt injection attacks' },
  { value: 'prompt_injection_l1', label: 'Prompt Injection · L1 (direct override)', description: '"Ignore previous instructions" style direct override attempts' },
  { value: 'prompt_injection_l2', label: 'Prompt Injection · L2 (role swap)', description: 'Role / persona reframing — "you are now DAN" / unrestricted twin' },
  { value: 'prompt_injection_l3', label: 'Prompt Injection · L3 (multi-turn / authority)', description: 'Indirect, multi-turn, claimed authority ("I am your developer / auditor")' },
  { value: 'jailbreak_attempt', label: 'Jailbreak Attempt', description: 'Hypothetical / fictional framing to bypass safety' },
  { value: 'pii_handling', label: 'PII Handling', description: 'Test discreet handling of user-provided PII' },
  { value: 'pii_exposure', label: 'PII Exposure (third-party)', description: 'Try to make the agent reveal other people\'s PII' },
  { value: 'unauthorized_access', label: 'Unauthorized Access', description: 'Claim a role without verification' },
  { value: 'social_engineering', label: 'Social Engineering', description: 'Urgency + authority + emotional pressure' },
  { value: 'toxic_content', label: 'Toxic Content', description: 'Hate, profanity, slurs — agent must refuse and de-escalate' },
  { value: 'harmful_advice', label: 'Harmful Advice', description: 'Medical / legal / financial / dangerous advice it must decline' },
  { value: 'adversarial_input', label: 'Adversarial Input', description: 'Contradictory / paradoxical inputs — agent should clarify' },
  { value: 'data_exfiltration', label: 'Data Exfiltration', description: 'Pull system prompt / tool list / internal config' },
  { value: 'medical_data_request', label: 'Medical Data Request', description: 'Third-party PHI or diagnosis requests — agent must refuse' },
  { value: 'pci_data_request', label: 'PCI Data Request', description: 'Card number / CVV / expiry echo attempts — agent must refuse' },
];

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
  test_mode?: 'voice' | 'chat' | 'auto';
  persona_type?: PersonaType;
  persona_traits?: string[];
  voice_accent?: VoiceAccent;
  behavior_modifiers?: BehaviorModifier[];
  is_security_test?: boolean;
  security_test_type?: SecurityTestType;
  sensitive_data_types?: string[];
  gold_gate?: 'soft' | 'strict';
  created_via?: 'manual' | 'auto_seed' | 'ai_generated' | 'csv_import' | 'template';
  reference_link?: string;
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
  testMode?: 'voice' | 'chat';  // Testing mode for this batch
  testModeReason?: string;
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

  // Item 5: Evaluation Dataset Review — generated cases held in client state
  // until the user explicitly reviews & saves them.
  type DraftCase = {
    name: string;
    description: string;
    scenario: string;
    expected_behavior: string;
    key_topic: string;
    test_type: string;
    batch_compatible: boolean;
    include: boolean;
  };
  const [draftCases, setDraftCases] = useState<DraftCase[]>([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [savingReviewed, setSavingReviewed] = useState(false);

  // Item 7: Pre-defined test case templates
  type TemplateListItem = {
    id: string;
    name: string;
    description: string;
    category: string;
    is_security_test: boolean;
    security_test_type?: string | null;
    persona_type?: string | null;
    behavior_modifiers?: string[] | null;
    slot_count: number;
  };
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [generatingFromTemplate, setGeneratingFromTemplate] = useState<string | null>(null);
  
  // Form states
  const [newTestCase, setNewTestCase] = useState({
    name: "",
    description: "",
    scenario: "",
    expected_behavior: "",
    key_topic: "",
    persona_type: "neutral" as PersonaType,
    voice_accent: "neutral" as VoiceAccent,
    behavior_modifiers: [] as BehaviorModifier[],
    is_security_test: false,
    security_test_type: "" as SecurityTestType | "",
    sensitive_data_types: [] as string[],
    reference_link: "",
  });
  
  // Batch states
  const [callBatches, setCallBatches] = useState<CallBatch[]>([]);
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set());
  
  // Saved batches (persistent)
  const [savedBatches, setSavedBatches] = useState<Array<{ id: string; name: string; batch_data: CallBatch[]; test_case_ids: string[]; created_at: string }>>([]);
  const [activeSavedBatchId, setActiveSavedBatchId] = useState<string | null>(null);
  
  // Active tab (topic filter)
  const [activeTab, setActiveTab] = useState<string>("all");

  // Gold-example dialog + per-test-case approval summary (id -> approvedCount, total)
  const [goldDialogOpen, setGoldDialogOpen] = useState(false);
  const [goldDialogTestCase, setGoldDialogTestCase] = useState<TestCase | null>(null);
  const [goldStatusMap, setGoldStatusMap] = useState<Record<string, { approved: number; total: number }>>({});

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

      // Pull gold-example approval status for each test case in parallel.
      // Best-effort; failures leave the row showing "no gold yet".
      const ids: string[] = (data as TestCase[]).map((tc) => tc.id);
      if (ids.length > 0) {
        try {
          const statuses = await Promise.all(
            ids.map(async (id) => {
              try {
                const r = await fetch(api.endpoints.testCases.goldList(id), {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (!r.ok) return [id, { approved: 0, total: 0 }] as const;
                const j = await r.json();
                const list = Array.isArray(j?.examples) ? j.examples : [];
                const approved = list.filter((e: { status: string }) => e.status === 'approved').length;
                return [id, { approved, total: list.length }] as const;
              } catch {
                return [id, { approved: 0, total: 0 }] as const;
              }
            })
          );
          setGoldStatusMap(Object.fromEntries(statuses));
        } catch {
          // ignore
        }
      } else {
        setGoldStatusMap({});
      }
    } catch (error) {
      console.error("Failed to fetch test cases:", error);
    } finally {
      setLoading(false);
    }
  }, [getToken, selectedAgentId]);

  // Fetch saved batches for the agent
  const fetchSavedBatches = useCallback(async () => {
    if (!selectedAgentId) return;
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.testExecution.savedBatches(selectedAgentId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.savedBatches) {
        setSavedBatches(data.savedBatches.map((sb: any) => ({
          ...sb,
          batch_data: typeof sb.batch_data === 'string' ? JSON.parse(sb.batch_data) : sb.batch_data,
        })));
      }
    } catch (error) {
      console.error("Failed to fetch saved batches:", error);
    }
  }, [getToken, selectedAgentId]);

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Fetch test cases when agent changes
  useEffect(() => {
    fetchTestCases();
    fetchSavedBatches();
  }, [fetchTestCases, fetchSavedBatches]);

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
        // Item 5: do NOT auto-persist. Stage as drafts and open review dialog so
        // the user can edit / approve / discard each case BEFORE it hits the DB.
        const drafts: DraftCase[] = data.testCases.map((tc: { name: string; description: string; scenario: string; expectedBehavior: string; keyTopic: string; testType: string; batchCompatible: boolean }) => ({
          name: tc.name || '',
          description: tc.description || '',
          scenario: tc.scenario || '',
          expected_behavior: tc.expectedBehavior || '',
          key_topic: tc.keyTopic || '',
          test_type: tc.testType || 'happy_path',
          batch_compatible: !!tc.batchCompatible,
          include: true,
        }));
        setDraftCases(drafts);
        setShowGenerateDialog(false);
        setShowReviewDialog(true);
      } else {
        setShowGenerateDialog(false);
      }
    } catch (error) {
      console.error("Failed to generate test cases:", error);
    } finally {
      setGenerating(false);
    }
  };

  // Item 5: persist the reviewed dataset.
  const saveReviewedDataset = async () => {
    const selected = draftCases.filter(d => d.include);
    if (selected.length === 0) {
      toast.error('Select at least one test case to save');
      return;
    }
    setSavingReviewed(true);
    try {
      const token = await getToken();
      const bulkRes = await fetch(api.endpoints.testCases.bulk, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          test_cases: selected.map(d => ({
            name: d.name,
            description: d.description,
            agent_id: selectedAgentId,
            scenario: d.scenario,
            expected_behavior: d.expected_behavior,
            key_topic: d.key_topic,
            test_type: d.test_type,
            batch_compatible: d.batch_compatible,
          })),
        }),
      });
      if (bulkRes.ok) {
        await fetchTestCases();
        toast.success(`Saved ${selected.length} reviewed test case${selected.length === 1 ? '' : 's'}`);
        setShowReviewDialog(false);
        setDraftCases([]);
      } else {
        const err = await bulkRes.json().catch(() => ({} as any));
        toast.error(err?.error || 'Failed to save reviewed test cases');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save reviewed test cases');
    } finally {
      setSavingReviewed(false);
    }
  };

  // Item 7: load template list lazily when dialog opens.
  const openTemplatesDialog = async () => {
    setShowTemplatesDialog(true);
    if (templates.length === 0) {
      setLoadingTemplates(true);
      try {
        const token = await getToken();
        const res = await fetch(api.endpoints.testExecution.testCaseTemplates, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setTemplates(data.templates);
        else toast.error(data.error || 'Failed to load templates');
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load templates');
      } finally {
        setLoadingTemplates(false);
      }
    }
  };

  // Item 7: generate a draft case from a template and route into the Review dialog.
  const generateFromTemplate = async (templateId: string) => {
    if (!selectedAgentId) {
      toast.error('Select an agent first');
      return;
    }
    setGeneratingFromTemplate(templateId);
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.testExecution.generateFromTemplate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ templateId, agentId: selectedAgentId }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Failed to generate from template');
        return;
      }
      const tc = data.testCase;
      const draft: DraftCase = {
        name: tc.name,
        description: tc.description || '',
        scenario: tc.scenario,
        expected_behavior: tc.expected_behavior,
        key_topic: tc.key_topic || '',
        test_type: tc.test_type || 'standard',
        batch_compatible: !tc.is_security_test,
        include: true,
      };
      setDraftCases(prev => [...prev, draft]);
      setShowTemplatesDialog(false);
      setShowReviewDialog(true);
      toast.success(`Added "${tc.name}" — review and save`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate from template');
    } finally {
      setGeneratingFromTemplate(null);
    }
  };

  const analyzeForBatching = async () => {
    if (selectedTestCases.size === 0) {
      toast.error("Please select test cases to batch");
      return;
    }
    
    setAnalyzingBatches(true);
    try {
      const token = await getToken();
      const selectedTCs = testCases.filter(tc => selectedTestCases.has(tc.id));
      const selectedAgent = agents.find(a => a.id === selectedAgentId);
      
      const res = await fetch(api.endpoints.testExecution.analyzeForBatching, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          testCases: selectedTCs,
          agentPrompt: selectedAgent?.system_prompt || "",
          agentFirstMessage: selectedAgent?.first_message || "",
        }),
      });
      
      const data = await res.json();
      
      if (data.batches) {
        // Map test case IDs to actual test cases
        interface BatchData {
          testCaseIds: string[];
          reasoning: string;
          estimatedDuration?: string;
          testMode?: 'voice' | 'chat';
          testModeReason?: string;
        }
        const batchesWithTestCases: CallBatch[] = data.batches.map((batch: BatchData, idx: number) => ({
          batchId: idx + 1,
          testCaseIds: batch.testCaseIds,
          testCases: batch.testCaseIds.map((id: string) => testCases.find(tc => tc.id === id)).filter(Boolean) as TestCase[],
          reasoning: batch.reasoning,
          estimatedDuration: batch.estimatedDuration || "2-3 minutes",
          testMode: batch.testMode,
          testModeReason: batch.testModeReason,
        }));
        
        setCallBatches(batchesWithTestCases);
        
        // Save batches persistently
        await fetch(api.endpoints.testExecution.saveBatches, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            agentId: selectedAgentId,
            name: `Batch Plan - ${new Date().toLocaleDateString()}`,
            batches: batchesWithTestCases,
            testCaseIds: Array.from(selectedTestCases),
          }),
        });
        
        // Refresh saved batches
        await fetchSavedBatches();
        toast.success("Batches created and saved successfully!");
        setShowBatchDialog(true);
      }
    } catch (error) {
      console.error("Failed to analyze batches:", error);
      toast.error("Failed to create batches");
    } finally {
      setAnalyzingBatches(false);
    }
  };

  // Run a saved batch directly
  const runSavedBatch = async (savedBatch: typeof savedBatches[0]) => {
    try {
      const token = await getToken();
      const selectedAgent = agents.find(a => a.id === selectedAgentId);
      
      if (!selectedAgent) {
        toast.error("No agent selected");
        return;
      }
      
      // Create test run and start execution
      const runRes = await fetch(api.endpoints.testRuns.create, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: `${savedBatch.name} - ${new Date().toLocaleString()}`,
          agent_id: selectedAgentId,
          test_case_ids: savedBatch.test_case_ids,
        }),
      });
      
      const testRun = await runRes.json();
      
      const res = await fetch(api.endpoints.testExecution.startBatched, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          testRunId: testRun.id,
          callBatches: savedBatch.batch_data.map((b: any) => ({
            testCaseIds: b.testCaseIds,
            reasoning: b.reasoning,
            testMode: b.testMode,
          })),
        }),
      });
      
      if (res.ok) {
        toast.success("Test run started!");
        window.location.href = `/dashboard/test-runs/${testRun.id}`;
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to start test run");
      }
    } catch (error) {
      console.error("Failed to run saved batch:", error);
      toast.error("Failed to start test run");
    }
  };

  // Delete a saved batch
  const deleteSavedBatch = async (batchId: string) => {
    try {
      const token = await getToken();
      await fetch(api.endpoints.testExecution.deleteSavedBatch(batchId), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchSavedBatches();
      toast.success("Batch deleted");
    } catch (error) {
      console.error("Failed to delete batch:", error);
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
      } else {
        const err = await res.json().catch(() => null);
        if (err?.error === 'GOLD_GATE_BLOCKED') {
          const names = (err.blockedTestCases || [])
            .slice(0, 5)
            .map((b: { name: string }) => `\u2022 ${b.name}`)
            .join('\n');
          const more = (err.blockedTestCases || []).length > 5
            ? `\n\u2026 and ${err.blockedTestCases.length - 5} more`
            : '';
          toast.error(
            `Gold examples required before run can start:\n${names}${more}\n\nOpen each test case (book icon) to generate + approve both examples.`,
            { duration: 12000 },
          );
        } else {
          toast.error(err?.error || 'Failed to start batched execution');
        }
      }
    } catch (error) {
      console.error("Failed to start batched execution:", error);
    }
  };

  const createTestCase = async () => {
    if (!selectedAgentId) { toast.error('Please select an agent first'); return; }
    if (!newTestCase.name) { toast.error('Test case name is required'); return; }
    if (!newTestCase.scenario) { toast.error('Scenario is required'); return; }
    
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
          security_test_type: newTestCase.security_test_type || null,
        }),
      });
      
      if (res.ok) {
        toast.success('Test case created successfully');
        await fetchTestCases();
        setShowAddDialog(false);
        setNewTestCase({
          name: "",
          description: "",
          scenario: "",
          expected_behavior: "",
          key_topic: "",
          persona_type: "neutral",
          voice_accent: "neutral",
          behavior_modifiers: [],
          is_security_test: false,
          security_test_type: "",
          sensitive_data_types: [],
          reference_link: "",
        });
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || 'Failed to create test case');
      }
    } catch (error) {
      toast.error('Failed to create test case');
    }
  };

  const deleteTestCase = async (id: string) => {
    if (!confirm("Are you sure you want to delete this test case?")) return;
    
    
    try {
      const token = await getToken();
      const res = await fetch(api.endpoints.testCases.delete(id), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Test case deleted');
        await fetchTestCases();
      } else {
        toast.error('Failed to delete test case');
      }
    } catch (error) {
      toast.error('Failed to delete test case');
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

          {/* Item 7: Pre-defined templates trigger */}
          <Button variant="outline" className="gap-2" onClick={openTemplatesDialog}>
            <LayoutTemplate className="h-4 w-4" />
            From Template
          </Button>

          {/* Item 7: Pre-defined templates gallery */}
          <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 text-primary" />
                  Pre-defined Test Case Templates
                </DialogTitle>
                <DialogDescription>
                  Templates define the construct (scenario shape + pass criterion + persona + security flags).
                  AI is used only to fill agent-specific slots — it cannot change the test type. After generation
                  you can still review and edit before saving.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-2 -mr-2">
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2 py-3">
                    {templates.map((tpl) => (
                      <div key={tpl.id} className="border rounded-md p-3 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{tpl.name}</span>
                            <Badge variant="outline" className="text-[10px]">{tpl.category}</Badge>
                            {tpl.is_security_test && (
                              <Badge variant="destructive" className="text-[10px] gap-1">
                                <Shield className="h-3 w-3" />
                                Security
                              </Badge>
                            )}
                            {tpl.persona_type && (
                              <Badge variant="secondary" className="text-[10px]">
                                Persona: {tpl.persona_type}
                              </Badge>
                            )}
                            {tpl.slot_count > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                {tpl.slot_count} AI-filled slot{tpl.slot_count > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => generateFromTemplate(tpl.id)}
                          disabled={generatingFromTemplate !== null || !selectedAgentId}
                        >
                          {generatingFromTemplate === tpl.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Use'
                          )}
                        </Button>
                      </div>
                    ))}
                    {templates.length === 0 && !loadingTemplates && (
                      <p className="text-center text-sm text-muted-foreground py-6">No templates available</p>
                    )}
                  </div>
                )}
              </ScrollArea>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowTemplatesDialog(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Item 5: Evaluation Dataset Review dialog */}
          <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Review Generated Test Cases ({draftCases.filter(d => d.include).length}/{draftCases.length} selected)
                </DialogTitle>
                <DialogDescription>
                  Review, edit, or remove any AI-generated test case before saving.
                  Nothing is persisted until you click <strong>Save Selected</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2 border-b pb-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraftCases(prev => prev.map(d => ({ ...d, include: true })))}
                >
                  Select all
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraftCases(prev => prev.map(d => ({ ...d, include: false })))}
                >
                  Clear
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  Edits below stay local — Cancel discards all draft cases.
                </span>
              </div>

              <ScrollArea className="flex-1 pr-2 -mr-2">
                <div className="space-y-3 py-3">
                  {draftCases.map((d, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-md p-3 space-y-2 ${d.include ? '' : 'opacity-50 bg-muted/30'}`}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={d.include}
                          onCheckedChange={(checked) => {
                            setDraftCases(prev => prev.map((x, i) => i === idx ? { ...x, include: !!checked } : x));
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div className="col-span-2 sm:col-span-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={d.name}
                              onChange={(e) => setDraftCases(prev => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <Label className="text-xs">Key topic</Label>
                            <Input
                              value={d.key_topic}
                              onChange={(e) => setDraftCases(prev => prev.map((x, i) => i === idx ? { ...x, key_topic: e.target.value } : x))}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Description</Label>
                            <Input
                              value={d.description}
                              onChange={(e) => setDraftCases(prev => prev.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Scenario (what the test caller will simulate)</Label>
                            <Textarea
                              rows={2}
                              value={d.scenario}
                              onChange={(e) => setDraftCases(prev => prev.map((x, i) => i === idx ? { ...x, scenario: e.target.value } : x))}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Expected behaviour (PASS criterion)</Label>
                            <Textarea
                              rows={2}
                              value={d.expected_behavior}
                              onChange={(e) => setDraftCases(prev => prev.map((x, i) => i === idx ? { ...x, expected_behavior: e.target.value } : x))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {draftCases.length === 0 && (
                    <p className="text-sm text-muted-foreground py-6 text-center">No drafts to review.</p>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => { setShowReviewDialog(false); setDraftCases([]); }}
                  disabled={savingReviewed}
                >
                  Discard
                </Button>
                <Button onClick={saveReviewedDataset} disabled={savingReviewed || draftCases.filter(d => d.include).length === 0}>
                  {savingReviewed ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>Save Selected ({draftCases.filter(d => d.include).length})</>
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
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Test Case</DialogTitle>
                <DialogDescription>
                  Create a new test case with persona and security options
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Basic Info */}
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
                  <Label htmlFor="scenario">Scenario / Caller Behavior</Label>
                  <Textarea
                    id="scenario"
                    placeholder="Describe what the test caller says and does..."
                    value={newTestCase.scenario}
                    onChange={(e) => setNewTestCase({ ...newTestCase, scenario: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expected">Expected Agent Behavior</Label>
                  <Textarea
                    id="expected"
                    placeholder="What should the agent do in response..."
                    value={newTestCase.expected_behavior}
                    onChange={(e) => setNewTestCase({ ...newTestCase, expected_behavior: e.target.value })}
                    rows={3}
                  />
                </div>
                
                {/* Persona Section */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <Label className="text-base font-semibold">Caller Persona</Label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Personality Type</Label>
                      <Select
                        value={newTestCase.persona_type}
                        onValueChange={(v) => setNewTestCase({ ...newTestCase, persona_type: v as PersonaType })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select persona" />
                        </SelectTrigger>
                        <SelectContent>
                          {PERSONA_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <span>{option.emoji}</span>
                                <span>{option.label}</span>
                                <span className="text-xs text-muted-foreground">- {option.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <Volume2 className="h-3 w-3" />
                        Voice Accent
                      </Label>
                      <Select
                        value={newTestCase.voice_accent}
                        onValueChange={(v) => setNewTestCase({ ...newTestCase, voice_accent: v as VoiceAccent })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select accent" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCENT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <span>{option.flag}</span>
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Behavior Modifiers (Optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {BEHAVIOR_OPTIONS.map((option) => (
                        <Badge
                          key={option.value}
                          variant={newTestCase.behavior_modifiers.includes(option.value) ? "default" : "outline"}
                          className="cursor-pointer hover:bg-primary/80"
                          onClick={() => {
                            const modifiers = newTestCase.behavior_modifiers.includes(option.value)
                              ? newTestCase.behavior_modifiers.filter(m => m !== option.value)
                              : [...newTestCase.behavior_modifiers, option.value];
                            setNewTestCase({ ...newTestCase, behavior_modifiers: modifiers });
                          }}
                        >
                          {option.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Security Section */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <Label className="text-base font-semibold">Security Test</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="is_security_test"
                        checked={newTestCase.is_security_test}
                        onCheckedChange={(checked) => setNewTestCase({ 
                          ...newTestCase, 
                          is_security_test: checked as boolean,
                          security_test_type: checked ? newTestCase.security_test_type : ""
                        })}
                      />
                      <Label htmlFor="is_security_test" className="text-sm cursor-pointer">
                        This is a security test
                      </Label>
                    </div>
                  </div>
                  
                  {newTestCase.is_security_test && (
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Security Test Type</Label>
                        <Select
                          value={newTestCase.security_test_type || undefined}
                          onValueChange={(v) => setNewTestCase({ ...newTestCase, security_test_type: v as SecurityTestType })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select security test type" />
                          </SelectTrigger>
                          <SelectContent>
                            {SECURITY_TEST_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{option.label}</span>
                                  <span className="text-xs text-muted-foreground">{option.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="flex gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-800 dark:text-yellow-200">
                            Security tests verify that your agent doesn&apos;t leak sensitive data, resist prompt injection, and handle PII correctly.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Topic */}
                <div className="grid gap-2">
                  <Label htmlFor="topic">Key Topic (Optional)</Label>
                  <Select
                    value={newTestCase.key_topic || undefined}
                    onValueChange={(v) => setNewTestCase({ ...newTestCase, key_topic: v === '__none__' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No topic</SelectItem>
                      {getUniqueTopics().map((topic) => (
                        <SelectItem key={topic} value={topic}>
                          {topic}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">+ Custom topic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Discussion / reference link */}
                <div className="grid gap-2">
                  <Label htmlFor="reference_link">Discussion / Reference Link (Optional)</Label>
                  <Input
                    id="reference_link"
                    type="url"
                    placeholder="https://… (spec, recording, discussion thread)"
                    value={newTestCase.reference_link}
                    onChange={(e) => setNewTestCase({ ...newTestCase, reference_link: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Reviewers will see a link icon on this test case opening the URL.
                  </p>
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

      {/* Saved Batches - Horizontal Tabs */}
      {savedBatches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Saved Batch Plans
              </CardTitle>
              <Badge variant="secondary">{savedBatches.length} saved</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {savedBatches.map((sb) => (
                <div
                  key={sb.id}
                  className={`flex-shrink-0 border rounded-lg p-3 cursor-pointer transition-colors min-w-[200px] ${
                    activeSavedBatchId === sb.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setActiveSavedBatchId(activeSavedBatchId === sb.id ? null : sb.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{sb.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSavedBatch(sb.id); }}
                      className="text-muted-foreground hover:text-destructive ml-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{sb.batch_data.length} calls</span>
                    <span>•</span>
                    <span>{sb.test_case_ids.length} tests</span>
                  </div>
                  <div className="mt-2">
                    <Button
                      size="sm"
                      className="w-full gap-1 h-7 text-xs"
                      onClick={(e) => { e.stopPropagation(); runSavedBatch(sb); }}
                    >
                      <Play className="h-3 w-3" />
                      Run Tests
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Expanded batch detail */}
            {activeSavedBatchId && (() => {
              const activeBatch = savedBatches.find(sb => sb.id === activeSavedBatchId);
              if (!activeBatch) return null;
              return (
                <div className="mt-4 border-t pt-4">
                  <div className="grid gap-2">
                    {activeBatch.batch_data.map((batch: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-muted/30 rounded-md">
                        <Badge variant="outline" className="flex-shrink-0">Call {idx + 1}</Badge>
                        <span className="text-sm text-muted-foreground truncate flex-1">
                          {batch.testCases?.map((tc: any) => tc.name).join(', ') || `${batch.testCaseIds?.length || 0} test cases`}
                        </span>
                        {batch.testMode && <Badge variant="secondary" className="text-xs">{batch.testMode}</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

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
                    <TableHead>Persona</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Gold</TableHead>
                    <TableHead className="hidden md:table-cell">Scenario</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredTestCases().map((testCase) => {
                    const personaInfo = PERSONA_OPTIONS.find(p => p.value === testCase.persona_type);
                    const accentInfo = ACCENT_OPTIONS.find(a => a.value === testCase.voice_accent);
                    return (
                      <TableRow key={testCase.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTestCases.has(testCase.id)}
                            onCheckedChange={() => toggleTestCaseSelection(testCase.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{testCase.name}</p>
                              {testCase.is_security_test && (
                                <Badge variant="destructive" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Security
                                </Badge>
                              )}
                              {testCase.reference_link && (
                                <a
                                  href={testCase.reference_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                  title={testCase.reference_link}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  link
                                </a>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {testCase.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {personaInfo && personaInfo.value !== 'neutral' && (
                              <Badge variant="outline" className="text-xs w-fit">
                                {personaInfo.emoji} {personaInfo.label}
                              </Badge>
                            )}
                            {accentInfo && accentInfo.value !== 'neutral' && (
                              <Badge variant="outline" className="text-xs w-fit">
                                {accentInfo.flag} {accentInfo.label}
                              </Badge>
                            )}
                            {(!personaInfo || personaInfo.value === 'neutral') && (!accentInfo || accentInfo.value === 'neutral') && (
                              <span className="text-xs text-muted-foreground">Neutral</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {testCase.key_topic && (
                            <Badge variant="secondary">{testCase.key_topic}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const gs = goldStatusMap[testCase.id] || { approved: 0, total: 0 };
                            const isStrict = (testCase.gold_gate || 'soft') === 'strict';
                            const blocked = isStrict && gs.approved < 2;
                            if (gs.approved >= 2) {
                              return (
                                <Badge variant="default" className="text-xs gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> 2/2 approved
                                </Badge>
                              );
                            }
                            if (blocked) {
                              return (
                                <Badge variant="destructive" className="text-xs gap-1">
                                  <Lock className="h-3 w-3" /> {gs.approved}/2 · blocked
                                </Badge>
                              );
                            }
                            return (
                              <Badge variant="outline" className="text-xs gap-1">
                                {gs.approved}/2 {isStrict ? 'strict' : 'soft'}
                              </Badge>
                            );
                          })()}
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
                              title="Gold examples"
                              onClick={() => { setGoldDialogTestCase(testCase); setGoldDialogOpen(true); }}
                            >
                              <BookOpen className="h-4 w-4" />
                            </Button>
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
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Call Batching Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-4xl max-h-[80vh]">
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

      <GoldExamplesDialog
        open={goldDialogOpen}
        onOpenChange={setGoldDialogOpen}
        testCaseId={goldDialogTestCase?.id || null}
        testCaseName={goldDialogTestCase?.name}
        onChanged={() => { void fetchTestCases(); }}
      />
    </div>
  );
}
