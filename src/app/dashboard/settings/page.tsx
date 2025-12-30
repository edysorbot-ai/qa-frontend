"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

type Provider = "elevenlabs" | "retell" | "vapi" | "openai_realtime";

interface ProviderConfig {
  key: Provider;
  name: string;
  description: string;
}

const providers: ProviderConfig[] = [
  {
    key: "elevenlabs",
    name: "ElevenLabs",
    description: "Connect your ElevenLabs voice agents",
  },
  {
    key: "retell",
    name: "Retell",
    description: "Connect your Retell AI voice agents",
  },
  {
    key: "vapi",
    name: "VAPI",
    description: "Connect your VAPI voice agents",
  },
  // OpenAI Realtime is hidden until WebSocket caller implementation is complete
  // {
  //   key: "openai_realtime",
  //   name: "OpenAI Realtime",
  //   description: "Connect OpenAI Realtime voice API",
  // },
];

interface Integration {
  id: string;
  provider: Provider;
  api_key: string;
  is_active: boolean;
}

interface ProviderState {
  integration: Integration | null;
  isEditing: boolean;
  apiKeyInput: string;
  showApiKey: boolean;
  isLoading: boolean;
  isValidating: boolean;
  isConnected: boolean;
  error: string | null;
}

export default function SettingsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [providerStates, setProviderStates] = useState<Record<Provider, ProviderState>>(() => {
    const initial: Record<Provider, ProviderState> = {} as Record<Provider, ProviderState>;
    providers.forEach((p) => {
      initial[p.key] = {
        integration: null,
        isEditing: false,
        apiKeyInput: "",
        showApiKey: false,
        isLoading: false,
        isValidating: false,
        isConnected: false,
        error: null,
      };
    });
    return initial;
  });

  // Fetch existing integrations on mount
  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.log("No auth token available yet");
          return;
        }
        
        const response = await fetch(api.endpoints.integrations.list, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const integrations: Integration[] = data.integrations || [];

          setProviderStates((prev) => {
            const updated = { ...prev };
            integrations.forEach((integration) => {
              if (updated[integration.provider]) {
                updated[integration.provider] = {
                  ...updated[integration.provider],
                  integration,
                  isConnected: integration.is_active,
                };
              }
            });
            return updated;
          });
        }
      } catch (error) {
        console.error("Error fetching integrations:", error);
      }
    };

    loadIntegrations();
  }, [getToken]);

  const updateProviderState = (provider: Provider, updates: Partial<ProviderState>) => {
    setProviderStates((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], ...updates },
    }));
  };

  const handleAddApiKey = (provider: Provider) => {
    updateProviderState(provider, { isEditing: true, apiKeyInput: "", error: null });
  };

  const handleSaveApiKey = async (provider: Provider) => {
    const state = providerStates[provider];
    if (!state.apiKeyInput.trim()) return;

    updateProviderState(provider, { isLoading: true, error: null });

    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.integrations.create, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          api_key: state.apiKeyInput,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        updateProviderState(provider, {
          integration: data.integration,
          isEditing: false,
          showApiKey: false,
          isLoading: false,
          isConnected: false,
        });
      } else {
        updateProviderState(provider, {
          isLoading: false,
          error: data.message || "Failed to save API key",
        });
      }
    } catch (error) {
      updateProviderState(provider, {
        isLoading: false,
        error: "Network error. Please try again.",
      });
    }
  };

  const handleValidateConnection = async (provider: Provider) => {
    const state = providerStates[provider];
    if (!state.integration) return;

    updateProviderState(provider, { isValidating: true, error: null });

    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.integrations.test(state.integration.id), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.connected) {
        updateProviderState(provider, {
          isValidating: false,
          isConnected: true,
        });
      } else {
        updateProviderState(provider, {
          isValidating: false,
          isConnected: false,
          error: data.message || "Connection failed",
        });
      }
    } catch (error) {
      updateProviderState(provider, {
        isValidating: false,
        error: "Network error. Please try again.",
      });
    }
  };

  const renderProviderCard = (providerConfig: ProviderConfig) => {
    const state = providerStates[providerConfig.key];
    const hasApiKey = !!state.integration;

    return (
      <Card key={providerConfig.key}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            {providerConfig.name}
            {!hasApiKey ? (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                Not Connected
              </span>
            ) : state.isConnected ? (
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Connected
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-3"
                onClick={() => handleValidateConnection(providerConfig.key)}
                disabled={state.isValidating}
              >
                {state.isValidating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Connect"
                )}
              </Button>
            )}
          </CardTitle>
          <CardDescription className="text-xs">{providerConfig.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {state.error && (
            <p className="text-sm text-red-500 mb-2">{state.error}</p>
          )}

          {!hasApiKey && !state.isEditing ? (
            <Button
              variant="outline"
              className="w-full"
              size="sm"
              onClick={() => handleAddApiKey(providerConfig.key)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add API Key
            </Button>
          ) : state.isEditing ? (
            <div className="relative">
              <Input
                type="text"
                placeholder="Enter your API key..."
                value={state.apiKeyInput}
                onChange={(e) =>
                  updateProviderState(providerConfig.key, { apiKeyInput: e.target.value })
                }
                className="pr-10 text-sm"
                disabled={state.isLoading}
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                onClick={() => handleSaveApiKey(providerConfig.key)}
                disabled={state.isLoading || !state.apiKeyInput.trim()}
              >
                {state.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                ) : (
                  <Check className="h-4 w-4 text-green-600" />
                )}
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                type="text"
                value={state.integration?.api_key || ""}
                readOnly
                className="pr-10 bg-gray-50 font-mono text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and integrations
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Manage your account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-16 h-16",
                }
              }}
            />
            <div>
              <p className="font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-muted-foreground">{user?.emailAddresses?.[0]?.emailAddress}</p>
            </div>
          </div>
          <div className="pt-4 border-t">
            <h3 className="font-medium mb-2">Account Details</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrations Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Integrations</h2>
        <p className="text-muted-foreground mb-4">
          Connect your voice agent providers
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map(renderProviderCard)}
        </div>
      </div>
    </div>
  );
}
