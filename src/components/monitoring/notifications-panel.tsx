"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { Bell, Loader2, Check } from "lucide-react";

interface NotificationSettings {
  escalation_enabled: boolean;
  slack_configured: boolean;
  teams_configured: boolean;
  whatsapp_configured: boolean;
  pagerduty_configured: boolean;
}

export default function NotificationsPage() {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [slack, setSlack] = useState("");
  const [teams, setTeams] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pagerduty, setPagerduty] = useState("");

  const authHeaders = useCallback(async () => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }, [getToken]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${api.baseUrl}/api/monitoring/notification-settings`, { headers: await authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setSettings(data.settings);
      else setError(data.error || "Failed to load.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleEnabled = async () => {
    if (!settings) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`${api.baseUrl}/api/monitoring/notification-settings`, {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ escalation_enabled: !settings.escalation_enabled }),
      });
      if (res.ok) {
        setSettings({ ...settings, escalation_enabled: !settings.escalation_enabled });
        setNotice("Saved.");
      } else setError("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const saveWebhooks = async () => {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (slack) body.slack_webhook_url = slack;
      if (teams) body.teams_webhook_url = teams;
      if (whatsapp) body.whatsapp_webhook_url = whatsapp;
      if (pagerduty) body.pagerduty_routing_key = pagerduty;
      const res = await fetch(`${api.baseUrl}/api/monitoring/notification-settings`, {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNotice("Channels saved.");
        setSlack(""); setTeams(""); setWhatsapp(""); setPagerduty("");
        await load();
      } else {
        const d = await res.json();
        setError(d.error || "Could not save.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const field = "w-full border rounded-md px-3 py-2 text-sm bg-background";
  const ConfiguredBadge = ({ on }: { on: boolean }) =>
    on ? (
      <span className="inline-flex items-center gap-1 text-xs text-green-700"><Check className="h-3 w-3" /> configured</span>
    ) : (
      <span className="text-xs text-muted-foreground">not set</span>
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Escalate flag detection, failures and downtime to your team. Email &amp; Slack are P1; MS Teams, WhatsApp and PagerDuty are also supported.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-green-600">{notice}</p>}

      {settings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-5 flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">Escalations</div>
            <p className="text-xs text-muted-foreground">Master switch for all escalation channels.</p>
          </div>
          <button
            onClick={toggleEnabled}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings.escalation_enabled ? "bg-[#1A5253]" : "bg-gray-300"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.escalation_enabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border p-5 space-y-4">
        <h2 className="font-semibold text-sm">Channels</h2>
        <div className="space-y-1">
          <div className="flex items-center justify-between"><label className="text-sm">Slack webhook URL</label><ConfiguredBadge on={!!settings?.slack_configured} /></div>
          <input className={field} placeholder="https://hooks.slack.com/services/…" value={slack} onChange={(e) => setSlack(e.target.value)} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between"><label className="text-sm">MS Teams webhook URL</label><ConfiguredBadge on={!!settings?.teams_configured} /></div>
          <input className={field} placeholder="https://outlook.office.com/webhook/…" value={teams} onChange={(e) => setTeams(e.target.value)} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between"><label className="text-sm">WhatsApp relay URL</label><ConfiguredBadge on={!!settings?.whatsapp_configured} /></div>
          <input className={field} placeholder="https://your-bridge/whatsapp (receives { text })" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between"><label className="text-sm">PagerDuty routing key</label><ConfiguredBadge on={!!settings?.pagerduty_configured} /></div>
          <input className={field} placeholder="PagerDuty Events API v2 routing key" value={pagerduty} onChange={(e) => setPagerduty(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">Leave a field blank to keep its existing value. Saved secrets are never displayed back.</p>
        <button onClick={saveWebhooks} disabled={saving} className="bg-[#1A5253] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save channels
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Email recipients are managed under Settings → Alerts. Escalations are dispatched from monitoring when a flag, failure or
        outage is detected (POST /api/monitoring/escalate).
      </p>
    </div>
  );
}
