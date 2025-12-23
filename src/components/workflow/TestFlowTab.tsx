'use client';

/**
 * Test Flow Tab - Wrapper component that provides ReactFlow context
 */

import { ReactFlowProvider } from '@xyflow/react';
import TestFlowCanvas from './TestFlowCanvas';
import { TestCaseData, WorkflowExecutionPlan } from './types';

interface TestFlowTabProps {
  agentId: string;
  testCases: TestCaseData[];
  onSave?: (workflowData: any) => Promise<void>;
  onRunWorkflow?: (executionPlan: WorkflowExecutionPlan) => Promise<void>;
  initialWorkflow?: any;
}

export default function TestFlowTab(props: TestFlowTabProps) {
  return (
    <ReactFlowProvider>
      <TestFlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
