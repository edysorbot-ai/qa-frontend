/**
 * Workflow Store - State management for the test flow designer
 */

import { create } from 'zustand';
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  addEdge,
} from '@xyflow/react';
import { TestCaseData, CallNodeData, WorkflowExecutionPlan, ExecutionGroup } from './types';

interface WorkflowState {
  // Workflow data
  workflowId: string | null;
  workflowName: string;
  nodes: Node[];
  edges: Edge[];
  
  // Available test cases (from the test cases table)
  availableTestCases: TestCaseData[];
  
  // UI state
  selectedNode: string | null;
  isDirty: boolean;
  
  // Actions
  setWorkflowId: (id: string | null) => void;
  setWorkflowName: (name: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  // Node operations
  addCallNode: (position?: { x: number; y: number }) => void;
  addConcurrentCallNode: (sourceNodeId: string) => void;
  makeNodeConcurrentWith: (nodeId: string, targetNodeId: string) => void;
  updateCallNode: (nodeId: string, data: Partial<CallNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  
  // Test case operations
  setAvailableTestCases: (testCases: TestCaseData[]) => void;
  addTestCaseToCall: (callNodeId: string, testCase: TestCaseData) => void;
  removeTestCaseFromCall: (callNodeId: string, testCaseId: string) => void;
  createTestCaseInCall: (callNodeId: string, testCase: Omit<TestCaseData, 'id'>) => TestCaseData;
  updateTestCase: (callNodeId: string, testCaseId: string, updates: Partial<TestCaseData>) => void;
  reorderTestCasesInCall: (callNodeId: string, fromIndex: number, toIndex: number) => void;
  
  // Selection
  setSelectedNode: (nodeId: string | null) => void;
  
  // Workflow operations
  setIsDirty: (dirty: boolean) => void;
  resetWorkflow: () => void;
  loadWorkflow: (nodes: Node[], edges: Edge[], workflowId?: string, name?: string) => void;
  
  // Execution plan
  getExecutionPlan: () => WorkflowExecutionPlan;
  
  // Sync operations
  getModifiedTestCases: () => TestCaseData[];
  getNewTestCases: () => TestCaseData[];
}

let nodeIdCounter = 0;
let testCaseIdCounter = 0;

const generateNodeId = () => `call_${++nodeIdCounter}_${Date.now()}`;
const generateTestCaseId = () => `temp_tc_${++testCaseIdCounter}_${Date.now()}`;

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'startNode',
    position: { x: 250, y: 50 },
    data: { label: 'Start' },
    draggable: false,
  },
];

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowId: null,
  workflowName: 'New Test Flow',
  nodes: initialNodes,
  edges: [],
  availableTestCases: [],
  selectedNode: null,
  isDirty: false,

  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      isDirty: true,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(
        {
          ...connection,
          type: 'smoothstep',
          animated: true,
        },
        get().edges
      ),
      isDirty: true,
    });
  },

  addCallNode: (position) => {
    const nodes = get().nodes;
    const lastCallNode = nodes
      .filter((n) => n.type === 'callNode')
      .sort((a, b) => b.position.y - a.position.y)[0];

    const newPosition = position || {
      x: lastCallNode ? lastCallNode.position.x : 250,
      y: lastCallNode ? lastCallNode.position.y + 180 : 180,
    };

    const callNumber = nodes.filter((n) => n.type === 'callNode').length + 1;
    const newNode: Node = {
      id: generateNodeId(),
      type: 'callNode',
      position: newPosition,
      data: {
        id: generateNodeId(),
        label: `Call ${callNumber}`,
        testCases: [],
        concurrency: 1,
        order: callNumber - 1,
      } as CallNodeData,
    };

    // Auto-connect to previous node
    const edges = get().edges;
    let newEdge: Edge | null = null;

    if (lastCallNode) {
      newEdge = {
        id: `e_${lastCallNode.id}_${newNode.id}`,
        source: lastCallNode.id,
        target: newNode.id,
        type: 'smoothstep',
        animated: true,
      };
    } else {
      // Connect to start node
      newEdge = {
        id: `e_start_${newNode.id}`,
        source: 'start',
        target: newNode.id,
        type: 'smoothstep',
        animated: true,
      };
    }

    set({
      nodes: [...nodes, newNode],
      edges: newEdge ? [...edges, newEdge] : edges,
      isDirty: true,
    });

    return newNode;
  },

  // Add a concurrent (horizontal) call node next to an existing node
  addConcurrentCallNode: (sourceNodeId) => {
    const nodes = get().nodes;
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    
    if (!sourceNode || sourceNode.type !== 'callNode') return;

    // Position the new node to the right of the source node (same Y level)
    const newPosition = {
      x: sourceNode.position.x + 350,
      y: sourceNode.position.y,
    };

    const callNumber = nodes.filter((n) => n.type === 'callNode').length + 1;
    const newNode: Node = {
      id: generateNodeId(),
      type: 'callNode',
      position: newPosition,
      data: {
        id: generateNodeId(),
        label: `Call ${callNumber}`,
        testCases: [],
        concurrency: 1,
        order: (sourceNode.data as CallNodeData).order, // Same order = concurrent
      } as CallNodeData,
    };

    // Connect horizontally using right/left handles
    const newEdge: Edge = {
      id: `e_${sourceNodeId}_${newNode.id}`,
      source: sourceNodeId,
      sourceHandle: 'concurrent', // Right handle
      target: newNode.id,
      targetHandle: 'concurrent-target', // Left handle
      type: 'smoothstep',
      animated: true,
    };

    set({
      nodes: [...nodes, newNode],
      edges: [...get().edges, newEdge],
      isDirty: true,
    });

    return newNode;
  },

  // Move a node to be concurrent (horizontal) with another node
  makeNodeConcurrentWith: (nodeId, targetNodeId) => {
    const nodes = get().nodes;
    const edges = get().edges;
    const nodeToMove = nodes.find((n) => n.id === nodeId);
    const targetNode = nodes.find((n) => n.id === targetNodeId);
    
    if (!nodeToMove || !targetNode || nodeToMove.type !== 'callNode' || targetNode.type !== 'callNode') return;
    
    // Remove existing edges connected to the node being moved
    const edgesToRemove = edges.filter((e) => e.source === nodeId || e.target === nodeId);
    const remainingEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    
    // Find nodes that were connected to the moved node
    const incomingEdge = edgesToRemove.find((e) => e.target === nodeId);
    const outgoingEdges = edgesToRemove.filter((e) => e.source === nodeId);
    
    // Reconnect: if the moved node had children, connect them to the moved node's parent
    let newEdges = [...remainingEdges];
    if (incomingEdge && outgoingEdges.length > 0) {
      outgoingEdges.forEach((outEdge) => {
        newEdges.push({
          id: `e_${incomingEdge.source}_${outEdge.target}`,
          source: incomingEdge.source,
          target: outEdge.target,
          type: 'smoothstep',
          animated: true,
        });
      });
    }
    
    // Position the node to the right of the target (same Y level)
    const newPosition = {
      x: targetNode.position.x + 350,
      y: targetNode.position.y,
    };
    
    // Create edge from target to moved node using horizontal handles
    newEdges.push({
      id: `e_${targetNodeId}_${nodeId}`,
      source: targetNodeId,
      sourceHandle: 'concurrent', // Right handle
      target: nodeId,
      targetHandle: 'concurrent-target', // Left handle
      type: 'smoothstep',
      animated: true,
    });
    
    // Update node position
    const updatedNodes = nodes.map((n) =>
      n.id === nodeId
        ? { ...n, position: newPosition, data: { ...n.data, order: (targetNode.data as CallNodeData).order } }
        : n
    );
    
    set({
      nodes: updatedNodes,
      edges: newEdges,
      isDirty: true,
    });
  },

  updateCallNode: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
      isDirty: true,
    });
  },

  deleteNode: (nodeId) => {
    if (nodeId === 'start') return; // Can't delete start node
    
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNode: get().selectedNode === nodeId ? null : get().selectedNode,
      isDirty: true,
    });
  },

  setAvailableTestCases: (testCases) => set({ availableTestCases: testCases }),

  addTestCaseToCall: (callNodeId, testCase) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === callNodeId && node.type === 'callNode') {
          const data = node.data as CallNodeData;
          // Don't add if already exists
          if (data.testCases.some((tc) => tc.id === testCase.id)) {
            return node;
          }
          return {
            ...node,
            data: {
              ...data,
              testCases: [...data.testCases, testCase],
            },
          };
        }
        return node;
      }),
      isDirty: true,
    });
  },

  removeTestCaseFromCall: (callNodeId, testCaseId) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === callNodeId && node.type === 'callNode') {
          const data = node.data as CallNodeData;
          return {
            ...node,
            data: {
              ...data,
              testCases: data.testCases.filter((tc) => tc.id !== testCaseId),
            },
          };
        }
        return node;
      }),
      isDirty: true,
    });
  },

  createTestCaseInCall: (callNodeId: string, testCase: Omit<TestCaseData, 'id'>) => {
    const id = generateTestCaseId();
    const newTestCase: TestCaseData = {
      id,
      name: testCase.name as string,
      scenario: testCase.scenario as string,
      category: testCase.category as string,
      expectedOutcome: testCase.expectedOutcome as string,
      priority: testCase.priority as "high" | "medium" | "low",
    };

    set({
      nodes: get().nodes.map((node) => {
        if (node.id === callNodeId && node.type === 'callNode') {
          const data = node.data as CallNodeData;
          return {
            ...node,
            data: {
              ...data,
              testCases: [...data.testCases, newTestCase],
            },
          };
        }
        return node;
      }),
      isDirty: true,
    });

    return newTestCase;
  },

  updateTestCase: (callNodeId, testCaseId, updates) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === callNodeId && node.type === 'callNode') {
          const data = node.data as CallNodeData;
          return {
            ...node,
            data: {
              ...data,
              testCases: data.testCases.map((tc) =>
                tc.id === testCaseId ? { ...tc, ...updates } : tc
              ),
            },
          };
        }
        return node;
      }),
      isDirty: true,
    });
  },

  reorderTestCasesInCall: (callNodeId, fromIndex, toIndex) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === callNodeId && node.type === 'callNode') {
          const data = node.data as CallNodeData;
          const testCases = [...data.testCases];
          const [removed] = testCases.splice(fromIndex, 1);
          testCases.splice(toIndex, 0, removed);
          return {
            ...node,
            data: {
              ...data,
              testCases,
            },
          };
        }
        return node;
      }),
      isDirty: true,
    });
  },

  setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),

  setIsDirty: (dirty) => set({ isDirty: dirty }),

  resetWorkflow: () =>
    set({
      workflowId: null,
      workflowName: 'New Test Flow',
      nodes: initialNodes,
      edges: [],
      selectedNode: null,
      isDirty: false,
    }),

  loadWorkflow: (nodes, edges, workflowId, name) =>
    set({
      nodes: nodes.length > 0 ? nodes : initialNodes,
      edges,
      workflowId: workflowId || null,
      workflowName: name || 'New Test Flow',
      isDirty: false,
    }),

  getExecutionPlan: () => {
    const { nodes, edges } = get();
    const callNodes = nodes.filter((n) => n.type === 'callNode');
    
    if (callNodes.length === 0) {
      return { executionGroups: [], totalCalls: 0, totalTestCases: 0 };
    }

    // Build adjacency list from edges
    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();
    
    edges.forEach((edge) => {
      if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
      outgoing.get(edge.source)!.push(edge.target);
      
      if (!incoming.has(edge.target)) incoming.set(edge.target, []);
      incoming.get(edge.target)!.push(edge.source);
    });

    // Find nodes with no incoming edges from other call nodes (roots after start)
    const startConnections = outgoing.get('start') || [];
    
    // Group nodes by execution order using BFS
    const executionGroups: ExecutionGroup[] = [];
    const visited = new Set<string>();
    let currentLevel = startConnections.filter((id) =>
      callNodes.some((n) => n.id === id)
    );

    let order = 0;
    while (currentLevel.length > 0) {
      const group: ExecutionGroup = {
        order,
        calls: [],
        concurrent: currentLevel.length > 1,
      };

      currentLevel.forEach((nodeId) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const node = callNodes.find((n) => n.id === nodeId);
        if (node) {
          const data = node.data as CallNodeData;
          group.calls.push({
            callNodeId: node.id,
            callLabel: data.label,
            testCases: data.testCases,
            concurrency: data.concurrency,
          });
        }
      });

      if (group.calls.length > 0) {
        executionGroups.push(group);
      }

      // Get next level
      const nextLevel: string[] = [];
      currentLevel.forEach((nodeId) => {
        const children = outgoing.get(nodeId) || [];
        children.forEach((childId) => {
          if (!visited.has(childId) && callNodes.some((n) => n.id === childId)) {
            nextLevel.push(childId);
          }
        });
      });

      currentLevel = nextLevel;
      order++;
    }

    const totalTestCases = executionGroups.reduce(
      (sum, group) =>
        sum + group.calls.reduce((s, call) => s + call.testCases.length, 0),
      0
    );

    return {
      executionGroups,
      totalCalls: callNodes.length,
      totalTestCases,
    };
  },

  getModifiedTestCases: () => {
    const { nodes, availableTestCases } = get();
    const modified: TestCaseData[] = [];

    nodes
      .filter((n) => n.type === 'callNode')
      .forEach((node) => {
        const data = node.data as CallNodeData;
        data.testCases.forEach((tc) => {
          // Check if this test case exists and has been modified
          const original = availableTestCases.find((atc) => atc.id === tc.id);
          if (original && JSON.stringify(original) !== JSON.stringify(tc)) {
            modified.push(tc);
          }
        });
      });

    return modified;
  },

  getNewTestCases: () => {
    const { nodes } = get();
    const newTestCases: TestCaseData[] = [];

    nodes
      .filter((n) => n.type === 'callNode')
      .forEach((node) => {
        const data = node.data as CallNodeData;
        data.testCases.forEach((tc) => {
          // New test cases have temporary IDs
          if (tc.id.startsWith('temp_tc_')) {
            newTestCases.push(tc);
          }
        });
      });

    return newTestCases;
  },
}));
