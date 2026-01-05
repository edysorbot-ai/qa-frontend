"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Check, Loader2, X, Bell, Mail, Trash2, Users, Eye, EyeOff, Plug } from "lucide-react";
import { api } from "@/lib/api";

type Provider = "elevenlabs" | "retell" | "vapi" | "openai_realtime" | "haptik";

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
  {
    key: "haptik",
    name: "Haptik",
    description: "Connect your Haptik conversational AI bots",
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

interface TeamMember {
  id: string;
  email: string;
  name: string;
  status: string;
  created_at: string;
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

  // Email config type
  interface EmailConfig {
    email: string;
    enabled: boolean;
    type: 'account' | 'team_member';
    name?: string;
  }

  // Alert settings state
  const [alertSettings, setAlertSettings] = useState({
    enabled: false,
    email_addresses: [] as string[],
    email_configs: [] as EmailConfig[],
    notify_on_test_failure: true,
    notify_on_scheduled_failure: true,
  });
  const [newEmailInput, setNewEmailInput] = useState("");
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsSaving, setAlertsSaving] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);
  const [teamMembersSaving, setTeamMembersSaving] = useState(false);
  const [teamMembersError, setTeamMembersError] = useState<string | null>(null);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

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

  // Fetch alert settings on mount
  useEffect(() => {
    const loadAlertSettings = async () => {
      try {
        setAlertsLoading(true);
        const token = await getToken();
        if (!token) return;

        const response = await fetch(api.endpoints.alertSettings.get, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const settings = data.settings;
          
          // Handle email_configs - if it exists, use it; otherwise migrate from email_addresses
          let emailConfigs: EmailConfig[] = settings.email_configs || [];
          
          // If no email_configs but has email_addresses, create configs from addresses
          if (emailConfigs.length === 0 && settings.email_addresses?.length > 0) {
            emailConfigs = settings.email_addresses.map((email: string, index: number) => ({
              email,
              enabled: true,
              type: index === 0 ? 'account' : 'account',
              name: undefined
            }));
          }
          
          // If still empty, add user's email as default
          if (emailConfigs.length === 0 && user?.emailAddresses?.[0]?.emailAddress) {
            emailConfigs = [{
              email: user.emailAddresses[0].emailAddress,
              enabled: true,
              type: 'account',
              name: undefined
            }];
          }

          setAlertSettings({
            enabled: settings.enabled || false,
            email_addresses: settings.email_addresses || [],
            email_configs: emailConfigs,
            notify_on_test_failure: settings.notify_on_test_failure ?? true,
            notify_on_scheduled_failure: settings.notify_on_scheduled_failure ?? true,
          });
        }
      } catch (error) {
        console.error("Error fetching alert settings:", error);
      } finally {
        setAlertsLoading(false);
      }
    };

    loadAlertSettings();
  }, [getToken, user]);

  // Check role and load team members on mount
  useEffect(() => {
    const checkRoleAndLoadTeamMembers = async () => {
      try {
        setTeamMembersLoading(true);
        const token = await getToken();
        if (!token) return;

        // Check if current user is a team member
        const roleResponse = await fetch(api.endpoints.teamMembers.checkRole, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (roleResponse.ok) {
          const roleData = await roleResponse.json();
          setIsTeamMember(roleData.isTeamMember);
          setRoleChecked(true);

          // Only load team members if user is not a team member (i.e., is an owner)
          if (!roleData.isTeamMember) {
            const membersResponse = await fetch(api.endpoints.teamMembers.list, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (membersResponse.ok) {
              const membersData = await membersResponse.json();
              setTeamMembers(membersData.teamMembers || []);
            }
          }
        }
      } catch (error) {
        console.error("Error checking role or loading team members:", error);
      } finally {
        setTeamMembersLoading(false);
      }
    };

    checkRoleAndLoadTeamMembers();
  }, [getToken]);

  const updateProviderState = (provider: Provider, updates: Partial<ProviderState>) => {
    setProviderStates((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], ...updates },
    }));
  };

  // Alert settings handlers
  const handleToggleAlerts = async (enabled: boolean) => {
    setAlertsSaving(true);
    setAlertsError(null);
    try {
      const token = await getToken();
      
      // Ensure user's email is in the list when enabling
      let emailConfigs = alertSettings.email_configs;
      if (enabled && emailConfigs.length === 0 && user?.emailAddresses?.[0]?.emailAddress) {
        emailConfigs = [{
          email: user.emailAddresses[0].emailAddress,
          enabled: true,
          type: 'account' as const,
          name: undefined
        }];
      }

      const response = await fetch(api.endpoints.alertSettings.update, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled,
          email_configs: emailConfigs,
          notify_on_test_failure: alertSettings.notify_on_test_failure,
          notify_on_scheduled_failure: alertSettings.notify_on_scheduled_failure,
        }),
      });

      if (response.ok) {
        setAlertSettings(prev => ({ ...prev, enabled, email_configs: emailConfigs }));
      } else {
        const data = await response.json();
        setAlertsError(data.message || "Failed to update alert settings");
      }
    } catch (error) {
      setAlertsError("Network error. Please try again.");
    } finally {
      setAlertsSaving(false);
    }
  };

  // Toggle individual email notification
  const handleToggleEmailConfig = async (email: string, enabled: boolean) => {
    setAlertsSaving(true);
    setAlertsError(null);
    try {
      const token = await getToken();
      
      const updatedConfigs = alertSettings.email_configs.map(config => 
        config.email === email ? { ...config, enabled } : config
      );

      const response = await fetch(api.endpoints.alertSettings.update, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_configs: updatedConfigs,
        }),
      });

      if (response.ok) {
        setAlertSettings(prev => ({ ...prev, email_configs: updatedConfigs }));
      } else {
        const data = await response.json();
        setAlertsError(data.message || "Failed to update email settings");
      }
    } catch (error) {
      setAlertsError("Network error. Please try again.");
    } finally {
      setAlertsSaving(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmailInput.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmailInput)) {
      setAlertsError("Please enter a valid email address");
      return;
    }

    // Check if email already exists in email_configs
    if (alertSettings.email_configs.some(c => c.email === newEmailInput)) {
      setAlertsError("Email already added");
      return;
    }

    setAlertsSaving(true);
    setAlertsError(null);
    try {
      const token = await getToken();
      
      const newConfig: EmailConfig = {
        email: newEmailInput,
        enabled: true,
        type: 'account',
        name: undefined
      };
      const updatedConfigs = [...alertSettings.email_configs, newConfig];
      
      const response = await fetch(api.endpoints.alertSettings.update, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email_configs: updatedConfigs }),
      });

      if (response.ok) {
        setAlertSettings(prev => ({
          ...prev,
          email_configs: updatedConfigs,
        }));
        setNewEmailInput("");
      } else {
        const data = await response.json();
        setAlertsError(data.message || "Failed to add email");
      }
    } catch (error) {
      setAlertsError("Network error. Please try again.");
    } finally {
      setAlertsSaving(false);
    }
  };

  const handleRemoveEmail = async (email: string) => {
    // Don't allow removing account or team member emails - they can only be toggled
    const emailConfig = alertSettings.email_configs.find(c => c.email === email);
    if (emailConfig?.type === 'account' || emailConfig?.type === 'team_member') {
      setAlertsError("Account and team member emails cannot be removed, only disabled");
      return;
    }

    setAlertsSaving(true);
    setAlertsError(null);
    try {
      const token = await getToken();
      const updatedConfigs = alertSettings.email_configs.filter(c => c.email !== email);
      
      const response = await fetch(api.endpoints.alertSettings.update, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email_configs: updatedConfigs }),
      });

      if (response.ok) {
        setAlertSettings(prev => ({
          ...prev,
          email_configs: updatedConfigs,
        }));
      } else {
        const data = await response.json();
        setAlertsError(data.message || "Failed to remove email");
      }
    } catch (error) {
      setAlertsError("Network error. Please try again.");
    } finally {
      setAlertsSaving(false);
    }
  };

  const handleToggleNotificationType = async (type: 'test' | 'scheduled', enabled: boolean) => {
    setAlertsSaving(true);
    setAlertsError(null);
    try {
      const token = await getToken();
      const updates = type === 'test' 
        ? { notify_on_test_failure: enabled }
        : { notify_on_scheduled_failure: enabled };

      const response = await fetch(api.endpoints.alertSettings.update, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setAlertSettings(prev => ({
          ...prev,
          ...(type === 'test' 
            ? { notify_on_test_failure: enabled }
            : { notify_on_scheduled_failure: enabled }
          ),
        }));
      } else {
        const data = await response.json();
        setAlertsError(data.message || "Failed to update settings");
      }
    } catch (error) {
      setAlertsError("Network error. Please try again.");
    } finally {
      setAlertsSaving(false);
    }
  };

  // Team member handlers
  const handleAddTeamMember = async () => {
    if (!newMemberForm.email.trim() || !newMemberForm.password.trim() || !newMemberForm.name.trim()) {
      setTeamMembersError("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberForm.email)) {
      setTeamMembersError("Please enter a valid email address");
      return;
    }

    if (newMemberForm.password.length < 8) {
      setTeamMembersError("Password must be at least 8 characters");
      return;
    }

    setTeamMembersSaving(true);
    setTeamMembersError(null);

    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.teamMembers.create, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newMemberForm),
      });

      const data = await response.json();

      if (response.ok) {
        setTeamMembers(prev => [...prev, data.teamMember]);
        setNewMemberForm({ name: "", email: "", password: "" });
      } else {
        setTeamMembersError(data.message || "Failed to create team member");
      }
    } catch (error) {
      setTeamMembersError("Network error. Please try again.");
    } finally {
      setTeamMembersSaving(false);
    }
  };

  const handleRemoveTeamMember = async (id: string) => {
    setTeamMembersSaving(true);
    setTeamMembersError(null);

    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.teamMembers.delete(id), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setTeamMembers(prev => prev.filter(m => m.id !== id));
      } else {
        const data = await response.json();
        setTeamMembersError(data.message || "Failed to remove team member");
      }
    } catch (error) {
      setTeamMembersError("Network error. Please try again.");
    } finally {
      setTeamMembersSaving(false);
    }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and integrations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground">{user?.emailAddresses?.[0]?.emailAddress}</p>
          </div>
          <UserButton 
            appearance={{
              elements: {
                avatarBox: "w-10 h-10",
              }
            }}
          />
        </div>
      </div>

      {!roleChecked ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
      <Tabs defaultValue={isTeamMember ? "integrations" : "team"} className="space-y-6">
        <TabsList>
          {!isTeamMember && (
            <TabsTrigger value="team">
              <Users className="mr-2 h-4 w-4" />
              Team
            </TabsTrigger>
          )}
          <TabsTrigger value="integrations">
            <Plug className="mr-2 h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="mr-2 h-4 w-4" />
            Alerts
          </TabsTrigger>
        </TabsList>

        {/* Team Tab - Only show for owners */}
        {!isTeamMember && (
          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Add team members who can access and test your agents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {teamMembersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {teamMembersError && (
                      <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                        {teamMembersError}
                      </div>
                    )}

                    {/* Add New Team Member Form */}
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <h3 className="font-medium text-sm">Add New Team Member</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="member-name">Name</Label>
                          <Input
                            id="member-name"
                            placeholder="Enter name..."
                            value={newMemberForm.name}
                            onChange={(e) => {
                              setNewMemberForm(prev => ({ ...prev, name: e.target.value }));
                              setTeamMembersError(null);
                            }}
                            disabled={teamMembersSaving}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="member-email">Email</Label>
                          <Input
                            id="member-email"
                            type="email"
                            placeholder="Enter email..."
                            value={newMemberForm.email}
                            onChange={(e) => {
                              setNewMemberForm(prev => ({ ...prev, email: e.target.value }));
                              setTeamMembersError(null);
                            }}
                            disabled={teamMembersSaving}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="member-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="member-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password (min 8 characters)..."
                            value={newMemberForm.password}
                            onChange={(e) => {
                              setNewMemberForm(prev => ({ ...prev, password: e.target.value }));
                              setTeamMembersError(null);
                            }}
                            disabled={teamMembersSaving}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button
                        onClick={handleAddTeamMember}
                        disabled={teamMembersSaving || !newMemberForm.email.trim() || !newMemberForm.password.trim() || !newMemberForm.name.trim()}
                        className="w-full md:w-auto"
                      >
                        {teamMembersSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Add Team Member
                      </Button>
                    </div>

                    {/* Team Members List */}
                    {teamMembers.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-medium text-sm">Current Team Members</h3>
                        <div className="space-y-2">
                          {teamMembers.map((member) => (
                            <div 
                              key={member.id} 
                              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">
                                    {member.name?.charAt(0)?.toUpperCase() || member.email.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{member.name || 'Team Member'}</p>
                                  <p className="text-sm text-muted-foreground">{member.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                  {member.status || 'Active'}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveTeamMember(member.id)}
                                  disabled={teamMembersSaving}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {teamMembers.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No team members yet. Add your first team member above.</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Provider Integrations</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Connect your voice agent providers
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {providers.map(renderProviderCard)}
            </div>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Alerts</CardTitle>
                  <CardDescription>
                    Receive email notifications when test cases fail
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="alerts-toggle"
                    checked={alertSettings.enabled}
                    onCheckedChange={handleToggleAlerts}
                    disabled={alertsSaving || alertsLoading}
                  />
                  <Label htmlFor="alerts-toggle" className="text-sm">
                    {alertSettings.enabled ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {alertsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {alertsError && (
                    <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                      {alertsError}
                    </div>
                  )}

                  {alertSettings.enabled && (
                    <>
                      {/* Notification Types */}
                      <div className="space-y-4">
                        <h3 className="font-medium text-sm">Notify me when:</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Test cases fail in manual test runs</span>
                            </div>
                            <Switch
                              checked={alertSettings.notify_on_test_failure}
                              onCheckedChange={(checked) => handleToggleNotificationType('test', checked)}
                              disabled={alertsSaving}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Test cases fail in scheduled test runs</span>
                            </div>
                            <Switch
                              checked={alertSettings.notify_on_scheduled_failure}
                              onCheckedChange={(checked) => handleToggleNotificationType('scheduled', checked)}
                              disabled={alertsSaving}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Email Addresses */}
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-medium text-sm">Email Addresses</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Alert notifications will be sent to enabled email addresses
                        </p>

                        {/* Email List */}
                        <div className="space-y-2">
                          {alertSettings.email_configs.map((config) => (
                            <div 
                              key={config.email} 
                              className={`flex items-center justify-between p-3 rounded-md ${
                                config.enabled ? 'bg-muted/50' : 'bg-muted/20 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <Mail className={`h-4 w-4 ${config.enabled ? 'text-muted-foreground' : 'text-muted-foreground/50'}`} />
                                <span className={`text-sm ${!config.enabled && 'text-muted-foreground'}`}>
                                  {config.email}
                                </span>
                                {config.type === 'account' && (
                                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                    Account Email
                                  </span>
                                )}
                                {config.type === 'team_member' && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-full">
                                    Team Member{config.name ? ` • ${config.name}` : ''}
                                  </span>
                                )}
                              </div>
                              <Switch
                                checked={config.enabled}
                                onCheckedChange={(checked) => handleToggleEmailConfig(config.email, checked)}
                                disabled={alertsSaving}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Add Email Input */}
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="Enter email address..."
                            value={newEmailInput}
                            onChange={(e) => {
                              setNewEmailInput(e.target.value);
                              setAlertsError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddEmail();
                              }
                            }}
                            disabled={alertsSaving}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleAddEmail}
                            disabled={alertsSaving || !newEmailInput.trim()}
                            size="default"
                          >
                            {alertsSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {!alertSettings.enabled && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Enable alerts to receive email notifications when test cases fail</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
