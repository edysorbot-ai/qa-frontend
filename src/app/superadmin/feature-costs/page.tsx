"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, X, AlertCircle, Zap } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

interface FeatureCost {
  id: string;
  feature_key: string;
  feature_name: string;
  description?: string;
  credit_cost: number;
  category: string;
  is_active: boolean;
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const categories = ["testing", "agents", "scheduling", "reporting", "api", "storage", "other"];
const defaultForm = { feature_key: "", feature_name: "", description: "", credit_cost: 1, category: "testing", is_active: true };

export default function FeatureCostsPage() {
  const [features, setFeatures] = useState<FeatureCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureCost | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const getToken = () => localStorage.getItem("admin_token");

  const fetchFeatures = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/superadmin/feature-costs`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error("Failed to fetch feature costs");
      setFeatures(await response.json());
    } catch (error) { console.error("Error fetching features:", error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFeatures(); }, [fetchFeatures]);

  const openCreateModal = () => { setIsEditing(false); setSelectedFeature(null); setForm(defaultForm); setError(""); setShowModal(true); };
  const openEditModal = (feature: FeatureCost) => {
    setIsEditing(true); setSelectedFeature(feature);
    setForm({ feature_key: feature.feature_key, feature_name: feature.feature_name, description: feature.description || "", credit_cost: feature.credit_cost, category: feature.category, is_active: feature.is_active });
    setError(""); setShowModal(true);
  };

  const handleSubmit = async () => {
    setActionLoading(true); setError("");
    try {
      const url = isEditing ? `${API_URL}/superadmin/feature-costs/${selectedFeature?.id}` : `${API_URL}/superadmin/feature-costs`;
      const response = await fetch(url, { method: isEditing ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error("Failed to save feature cost");
      setShowModal(false); fetchFeatures();
    } catch (err: any) { setError(err.message); } finally { setActionLoading(false); }
  };

  const handleToggle = async (feature: FeatureCost) => {
    try {
      const response = await fetch(`${API_URL}/superadmin/feature-costs/${feature.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ is_active: !feature.is_active }) });
      if (!response.ok) throw new Error("Failed to update feature");
      setFeatures((prev) => prev.map((f) => (f.id === feature.id ? { ...f, is_active: !f.is_active } : f)));
    } catch (error) { console.error("Error toggling feature:", error); }
  };

  const filteredFeatures = filter === "all" ? features : features.filter((f) => f.category === filter);
  const uniqueCategories = [...new Set(features.map((f) => f.category))];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Feature Costs</h1><p className="text-zinc-500 mt-1">Configure credit costs for platform features</p></div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"><Plus className="w-4 h-4" /> New Feature</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "all" ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"}`}>All</button>
        {uniqueCategories.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${filter === cat ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"}`}>{cat}</button>
        ))}
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800">
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Feature</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Key</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Category</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Cost</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Status</th>
            <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredFeatures.map((feature) => (
              <tr key={feature.id} className="hover:bg-zinc-900/50 transition-colors">
                <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center"><Zap className="w-4 h-4 text-zinc-500" /></div><div><p className="text-white font-medium">{feature.feature_name}</p><p className="text-zinc-500 text-sm">{feature.description || "No description"}</p></div></div></td>
                <td className="px-6 py-4"><code className="text-zinc-400 text-sm bg-zinc-900 px-2 py-1 rounded">{feature.feature_key}</code></td>
                <td className="px-6 py-4"><span className="text-zinc-400 capitalize">{feature.category}</span></td>
                <td className="px-6 py-4"><span className="text-white font-medium">{feature.credit_cost} credits</span></td>
                <td className="px-6 py-4"><button onClick={() => handleToggle(feature)} className={`relative w-12 h-6 rounded-full transition-colors ${feature.is_active ? "bg-white" : "bg-zinc-700"}`}><span className={`absolute top-1 w-4 h-4 rounded-full transition-all ${feature.is_active ? "left-7 bg-black" : "left-1 bg-zinc-400"}`} /></button></td>
                <td className="px-6 py-4"><div className="flex items-center justify-end"><button onClick={() => openEditModal(feature)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredFeatures.length === 0 && <div className="text-center py-12 text-zinc-500">No features found</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={isEditing ? "Edit Feature" : "New Feature"}>
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
        <div className="space-y-4">
          <div><label className="block text-sm text-zinc-400 mb-2">Feature Name</label><input value={form.feature_name} onChange={(e) => setForm({ ...form, feature_name: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
          <div><label className="block text-sm text-zinc-400 mb-2">Feature Key</label><input value={form.feature_key} onChange={(e) => setForm({ ...form, feature_key: e.target.value })} placeholder="e.g., test_run" disabled={isEditing} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50" /></div>
          <div><label className="block text-sm text-zinc-400 mb-2">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-zinc-400 mb-2">Credit Cost</label><input type="number" min="0" value={form.credit_cost} onChange={(e) => setForm({ ...form, credit_cost: parseInt(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
            <div><label className="block text-sm text-zinc-400 mb-2">Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600">{categories.map((cat) => (<option key={cat} value={cat} className="capitalize">{cat}</option>))}</select></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-white" /><span className="text-zinc-400 text-sm">Active</span></label>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={actionLoading || !form.feature_name || !form.feature_key} className="flex-1 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors">{actionLoading ? "Saving..." : "Save"}</button>
        </div>
      </Modal>
    </div>
  );
}
