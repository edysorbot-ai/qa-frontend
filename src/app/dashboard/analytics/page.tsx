import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Insights and metrics from your voice agent tests
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversation Metrics</CardTitle>
            <CardDescription>
              Intent accuracy, script adherence, and hallucination detection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              Run tests to see conversation metrics
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latency Analysis</CardTitle>
            <CardDescription>
              Response time distribution (p50, p90, p99)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              Run tests to see latency metrics
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Voice Quality</CardTitle>
            <CardDescription>
              Audio clarity, silence detection, and speech overlap
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              Run tests to see voice quality metrics
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Regression Tracking</CardTitle>
            <CardDescription>
              Compare test results across versions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              Run multiple tests to see regression data
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
