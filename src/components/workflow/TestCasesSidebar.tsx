'use client';

/**
 * Test Cases Sidebar - Draggable list of test cases
 */

import { useState, useMemo } from 'react';
import { 
  Search, 
  GripVertical, 
  ChevronDown,
  ChevronRight,
  TestTube2,
  Plus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TestCaseData } from './types';
import { cn } from '@/lib/utils';

interface TestCasesSidebarProps {
  testCases: TestCaseData[];
  usedTestCaseIds?: Set<string>;
  onTestCaseClick?: (testCase: TestCaseData) => void;
  onCreateTestCase?: () => void;
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-slate-100 text-slate-700',
  low: 'bg-green-100 text-green-700',
};

const categoryColors: Record<string, string> = {
  'Eligibility': 'bg-slate-50 border-slate-200',
  'Budget': 'bg-slate-50 border-slate-200',
  'Objections': 'bg-slate-50 border-slate-200',
  'Technical': 'bg-slate-50 border-slate-200',
  'Edge Cases': 'bg-red-50 border-red-200',
  'General': 'bg-gray-50 border-gray-200',
};

export default function TestCasesSidebar({ testCases, usedTestCaseIds, onTestCaseClick, onCreateTestCase }: TestCasesSidebarProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']));

  // Filter out test cases that are already used in nodes
  const availableTestCases = useMemo(() => {
    if (!usedTestCaseIds || usedTestCaseIds.size === 0) return testCases;
    return testCases.filter((tc) => !usedTestCaseIds.has(tc.id));
  }, [testCases, usedTestCaseIds]);

  // Group test cases by category
  const groupedTestCases = useMemo(() => {
    const filtered = availableTestCases.filter(
      (tc) =>
        tc.name.toLowerCase().includes(search.toLowerCase()) ||
        tc.scenario.toLowerCase().includes(search.toLowerCase()) ||
        tc.category.toLowerCase().includes(search.toLowerCase())
    );

    const groups: Record<string, TestCaseData[]> = {};
    filtered.forEach((tc) => {
      const category = tc.category || 'General';
      if (!groups[category]) groups[category] = [];
      groups[category].push(tc);
    });

    return groups;
  }, [availableTestCases, search]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, testCase: TestCaseData) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ type: 'testCase', testCase })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-80 border-l bg-muted/30 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b bg-background flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <TestTube2 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Test Cases</h3>
          <Badge variant="secondary" className="ml-auto text-xs">
            {availableTestCases.length}
          </Badge>
          {onCreateTestCase && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onCreateTestCase}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create new test case</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test cases..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Test Cases List */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1 pb-4">
          {Object.entries(groupedTestCases).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TestTube2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No test cases found</p>
            </div>
          ) : (
            Object.entries(groupedTestCases).map(([category, cases]) => (
              <Collapsible
                key={category}
                open={expandedCategories.has(category) || expandedCategories.has('all')}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-between h-8 px-2 text-sm font-medium',
                      categoryColors[category] || 'bg-gray-50'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {expandedCategories.has(category) || expandedCategories.has('all') ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      {category}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {cases.length}
                    </Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {cases.map((tc) => (
                    <div
                      key={tc.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, tc)}
                      onClick={() => onTestCaseClick?.(tc)}
                      className="group flex items-start gap-2 p-2 rounded-md bg-background border border-border hover:border-primary/50 hover:bg-primary/5 cursor-grab active:cursor-grabbing transition-colors"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">
                            {tc.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1 py-0 flex-shrink-0',
                              priorityColors[tc.priority]
                            )}
                          >
                            {tc.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {tc.scenario}
                        </p>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer hint */}
      <div className="p-3 border-t bg-muted/50 flex-shrink-0">
        <p className="text-xs text-muted-foreground text-center">
          Drag test cases onto Call nodes to add them
        </p>
      </div>
    </div>
  );
}
