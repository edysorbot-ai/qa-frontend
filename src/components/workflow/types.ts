/**
 * Workflow Types for Test Flow Designer
 */

export interface TestCaseData {
  id: string;
  name: string;
  scenario: string;
  category: string;
  expectedOutcome: string;
  priority: "high" | "medium" | "low";
  [key: string]: unknown;
}

export interface CallNodeData {
  id: string;
  label: string;
  testCases: TestCaseData[];
  concurrency: number; // How many concurrent calls for this node
  order: number; // Execution order (0 = first, same order = concurrent)
  [key: string]: unknown;
}

export interface StartNodeData {
  label: string;
  [key: string]: unknown;
}

export interface TestCaseNodeData {
  id: string;
  testCase: TestCaseData;
  parentCallId: string;
  [key: string]: unknown;
}

export interface WorkflowNode {
  id: string;
  type: 'callNode' | 'testCaseNode' | 'startNode' | 'endNode';
  position: { x: number; y: number };
  data: CallNodeData | TestCaseNodeData | { label: string };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: 'smoothstep' | 'default' | 'straight';
  animated?: boolean;
  label?: string;
}

export interface TestWorkflow {
  id: string;
  agent_id: string;
  user_id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecutionPlan {
  // Groups of calls that can be executed concurrently
  executionGroups: ExecutionGroup[];
  totalCalls: number;
  totalTestCases: number;
}

export interface ExecutionGroup {
  order: number;
  calls: CallExecution[];
  // All calls in the same group run concurrently
  concurrent: boolean;
}

export interface CallExecution {
  callNodeId: string;
  callLabel: string;
  testCases: TestCaseData[];
  concurrency: number;
}

// For drag and drop from test cases list
export interface DragItem {
  type: 'testCase';
  testCase: TestCaseData;
}
