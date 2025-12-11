import { currentUser } from "@clerk/nextjs/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, FlaskConical, PlayCircle, CheckCircle } from "lucide-react";

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.firstName || "User"}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your voice agent testing dashboard.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Connected voice agents
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Cases</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Total test scenarios
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Runs</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Completed test runs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--%</div>
            <p className="text-xs text-muted-foreground">
              Overall success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Test Runs</CardTitle>
            <CardDescription>
              Your latest test execution results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No test runs yet. Add an agent to get started.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Add Voice Agent</p>
                <p className="text-sm text-muted-foreground">Connect ElevenLabs, Retell, or VAPI</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
              <FlaskConical className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Generate Test Cases</p>
                <p className="text-sm text-muted-foreground">Auto-create tests from agent config</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
              <PlayCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Run Test Suite</p>
                <p className="text-sm text-muted-foreground">Execute all test cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
