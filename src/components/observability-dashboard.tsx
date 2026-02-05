'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  BarChart3,
  LineChart,
  Bell,
  Shield,
  Zap,
  Users,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
  Target,
  AlertCircle,
  Settings,
} from 'lucide-react';
import api from '@/lib/api';

interface Agent {
  id: string;
  name: string;
  provider: string;
}

interface OverviewMetrics {
  totalCalls: number;
  totalCallsChange: number;
  avgScore: number;
  avgScoreChange: number;
  successRate: number;
  successRateChange: number;
  avgDuration: number;
  avgDurationChange: number;
  issuesFound: number;
  issuesChange: number;
  alertsTriggered: number;
}

interface TrendDataPoint {
  date: string;
  score: number;
  calls: number;
  successRate: number;
  avgDuration: number;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  agentName: string;
  timestamp: string;
  acknowledged: boolean;
}

interface PerformanceByAgent {
  agentId: string;
  agentName: string;
  totalCalls: number;
  avgScore: number;
  successRate: number;
  trend: 'up' | 'down' | 'stable';
}

interface IssueBreakdown {
  type: string;
  count: number;
  percentage: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const TIME_RANGES = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

const MOCK_TRENDS: TrendDataPoint[] = [
  { date: '2024-01-29', score: 82, calls: 45, successRate: 88, avgDuration: 125 },
  { date: '2024-01-30', score: 85, calls: 52, successRate: 90, avgDuration: 118 },
  { date: '2024-01-31', score: 79, calls: 38, successRate: 85, avgDuration: 132 },
  { date: '2024-02-01', score: 88, calls: 61, successRate: 92, avgDuration: 115 },
  { date: '2024-02-02', score: 86, calls: 55, successRate: 91, avgDuration: 120 },
  { date: '2024-02-03', score: 90, calls: 48, successRate: 94, avgDuration: 108 },
  { date: '2024-02-04', score: 87, calls: 63, successRate: 89, avgDuration: 122 },
];

export function ObservabilityDashboard() {
  const { getToken } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [trends, setTrends] = useState<TrendDataPoint[]>(MOCK_TRENDS);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<PerformanceByAgent[]>([]);
  const [issueBreakdown, setIssueBreakdown] = useState<IssueBreakdown[]>([]);

  // Fetch agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const token = await getToken();
        const response = await fetch(api.endpoints.agents.list, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents || data || []);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };
    fetchAgents();
  }, [getToken]);

  // Fetch observability data
  const fetchObservabilityData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      
      // Fetch overview metrics
      const metricsRes = await fetch(
        `${api.baseUrl}/api/observability/metrics?agentId=${selectedAgentId}&timeRange=${timeRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      } else {
        // Set mock data for demo
        setMetrics({
          totalCalls: 362,
          totalCallsChange: 12.5,
          avgScore: 87,
          avgScoreChange: 3.2,
          successRate: 91,
          successRateChange: -1.5,
          avgDuration: 118,
          avgDurationChange: -5.3,
          issuesFound: 23,
          issuesChange: -15,
          alertsTriggered: 5,
        });
      }

      // Fetch alerts
      const alertsRes = await fetch(
        `${api.baseUrl}/api/observability/alerts?agentId=${selectedAgentId}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      } else {
        // Mock alerts
        setAlerts([
          {
            id: '1',
            type: 'error',
            title: 'High Error Rate Detected',
            description: 'Agent failing 20% of calls in last hour',
            agentName: 'Sales Bot',
            timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
            acknowledged: false,
          },
          {
            id: '2',
            type: 'warning',
            title: 'Latency Spike',
            description: 'Response time increased by 45% compared to baseline',
            agentName: 'Support Agent',
            timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
            acknowledged: false,
          },
          {
            id: '3',
            type: 'info',
            title: 'Performance Improvement',
            description: 'Agent score improved by 8% over last week',
            agentName: 'Booking Agent',
            timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
            acknowledged: true,
          },
        ]);
      }

      // Fetch agent performance
      setAgentPerformance([
        { agentId: '1', agentName: 'Sales Bot', totalCalls: 145, avgScore: 89, successRate: 93, trend: 'up' },
        { agentId: '2', agentName: 'Support Agent', totalCalls: 98, avgScore: 85, successRate: 88, trend: 'stable' },
        { agentId: '3', agentName: 'Booking Agent', totalCalls: 119, avgScore: 91, successRate: 95, trend: 'up' },
      ]);

      // Fetch issue breakdown
      setIssueBreakdown([
        { type: 'Hallucination', count: 8, percentage: 35, severity: 'critical' },
        { type: 'Script Deviation', count: 6, percentage: 26, severity: 'high' },
        { type: 'Slow Response', count: 5, percentage: 22, severity: 'medium' },
        { type: 'Audio Quality', count: 4, percentage: 17, severity: 'low' },
      ]);

    } catch (error) {
      console.error('Error fetching observability data:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken, selectedAgentId, timeRange]);

  useEffect(() => {
    fetchObservabilityData();
  }, [fetchObservabilityData]);

  const renderTrendIndicator = (value: number) => {
    if (value > 0) {
      return (
        <span className="flex items-center text-green-600 text-sm">
          <ArrowUpRight className="h-4 w-4" />
          {value.toFixed(1)}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="flex items-center text-red-600 text-sm">
          <ArrowDownRight className="h-4 w-4" />
          {Math.abs(value).toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="flex items-center text-gray-500 text-sm">
        <Minus className="h-4 w-4" />
        0%
      </span>
    );
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Simple bar chart component
  const SimpleBarChart = ({ data, height = 120 }: { data: TrendDataPoint[], height?: number }) => {
    const maxScore = Math.max(...data.map(d => d.score));
    return (
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((point, i) => (
          <div
            key={i}
            className="flex-1 bg-primary/80 hover:bg-primary rounded-t transition-all cursor-pointer group relative"
            style={{ height: `${(point.score / maxScore) * 100}%` }}
          >
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {point.date}: {point.score}%
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Eye className="h-8 w-8" />
            Observability
          </h1>
          <p className="text-muted-foreground">
            Monitor production conversations, track performance trends, and manage alerts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchObservabilityData}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {metrics && renderTrendIndicator(metrics.totalCallsChange)}
            </div>
            <div className="text-2xl font-bold mt-2">{metrics?.totalCalls || 0}</div>
            <p className="text-xs text-muted-foreground">Total Calls</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Target className="h-4 w-4 text-muted-foreground" />
              {metrics && renderTrendIndicator(metrics.avgScoreChange)}
            </div>
            <div className="text-2xl font-bold mt-2">{metrics?.avgScore || 0}%</div>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              {metrics && renderTrendIndicator(metrics.successRateChange)}
            </div>
            <div className="text-2xl font-bold mt-2">{metrics?.successRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {metrics && renderTrendIndicator(metrics.avgDurationChange)}
            </div>
            <div className="text-2xl font-bold mt-2">{metrics?.avgDuration || 0}s</div>
            <p className="text-xs text-muted-foreground">Avg Duration</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              {metrics && renderTrendIndicator(metrics.issuesChange)}
            </div>
            <div className="text-2xl font-bold mt-2">{metrics?.issuesFound || 0}</div>
            <p className="text-xs text-muted-foreground">Issues Found</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Badge variant="destructive" className="text-xs">
                {metrics?.alertsTriggered || 0} new
              </Badge>
            </div>
            <div className="text-2xl font-bold mt-2">{metrics?.alertsTriggered || 0}</div>
            <p className="text-xs text-muted-foreground">Alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends" className="gap-2">
            <LineChart className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="h-4 w-4" />
            Alerts
            {alerts.filter(a => !a.acknowledged).length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {alerts.filter(a => !a.acknowledged).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-2">
            <Users className="h-4 w-4" />
            By Agent
          </TabsTrigger>
          <TabsTrigger value="issues" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Issues
          </TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Quality Score Trend
                </CardTitle>
                <CardDescription>Daily average quality scores</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={trends} height={150} />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  {trends.slice(0, 7).map((d, i) => (
                    <span key={i}>{new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Call Volume
                </CardTitle>
                <CardDescription>Number of calls per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1" style={{ height: 150 }}>
                  {trends.map((point, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500/80 hover:bg-blue-500 rounded-t transition-all cursor-pointer group relative"
                      style={{ height: `${(point.calls / Math.max(...trends.map(d => d.calls))) * 100}%` }}
                    >
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {point.date}: {point.calls} calls
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  {trends.slice(0, 7).map((d, i) => (
                    <span key={i}>{new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Success Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold">{metrics?.successRate || 0}%</div>
                  {metrics && renderTrendIndicator(metrics.successRateChange)}
                </div>
                <Progress value={metrics?.successRate || 0} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold">{metrics?.avgDuration || 0}s</div>
                  {metrics && renderTrendIndicator(metrics.avgDurationChange)}
                </div>
                <div className="flex gap-1 mt-2">
                  <Badge variant="outline" className="text-xs">P50: 85s</Badge>
                  <Badge variant="outline" className="text-xs">P90: 145s</Badge>
                  <Badge variant="outline" className="text-xs">P99: 210s</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Issue Detection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold">
                    {metrics ? ((metrics.issuesFound / metrics.totalCalls) * 100).toFixed(1) : 0}%
                  </div>
                  {metrics && renderTrendIndicator(metrics.issuesChange)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {metrics?.issuesFound || 0} issues in {metrics?.totalCalls || 0} calls
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Alerts</CardTitle>
                  <CardDescription>Real-time notifications for errors and performance issues</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Alerts
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No active alerts</p>
                  <p className="text-sm">All systems operating normally</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        alert.acknowledged ? 'bg-muted/50' : 'bg-background'
                      }`}
                    >
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{alert.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {alert.agentName}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {!alert.acknowledged && (
                        <Button variant="ghost" size="sm">
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Agent Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Agent</CardTitle>
              <CardDescription>Compare metrics across all your agents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentPerformance.map((agent) => (
                  <div key={agent.agentId} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{agent.agentName}</p>
                        {agent.trend === 'up' && (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        )}
                        {agent.trend === 'down' && (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        {agent.trend === 'stable' && (
                          <Minus className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {agent.totalCalls} calls
                      </p>
                    </div>
                    <div className="text-center px-4">
                      <div className="text-2xl font-bold">{agent.avgScore}%</div>
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                    </div>
                    <div className="text-center px-4">
                      <div className="text-2xl font-bold">{agent.successRate}%</div>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                    </div>
                    <div className="w-32">
                      <Progress value={agent.avgScore} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Issue Breakdown</CardTitle>
              <CardDescription>Most common issues found in conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {issueBreakdown.map((issue, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(issue.severity)}`} />
                        <span className="font-medium">{issue.type}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {issue.severity}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {issue.count} occurrences ({issue.percentage}%)
                      </span>
                    </div>
                    <Progress value={issue.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Critical Issues</CardTitle>
                <CardDescription>Requires immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {issueBreakdown
                    .filter(i => i.severity === 'critical' || i.severity === 'high')
                    .map((issue, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          {issue.type}
                        </span>
                        <Badge variant="destructive">{issue.count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommendations</CardTitle>
                <CardDescription>Actions to improve performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-2 border rounded">
                    <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Reduce Hallucinations</p>
                      <p className="text-xs text-muted-foreground">
                        Add more specific instructions to your agent prompt
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 border rounded">
                    <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Improve Script Adherence</p>
                      <p className="text-xs text-muted-foreground">
                        Add guardrails for off-topic conversations
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 border rounded">
                    <Clock className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Optimize Response Time</p>
                      <p className="text-xs text-muted-foreground">
                        Consider using a faster LLM model for simple queries
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
