'use client';

/**
 * Test Flow Canvas - Main workflow designer component
 */

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  ConnectionLineType,
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Plus,
  Save,
  Play,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Workflow,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Focus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useWorkflowStore } from './workflow-store';
import { TestCaseData, WorkflowExecutionPlan, CallNodeData } from './types';
import StartNode from './nodes/StartNode';
import CallNode from './nodes/CallNode';
import TestCasesSidebar from './TestCasesSidebar';
import { cn } from '@/lib/utils';

// Custom edge with label for concurrent connections
function ConcurrentEdge({
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Check if this is a horizontal connection (concurrent) - only between call nodes, not from start
  const isHorizontal = Math.abs(sourceY - targetY) < 100 && source !== 'start';

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {isHorizontal && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
          >
            concurrent
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes: NodeTypes = {
  startNode: StartNode,
  callNode: CallNode,
};

const edgeTypes: EdgeTypes = {
  default: ConcurrentEdge,
  smoothstep: ConcurrentEdge,
};

interface TestFlowCanvasProps {
  agentId: string;
  testCases: TestCaseData[];
  onSave?: (workflowData: any) => Promise<void>;
  onRunWorkflow?: (executionPlan: WorkflowExecutionPlan) => Promise<void>;
  onCreateTestCase?: () => void;
  initialWorkflow?: any;
}

export default function TestFlowCanvas({
  agentId,
  testCases,
  onSave,
  onRunWorkflow,
  onCreateTestCase,
  initialWorkflow,
}: TestFlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  
  const {
    nodes,
    edges,
    workflowName,
    isDirty,
    availableTestCases,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addCallNode,
    setAvailableTestCases,
    setWorkflowName,
    loadWorkflow,
    getExecutionPlan,
    setIsDirty,
  } = useWorkflowStore();

  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [executionPlan, setExecutionPlan] = useState<WorkflowExecutionPlan | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoCreating, setIsAutoCreating] = useState(false);

  // Compute used test case IDs from all call nodes
  const usedTestCaseIds = useMemo(() => {
    const ids = new Set<string>();
    nodes.forEach((node) => {
      if (node.type === 'callNode') {
        const nodeData = node.data as CallNodeData;
        nodeData.testCases?.forEach((tc) => ids.add(tc.id));
      }
    });
    return ids;
  }, [nodes]);

  // Initialize test cases
  useEffect(() => {
    setAvailableTestCases(testCases);
  }, [testCases, setAvailableTestCases]);

  // Load initial workflow if provided
  useEffect(() => {
    if (initialWorkflow) {
      loadWorkflow(
        initialWorkflow.nodes || [],
        initialWorkflow.edges || [],
        initialWorkflow.id,
        initialWorkflow.name
      );
    }
  }, [initialWorkflow, loadWorkflow]);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      await onSave({
        name: workflowName,
        nodes,
        edges,
        agent_id: agentId,
      });
      setIsDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunClick = () => {
    const plan = getExecutionPlan();
    setExecutionPlan(plan);
    setShowRunDialog(true);
  };

  const handleRunConfirm = async () => {
    if (!onRunWorkflow || !executionPlan) return;
    
    setIsRunning(true);
    try {
      await onRunWorkflow(executionPlan);
      setShowRunDialog(false);
    } catch (error) {
      console.error('Failed to run workflow:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleAddNode = () => {
    addCallNode();
  };

  const handleFitView = () => {
    fitView({ padding: 0.2 });
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Auto-create flow by batching test cases intelligently
  const handleAutoCreateFlow = async () => {
    if (testCases.length === 0) return;
    
    setIsAutoCreating(true);
    
    try {
      // Group test cases by category
      const categories: Record<string, TestCaseData[]> = {};
      testCases.forEach(tc => {
        const cat = tc.category || 'General';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(tc);
      });

      // Create nodes for each category (batch compatible tests together)
      const newNodes: Node[] = [
        {
          id: 'start',
          type: 'startNode',
          position: { x: 250, y: 50 },
          data: { label: 'Start' },
        }
      ];
      const newEdges: Edge[] = [];
      
      let yPosition = 200;
      let nodeIndex = 1;
      let prevNodeId = 'start';
      
      // Create a call node for each category
      Object.entries(categories).forEach(([category, cases]) => {
        // Split large categories into multiple calls (max 5 tests per call)
        const chunks: TestCaseData[][] = [];
        for (let i = 0; i < cases.length; i += 5) {
          chunks.push(cases.slice(i, i + 5));
        }
        
        chunks.forEach((chunk, chunkIndex) => {
          const nodeId = `call_${nodeIndex}_${Date.now()}`;
          newNodes.push({
            id: nodeId,
            type: 'callNode',
            position: { x: 250, y: yPosition },
            data: {
              id: nodeId,
              label: chunks.length > 1 ? `${category} ${chunkIndex + 1}` : category,
              testCases: chunk,
              concurrency: 1,
              order: nodeIndex - 1,
            },
          });
          
          // Connect to previous node
          newEdges.push({
            id: `e_${prevNodeId}_${nodeId}`,
            source: prevNodeId,
            target: nodeId,
            type: 'smoothstep',
            animated: true,
          });
          
          prevNodeId = nodeId;
          yPosition += 220; // More spacing between nodes
          nodeIndex++;
        });
      });

      // Load the new workflow
      loadWorkflow(newNodes, newEdges, undefined, 'Auto-Generated Flow');
      setIsDirty(true);
      
      // Fit view after a short delay
      setTimeout(() => fitView({ padding: 0.3 }), 100);
    } catch (error) {
      console.error('Error auto-creating flow:', error);
    } finally {
      setIsAutoCreating(false);
    }
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className={cn(
      "flex border rounded-lg overflow-hidden bg-background transition-all duration-300",
      isFullscreen 
        ? "fixed inset-0 z-50 rounded-none border-0" 
        : "h-[calc(100vh-280px)] min-h-[600px]"
    )}>
      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
          }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.5}
          className="bg-muted/20"
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#ddd" />
          <Controls showInteractive={false} />
          <MiniMap 
            nodeStrokeWidth={3}
            pannable
            zoomable
            className="!bg-background !border-border"
          />

          {/* Top Panel - Toolbar */}
          <Panel position="top-left" className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-background border rounded-lg p-1.5 shadow-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 gap-1.5 bg-primary hover:bg-primary/90"
                      onClick={handleAddNode}
                    >
                      <Plus className="h-4 w-4" />
                      Add Call
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add a new Call node to the workflow</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={handleAutoCreateFlow}
                      disabled={isAutoCreating || availableTestCases.length === 0}
                    >
                      {isAutoCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Auto Create Flow
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Automatically create workflow by batching test cases</TooltipContent>
                </Tooltip>

                <div className="w-px h-6 bg-border" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => zoomIn()}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom In</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => zoomOut()}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom Out</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleFitView}
                    >
                      <Focus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Fit View</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleToggleFullscreen}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </Panel>

          {/* Top Right Panel - Actions */}
          <Panel position="top-right" className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-background border rounded-lg p-1.5 shadow-sm">
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="h-8 w-48 text-sm"
                placeholder="Workflow name"
              />
              
              {isDirty && (
                <Badge variant="secondary" className="text-xs">
                  Unsaved
                </Badge>
              )}

              {saveStatus === 'saved' && (
                <Badge variant="default" className="text-xs bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Saved
                </Badge>
              )}

              {saveStatus === 'error' && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Error
                </Badge>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className="h-8"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleRunClick}
                disabled={nodes.filter((n) => n.type === 'callNode').length === 0}
                className="h-8"
              >
                <Play className="h-4 w-4 mr-1" />
                Run Flow
              </Button>
            </div>
          </Panel>

          {/* Bottom Panel - Stats */}
          <Panel position="bottom-left" className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-background/90 border rounded-lg px-3 py-1.5 shadow-sm text-xs">
              <div className="flex items-center gap-1.5">
                <Workflow className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Calls:</span>
                <span className="font-medium">
                  {nodes.filter((n) => n.type === 'callNode').length}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Test Cases:</span>
                <span className="font-medium">
                  {nodes
                    .filter((n) => n.type === 'callNode')
                    .reduce((sum, n) => sum + ((n.data as any).testCases?.length || 0), 0)}
                </span>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Sidebar */}
      <TestCasesSidebar 
        testCases={testCases} 
        usedTestCaseIds={usedTestCaseIds}
        onCreateTestCase={onCreateTestCase}
      />

      {/* Run Workflow Dialog */}
      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Run Test Flow
            </DialogTitle>
            <DialogDescription>
              Execute the test cases according to your designed workflow
            </DialogDescription>
          </DialogHeader>

          {executionPlan && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground">Total Calls</p>
                  <p className="text-2xl font-bold">{executionPlan.totalCalls}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground">Test Cases</p>
                  <p className="text-2xl font-bold">{executionPlan.totalTestCases}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Execution Order:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {executionPlan.executionGroups.map((group, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-md bg-muted/30 border text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          Step {group.order + 1}
                          {group.concurrent && group.calls.length > 1 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Concurrent
                            </Badge>
                          )}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {group.calls.map((call) => (
                          <div
                            key={call.callNodeId}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-muted-foreground">
                              {call.callLabel}
                            </span>
                            <span>
                              {call.testCases.length} test
                              {call.testCases.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRunDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRunConfirm} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Test Run
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
