import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voice Agents</h1>
          <p className="text-muted-foreground">
            Manage your connected voice agents
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Agent
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No Agents Connected</CardTitle>
          <CardDescription>
            Connect your first voice agent to start testing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Add a voice agent from ElevenLabs, Retell, VAPI, or OpenAI Realtime to begin generating test cases.
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Agent
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
