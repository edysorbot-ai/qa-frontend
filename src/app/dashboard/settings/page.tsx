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
import { Plus, Check, Loader2, X, Bell, Mail, Trash2, Users, Eye, EyeOff, Plug, MessageSquare, AlertCircle, CheckCircle, CreditCard, Infinity, Package, Gift, Pencil } from "lucide-react";
import { api } from "@/lib/api";

type Provider = "elevenlabs" | "retell" | "vapi" | "openai_realtime" | "haptik" | "bolna" | "livekit";

interface ProviderConfig {
  key: Provider;
  name: string;
  description: string;
}

// All available providers - will be filtered by enabled status from backend
const allProviders: ProviderConfig[] = [
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
  {
    key: "bolna",
    name: "Bolna AI",
    description: "Connect your Bolna AI voice agents",
  },
  {
    key: "livekit",
    name: "LiveKit",
    description: "Connect your LiveKit voice agents",
  },
  {
    key: "openai_realtime",
    name: "OpenAI Realtime",
    description: "Connect OpenAI Realtime voice API",
  },
];

// Provider key mapping from backend to frontend
const providerKeyMap: Record<string, Provider> = {
  'elevenlabs': 'elevenlabs',
  'retell': 'retell',
  'vapi': 'vapi',
  'haptik': 'haptik',
  'bolna': 'bolna',
  'livekit': 'livekit',
  'openai-realtime': 'openai_realtime',
  'custom': 'vapi', // Map custom to vapi or handle separately
};

interface Integration {
  id: string;
  provider: Provider;
  api_key: string;
  base_url: string | null;
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
  apiSecretInput: string; // For LiveKit
  hostInput: string; // For LiveKit
  domainInput: string; // For ElevenLabs custom domain
  showApiKey: boolean;
  isLoading: boolean;
  isValidating: boolean;
  isConnected: boolean;
  error: string | null;
}

export default function SettingsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  
  // State for enabled providers from admin panel
  const [enabledProviders, setEnabledProviders] = useState<Set<string>>(new Set());
  const [providersLoading, setProvidersLoading] = useState(true);
  
  // Filter providers based on what's enabled in admin panel
  const providers = allProviders.filter(p => enabledProviders.has(p.key));
  
  const [providerStates, setProviderStates] = useState<Record<Provider, ProviderState>>(() => {
    const initial: Record<Provider, ProviderState> = {} as Record<Provider, ProviderState>;
    allProviders.forEach((p) => {
      initial[p.key] = {
        integration: null,
        isEditing: false,
        apiKeyInput: "",
        apiSecretInput: "",
        hostInput: "",
        domainInput: "",
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
    type?: 'account' | 'team_member';  // Optional - custom emails won't have a type
    name?: string;
  }

  // Alert settings state
  const [alertSettings, setAlertSettings] = useState({
    enabled: false,
    email_addresses: [] as string[],
    email_configs: [] as EmailConfig[],
    notify_on_test_failure: true,
    notify_on_scheduled_failure: true,
    slack_enabled: false,
    slack_webhook_url: "",
    slack_channel: "",
  });
  const [newEmailInput, setNewEmailInput] = useState("");
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editEmailInput, setEditEmailInput] = useState("");
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsSaving, setAlertsSaving] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  // Slack settings state
  const [slackWebhookInput, setSlackWebhookInput] = useState("");
  const [slackChannelInput, setSlackChannelInput] = useState("");
  const [slackTesting, setSlackTesting] = useState(false);
  const [slackSaving, setSlackSaving] = useState(false);
  const [slackError, setSlackError] = useState<string | null>(null);
  const [slackSuccess, setSlackSuccess] = useState<string | null>(null);

  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);
  const [teamMembersSaving, setTeamMembersSaving] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [teamMembersError, setTeamMembersError] = useState<string | null>(null);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  // Subscription state
  interface SubscriptionData {
    has_subscription: boolean;
    current_credits: number;
    total_credits_purchased: number;
    total_credits_used: number;
    subscription_started?: string;
    package_expires_at?: string;
    package: {
      id: string;
      name: string;
      description?: string;
      credits: number;
      price_usd: number;
      validity_days: number;
      max_team_members: number;
      is_unlimited: boolean;
    } | null;
    features: Record<string, boolean>;
  }
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Referral code state
  const [referralCode, setReferralCode] = useState("");
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralSuccess, setReferralSuccess] = useState<string | null>(null);
  const [hasUsedReferral, setHasUsedReferral] = useState(false);

  // Apply referral code
  const applyReferralCode = async () => {
    if (!referralCode.trim()) return;
    
    setReferralLoading(true);
    setReferralError(null);
    setReferralSuccess(null);
    
    try {
      const token = await getToken();
      if (!token) {
        setReferralError("Please sign in to apply referral code");
        return;
      }

      const response = await fetch(`${api.baseUrl}/api/users/referral/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: referralCode.toUpperCase() })
      });

      const data = await response.json();

      if (!response.ok) {
        setReferralError(data.error || "Failed to apply referral code");
        return;
      }

      setReferralSuccess(data.message || `Successfully applied! You received ${data.creditsAwarded} credits.`);
      setReferralCode("");
      setHasUsedReferral(true);
      
      // Refresh subscription data to show new credits
      const subResponse = await fetch(`${api.baseUrl}/api/users/subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData);
      }
    } catch (error) {
      console.error("Error applying referral code:", error);
      setReferralError("Failed to apply referral code. Please try again.");
    } finally {
      setReferralLoading(false);
    }
  };

  // Fetch subscription data
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        setSubscriptionLoading(true);
        const token = await getToken();
        if (!token) return;
        
        const response = await fetch(`${api.baseUrl}/api/users/subscription`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    loadSubscription();
  }, [getToken]);

  // Fetch enabled integrations from admin panel
  useEffect(() => {
    const loadEnabledIntegrations = async () => {
      try {
        setProvidersLoading(true);
        const response = await fetch(`${api.baseUrl}/api/enabled-integrations`);
        if (response.ok) {
          const data = await response.json();
          const enabled = new Set<string>();
          data.forEach((integration: { provider: string }) => {
            const frontendKey = providerKeyMap[integration.provider];
            if (frontendKey) {
              enabled.add(frontendKey);
            }
          });
          setEnabledProviders(enabled);
        }
      } catch (error) {
        console.error("Error fetching enabled integrations:", error);
        // Fallback to showing all providers if API fails
        setEnabledProviders(new Set(allProviders.map(p => p.key)));
      } finally {
        setProvidersLoading(false);
      }
    };

    loadEnabledIntegrations();
  }, []);

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
            slack_enabled: settings.slack_enabled || false,
            slack_webhook_url: settings.slack_webhook_url || "",
            slack_channel: settings.slack_channel || "",
          });
          
          // Initialize Slack input fields
          setSlackWebhookInput(settings.slack_webhook_url || "");
          setSlackChannelInput(settings.slack_channel || "");
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

  const handleStartEditEmail = (email: string) => {
    setEditingEmail(email);
    setEditEmailInput(email);
    setAlertsError(null);
  };

  const handleCancelEditEmail = () => {
    setEditingEmail(null);
    setEditEmailInput("");
    setAlertsError(null);
  };

  const handleUpdateEmail = async (oldEmail: string) => {
    const newEmail = editEmailInput.trim();
    if (!newEmail) {
      setAlertsError("Email cannot be empty");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setAlertsError("Please enter a valid email address");
      return;
    }

    // Check if new email already exists (excluding the current one being edited)
    if (alertSettings.email_configs.some(c => c.email === newEmail && c.email !== oldEmail)) {
      setAlertsError("Email already exists");
      return;
    }

    if (newEmail === oldEmail) {
      handleCancelEditEmail();
      return;
    }

    setAlertsSaving(true);
    setAlertsError(null);
    try {
      const token = await getToken();
      
      // Update the email in the configs
      const updatedConfigs = alertSettings.email_configs.map(c => 
        c.email === oldEmail ? { ...c, email: newEmail } : c
      );
      
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
        handleCancelEditEmail();
      } else {
        const data = await response.json();
        setAlertsError(data.message || "Failed to update email");
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

  // Slack handlers
  const handleTestSlackConnection = async () => {
    if (!slackWebhookInput.trim()) {
      setSlackError("Please enter a webhook URL");
      return;
    }

    if (!slackWebhookInput.startsWith("https://hooks.slack.com/")) {
      setSlackError("Invalid Slack webhook URL. It should start with https://hooks.slack.com/");
      return;
    }

    setSlackTesting(true);
    setSlackError(null);
    setSlackSuccess(null);

    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.alertSettings.slackTest, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook_url: slackWebhookInput,
          channel: slackChannelInput || undefined,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSlackSuccess(data.message || "Connected successfully!");
      } else {
        setSlackError(data.message || "Failed to connect");
      }
    } catch (error) {
      setSlackError("Network error. Please try again.");
    } finally {
      setSlackTesting(false);
    }
  };

  const handleSaveSlackSettings = async () => {
    setSlackSaving(true);
    setSlackError(null);
    setSlackSuccess(null);

    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.alertSettings.slackUpdate, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slack_enabled: alertSettings.slack_enabled,
          slack_webhook_url: slackWebhookInput,
          slack_channel: slackChannelInput || null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setAlertSettings(prev => ({
          ...prev,
          slack_webhook_url: slackWebhookInput,
          slack_channel: slackChannelInput,
        }));
        setSlackSuccess("Slack settings saved!");
        setTimeout(() => setSlackSuccess(null), 3000);
      } else {
        setSlackError(data.message || "Failed to save settings");
      }
    } catch (error) {
      setSlackError("Network error. Please try again.");
    } finally {
      setSlackSaving(false);
    }
  };

  const handleToggleSlack = async (enabled: boolean) => {
    setSlackSaving(true);
    setSlackError(null);
    setSlackSuccess(null);

    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.alertSettings.slackUpdate, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slack_enabled: enabled,
          slack_webhook_url: slackWebhookInput || alertSettings.slack_webhook_url,
          slack_channel: slackChannelInput || alertSettings.slack_channel || null,
        }),
      });

      if (response.ok) {
        setAlertSettings(prev => ({ ...prev, slack_enabled: enabled }));
      } else {
        const data = await response.json();
        setSlackError(data.message || "Failed to update Slack settings");
      }
    } catch (error) {
      setSlackError("Network error. Please try again.");
    } finally {
      setSlackSaving(false);
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
    updateProviderState(provider, { isEditing: true, apiKeyInput: "", apiSecretInput: "", hostInput: "", domainInput: "", error: null });
  };

  const handleSaveApiKey = async (provider: Provider) => {
    const state = providerStates[provider];
    
    // For LiveKit, combine apiKey and apiSecret into a JSON string
    let apiKeyToSave = state.apiKeyInput.trim();
    
    if (provider === 'livekit') {
      if (!state.apiKeyInput.trim() || !state.apiSecretInput.trim()) {
        updateProviderState(provider, { error: "API Key and API Secret are required" });
        return;
      }
      // Create JSON credentials for LiveKit (host will be derived from LIVEKIT_URL env or entered separately)
      apiKeyToSave = JSON.stringify({
        apiKey: state.apiKeyInput.trim(),
        apiSecret: state.apiSecretInput.trim(),
        host: state.hostInput.trim() || '', // Optional - can be derived from env
      });
    } else if (!apiKeyToSave) {
      return;
    }

    // Build base_url for providers that support custom domains (e.g., ElevenLabs)
    const baseUrlToSave = provider === 'elevenlabs' && state.domainInput.trim() 
      ? state.domainInput.trim() 
      : null;

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
          api_key: apiKeyToSave,
          base_url: baseUrlToSave,
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

  // Handle disconnect/remove integration
  const handleDisconnect = async (provider: Provider) => {
    const state = providerStates[provider];
    if (!state.integration) return;

    updateProviderState(provider, { isLoading: true, error: null });

    try {
      const token = await getToken();
      const response = await fetch(api.endpoints.integrations.delete(state.integration.id), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Reset the provider state to initial
        updateProviderState(provider, {
          isLoading: false,
          isConnected: false,
          integration: null,
          apiKeyInput: "",
          apiSecretInput: "",
          hostInput: "",
          domainInput: "",
          isEditing: false,
          error: null,
        });
      } else {
        const data = await response.json();
        updateProviderState(provider, {
          isLoading: false,
          error: data.message || "Failed to disconnect",
        });
      }
    } catch (error) {
      updateProviderState(provider, {
        isLoading: false,
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
              <span className="text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-700 dark:bg-[#0A2E2F] dark:text-teal-300">
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
            providerConfig.key === 'livekit' ? (
              // LiveKit needs 2 fields: API Key and API Secret
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="API Key (e.g., APId9iCUSEZuCXi)"
                  value={state.apiKeyInput}
                  onChange={(e) =>
                    updateProviderState(providerConfig.key, { apiKeyInput: e.target.value })
                  }
                  className="text-sm"
                  disabled={state.isLoading}
                />
                <Input
                  type="password"
                  placeholder="API Secret"
                  value={state.apiSecretInput}
                  onChange={(e) =>
                    updateProviderState(providerConfig.key, { apiSecretInput: e.target.value })
                  }
                  className="text-sm"
                  disabled={state.isLoading}
                />
                <Input
                  type="text"
                  placeholder="LiveKit URL (e.g., wss://xxx.livekit.cloud) - Optional"
                  value={state.hostInput}
                  onChange={(e) =>
                    updateProviderState(providerConfig.key, { hostInput: e.target.value })
                  }
                  className="text-sm"
                  disabled={state.isLoading}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleSaveApiKey(providerConfig.key)}
                  disabled={state.isLoading || !state.apiKeyInput.trim() || !state.apiSecretInput.trim()}
                >
                  {state.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Connect
                </Button>
              </div>
            ) : providerConfig.key === 'elevenlabs' ? (
              // ElevenLabs: API key + optional custom domain
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Enter your API key..."
                  value={state.apiKeyInput}
                  onChange={(e) =>
                    updateProviderState(providerConfig.key, { apiKeyInput: e.target.value })
                  }
                  className="text-sm"
                  disabled={state.isLoading}
                />
                <Input
                  type="text"
                  placeholder="Custom base URL (e.g., api.in.residency.elevenlabs.io) — Optional"
                  value={state.domainInput}
                  onChange={(e) =>
                    updateProviderState(providerConfig.key, { domainInput: e.target.value })
                  }
                  className="text-sm"
                  disabled={state.isLoading}
                />
                {state.domainInput.trim() && (
                  <p className="text-xs text-muted-foreground">
                    API calls will use: {state.domainInput.trim().replace(/^(https?:\/\/)/, '').replace(/\/v1\/?$/, '')}/v1
                  </p>
                )}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleSaveApiKey(providerConfig.key)}
                  disabled={state.isLoading || !state.apiKeyInput.trim()}
                >
                  {state.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            ) : (
              // Standard single API key input
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-teal-100 dark:hover:bg-[#0A2E2F] rounded disabled:opacity-50"
                  onClick={() => handleSaveApiKey(providerConfig.key)}
                  disabled={state.isLoading || !state.apiKeyInput.trim()}
                >
                  {state.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
                  ) : (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </button>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="text"
                  value={state.integration?.api_key || ""}
                  readOnly
                  className="pr-10 bg-teal-50 dark:bg-[#0A2E2F] font-mono text-sm"
                />
              </div>
              {providerConfig.key === 'elevenlabs' && state.integration?.base_url && (
                <p className="text-xs text-muted-foreground">
                  Domain: <span className="font-mono">{state.integration.base_url}</span>
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => handleDisconnect(providerConfig.key)}
                disabled={state.isLoading}
              >
                {state.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Disconnect
              </Button>
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
          <TabsTrigger value="subscription">
            <CreditCard className="mr-2 h-4 w-4" />
            Subscription
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
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  member.status === 'deactivated' 
                                    ? 'bg-red-100 text-red-700' 
                                    : member.status === 'pending' 
                                      ? 'bg-yellow-100 text-yellow-700' 
                                      : 'bg-green-100 text-green-700'
                                }`}>
                                  {member.status === 'deactivated' 
                                    ? 'Deactivated' 
                                    : member.status === 'pending' 
                                      ? 'Pending' 
                                      : member.status === 'active' 
                                        ? 'Active' 
                                        : member.status?.charAt(0).toUpperCase() + member.status?.slice(1) || 'Active'}
                                </span>
                                {member.status !== 'deactivated' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveTeamMember(member.id)}
                                    disabled={teamMembersSaving}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
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
            {providersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Plug className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No integrations are currently enabled.</p>
                <p className="text-sm mt-1">Contact your administrator to enable providers.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {providers.map(renderProviderCard)}
              </div>
            )}
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
                              <div className="flex items-center gap-2 flex-wrap flex-1">
                                <Mail className={`h-4 w-4 ${config.enabled ? 'text-muted-foreground' : 'text-muted-foreground/50'}`} />
                                {editingEmail === config.email ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input
                                      type="email"
                                      value={editEmailInput}
                                      onChange={(e) => setEditEmailInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleUpdateEmail(config.email);
                                        } else if (e.key === "Escape") {
                                          handleCancelEditEmail();
                                        }
                                      }}
                                      className="flex-1 h-8"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleUpdateEmail(config.email)}
                                      disabled={alertsSaving}
                                    >
                                      {alertsSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleCancelEditEmail}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
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
                                  </>
                                )}
                              </div>
                              {editingEmail !== config.email && (
                                <div className="flex items-center gap-2">
                                  {!config.type && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleStartEditEmail(config.email)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveEmail(config.email)}
                                        disabled={alertsSaving}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                  <Switch
                                    checked={config.enabled}
                                    onCheckedChange={(checked) => handleToggleEmailConfig(config.email, checked)}
                                    disabled={alertsSaving}
                                  />
                                </div>
                              )}
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

          {/* Slack Integration Card */}
          <Card className="mt-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Slack Notifications</CardTitle>
                    <CardDescription>
                      Receive test failure alerts in your Slack workspace
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={alertSettings.slack_enabled}
                  onCheckedChange={handleToggleSlack}
                  disabled={alertsLoading || slackSaving || !alertSettings.slack_webhook_url}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {alertsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {slackError && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                      <AlertCircle className="h-4 w-4" />
                      {slackError}
                    </div>
                  )}

                  {slackSuccess && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                      <CheckCircle className="h-4 w-4" />
                      {slackSuccess}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="slack-webhook" className="text-sm font-medium">
                        Webhook URL
                      </Label>
                      <Input
                        id="slack-webhook"
                        type="url"
                        placeholder="https://hooks.slack.com/services/..."
                        value={slackWebhookInput}
                        onChange={(e) => {
                          setSlackWebhookInput(e.target.value);
                          setSlackError(null);
                          setSlackSuccess(null);
                        }}
                        disabled={slackSaving || slackTesting}
                      />
                      <p className="text-xs text-muted-foreground">
                        Create an incoming webhook in your Slack workspace settings
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slack-channel" className="text-sm font-medium">
                        Channel Override (Optional)
                      </Label>
                      <Input
                        id="slack-channel"
                        type="text"
                        placeholder="#alerts or leave empty for webhook default"
                        value={slackChannelInput}
                        onChange={(e) => {
                          setSlackChannelInput(e.target.value);
                          setSlackError(null);
                          setSlackSuccess(null);
                        }}
                        disabled={slackSaving || slackTesting}
                      />
                      <p className="text-xs text-muted-foreground">
                        Override the default channel set in the webhook
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={handleTestSlackConnection}
                        disabled={slackTesting || slackSaving || !slackWebhookInput.trim()}
                      >
                        {slackTesting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Testing...
                          </>
                        ) : (
                          "Test Connection"
                        )}
                      </Button>
                      <Button
                        onClick={handleSaveSlackSettings}
                        disabled={slackSaving || slackTesting || !slackWebhookInput.trim()}
                      >
                        {slackSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          "Save Slack Settings"
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          {/* Referral Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Referral Code
              </CardTitle>
              <CardDescription>
                Have a referral code? Apply it to receive bonus credits!
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasUsedReferral ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span>You have already used a referral code. Thank you!</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter referral code (e.g., REF123ABC)"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="font-mono"
                      disabled={referralLoading}
                    />
                    <Button 
                      onClick={applyReferralCode} 
                      disabled={referralLoading || !referralCode.trim()}
                    >
                      {referralLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                  
                  {referralError && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-lg text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{referralError}</span>
                    </div>
                  )}
                  
                  {referralSuccess && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 p-3 rounded-lg text-sm">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{referralSuccess}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Your Subscription
              </CardTitle>
              <CardDescription>
                View your current subscription plan and usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !subscription?.has_subscription ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">No Active Subscription</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      You don&apos;t have an active subscription yet. All features are currently available.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Package Info */}
                  <div className="p-4 border rounded-lg bg-gradient-to-r from-primary/5 to-primary/10">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{subscription.package?.name}</h3>
                        {subscription.package?.description && (
                          <p className="text-muted-foreground text-sm mt-1">{subscription.package.description}</p>
                        )}
                      </div>
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Credits Usage */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Current Credits</p>
                      <p className="text-2xl font-bold mt-1 flex items-center gap-2">
                        {subscription.package?.is_unlimited ? (
                          <><Infinity className="h-6 w-6" /> Unlimited</>
                        ) : (
                          subscription.current_credits.toLocaleString()
                        )}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Credits Used</p>
                      <p className="text-2xl font-bold mt-1">{subscription.total_credits_used.toLocaleString()}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Team Members</p>
                      <p className="text-2xl font-bold mt-1">
                        {subscription.package?.max_team_members === -1 ? 'Unlimited' : `Up to ${subscription.package?.max_team_members}`}
                      </p>
                    </div>
                  </div>

                  {/* Subscription Details */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Subscription Details</h4>
                    <div className="grid gap-2 text-sm">
                      {subscription.subscription_started && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Started</span>
                          <span>{new Date(subscription.subscription_started).toLocaleDateString()}</span>
                        </div>
                      )}
                      {subscription.package_expires_at && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Expires</span>
                          <span>{new Date(subscription.package_expires_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Validity</span>
                        <span>{subscription.package?.validity_days} days</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-medium">${subscription.package?.price_usd}</span>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  {subscription.features && Object.keys(subscription.features).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Included Features</h4>
                      <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
                        {Object.entries(subscription.features)
                          .filter(([_, enabled]) => enabled)
                          .map(([key]) => (
                            <div key={key} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500" />
                              <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
