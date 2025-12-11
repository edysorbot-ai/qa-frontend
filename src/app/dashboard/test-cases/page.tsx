import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";

export default function TestCasesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Cases</h1>
          <p className="text-muted-foreground">
            Manage and generate test scenarios for your agents
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Sparkles className="mr-2 h-4 w-4" />
            Auto Generate
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Test Case
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No Test Cases</CardTitle>
          <CardDescription>
            Create test cases manually or auto-generate from agent configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Test cases define the scenarios to test against your voice agents, including user inputs, expected intents, and expected responses.
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Test Case
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
