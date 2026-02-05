'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { 
  Star,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronUp,
  Settings2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Types
interface GoldenTestThresholds {
  minSemanticSimilarity: number;
  maxLatencyIncrease: number;
  maxCostIncrease: number;
}

interface DriftDetail {
  turnNumber: number;
  baseline: string;
  current: string;
  similarity: number;
  isDrifted: boolean;
}

interface GoldenTestAlert {
  type: 'drift' | 'regression' | 'cost_increase' | 'latency_increase';
  severity: 'warning' | 'critical';
  message: string;
}

interface GoldenTest {
  id: string;
  testCaseId: string;
  agentId: string;
  name: string;
  baselineResultId: string;
  baselineResponses: string[];
  baselineMetrics: {
    overallScore?: number;
    latencyMs?: number;
  };
  baselineCapturedAt: string;
  thresholds: GoldenTestThresholds;
  scheduleFrequency: 'daily' | 'weekly' | 'monthly';
  lastRunAt: string | null;
  nextScheduledRun: string | null;
  status: 'active' | 'paused' | 'failed';
  createdAt: string;
}

interface GoldenTestRun {
  id: string;
  goldenTestId: string;
  passed: boolean;
  semanticSimilarity: number;
  latencyChange: number;
  costChange: number;
  driftDetails: DriftDetail[];
  alerts: GoldenTestAlert[];
  runAt: string;
}

interface GoldenTestCardProps {
  goldenTest: GoldenTest;
  onRefresh: () => void;
}

function GoldenTestCard({ goldenTest, onRefresh }: GoldenTestCardProps) {
  const { getToken } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<GoldenTestRun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [thresholds, setThresholds] = useState(goldenTest.thresholds);
  const [scheduleFrequency, setScheduleFrequency] = useState(goldenTest.scheduleFrequency);

  const fetchHistory = async () => {
    if (history.length > 0) return;
    
    try {
      setLoadingHistory(true);
      const token = await getToken();
      const response = await fetch(
        `${api.baseUrl}/api/golden-tests/${goldenTest.id}/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setUpdating(true);
      const token = await getToken();
      const newStatus = goldenTest.status === 'active' ? 'paused' : 'active';
      
      const response = await fetch(
        `${api.baseUrl}/api/golden-tests/${goldenTest.id}`,
        {
          method: 'PUT',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        }
      );
      
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this golden test?')) return;
    
    try {
      setUpdating(true);
      const token = await getToken();
      
      const response = await fetch(
        `${api.baseUrl}/api/golden-tests/${goldenTest.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setUpdating(true);
      const token = await getToken();
      
      const response = await fetch(
        `${api.baseUrl}/api/golden-tests/${goldenTest.id}`,
        {
          method: 'PUT',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ thresholds, scheduleFrequency })
        }
      );
      
      if (response.ok) {
        setShowSettings(false);
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = () => {
    switch (goldenTest.status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case 'paused':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Paused</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Failed</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className={`border ${goldenTest.status === 'failed' ? 'border-red-300 bg-red-50/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <CardTitle className="text-lg">{goldenTest.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setExpanded(!expanded);
                if (!expanded) fetchHistory();
              }}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <CardDescription className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Baseline: {new Date(goldenTest.baselineCapturedAt).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {goldenTest.scheduleFrequency}
          </span>
          {goldenTest.lastRunAt && (
            <span>Last run: {new Date(goldenTest.lastRunAt).toLocaleDateString()}</span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-2 bg-muted rounded-lg">
            <div className="text-2xl font-bold">
              {Math.round(goldenTest.thresholds.minSemanticSimilarity * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Min Similarity</div>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <div className="text-2xl font-bold">
              {goldenTest.baselineResponses.length}
            </div>
            <div className="text-xs text-muted-foreground">Baseline Turns</div>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <div className="text-2xl font-bold">
              {goldenTest.baselineMetrics?.latencyMs 
                ? `${Math.round(goldenTest.baselineMetrics.latencyMs)}ms` 
                : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">Baseline Latency</div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleToggleStatus}
            disabled={updating}
          >
            {goldenTest.status === 'active' ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Resume
              </>
            )}
          </Button>
          
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Golden Test Settings</DialogTitle>
                <DialogDescription>
                  Configure thresholds and schedule for this golden test.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Min Semantic Similarity (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round(thresholds.minSemanticSimilarity * 100)}
                    onChange={(e) => setThresholds({
                      ...thresholds,
                      minSemanticSimilarity: parseInt(e.target.value) / 100
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Latency Increase (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round(thresholds.maxLatencyIncrease * 100)}
                    onChange={(e) => setThresholds({
                      ...thresholds,
                      maxLatencyIncrease: parseInt(e.target.value) / 100
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select value={scheduleFrequency} onValueChange={(v: 'daily' | 'weekly' | 'monthly') => setScheduleFrequency(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSettings} disabled={updating}>
                  {updating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline" 
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete}
            disabled={updating}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
        
        {/* Expanded Content - Run History */}
        {expanded && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Run History</h4>
            
            {loadingHistory ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No runs yet. The first run will happen according to the schedule.
              </p>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 5).map((run) => (
                  <div 
                    key={run.id} 
                    className={`p-3 rounded-lg border ${
                      run.passed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {run.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm">
                          {run.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(run.runAt).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Similarity:</span>{' '}
                        <span className="font-medium">
                          {Math.round(run.semanticSimilarity * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Latency Δ:</span>{' '}
                        <span className={`font-medium ${run.latencyChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {run.latencyChange > 0 ? '+' : ''}{Math.round(run.latencyChange * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Drifted:</span>{' '}
                        <span className="font-medium">
                          {run.driftDetails.filter(d => d.isDrifted).length} turns
                        </span>
                      </div>
                    </div>
                    
                    {run.alerts.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {run.alerts.slice(0, 2).map((alert, i) => (
                          <div 
                            key={i} 
                            className={`text-xs flex items-center gap-1 ${
                              alert.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'
                            }`}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {alert.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface GoldenTestsDashboardProps {
  agentId?: string;
}

export function GoldenTestsDashboard({ agentId }: GoldenTestsDashboardProps) {
  const { getToken } = useAuth();
  const [goldenTests, setGoldenTests] = useState<GoldenTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoldenTests = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      const url = agentId 
        ? `${api.baseUrl}/api/golden-tests/agent/${agentId}`
        : `${api.baseUrl}/api/golden-tests`;
        
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGoldenTests(data.goldenTests || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load golden tests');
      }
    } catch (err) {
      console.error('Failed to fetch golden tests:', err);
      setError('Failed to load golden tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoldenTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading golden tests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Error Loading Golden Tests</span>
        </div>
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchGoldenTests}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (goldenTests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Star className="h-12 w-12 mx-auto mb-4 text-yellow-400 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Golden Tests Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Mark a passing test result as &quot;golden&quot; to create a baseline for detecting 
              behavioral drift when AI providers update their models.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Summary stats
  const activeCount = goldenTests.filter(t => t.status === 'active').length;
  const failedCount = goldenTests.filter(t => t.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Golden Tests</CardDescription>
            <CardTitle className="text-2xl">{goldenTests.length}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-green-600">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed / Drifted</CardDescription>
            <CardTitle className="text-2xl text-red-600">{failedCount}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paused</CardDescription>
            <CardTitle className="text-2xl text-gray-500">
              {goldenTests.filter(t => t.status === 'paused').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Alerts */}
      {failedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">
              {failedCount} golden test{failedCount > 1 ? 's' : ''} detected behavioral drift!
            </span>
          </div>
          <p className="text-sm text-red-600 mt-1">
            Review the failed tests below to see what changed and update baselines if needed.
          </p>
        </div>
      )}

      {/* Golden Test Cards */}
      <div className="space-y-4">
        {goldenTests.map((test) => (
          <GoldenTestCard 
            key={test.id} 
            goldenTest={test} 
            onRefresh={fetchGoldenTests}
          />
        ))}
      </div>
    </div>
  );
}

// Mark as Golden Button Component (for use in test result pages)
interface MarkAsGoldenButtonProps {
  resultId: string;
  onSuccess?: () => void;
}

export function MarkAsGoldenButton({ resultId, onSuccess }: MarkAsGoldenButtonProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [minSimilarity, setMinSimilarity] = useState(90);

  const handleMarkAsGolden = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      const response = await fetch(
        `${api.baseUrl}/api/golden-tests/mark/${resultId}`,
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            scheduleFrequency,
            thresholds: {
              minSemanticSimilarity: minSimilarity / 100,
              maxLatencyIncrease: 0.20,
              maxCostIncrease: 0.15
            }
          })
        }
      );
      
      if (response.ok) {
        setShowDialog(false);
        onSuccess?.();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create golden test');
      }
    } catch (err) {
      console.error('Failed to mark as golden:', err);
      alert('Failed to create golden test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Star className="h-4 w-4 mr-1" />
          Mark as Golden
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Golden Test</DialogTitle>
          <DialogDescription>
            This test result will become the baseline for detecting behavioral drift.
            The test will be automatically re-run on schedule to compare against this baseline.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Min Semantic Similarity (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={minSimilarity}
              onChange={(e) => setMinSimilarity(parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Alert when responses fall below this similarity threshold
            </p>
          </div>
          <div className="space-y-2">
            <Label>Schedule</Label>
            <Select value={scheduleFrequency} onValueChange={(v: 'daily' | 'weekly' | 'monthly') => setScheduleFrequency(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often to replay and check for drift
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleMarkAsGolden} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            <Star className="h-4 w-4 mr-1" />
            Create Golden Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
