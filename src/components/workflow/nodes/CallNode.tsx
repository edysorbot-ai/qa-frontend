'use client';

/**
 * Call Node - Represents a single call in the test flow
 * Test cases can be dragged and dropped onto this node
 * Supports drag-to-reorder test cases within the node
 */

import { memo, useState, useCallback, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { 
  Phone, 
  Trash2, 
  GripVertical,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  MoreVertical,
  ArrowRightLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { CallNodeData, TestCaseData } from '../types';
import { useWorkflowStore } from '../workflow-store';
import { cn } from '@/lib/utils';

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-slate-100 text-slate-700 border-slate-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

function CallNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as CallNodeData;
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(nodeData.label);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const { 
    nodes,
    updateCallNode, 
    deleteNode, 
    removeTestCaseFromCall,
    addTestCaseToCall,
    setSelectedNode,
    reorderTestCasesInCall,
    addConcurrentCallNode,
    makeNodeConcurrentWith,
  } = useWorkflowStore();

  // Get other call nodes to allow making concurrent with them
  const otherCallNodes = nodes.filter((n) => n.type === 'callNode' && n.id !== id);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const { type, testCase } = JSON.parse(data);
        if (type === 'testCase' && testCase) {
          addTestCaseToCall(id, testCase);
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }, [id, addTestCaseToCall]);

  const handleLabelSave = () => {
    updateCallNode(id, { label: labelValue });
    setEditingLabel(false);
  };

  const handleRemoveTestCase = (testCaseId: string) => {
    removeTestCaseFromCall(id, testCaseId);
  };

  return (
    <div
      className={cn(
        'w-[280px] rounded-lg border-2 bg-card shadow-md transition-all duration-200',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
        isDragOver && 'border-slate-500 bg-slate-50/50 ring-2 ring-slate-200'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => setSelectedNode(id)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-muted/50 rounded-t-lg border-b">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-primary/10">
            <Phone className="h-3 w-3 text-primary" />
          </div>
          {editingLabel ? (
            <Input
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onBlur={handleLabelSave}
              onKeyDown={(e) => e.key === 'Enter' && handleLabelSave()}
              className="h-6 w-24 text-xs font-medium nodrag"
              autoFocus
            />
          ) : (
            <span 
              className="font-semibold text-xs cursor-pointer hover:text-primary"
              onDoubleClick={() => setEditingLabel(true)}
            >
              {nodeData.label}
            </span>
          )}
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            {nodeData.testCases.length} test{nodeData.testCases.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {otherCallNodes.length > 0 && (
                <>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <ArrowRightLeft className="h-3 w-3 mr-2" />
                      Make concurrent with
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {otherCallNodes.map((node) => (
                        <DropdownMenuItem
                          key={node.id}
                          onClick={() => makeNodeConcurrentWith(id, node.id)}
                        >
                          {(node.data as CallNodeData).label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteNode(id)}
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Delete node
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Test Cases List */}
      {isExpanded && (
        <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto nodrag">
          {nodeData.testCases.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground border border-dashed rounded-md">
              <GripVertical className="h-5 w-5 mx-auto mb-1 opacity-30" />
              <p className="text-xs font-medium">Drop test cases here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {nodeData.testCases.map((tc, index) => (
                <div
                  key={tc.id}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDraggedIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedIndex !== null && draggedIndex !== index) {
                      setDragOverIndex(index);
                    }
                  }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedIndex !== null && draggedIndex !== index) {
                      reorderTestCasesInCall(id, draggedIndex, index);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={cn(
                    "group flex items-center gap-1 p-1.5 rounded bg-muted/30 hover:bg-muted/50 border transition-all cursor-grab active:cursor-grabbing",
                    draggedIndex === index && "opacity-50",
                    dragOverIndex === index && "border-primary border-dashed bg-primary/10"
                  )}
                >
                  <GripVertical className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-medium truncate flex-1">
                        {tc.name}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn('text-[9px] px-1 py-0 h-4', priorityColors[tc.priority])}
                      >
                        {tc.priority}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTestCase(tc.id);
                    }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary border-2 border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary border-2 border-background"
      />
      {/* Right handle for concurrent connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="concurrent"
        className="w-3 h-3 !bg-slate-500 border-2 border-background"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="concurrent-target"
        className="w-3 h-3 !bg-slate-500 border-2 border-background"
      />

      {/* Add Concurrent Node Button - positioned outside the node */}
      <div className="absolute -right-12 top-0 bottom-0 flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  addConcurrentCallNode(id);
                }}
              >
                <Plus className="h-3.5 w-3.5 text-slate-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add concurrent call (runs in parallel)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export default memo(CallNode);
