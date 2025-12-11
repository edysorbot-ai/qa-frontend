import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const providers = [
  {
    name: "ElevenLabs",
    description: "Connect your ElevenLabs voice agents",
    connected: false,
  },
  {
    name: "Retell",
    description: "Connect your Retell AI voice agents",
    connected: false,
  },
  {
    name: "VAPI",
    description: "Connect your VAPI voice agents",
    connected: false,
  },
  {
    name: "OpenAI Realtime",
    description: "Connect OpenAI Realtime voice API",
    connected: false,
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your voice agent providers
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.name}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {provider.name}
                <span className={`text-xs px-2 py-1 rounded-full ${
                  provider.connected 
                    ? "bg-green-100 text-green-700" 
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {provider.connected ? "Connected" : "Not Connected"}
                </span>
              </CardTitle>
              <CardDescription>{provider.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add API Key
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
