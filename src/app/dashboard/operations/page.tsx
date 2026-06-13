"use client";

import { useEffect, useState } from "react";
import { useAuthedJson, useAuthedFetch } from "@/hooks/use-authed-fetch";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Activity, Bell, Key, PlayCircle, RefreshCw, Trash2, Copy } from "lucide-react";

type CiKey = { id: string; agent_id: string; agent_name?: string; key_prefix: string; created_at: string; updated_at?: string };
type Agent = { id: string; name: string };
type NotifSettings = {
  escalation_enabled: boolean;
  slack_configured: boolean;
  teams_configured: boolean;
  whatsapp_configured: boolean;
  pagerduty_configured: boolean;
};

export default function OperationsPage() {
  const fetchJson = useAuthedJson();
  const authedFetch = useAuthedFetch();

  // CI/CD keys
  const [agents, setAgents] = useState<Agent[]>([]);
  const [keys, setKeys] = useState<CiKey[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [newlyMintedKey, setNewlyMintedKey] = useState<string | null>(null);

  // Notification settings
  const [notif, setNotif] = useState<NotifSettings | null>(null);
  const [slack, setSlack] = useState("");
  const [teams, setTeams] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pagerduty, setPagerduty] = useState("");

  // Triggers
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const baseUrl = (() => {
    try {
      return new URL(api.endpoints.agents.list).origin;
    } catch {
      return "";
    }
  })();

  const loadAll = async () => {
    try {
      const [agentsRes, keysRes, notifRes] = await Promise.all([
        fetchJson<{ agents?: Agent[]; data?: Agent[] }>(api.endpoints.agents.list).catch(() => ({})),
        fetchJson<{ keys: CiKey[] }>(`${baseUrl}/api/ci/keys`).catch(() => ({ keys: [] })),
        fetchJson<{ settings: NotifSettings }>(`${baseUrl}/api/monitoring/notification-settings`).catch(() => null),
      ]);
      const agentList = (agentsRes as any)?.agents || (agentsRes as any)?.data || [];
      setAgents(agentList);
      if (agentList.length && !selectedAgent) setSelectedAgent(agentList[0].id);
      setKeys((keysRes as any)?.keys || []);
      if (notifRes) setNotif((notifRes as any).settings);
    } catch (e: any) {
      toast.error(`Failed to load: ${e.message}`);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateKey = async () => {
    if (!selectedAgent) return toast.error("Pick an agent first");
    try {
      const r = await fetchJson<{ apiKey: string }>(`${baseUrl}/api/ci/generate-key`, {
        method: "POST",
        json: { agentId: selectedAgent },
      });
      setNewlyMintedKey(r.apiKey);
      loadAll();
      toast.success("Key generated — copy it now, it won't be shown again");
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    }
  };

  const revokeKey = async (id: string) => {
    try {
      await fetchJson(`${baseUrl}/api/ci/keys/${id}`, { method: "DELETE" });
      toast.success("Key revoked");
      loadAll();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    }
  };

  const saveNotif = async () => {
    try {
      const body: any = { escalation_enabled: notif?.escalation_enabled ?? true };
      if (slack) body.slack_webhook_url = slack;
      if (teams) body.teams_webhook_url = teams;
      if (whatsapp) body.whatsapp_webhook_url = whatsapp;
      if (pagerduty) body.pagerduty_routing_key = pagerduty;
      await fetchJson(`${baseUrl}/api/monitoring/notification-settings`, { method: "PUT", json: body });
      toast.success("Notification settings saved");
      setSlack(""); setTeams(""); setWhatsapp(""); setPagerduty("");
      loadAll();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    }
  };

  const trigger = async (label: string, url: string, body?: any) => {
    setBusy((b) => ({ ...b, [label]: true }));
    try {
      const res = await authedFetch(`${baseUrl}${url}`, {
        method: "POST",
        json: body ?? {},
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(`${label}: ${JSON.stringify(data).slice(0, 100)}`);
    } catch (e: any) {
      toast.error(`${label} failed: ${e.message}`);
    } finally {
      setBusy((b) => ({ ...b, [label]: false }));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operations</h1>
        <p className="text-sm text-muted-foreground">
          CI/CD keys, alert channels, and manual triggers for uptime & quality checks.
        </p>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys"><Key className="w-4 h-4 mr-1" />CI/CD Keys</TabsTrigger>
          <TabsTrigger value="notif"><Bell className="w-4 h-4 mr-1" />Notifications</TabsTrigger>
          <TabsTrigger value="triggers"><PlayCircle className="w-4 h-4 mr-1" />Manual Triggers</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate a CI/CD Key</CardTitle>
              <CardDescription>Use in GitHub Actions / GitLab CI to trigger regression runs on prompt changes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Agent</Label>
                  <select
                    className="w-full border rounded px-2 py-2 bg-background"
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={generateKey}><Key className="w-4 h-4 mr-1" />Generate</Button>
              </div>
              {newlyMintedKey && (
                <div className="border border-amber-500 bg-amber-50 dark:bg-amber-950 rounded p-3 space-y-2">
                  <div className="font-medium text-amber-900 dark:text-amber-100">Copy this key now — it cannot be shown again</div>
                  <div className="flex gap-2">
                    <Input readOnly value={newlyMintedKey} className="font-mono text-xs" />
                    <Button
                      variant="outline" size="icon"
                      onClick={() => { navigator.clipboard.writeText(newlyMintedKey); toast.success("Copied"); }}
                    ><Copy className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Keys</CardTitle>
              <CardDescription>Only the prefix is shown. Revoke to invalidate.</CardDescription>
            </CardHeader>
            <CardContent>
              {keys.length === 0 ? (
                <div className="text-sm text-muted-foreground">No keys yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-2">Agent</th>
                        <th>Prefix</th>
                        <th>Created</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map((k) => (
                        <tr key={k.id} className="border-t">
                          <td className="py-2">{k.agent_name || k.agent_id.slice(0, 8)}</td>
                          <td className="font-mono">{k.key_prefix}…</td>
                          <td>{new Date(k.created_at).toLocaleString()}</td>
                          <td className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" aria-label="Revoke key">
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Revoke this CI/CD key?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Any pipelines using this key will start failing immediately.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => revokeKey(k.id)} aria-label="Confirm revoke">
                                    Revoke
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notif" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Escalation & Channels</CardTitle>
              <CardDescription>
                Status badges show whether each channel is configured. Leave a field blank to keep the existing value.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={notif?.escalation_enabled ?? true}
                  onCheckedChange={(v) => setNotif((n) => n ? { ...n, escalation_enabled: v } : n)}
                />
                <span>Escalations enabled</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Slack webhook URL <Badge variant={notif?.slack_configured ? "default" : "outline"} className="ml-2">{notif?.slack_configured ? "set" : "empty"}</Badge></Label>
                  <Input value={slack} onChange={(e) => setSlack(e.target.value)} placeholder="https://hooks.slack.com/..." />
                </div>
                <div>
                  <Label>Teams webhook URL <Badge variant={notif?.teams_configured ? "default" : "outline"} className="ml-2">{notif?.teams_configured ? "set" : "empty"}</Badge></Label>
                  <Input value={teams} onChange={(e) => setTeams(e.target.value)} placeholder="https://outlook.office.com/webhook/..." />
                </div>
                <div>
                  <Label>WhatsApp webhook URL <Badge variant={notif?.whatsapp_configured ? "default" : "outline"} className="ml-2">{notif?.whatsapp_configured ? "set" : "empty"}</Badge></Label>
                  <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label>PagerDuty routing key <Badge variant={notif?.pagerduty_configured ? "default" : "outline"} className="ml-2">{notif?.pagerduty_configured ? "set" : "empty"}</Badge></Label>
                  <Input value={pagerduty} onChange={(e) => setPagerduty(e.target.value)} placeholder="R0XXXXXXXXXXXXX" />
                </div>
              </div>

              <Button onClick={saveNotif}>Save</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Triggers</CardTitle>
              <CardDescription>Run normally-scheduled jobs immediately. Useful for verifying setup.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                disabled={busy.outage}
                onClick={() => trigger("Outage probe", "/api/monitoring/outage-test")}
                className="h-20 flex-col"
              >
                {busy.outage ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                <span>Outage probe (all providers)</span>
              </Button>
              <Button
                disabled={busy.uptime}
                onClick={() => trigger("Uptime sweep", "/api/monitoring/uptime/run-now")}
                className="h-20 flex-col"
                variant="outline"
              >
                {busy.uptime ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                <span>Uptime sweep</span>
              </Button>
              <Button
                disabled={busy.rlaif}
                onClick={() => trigger("RLAIF", "/api/monitoring/rlaif/run-now", { frequency: "daily" })}
                className="h-20 flex-col"
                variant="outline"
              >
                {busy.rlaif ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                <span>RLAIF (daily)</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
