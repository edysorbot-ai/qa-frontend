import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";

export default function TestRunsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Runs</h1>
          <p className="text-muted-foreground">
            View and manage your test execution history
          </p>
        </div>
        <Button>
          <PlayCircle className="mr-2 h-4 w-4" />
          Start New Run
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No Test Runs</CardTitle>
          <CardDescription>
            Run your test suite to see execution results here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Test runs will show detailed results including pass/fail status, audio transcripts, latency metrics, and conversation analysis.
          </p>
          <Button>
            <PlayCircle className="mr-2 h-4 w-4" />
            Run Your First Test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
