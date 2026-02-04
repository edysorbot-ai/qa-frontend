'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  Wrench,
  FileDown,
  Loader2
} from 'lucide-react';

// Types
interface AlternativeConsidered {
  tool: string;
  reason: string;
  confidence?: number;
}

interface DecisionFactor {
  factor: string;
  weight: number;
  contribution: string;
}

interface ToolDecision {
  id?: string;
  turnNumber: number;
  timestamp?: string;
  availableTools: string[];
  selectedTool: string | null;
  selectionReason: string;
  alternativesConsidered: AlternativeConsidered[];
  decisionFactors: DecisionFactor[];
  inputContext: string;
  confidence: number;
}

interface ToolDecisionTrace {
  testResultId: string;
  agentId: string;
  decisions: ToolDecision[];
  totalToolCalls: number;
  uniqueToolsUsed: string[];
  averageConfidence: number;
  lowConfidenceDecisions: ToolDecision[];
}

interface ToolDecisionTimelineProps {
  trace: ToolDecisionTrace | null;
  isLoading?: boolean;
  onExportAudit?: () => void;
  isExporting?: boolean;
}

export function ToolDecisionTimeline({ 
  trace, 
  isLoading, 
  onExportAudit,
  isExporting 
}: ToolDecisionTimelineProps) {
  const [expandedDecisions, setExpandedDecisions] = useState<Set<number>>(new Set());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trace || trace.decisions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Tool Decisions</p>
            <p className="text-sm mt-2">
              This test result doesn&apos;t have any recorded tool decisions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const toggleExpand = (turnNumber: number) => {
    const newExpanded = new Set(expandedDecisions);
    if (newExpanded.has(turnNumber)) {
      newExpanded.delete(turnNumber);
    } else {
      newExpanded.add(turnNumber);
    }
    setExpandedDecisions(newExpanded);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConfidenceBadge = (confidence: number) => {
    const percent = Math.round(confidence * 100);
    if (confidence >= 0.9) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{percent}%</Badge>;
    }
    if (confidence >= 0.7) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{percent}%</Badge>;
    }
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{percent}%</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tool Calls</CardDescription>
            <CardTitle className="text-2xl">{trace.totalToolCalls}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unique Tools Used</CardDescription>
            <CardTitle className="text-2xl">{trace.uniqueToolsUsed.length}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Confidence</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {Math.round(trace.averageConfidence * 100)}%
              {trace.averageConfidence < 0.7 && (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Low Confidence</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {trace.lowConfidenceDecisions.length}
              {trace.lowConfidenceDecisions.length > 0 && (
                <Badge variant="destructive" className="text-xs">Needs Review</Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tools Used */}
      {trace.uniqueToolsUsed.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tools Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {trace.uniqueToolsUsed.map((tool) => (
                <Badge key={tool} variant="secondary" className="font-mono text-xs">
                  {tool}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Button */}
      {onExportAudit && (
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            onClick={onExportAudit}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Export Audit Report
          </Button>
        </div>
      )}

      {/* Decision Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Tool Decision Timeline</CardTitle>
          <CardDescription>
            Detailed trace of tool selection decisions during the conversation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            {/* Decisions */}
            <div className="space-y-6">
              {trace.decisions.map((decision, index) => {
                const isExpanded = expandedDecisions.has(decision.turnNumber);
                const isLowConfidence = decision.confidence < 0.7;
                
                return (
                  <div key={index} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 
                      ${decision.selectedTool 
                        ? 'bg-green-500 border-green-600' 
                        : 'bg-gray-300 border-gray-400'}`} 
                    />
                    
                    {/* Decision card */}
                    <div className={`border rounded-lg p-4 ${isLowConfidence ? 'border-yellow-300 bg-yellow-50/50' : ''}`}>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-muted-foreground">
                              Turn {decision.turnNumber}
                            </span>
                            {getConfidenceBadge(decision.confidence)}
                            {isLowConfidence && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Low Confidence
                              </Badge>
                            )}
                          </div>
                          
                          {/* Selected Tool */}
                          <div className="flex items-center gap-2 mt-2">
                            {decision.selectedTool ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="font-mono font-medium">
                                  {decision.selectedTool}
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-gray-400" />
                                <span className="text-muted-foreground italic">
                                  No tool selected
                                </span>
                              </>
                            )}
                          </div>
                          
                          {/* Selection Reason */}
                          <p className="text-sm text-muted-foreground mt-2">
                            {decision.selectionReason}
                          </p>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(decision.turnNumber)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          {/* Input Context */}
                          {decision.inputContext && (
                            <div>
                              <h4 className="text-sm font-medium mb-1">Input Context</h4>
                              <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                {decision.inputContext}
                              </p>
                            </div>
                          )}
                          
                          {/* Available Tools */}
                          {decision.availableTools.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Available Tools</h4>
                              <div className="flex flex-wrap gap-1">
                                {decision.availableTools.map((tool) => (
                                  <Badge 
                                    key={tool} 
                                    variant={tool === decision.selectedTool ? 'default' : 'outline'}
                                    className="font-mono text-xs"
                                  >
                                    {tool}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Alternatives Considered */}
                          {decision.alternativesConsidered.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Alternatives Considered</h4>
                              <div className="space-y-2">
                                {decision.alternativesConsidered.map((alt, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm">
                                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <span className="font-mono font-medium">{alt.tool}</span>
                                      <span className="text-muted-foreground ml-2">— {alt.reason}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Decision Factors */}
                          {decision.decisionFactors.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Decision Factors</h4>
                              <div className="space-y-2">
                                {decision.decisionFactors.map((factor, i) => (
                                  <div key={i} className="text-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{factor.factor}</span>
                                      <span className="text-muted-foreground">
                                        Weight: {Math.round(factor.weight * 100)}%
                                      </span>
                                    </div>
                                    <p className="text-muted-foreground">{factor.contribution}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
