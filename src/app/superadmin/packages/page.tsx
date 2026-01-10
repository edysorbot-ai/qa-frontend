"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Trash2, X, AlertCircle, Infinity, Check } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

interface Feature {
  id: string;
  feature_key: string;
  feature_name: string;
  description?: string;
  credit_cost: number;
  category: string;
  is_active: boolean;
}

interface CreditPackage {
  id: string;
  name: string;
  description?: string;
  credits: number;
  price_usd: number;
  is_unlimited: boolean;
  is_active: boolean;
  validity_days: number;
  max_team_members: number;
  features: Record<string, boolean>;
  created_at: string;
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const defaultForm = { name: "", description: "", credits: 100, price_usd: 9.99, is_unlimited: false, is_active: true, validity_days: 30, max_team_members: 1, features: {} as Record<string, boolean> };

export default function PackagesPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const getToken = () => localStorage.getItem("admin_token");

  const fetchPackages = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/superadmin/packages`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error("Failed to fetch packages");
      setPackages(await response.json());
    } catch (error) { console.error("Error fetching packages:", error); } finally { setLoading(false); }
  }, []);

  const fetchFeatures = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/superadmin/feature-costs`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error("Failed to fetch features");
      setFeatures(await response.json());
    } catch (error) { console.error("Error fetching features:", error); }
  }, []);

  useEffect(() => { fetchPackages(); fetchFeatures(); }, [fetchPackages, fetchFeatures]);

  // Group features by category
  const featuresByCategory = features.reduce((acc, feature) => {
    if (!acc[feature.category]) acc[feature.category] = [];
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  const categoryLabels: Record<string, string> = {
    testing: "Testing", agents: "Agents", analysis: "Analysis", team: "Team", integrations: "Integrations", workflows: "Workflows", reports: "Reports"
  };

  const openCreateModal = () => { setIsEditing(false); setSelectedPackage(null); setForm(defaultForm); setError(""); setShowModal(true); };
  const openEditModal = (pkg: CreditPackage) => {
    setIsEditing(true); setSelectedPackage(pkg);
    setForm({ name: pkg.name, description: pkg.description || "", credits: pkg.credits, price_usd: pkg.price_usd, is_unlimited: pkg.is_unlimited, is_active: pkg.is_active, validity_days: pkg.validity_days, max_team_members: pkg.max_team_members, features: pkg.features || {} });
    setError(""); setShowModal(true);
  };

  const toggleFeature = (featureKey: string) => {
    setForm(prev => ({ ...prev, features: { ...prev.features, [featureKey]: !prev.features[featureKey] } }));
  };

  const selectAllFeatures = () => {
    const allFeatures: Record<string, boolean> = {};
    features.forEach(f => { allFeatures[f.feature_key] = true; });
    setForm(prev => ({ ...prev, features: allFeatures }));
  };

  const clearAllFeatures = () => setForm(prev => ({ ...prev, features: {} }));

  const selectedFeatureCount = Object.values(form.features).filter(Boolean).length;

  const handleSubmit = async () => {
    setActionLoading(true); setError("");
    try {
      const url = isEditing ? `${API_URL}/superadmin/packages/${selectedPackage?.id}` : `${API_URL}/superadmin/packages`;
      const response = await fetch(url, { method: isEditing ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error("Failed to save package");
      setShowModal(false); fetchPackages();
    } catch (err: any) { setError(err.message); } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedPackage) return;
    setActionLoading(true); setError("");
    try {
      const response = await fetch(`${API_URL}/superadmin/packages/${selectedPackage.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error("Failed to delete package");
      setShowDeleteModal(false); fetchPackages();
    } catch (err: any) { setError(err.message); } finally { setActionLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Credit Packages</h1><p className="text-zinc-500 mt-1">{packages.length} packages</p></div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"><Plus className="w-4 h-4" /> New Package</button>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800">
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Package</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Credits</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Price</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Features</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Validity</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Status</th>
            <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {packages.map((pkg) => {
              const enabledFeatures = Object.values(pkg.features || {}).filter(v => v).length;
              return (
              <tr key={pkg.id} className="hover:bg-zinc-900/50 transition-colors">
                <td className="px-6 py-4"><div><p className="text-white font-medium">{pkg.name}</p><p className="text-zinc-500 text-sm">{pkg.description || "No description"}</p></div></td>
                <td className="px-6 py-4">{pkg.is_unlimited ? <span className="flex items-center gap-1 text-white"><Infinity className="w-4 h-4" /> Unlimited</span> : <span className="text-white">{pkg.credits.toLocaleString()}</span>}</td>
                <td className="px-6 py-4"><span className="text-white font-medium">${pkg.price_usd}</span></td>
                <td className="px-6 py-4"><span className="text-zinc-400">{enabledFeatures} features</span></td>
                <td className="px-6 py-4"><span className="text-zinc-400">{pkg.validity_days} days</span></td>
                <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-medium ${pkg.is_active ? "bg-white/10 text-white" : "bg-zinc-800 text-zinc-500"}`}>{pkg.is_active ? "Active" : "Inactive"}</span></td>
                <td className="px-6 py-4"><div className="flex items-center justify-end gap-1">
                  <button onClick={() => openEditModal(pkg)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => { setSelectedPackage(pkg); setError(""); setShowDeleteModal(true); }} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>
            )})}
          </tbody>
        </table>
        {packages.length === 0 && <div className="text-center py-12 text-zinc-500">No packages found</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={isEditing ? "Edit Package" : "New Package"}>
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
        <div className="space-y-4">
          <div><label className="block text-sm text-zinc-400 mb-2">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
          <div><label className="block text-sm text-zinc-400 mb-2">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-zinc-400 mb-2">Credits</label><input type="number" value={form.credits} onChange={(e) => setForm({ ...form, credits: parseInt(e.target.value) })} disabled={form.is_unlimited} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50" /></div>
            <div><label className="block text-sm text-zinc-400 mb-2">Price (USD)</label><input type="number" step="0.01" value={form.price_usd} onChange={(e) => setForm({ ...form, price_usd: parseFloat(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-zinc-400 mb-2">Validity (days)</label><input type="number" value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: parseInt(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
            <div><label className="block text-sm text-zinc-400 mb-2">Max Team Members</label><input type="number" value={form.max_team_members} onChange={(e) => setForm({ ...form, max_team_members: parseInt(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_unlimited} onChange={(e) => setForm({ ...form, is_unlimited: e.target.checked })} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-white" /><span className="text-zinc-400 text-sm">Unlimited credits</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-white" /><span className="text-zinc-400 text-sm">Active</span></label>
          </div>
          
          {/* Features Section */}
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm text-zinc-400">Package Features ({selectedFeatureCount} selected)</label>
              <div className="flex gap-2">
                <button type="button" onClick={selectAllFeatures} className="text-xs text-zinc-500 hover:text-white transition-colors">Select All</button>
                <span className="text-zinc-700">|</span>
                <button type="button" onClick={clearAllFeatures} className="text-xs text-zinc-500 hover:text-white transition-colors">Clear All</button>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-h-60 overflow-y-auto space-y-4">
              {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">{categoryLabels[category] || category}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryFeatures.map(feature => (
                      <button key={feature.id} type="button" onClick={() => toggleFeature(feature.feature_key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${form.features[feature.feature_key] ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"}`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${form.features[feature.feature_key] ? "bg-black border-black" : "border-zinc-600"}`}>
                          {form.features[feature.feature_key] && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="truncate">{feature.feature_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={actionLoading || !form.name} className="flex-1 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors">{actionLoading ? "Saving..." : "Save"}</button>
        </div>
      </Modal>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Package">
        <p className="text-zinc-400 mb-6">Are you sure you want to delete <span className="text-white">{selectedPackage?.name}</span>? This action cannot be undone.</p>
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
        <div className="flex gap-3">
          <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-3 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={actionLoading} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">{actionLoading ? "Deleting..." : "Delete"}</button>
        </div>
      </Modal>
    </div>
  );
}
