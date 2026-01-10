"use client";

import { useEffect, useState, useCallback } from "react";
import { Plug, Edit, X, AlertCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

interface Integration {
  id: string;
  provider: string;
  display_name: string;
  description?: string;
  is_enabled: boolean;
  icon_url?: string;
  sort_order: number;
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIconUrl, setEditIconUrl] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const getToken = () => localStorage.getItem("admin_token");

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/superadmin/integrations`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Failed to fetch integrations");
      const data = await response.json();
      setIntegrations(data);
    } catch (error) {
      console.error("Error fetching integrations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleToggle = async (integration: Integration) => {
    setSaving(integration.id);
    try {
      const response = await fetch(`${API_URL}/superadmin/integrations/${integration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ is_enabled: !integration.is_enabled }),
      });
      if (!response.ok) throw new Error("Failed to update integration");
      setIntegrations((prev) => prev.map((i) => (i.id === integration.id ? { ...i, is_enabled: !i.is_enabled } : i)));
    } catch (error) {
      console.error("Error toggling integration:", error);
    } finally {
      setSaving(null);
    }
  };

  const handleEdit = async () => {
    if (!selectedIntegration) return;
    setActionLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/superadmin/integrations/${selectedIntegration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ display_name: editDisplayName, description: editDescription, icon_url: editIconUrl }),
      });
      if (!response.ok) throw new Error("Failed to update integration");
      setShowEditModal(false);
      fetchIntegrations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (integration: Integration) => {
    setSelectedIntegration(integration);
    setEditDisplayName(integration.display_name);
    setEditDescription(integration.description || "");
    setEditIconUrl(integration.icon_url || "");
    setError("");
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-zinc-500 mt-1">Enable or disable voice agent providers</p>
      </div>

      <div className="space-y-3">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center">
                {integration.icon_url ? (
                  <img src={integration.icon_url} alt={integration.display_name} className="w-7 h-7 object-contain" />
                ) : (
                  <Plug className="w-6 h-6 text-zinc-500" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-white">{integration.display_name}</h3>
                <p className="text-sm text-zinc-500">{integration.description || `Provider: ${integration.provider}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => openEditModal(integration)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleToggle(integration)}
                disabled={saving === integration.id}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  integration.is_enabled ? "bg-white" : "bg-zinc-700"
                } ${saving === integration.id ? "opacity-50" : ""}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                  integration.is_enabled ? "left-7 bg-black" : "left-1 bg-zinc-400"
                }`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Integration">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Display Name</label>
            <input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Description</label>
            <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Icon URL</label>
            <input value={editIconUrl} onChange={(e) => setEditIconUrl(e.target.value)} placeholder="https://..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">Cancel</button>
          <button onClick={handleEdit} disabled={actionLoading} className="flex-1 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors">
            {actionLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
